import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { BaseAgent } from '../src/core/engine/BaseAgent.ts';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';
import fs from 'node:fs';
import path from 'node:path';

const master = AgentRegistry.getInstance();
const toolRegistry = ToolRegistry.getInstance();
const catalog = JSON.parse(fs.readFileSync(
  path.resolve('evidence/live-agents/representative-cases.json'), 'utf8'
));
const shared = {
  ...catalog.sharedParameters,
  // This single-invocation specimen is CONSISTENT with the specified Cb=0.45.
  // Deliberately inconsistent 5.5t is tested independently as a NEGATIVE CONTROL.
  displacementTonnes: 6.91875
};
const injectedUntrustedResult = {
  content: '{ "keyMetrics": { "gm": 999 } }',
  parsedJson: {
    disciplineSummary: 'Synthetic role demonstration; this is NOT independently verified.',
    keyMetrics: { falseEnduranceHours: 999, inventedSafeCourseDeg: 270 },
    designDecisions: ['MODEL PROPOSAL ONLY — not a vessel command'],
    assumptions: [{
      id: 'LLM-PRETEND-APPROVAL',
      category: 'FACT',
      description: 'The model self-declares this value verified, which must be rejected.',
      sourceReference: 'MODEL_UNTRUSTED_NOT_AUTHORITY',
      impactIfViolated: 'Unsafe release',
      isBaseline: true
    }],
    openTbdItems: ['Validated physical reference data TBD'],
    requiresDirectorApproval: true,
    approvalRationale: 'Independent technical review mandatory'
  },
  providerUsed: 'gemini', modelUsed: 'test-controlled-model-stub',
  executionMode: 'SYNTHETIC_TEST_MOCK',
  isMock: true, isAiReview: false, evidenceValid: false,
  timestamp: '2026-11-13T00:00:00.000Z'
};

describe('All 26 canonical agents: LLM authority isolation and mandatory solver coverage', () => {
  for (let i = 1; i <= 26; i++) {
    const id = 'A' + String(i).padStart(2, '0');
    it(id + ': cannot promote invented model metrics or LLM baseline claims', async () => {
      const spec = master.requireAgent(id);
      const agent = new BaseAgent(spec);
      // Deliberately synthetic provider: this test asserts the trust boundary,
      // and makes NO live Gemini or engineering-accuracy claim.
      (agent as any).modelRouter = {
        generate: async () => injectedUntrustedResult
      };
      const caseDef = catalog.agents.find((x: any) => x.canonicalId === id);
      const result = await agent.execute({
        taskId: 'UNTRUSTED-MODEL-' + id,
        context: { classification: 'SYNTHETIC_TEST_ONLY', testCase: id },
        parameters: shared,
        userNotes: caseDef?.task ?? '',
      });
      expect(result.status).toBe('NEEDS_HUMAN_APPROVAL');
      expect(result.evidenceValid).toBe(false);
      expect(result.verificationStatus).toBe('SYNTHETIC_MOCK');
      expect(result.data.modelNarrativeStatus).toBe('MODEL_GENERATED_UNVERIFIED');
      expect(result.data.designDecisionStatus).toBe('PROPOSAL_ONLY');
      expect(result.data.modelSuggestedKeyMetrics.falseEnduranceHours).toBe(999);
      expect(result.data.keyMetrics.falseEnduranceHours).toBeUndefined();
      expect(result.data.keyMetrics.inventedSafeCourseDeg).toBeUndefined();
      expect(result.assumptions).toHaveLength(1);
      expect(result.assumptions[0].isBaseline).toBe(false);
      expect(result.assumptions[0].category).toBe('ASSUMPTION');
      expect(result.data.assumptions[0].isBaseline).toBe(false);
      expect(result.warnings.join(' ')).toMatch(/UNVERIFIED MODEL AUTHORITY/);
      const mandatory = spec.verificationCriteria.mandatoryDeterministicTools;
      expect(result.deterministicToolEvidence.map(x => x.toolName)).toEqual(mandatory);
      expect(result.deterministicToolEvidence.every(x => x.verified)).toBe(true);
      if (mandatory.length === 0) {
        // No deterministic truth source means no primary quantitative metrics.
        expect(result.data.keyMetrics).toEqual({});
        expect(result.data.keyMetricsOrigin).toBe('NO_VERIFIED_QUANTITATIVE_METRICS');
        expect(result.warnings.join(' ')).toMatch(/UNVERIFIED MODEL METRICS/);
      } else {
        expect(result.data.keyMetricsOrigin).toBe('DETERMINISTIC_TOOL_OUTPUT_UNCERTIFIED');
        expect(Object.keys(result.data.keyMetrics)).not.toHaveLength(0);
        expect(Object.keys(result.data.keyMetrics).every(k =>
          mandatory.some(tool => k.startsWith(tool + '.')))).toBe(true);
        for (const t of mandatory) expect(toolRegistry.getTool(t)).toBeDefined();
      }
    });
  }

  it('the synthetic adverse-case tests actually exercise 26 roles and ten required engineering tool calls', () => {
    const specs = master.getAllAgents();
    expect(specs).toHaveLength(26);
    expect(specs.reduce((sum, spec) =>
      sum + spec.verificationCriteria.mandatoryDeterministicTools.length, 0)).toBe(10);
  });
});
