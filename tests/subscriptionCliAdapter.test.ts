import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertUsvRepositoryWorkingDirectory, sanitizedSubscriptionEnvironment, validatePilotRequest, SubscriptionCliUnavailable } from '../src/core/mission-control/SubscriptionCliAdapter.ts';

const input = {
  role: 'reviewer' as const,
  taskId: 'PILOT-001',
  agentId: 'INDEP-REV-23',
  prompt: 'Review this non-operational test artifact',
  workingDirectory: '/tmp'
};

describe('Subscription CLI pilot guards', () => {
  it('remains disabled by default', () => {
    const original = process.env.USV_SUBSCRIPTION_PILOT;
    delete process.env.USV_SUBSCRIPTION_PILOT;
    try { expect(() => validatePilotRequest(input)).toThrow(SubscriptionCliUnavailable); }
    finally {
      if (original === undefined) delete process.env.USV_SUBSCRIPTION_PILOT;
      else process.env.USV_SUBSCRIPTION_PILOT = original;
    }
  });
  it('removes billing credentials from child environment', () => {
    const env = sanitizedSubscriptionEnvironment({
      PATH: '/usr/bin', HOME: '/home/test',
      ANTHROPIC_API_KEY: 'sensitive', OPENAI_API_KEY: 'sensitive',
      GEMINI_API_KEY: 'sensitive', GOOGLE_GENAI_USE_VERTEXAI: 'true',
      AWS_SECRET_ACCESS_KEY: 'sensitive', CUSTOM_API_TOKEN: 'sensitive'
    });
    expect(env.PATH).toBe('/usr/bin');
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.GOOGLE_GENAI_USE_VERTEXAI).toBeUndefined();
    expect(env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(env.CUSTOM_API_TOKEN).toBeUndefined();
    expect(env.USV_NO_PAID_API).toBe('1');
  });
  it('allows the bounded research pilot, but rejects an attempted design release', () => {
    const saved = {
      pilot: process.env.USV_SUBSCRIPTION_PILOT,
      provider: process.env.AI_REVIEW_PROVIDER,
      paidApi: process.env.USV_ALLOW_PAID_AI_API,
      scope: process.env.USV_LAB_SCOPE,
      release: process.env.USV_ENGINEERING_RELEASE_AUTHORIZED
    };
    try {
      process.env.USV_SUBSCRIPTION_PILOT = 'enabled';
      process.env.AI_REVIEW_PROVIDER = 'codex_cli';
      process.env.USV_ALLOW_PAID_AI_API = 'false';
      delete process.env.USV_LAB_SCOPE;
      delete process.env.USV_ENGINEERING_RELEASE_AUTHORIZED;
      expect(() => validatePilotRequest(input)).not.toThrow();
      process.env.USV_ENGINEERING_RELEASE_AUTHORIZED = 'true';
      expect(() => validatePilotRequest(input)).toThrow(/restricted lab commissioning refused/);
    } finally {
      for (const [key, value] of [
        ['USV_SUBSCRIPTION_PILOT', saved.pilot],
        ['AI_REVIEW_PROVIDER', saved.provider],
        ['USV_ALLOW_PAID_AI_API', saved.paidApi],
        ['USV_LAB_SCOPE', saved.scope],
        ['USV_ENGINEERING_RELEASE_AUTHORIZED', saved.release]
      ] as Array<[string, string | undefined]>) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('rejects arbitrary non-USV working directories', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'not-usv-repo-'));
    try {
      await expect(assertUsvRepositoryWorkingDirectory(dir)).rejects.toThrow(/USV-01 Digital Lab/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects non-canonical task and agent IDs', () => {
    const original = process.env.USV_SUBSCRIPTION_PILOT;
    process.env.USV_SUBSCRIPTION_PILOT = 'enabled';
    try {
      expect(() => validatePilotRequest({...input, taskId:'../escape'})).toThrow();
      expect(() => validatePilotRequest({...input, agentId:'bad/agent'})).toThrow();
      expect(() => validatePilotRequest({...input, prompt:'  '})).toThrow();
    } finally {
      if (original === undefined) delete process.env.USV_SUBSCRIPTION_PILOT;
      else process.env.USV_SUBSCRIPTION_PILOT = original;
    }
  });
});
