/**
 * Run all 26 canonical specialists against a historical non-operational input
 * catalog. Subscription-authenticated live Codex runs are explicit opt-in.
 * No output from this script is certified vessel evidence.
 */
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { assertPinnedCleanGitRevision } from '../src/core/mission-control/GitRevisionGuard.ts';
import fs from 'node:fs';
import path from 'node:path';
import { compileCodexAgentCases } from '../src/core/verification/CodexMatrixInput.ts';
import { runLiveAgentMatrix } from '../src/core/verification/LiveAgentMatrix.ts';
import type { AgentRunFinding } from '../src/core/verification/LiveAgentMatrix.ts';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { ExecutionEngine } from '../src/core/engine/ExecutionEngine.ts';
import { QuotaResilience } from '../src/core/mission-control/QuotaResilience.ts';
import type { AgentExecutionOutput, AgentExecutionInput } from '../src/core/types/agent.ts';
import { topologicalAgentOrder } from '../src/core/verification/TopologicalAgentCampaign.ts';
import {
  emptyCheckpoint, importLegacyProgress, verifyCheckpoint,
  acknowledgeUncertainAttempt, rebaseCheckpointProvenance, type CodexCheckpoint,
  type ResumeBinding
} from '../src/core/verification/CodexCampaignCheckpoint.ts';
import { preflightCodexAgentCases } from '../src/core/verification/CodexCampaignPreflight.ts';
import { requireLabCommissioningPolicy } from '../src/core/mission-control/LabCommissioningPolicy.ts';
import { assessEngineeringCampaign } from '../src/core/verification/EngineeringCampaignAcceptance.ts';
import { assertSourcePinnedSyntheticGeminiCatalog } from
  '../src/core/models/DualSubscriptionRoutingPolicy.ts';


const CHECKPOINT = path.resolve('data/codex-26-agent-checkpoint.json');
const OLD_PROGRESS = path.resolve('data/codex-26-agent-progress.json');
const RESUME_PROGRESS = path.resolve('data/codex-26-agent-resume-progress.json');
const LOCK = path.resolve('data/codex-26-agent-checkpoint.lock');
const ERROR_REPORT = path.resolve('data/codex-26-agent-interruption.json');

function safeRead(filename: string, enforcePrivate = true): Buffer {
  const st = fs.lstatSync(filename);
  if (!st.isFile() || st.isSymbolicLink() || st.size === 0 ||
      st.size > 2 * 1024 * 1024 ||
      (st.mode & (enforcePrivate ? 0o077 : 0o022)) !== 0) {
    throw new Error('CODEX_RESUME_UNSAFE_LOCAL_JOURNAL: ' + path.basename(filename));
  }
  return fs.readFileSync(filename);
}
/** Unique temp + fd sync + rename; no public commit, no partial JSON reads. */
function writePrivateAtomic(filename: string, value: unknown): void {
  const dir = path.dirname(filename);
  const dst = path.basename(filename);
  const info = fs.lstatSync(dir);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error('CODEX_RESUME_UNSAFE_PRIVATE_DIRECTORY');
  }
  if (fs.existsSync(filename)) {
    const old = fs.lstatSync(filename);
    if (!old.isFile() || old.isSymbolicLink() ||
        (old.mode & 0o077) !== 0) {
      throw new Error('CODEX_RESUME_UNSAFE_TARGET_FILE');
    }
  }
  const tmp = path.join(dir, '.' + dst + '.' + randomBytes(8).toString('hex') + '.tmp');
  const bytes = JSON.stringify(value, null, 2) + '\n';
  let fd: number | undefined;
  try {
    fd = fs.openSync(tmp, 'wx', 0o600);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(tmp, filename);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}
