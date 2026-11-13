import { describe, expect, it } from 'vitest';
import { GenerativeDesignOptimizer } from '../src/core/optimizer/GenerativeDesignOptimizer.ts';
import { runAgentDesignLoop } from '../src/core/optimizer/AgentDesignLoop.ts';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import type { AgentExecutionInput, AgentExecutionOutput } from '../src/core/types/agent.ts';

const sha = 'a'.repeat(40);
const mission = {
  runId: 'TEST-DESIGN-LOOP', sourceCommit: sha, seed: 1337,
  maxRevisions: 2,
  missionStatement: 'Explore two unapproved alternatives without claiming vessel release',
  requirements: [{ id: 'REQ-TEST-1', statement: 'Explore preliminary design variants', source: 'Synthetic regression case only' }],
  sourceReferences: [{ reference: 'https://example.org/synthetic-only', description: 'NOT an authenticated design source' }]
};
const makeOutput = (agentId: string, input: AgentExecutionInput, metrics: Record<string, unknown>, provider = 'gemini'): AgentExecutionOutput => ({
  agentId, taskId: input.taskId, timestamp: '2026-11-13T00:00:00Z',
  status: 'NEEDS_HUMAN_APPROVAL',
  providerExecutionMode: provider === 'mock' ? 'SYNTHETIC_TEST_MOCK' : 'LIVE_AI_GENERATION',
  provider, evidenceValid: false, verificationStatus: 'UNVERIFIED',
  data: { modelSuggestedKeyMetrics: metrics, designDecisions: ['Check unsupported hull assumptions'] },
  assumptions: [], deterministicToolEvidence: [], openTbdItems: ['Approved hull offsets missing'],
  warnings: [], recommendations: ['Revisit assumptions'], requiresDirectorApproval: true
});
const registry = AgentRegistry.getInstance();
const proposer = registry.requireAgent('A01').id;
const critic = registry.requireAgent('A15').id;

describe('Reproducible legacy scenarios and real-agent iterative design screening', () => {
  it('replays identical scenario generations for the same seed and different values for a new seed', () => {
    const o = GenerativeDesignOptimizer.getInstance();
    o.resetOptimizer(123456);
    const a = Array.from({ length: 3 }, () => o.runIteration());
    const digest = a.map(v => [v.lwlMeters, v.beamMeters, v.hullType, v.runSeed, v.drawIndex, v.fitnessScore]);
    expect(a.every(v => v.runSeed === 123456 && v.scenarioRevision.includes('UNVERIFIED'))).toBe(true);
    expect(o.getRunMetadata().runSeed).toBe(123456);
    o.resetOptimizer(123456);
    const b = Array.from({ length: 3 }, () => o.runIteration());
    expect(b.map(v => [v.lwlMeters, v.beamMeters, v.hullType, v.runSeed, v.drawIndex, v.fitnessScore])).toEqual(digest);
    o.resetOptimizer(654321);
    const c = Array.from({ length: 3 }, () => o.runIteration());
    expect(c.map(v => [v.lwlMeters, v.beamMeters, v.hullType])).not.toEqual(a.map(v => [v.lwlMeters, v.beamMeters, v.hullType]));
    expect(() => o.resetOptimizer(-1)).toThrow(/unsigned 32-bit/);
    expect(() => o.resetOptimizer(2 ** 32)).toThrow(/unsigned 32-bit/);
  });

  it('invokes actual registered proposer and critic IDs and screens two distinct revisions with real deterministic tools', async () => {
    const seen: Array<{ agent: string; prior: AgentExecutionInput['priorAgentOutputs']; ctx: AgentExecutionInput['context'] }> = [];
    const execute = async (id: string, input: AgentExecutionInput) => {
      seen.push({ agent: id, prior: input.priorAgentOutputs, ctx: input.context });
      if (id === proposer) {
        const length = input.taskId.endsWith('-0') ? 10 : 10.5;
        return makeOutput(id, input, {
          lwlMeters: length, beamMeters: 3, draftMeters: 0.7, blockCoefficientCb: 0.55,
          displacementTonnes: length * 3 * 0.7 * 0.55 * 1.025,
          speedKnots: 10, propulsiveEfficiencyEtaD: 0.6, waterTempCelsius: 15
        });
      }
      expect(id).toBe(critic);
      expect(input.context.hypothesisUnverified).toBeDefined();
      return makeOutput(id, input, {});
    };
    const result = await runAgentDesignLoop(mission, execute);
    expect(result.completedAgentCalls).toBe(4);
    expect(result.completedToolScreens).toBe(4);
    expect(result.revisions).toHaveLength(2);
    expect(result.revisions.flatMap(r => r.screened.screenResults).every(r => r.success)).toBe(true);
    expect(result.revisions[1].screened.parameters.lwlMeters).toBe(10.5);
    expect(seen.map(x => x.agent)).toEqual([proposer, critic, proposer, critic]);
    expect(seen[2].prior?.criticA15).toBeTruthy();
    expect(result.stopReason).toBe('MAX_REVISIONS_REACHED');
    expect(result.detailedDesignAuthorized).toBe(false);
    expect(result.engineeringReleaseAuthorized).toBe(false);
    expect(result.independentEngineeringValidated).toBe(false);
  });

  it('fails closed on mock provider and never substitutes a synthetic "agent vote"', async () => {
    let attempts = 0;
    const result = await runAgentDesignLoop(mission, async (id, input) => {
      attempts++;
      return makeOutput(id, input, { lwlMeters: 10 }, 'mock');
    });
    expect(result.stopReason).toBe('NON_LIVE_PROVIDER');
    expect(result.completedAgentCalls).toBe(1);
    expect(result.completedToolScreens).toBe(0);
    expect(result.revisions).toHaveLength(0);
    expect(attempts).toBe(1);
    expect(result.engineeringReleaseAuthorized).toBe(false);
  });

  it('stops when the revision repeats unchanged input, despite a chat critique claiming approval', async () => {
    const result = await runAgentDesignLoop({ ...mission, maxRevisions: 3 }, async (id, input) => {
      if (id === proposer) return makeOutput(id, input, { lwlMeters: 10 });
      return {
        ...makeOutput(id, input, {}),
        data: { designDecisions: ['APPROVED (untrusted model assertion)'] }
      };
    });
    expect(result.stopReason).toBe('NO_CHANGE');
    expect(result.revisions).toHaveLength(1);
    expect(result.detailedDesignAuthorized).toBe(false);
  });

  it('cannot run without source identity, mission or bounded revision budget', async () => {
    await expect(runAgentDesignLoop({ ...mission, sourceCommit: '' })).rejects.toThrow(/source commit/);
    await expect(runAgentDesignLoop({ ...mission, requirements: [] })).rejects.toThrow(/mission requirements/);
    await expect(runAgentDesignLoop({ ...mission, maxRevisions: 999 })).rejects.toThrow(/1\.\.5/);
  });
});
