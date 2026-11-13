import { describe, expect, it } from 'vitest';
import { BaseAgent } from '../src/core/engine/BaseAgent.ts';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import type { AgentExecutionInput } from '../src/core/types/agent.ts';

const registry = AgentRegistry.getInstance();
const mockModel = {
  content: 'valid synthetic completion',
  parsedJson: {
    disciplineSummary: 'Synthetic preliminary test, not certified.',
    keyMetrics: { preliminaryEndurance_h: 999, averagePowerW: 1 },
    designDecisions: [], assumptions: [], openTbdItems: [],
    requiresDirectorApproval: true, approvalRationale: 'Independently evaluate physics.'
  },
  providerUsed: 'gemini', modelUsed: 'test-stub-not-live',
  executionMode: 'SYNTHETIC_TEST_MOCK' as const,
  isAiReview: false, isMock: true, evidenceValid: false,
  timestamp: new Date().toISOString()
};
const electricalInput: AgentExecutionInput = {
  taskId: 'ACCURACY-GROUNDING-A14',
  context: { test: 'synthetic non-operational' },
  parameters: {
    busVoltageV: 48, batteryTotalKwh: 120, usableDepthOfDischarge: 0.8,
    consumers: [
      { name: 'Prop', voltageV: 48, continuousPowerW: 6000, intermittentPowerW: 0, dutyCycle: 1, isEmergencyLoad: false },
      { name: 'Radar', voltageV: 48, continuousPowerW: 450, intermittentPowerW: 100, dutyCycle: 0.5, isEmergencyLoad: true },
      { name: 'Compute', voltageV: 48, continuousPowerW: 150, intermittentPowerW: 0, dutyCycle: 1, isEmergencyLoad: true },
      { name: 'Comms', voltageV: 48, continuousPowerW: 80, intermittentPowerW: 40, dutyCycle: 0.3, isEmergencyLoad: true }
    ]
  }
};

describe('AGT-02 model-output numerical grounding', () => {
  it('uses executed electrical tool outputs as primary metrics, not fabricated LLM values', async () => {
    const agent = new BaseAgent(registry.requireAgent('A14'));
    (agent as any).modelRouter = { generate: async () => mockModel };
    const r = await agent.execute(electricalInput);
    expect(r.status).toBe('NEEDS_HUMAN_APPROVAL');
    expect(r.deterministicToolEvidence).toHaveLength(1);
    expect(r.deterministicToolEvidence[0].verified).toBe(true);
    expect(r.data.keyMetricsOrigin).toBe('NO_RELEASE_AUTHORIZED_METRICS');
    expect(r.data.keyMetrics).toEqual({});
    expect(r.data.preliminaryToolMetrics['TOOL-ELECTRICAL-01.averagePowerW']).toBe(6742);
    expect(r.data.preliminaryToolMetrics['TOOL-ELECTRICAL-01.idealizedEnergyUpperBoundHours']).toBeCloseTo(14.24, 2);
    expect(r.data.engineeringReleaseBlocked).toBe(true);
    expect(r.data.modelSuggestedKeyMetrics.preliminaryEndurance_h).toBe(999);
    expect(r.data.keyMetrics.preliminaryEndurance_h).toBeUndefined();
    expect(r.evidenceValid).toBe(false);
    expect(r.verificationStatus).toBe('SYNTHETIC_MOCK');
  });

  it('rejects inconsistent hydrostatic quantities before invoking an AI provider', async () => {
    let calls = 0;
    const agent = new BaseAgent(registry.requireAgent('A06'));
    (agent as any).modelRouter = { generate: async () => { calls++; return mockModel; } };
    const r = await agent.execute({
      taskId: 'HYDRO-FAIL-CLOSED',
      context: { test: true },
      parameters: {
        lwlMeters: 10, beamMeters: 2.5, draftMeters: 0.6,
        blockCoefficientCb: 0.45, displacementTonnes: 5.5,
        seawaterDensityKgM3: 1025, kgMeters: 0.8
      }
    });
    expect(r.status).toBe('FAILED');
    expect(r.evidenceValid).toBe(false);
    expect(calls).toBe(0);
    expect(r.data.error).toMatch(/Mandatory deterministic calculation/);
  });
});
