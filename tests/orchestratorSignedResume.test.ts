import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CentralOrchestrator } from '../src/core/orchestrator/CentralOrchestrator.ts';
import { ExecutionEngine } from '../src/core/engine/ExecutionEngine.ts';
import { ApprovalGateManager } from '../src/core/safety/HumanApprovalGate.ts';
import { generateApproverSignature } from '../src/core/safety/ApproverSigner.ts';
import type { AgentExecutionOutput } from '../src/core/types/agent.ts';
import type { EngineeringTask } from '../src/core/types/orchestrator.ts';

const orchestrator = CentralOrchestrator.getInstance();
const gateManager = ApprovalGateManager.getInstance();

function task(id: string, agentId: string, dependencies: string[] = [], safetyCritical = false): EngineeringTask {
  return {
    id, title: id, description: 'Synthetic state-machine regression; no vessel baseline',
    assignedAgentId: agentId, discipline: 'SYS', priority: 'MEDIUM',
    dependencies, input: { taskId: id, context: {}, parameters: {} },
    status: 'PENDING', createdAt: '2026-11-15T00:00:00Z', safetyCritical
  };
}

function output(agentId: string, taskId: string, needsApproval: boolean): AgentExecutionOutput {
  return {
    agentId, taskId, timestamp: '2026-11-15T00:00:00Z',
    status: needsApproval ? 'NEEDS_HUMAN_APPROVAL' : 'SUCCESS',
    verificationStatus: 'UNVERIFIED', evidenceValid: false,
    data: { syntheticOnly: true }, assumptions: [],
    deterministicToolEvidence: [], openTbdItems: ['Engineering evidence not provided'],
    warnings: ['Synthetic orchestration test output — NOT engineering validation'],
    recommendations: [], requiresDirectorApproval: needsApproval
  };
}

function signedDecision(gateId: string, decision: 'APPROVED' | 'REJECTED'): void {
  const at = '2026-11-15T00:00:00Z';
  gateManager.evaluateDecision(gateId, decision, 'Synthetic unit-test signature only', {
    userId: 'test-director', userName: 'Synthetic Director',
    role: 'ENGINEERING_DIRECTOR', authenticatedAt: at,
    tokenSignature: generateApproverSignature(gateId, decision, 'test-director', 'ENGINEERING_DIRECTOR', at)
  });
}

describe('Governed agent workflow resume and signed approval authority', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    orchestrator.clearTasks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('rejects direct approval resolution while the gate is pending, including the public callback', async () => {
    const execute = vi.spyOn(ExecutionEngine.getInstance(), 'executeAgent')
      .mockImplementation(async (agentId, input) => output(agentId, input.taskId, true));
    orchestrator.registerTask(task('RESUME-PENDING', 'REQ-TRC-02', [], true));
    await orchestrator.executeWorkflow();
    const before = orchestrator.getTask('RESUME-PENDING')!;
    const gateId = before.approvalGateId!;
    expect(gateManager.getGate(gateId)?.state).toBe('PENDING');

    expect(() => orchestrator.resolveGateDecision(gateId, 'APPROVED')).toThrow(/signed, finalized Director/);
    expect(() => orchestrator.handleGateDecision(gateId, 'APPROVED')).toThrow(/signed, finalized Director/);
    expect(orchestrator.getTask('RESUME-PENDING')?.status).toBe('WAITING_HUMAN_APPROVAL');

    // A resumed workflow must not re-run a pending safety analysis or issue duplicate gates.
    const replay = await orchestrator.executeWorkflow();
    expect(replay.waitingApproval).toBe(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(orchestrator.getTask('RESUME-PENDING')?.approvalGateId).toBe(gateId);
  });

  it('resumes only the blocked dependent after a signed decision without replaying completed work', async () => {
    const execute = vi.spyOn(ExecutionEngine.getInstance(), 'executeAgent')
      .mockImplementation(async (agentId, input) => output(agentId, input.taskId, input.taskId === 'RESUME-UP'));

    orchestrator.registerTask(task('RESUME-UP', 'REQ-TRC-02', [], true));
    orchestrator.registerTask(task('RESUME-DOWN', 'CONOPS-03', ['RESUME-UP']));

    const first = await orchestrator.executeWorkflow();
    expect(first.waitingApproval).toBe(1);
    expect(orchestrator.getTask('RESUME-DOWN')?.status).toBe('BLOCKED');
    expect(execute).toHaveBeenCalledTimes(1);

    const gateId = orchestrator.getTask('RESUME-UP')!.approvalGateId!;
    signedDecision(gateId, 'APPROVED');
    expect(orchestrator.getTask('RESUME-UP')?.status).toBe('COMPLETED');

    const resumed = await orchestrator.executeWorkflow();
    expect(resumed.completed).toBe(1);
    expect(orchestrator.getTask('RESUME-DOWN')?.status).toBe('COMPLETED');
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls.map(([, input]) => input.taskId)).toEqual(['RESUME-UP', 'RESUME-DOWN']);
    expect(orchestrator.getTask('RESUME-UP')?.approvalGateId).toBe(gateId);

    await orchestrator.executeWorkflow();
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('preserves a rejected gate as FAILED and blocks its descendants on subsequent runs', async () => {
    const execute = vi.spyOn(ExecutionEngine.getInstance(), 'executeAgent')
      .mockImplementation(async (agentId, input) => output(agentId, input.taskId, true));
    orchestrator.registerTask(task('REJECT-UP', 'REQ-TRC-02', [], true));
    orchestrator.registerTask(task('REJECT-DOWN', 'CONOPS-03', ['REJECT-UP']));
    await orchestrator.executeWorkflow();
    signedDecision(orchestrator.getTask('REJECT-UP')!.approvalGateId!, 'REJECTED');
    expect(orchestrator.getTask('REJECT-UP')?.status).toBe('FAILED');
    await orchestrator.executeWorkflow();
    expect(orchestrator.getTask('REJECT-UP')?.status).toBe('FAILED');
    expect(orchestrator.getTask('REJECT-DOWN')?.status).toBe('BLOCKED');
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
