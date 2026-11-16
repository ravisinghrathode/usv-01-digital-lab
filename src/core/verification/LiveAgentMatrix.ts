import { createHash } from 'node:crypto';
import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ExecutionEngine } from '../engine/ExecutionEngine.ts';
import { geminiTransferAuthorized } from '../models/DualSubscriptionRoutingPolicy.ts';
import {
  topologicalAgentOrder, advisoryReceiptFromOutput,
  advisoryHandoffFromReceipts, type AgentAdvisoryReceipt
} from './TopologicalAgentCampaign.ts';
import type { AgentExecutionInput, AgentExecutionOutput } from '../types/agent.ts';

export type AgentMatrixCases = Record<string, AgentExecutionInput>;
export interface AgentRunFinding {
  canonicalId: string;
  runtimeId: string;
  /** Source of this one trace; historical rows must not count toward current-SHA 26/26. */
  originSourceSha?: string;
  inputTaskId?: string;
  dependencyIds?: string[];
  status: 'MISSING_CASE' | 'INVALID_INPUT' | 'BLOCKED_UPSTREAM' |
    'HISTORICAL_LIVE_PROVIDER_EXECUTED_UNCERTIFIED' |
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
  historicalProviderRuns: number;
  findings: AgentRunFinding[];
  providerOperationalMatrixComplete: boolean;
  independentlyEngineeringValidated: false;
  engineeringReleaseApproved: false;
}
export interface AgentMatrixOptions {
  /** For real cross-disciplinary runs, require completed live upstream roles. */
  dependencyAware?: boolean;
  /** Validated, ordered prefix of committed checkpoints; caller validates provenance. */
  resume?: {
    findings: AgentRunFinding[];
    advisories: Record<string, AgentAdvisoryReceipt>;
  };
  /** Durable attempt marker must be written BEFORE invoking any model. */
  beforeAgent?: (finding: AgentRunFinding, completed: readonly AgentRunFinding[]) => Promise<void> | void;
  /** Journal both the verified finding and its bounded advisory handoff. */
  onFinding?: (finding: AgentRunFinding, completed: readonly AgentRunFinding[],
    advisory?: AgentAdvisoryReceipt) => Promise<void> | void;
}

/**
 * Execute all 26 registered specialists in topological (engineering) order,
 * not A01-A26 registration order. Any upstream synthesis is explicitly
 * labelled UNVERIFIED and is never copied into controlled numeric inputs.
 *
 * Offline preflights and simulated Vitest calls are NOT operational evidence.
 * A live provider response alone is NOT engineering reference validation.
 * Gemini is permitted only with separately authorized transport, a real
 * live response and verified exact Hydrogen model metadata; never on tests,
 * mock calculations, policy refusal or unverified model provenance.
 */
export async function runLiveAgentMatrix(
  cases: AgentMatrixCases,
  run: (runtimeId: string, input: AgentExecutionInput) => Promise<AgentExecutionOutput> =
    (id, input) => ExecutionEngine.getInstance().executeAgent(id, input, 0),
  options: AgentMatrixOptions = {}
): Promise<AgentMatrixReport> {
  const specs = topologicalAgentOrder(AgentRegistry.getInstance().getAllAgents());
  const findings: AgentRunFinding[] = [];
  const receipts = new Map<string, AgentAdvisoryReceipt>();
  const resultById = new Map<string, AgentRunFinding>();
  const resumed = options.resume?.findings || [];
  if (resumed.length > specs.length) throw new Error('Invalid resume: excess agents');
  for (let i = 0; i < resumed.length; i++) {
    const finding = resumed[i];
    const spec = specs[i];
    if (finding.runtimeId !== spec.id || finding.canonicalId !== spec.canonicalId ||
        !['LIVE_PROVIDER_EXECUTED_UNCERTIFIED',
          'HISTORICAL_LIVE_PROVIDER_EXECUTED_UNCERTIFIED'].includes(finding.status)) {
      throw new Error('Invalid resume: non-successful or out-of-order agent result');
    }
    const advisory = options.resume?.advisories[spec.id];
    if (!advisory || advisory.outputSha256 !== finding.outputDigestSha256 ||
        advisory.dataClassification !== 'UNVERIFIED_UPSTREAM_ADVISORY' ||
        advisory.engineeringReleaseApproved !== false) {
      throw new Error('Invalid resume: missing or mismatched advisory receipt');
    }
    findings.push(finding);
    resultById.set(spec.id, finding);
    receipts.set(spec.id, advisory);
  }

  const publish = async (finding: AgentRunFinding, advisory?: AgentAdvisoryReceipt): Promise<void> => {
    findings.push(finding);
    resultById.set(finding.runtimeId, finding);
    if (advisory) receipts.set(finding.runtimeId, advisory);
    await options.onFinding?.(finding, findings, advisory);
  };

  for (const spec of specs.slice(resumed.length)) {
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
        !['LIVE_PROVIDER_EXECUTED_UNCERTIFIED',
          'HISTORICAL_LIVE_PROVIDER_EXECUTED_UNCERTIFIED']
          .includes(resultById.get(dependencyId)?.status || '')
      );
      if (badDependencies.length) {
        finding.status = 'BLOCKED_UPSTREAM';
        finding.failureReason = 'Required upstream live specialist evidence missing: ' + badDependencies.join(', ');
        await publish(finding);
        continue;
      }
    }

    finding.startedAt = new Date().toISOString();
    // On interrupted/ambiguous calls the next model run needs explicit owner consent.
    await options.beforeAgent?.(finding, findings);
    let advisory: AgentAdvisoryReceipt | undefined;
    try {
      const runInput: AgentExecutionInput = options.dependencyAware
        ? {
            ...input,
            // Trusted physical parameters are never overwritten by model context.
            priorAgentOutputs: {
              ...(input.priorAgentOutputs || {}),
              ...advisoryHandoffFromReceipts(spec, receipts)
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
        (output.provider === 'codex_cli' ||
         (output.provider === 'gemini_cli' &&
          output.modelIdentifier === 'gemini-4-hydrogen' &&
          geminiTransferAuthorized())) &&
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
        advisory = advisoryReceiptFromOutput(output);
      }
    } catch (error) {
      finding.status = 'EXECUTION_FAILED';
      finding.failureReason = error instanceof Error ? error.message : 'Unknown execution error';
    }
    await publish(finding, advisory);
  }

  const complete = findings.length === 26 &&
    new Set(findings.map(x => x.canonicalId)).size === 26 &&
    findings.every(x => x.status === 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED');
  return {
    generatedAt: new Date().toISOString(),
    totalAgents: findings.length,
    liveProviderRuns: findings.filter(x => x.status === 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED').length,
    historicalProviderRuns: findings.filter(x => x.status ===
      'HISTORICAL_LIVE_PROVIDER_EXECUTED_UNCERTIFIED').length,
    findings,
    providerOperationalMatrixComplete: complete,
    independentlyEngineeringValidated: false,
    engineeringReleaseApproved: false
  };
}
