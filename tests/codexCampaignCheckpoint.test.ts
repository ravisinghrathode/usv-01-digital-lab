import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { compileCodexAgentCases } from '../src/core/verification/CodexMatrixInput.ts';
import {
  topologicalAgentOrder, legacyDigestOnlyAdvisory
} from '../src/core/verification/TopologicalAgentCampaign.ts';
import {
  emptyCheckpoint, verifyCheckpoint, importLegacyProgress,
  acknowledgeUncertainAttempt, type ResumeBinding
} from '../src/core/verification/CodexCampaignCheckpoint.ts';
import { runLiveAgentMatrix } from '../src/core/verification/LiveAgentMatrix.ts';
import type { AgentExecutionInput, AgentExecutionOutput, AgentSpec } from '../src/core/types/agent.ts';

const catalogBytes = fs.readFileSync(path.resolve('evidence/live-agents/representative-cases.json'));
const catalog = JSON.parse(catalogBytes.toString('utf8'));
const digest = createHash('sha256').update(catalogBytes).digest('hex');
const currentSha = 'b'.repeat(40);
const previousSha = 'a'.repeat(40);
const specs = topologicalAgentOrder(AgentRegistry.getInstance().getAllAgents());
const cases = compileCodexAgentCases(catalog);
const binding: ResumeBinding = {
  implementationSha: currentSha, catalogSha256: digest,
  dataClassification: catalog.dataClassification, specs, cases
};

function legacyResult(spec: AgentSpec) {
  return {
    canonicalId: spec.canonicalId,
    runtimeId: spec.id,
    inputTaskId: cases[spec.canonicalId].taskId,
    dependencyIds: [...spec.dependencies],
    status: 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED',
    provider: 'codex_cli',
    providerExecutionMode: 'LIVE_AI_GENERATION',
    completedAt: '2026-11-17T02:40:00.000Z',
    correlationId: 'corr-synthetic-' + spec.canonicalId,
    requiredToolsVerified: true,
    outputDigestSha256: 'sha256:' + 'f'.repeat(64),
    toolTraces: spec.verificationCriteria.mandatoryDeterministicTools.map(toolId =>
      ({ toolId, verified: true, inputSha256: '0'.repeat(64),
        outputSha256: '1'.repeat(64) }))
  };
}
function legacy() {
  return {
    implementationSha: previousSha, catalogSha256: digest,
    dataClassification: catalog.dataClassification,
    commissioningScope: 'LAB_COMMISSIONING_RESEARCH',
    dependencyAware: true, completedCount: 2,
    completed: [legacyResult(specs[0]), legacyResult(specs[1])],
    independentlyEngineeringValidated: false,
    engineeringReleaseApproved: false
  };
}
function sourceBoundOutput(spec: AgentSpec, input: AgentExecutionInput): AgentExecutionOutput {
  return {
    agentId: spec.id, taskId: input.taskId,
    timestamp: '2026-11-17T03:00:00.000Z',
    status: 'SUCCESS', executionMode: 'LIVE_AI_GENERATION',
    providerExecutionMode: 'LIVE_AI_GENERATION',
    provider: 'codex_cli', modelIdentifier: 'synthetic-fixture-not-a-model',
    correlationId: 'fake-test-' + spec.canonicalId,
    data: { disciplineSummary: 'synthetic fixture for ' + spec.canonicalId },
    assumptions: [],
    deterministicToolEvidence: spec.verificationCriteria.mandatoryDeterministicTools.map(toolName => ({
      toolName, inputs: { fixture: true }, outputs: { fixture: true }, verified: true
    })),
    openTbdItems: [], warnings: [], recommendations: [],
    requiresDirectorApproval: false
  };
}

