import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { runLiveAgentMatrix } from '../src/core/verification/LiveAgentMatrix.ts';
import { probeObsidianVault } from '../src/core/verification/VaultProbe.ts';
import { evaluateSafetyScenarios, type SafetyScenario } from '../src/core/verification/SafetyScenarioSuite.ts';
import { evaluateMarineEnvelope, type MarineEnvelopeCase } from '../src/core/verification/MarineSystemsSuite.ts';
import type { AgentExecutionInput, AgentExecutionOutput } from '../src/core/types/agent.ts';

const sha = 'a'.repeat(40);
const suiteCases = Object.fromEntries(
  AgentRegistry.getInstance().getAllAgents().map(agent => [
    agent.canonicalId,
    { taskId: 'LIVE-CASE-' + agent.canonicalId, context: {}, parameters: {} } satisfies AgentExecutionInput
  ])
);

const output = (agentId: string, provider: string, executionMode: AgentExecutionOutput['executionMode'], taskId: string): AgentExecutionOutput => ({
  agentId, taskId, timestamp: new Date().toISOString(), status: 'NEEDS_HUMAN_APPROVAL',
  provider, executionMode, providerExecutionMode: executionMode, correlationId: 'corr-' + agentId, evidenceValid: false,
  verificationStatus: 'UNVERIFIED', data: { unverified: true }, assumptions: [],
  deterministicToolEvidence: AgentRegistry.getInstance().requireAgent(agentId)
    .verificationCriteria.mandatoryDeterministicTools.map(toolName => ({
      toolName, inputs: {}, outputs: {}, verified: true
    })),
  openTbdItems: [], warnings: [],
  recommendations: [], requiresDirectorApproval: true
});

describe('Live agent operational matrix', () => {
  it('tracks all 26 runtime invocations without falsely certifying outputs', async () => {
    const result = await runLiveAgentMatrix(suiteCases, async (id, input) => output(id, 'codex_cli', 'LIVE_AI_GENERATION', input.taskId));
    expect(result.totalAgents).toBe(26);
    expect(result.liveProviderRuns).toBe(26);
    expect(result.providerOperationalMatrixComplete).toBe(true);
    expect(result.independentlyEngineeringValidated).toBe(false);
    expect(result.engineeringReleaseApproved).toBe(false);
    expect(result.findings.every(f => f.outputDigestSha256?.startsWith('sha256:'))).toBe(true);
  });
  it('recognizes a simulated Codex trace when deterministic tools also executed', async () => {
    const result = await runLiveAgentMatrix(suiteCases, async (id, input) => ({
      ...output(id, 'codex_cli', 'LIVE_AI_GENERATION', input.taskId),
      executionMode: 'DETERMINISTIC_CALCULATION'
    }));
    expect(result.liveProviderRuns).toBe(26);
    expect(result.engineeringReleaseApproved).toBe(false);
  });
  it('rejects live output that lacks mandatory tool evidence', async () => {
    const result = await runLiveAgentMatrix(suiteCases, async (id, input) => ({
      ...output(id, 'codex_cli', 'LIVE_AI_GENERATION', input.taskId),
      deterministicToolEvidence: []
    }));
    expect(result.findings.find(f => f.canonicalId === 'A05')?.requiredToolsVerified).toBe(false);
    expect(result.providerOperationalMatrixComplete).toBe(false);
  });
  it('rejects legacy Gemini as proof of a ChatGPT-only campaign', async () => {
    const result = await runLiveAgentMatrix(suiteCases,
      async (id, input) => output(id, 'gemini', 'LIVE_AI_GENERATION', input.taskId));
    expect(result.liveProviderRuns).toBe(0);
    expect(result.providerOperationalMatrixComplete).toBe(false);
  });
  it('rejects mock/static providers as live evidence', async () => {
    const result = await runLiveAgentMatrix(suiteCases, async (id, input) => output(id, 'deterministic', 'STATIC_RULES_EVALUATION', input.taskId));
    expect(result.liveProviderRuns).toBe(0);
    expect(result.providerOperationalMatrixComplete).toBe(false);
    expect(result.findings.every(f => f.status === 'NOT_LIVE_PROVIDER')).toBe(true);
  });
  it('marks missing cases without invoking the agent engine', async () => {
    const result = await runLiveAgentMatrix({}, async () => { throw new Error('must not run'); });
    expect(result.liveProviderRuns).toBe(0);
    expect(result.findings.every(f => f.status === 'MISSING_CASE')).toBe(true);
  });
});

