import { createHash } from 'node:crypto';
import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ExecutionEngine } from '../engine/ExecutionEngine.ts';
import { advisoryHandoff, topologicalAgentOrder } from './TopologicalAgentCampaign.ts';
import type { AgentExecutionInput, AgentExecutionOutput } from '../types/agent.ts';

export type AgentMatrixCases = Record<string, AgentExecutionInput>;
export interface AgentRunFinding {
  canonicalId: string;
  runtimeId: string;
  inputTaskId?: string;
  dependencyIds?: string[];
  status: 'MISSING_CASE' | 'INVALID_INPUT' | 'BLOCKED_UPSTREAM' |
    'EXECUTION_FAILED' | 'NOT_LIVE_PROVIDER' | 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED';
  startedAt?: string;
  completedAt?: string;
  provider?: string;
  executionMode?: string;
  providerExecutionMode?: string;
  outputDigestSha256?: string;
  correlationId?: string;
  failureReason?: string;
  modelIdentifier?: string;
  requiredToolsVerified?: boolean;
  toolTraces?: Array<{ toolId: string; verified: boolean; inputSha256: string; outputSha256: string }>;
}
export interface AgentMatrixReport {
  generatedAt: string;
  totalAgents: number;
  liveProviderRuns: number;
  findings: AgentRunFinding[];
  providerOperationalMatrixComplete: boolean;
  independentlyEngineeringValidated: false;
  engineeringReleaseApproved: false;
}
export interface AgentMatrixOptions {
  /** For real cross-disciplinary runs, require completed live upstream roles. */
  dependencyAware?: boolean;
  /** Called after each result; caller can journal every attempt before a crash. */
  onFinding?: (finding: AgentRunFinding, completed: readonly AgentRunFinding[]) => Promise<void> | void;
}

/**
 * Execute all 26 registered specialists in topological (engineering) order,
 * not A01-A26 registration order. Any upstream synthesis is explicitly
 * labelled UNVERIFIED and is never copied into controlled numeric inputs.
 *
 * Offline preflights and simulated Vitest calls are NOT operational evidence.
 * A live provider response alone is NOT engineering reference validation.
 */
export async function runLiveAgentMatrix(
  cases: AgentMatrixCases,
  run: (runtimeId: string, input: AgentExecutionInput) => Promise<AgentExecutionOutput> =
    (id, input) => ExecutionEngine.getInstance().executeAgent(id, input, 0),
  options: AgentMatrixOptions = {}
): Promise<AgentMatrixReport> {
  const specs = topologicalAgentOrder(AgentRegistry.getInstance().getAllAgents());
  const findings: AgentRunFinding[] = [];
  const outputById = new Map<string, AgentExecutionOutput>();
  const resultById = new Map<string, AgentRunFinding>();

  const publish = async (finding: AgentRunFinding): Promise<void> => {
    findings.push(finding);
    resultById.set(finding.runtimeId, finding);
    await options.onFinding?.(finding, findings);
  };

  for (const spec of specs) {
    const input = cases[spec.canonicalId];
    const finding: AgentRunFinding = {
      canonicalId: spec.canonicalId,
      runtimeId: spec.id,
      inputTaskId: input?.taskId,
      dependencyIds: [...spec.dependencies],
      status: 'MISSING_CASE'
    };

    if (!input) {
      finding.failureReason = 'Missing explicit specialist case';
      await publish(finding);
      continue;
    }
    if (!spec.inputSchema.safeParse(input).success) {
      finding.status = 'INVALID_INPUT';
      finding.failureReason = 'Input failed the registered agent schema';
      await publish(finding);
      continue;
    }

    if (options.dependencyAware) {
      const badDependencies = spec.dependencies.filter(dependencyId =>
        resultById.get(dependencyId)?.status !== 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED'
      );
      if (badDependencies.length) {
        finding.status = 'BLOCKED_UPSTREAM';
        finding.failureReason = 'Required upstream live specialist evidence missing: ' + badDependencies.join(', ');
        await publish(finding);
        continue;
      }
    }

    finding.startedAt = new Date().toISOString();
    try {
      const runInput: AgentExecutionInput = options.dependencyAware
        ? {
            ...input,
            // The input's trusted physical parameters remain unchanged.
            priorAgentOutputs: {
              ...(input.priorAgentOutputs || {}),
              ...advisoryHandoff(spec, outputById)
            }
          }
        : input;
      const output = await run(spec.id, runInput);
      finding.completedAt = output.timestamp;
      finding.correlationId = output.correlationId;
      finding.provider = output.provider;
      finding.modelIdentifier = output.modelIdentifier;
      finding.executionMode = output.executionMode;
      finding.providerExecutionMode = output.providerExecutionMode;
      finding.outputDigestSha256 = 'sha256:' + createHash('sha256')
        .update(JSON.stringify(output.data)).digest('hex');
      finding.toolTraces = output.deterministicToolEvidence.map(tool => ({
        toolId: tool.toolName,
        verified: tool.verified,
        inputSha256: createHash('sha256').update(JSON.stringify(tool.inputs ?? null)).digest('hex'),
        outputSha256: createHash('sha256').update(JSON.stringify(tool.outputs ?? null)).digest('hex')
      }));
      finding.requiredToolsVerified = spec.verificationCriteria.mandatoryDeterministicTools.every(toolId =>
        finding.toolTraces!.some(tool => tool.toolId === toolId && tool.verified));

      const live = output.providerExecutionMode === 'LIVE_AI_GENERATION' &&
        output.provider === 'codex_cli' &&
        finding.requiredToolsVerified &&
        output.agentId === spec.id &&
        output.taskId === input.taskId &&
        !['FAILED', 'PARTIAL'].includes(output.status) &&
        !!output.correlationId &&
        !!output.timestamp;
      finding.status = live ? 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED' :
        output.status === 'FAILED' ? 'EXECUTION_FAILED' : 'NOT_LIVE_PROVIDER';
      if (!live) {
        const error = output.data?.error;
        finding.failureReason = typeof error === 'string' ? error :
          'Not a complete authenticated Codex role execution with mandatory deterministic evidence';
      } else {
        outputById.set(spec.id, output);
      }
    } catch (error) {
      finding.status = 'EXECUTION_FAILED';
      finding.failureReason = error instanceof Error ? error.message : 'Unknown execution error';
    }
    await publish(finding);
  }

  const complete = findings.length === 26 &&
    new Set(findings.map(x => x.canonicalId)).size === 26 &&
    findings.every(x => x.status === 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED');
  return {
    generatedAt: new Date().toISOString(),
    totalAgents: findings.length,
    liveProviderRuns: findings.filter(x => x.status === 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED').length,
    findings,
    providerOperationalMatrixComplete: complete,
    independentlyEngineeringValidated: false,
    engineeringReleaseApproved: false
  };
}
