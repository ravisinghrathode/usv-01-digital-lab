import { afterEach, describe, expect, it } from 'vitest';
import {
  isCodexAssistantEnabled,
  isLoopbackPeer,
  generateCodexAssistantText
} from '../src/server/codexAssistantService.ts';

const saved = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
  Object.assign(process.env, saved);
});

describe('Operator-local Codex assistant security boundaries', () => {
  it('accepts only actual loopback peer addresses', () => {
    expect(isLoopbackPeer('127.0.0.1')).toBe(true);
    expect(isLoopbackPeer('::1')).toBe(true);
    expect(isLoopbackPeer('::ffff:127.0.0.1')).toBe(true);
    for (const peer of ['192.168.1.1', '10.1.1.1', '::ffff:10.1.1.1', undefined]) {
      expect(isLoopbackPeer(peer)).toBe(false);
    }
  });

  it('requires exact subscription opt-in and rejects paid API mode', () => {
    delete process.env.USV_SUBSCRIPTION_PILOT;
    process.env.AI_REVIEW_PROVIDER = 'codex_cli';
    process.env.USV_ALLOW_PAID_AI_API = 'false';
    expect(isCodexAssistantEnabled()).toBe(false);
    process.env.USV_SUBSCRIPTION_PILOT = 'enabled';
    expect(isCodexAssistantEnabled()).toBe(true);
    process.env.USV_ALLOW_PAID_AI_API = 'true';
    expect(isCodexAssistantEnabled()).toBe(false);
    process.env.USV_ALLOW_PAID_AI_API = 'false';
    process.env.AI_REVIEW_PROVIDER = 'gemini_cli';
    expect(isCodexAssistantEnabled()).toBe(false);
  });

  it('never spawns a model when subscription mode is disabled', async () => {
    process.env.USV_SUBSCRIPTION_PILOT = 'disabled';
    process.env.AI_REVIEW_PROVIDER = 'codex_cli';
    await expect(generateCodexAssistantText({
      prompt: 'Review requirements', instruction: 'No release authority'
    })).rejects.toThrow('CODEX_SUBSCRIPTION_UNAVAILABLE');
  });

  it('rejects empty and oversized inputs before attempting CLI execution', async () => {
    process.env.USV_SUBSCRIPTION_PILOT = 'enabled';
    process.env.AI_REVIEW_PROVIDER = 'codex_cli';
    process.env.USV_ALLOW_PAID_AI_API = 'false';
    await expect(generateCodexAssistantText({
      prompt: '', instruction: 'test'
    })).rejects.toThrow('INVALID_ADVISORY_PROMPT');
    await expect(generateCodexAssistantText({
      prompt: 'x'.repeat(10001), instruction: 'test'
    })).rejects.toThrow('INVALID_ADVISORY_PROMPT');
    await expect(generateCodexAssistantText({
      prompt: 'bounded', instruction: 'a'.repeat(24001)
    })).rejects.toThrow('ADVISORY_CONTEXT_TOO_LARGE');
  });
});