function holdExclusiveLock(): () => void {
  if (fs.existsSync(LOCK)) {
    throw new Error('CODEX_RESUME_ACTIVE_OR_STALE_LOCK: another run may be active. ' +
      'Inspect the process; do not delete a lock until confirmed stopped.');
  }
  const fd = fs.openSync(LOCK, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid,
    startedAtUtc: new Date().toISOString() }) + '\n'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  return () => { try { fs.unlinkSync(LOCK); } catch { /* unexpected removal */ } };
}
function gitIsAncestor(oldSha: string, currentSha: string): boolean {
  const p = spawnSync('git', ['merge-base', '--is-ancestor', oldSha, currentSha], {
    encoding: 'utf8', timeout: 8000, shell: false
  });
  return !p.error && p.status === 0;
}
function prepareResume(binding: ResumeBinding,
  resume: boolean, allowHistorical: boolean, retryUncertain: boolean): CodexCheckpoint {
  if (fs.existsSync(CHECKPOINT)) {
    if (!resume) throw new Error('CODEX_RESUME_EXISTING_CHECKPOINT: use --resume; cannot replay successful work');
    const oldBytes = safeRead(CHECKPOINT);
    const raw = JSON.parse(oldBytes.toString('utf8'));
    let cp: CodexCheckpoint;
    if (raw.implementationSha === binding.implementationSha) {
      cp = verifyCheckpoint(raw, binding);
    } else {
      if (!allowHistorical || !gitIsAncestor(raw.implementationSha, binding.implementationSha)) {
        throw new Error('CODEX_RESUME_REBASE_REQUIRES_REVIEWED_ANCESTOR_AND_EXPLICIT_CARRY_HISTORICAL');
      }
      cp = rebaseCheckpointProvenance(raw,
        { ...binding, implementationSha: raw.implementationSha }, binding, oldBytes);
      // Retain the exact old checkpoint content independently before any overwrite.
      // Never replace a pre-existing snapshot or weaken private-file permissions.
      const snapshot = CHECKPOINT.replace(/\.json$/, '-source-' + raw.implementationSha + '.json');
      if (!fs.existsSync(snapshot)) {
        const fd = fs.openSync(snapshot, 'wx', 0o600);
        try { fs.writeFileSync(fd, oldBytes); fs.fsyncSync(fd); }
        finally { fs.closeSync(fd); }
      } else if (!safeRead(snapshot).equals(oldBytes)) {
        throw new Error('CODEX_RESUME_EXISTING_SOURCE_SNAPSHOT_CONFLICT');
      }
    }
    if (cp.pending && !retryUncertain) {
      throw new Error('CODEX_RESUME_UNCERTAIN_MODEL_ATTEMPT: ' + cp.pending.canonicalId +
        '; inspect prior logs and pass --ack-uncertain to deliberately retry if needed');
    }
    return cp.pending ? acknowledgeUncertainAttempt(cp, binding) : cp;
  }
  if (resume) {
    if (!fs.existsSync(OLD_PROGRESS)) {
      throw new Error('CODEX_RESUME_NO_PREVIOUS_CHECKPOINT_OR_LEGACY_PROGRESS');
    }
    const rawBytes = safeRead(OLD_PROGRESS, false);
    const legacy = JSON.parse(rawBytes.toString('utf8')) as {implementationSha?:string};
    if (!legacy.implementationSha || !gitIsAncestor(legacy.implementationSha, binding.implementationSha)) {
      throw new Error('CODEX_RESUME_LEGACY_SOURCE_NOT_IN_PROTECTED_MAIN_ANCESTRY');
    }
    const cp = importLegacyProgress(legacy, rawBytes, binding, allowHistorical);
    if (!retryUncertain) {
      throw new Error('CODEX_RESUME_LEGACY_LAST_ATTEMPT_UNKNOWN: journal only contains successful' +
        ' outputs and cannot prove the next agent was never invoked. Review and use --ack-uncertain');
    }
    return acknowledgeUncertainAttempt(cp, binding);
  }
  if (fs.existsSync(OLD_PROGRESS)) {
    throw new Error('CODEX_RESUME_PRIOR_PROGRESS_EXISTS: use --resume to preserve previous runs');
  }
  return emptyCheckpoint(binding);
}
async function main() {
  const sourcePath = path.resolve(
    process.argv.includes('--catalog')
      ? process.argv[process.argv.indexOf('--catalog') + 1]
      : 'evidence/live-agents/representative-cases.json'
  );
  const rootDir = process.cwd();
  if (!sourcePath.startsWith(rootDir + path.sep) ||
      !['evidence', 'references'].some(folder =>
        sourcePath.startsWith(path.join(rootDir, folder) + path.sep))) {
    throw new Error('Commissioning catalog must be a controlled file under evidence/ or references/ in the pinned source tree');
  }
  if (fs.statSync(sourcePath).size > 2 * 1024 * 1024) throw new Error('Catalog too large');
  const source = fs.readFileSync(sourcePath);
  const catalog = JSON.parse(source.toString('utf8'));
  const execute = process.argv.includes('--execute');
  const implementationSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (execute) await assertPinnedCleanGitRevision(process.cwd(), implementationSha);
  const provenance = {
    implementationSha,
    catalogSha256: createHash('sha256').update(source).digest('hex')
  };
  // Auto transfer is not authorized by an environment label alone:
  // require the ACTUAL catalog bytes and path to match owner-verified SHA.
  if (process.env.USV_GEMINI_AUTO_SYNTHETIC_ROUTE !== undefined) {
    assertSourcePinnedSyntheticGeminiCatalog(
      path.relative(rootDir, sourcePath),
      catalog.dataClassification, provenance.catalogSha256, process.env
    );
  }
  const cases = compileCodexAgentCases(catalog);
  const preflight = await preflightCodexAgentCases(cases);
  // Local preflight must not dirty the pinned source before --execute.
  const preflightPath = path.resolve('data/codex-26-agent-preflight.json');
  fs.mkdirSync(path.dirname(preflightPath), { recursive: true });
  fs.writeFileSync(preflightPath, JSON.stringify({
    ...preflight, ...provenance, catalogClassification: catalog.dataClassification,
    illustrativeNonOperational: true, historicalCatalogBaseline: catalog.baselineSha
  }, null, 2) + '\n');

  if (!execute) {
    console.log(JSON.stringify({
      status: preflight.status,
      agents: preflight.totalAgents,
      validInputs: preflight.agentInputsValid,
      mandatoryToolsPassed: preflight.deterministicToolsPassed,
      mandatoryToolsFailed: preflight.deterministicToolsFailed,
      mandatoryToolsExpectedRejections: preflight.deterministicToolsExpectedRejections,
      blockedAgents: preflight.findings
        .filter(finding => !finding.readyForModelAttempt)
        .map(finding => ({ agent: finding.canonicalId, blockers: finding.blockers })),
      report: preflightPath,
      liveCodexCalls: 0, independentlyEngineeringValidated: false,
      engineeringReleaseApproved: false
    }, null, 2));
    if (process.argv.includes('--require-ready') && preflight.status !== 'PREFLIGHT_READY_NO_AI_CALLS') {
      process.exitCode = 1;
    }
    return;
  }
  if (preflight.status !== 'PREFLIGHT_READY_NO_AI_CALLS') {
    throw new Error('26-agent preflight has failed mandatory engineering inputs/tools. Fix exact recorded blockers before spending Codex tokens.');
  }
  // This authorization is to gather research evidence, not to accept a vessel
  // baseline. Source-revision governance is independent of this runtime gate.
  const commissioning = requireLabCommissioningPolicy(process.env);
  // Checkpoint writes are append-by-prefix, private, and source/catalog bound.
  // The legacy v1 journal is never overwritten; A01/A02 remain attributable
  // to their original SHA instead of misreported as newly executed agents.
  const resume = process.argv.includes('--resume');
  const allowHistorical = process.argv.includes('--carry-historical');
  const retryUncertain = process.argv.includes('--ack-uncertain');
  if ((allowHistorical || retryUncertain) && !resume) {
    throw new Error('CODEX_RESUME_EXPLICIT_RESUME_FLAG_REQUIRED');
  }
  const specs = topologicalAgentOrder(AgentRegistry.getInstance().getAllAgents());
  const binding: ResumeBinding = {
    implementationSha, catalogSha256: provenance.catalogSha256,
    dataClassification: catalog.dataClassification, specs, cases
  };
  fs.mkdirSync('data', { recursive: true, mode: 0o700 });
  const unlock = holdExclusiveLock();
  let report;
  let checkpoint: CodexCheckpoint;
  try {
    checkpoint = prepareResume(binding, resume, allowHistorical, retryUncertain);
    writePrivateAtomic(CHECKPOINT, checkpoint);
    console.log(JSON.stringify({
      status: 'CODEX_26_CHECKPOINT_ACCEPTED',
      completedHistorical: checkpoint.completed.filter(f =>
        f.status === 'HISTORICAL_LIVE_PROVIDER_EXECUTED_UNCERTIFIED').length,
      completedCurrentSource: checkpoint.completed.filter(f =>
        f.status === 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED').length,
      sourceSha: implementationSha,
      priorSourceSha: checkpoint.legacySourceSha,
      oldEvidenceUnchanged: true,
      readyForNextAgent: specs[checkpoint.completed.length]?.canonicalId || null,
      independentEngineeringValidation: false
    }));
    const codexQuota = new QuotaResilience();
    const geminiQuota = new QuotaResilience(
      path.join(process.env.HOME || '', '.usv01', 'runtime', 'gemini-quota.json')
    );
    // If Codex and Gemini are temporarily quota/auth/transport blocked, keep
    // the already-authorized interactive owner session alive and retry with
    // bounded exponential backoff. This never resets provider quota ledgers,
    // creates API credentials or repeats a completed checkpointed agent.
    // A killed Terminal/Mac still requires explicit checkpoint recovery.
    const runWithQuotaHold = async (id: string, input: AgentExecutionInput):
      Promise<AgentExecutionOutput> => {
      let transientRetries = 0;
      while (true) {
        const output = await ExecutionEngine.getInstance().executeAgent(id, input, 0);
        const err = String(output.data?.error || '');
        const providerHold = output.status === 'FAILED' &&
          (/USV_QUOTA_WAIT|QUOTA_EXHAUSTED|USV_PROVIDER_RETRY_WAIT/.test(err) ||
           /USV_GEMINI_FALLBACK_UNAVAILABLE/.test(err) &&
           /CODEX_QUOTA|USV_QUOTA_WAIT/.test(err));
        if (!providerHold) return output;
        const [codex, gemini] = await Promise.all([
          codexQuota.status(), geminiQuota.status()
        ]);
        const time = Date.now();
        const next = [codex.retryAfter, gemini.retryAfter]
          .filter((t): t is string => !!t)
          .map(t => Date.parse(t))
          .filter(t => Number.isFinite(t) && t > time);
        transientRetries++;
        const backoffMs = Math.min(15 * 60_000,
          60_000 * 2 ** Math.min(transientRetries - 1, 4));
        const notBefore = next.length ? Math.min(...next) : time + backoffMs;
        const delay = Math.max(10_000, Math.min(notBefore - time, 15 * 60_000));
        console.log(JSON.stringify({
          status: 'WAITING_FOR_SUBSCRIPTION_CAPACITY',
          agent: id, codex: codex.reason, gemini: gemini.reason,
          retryNumber: transientRetries,
          nextLocalCheck: new Date(time + delay).toISOString(),
          stopRequiresExplicitOwnerAction: true,
          engineeringReleaseApproved: false
        }));
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    };
    report = await runLiveAgentMatrix(cases, runWithQuotaHold, {
      dependencyAware: true,
      resume: { findings: checkpoint.completed, advisories: checkpoint.advisories },
      beforeAgent: async (finding) => {
        checkpoint.pending = {
          canonicalId: finding.canonicalId, runtimeId: finding.runtimeId,
          startedAtUtc: finding.startedAt || new Date().toISOString(),
          possibleDuplicate: true
        };
        checkpoint.updatedAtUtc = new Date().toISOString();
        writePrivateAtomic(CHECKPOINT, checkpoint);
        console.log('CODEX_26_AGENT_ATTEMPT_STARTED: ' + finding.canonicalId);
      },
      onFinding: async (finding, completed, advisory) => {
        if (finding.status !== 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED' || !advisory) {
          // Fail rather than silently mark a failed role as reusable.
          // Keep the pending marker for an explicit uncertain-retry decision.
          writePrivateAtomic(ERROR_REPORT, {
            sourceSha: implementationSha, catalogSha256: provenance.catalogSha256,
            agent: finding.canonicalId, status: finding.status,
            failureReason: finding.failureReason || 'MODEL_EXECUTION_NOT_VERIFIED',
            completedCount: checkpoint.completedCount,
            recoveryRequiresExplicitRetryAcknowledgment: true,
            engineeringReleaseApproved: false
          });
          throw new Error('CODEX_RESUME_FIRST_UNSUCCESSFUL_AGENT: ' + finding.canonicalId +
            ' [' + finding.status + ']; see private interruption report');
        }
        finding.originSourceSha = implementationSha;
        checkpoint.completed = [...completed];
        checkpoint.completedCount = completed.length;
        checkpoint.advisories[finding.runtimeId] = advisory;
        checkpoint.pending = null;
        checkpoint.updatedAtUtc = new Date().toISOString();
        writePrivateAtomic(CHECKPOINT, verifyCheckpoint(checkpoint, binding));
        writePrivateAtomic(RESUME_PROGRESS, {
          implementationSha, catalogSha256: provenance.catalogSha256,
          historicalSourceSha: checkpoint.legacySourceSha,
          completedCount: completed.length,
          liveProviderRunsCurrentSource: completed.filter(f =>
            f.status === 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED').length,
          historicalProviderRuns: completed.filter(f =>
            f.status === 'HISTORICAL_LIVE_PROVIDER_EXECUTED_UNCERTIFIED').length,
          completed, engineeringReleaseApproved: false,
          independentlyEngineeringValidated: false
        });
      }
    });
  } finally {
    unlock();
  }
  await assertPinnedCleanGitRevision(process.cwd(), implementationSha);
  const location = path.resolve('data/codex-26-agent-matrix.json');
  fs.mkdirSync(path.dirname(location), { recursive: true });
  const campaignEvidence = {
    ...report, ...provenance,
    commissioning,
    dependencyAware: true,
    controlledVesselConfigurationId: catalog.controlledVesselConfigurationId,
    dataClassification: catalog.dataClassification,
    illustrativeNonOperational: catalog.dataClassification === 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL',
    historicalCatalogBaseline: catalog.baselineSha,
    independentlyEngineeringValidated: false as const,
    engineeringReleaseApproved: false as const
  };
  writePrivateAtomic(location, campaignEvidence);
  const assessment = assessEngineeringCampaign(campaignEvidence, {
    expectedCommit: implementationSha,
    campaignReportSha256: 'sha256:' + createHash('sha256').update(fs.readFileSync(location)).digest('hex'),
    preflight
  });
  const assessmentPath = path.resolve('governance/reports/26-agent-engineering-campaign-status.json');
  fs.mkdirSync(path.dirname(assessmentPath), { recursive: true });
  fs.writeFileSync(assessmentPath, JSON.stringify(assessment, null, 2) + '\n');
  const complete = report.providerOperationalMatrixComplete &&
    report.findings.every(row => row.provider === 'codex_cli' ||
      (row.provider === 'gemini_cli' &&
       row.modelIdentifier === 'gemini-4-hydrogen'));
  console.log(JSON.stringify({
    status: complete
      ? 'DUAL_SUBSCRIPTION_26_PROVIDER_RUNS_OBSERVED_UNCERTIFIED'
      : report.findings.length === 26 && report.historicalProviderRuns > 0 &&
        report.liveProviderRuns + report.historicalProviderRuns === 26
        ? 'CODEX_26_MIXED_SOURCE_RESEARCH_OBSERVED_UNCERTIFIED'
        : 'CODEX_CAMPAIGN_INCOMPLETE',
    agents: report.totalAgents,
    liveProviderRuns: report.liveProviderRuns,
    historicalProviderRuns: report.historicalProviderRuns,
    currentSourceCodexRuns: report.findings.filter(row =>
      row.status === 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED' &&
      row.provider === 'codex_cli').length,
    currentSourceGeminiRuns: report.findings.filter(row =>
      row.status === 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED' &&
      row.provider === 'gemini_cli').length,
    exactSource26of26: complete,
    commissioningScope: commissioning.scope,
    report: location,
    acceptanceReport: assessmentPath,
    operationalOnCurrentInfrastructure: assessment.operationalOnCurrentInfrastructure,
    fullyAutomatedEngineeringCampaign: assessment.fullyAutomatedEngineeringCampaign,
    independentlyValidatedEngineeringOutputs: assessment.independentlyValidatedEngineeringOutputs,
    engineeringReleaseApproved: false
  }, null, 2));
  if (!complete && !(report.findings.length === 26 &&
      report.historicalProviderRuns > 0 &&
      report.liveProviderRuns + report.historicalProviderRuns === 26)) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('Codex campaign failed closed:', error instanceof Error ? error.message : 'unknown failure');
  process.exitCode = 1;
});
