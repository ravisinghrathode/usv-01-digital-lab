import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ResilientAgentQueue } from '../src/core/mission-control/ResilientAgentQueue.ts';
import { QuotaResilience } from '../src/core/mission-control/QuotaResilience.ts';

const NOW = '2026-11-17T04:00:00.000Z';
const tmp: string[] = [];
const task = () => ({
  taskId: 'TASK-001',
  agentId: 'LEAD-SYS-01',
  commitSha: 'a'.repeat(40),
  lane: 'MODEL_AGENT',
  priority: 5,
  input: { taskId: 'TASK-001', context: { dataClassification: 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL' } },
  digest: 'sha256:' + 'b'.repeat(64),
  state: 'PENDING',
  createdAt: NOW,
  updatedAt: NOW,
  attempts: 0
});
function seedQueue(value: unknown) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-queue-recovery-'));
  tmp.push(folder);
  const file = path.join(folder, 'agent-queue.json');
  fs.writeFileSync(file, JSON.stringify(value));
  const quota = new QuotaResilience(path.join(folder, 'quota-state.json'), () => Date.parse(NOW));
  const model = vi.fn(async () => { throw new Error('MODEL_MUST_NOT_BE_INVOKED'); });
  const verify = vi.fn(async () => { throw new Error('GIT_MUST_NOT_BE_INVOKED'); });
  const queue = new ResilientAgentQueue(file, quota, () => Date.parse(NOW), model, verify);
  return { queue, model, verify, file };
}
function store(row: Record<string, unknown> = task()) {
  return {
    schemaVersion: 1,
    tasks: { 'TASK-001': row },
    events: [{ at: NOW, taskId: 'TASK-001', state: 'PENDING', note: 'ENQUEUED_NOT_APPROVED' }]
  };
}
function receipt() {
  return {
    provider: 'codex_cli',
    modelRequested: 'UNVERIFIED',
    executionMode: 'LIVE_AI_GENERATION',
    responseSha256: 'sha256:' + 'c'.repeat(64),
    producedAt: NOW,
    humanApprovalSatisfied: false,
    engineeringReleaseApproved: false
  };
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const file of tmp.splice(0)) fs.rmSync(file, { recursive: true, force: true });
});

describe('fail-closed durable 26-agent queue recovery', () => {
  it('reads valid unapproved persisted draft tasks without conferring release authority', async () => {
    const { queue } = seedQueue(store());
    const status = await queue.status();
    expect(status.counts.PENDING).toBe(1);
    expect(status.counts.COMPLETED).toBe(0);
    expect(status.engineeringReleaseApproved).toBe(false);
  });

  it.each([
    ['invalid root schema', { ...store(), tasks: [] }],
    ['unknown persisted task state', store({ ...task(), state: 'APPROVED_ENGINEERING_RELEASE' })],
    ['mismatched record ID', store({ ...task(), taskId: 'DIFFERENT' })],
    ['invalid source digest', store({ ...task(), digest: 'MALFORMED' })],
    ['recovered restricted input classification', store({
      ...task(), input: { ...task().input, context: { dataClassification: 'RESTRICTED_NAVAL' } }
    })],
    ['recovered missing input classification', store({
      ...task(), input: { ...task().input, context: {} }
    })],
    ['out-of-bounds attempts', store({ ...task(), attempts: 999 })],
    ['completed without receipt', store({ ...task(), state: 'COMPLETED', attempts: 1 })],
    ['forged human approval in receipt', store({
      ...task(), state: 'COMPLETED', attempts: 1,
      receipt: { ...receipt(), humanApprovalSatisfied: true }
    })],
    ['forged engineering release in receipt', store({
      ...task(), state: 'COMPLETED', attempts: 1,
      receipt: { ...receipt(), engineeringReleaseApproved: true }
    })],
    ['unattempted completed receipt', store({
      ...task(), state: 'COMPLETED', receipt: receipt()
    })],
    ['pending task with forged receipt', store({
      ...task(), receipt: receipt()
    })],
    ['quota-waiting task with receipt', store({
      ...task(), state: 'WAITING_FOR_QUOTA', attempts: 1, receipt: receipt()
    })],
    ['failed task with stale receipt', store({
      ...task(), state: 'FAILED', attempts: 1, receipt: receipt()
    })],
    ['in-flight completion receipt', store({
      ...task(), state: 'RUNNING', attempts: 1,
      receipt: receipt()
    })],
    ['orphaned lease ID on pending task', store({
      ...task(), leaseId: 'orphan', leaseExpiresAt: NOW
    })],
    ['running task without an attempt', store({
      ...task(), state: 'RUNNING', leaseId: 'lease', leaseExpiresAt: NOW
    })],
    ['running task with only a lease ID', store({
      ...task(), state: 'RUNNING', attempts: 1, leaseId: 'lease'
    })],
    ['completed task retaining lease metadata', store({
      ...task(), state: 'COMPLETED', attempts: 1, receipt: receipt(),
      leaseId: 'stale', leaseExpiresAt: NOW
    })],
    ['corrupt retry timestamp', store({ ...task(), nextAttemptAt: 'never' })],
    ['unknown history event owner', {
      ...store(), events: [{ at: NOW, taskId: 'MISSING', state: 'COMPLETED', note: 'FORGED' }]
    }]
  ])('rejects %s before any model call', async (_caseName, corrupt) => {
    const { queue, verify, model, file } = seedQueue(corrupt);
    const bytes = fs.readFileSync(file, 'utf8');
    await expect(queue.status()).rejects.toThrow('QUEUE_STATE_CORRUPT');
    await expect(queue.runOne(process.cwd())).rejects.toThrow('QUEUE_STATE_CORRUPT');
    expect(verify).not.toHaveBeenCalled();
    expect(model).not.toHaveBeenCalled();
    expect(fs.readFileSync(file, 'utf8')).toBe(bytes);
  });

  it('reports a complete research receipt without claiming engineering approval', async () => {
    const { queue } = seedQueue(store({
      ...task(), state: 'COMPLETED', attempts: 1, receipt: receipt()
    }));
    const status = await queue.status();
    expect(status.counts.COMPLETED).toBe(1);
    expect(status.engineeringReleaseApproved).toBe(false);
  });
});
