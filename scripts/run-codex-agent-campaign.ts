/**
 * Run all 26 canonical specialists against a historical non-operational input
 * catalog. Subscription-authenticated live Codex runs are explicit opt-in.
 * No output from this script is certified vessel evidence.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { assertPinnedCleanGitRevision } from '../src/core/mission-control/GitRevisionGuard.ts';
import fs from 'node:fs';
import path from 'node:path';
import { compileCodexAgentCases } from '../src/core/verification/CodexMatrixInput.ts';
import { runLiveAgentMatrix } from '../src/core/verification/LiveAgentMatrix.ts';
import { preflightCodexAgentCases } from '../src/core/verification/CodexCampaignPreflight.ts';
import { requireLabCommissioningPolicy } from '../src/core/mission-control/LabCommissioningPolicy.ts';
import { assessEngineeringCampaign } from '../src/core/verification/EngineeringCampaignAcceptance.ts';

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
  const cases = compileCodexAgentCases(catalog);
  const preflight = await preflightCodexAgentCases(cases);
  const preflightPath = path.resolve(execute ? 'data/codex-26-agent-preflight.json' : 'governance/reports/codex-26-agent-preflight.json');
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
  // A single command runs the entire engineering DAG. Every transition is
  // journaled atomically so a CLI crash cannot erase prior attempted agents.
  const progressFile = path.resolve('data/codex-26-agent-progress.json');
  fs.mkdirSync(path.dirname(progressFile), { recursive: true });
  const report = await runLiveAgentMatrix(cases, undefined, {
    dependencyAware: true,
    onFinding: async (_finding, completed) => {
      const progress = {
        ...provenance, commissioningScope: commissioning.scope,
        dataClassification: catalog.dataClassification,
        dependencyAware: true, completedCount: completed.length,
        completed, engineeringReleaseApproved: false,
        independentlyEngineeringValidated: false
      };
      const temporary = progressFile + '.tmp';
      fs.writeFileSync(temporary, JSON.stringify(progress, null, 2) + '\n');
      fs.renameSync(temporary, progressFile);
    }
  });
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
  fs.writeFileSync(location, JSON.stringify(campaignEvidence, null, 2) + '\n');
  const assessment = assessEngineeringCampaign(campaignEvidence, {
    expectedCommit: implementationSha,
    campaignReportSha256: 'sha256:' + createHash('sha256').update(fs.readFileSync(location)).digest('hex'),
    preflight
  });
  const assessmentPath = path.resolve('governance/reports/26-agent-engineering-campaign-status.json');
  fs.mkdirSync(path.dirname(assessmentPath), { recursive: true });
  fs.writeFileSync(assessmentPath, JSON.stringify(assessment, null, 2) + '\n');
  const complete = report.providerOperationalMatrixComplete && report.findings.every(row => row.provider === 'codex_cli');
  console.log(JSON.stringify({
    status: complete
      ? 'CODEX_26_PROVIDER_RUNS_OBSERVED_UNCERTIFIED' : 'CODEX_CAMPAIGN_INCOMPLETE',
    agents: report.totalAgents,
    liveProviderRuns: report.liveProviderRuns,
    commissioningScope: commissioning.scope,
    report: location,
    acceptanceReport: assessmentPath,
    operationalOnCurrentInfrastructure: assessment.operationalOnCurrentInfrastructure,
    fullyAutomatedEngineeringCampaign: assessment.fullyAutomatedEngineeringCampaign,
    independentlyValidatedEngineeringOutputs: assessment.independentlyValidatedEngineeringOutputs,
    engineeringReleaseApproved: false
  }, null, 2));
  if (!complete) process.exitCode = 1;
}

main().catch(error => {
  console.error('Codex campaign failed closed:', error instanceof Error ? error.message : 'unknown failure');
  process.exitCode = 1;
});
