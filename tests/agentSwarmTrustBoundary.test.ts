import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyApproverSignature, generateBoundApproverSignature } from '../src/core/safety/ApproverSigner.ts';
import { ApprovalGateManager } from '../src/core/safety/HumanApprovalGate.ts';
import { CentralOrchestrator } from '../src/core/orchestrator/CentralOrchestrator.ts';
import { ExecutionEngine } from '../src/core/engine/ExecutionEngine.ts';
import type { EngineeringTask } from '../src/core/types/orchestrator.ts';
import type { AgentExecutionOutput } from '../src/core/types/agent.ts';

const gates = ApprovalGateManager.getInstance();
const orchestrator = CentralOrchestrator.getInstance();
const timestamp = new Date().toISOString();
const SYNTHETIC_SHA = 'a'.repeat(40);

function createGate() {
  return gates.createGate({
    taskId: 'SWARM-ADVERSARIAL-TEST',
    agentId: 'REQ-TRC-02',
    title: 'Synthetic verification gate',
    description: 'Unit test only, not naval engineering evidence',
    safetyImplication: 'No certified engineering release',
    proposedChanges: { revisions: { safetyEvidence: 'UNVERIFIED' } }
  });
}

function task(id: string, dependencies: string[] = [], safetyCritical = false): EngineeringTask {
  return {
    id, title: id, description: 'Adversarial synthetic workflow only',
    assignedAgentId: 'REQ-TRC-02', discipline: 'SYS',
    priority: 'HIGH', dependencies,
    input: { taskId: id, parameters: { inputRevision: 'UNVERIFIED' }, context: {} },
    status: 'PENDING', createdAt: timestamp, safetyCritical
  };
}

function output(agentId: string, taskId: string): AgentExecutionOutput {
  return {
    agentId, taskId, timestamp, status: 'SUCCESS',
    verificationStatus: 'UNVERIFIED', evidenceValid: false,
    data: { draftOnly: true }, assumptions: [], deterministicToolEvidence: [],
    openTbdItems: ['Independent reference missing'],
    warnings: ['Synthetic task only'], recommendations: [], requiresDirectorApproval: true
  };
}

