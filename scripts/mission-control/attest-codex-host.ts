/**
 * Produce a short-lived, cryptographically bound health attestation on the
 * *actual* live execution host after 26 authenticated Codex agent executions.
 * The private key belongs to the operator, stays outside Git and is never
 * generated, exported or supplied by ChatGPT.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, sign } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  HOST_HEALTH_SCHEMA, canonicalHostHealth,
  type LiveCampaignEvidence, type SignedHostHealth
} from '../../src/core/verification/EngineeringCampaignAcceptance.ts';
import { assertPinnedCleanGitRevision } from '../../src/core/mission-control/GitRevisionGuard.ts';
import { requireLabCommissioningPolicy } from '../../src/core/mission-control/LabCommissioningPolicy.ts';
import { AgentRegistry } from '../../src/core/registry/AgentRegistry.ts';

const args = process.argv.slice(2);
const argument = (key: string, fallback: string): string => {
  const index = args.indexOf(key);
  return index < 0 ? fallback : (args[index + 1] || '');
};

try {
  requireLabCommissioningPolicy(process.env);
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await assertPinnedCleanGitRevision(process.cwd(), sha);
  const reportFile = path.resolve(argument('--report', 'data/codex-26-agent-matrix.json'));
  if (!fs.existsSync(reportFile) || fs.statSync(reportFile).size > 5 * 1024 * 1024) {
    throw new Error('Verified live Codex campaign report is missing/oversized');
  }
  const bytes = fs.readFileSync(reportFile);
  const report = JSON.parse(bytes.toString('utf8')) as LiveCampaignEvidence;
  if (report.implementationSha !== sha ||
      report.liveProviderRuns !== 26 || !report.providerOperationalMatrixComplete ||
      report.findings.length !== 26 ||
      new Set(report.findings.map(x => x.canonicalId)).size !== 26 ||
      report.findings.some(x =>
        x.status !== 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED' ||
        x.provider !== 'codex_cli' ||
        x.providerExecutionMode !== 'LIVE_AI_GENERATION' ||
        x.requiredToolsVerified !== true || !x.correlationId ||
        !x.outputDigestSha256?.startsWith('sha256:'))) {
    throw new Error('Cannot attest an incomplete, stale or synthetic 26-agent campaign');
  }
  const createdAt = Date.parse(report.generatedAt);
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > 300_000 ||
      createdAt > Date.now() + 60_000) {
    throw new Error('Campaign is not recent enough to attest current host operation');
  }
  const check = spawnSync('codex', ['--version'], { encoding: 'utf8', timeout: 8000 });
  if (check.error || check.status !== 0) {
    throw new Error('Codex executable is unavailable on this execution host');
  }
  const registeredAgents = AgentRegistry.getInstance().getCount();
  if (registeredAgents !== 26) throw new Error('Current runtime does not register all 26 roles');
  const hostId = process.env.USV01_HOST_ID || '';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,79}$/.test(hostId)) {
    throw new Error('Set a non-secret, stable USV01_HOST_ID on the execution host');
  }
  const keyFile = path.resolve(process.env.USV_HOST_ATTESTATION_PRIVATE_KEY_FILE || '');
  const repo = process.cwd();
  if (!process.env.USV_HOST_ATTESTATION_PRIVATE_KEY_FILE ||
      keyFile === repo || keyFile.startsWith(repo + path.sep)) {
    throw new Error('Host attestation private key must be provisioned outside the source checkout');
  }
  const keyInfo = fs.statSync(keyFile);
  if (!keyInfo.isFile() || (keyInfo.mode & 0o077) !== 0) {
    throw new Error('Host attestation private key must be a private 0600/0400 file');
  }
  const privateKey = fs.readFileSync(keyFile, 'utf8');
  const record: SignedHostHealth = {
    schema: HOST_HEALTH_SCHEMA,
    hostId, implementationSha: sha,
    campaignReportSha256: 'sha256:' + createHash('sha256').update(bytes).digest('hex'),
    observedAt: new Date().toISOString(),
    runtimeHealthy: true,
    codexAuthenticated: true, // Proven by all 26 recent completed real-provider calls.
    registeredAgents,
    signatureBase64: ''
  };
  record.signatureBase64 = sign(null, Buffer.from(canonicalHostHealth(record)), privateKey).toString('base64');
  const output = path.resolve(argument('--out', 'data/codex-host-health.json'));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({
    status: 'CURRENT_HOST_ATTESTED_UNCERTIFIED',
    hostId, implementationSha: sha, report: output,
    observedAt: record.observedAt, liveAgentRuns: 26,
    engineeringReleaseApproved: false
  }, null, 2));
} catch (error) {
  console.error('Host attestation refused:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
