import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { compileCodexAgentCases } from '../src/core/verification/CodexMatrixInput.ts';
import { topologicalAgentOrder, legacyDigestOnlyAdvisory } from
  '../src/core/verification/TopologicalAgentCampaign.ts';
import {
  emptyCheckpoint, type CodexCheckpoint, type ResumeBinding
} from '../src/core/verification/CodexCampaignCheckpoint.ts';
import { reconcileSyntheticCampaign } from
  '../src/core/verification/SyntheticCampaignReconciliation.ts';
import type { AgentRunFinding } from '../src/core/verification/LiveAgentMatrix.ts';

const bytes = fs.readFileSync(path.resolve('evidence/live-agents/representative-cases.json'));
const catalog = JSON.parse(bytes.toString('utf8'));
const specs = topologicalAgentOrder(AgentRegistry.getInstance().getAllAgents());
const sameSha = 'b'.repeat(40);
const olderSha = 'a'.repeat(40);
const binding: ResumeBinding = {
  implementationSha: sameSha,
  catalogSha256: createHash('sha256').update(bytes).digest('hex'),
  dataClassification: catalog.dataClassification,
  specs, cases: compileCodexAgentCases(catalog)
};

function checkpoint(n: number, historical = 0, gemini = 0): CodexCheckpoint {
  const cp = emptyCheckpoint(binding);
  cp.historicalSourceShas = historical ? [olderSha] : [];
  cp.completed = specs.slice(0, n).map((spec, index): AgentRunFinding => {
    const old = index < historical;
    const usesGemini = !old && index >= n - gemini;
    return {
      canonicalId: spec.canonicalId,
      runtimeId: spec.id,
      inputTaskId: binding.cases[spec.canonicalId].taskId,
      dependencyIds: [...spec.dependencies],
      status: old ? 'HISTORICAL_LIVE_PROVIDER_EXECUTED_UNCERTIFIED' :
        'LIVE_PROVIDER_EXECUTED_UNCERTIFIED',
      originSourceSha: old ? olderSha : sameSha,
      provider: usesGemini ? 'gemini_cli' : 'codex_cli',
      modelIdentifier: usesGemini ? 'gemini-4-hydrogen' : 'synthetic-codex-unverified',
      providerExecutionMode: 'LIVE_AI_GENERATION',
      outputDigestSha256: 'sha256:' + 'f'.repeat(64),
      correlationId: 'synthetic-correlation-' + spec.canonicalId,
      completedAt: '2026-11-17T03:00:00.000Z',
      requiredToolsVerified: true,
      toolTraces: spec.verificationCriteria.mandatoryDeterministicTools.map(toolId =>
        ({ toolId, verified: true, inputSha256: '0'.repeat(64),
          outputSha256: '1'.repeat(64) }))
    };
  });
  cp.completedCount = n;
  cp.advisories = Object.fromEntries(cp.completed.map(x =>
    [x.runtimeId, legacyDigestOnlyAdvisory(x.outputDigestSha256!)]));
  if (n > 0 && n < 26) {
    cp.pending = {canonicalId: specs[n].canonicalId, runtimeId: specs[n].id,
      startedAtUtc: '2026-11-17T03:10:00.000Z', possibleDuplicate: true};
  }
  return cp;
}

describe('zero-model post-campaign reconciliation', () => {
  it('labels zero executions as unqualified and unreleased', () => {
    const s = reconcileSyntheticCampaign(checkpoint(0), binding);
    expect(s.phase).toBe('NO_EXECUTIONS');
    expect(s.completed).toBe(0);
    expect(s.remaining).toBe(26);
    expect(s.independentlyQualifiedAgentsEstablished).toBe(false);
    expect(s.engineeringReleaseApproved).toBe(false);
  });
  it('accounts for nine historical/new attempts and ambiguous in-flight A10', () => {
    const s = reconcileSyntheticCampaign(checkpoint(9, 2), binding);
    expect(s.phase).toBe('PARTIAL_RESEARCH');
    expect(s.completed).toBe(9);
    expect(s.historical).toBe(2);
    expect(s.currentCodex).toBe(7);
    expect(s.currentGemini).toBe(0);
    expect(s.nextAgent).toBe(specs[9].canonicalId);
    expect(s.pendingAttempt).toBe(specs[9].canonicalId);
    expect(s.completedByOriginalSource).toEqual([
      {sourceSha: olderSha, agents: 2},
      {sourceSha: sameSha, agents: 7}
    ]);
    expect(s.all26TracesRecorded).toBe(false);
    expect(s.exactSource26of26).toBe(false);
  });
  it('distinguishes 26 mixed-source traces from same-source 26/26 and independent qualification', () => {
    const s = reconcileSyntheticCampaign(checkpoint(26, 9, 2), binding);
    expect(s.phase).toBe('RESEARCH_TRACES_RECORDED_UNCERTIFIED');
    expect(s.completed).toBe(26);
    expect(s.remaining).toBe(0);
    expect(s.historical).toBe(9);
    expect(s.currentCodex).toBe(15);
    expect(s.currentGemini).toBe(2);
    expect(s.all26TracesRecorded).toBe(true);
    expect(s.exactSource26of26).toBe(false);
    expect(s.independentlyEngineeringValidated).toBe(false);
    expect(s.vesselDesignCertified).toBe(false);
  });
  it('counts same-source 26 trace journal without promoting research to engineering release', () => {
    const s = reconcileSyntheticCampaign(checkpoint(26, 0, 2), binding);
    expect(s.exactSource26of26).toBe(true);
    expect(s.engineeringReleaseApproved).toBe(false);
    expect(s.independentlyQualifiedAgentsEstablished).toBe(false);
  });
  it('rejects tampered counts and unsupported provider claims', () => {
    const cp = checkpoint(9, 2);
    cp.completedCount = 26;
    expect(() => reconcileSyntheticCampaign(cp, binding)).toThrow();
    cp.completedCount = 9;
    cp.completed[2].provider = 'mock_deterministic';
    expect(() => reconcileSyntheticCampaign(cp, binding)).toThrow();
  });
});
