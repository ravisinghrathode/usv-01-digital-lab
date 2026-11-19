/**
 * Persistent, operator-local research queue for all 26 canonical specialists.
 * - Checkpoint before any model call; quota wait survives restarts.
 * - Exactly one claimant per task; a crashed in-flight call NEVER auto-replays.
 * - Pinned source + input digest; no mock, paid API, merge or design approval.
 * - The offline schema lane proceeds even when Codex quota is exhausted.
 * This is NOT a distributed scheduler or an engineering release authority.
 */
import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ExecutionEngine } from '../engine/ExecutionEngine.ts';
import type { AgentExecutionInput, AgentExecutionOutput } from '../types/agent.ts';
import { assertPinnedCleanGitRevision } from './GitRevisionGuard.ts';
import { mutateDurableState, readDurableState } from './DurableJsonState.ts';
import { isQuotaFailure, QuotaResilience, type QuotaSnapshot } from './QuotaResilience.ts';

export type QueueLane = 'MODEL_AGENT' | 'OFFLINE_SCHEMA_CHECK';
export type QueueState =
  'PENDING' | 'RUNNING' | 'WAITING_FOR_QUOTA' | 'RESUMABLE' |
  'BLOCKED_REVIEW' | 'COMPLETED' | 'FAILED';
export interface QueueRequest {
  taskId: string;
  agentId: string;
  commitSha: string;
  lane: QueueLane;
  priority: number;
  input: AgentExecutionInput;
}
export interface QueueRecord extends QueueRequest {
  digest: string;
  state: QueueState;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  nextAttemptAt?: string;
  leaseId?: string;
  leaseExpiresAt?: string;
  lastError?: string;
  receipt?: {
    provider: string;
    modelRequested: string;
    executionMode: string;
    responseSha256: string;
    producedAt: string;
    humanApprovalSatisfied: false;
    engineeringReleaseApproved: false;
    output?: AgentExecutionOutput;
  };
}
interface QueueStateFile {
  schemaVersion: 1;
  tasks: Record<string, QueueRecord>;
  events: Array<{ at: string; taskId: string; state: QueueState; note: string }>;
}
export interface QueueStatus {
  counts: Record<QueueState, number>;
  quota: QuotaSnapshot;
  tasks: Array<Pick<QueueRecord, 'taskId' | 'agentId' | 'lane' | 'state' |
    'priority' | 'attempts' | 'nextAttemptAt' | 'lastError' | 'updatedAt'>>;
  engineeringReleaseApproved: false;
}
type ModelRunner = (agentId: string, input: AgentExecutionInput) => Promise<AgentExecutionOutput>;
type RevisionVerifier = (dir: string, sha: string) => Promise<unknown>;

