import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { BaseAgent } from '../src/core/engine/BaseAgent.ts';

describe('Research mission actually reaches live agent prompt without becoming baseline authority', () => {
  it('passes mission context and prior critique to model, quarantines returned numeric proposals', async () => {
    const agent = new BaseAgent(AgentRegistry.getInstance().requireAgent('A05'));
    let request: any = null;
    (agent as any).modelRouter = {
      generate: async (submitted: any) => {
        request = submitted;
        return {
          content: 'synthetic response',
          parsedJson: {
            disciplineSummary: 'No independently verified hull',
            keyMetrics: { lwlMeters: 10.3 },
            designDecisions: ['Propose, not certify'],
            assumptions: [],
            openTbdItems: ['Hull form source missing'],
            requiresDirectorApproval: true
          },
          providerUsed: 'deterministic', modelUsed: 'test-stub',
          executionMode: 'STATIC_RULES_EVALUATION',
          isMock: false, isAiReview: false, evidenceValid: false, timestamp: '2026-11-13T00:00:00Z'
        };
      }
    };
    const result = await agent.execute({
      taskId: 'TEST-CONTEXT-A01',
      parameters: { conceptStage: 'HYPOTHESIS_SCREENING_ONLY' },
      context: {
        mission: 'SOURCE_IDENTIFIED_HARBOR_MISSION',
        previousCritique: 'INDEPENDENT_CRITIQUE_MISSING_OFFSETS'
      },
      priorAgentOutputs: { review: { requestedRevision: 'REVISION_REQUIRED' } },
      userNotes: 'USER_DEFINED_NO_APPROVED_DIMENSIONS'
    });
    expect(request.userPrompt).toContain('SOURCE_IDENTIFIED_HARBOR_MISSION');
    expect(request.userPrompt).toContain('INDEPENDENT_CRITIQUE_MISSING_OFFSETS');
    expect(request.userPrompt).toContain('USER_DEFINED_NO_APPROVED_DIMENSIONS');
    expect(request.userPrompt).toContain('UNTRUSTED, NOT BASELINE AUTHORITY');
    expect(request.context.priorOutputs.review.requestedRevision).toBe('REVISION_REQUIRED');
    expect(result.data.modelSuggestedKeyMetrics.lwlMeters).toBe(10.3);
    expect(result.data.keyMetrics).toEqual({});
    expect(result.evidenceValid).toBe(false);
    expect(result.requiresDirectorApproval).toBe(true);
  });
});
