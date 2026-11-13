/**
 * Offline, deterministic, fail-closed assessment of 26-agent commissioning.
 * Safe to run in CI even when no Codex login, host attestation or independent
 * engineering references exist. Absence of evidence is NOT a green status.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  assessEngineeringCampaign, type LiveCampaignEvidence,
  type SignedHostHealth, type ExternalEngineeringReview
} from '../src/core/verification/EngineeringCampaignAcceptance.ts';
import type { CodexCampaignPreflight } from '../src/core/verification/CodexCampaignPreflight.ts';

const args = process.argv.slice(2);
function arg(name: string, fallback?: string): string | undefined {
  const pos = args.indexOf(name);
  if (pos < 0) return fallback;
  if (!args[pos + 1] || args[pos + 1].startsWith('--')) {
    throw new Error('Missing value for ' + name);
  }
  return args[pos + 1];
}
function jsonIfPresent<T>(file?: string): { value?: T; digest?: string } {
  if (!file) return {};
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) return {};
  if (fs.statSync(resolved).size > 5 * 1024 * 1024) throw new Error('Oversized evidence file: ' + file);
  const bytes = fs.readFileSync(resolved);
  return {
    value: JSON.parse(bytes.toString('utf8')) as T,
    digest: 'sha256:' + createHash('sha256').update(bytes).digest('hex')
  };
}

try {
  const root = process.cwd();
  const exactSha = arg('--source-sha') ||
    execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const live = jsonIfPresent<LiveCampaignEvidence>(arg('--report', 'data/codex-26-agent-matrix.json'));
  const preflight = jsonIfPresent<CodexCampaignPreflight>(arg('--preflight', 'data/codex-26-agent-preflight.json'));
  const host = jsonIfPresent<SignedHostHealth>(arg('--host'));
  const reviews = jsonIfPresent<ExternalEngineeringReview[]>(arg('--reviews'));

  const result = assessEngineeringCampaign(live.value, {
    expectedCommit: exactSha,
    campaignReportSha256: live.digest,
    preflight: preflight.value,
    host: host.value,
    reviews: reviews.value,
    hostPublicKeyPem: process.env.USV_HOST_ATTESTATION_PUBLIC_KEY,
    independentReviewerPublicKeyPem: process.env.USV_INDEPENDENT_REVIEWER_PUBLIC_KEY,
    referenceRootDir: root
  });

  const output = path.resolve(arg('--out') || 'governance/reports/26-agent-engineering-campaign-status.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({
    operationalOnCurrentInfrastructure: result.operationalOnCurrentInfrastructure,
    fullyAutomatedEngineeringCampaign: result.fullyAutomatedEngineeringCampaign,
    independentlyValidatedEngineeringOutputs: result.independentlyValidatedEngineeringOutputs,
    liveCodexAgents: result.liveCodexAgents,
    independentlyAttestedAgents: result.independentlyAttestedAgents,
    blockers: result.deficiencies,
    report: output,
    engineeringReleaseApproved: false
  }, null, 2));
  if (args.includes('--require-all') &&
      (!result.operationalOnCurrentInfrastructure ||
       !result.fullyAutomatedEngineeringCampaign ||
       !result.independentlyValidatedEngineeringOutputs)) process.exitCode = 1;
} catch (error) {
  console.error('26-agent campaign assessment refused:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