const STATE_VALUES: QueueState[] = [
  'PENDING', 'RUNNING', 'WAITING_FOR_QUOTA', 'RESUMABLE',
  'BLOCKED_REVIEW', 'COMPLETED', 'FAILED'
];
const MAX_ATTEMPTS = 10;
function emptyQueue(): QueueStateFile {
  return { schemaVersion: 1, tasks: Object.create(null), events: [] };
}
function digest(value: unknown): string {
  return 'sha256:' + createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function recordEvent(store: QueueStateFile, task: QueueRecord, note: string): void {
  store.events.push({ at: task.updatedAt, taskId: task.taskId, state: task.state, note });
  if (store.events.length > 1000) store.events = store.events.slice(-1000);
}
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isUtcTimestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function invalidState(reason: string): never {
  throw new Error('QUEUE_STATE_CORRUPT: ' + reason + '; manual inspection required');
}
/**
 * Validate the entire recovered queue before issuing new model calls.
 * Never interpret attacker-supplied completion/approval claims as receipts.
 */
function validateStore(state: QueueStateFile): void {
  if (!isObject(state) || state.schemaVersion !== 1 ||
    !isObject(state.tasks) || !Array.isArray(state.events)) {
    invalidState('invalid root schema');
  }
  if (Object.keys(state.tasks).length > 1000 || state.events.length > 1000) {
    invalidState('bounded queue capacity exceeded');
  }
  for (const [id, value] of Object.entries(state.tasks)) {
    if (!isObject(value)) invalidState('malformed task');
    const row = value as unknown as QueueRecord;
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(id) ||
      row.taskId !== id ||
      !isObject(row.input) || row.input.taskId !== id ||
      typeof row.agentId !== 'string' || !row.agentId ||
      typeof row.commitSha !== 'string' || !/^[a-f0-9]{40}$/i.test(row.commitSha) ||
      (row.lane !== 'MODEL_AGENT' && row.lane !== 'OFFLINE_SCHEMA_CHECK') ||
      !Number.isSafeInteger(row.priority) || row.priority < 0 || row.priority > 10 ||
      typeof row.digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(row.digest) ||
      !STATE_VALUES.includes(row.state) ||
      !Number.isSafeInteger(row.attempts) || row.attempts < 0 ||
      row.attempts > MAX_ATTEMPTS ||
      !isUtcTimestamp(row.createdAt) || !isUtcTimestamp(row.updatedAt) ||
      Date.parse(row.updatedAt) < Date.parse(row.createdAt)) {
      invalidState('invalid task identity, revision, state or provenance');
    }
    if ((row.leaseId !== undefined && (typeof row.leaseId !== 'string' || !row.leaseId)) ||
      (row.leaseExpiresAt !== undefined && !isUtcTimestamp(row.leaseExpiresAt)) ||
      (row.nextAttemptAt !== undefined && !isUtcTimestamp(row.nextAttemptAt)) ||
      (row.lastError !== undefined &&
        (typeof row.lastError !== 'string' || row.lastError.length > 1000))) {
      invalidState('malformed lease or retry metadata');
    }
    // A lease is meaningful only while an attempt is running. Reject orphaned
    // lease metadata rather than treating a corrupted checkpoint as claimable.
    if ((row.leaseId === undefined) !== (row.leaseExpiresAt === undefined) ||
      (row.state === 'RUNNING' && row.attempts === 0) ||
      (row.state !== 'RUNNING' && row.leaseId !== undefined)) {
      invalidState('lease metadata inconsistent with running attempt');
    }
    // A receipt is an execution artifact, never a pending-task authorization.
    // In particular, an unattempted task cannot legitimately have a receipt.
    if (row.receipt !== undefined &&
      (row.attempts === 0 || !['COMPLETED', 'BLOCKED_REVIEW'].includes(row.state))) {
      invalidState('receipt is inconsistent with task execution state');
    }
    if (row.state === 'COMPLETED' && row.receipt === undefined) {
      invalidState('completed task lacks an execution receipt');
    }
    if (row.receipt !== undefined) {
      const receipt = row.receipt;
      if (!isObject(receipt) ||
        receipt.humanApprovalSatisfied !== false ||
        receipt.engineeringReleaseApproved !== false ||
        (receipt.provider !== 'codex_cli' && receipt.provider !== 'NO_MODEL_CALL') ||
        typeof receipt.modelRequested !== 'string' ||
        typeof receipt.executionMode !== 'string' ||
        typeof receipt.responseSha256 !== 'string' ||
        !/^sha256:[a-f0-9]{64}$/.test(receipt.responseSha256) ||
        !isUtcTimestamp(receipt.producedAt) ||
        (receipt.provider === 'NO_MODEL_CALL' &&
          (row.lane !== 'OFFLINE_SCHEMA_CHECK' ||
            receipt.executionMode !== 'SCHEMA_VALIDATION_ONLY'))) {
        invalidState('forged or malformed execution receipt');
      }
    }
  }
  for (const event of state.events) {
    if (!isObject(event) || !isUtcTimestamp(event.at) ||
      typeof event.taskId !== 'string' || !Object.hasOwn(state.tasks, event.taskId) ||
      !STATE_VALUES.includes(event.state as QueueState) ||
      typeof event.note !== 'string' || event.note.length > 1000) {
      invalidState('corrupt task event history');
    }
  }
}
export function defaultAgentQueuePath(): string {
  return process.env.USV_AGENT_QUEUE_PATH ||
    path.join(os.homedir(), '.usv01', 'runtime', 'agent-queue.json');
}
export class ResilientAgentQueue {
  constructor(
    private readonly file: string = defaultAgentQueuePath(),
    private readonly quota: QuotaResilience = new QuotaResilience(),
    private readonly clock: () => number = Date.now,
    private readonly executeAgent: ModelRunner =
      (id, input) => ExecutionEngine.getInstance().executeAgent(id, input, 0),
    private readonly verifyRevision: RevisionVerifier = assertPinnedCleanGitRevision
  ) {}

