import { afterEach, describe, expect, it } from 'vitest';
import { assertPaidAiApiAllowed, isPaidAiApiAllowed } from '../src/core/models/AiBillingPolicy.ts';
import { CodexCliProvider, GeminiProvider, OpenAIProvider, resolveConfiguredProvider } from '../src/core/models/ModelProvider.ts';

const originalEnv = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

describe('AI billing policy', () => {
  it('denies paid AI APIs by default', () => {
    expect(isPaidAiApiAllowed({})).toBe(false);
    expect(() => assertPaidAiApiAllowed('gemini', {})).toThrow(/disabled/);
  });

  it('requires explicit true opt-in', () => {
    expect(isPaidAiApiAllowed({ USV_ALLOW_PAID_AI_API: 'false' })).toBe(false);
    expect(isPaidAiApiAllowed({ USV_ALLOW_PAID_AI_API: '1' })).toBe(false);
    expect(isPaidAiApiAllowed({ USV_ALLOW_PAID_AI_API: 'true' })).toBe(true);
  });

  it('does not activate paid providers merely because API keys exist', () => {
    process.env.USV_ALLOW_PAID_AI_API = 'false';
    process.env.AI_REVIEW_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key-that-must-not-be-used';
    process.env.OPENAI_API_KEY = 'test-key-that-must-not-be-used';

    expect(resolveConfiguredProvider()).toBe('deterministic');
    expect(new GeminiProvider(process.env.GEMINI_API_KEY).isAvailable()).toBe(false);
    expect(new OpenAIProvider().isAvailable()).toBe(false);
  });

  it('requires both explicit provider selection and paid-API authorization for OpenAI', () => {
    process.env.USV_ALLOW_PAID_AI_API = 'true';
    process.env.AI_REVIEW_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only';

    expect(resolveConfiguredProvider()).toBe('openai');
    expect(new OpenAIProvider().isAvailable()).toBe(true);
  });
  it('makes signed-in Codex an explicit, zero-paid-API opt-in', () => {
    process.env.AI_REVIEW_PROVIDER = 'codex_cli';
    delete process.env.USV_SUBSCRIPTION_PILOT;
    process.env.USV_ALLOW_PAID_AI_API = 'false';
    expect(resolveConfiguredProvider()).toBe('deterministic');
    expect(new CodexCliProvider().isAvailable()).toBe(false);

    process.env.USV_SUBSCRIPTION_PILOT = 'enabled';
    expect(resolveConfiguredProvider()).toBe('codex_cli');
    expect(new CodexCliProvider().isAvailable()).toBe(true);

    process.env.USV_ALLOW_PAID_AI_API = 'true';
    expect(resolveConfiguredProvider()).toBe('deterministic');
    expect(new CodexCliProvider().isAvailable()).toBe(false);
  });

  it('fails closed if a Codex subscription pilot is not explicitly enabled', async () => {
    delete process.env.USV_SUBSCRIPTION_PILOT;
    process.env.USV_ALLOW_PAID_AI_API = 'false';
    await expect(new CodexCliProvider().generateText({
      systemInstructions: 'Test role',
      userPrompt: 'Test request',
      context: {}
    })).rejects.toThrow(/subscription pilot/);
  });

});
