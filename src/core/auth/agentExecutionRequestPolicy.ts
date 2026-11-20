import { randomUUID } from 'node:crypto';
import type { AgentExecutionInput } from '../types/agent.ts';

export class AgentExecutionRequestError extends Error {
  constructor(message: string, public readonly httpStatus: 400 | 413 = 400) {
    super(message);
    this.name = 'AgentExecutionRequestError';
  }
}
const AUTHORITY_KEYS = new Set([
  'proto', 'prototype', 'constructor', 'role', 'userid',
  'authenticateduserid', 'authenticateduserrole', 'approvalgateid',
  'approvalbinding', 'approvedby', 'approvedat', 'humanapprovalsatisfied',
  'evidencevalid', 'verificationstatus', 'certified', 'isbaseline',
  'engineeringreleaseapproved', 'baselinewritespermitted',
  'requiresdirectorapproval', 'privatekey', 'token', 'signature',
  'isexploratorystudy', 'safetycritical'
]);
// Normalize separators so punctuation cannot disguise a privileged claim.
function authorityKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}
function scrub(value: unknown, depth = 0): unknown {
  if (depth > 8) throw new AgentExecutionRequestError('Agent input nesting exceeds limit');
  if (Array.isArray(value)) {
    if (value.length > 1000) throw new AgentExecutionRequestError('Agent input array exceeds limit');
    return value.map(x => scrub(x, depth + 1));
  }
  if (isRecord(value)) {
    const fields = Object.entries(value);
    if (fields.length > 250) throw new AgentExecutionRequestError('Agent input object exceeds limit');
    const clean: Record<string, unknown> = Object.create(null);
    for (const [key, child] of fields) {
      if (key.length > 256) throw new AgentExecutionRequestError('Agent input object key exceeds limit');
      if (AUTHORITY_KEYS.has(authorityKey(key))) continue;
      clean[key] = scrub(child, depth + 1);
    }
    return clean;
  }
  if (typeof value === 'string' && value.length > 16_384) {
    throw new AgentExecutionRequestError('Agent input string exceeds limit');
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new AgentExecutionRequestError('Non-finite numerical parameter');
  }
  return value;
}

/** Bind all authority-bearing fields to a verified server session only. */
export function bindAgentExecutionRequest(
  raw: unknown,
  actor: { userId: string; role: string },
  serverCorrelationId: string,
  newTaskId: () => string = randomUUID
): AgentExecutionInput {
  if (!isRecord(raw)) throw new AgentExecutionRequestError('Invalid agent execution request');
  if (JSON.stringify(raw).length > 2_000_000) {
    throw new AgentExecutionRequestError('Agent execution request exceeds 2MB', 413);
  }
  if (!actor.userId || !actor.role || !/^corr-srv-[A-Za-z0-9-]{12,}$/.test(serverCorrelationId)) {
    throw new AgentExecutionRequestError('Missing verified actor or server correlation ID');
  }
  const taskId = raw.taskId === undefined ? 'TASK-' + newTaskId() : raw.taskId;
  if (typeof taskId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(taskId)) {
    throw new AgentExecutionRequestError('Invalid bounded task ID');
  }
  if (raw.parameters !== undefined && !isRecord(raw.parameters)) {
    throw new AgentExecutionRequestError('Invalid agent parameter object');
  }
  if (raw.context !== undefined && !isRecord(raw.context)) {
    throw new AgentExecutionRequestError('Invalid agent context object');
  }
  if (raw.priorAgentOutputs !== undefined && !isRecord(raw.priorAgentOutputs)) {
    throw new AgentExecutionRequestError('Invalid prior-agent advisory object');
  }
  if (raw.userNotes !== undefined &&
      (typeof raw.userNotes !== 'string' || raw.userNotes.length > 4000)) {
    throw new AgentExecutionRequestError('Invalid bounded user notes');
  }
  const context = scrub(raw.context ?? {}) as Record<string, unknown>;
  const parameters = scrub(raw.parameters ?? {}) as Record<string, unknown>;
  const priorAgentOutputs = scrub(raw.priorAgentOutputs ?? {}) as Record<string, unknown>;
  if (context.dataClassification !== undefined &&
      context.dataClassification !== 'PUBLIC_SOURCE_SAFE_ONLY' &&
      context.dataClassification !== 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL') {
    throw new AgentExecutionRequestError('No approved model transfer route for classified engineering inputs');
  }
  return {
    taskId,
    parameters,
    context: {
      ...context,
      authenticatedUserId: actor.userId,
      authenticatedUserRole: actor.role,
      dataClassification: context.dataClassification ?? 'PUBLIC_SOURCE_SAFE_ONLY',
      researchOnly: true,
      engineeringReleaseApproved: false,
      baselineWritesPermitted: false,
      humanApprovalSatisfied: false,
      priorAgentOutputsUnverified: true
    },
    priorAgentOutputs,
    userNotes: raw.userNotes as string | undefined,
    correlationId: serverCorrelationId
  };
}
