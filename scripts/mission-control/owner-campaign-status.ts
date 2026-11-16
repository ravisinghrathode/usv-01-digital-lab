/**
 * Read-only campaign status for the operator's private Mac checkpoint.
 *
 * Never invokes a model, alters a checkpoint, creates qualifications, or
 * rewrites the source-bound 26-agent matrix. Safe while a campaign is running.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { AgentRegistry } from '../../src/core/registry/AgentRegistry.ts';
import { compileCodexAgentCases } from '../../src/core/verification/CodexMatrixInput.ts';
import { topologicalAgentOrder } from '../../src/core/verification/TopologicalAgentCampaign.ts';
import { reconcileSyntheticCampaign } from '../../src/core/verification/SyntheticCampaignReconciliation.ts';
import type { ResumeBinding } from '../../src/core/verification/CodexCampaignCheckpoint.ts';

const CHECKPOINT = path.resolve('data/codex-26-agent-checkpoint.json');
const CATALOG = path.resolve('evidence/live-agents/representative-cases.json');
const SHA = /^[a-f0-9]{40}$/;

function readPrivateCheckpoint(file: string): unknown {
  const st = fs.lstatSync(file);
  if (!st.isFile() || st.isSymbolicLink() || st.size < 2 ||
      st.size > 2 * 1024 * 1024 || (st.mode & 0o077) !== 0) {
    throw new Error('CAMPAIGN_STATUS_UNSAFE_OR_OVERSIZED_PRIVATE_CHECKPOINT');
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
}
function main(): void {
  if (process.argv.length > 2) {
    throw new Error('CAMPAIGN_STATUS_READ_ONLY_ACCEPTS_NO_ARGUMENTS');
  }
  if (!fs.existsSync(CHECKPOINT)) {
    console.log(JSON.stringify({
      phase: 'NO_LOCAL_CHECKPOINT',
      report: 'No private operator-host campaign evidence available',
      engineeringReleaseApproved: false
    }, null, 2));
    return;
  }
  const raw = readPrivateCheckpoint(CHECKPOINT);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      !('implementationSha' in raw) ||
      typeof raw.implementationSha !== 'string' ||
      !SHA.test(raw.implementationSha)) {
    throw new Error('CAMPAIGN_STATUS_INVALID_SOURCE_SHA');
  }
  const sourceSha = raw.implementationSha;
  const currentSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8', timeout: 10000
  }).trim();
  const ancestry = spawnSync('git', [
    'merge-base', '--is-ancestor', sourceSha, currentSha
  ], { encoding: 'utf8', timeout: 10000, shell: false });
  if (ancestry.status !== 0 || ancestry.error) {
    throw new Error('CAMPAIGN_STATUS_CHECKPOINT_SOURCE_NOT_IN_CURRENT_ANCESTRY');
  }
  const bytes = fs.readFileSync(CATALOG);
  const catalog = JSON.parse(bytes.toString('utf8'));
  const binding: ResumeBinding = {
    implementationSha: sourceSha,
    catalogSha256: createHash('sha256').update(bytes).digest('hex'),
    dataClassification: catalog.dataClassification,
    specs: topologicalAgentOrder(AgentRegistry.getInstance().getAllAgents()),
    cases: compileCodexAgentCases(catalog)
  };
  if (catalog.dataClassification !== 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL') {
    throw new Error('CAMPAIGN_STATUS_CATALOG_NOT_FIXED_SYNTHETIC_CASES');
  }
  const status = reconcileSyntheticCampaign(raw, binding);
  console.log(JSON.stringify({
    ...status,
    checkoutSha: currentSha,
    currentCheckoutMatchesCampaignSha: currentSha === sourceSha,
    researchOnly: true,
    // A pending attempt is not proof that a process is still executing.
    pendingMayBeRunningOrInterrupted: status.pendingAttempt !== null,
    academyQualificationStatus: 'NOT_ESTABLISHED_BY_EXECUTION_JOURNAL',
    note: 'A complete synthetic campaign does not certify any naval design.'
  }, null, 2));
}
try { main(); }
catch (error) {
  console.error('Read-only campaign check refused:', error instanceof Error ?
    error.message : String(error));
  process.exitCode = 1;
}
