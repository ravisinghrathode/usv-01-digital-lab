import { describe, expect, it } from 'vitest';
import { commissionLiveModel } from '../src/core/verification/LiveProviderCommissioning.ts';
import type { IModelProvider, ModelPromptRequest, ModelConfig } from '../src/core/models/ModelProvider.ts';

const sha = 'a'.repeat(40);
const liveProvider = (overrides: Partial<{ providerUsed: string; executionMode: string; parsedJson: any; isMock: boolean; evidenceValid: boolean; modelUsed: string }> = {}): IModelProvider => ({
  name: 'gemini',
  isAvailable: () => true,
  generateText: async (_req: ModelPromptRequest, _cfg?: ModelConfig): Promise<any> => ({
    providerUsed: 'gemini',
    executionMode: 'LIVE_AI_GENERATION',
    modelUsed: 'gemini-3.8-flash',
    content: '{"readinessToken":"LIVE_USV01_PROBE"}',
    parsedJson: { readinessToken: 'LIVE_USV01_PROBE' },
    isMock: false, evidenceValid: false, isAiReview: true,
    timestamp: '2026-11-13T00:00:00Z',
    ...overrides
  })
});
describe('Live provider credential verification (no network in unit tests)', () => {
  it('records response digest from an injected successful live provider', async () => {
    const result = await commissionLiveModel(sha,'gemini-3.8-flash', liveProvider());
    expect(result.actualLiveProviderCall).toBe(true);
    expect(result.transport).toBe('SDK_API_KEY');
    expect(result.responseDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(result.independentEngineeringEvidence).toBe(false);
    expect(result.authorizedDesignRelease).toBe(false);
  });
  it('accepts an injected operator-authenticated Gemini CLI transport without treating it as engineering evidence',async()=>{
    const cli={...liveProvider(),name:'gemini_cli'};
    const result=await commissionLiveModel(sha,'auto',cli);
    expect(result.actualLiveProviderCall).toBe(true);
    expect(result.transport).toBe('GEMINI_CLI_OPERATOR_AUTH');
    expect(result.provider).toBe('gemini');
    expect(result.independentEngineeringEvidence).toBe(false);
    expect(result.authorizedDesignRelease).toBe(false);
  });
  it('rejects deterministic fallback, mock, model claiming evidence and wrong token', async () => {
    for (const override of [
      { providerUsed: 'deterministic' },
      { executionMode: 'STATIC_RULES_EVALUATION' },
      { isMock: true },
      { evidenceValid: true },
      { parsedJson: { readinessToken: 'not authenticated' } }
    ]) {
      await expect(commissionLiveModel(sha,'gemini-3.8-flash',liveProvider(override))).rejects.toThrow(/authenticity|structured/);
    }
  });
  it('rejects invalid source SHA and unavailable providers', async () => {
    await expect(commissionLiveModel('short','gemini-3.8-flash',liveProvider())).rejects.toThrow(/source commit/);
    await expect(commissionLiveModel(sha,'',liveProvider())).rejects.toThrow(/model ID/);
    await expect(commissionLiveModel(sha,'gemini-3.8-flash',{...liveProvider(),isAvailable:()=>false})).rejects.toThrow(/unavailable/);
  });
});
