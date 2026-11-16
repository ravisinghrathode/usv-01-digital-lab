/**
 * Durable, source-bound local Codex campaign recovery.
 * This is a private, operator-controlled *journal*, not a signed model attestation.
 * Preserve actual old-SHA attempts honestly: they can supply unverified advisory
 * ancestry but NEVER count toward a new SHA's 26/26 live acceptance.
 */
import { createHash } from 'node:crypto';
import type { AgentSpec, AgentExecutionInput } from '../types/agent.ts';
import type { AgentRunFinding } from './LiveAgentMatrix.ts';
import {
  legacyDigestOnlyAdvisory, type AgentAdvisoryReceipt
} from './TopologicalAgentCampaign.ts';

export const CODEX_CHECKPOINT_SCHEMA = 'USV-CODEX-26-RESUME-1' as const;
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const HASH = /^[a-f0-9]{64}$/;
const SUCCESS = 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED';
const HISTORICAL = 'HISTORICAL_LIVE_PROVIDER_EXECUTED_UNCERTIFIED';

export interface PendingModelAttempt {
  canonicalId: string;
  runtimeId: string;
  /** Null for a legacy log that had no before-call marker. */
  startedAtUtc: string | null;
  possibleDuplicate: true;
}
export interface CodexCheckpoint {
  schemaVersion: typeof CODEX_CHECKPOINT_SCHEMA;
  implementationSha: string;
  catalogSha256: string;
  dataClassification: string;
  dependencyAware: true;
  createdAtUtc: string;
  updatedAtUtc: string;
  completedCount: number;
  completed: AgentRunFinding[];
  advisories: Record<string, AgentAdvisoryReceipt>;
  pending: PendingModelAttempt | null;
  legacySourceSha: string | null;
  legacyJournalSha256: string | null;
  uncertainRetryAcknowledgments: Array<{
    canonicalId: string; acknowledgedAtUtc: string;
  }>;
  independentlyEngineeringValidated: false;
  engineeringReleaseApproved: false;
}
export interface ResumeBinding {
  implementationSha: string;
  catalogSha256: string;
  dataClassification: string;
  specs: readonly AgentSpec[];
  cases: Record<string, AgentExecutionInput>;
}

export function sha256Bytes(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}
export function emptyCheckpoint(binding: ResumeBinding): CodexCheckpoint {
  if (!SHA.test(binding.implementationSha) || !HASH.test(binding.catalogSha256)) {
    throw new Error('CODEX_RESUME_INVALID_PROVENANCE');
  }
  const timestamp = new Date().toISOString();
  return {
    schemaVersion: CODEX_CHECKPOINT_SCHEMA,
    implementationSha: binding.implementationSha,
    catalogSha256: binding.catalogSha256,
    dataClassification: binding.dataClassification,
    dependencyAware: true, createdAtUtc: timestamp, updatedAtUtc: timestamp,
    completedCount: 0, completed: [], advisories: {}, pending: null,
    legacySourceSha: null, legacyJournalSha256: null,
    uncertainRetryAcknowledgments: [],
    independentlyEngineeringValidated: false, engineeringReleaseApproved: false
  };
}
function isPlainObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}
function validAdvisory(x: unknown, finding: AgentRunFinding): x is AgentAdvisoryReceipt {
  if (!isPlainObject(x)) return false;
  return x.dataClassification === 'UNVERIFIED_UPSTREAM_ADVISORY' &&
    x.engineeringReleaseApproved === false &&
    x.outputSha256 === finding.outputDigestSha256 &&
    typeof x.disciplineSummary === 'string' && x.disciplineSummary.length <= 700 &&
    Array.isArray(x.openTbdItems) && x.openTbdItems.length <= 8 &&
    x.openTbdItems.every(v => typeof v === 'string') &&
    typeof x.status === 'string' && typeof x.provider === 'string';
}
function validatePrefix(
  completed: AgentRunFinding[], advisories: Record<string, AgentAdvisoryReceipt>,
  binding: ResumeBinding
): void {
  if (completed.length > binding.specs.length ||
      Object.keys(advisories).length !== completed.length) {
    throw new Error('CODEX_RESUME_INVALID_PREFIX');
  }
  for (let i = 0; i < completed.length; i++) {
    const f = completed[i];
    const spec = binding.specs[i];
    const input = binding.cases[spec.canonicalId];
    if (!isPlainObject(f) || !input || f.canonicalId !== spec.canonicalId ||
        f.runtimeId !== spec.id || f.inputTaskId !== input.taskId ||
        f.provider !== 'codex_cli' ||
        f.providerExecutionMode !== 'LIVE_AI_GENERATION' ||
        f.requiredToolsVerified !== true ||
        !DIGEST.test(f.outputDigestSha256 || '') ||
        typeof f.correlationId !== 'string' || !f.correlationId ||
        !f.completedAt || !Number.isFinite(Date.parse(f.completedAt)) ||
        !Array.isArray(f.dependencyIds) ||
        JSON.stringify(f.dependencyIds) !== JSON.stringify(spec.dependencies) ||
        !Array.isArray(f.toolTraces) ||
        !spec.verificationCriteria.mandatoryDeterministicTools.every(id =>
          f.toolTraces?.some(t => t.toolId === id && t.verified === true)) ||
        ![SUCCESS, HISTORICAL].includes(f.status) ||
        (f.status === HISTORICAL &&
          (!f.originSourceSha || !SHA.test(f.originSourceSha) ||
           f.originSourceSha === binding.implementationSha)) ||
        (f.status === SUCCESS && f.originSourceSha !== binding.implementationSha) ||
        !validAdvisory(advisories[spec.id], f)) {
      throw new Error('CODEX_RESUME_INVALID_SUCCESS_EVIDENCE_AT_' + spec.canonicalId);
    }
  }
}
export function verifyCheckpoint(raw: unknown, binding: ResumeBinding): CodexCheckpoint {
  if (!isPlainObject(raw) || raw.schemaVersion !== CODEX_CHECKPOINT_SCHEMA ||
      raw.implementationSha !== binding.implementationSha ||
      raw.catalogSha256 !== binding.catalogSha256 ||
      raw.dataClassification !== binding.dataClassification ||
      raw.dependencyAware !== true ||
      raw.independentlyEngineeringValidated !== false ||
      raw.engineeringReleaseApproved !== false ||
      !Array.isArray(raw.completed) || !isPlainObject(raw.advisories) ||
      raw.completedCount !== raw.completed.length ||
      !Array.isArray(raw.uncertainRetryAcknowledgments) ||
      (raw.legacySourceSha !== null &&
        (typeof raw.legacySourceSha !== 'string' ||
         !SHA.test(raw.legacySourceSha))) ||
      (raw.legacyJournalSha256 !== null &&
        (typeof raw.legacyJournalSha256 !== 'string' ||
         !HASH.test(raw.legacyJournalSha256)))) {
    throw new Error('CODEX_RESUME_CHECKPOINT_MISMATCH_OR_MALFORMED');
  }
  const checkpoint = raw as unknown as CodexCheckpoint;
  validatePrefix(checkpoint.completed, checkpoint.advisories, binding);
  if (checkpoint.legacySourceSha !== null) {
    const oldRows = checkpoint.completed.filter(f => f.status === HISTORICAL);
    if (!oldRows.length || oldRows.some(f => f.originSourceSha !== checkpoint.legacySourceSha)) {
      throw new Error('CODEX_RESUME_LEGACY_SOURCE_INCONSISTENT');
    }
  }
  if (checkpoint.pending !== null) {
    const next = binding.specs[checkpoint.completed.length];
    if (!next || !isPlainObject(checkpoint.pending) ||
        checkpoint.pending.canonicalId !== next.canonicalId ||
        checkpoint.pending.runtimeId !== next.id ||
        checkpoint.pending.possibleDuplicate !== true ||
        (checkpoint.pending.startedAtUtc !== null &&
         (typeof checkpoint.pending.startedAtUtc !== 'string' ||
          !Number.isFinite(Date.parse(checkpoint.pending.startedAtUtc))))) {
      throw new Error('CODEX_RESUME_AMBIGUOUS_PENDING_INVALID');
    }
  }
  return checkpoint;
}
/**
 * Import the OLD 2026 journal only with explicit operator consent.
 * No full old outputs are available: record old SHA and hashes; never
 * reconstitute fabricated narratives or claim old traces on new SHA.
 */
