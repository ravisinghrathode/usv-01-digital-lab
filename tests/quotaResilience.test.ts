import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { QuotaResilience, isQuotaFailure, QuotaHoldError } from '../src/core/mission-control/QuotaResilience.ts';
import { ResilientAgentQueue, type QueueRequest } from '../src/core/mission-control/ResilientAgentQueue.ts';
import type { AgentExecutionInput, AgentExecutionOutput } from '../src/core/types/agent.ts';

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true })));
});
async function sandbox() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'usv-quota-'));
  dirs.push(dir);
  return dir;
}
const config = { USV_MODEL_REQUESTS_PER_WINDOW: '2', USV_MODEL_WINDOW_MINUTES: '60',
  USV_QUOTA_COOLDOWN_MINUTES: '10' } as NodeJS.ProcessEnv;

function request(id: string, lane: QueueRequest['lane'] = 'MODEL_AGENT',
  priority = 5): QueueRequest {
  return {
    taskId: id, agentId: 'A26', lane, priority,
    commitSha: 'a'.repeat(40),
    input: {
      taskId: id, parameters: {},
      context: { objective: 'Public research only',
        dataClassification: 'PUBLIC_SOURCE_SAFE_ONLY', researchOnly: true }
    }
  };
}
function modelOutput(input: AgentExecutionInput, status: AgentExecutionOutput['status'] =
  'NEEDS_HUMAN_APPROVAL'): AgentExecutionOutput {
  return {
    agentId: 'INTEL-USV-26', taskId: input.taskId,
    timestamp: '2026-11-15T00:00:00.000Z', status,
    provider: 'codex_cli', modelIdentifier: 'gpt-6-sol-requested-model-unverified',
    executionMode: 'LIVE_AI_GENERATION', providerExecutionMode: 'LIVE_AI_GENERATION',
    data: { disciplineSummary: 'Public-source research proposal only' },
    assumptions: [], deterministicToolEvidence: [], openTbdItems: [],
    warnings: [], recommendations: [], requiresDirectorApproval: status === 'NEEDS_HUMAN_APPROVAL'
  };
}
describe('Host subscription budget (zero API calls)', () => {
  it('serializes concurrent attempts and makes excess callers wait', async () => {
    const dir = await sandbox();
    let now = 1_000_000;
    const budget = new QuotaResilience(path.join(dir, 'quota.json'), () => now, config);
    const calls = await Promise.allSettled([budget.reserve(), budget.reserve(), budget.reserve()]);
    expect(calls.filter(x => x.status === 'fulfilled')).toHaveLength(2);
    expect(calls.filter(x => x.status === 'rejected')).toHaveLength(1);
    await expect(budget.reserve()).rejects.toThrow(QuotaHoldError);
    expect((await budget.status()).remainingLocalAttempts).toBe(0);
    expect((await budget.status()).providerAllowanceKnown).toBe(false);
    now += 61 * 60_000;
    expect((await budget.reserve()).remainingLocalAttempts).toBe(1);
  });

  it('backs off on actual quota errors and recovers only after cooldown', async () => {
    const dir = await sandbox();
    let now = 2_000_000;
    const budget = new QuotaResilience(path.join(dir, 'quota.json'), () => now, config);
    await budget.reserve();
    const hold = await budget.recordQuotaFailure();
    expect(hold.state).toBe('WAITING_FOR_QUOTA');
    expect(hold.retryAfter).toBe(new Date(now + 10 * 60_000).toISOString());
    await expect(budget.reserve()).rejects.toThrow('USV_QUOTA_WAIT');
    now += 10 * 60_000 + 1;
    expect((await budget.reserve()).state).toBe('WAITING_FOR_QUOTA'); // local count reaches 2
    await budget.recordSuccess();
    expect((await budget.status()).state).toBe('WAITING_FOR_QUOTA'); // budget still spent
    now += 61 * 60_000;
    expect((await budget.status()).state).toBe('AVAILABLE');
  });

  it('classifies quota but not authentication, tool or context errors', () => {
    expect(isQuotaFailure('You have reached your usage limit.')).toBe(true);
    expect(isQuotaFailure('HTTP 429 Too Many Requests')).toBe(true);
    expect(isQuotaFailure('USV_QUOTA_WAIT: next attempt')).toBe(true);
    expect(isQuotaFailure('Login required')).toBe(false);
    expect(isQuotaFailure('Invalid engineering dimensions')).toBe(false);
    expect(isQuotaFailure('context window exceeded')).toBe(false);
  });

  it('fails closed on a corrupted ledger', async () => {
    const dir = await sandbox();
    const file = path.join(dir, 'quota.json');
    await writeFile(file, 'not valid json');
    await expect(new QuotaResilience(file).reserve()).rejects.toThrow(/unreadable/);
    expect(await readFile(file, 'utf8')).toBe('not valid json');
  });
});
describe('Resilient A01-A26 task queue', () => {
  it('preserves exact inputs and idempotency and requires human review for live proposals', async () => {
    const dir = await sandbox();
    let calls = 0;
    const budget = new QuotaResilience(path.join(dir, 'quota.json'));
    const file = path.join(dir, 'queue.json');
    const runner = async (_: string, input: AgentExecutionInput) => {
      calls++; return modelOutput(input);
    };
    const queue = new ResilientAgentQueue(file, budget, Date.now, runner,
      async (_cwd, _sha) => ({ clean: true }));
    await queue.enqueue(request('Q-A26-001'));
    expect((await queue.enqueue(request('Q-A26-001'))).attempts).toBe(0);
    await expect(queue.enqueue(request('Q-A26-001', 'OFFLINE_SCHEMA_CHECK')))
      .rejects.toThrow(/TASK_ID_CONFLICT/);
    expect(await queue.runOne(dir)).toEqual({
      taskId: 'Q-A26-001', state: 'BLOCKED_REVIEW'
    });
    expect((await queue.runOne(dir)).taskId).toBeNull();
    expect(calls).toBe(1);
    const persisted = JSON.parse(await readFile(file, 'utf8'));
    const row = persisted.tasks['Q-A26-001'];
    expect(row.receipt.provider).toBe('codex_cli');
    expect(row.receipt.modelRequested).toContain('unverified');
    expect(row.receipt.engineeringReleaseApproved).toBe(false);
    expect(row.receipt.humanApprovalSatisfied).toBe(false);
  });

  it('queues quota-blocked work and automatically resumes after eligible time', async () => {
    const dir = await sandbox();
    let now = Date.parse('2026-11-15T00:00:00Z');
    let attempts = 0;
    const budget = new QuotaResilience(path.join(dir, 'quota.json'), () => now);
    const runner = async (_id: string, input: AgentExecutionInput) => {
      attempts++;
      if (attempts === 1) return { ...modelOutput(input, 'FAILED'),
        data: { error: 'USV_QUOTA_WAIT: usage limit reached' } };
      return modelOutput(input);
    };
    const queue = new ResilientAgentQueue(path.join(dir, 'queue.json'),
      budget, () => now, runner, async () => ({ clean: true }));
    await queue.enqueue(request('Q-RETRY'));
    expect((await queue.runOne(dir)).state).toBe('WAITING_FOR_QUOTA');
    expect((await queue.runOne(dir)).taskId).toBeNull();
    expect(attempts).toBe(1);
    now += 61 * 60_000;
    expect((await queue.runOne(dir)).state).toBe('BLOCKED_REVIEW');
    expect(attempts).toBe(2);
  });

  it('continues authorized offline schema work while model allowance is blocked', async () => {
    const dir = await sandbox();
    let now = 3_000_000;
    const quota = new QuotaResilience(path.join(dir, 'quota.json'), () => now, config);
    await quota.recordQuotaFailure();
    let calls = 0;
    const queue = new ResilientAgentQueue(path.join(dir, 'queue.json'), quota,
      () => now, async (_id, input) => { calls++; return modelOutput(input); },
      async () => ({ clean: true }));
    await queue.enqueue(request('MODEL-WAIT', 'MODEL_AGENT', 10));
    await queue.enqueue(request('SCHEMA-PASS', 'OFFLINE_SCHEMA_CHECK', 1));
    expect(await queue.runOne(dir)).toEqual({ taskId: 'SCHEMA-PASS', state: 'COMPLETED' });
    expect((await queue.status()).counts.WAITING_FOR_QUOTA).toBe(1);
    expect(calls).toBe(0);
    now += 1000;
    expect((await queue.runOne(dir)).taskId).toBeNull();
  });

  it('rejects unknown, unclassified, altered and non-live tasks', async () => {
    const dir = await sandbox();
    const budget = new QuotaResilience(path.join(dir, 'quota.json'));
    const queue = new ResilientAgentQueue(path.join(dir, 'queue.json'),
      budget, Date.now, async (_, input) => ({ ...modelOutput(input),
        provider: 'mock_deterministic', providerExecutionMode: 'SYNTHETIC_TEST_MOCK' }),
      async () => ({ clean: true }));
    await expect(queue.enqueue({ ...request('BAD'), agentId: 'A27' })).rejects.toThrow();
    await expect(queue.enqueue({ ...request('PRIVATE'), input: {
      ...request('PRIVATE').input, context: { dataClassification: 'SECRET' }
    }})).rejects.toThrow(/public\/synthetic/);
    await queue.enqueue(request('NO-MOCK'));
    expect((await queue.runOne(dir)).state).toBe('FAILED');
    expect((await queue.status()).counts.COMPLETED).toBe(0);
  });

  it('serializes simultaneous queue workers and holds source drift for review', async () => {
    const dir = await sandbox();
    const file = path.join(dir, 'queue.json');
    const quota = new QuotaResilience(path.join(dir, 'quota.json'));
    let calls = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const runner = async (_id: string, input: AgentExecutionInput) => {
      calls++;
      await gate;
      return modelOutput(input);
    };
    const queue1 = new ResilientAgentQueue(file, quota, Date.now, runner,
      async () => ({ clean: true }));
    const queue2 = new ResilientAgentQueue(file, quota, Date.now, runner,
      async () => ({ clean: true }));
    await queue1.enqueue(request('CONCURRENT-1'));
    await queue1.enqueue(request('CONCURRENT-2'));
    const first = queue1.runOne(dir);
    // Allow the first claimant to record its RUNNING state.
    for (let k = 0; k < 100; k++) {
      if ((await queue1.status()).counts.RUNNING === 1) break;
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    expect((await queue2.runOne(dir)).taskId).toBeNull();
    release?.();
    expect((await first).taskId).toBe('CONCURRENT-1');
    expect(calls).toBe(1);

    const drift = new ResilientAgentQueue(file, quota, Date.now, runner,
      async () => { throw new Error('Working tree HEAD does not match requested evidence commit'); });
    expect((await drift.runOne(dir)).state).toBe('BLOCKED_REVIEW');
    expect(calls).toBe(1);
  });

  it('never silently retries an expired in-flight lease after a crash', async () => {
    const dir = await sandbox();
    const file = path.join(dir, 'queue.json');
    let now = Date.parse('2026-11-15T00:00:00Z');
    let calls = 0;
    const queue = new ResilientAgentQueue(file,
      new QuotaResilience(path.join(dir, 'quota.json'), () => now),
      () => now, async (_id, input) => { calls++; return modelOutput(input); },
      async () => ({ clean: true }));
    await queue.enqueue(request('INTERRUPTED'));
    const state = JSON.parse(await readFile(file, 'utf8'));
    state.tasks.INTERRUPTED.state = 'RUNNING';
    // Model an actual in-flight attempt; zero attempts is separately corrupt.
    state.tasks.INTERRUPTED.attempts = 1;
    state.tasks.INTERRUPTED.leaseId = 'expired';
    state.tasks.INTERRUPTED.leaseExpiresAt = new Date(now - 1).toISOString();
    await writeFile(file, JSON.stringify(state));
    expect((await queue.runOne(dir)).taskId).toBeNull();
    expect((await queue.status()).counts.BLOCKED_REVIEW).toBe(1);
    const recovered = JSON.parse(await readFile(file, 'utf8')).tasks.INTERRUPTED;
    expect(recovered.leaseId).toBeUndefined();
    expect(recovered.leaseExpiresAt).toBeUndefined();
    expect(recovered.lastError).toMatch(/UNCERTAIN_INFLIGHT_RESULT/);
    expect((await queue.runOne(dir)).taskId).toBeNull();
    expect(calls).toBe(0);
  });
});