describe('26 Codex agent interrupted-campaign checkpoint recovery', () => {
  it('binds checkpoint to exact source/catalog and denies tampering', () => {
    const cp = emptyCheckpoint(binding);
    expect(verifyCheckpoint(cp, binding).completedCount).toBe(0);
    expect(() => verifyCheckpoint(cp, { ...binding, implementationSha: previousSha })).toThrow();
    expect(() => verifyCheckpoint(cp, { ...binding, catalogSha256: '1'.repeat(64) })).toThrow();
    expect(() => verifyCheckpoint({ ...cp, engineeringReleaseApproved: true }, binding)).toThrow();
    expect(() => verifyCheckpoint({ ...cp, dependencyAware: false }, binding)).toThrow();
  });

  it('imports the original two successes as historical, not same-SHA execution', () => {
    const raw = legacy();
    const bytes = Buffer.from(JSON.stringify(raw));
    expect(() => importLegacyProgress(raw, bytes, binding, false)).toThrow();
    const cp = importLegacyProgress(raw, bytes, binding, true);
    expect(cp.completedCount).toBe(2);
    expect(cp.legacySourceSha).toBe(previousSha);
    expect(cp.legacyJournalSha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(cp.completed.every(r =>
      r.status === 'HISTORICAL_LIVE_PROVIDER_EXECUTED_UNCERTIFIED' &&
      r.originSourceSha === previousSha)).toBe(true);
    expect(cp.pending?.canonicalId).toBe(specs[2].canonicalId);
    expect(cp.pending?.startedAtUtc).toBeNull();
    expect(cp.advisories[specs[0].id]).toEqual(legacyDigestOnlyAdvisory(
      'sha256:' + 'f'.repeat(64)));
    expect(() => verifyCheckpoint({ ...cp,
      completedCount: 26
    }, binding)).toThrow();
    const cleared = acknowledgeUncertainAttempt(cp, binding);
    expect(cleared.pending).toBeNull();
    expect(cleared.uncertainRetryAcknowledgments).toHaveLength(1);
    expect(cleared.uncertainRetryAcknowledgments[0].canonicalId).toBe(specs[2].canonicalId);
  });

  it('refuses fabricated out-of-order / duplicate / unverified success prefixes', () => {
    const raw = legacy();
    const bytes = Buffer.from(JSON.stringify(raw));
    const cp = importLegacyProgress(raw, bytes, binding, true);
    const bad = structuredClone(cp);
    bad.completed[1].canonicalId = bad.completed[0].canonicalId;
    expect(() => verifyCheckpoint(bad, binding)).toThrow();
    const badTool = structuredClone(cp);
    badTool.completed[0].requiredToolsVerified = false;
    expect(() => verifyCheckpoint(badTool, binding)).toThrow();
    const badProvider = structuredClone(cp);
    badProvider.completed[0].provider = 'mock';
    expect(() => verifyCheckpoint(badProvider, binding)).toThrow();
    const badDigest = structuredClone(cp);
    badDigest.advisories[specs[0].id].outputSha256 = 'sha256:' + 'a'.repeat(64);
    expect(() => verifyCheckpoint(badDigest, binding)).toThrow();
    const badPending = structuredClone(cp);
    badPending.pending!.canonicalId = specs[0].canonicalId;
    expect(() => verifyCheckpoint(badPending, binding)).toThrow();
  });

  it('skips two historical rows and runs exactly 24 following role attempts without calling a real model', async () => {
    const l = legacy();
    const cp = acknowledgeUncertainAttempt(
      importLegacyProgress(l, Buffer.from(JSON.stringify(l)), binding, true),
      binding
    );
    const seen: string[] = [];
    const before: string[] = [];
    const report = await runLiveAgentMatrix(cases, async (runtimeId, input) => {
      seen.push(runtimeId);
      const spec = specs.find(x => x.id === runtimeId)!;
      return sourceBoundOutput(spec, input);
    }, {
      dependencyAware: true,
      resume: { findings: cp.completed, advisories: cp.advisories },
      beforeAgent: finding => { before.push(finding.runtimeId); }
    });
    expect(seen).toHaveLength(24);
    expect(before).toEqual(seen);
    expect(seen).not.toContain(specs[0].id);
    expect(seen).not.toContain(specs[1].id);
    expect(report.totalAgents).toBe(26);
    expect(report.liveProviderRuns).toBe(24);
    expect(report.historicalProviderRuns).toBe(2);
    expect(report.providerOperationalMatrixComplete).toBe(false);
    expect(report.engineeringReleaseApproved).toBe(false);
    expect(report.independentlyEngineeringValidated).toBe(false);
  });

  it('allows a same-source checkpoint prefix to reach 26 current-SHA research runs', async () => {
    const l = legacy();
    const same: ResumeBinding = { ...binding, implementationSha: previousSha };
    const cp = acknowledgeUncertainAttempt(
      importLegacyProgress(l, Buffer.from(JSON.stringify(l)), same, false), same
    );
    const r = await runLiveAgentMatrix(cases, async (id, input) => {
      return sourceBoundOutput(specs.find(x => x.id === id)!, input);
    }, {
      dependencyAware: true,
      resume: { findings: cp.completed, advisories: cp.advisories }
    });
    expect(r.liveProviderRuns).toBe(26);
    expect(r.historicalProviderRuns).toBe(0);
    expect(r.providerOperationalMatrixComplete).toBe(true);
  });
});
