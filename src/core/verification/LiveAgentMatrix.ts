import { createHash } from 'node:crypto';
import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ExecutionEngine } from '../engine/ExecutionEngine.ts';
import type { AgentExecutionInput, AgentExecutionOutput } from '../types/agent.ts';

export type AgentMatrixCases = Record<string, AgentExecutionInput>;
export interface AgentRunFinding {
  canonicalId: string;
  runtimeId: string;
  status: 'MISSING_CASE' | 'INVALID_INPUT' | 'EXECUTION_FAILED' | 'NOT_LIVE_PROVIDER' | 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED';
  provider?: string;
  executionMode?: string;
  providerExecutionMode?: string;
  outputDigestSha256?: string;
  correlationId?: string;
  failureReason?: string;
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

/**
 * Executes actual registered agents using explicit domain cases. No default
 * invented naval particulars; caller supplies engineering test parameters.
 * A live language-model response is NOT proof of numerical or safety accuracy.
 */
export async function runLiveAgentMatrix(
  cases: AgentMatrixCases,
  run: (runtimeId: string, input: AgentExecutionInput) => Promise<AgentExecutionOutput> =
    (id, input) => ExecutionEngine.getInstance().executeAgent(id, input, 0)
): Promise<AgentMatrixReport> {
  const registry = AgentRegistry.getInstance();
  const findings: AgentRunFinding[] = [];
  for (const spec of registry.getAllAgents()) {
    const input = cases[spec.canonicalId];
    const finding: AgentRunFinding = {
      canonicalId: spec.canonicalId,
      runtimeId: spec.id,
      status: 'MISSING_CASE'
    };
    if (!input) {
      findings.push(finding);
      continue;
    }
    if (!spec.inputSchema.safeParse(input).success) {
      finding.status = 'INVALID_INPUT';
      findings.push(finding);
      continue;
    }
    try {
      const output = await run(spec.id, input);
      finding.correlationId = output.correlationId;
      if (output.status === 'FAILED') {
        const error = output.data?.error;
        finding.failureReason = typeof error === 'string' ? error : 'Agent execution failed without a recorded reason';
      }
      finding.provider = output.provider;
      finding.executionMode = output.executionMode;
      finding.providerExecutionMode = output.providerExecutionMode;
      finding.outputDigestSha256 = 'sha256:' + createHash('sha256')
        .update(JSON.stringify(output.data)).digest('hex');
      const realProvider = ['gemini','openai','ollama','codex_cli'].includes(output.provider || '');
      const live = output.providerExecutionMode === 'LIVE_AI_GENERATION' && realProvider &&
        output.agentId === spec.id && output.taskId === input.taskId &&
        !['FAILED','PARTIAL'].includes(output.status) && !!output.correlationId;
      finding.status = live ? 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED' :
        output.status === 'FAILED' ? 'EXECUTION_FAILED' : 'NOT_LIVE_PROVIDER';
    } catch {
      finding.status = 'EXECUTION_FAILED';
    }
    findings.push(finding);
  }
  const complete = findings.length === 26 &&
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