export function importLegacyProgress(
  raw: unknown, legacyBytes: Buffer, binding: ResumeBinding,
  allowCrossSourceHistorical: boolean
): CodexCheckpoint {
  if (!isPlainObject(raw) || !SHA.test(String(raw.implementationSha)) ||
      raw.catalogSha256 !== binding.catalogSha256 ||
      raw.dataClassification !== binding.dataClassification ||
      raw.commissioningScope !== 'LAB_COMMISSIONING_RESEARCH' ||
      raw.dependencyAware !== true ||
      raw.engineeringReleaseApproved !== false ||
      raw.independentlyEngineeringValidated !== false ||
      !Array.isArray(raw.completed) ||
      raw.completedCount !== raw.completed.length ||
      !raw.completed.length ||
      raw.completed.length >= binding.specs.length ||
      (raw.implementationSha !== binding.implementationSha &&
       !allowCrossSourceHistorical)) {
    throw new Error('CODEX_RESUME_LEGACY_PROVENANCE_UNACCEPTABLE');
  }
  const legacySha = String(raw.implementationSha);
  const historical = legacySha !== binding.implementationSha;
  const cp = emptyCheckpoint(binding);
  cp.legacySourceSha = historical ? legacySha : null;
  cp.legacyJournalSha256 = sha256Bytes(legacyBytes);
  for (const row of raw.completed as AgentRunFinding[]) {
    const validated = {
      ...row,
      originSourceSha: legacySha,
      status: historical ? HISTORICAL : SUCCESS
    } as AgentRunFinding;
    cp.completed.push(validated);
    cp.advisories[validated.runtimeId] =
      legacyDigestOnlyAdvisory(validated.outputDigestSha256 || '');
  }
  cp.completedCount = cp.completed.length;
  // The legacy script did NOT journal an in-flight model call. The next
  // agent may have executed before the abrupt stop: never auto-repeat it.
  const next = binding.specs[cp.completed.length];
  cp.pending = {
    canonicalId: next.canonicalId, runtimeId: next.id,
    startedAtUtc: null, possibleDuplicate: true
  };
  return verifyCheckpoint(cp, binding);
}
export function acknowledgeUncertainAttempt(
  checkpoint: CodexCheckpoint, binding: ResumeBinding
): CodexCheckpoint {
  if (!checkpoint.pending) return checkpoint;
  const state: CodexCheckpoint = {
    ...checkpoint,
    pending: null,
    uncertainRetryAcknowledgments: [
      ...checkpoint.uncertainRetryAcknowledgments,
      { canonicalId: checkpoint.pending.canonicalId,
        acknowledgedAtUtc: new Date().toISOString() }
    ],
    updatedAtUtc: new Date().toISOString()
  };
  return verifyCheckpoint(state, binding);
}
