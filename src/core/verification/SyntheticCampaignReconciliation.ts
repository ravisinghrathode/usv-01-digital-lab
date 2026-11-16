/**
 * Read-only, source-bound research execution reconciliation.
 * A complete 26/26 synthetic trace journal is NOT engineering acceptance or
 * evidence that an agent has studied/passed an independent blind examination.
 */
import { verifyCheckpoint, type ResumeBinding } from './CodexCampaignCheckpoint.ts';

export interface SyntheticCampaignStatus {
  schemaVersion: 'USV-SYNTHETIC-CAMPAIGN-STATUS-1';
  implementationSha: string;
  dataClassification: string;
  totalAgents: 26;
  completed: number;
  historical: number;
  currentCodex: number;
  currentGemini: number;
  remaining: number;
  nextAgent: string | null;
  pendingAttempt: string | null;
  lastCheckpointUtc: string;
  completedByOriginalSource: Array<{ sourceSha: string; agents: number }>;
  phase: 'NO_EXECUTIONS' | 'PARTIAL_RESEARCH' | 'RESEARCH_TRACES_RECORDED_UNCERTIFIED';
  all26TracesRecorded: boolean;
  exactSource26of26: boolean;
  independentlyQualifiedAgentsEstablished: false;
  independentlyEngineeringValidated: false;
  vesselDesignCertified: false;
  engineeringReleaseApproved: false;
}

export function reconcileSyntheticCampaign(
  raw: unknown, binding: ResumeBinding
): SyntheticCampaignStatus {
  const cp = verifyCheckpoint(raw, binding);
  if (binding.specs.length !== 26) {
    throw new Error('SYNTHETIC_CAMPAIGN_EXPECTS_EXACTLY_26_ROLES');
  }
  const historical = cp.completed.filter(f =>
    f.status === 'HISTORICAL_LIVE_PROVIDER_EXECUTED_UNCERTIFIED').length;
  const current = cp.completed.filter(f =>
    f.status === 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED');
  const currentCodex = current.filter(f => f.provider === 'codex_cli').length;
  const currentGemini = current.filter(f => f.provider === 'gemini_cli').length;
  if (current.length !== currentCodex + currentGemini ||
      cp.completed.length !== historical + current.length) {
    throw new Error('SYNTHETIC_CAMPAIGN_PROVIDER_ACCOUNTING_MISMATCH');
  }
  const bySha = new Map<string, number>();
  for (const f of cp.completed) {
    const source = f.originSourceSha || '';
    bySha.set(source, (bySha.get(source) ?? 0) + 1);
  }
  const all26 = cp.completed.length === 26 && cp.pending === null;
  return {
    schemaVersion: 'USV-SYNTHETIC-CAMPAIGN-STATUS-1',
    implementationSha: cp.implementationSha,
    dataClassification: cp.dataClassification,
    totalAgents: 26,
    completed: cp.completedCount,
    historical,
    currentCodex,
    currentGemini,
    remaining: 26 - cp.completedCount,
    nextAgent: binding.specs[cp.completedCount]?.canonicalId || null,
    pendingAttempt: cp.pending?.canonicalId || null,
    lastCheckpointUtc: cp.updatedAtUtc,
    completedByOriginalSource: [...bySha].map(([sourceSha, agents]) => ({
      sourceSha, agents
    })),
    phase: all26 ? 'RESEARCH_TRACES_RECORDED_UNCERTIFIED' :
      cp.completedCount > 0 ? 'PARTIAL_RESEARCH' : 'NO_EXECUTIONS',
    all26TracesRecorded: all26,
    exactSource26of26: all26 && historical === 0 &&
      current.length === 26,
    independentlyQualifiedAgentsEstablished: false,
    independentlyEngineeringValidated: false,
    vesselDesignCertified: false,
    engineeringReleaseApproved: false
  };
}
