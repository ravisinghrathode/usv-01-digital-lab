import crypto from 'node:crypto';
import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ToolRegistry } from '../tools/ToolRegistry.ts';
import type { AgentSpec } from '../types/agent.ts';
import {
  runSubscriptionCli,
  type PilotRequest,
  type PilotResult
} from './SubscriptionCliAdapter.ts';
import {
  MissionControlStore,
  type MissionTaskRecord,
  type MissionTaskState
} from './MissionControlStore.ts';

export interface MissionControlTaskInput {
  taskId: string;
  specialistAgentId: string;
  objective: string;
  requirements: string[];
  parameters: Record<string, unknown>;
  context?: Record<string, unknown>;
  commitSha: string;
  workingDirectory: string;
  safetyCritical?: boolean;
  maxReviewCycles?: number;
}

export interface DeterministicEvidence {
  toolName: string;
  verified: boolean;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  error?: string;
}

export interface ReviewerDecision {
  decision: 'APPROVE' | 'REQUEST_CHANGES' | 'BLOCK';
  summary: string;
  findings: string[];
}

export interface MissionEvidenceManifest {
  schemaVersion: 1;
  taskId: string;
  specialistAgentId: string;
  specialistCanonicalId: string;
  commitSha: string;
  objectiveDigest: string;
  generatedAt: string;
  orchestrator: {
    provider: 'claude-subscription-cli';
    outputDigest: string;
    plan: Record<string, unknown>;
  };
  deterministicEvidence: DeterministicEvidence[];
  worker: {
    provider: 'gemini-antigravity-subscription-cli';
    cycle: number;
    outputDigest: string;
    output: Record<string, unknown>;
  };
  reviewer: {
    provider: 'openai-codex-chatgpt-subscription-cli';
    cycle: number;
    outputDigest: string;
    decision: ReviewerDecision;
  };
  humanApprovalSatisfied: false;
}

export interface MissionControlResult {
  state: MissionTaskState;
  taskId: string;
  agentId: string;
  reviewCycles: number;
  manifest?: MissionEvidenceManifest;
  blocker?: string;
}

export type MissionCliRunner = (input: PilotRequest) => Promise<PilotResult>;

function digest(value: unknown): string {
  return crypto.createHash('sha256').update(
    typeof value === 'string' ? value : JSON.stringify(value)
  ).digest('hex');
}

function tryParseJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return undefined; }
}

/**
 * Unwrap provider envelopes without depending on one vendor's JSON shape.
 * The payload itself still has to pass the USV specialist/reviewer schema.
 */
