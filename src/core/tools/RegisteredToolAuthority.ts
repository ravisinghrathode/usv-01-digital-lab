/**
 * Registered role execution policy for mandatory deterministic engineering tools.
 *
 * The policy is snapshotted once from the source-controlled MASTER_AGENTS
 * at module load and never accepts a permission list from a model, request,
 * task context or mutable BaseAgent.spec. This is in-process defense-in-depth
 * only. Authenticated session binding / durable one-time grants are NOT
 * supplied by this function.
 */
import { MASTER_AGENTS } from '../agents/definitions.ts';
import { ToolRegistry } from './ToolRegistry.ts';
import { AuditLogger } from '../safety/AuditLogger.ts';
import type { ToolExecutionResult } from '../types/tools.ts';
import type { ExecutionPermission } from '../types/agent.ts';

type AuthorityRecord = {
  readonly agentId: string;
  readonly canonicalId: string;
  readonly allowed: ReadonlySet<string>;
  readonly mandatory: ReadonlySet<string>;
  readonly permissions: readonly ExecutionPermission[];
};

const authority = new Map<string, AuthorityRecord>();
for (const spec of MASTER_AGENTS) {
  if (authority.has(spec.id)) throw new Error(`Duplicate authorized agent '${spec.id}'`);
  authority.set(spec.id, {
    agentId: spec.id,
    canonicalId: spec.canonicalId,
    allowed: new Set(spec.permittedTools),
    mandatory: new Set(spec.verificationCriteria.mandatoryDeterministicTools),
    permissions: Object.freeze([...spec.executionPermissions])
  });
}
if (authority.size !== 26) throw new Error('Registered tool authority requires 26 source-pinned agent roles');

function deny(agentId: string, taskId: string, toolId: string, input: unknown, reason: string): ToolExecutionResult {
  AuditLogger.getInstance().log({
    severity: 'SAFETY_CRITICAL',
    agentId,
    taskId,
    action: 'REGISTERED_TOOL_AUTHORITY_DENIED',
    details: { toolId, reason }
  });
  // Avoid embedding potentially sensitive, non-cloneable, attacker-authored
  // data in denied authority receipts.
  return {
    toolId,
    timestamp: new Date().toISOString(),
    success: false,
    engineeringReleaseAuthorized: false,
    independentReferenceValidated: false,
    resultDisposition: 'ANALYSIS_ONLY_NEVER_ACTUATE',
    input: {}, output: {}, executionTimeMs: 0,
    error: `Registered tool authority denied: ${reason}`
  };
}

/** Use only from the trusted agent execution path; never expose as an API route.
 * Refuses all tools not BOTH permitted and mandatory in source-controlled
 * role policy; no caller-provided permission list is accepted.
 */
export async function executeRegisteredMandatoryTool(
  agentId: string, toolId: string, taskId: string,
  input: Record<string, unknown>
): Promise<ToolExecutionResult> {
  const role = authority.get(agentId);
  if (!role) return deny(agentId, taskId, toolId, input, 'unknown registered agent');
  if (typeof taskId !== 'string' || !/^[a-zA-Z0-9_:-]{1,150}$/.test(taskId)) {
    return deny(agentId, taskId, toolId, input, 'invalid or missing task identifier');
  }
  if (typeof toolId !== 'string' || !role.allowed.has(toolId) || !role.mandatory.has(toolId)) {
    return deny(agentId, taskId, toolId, input, 'tool is not a mandatory permitted tool for this role');
  }
  if (!role.permissions.includes('CALCULATION_EXEC')) {
    return deny(agentId, taskId, toolId, input, 'registered role lacks CALCULATION_EXEC');
  }
  const tool = ToolRegistry.getInstance().getTool(toolId);
  if (!tool) return deny(agentId, taskId, toolId, input, 'tool is not registered');
  if (!tool.requiredPermissions.every(p => role.permissions.includes(p as ExecutionPermission))) {
    return deny(agentId, taskId, toolId, input, 'registered role lacks tool-specific permission');
  }
  // Clone before dispatch, so mutating caller input during an async tool
  // execution cannot change the calculation request under examination.
  let request: Record<string, unknown>;
  try {
    request = structuredClone(input);
  } catch {
    return deny(agentId, taskId, toolId, input, 'uncloneable tool input');
  }
  return ToolRegistry.getInstance().executeTool(toolId, request, [...role.permissions]);
}