  async enqueue(request: QueueRequest): Promise<QueueRecord> {
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(request.taskId) ||
      request.input?.taskId !== request.taskId) throw new Error('Invalid or mismatched task ID');
    if (!/^[a-f0-9]{40}$/i.test(request.commitSha)) throw new Error('Full 40-character pinned Git SHA required');
    const spec = AgentRegistry.getInstance().requireAgent(request.agentId);
    if (!spec.inputSchema.safeParse(request.input).success) throw new Error('Registered agent input schema rejected');
    if (!['MODEL_AGENT', 'OFFLINE_SCHEMA_CHECK'].includes(request.lane) ||
      !Number.isSafeInteger(request.priority) || request.priority < 0 ||
      request.priority > 10) throw new Error('Invalid queue lane or priority');
    if (!['PUBLIC_SOURCE_SAFE_ONLY', 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL'].includes(
      String(request.input.context?.dataClassification || '')
    )) throw new Error('Resilient queue accepts only explicitly public/synthetic research inputs');
    if (JSON.stringify(request).length > 64_000) throw new Error('Queue input exceeds 64 KiB');
    const normalized: QueueRequest = { ...request, agentId: spec.id };
    const sourceDigest = digest(normalized);
    return mutateDurableState(this.file, emptyQueue, state => {
      validateStore(state);
      // JSON.parse creates ordinary objects: avoid inherited names such as
      // "constructor" and "toString" being mistaken for existing task records.
      const existing = Object.hasOwn(state.tasks, request.taskId)
        ? state.tasks[request.taskId] : undefined;
      if (existing) {
        if (existing.digest !== sourceDigest) {
          throw new Error('TASK_ID_CONFLICT: refusing to replace previously queued evidence');
        }
        return structuredClone(existing);
      }
      if (Object.keys(state.tasks).length >= 1000) throw new Error('QUEUE_CAPACITY_REACHED');
      const now = new Date(this.clock()).toISOString();
      const row: QueueRecord = {
        ...normalized, digest: sourceDigest, state: 'PENDING', attempts: 0,
        createdAt: now, updatedAt: now
      };
      state.tasks[row.taskId] = row;
      recordEvent(state, row, 'ENQUEUED_NOT_APPROVED');
      return structuredClone(row);
    });
  }

  async status(): Promise<QueueStatus> {
    const store = await readDurableState(this.file, emptyQueue);
    validateStore(store);
    const counts = Object.fromEntries(STATE_VALUES.map(s => [s, 0])) as Record<QueueState, number>;
    const tasks = Object.values(store.tasks).map(t => {
      if (!STATE_VALUES.includes(t.state)) throw new Error('QUEUE_STATE_CORRUPT: unknown task state');
      counts[t.state]++;
      return {
        taskId: t.taskId, agentId: t.agentId, lane: t.lane,
        state: t.state, priority: t.priority, attempts: t.attempts,
        nextAttemptAt: t.nextAttemptAt, lastError: t.lastError, updatedAt: t.updatedAt
      };
    });
    return {
      counts, quota: await this.quota.status(), tasks,
      engineeringReleaseApproved: false
    };
  }

  async runOne(workingDirectory: string): Promise<{ taskId: string | null; state: QueueState | null }> {
    const now = this.clock();
    const quota = await this.quota.status();
    const claim = await mutateDurableState(this.file, emptyQueue, state => {
      validateStore(state);
      // A lease may expire after a process crash. Never automatically repeat a
      // potentially completed model request whose final receipt was not saved.
      for (const row of Object.values(state.tasks)) {
        if (row.state === 'RUNNING' &&
          (!row.leaseExpiresAt || Date.parse(row.leaseExpiresAt) <= now)) {
          row.state = 'BLOCKED_REVIEW';
          row.updatedAt = new Date(now).toISOString();
          row.lastError = 'UNCERTAIN_INFLIGHT_RESULT: operator must inspect prior execution';
          delete row.leaseId;
          recordEvent(state, row, 'CRASH_RECOVERY_REQUIRES_REVIEW');
        }
      }
      // A single queue worker may claim one model task at a time, even when
      // launchd/manual dispatches overlap across different processes.
      if (Object.values(state.tasks).some(row => row.state === 'RUNNING')) {
        return null;
      }
      if (quota.state === 'AVAILABLE') {
        for (const row of Object.values(state.tasks)) {
          if (row.state === 'WAITING_FOR_QUOTA' &&
            (!row.nextAttemptAt || Date.parse(row.nextAttemptAt) <= now)) {
            row.state = 'RESUMABLE';
            row.updatedAt = new Date(now).toISOString();
            recordEvent(state, row, 'QUOTA_ELIGIBLE_NOT_PROVIDER_ATTESTED');
          }
        }
      }
      const eligible = Object.values(state.tasks)
        .filter(row => row.state === 'PENDING' || row.state === 'RESUMABLE' ||
          (row.state === 'WAITING_FOR_QUOTA' && (!row.nextAttemptAt ||
            Date.parse(row.nextAttemptAt) <= now)))
        .sort((a, b) => b.priority - a.priority ||
          a.createdAt.localeCompare(b.createdAt));
      for (const row of eligible) {
        if (row.lane === 'MODEL_AGENT' && quota.state === 'WAITING_FOR_QUOTA') {
          row.state = 'WAITING_FOR_QUOTA';
          row.nextAttemptAt = quota.retryAfter || new Date(now + 60_000).toISOString();
          row.updatedAt = new Date(now).toISOString();
          continue;
        }
        if (row.attempts >= MAX_ATTEMPTS) {
          row.state = 'FAILED';
          row.lastError = 'MAX_MODEL_ATTEMPTS_REACHED';
          row.updatedAt = new Date(now).toISOString();
          recordEvent(state, row, 'RETRY_LIMIT');
          continue;
        }
        row.state = 'RUNNING';
        row.attempts++;
        row.updatedAt = new Date(now).toISOString();
        row.leaseId = randomUUID();
        row.leaseExpiresAt = new Date(now + 15 * 60_000).toISOString();
        delete row.nextAttemptAt;
        recordEvent(state, row, 'LEASED_FOR_ONE_ATTEMPT');
        return structuredClone(row);
      }
      return null;
    });
    if (!claim) return { taskId: null, state: null };
    let outcome: QueueState = 'FAILED';
    let reason = '';
    let receipt: QueueRecord['receipt'];
    let retryAt: string | undefined;
    try {
      await this.verifyRevision(workingDirectory, claim.commitSha);
      if (claim.lane === 'OFFLINE_SCHEMA_CHECK') {
        const spec = AgentRegistry.getInstance().requireAgent(claim.agentId);
        const valid = spec.inputSchema.safeParse(claim.input).success;
        if (!valid) throw new Error('Registered input schema rejected during offline validation');
        outcome = 'COMPLETED';
        receipt = {
          provider: 'NO_MODEL_CALL', modelRequested: 'NONE',
          executionMode: 'SCHEMA_VALIDATION_ONLY',
          responseSha256: digest({ agentId: claim.agentId, valid }),
          producedAt: new Date(this.clock()).toISOString(),
          humanApprovalSatisfied: false, engineeringReleaseApproved: false
        };
      } else {
        const result = await this.executeAgent(claim.agentId, claim.input);
        const error = typeof result.data?.error === 'string' ? result.data.error : '';
        if (isQuotaFailure(error)) {
          outcome = 'WAITING_FOR_QUOTA';
          const current = await this.quota.status();
          retryAt = current.retryAfter || new Date(this.clock() + 60 * 60_000).toISOString();
          reason = 'USV_QUOTA_WAIT: ' + error.slice(0, 400);
        } else if (result.status === 'FAILED' || result.provider !== 'codex_cli' ||
          result.providerExecutionMode !== 'LIVE_AI_GENERATION') {
          outcome = 'FAILED';
          reason = ('NON_LIVE_OR_FAILED_PROVIDER: ' + (error || result.status)).slice(0, 450);
        } else {
          outcome = result.requiresDirectorApproval || result.status !== 'SUCCESS'
            ? 'BLOCKED_REVIEW' : 'COMPLETED';
          receipt = {
            provider: result.provider,
            modelRequested: result.modelIdentifier || 'UNKNOWN_UNVERIFIED',
            executionMode: result.providerExecutionMode,
            responseSha256: digest(result.data),
            producedAt: result.timestamp,
            humanApprovalSatisfied: false,
            engineeringReleaseApproved: false,
            output: result
          };
        }
      }
    } catch (error: any) {
      reason = String(error?.message || error).slice(0, 450);
      if (isQuotaFailure(reason)) {
        outcome = 'WAITING_FOR_QUOTA';
        const current = await this.quota.status();
        retryAt = current.retryAfter || new Date(this.clock() + 60 * 60_000).toISOString();
      } else {
        // A source revision mismatch must not be auto-retried under a changed
        // baseline or falsely classified as a completed engineering attempt.
        outcome = /HEAD|Git revision|tracked modifications|pinned commit/i.test(reason)
          ? 'BLOCKED_REVIEW' : 'FAILED';
      }
    }
    await mutateDurableState(this.file, emptyQueue, state => {
      validateStore(state);
      const row = state.tasks[claim.taskId];
      if (!row || row.state !== 'RUNNING' || row.leaseId !== claim.leaseId) {
        throw new Error('TASK_LEASE_LOST: do not overwrite ambiguous execution evidence');
      }
      row.state = outcome;
      row.updatedAt = new Date(this.clock()).toISOString();
      row.lastError = reason || undefined;
      row.nextAttemptAt = retryAt;
      row.receipt = receipt;
      delete row.leaseId;
      delete row.leaseExpiresAt;
      recordEvent(state, row, 'ATTEMPT_FINISHED');
    });
    return { taskId: claim.taskId, state: outcome };
  }
}