export function extractStructuredJson(raw: string): Record<string, unknown> {
  const direct = tryParseJson(raw.trim());
  const queue: unknown[] = direct === undefined ? [raw] : [direct];
  const seen = new Set<unknown>();

  while (queue.length) {
    const current = queue.shift();
    if (current === undefined || current === null || seen.has(current)) continue;
    seen.add(current);

    if (typeof current === 'string') {
      const clean = current.trim()
        .replace(/^\`\`\`(?:json)?\s*/i, '')
        .replace(/\s*\`\`\`$/, '');
      const parsed = tryParseJson(clean);
      if (parsed !== undefined) queue.push(parsed);
      continue;
    }

    if (typeof current === 'object' && !Array.isArray(current)) {
      const object = current as Record<string, unknown>;
      if (
        'decision' in object ||
        'plan' in object ||
        'disciplineSummary' in object ||
        'structured_output' in object
      ) {
        if ('structured_output' in object && object.structured_output && typeof object.structured_output === 'object') {
          return object.structured_output as Record<string, unknown>;
        }
        return object;
      }
      for (const key of ['response', 'result', 'content', 'text', 'message', 'output']) {
        if (key in object) queue.push(object[key]);
      }
    }
  }
  throw new Error('CLI output did not contain a parseable structured JSON object');
}

function requireCompleted(result: PilotResult, role: string): void {
  if (result.status !== 'COMPLETED') {
    throw new Error(
      `${role} unavailable or failed (status=${result.status}, exit=${String(result.exitCode)}): ${result.stderr.slice(0, 600)}`
    );
  }
}

function parseReviewerDecision(raw: string): ReviewerDecision {
  const parsed = extractStructuredJson(raw);
  const decision = parsed.decision;
  const findings = parsed.findings;
  if (decision !== 'APPROVE' && decision !== 'REQUEST_CHANGES' && decision !== 'BLOCK') {
    throw new Error('Reviewer returned invalid decision');
  }
  if (!Array.isArray(findings) || findings.some(item => typeof item !== 'string')) {
    throw new Error('Reviewer findings must be an array of strings');
  }
  return {
    decision,
    findings: findings as string[],
    summary: typeof parsed.summary === 'string' ? parsed.summary : ''
  };
}

function baseTaskRecord(input: MissionControlTaskInput): MissionTaskRecord {
  const now = new Date().toISOString();
  return {
    taskId: input.taskId,
    agentId: input.specialistAgentId,
    objective: input.objective,
    state: 'PENDING',
    commitSha: input.commitSha,
    createdAt: now,
    updatedAt: now,
    reviewCycle: 0
  };
}

export class MissionControlCoordinator {
  private readonly registry = AgentRegistry.getInstance();
  private readonly tools = ToolRegistry.getInstance();

  constructor(
    private readonly store: MissionControlStore,
    private readonly cliRunner: MissionCliRunner = runSubscriptionCli
  ) {}

  private async transition(taskId: string, state: MissionTaskState, extras: Record<string, unknown> = {}): Promise<void> {
    await this.store.updateTask(taskId, { state, ...extras } as any);
  }

  private buildOrchestratorPrompt(spec: AgentSpec, input: MissionControlTaskInput): string {
    return [
      'You are the USV-01 Chief Orchestrator. You have planning authority only, never approval authority.',
      'Preserve the existing specialist agent mandate and deterministic tool requirements.',
      `Specialist: ${spec.id} / ${spec.canonicalId} — ${spec.name}`,
      `Objective: ${input.objective}`,
      `Requirements: ${JSON.stringify(input.requirements)}`,
      `Parameters: ${JSON.stringify(input.parameters)}`,
      `Context: ${JSON.stringify(input.context || {})}`,
      `Commit SHA: ${input.commitSha}`,
      'Return ONLY JSON: {"plan":{"steps":["..."],"dependencies":["..."],"acceptanceCriteria":["..."],"risks":["..."]}}.',
      'Do not invent vessel values. Unknowns remain TBD. Do not claim human approval.'
    ].join('\n');
  }

  private async executeDeterministicTools(spec: AgentSpec, input: MissionControlTaskInput): Promise<DeterministicEvidence[]> {
    const evidence: DeterministicEvidence[] = [];
    for (const toolName of spec.verificationCriteria.mandatoryDeterministicTools) {
      if (!spec.permittedTools.includes(toolName) || !spec.executionPermissions.includes('CALCULATION_EXEC')) {
        evidence.push({
          toolName,
          verified: false,
          inputs: input.parameters,
          outputs: {},
          error: 'Specialist lacks permission for required deterministic tool'
        });
        continue;
      }

      const result = await this.tools.executeTool(toolName, input.parameters, spec.executionPermissions);
      evidence.push({
        toolName,
        verified: !!result.success,
        inputs: result.input || {},
        outputs: result.output || {},
        error: result.success ? undefined : result.error
      });
    }
    return evidence;
  }

  private buildWorkerPrompt(
    spec: AgentSpec,
    input: MissionControlTaskInput,
    plan: Record<string, unknown>,
    deterministicEvidence: DeterministicEvidence[],
    priorFindings: string[]
  ): string {
    return [
      `Act as the implementation worker for existing USV specialist ${spec.id} (${spec.name}).`,
      spec.systemInstructions,
      'The specialist role, permissions, and verification criteria are authoritative; you do not replace the specialist.',
      `Objective: ${input.objective}`,
      `Requirements: ${JSON.stringify(input.requirements)}`,
      `Orchestrator plan: ${JSON.stringify(plan)}`,
      `Parameters: ${JSON.stringify(input.parameters)}`,
      `Deterministic tool evidence: ${JSON.stringify(deterministicEvidence)}`,
      priorFindings.length ? `Prior reviewer findings to correct: ${JSON.stringify(priorFindings)}` : '',
      'Return ONLY JSON matching this shape exactly:',
      '{"disciplineSummary":"string","keyMetrics":{},"designDecisions":[],"assumptions":[],"openTbdItems":[],"requiresDirectorApproval":false,"approvalRationale":"optional string"}',
      'Assumptions entries must contain id, category, description, sourceReference, impactIfViolated, isBaseline.',
      'Do not invent calculations, standards, tests, dimensions, approvals, or evidence. Unknowns must be TBD.'
    ].filter(Boolean).join('\n');
  }

  private buildReviewerPrompt(
    spec: AgentSpec,
    input: MissionControlTaskInput,
    plan: Record<string, unknown>,
    deterministicEvidence: DeterministicEvidence[],
    workerOutput: Record<string, unknown>
  ): string {
    return [
      'You are the independent USV technical reviewer. You are not the worker and cannot grant human approval.',
      `Review specialist: ${spec.id} / ${spec.canonicalId} — ${spec.name}`,
      `Original objective: ${input.objective}`,
      `Original requirements: ${JSON.stringify(input.requirements)}`,
      `Commit SHA under review: ${input.commitSha}`,
      `Orchestrator plan: ${JSON.stringify(plan)}`,
      `Deterministic evidence: ${JSON.stringify(deterministicEvidence)}`,
      `Worker output: ${JSON.stringify(workerOutput)}`,
      `Specialist verification criteria: ${JSON.stringify(spec.verificationCriteria)}`,
      'Reject stale, missing, failed, fabricated, internally inconsistent, or untraceable evidence.',
      'Return ONLY JSON: {"decision":"APPROVE|REQUEST_CHANGES|BLOCK","summary":"string","findings":["string"]}.',
      'APPROVE means technically acceptable for the next governance stage only; it is never a human Project Lead approval.'
    ].join('\n');
  }

  async execute(input: MissionControlTaskInput): Promise<MissionControlResult> {
    if (!/^[0-9a-f]{7,64}$/i.test(input.commitSha)) {
      return { state: 'FAILED', taskId: input.taskId, agentId: input.specialistAgentId, reviewCycles: 0, blocker: 'Invalid commit SHA' };
    }

    const spec = this.registry.requireAgent(input.specialistAgentId);
    const maxReviewCycles = Math.min(Math.max(input.maxReviewCycles ?? 2, 1), 3);
    await this.store.createTask(baseTaskRecord(input));

    try {
      await this.transition(input.taskId, 'ORCHESTRATING');
      const orchestration = await this.cliRunner({
        role: 'orchestrator',
        taskId: input.taskId,
        agentId: 'LEAD-SYS-01',
        prompt: this.buildOrchestratorPrompt(spec, input),
        workingDirectory: input.workingDirectory
      });
      requireCompleted(orchestration, 'Claude orchestrator');
      const planEnvelope = extractStructuredJson(orchestration.stdout);
      const plan = (planEnvelope.plan && typeof planEnvelope.plan === 'object')
        ? planEnvelope.plan as Record<string, unknown>
        : planEnvelope;

      await this.transition(input.taskId, 'EXECUTING');
      const deterministicEvidence = await this.executeDeterministicTools(spec, input);
      const failedRequiredTool = deterministicEvidence.find(item => !item.verified);
      if (failedRequiredTool) {
        const blocker = `Mandatory deterministic tool '${failedRequiredTool.toolName}' failed: ${failedRequiredTool.error || 'unknown error'}`;
        await this.transition(input.taskId, 'BLOCKED', { lastError: blocker });
        return { state: 'BLOCKED', taskId: input.taskId, agentId: spec.id, reviewCycles: 0, blocker };
      }

      let priorFindings: string[] = [];
      for (let cycle = 1; cycle <= maxReviewCycles; cycle++) {
        await this.transition(input.taskId, 'EXECUTING', { reviewCycle: cycle });
        const worker = await this.cliRunner({
          role: 'worker',
          taskId: input.taskId,
          agentId: spec.id,
          prompt: this.buildWorkerPrompt(spec, input, plan, deterministicEvidence, priorFindings),
          workingDirectory: input.workingDirectory
        });
        requireCompleted(worker, 'Gemini worker');

        const workerOutput = extractStructuredJson(worker.stdout);
        const validatedWorker = spec.outputSchema.safeParse(workerOutput);
        if (!validatedWorker.success) {
          priorFindings = validatedWorker.error.issues.map(issue =>
            `Worker output schema: ${issue.path.join('.')}: ${issue.message}`
          );
          if (cycle === maxReviewCycles) {
            const blocker = priorFindings.join('; ');
            await this.transition(input.taskId, 'BLOCKED', { lastError: blocker, reviewCycle: cycle });
            return { state: 'BLOCKED', taskId: input.taskId, agentId: spec.id, reviewCycles: cycle, blocker };
          }
          continue;
        }

        await this.transition(input.taskId, 'REVIEWING', { reviewCycle: cycle });
        const reviewer = await this.cliRunner({
          role: 'reviewer',
          taskId: input.taskId,
          agentId: 'INDEP-REV-23',
          prompt: this.buildReviewerPrompt(spec, input, plan, deterministicEvidence, validatedWorker.data),
          workingDirectory: input.workingDirectory
        });
        requireCompleted(reviewer, 'GPT reviewer');

        const review = parseReviewerDecision(reviewer.stdout);
        const manifest: MissionEvidenceManifest = {
          schemaVersion: 1,
          taskId: input.taskId,
          specialistAgentId: spec.id,
          specialistCanonicalId: spec.canonicalId,
          commitSha: input.commitSha,
          objectiveDigest: digest(input.objective),
          generatedAt: new Date().toISOString(),
          orchestrator: {
            provider: 'claude-subscription-cli',
            outputDigest: digest(orchestration.stdout),
            plan
          },
          deterministicEvidence,
          worker: {
            provider: 'gemini-antigravity-subscription-cli',
            cycle,
            outputDigest: digest(validatedWorker.data),
            output: validatedWorker.data
          },
          reviewer: {
            provider: 'openai-codex-chatgpt-subscription-cli',
            cycle,
            outputDigest: digest(review),
            decision: review
          },
          humanApprovalSatisfied: false
        };

        if (review.decision === 'APPROVE') {
          const requiresHuman = !!input.safetyCritical || !!spec.verificationCriteria.independentReviewRequired;
          const state: MissionTaskState = requiresHuman ? 'READY_FOR_HUMAN_REVIEW' : 'TECHNICALLY_REVIEWED';
          await this.transition(input.taskId, state, { evidenceManifest: manifest, reviewCycle: cycle });
          return { state, taskId: input.taskId, agentId: spec.id, reviewCycles: cycle, manifest };
        }

        priorFindings = review.findings.length ? review.findings : [review.summary || 'Reviewer requested changes'];
        if (review.decision === 'BLOCK' || cycle === maxReviewCycles) {
          const blocker = priorFindings.join('; ');
          await this.transition(input.taskId, 'BLOCKED', { evidenceManifest: manifest, lastError: blocker, reviewCycle: cycle });
          return { state: 'BLOCKED', taskId: input.taskId, agentId: spec.id, reviewCycles: cycle, manifest, blocker };
        }
      }

      throw new Error('Mission Control review loop ended unexpectedly');
    } catch (err: any) {
      const blocker = err?.message || String(err);
      await this.transition(input.taskId, 'FAILED', { lastError: blocker }).catch(() => {});
      return {
        state: 'FAILED',
        taskId: input.taskId,
        agentId: input.specialistAgentId,
        reviewCycles: (await this.store.getTask(input.taskId))?.reviewCycle || 0,
        blocker
      };
    }
  }
}