describe('Obsidian vault non-destructive roundtrip', () => {
  it('creates linked Markdown notes, detects a stale revision and cleans up', () => {
    const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'test-usv01-vault-'));
    try {
      const r = probeObsidianVault({ vaultPath: vault, baselineSha: sha });
      expect(r.status).toBe('LIVE_PROBE_PASSED_UNATTESTED');
      expect(r.independentlyVerified).toBe(false);
      expect(fs.readdirSync(vault)).toEqual([]);
    } finally {
      fs.rmSync(vault, { recursive: true, force: true });
    }
  });
  it('does not use an unconfigured or invalid vault path', () => {
    expect(probeObsidianVault({ baselineSha: sha }).status).toBe('NOT_CONFIGURED');
    expect(probeObsidianVault({ vaultPath: '/nonexistent/usv/vault', baselineSha: sha }).status).toBe('LIVE_PROBE_FAILED');
  });
});

describe('Simulated autonomy safety and marine systems envelopes', () => {
  const scenarios: SafetyScenario[] = (
    ['COLREG_ENCOUNTER', 'LINK_LOSS', 'SENSOR_DEGRADATION', 'PROPULSION_FAULT'] as const
  ).map((kind, i) => ({
    id: 'SIM-' + (i + 1), kind, simulated: true, faultInjected: true,
    scenarioReference: 'reference-trace-' + i, independentObserver: true,
    abortAvailable: true, preapprovedContingencyExercised: true,
    containmentMaintained: true, ...(kind === 'COLREG_ENCOUNTER' ?
      { minimumObservedCpaNm: 0.9, requiredMinimumCpaNm: 0.5 } : {})
  }));
  it('requires complete scenario coverage and fails unsafe loss-of-link behaviour', () => {
    const positive = evaluateSafetyScenarios(scenarios);
    expect(positive.simulatedSuitePass).toBe(true);
    expect(positive.independentlyEngineeringValidated).toBe(false);
    const negative = evaluateSafetyScenarios(scenarios.map(c =>
      c.kind === 'LINK_LOSS' ? { ...c, containmentMaintained: false } : c
    ));
    expect(negative.simulatedSuitePass).toBe(false);
    expect(evaluateSafetyScenarios(scenarios.slice(0, 2)).simulatedSuitePass).toBe(false);
  });

  const envelope: MarineEnvelopeCase[] = (
    ['LAUNCH_RECOVERY_LOAD', 'SEALED_HULL_THERMAL', 'WET_END_ACOUSTIC', 'FOULING_CORROSION', 'BILGE_CONDENSATION'] as const
  ).map((kind, i) => ({
    id: 'MAR-' + i, kind, observed: 5, maximumAllowed: 10, unit: 'declared-test-unit',
    sourceReference: 'illustrative-source', designLimitReference: 'illustrative-limit'
  }));
  it('checks all five marine envelopes but does not certify them', () => {
    const positive = evaluateMarineEnvelope(envelope);
    expect(positive.numericEnvelopePass).toBe(true);
    expect(positive.marineSystemsAccepted).toBe(false);
    expect(evaluateMarineEnvelope(envelope.slice(0, 3)).numericEnvelopePass).toBe(false);
    expect(evaluateMarineEnvelope(envelope.map((c, i) => i === 0 ?
      { ...c, observed: 100 } : c)).numericEnvelopePass).toBe(false);
  });
});