describe('26-agent control-plane adversarial trust-boundary tests', () => {
  beforeEach(() => {
    orchestrator.clearTasks();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('rejects a fabricated serverVerifiedSignature even when it equals the supplied token', () => {
    const identity = {
      userId: 'test-director', userName: 'Synthetic director',
      role: 'ENGINEERING_DIRECTOR', authenticatedAt: timestamp,
      tokenSignature: 'f'.repeat(64), serverVerifiedSignature: 'f'.repeat(64)
    };
    expect(verifyApproverSignature('FAKE-GATE', 'APPROVED', identity)).toBe(false);
    const gate = createGate();
    expect(() => gates.evaluateDecision(gate.id, 'APPROVED', 'Forger self-attests', identity))
      .toThrow(/Cryptographic signature verification failed/);
    expect(gates.getGate(gate.id)?.state).toBe('PENDING');
  });

  it('keeps gate and nested proposed changes private from creation, reads and listeners', () => {
    const gate = createGate();
    gate.state = 'APPROVED';
    gate.proposedChanges.revisions.safetyEvidence = 'FAKE_CERTIFIED';
    const fromGet = gates.getGate(gate.id)!;
    fromGet.state = 'APPROVED';
    fromGet.proposedChanges.revisions.safetyEvidence = 'FAKE_CERTIFIED';
    const fromList = gates.getAllGates().find(g => g.id === gate.id)!;
    fromList.state = 'APPROVED';
    expect(gates.getGate(gate.id)?.state).toBe('PENDING');
    expect(gates.getGate(gate.id)?.proposedChanges.revisions.safetyEvidence).toBe('UNVERIFIED');

    const remove = gates.onDecision(receipt => {
      if (receipt.id === gate.id) {
        receipt.state = 'PENDING';
        receipt.decidedByIdentity!.role = 'UNAUTHORIZED';
      }
    });
    try {
      const signed = generateBoundApproverSignature(gates.getGate(gate.id)!, 'APPROVED', 'test-director', 'ENGINEERING_DIRECTOR', timestamp);
      const supplied = {
        userId: 'test-director', userName: 'Synthetic director', role: 'ENGINEERING_DIRECTOR',
        authenticatedAt: timestamp, tokenSignature: signed
      };
      const approved = gates.evaluateDecision(gate.id, 'APPROVED', 'Synthetic test decision', supplied);
      approved.state = 'PENDING';
      supplied.userId = 'tampered-after-signing';
      expect(gates.getGate(gate.id)?.state).toBe('APPROVED');
      expect(gates.getGate(gate.id)?.decidedByIdentity?.role).toBe('ENGINEERING_DIRECTOR');
      expect(gates.getGate(gate.id)?.decidedByIdentity?.userId).toBe('test-director');
    } finally {
      remove();
    }
  });

  it('does not let caller-owned task objects or task snapshots unlock dependencies', async () => {
    const execute = vi.spyOn(ExecutionEngine.getInstance(), 'executeAgent')
      .mockImplementation(async (agentId, input) => output(agentId, input.taskId));
    const upstream = task('SWARM-UP', [], true);
    orchestrator.registerTask(upstream);
    upstream.input.parameters.inputRevision = 'MUTATED_AFTER_REGISTRATION';
    orchestrator.registerTask(task('SWARM-DOWN', ['SWARM-UP']));

    const first = await orchestrator.executeWorkflow(SYNTHETIC_SHA);
    expect(first.waitingApproval).toBe(1);
    expect(orchestrator.getTask('SWARM-UP')?.input.parameters.inputRevision).toBe('UNVERIFIED');
    const viewed = orchestrator.getTask('SWARM-UP')!;
    viewed.status = 'COMPLETED';
    viewed.output!.status = 'SUCCESS';
    orchestrator.getAllTasks().find(t => t.id === 'SWARM-UP')!.status = 'COMPLETED';
    const gateId = orchestrator.getTask('SWARM-UP')!.approvalGateId!;
    const forgedView = gates.getGate(gateId)!;
    forgedView.state = 'APPROVED';
    forgedView.decidedByIdentity = {
      userId: 'attacker', userName: 'Attacker', role: 'ENGINEERING_DIRECTOR',
      authenticatedAt: timestamp, tokenSignature: 'f'.repeat(64), serverVerifiedSignature: 'f'.repeat(64)
    };
    expect(orchestrator.getTask('SWARM-UP')?.status).toBe('WAITING_HUMAN_APPROVAL');
    await orchestrator.executeWorkflow(SYNTHETIC_SHA);
    expect(orchestrator.getTask('SWARM-DOWN')?.status).toBe('BLOCKED');
    expect(execute).toHaveBeenCalledTimes(1);

    const signature = generateBoundApproverSignature(gates.getGate(gateId)!, 'APPROVED', 'test-director', 'ENGINEERING_DIRECTOR', timestamp);
    gates.evaluateDecision(gateId, 'APPROVED', 'Synthetic approval only', {
      userId: 'test-director', userName: 'Synthetic director',
      role: 'ENGINEERING_DIRECTOR', authenticatedAt: timestamp, tokenSignature: signature
    });
    await orchestrator.executeWorkflow(SYNTHETIC_SHA);
    expect(orchestrator.getTask('SWARM-DOWN')?.status).toBe('COMPLETED');
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('does not allow inter-agent message callers or readers to rewrite bus evidence', () => {
    const input = {
      senderAgentId: 'REQ-TRC-02', recipientAgentId: 'CONOPS-03',
      channel: 'DATA_EXCHANGE' as const, payload: { content: { authority: 'UNVERIFIED' } }
    };
    const delivered = orchestrator.sendMessage(input);
    input.payload.content.authority = 'APPROVED';
    delivered.payload.content.authority = 'APPROVED';
    const inbox = orchestrator.getMessages({ recipientAgentId: 'CONOPS-03' });
    const own = inbox.find(x => x.id === delivered.id)!;
    expect(own.payload.content.authority).toBe('UNVERIFIED');
    own.payload.content.authority = 'FAKE';
    expect(orchestrator.getMessages().find(x => x.id === delivered.id)?.payload.content.authority)
      .toBe('UNVERIFIED');
  });
});
