import type { EngineeringTask } from '../types/orchestrator.ts';

/**
 * Validate an entirely new workflow BEFORE touching the currently held
 * workflow or any pending Director approval gate.
 */
export class WorkflowSubmissionError extends Error {
  constructor(message: string, public readonly httpStatus: 400 | 409) {
    super(message);
    this.name = 'WorkflowSubmissionError';
  }
}
const FORBIDDEN_AUTHORITY_KEYS = new Set([
  '__proto__', 'prototype', 'constructor', 'role', 'userid',
  'authenticateduserid', 'approvalid', 'approvalgateid', 'approvalbinding',
  'approvedby', 'approvedat', 'humanapprovalsatisfied',
  'engineeringreleaseapproved', 'baselinewritespermitted',
  'evidencevalid', 'verificationstatus', 'certified', 'isbaseline',
  'signer', 'signature', 'token', 'privatekey',
  'isexploratorystudy', 'safetycritical', 'requiresdirectorapproval'
]);
const MAX_NESTING = 8;
function stripAuthorityClaims(value: unknown, depth = 0): unknown {
  if (depth > MAX_NESTING) {
    throw new WorkflowSubmissionError('Workflow input nesting exceeds security limits', 400);
  }
  if (Array.isArray(value)) {
    if (value.length > 1000) throw new WorkflowSubmissionError('Oversized workflow input list', 400);
    return value.map(item => stripAuthorityClaims(item, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    const fields = Object.entries(value);
    if (fields.length > 250) throw new WorkflowSubmissionError('Oversized workflow input object', 400);
    const cleaned: Record<string, unknown> = Object.create(null);
    for (const [key, entry] of fields) {
      if (FORBIDDEN_AUTHORITY_KEYS.has(key.toLowerCase().replace(/[^a-z0-9]/g, ''))) continue;
      cleaned[key] = stripAuthorityClaims(entry, depth + 1);
    }
    return cleaned;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new WorkflowSubmissionError('Non-finite workflow numerical input', 400);
  }
  return value;
}

/** Untrusted workflow input can supply research parameters, never authority. */
export function sanitizeWorkflowInput(
  context: unknown, parameters: unknown, authenticatedUserId: string
): { context: Record<string, unknown>; parameters: Record<string, unknown> } {
  if (context !== undefined && context !== null &&
      (typeof context !== 'object' || Array.isArray(context))) {
    throw new WorkflowSubmissionError('Invalid workflow context object', 400);
  }
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new WorkflowSubmissionError('Invalid workflow parameters object', 400);
  }
  if (!authenticatedUserId) throw new WorkflowSubmissionError('Missing authenticated identity', 409);
  const filteredContext = stripAuthorityClaims(context ?? {}) as Record<string, unknown>;
  const filteredParameters = stripAuthorityClaims(parameters) as Record<string, unknown>;
  const classification = filteredContext.dataClassification;
  if (classification !== undefined &&
      classification !== 'PUBLIC_SOURCE_SAFE_ONLY' &&
      classification !== 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL') {
    throw new WorkflowSubmissionError('Unapproved workflow information classification', 400);
  }
  return {
    context: {
      ...filteredContext,
      authenticatedUserId,
      dataClassification: classification ?? 'PUBLIC_SOURCE_SAFE_ONLY',
      researchOnly: true,
      engineeringReleaseApproved: false,
      baselineWritesPermitted: false,
      humanApprovalSatisfied: false
    },
    parameters: { ...filteredParameters }
  };
}

export function validateServerWorkflowReplacement(
  next: ReadonlyArray<Pick<EngineeringTask, 'id' | 'dependencies'>>,
  current: ReadonlyArray<Pick<EngineeringTask, 'id' | 'status'>>
): void {
  if (current.some(t => t.status === 'WAITING_HUMAN_APPROVAL' || t.status === 'RUNNING')) {
    throw new WorkflowSubmissionError(
      'Existing workflow contains unfinalized approval or in-flight execution; replacement blocked',
      409
    );
  }
  if (!Array.isArray(next) || next.length < 1 || next.length > 26) {
    throw new WorkflowSubmissionError('Workflow must contain between 1 and 26 tasks', 400);
  }
  const ids = new Set<string>();
  for (const task of next) {
    if (!task || typeof task.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(task.id) ||
        !Array.isArray(task.dependencies) || task.dependencies.length > 25 ||
        task.dependencies.some((dep: string) => typeof dep !== 'string' ||
          !/^[A-Za-z0-9_-]{1,100}$/.test(dep))) {
      throw new WorkflowSubmissionError('Invalid workflow task identity or dependencies', 400);
    }
    if (ids.has(task.id)) throw new WorkflowSubmissionError('Duplicate workflow task identity', 400);
    ids.add(task.id);
  }
  const deps = new Map<string, readonly string[]>();
  for (const task of next) {
    if (new Set(task.dependencies).size !== task.dependencies.length ||
        task.dependencies.includes(task.id) ||
        task.dependencies.some((dep: string) => !ids.has(dep))) {
      throw new WorkflowSubmissionError('Workflow has duplicate, self or missing dependencies', 400);
    }
    deps.set(task.id, task.dependencies);
  }
  const colors = new Map<string, 'VISITING' | 'DONE'>();
  function visit(id: string): void {
    if (colors.get(id) === 'VISITING') throw new WorkflowSubmissionError('Cyclic workflow dependency', 400);
    if (colors.get(id) === 'DONE') return;
    colors.set(id, 'VISITING');
    for (const dep of deps.get(id) ?? []) visit(dep);
    colors.set(id, 'DONE');
  }
  for (const id of ids) visit(id);
}
