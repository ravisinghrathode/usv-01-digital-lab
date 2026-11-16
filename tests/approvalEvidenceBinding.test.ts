import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ApprovalGateManager } from '../src/core/safety/HumanApprovalGate.ts';
import { sha256Evidence, generateBoundApproverSignature, verifyBoundApproverSignature, isGateContentIntact } from '../src/core/safety/ApproverSigner.ts';
import { CentralOrchestrator } from '../src/core/orchestrator/CentralOrchestrator.ts';
import { ExecutionEngine } from '../src/core/engine/ExecutionEngine.ts';
import type { AgentExecutionOutput } from '../src/core/types/agent.ts';

const gates = ApprovalGateManager.getInstance();
const orchestrator = CentralOrchestrator.getInstance();
const SHA = 'b'.repeat(40);
function gate() {
  return gates.createGate({
    taskId: 'V2-ADVERSARIAL', agentId: 'REQ-TRC-02', title: 'Synthetic V2 test',
    description: 'No real vessel engineering', safetyImplication: 'No vessel release',
    proposedChanges: { metrics: { gmMeters: 0.5, source: 'SYNTHETIC' } }
  }, { sourceSha: SHA, input: { parameters: { massKg: 25 } }, output: { status: 'UNVERIFIED' } });
}
function sign(g: ReturnType<typeof gate>, at = new Date().toISOString()) {
  return {
    userId: 'test-director-v2', userName: 'Synthetic Director', role: 'ENGINEERING_DIRECTOR',
    authenticatedAt: at,
    tokenSignature: generateBoundApproverSignature(g, 'APPROVED', 'test-director-v2', 'ENGINEERING_DIRECTOR', at)
  };
}
describe('P0 gate evidence/content/source binding', () => {
  beforeEach(() => { vi.restoreAllMocks(); orchestrator.clearTasks(); });
  it('canonicalizes key ordering with stable SHA-256 and rejects NaN', () => {
    expect(sha256Evidence({ z: 2, a: 1 })).toBe(sha256Evidence({ a: 1, z: 2 }));
    expect(() => sha256Evidence({ bad: NaN })).toThrow(/Non-finite/);
    expect(sha256Evidence(null)).toBe('74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b');
  });
  it('rejects changed output, changed source, changed nonce and gate-substitution', () => {
    const g = gate();
    const identity = sign(g);
    expect(verifyBoundApproverSignature(g, 'APPROVED', identity)).toBe(true);
    for (const change of [
      (copy: typeof g) => { copy.proposedChanges.metrics.gmMeters = 99; },
      (copy: typeof g) => { copy.approvalBinding.outputSha256 = '0'.repeat(64); },
      (copy: typeof g) => { copy.approvalBinding.sourceSha = 'c'.repeat(40); },
      (copy: typeof g) => { copy.approvalBinding.nonce = '0'.repeat(32); },
      (copy: typeof g) => { copy.id = 'GATE-SUBSTITUTED'; }
    ]) {
      const copy = structuredClone(g);
      change(copy);
      expect(isGateContentIntact(copy)).toBe(false);
      expect(verifyBoundApproverSignature(copy, 'APPROVED', identity)).toBe(false);
    }
    expect(verifyBoundApproverSignature(g, 'REJECTED', identity)).toBe(false);
  });
  it('rejects an expired signature and duplicate/replayed Director approval', () => {
    const g = gate();
    const stale = sign(g, new Date(Date.now()-10*60_000).toISOString());
    expect(verifyBoundApproverSignature(g, 'APPROVED', stale)).toBe(false);
    expect(() => gates.evaluateDecision(g.id, 'APPROVED', 'expired', stale))
      .toThrow(/signature verification failed/i);
    const identity = sign(g);
    expect(gates.evaluateDecision(g.id, 'APPROVED', 'Synthetic-only', identity).state).toBe('APPROVED');
    expect(() => gates.evaluateDecision(g.id, 'APPROVED', 'replayed', identity))
      .toThrow(/already finalized/);
  });
  it('blocks orchestrated evidence that is not pinned to a 40-hex source SHA', async () => {
    vi.spyOn(ExecutionEngine.getInstance(), 'executeAgent').mockImplementation(async (agentId,input):Promise<AgentExecutionOutput> => ({
      agentId, taskId: input.taskId, timestamp: new Date().toISOString(),
      status: 'SUCCESS', evidenceValid: false, verificationStatus: 'UNVERIFIED',
      data: { unverifiedStudy: true }, assumptions: [], deterministicToolEvidence: [],
      openTbdItems: ['Reference not available'], warnings: [], recommendations: [],
      requiresDirectorApproval: true
    }));
    orchestrator.registerTask({
      id:'V2-NO-SHA', title:'Synthetic', description:'Synthetic analysis only',
      assignedAgentId:'REQ-TRC-02', discipline:'SYS', priority:'HIGH',
      dependencies:[], input:{taskId:'V2-NO-SHA',context:{},parameters:{}},
      status:'PENDING',createdAt:new Date().toISOString(),safetyCritical:true
    });
    await orchestrator.executeWorkflow();
    const gateId = orchestrator.getTask('V2-NO-SHA')!.approvalGateId!;
    const pending = gates.getGate(gateId)!;
    expect(pending.approvalBinding.sourceSha).toBe('UNPINNED_RESEARCH_ONLY');
    expect(pending.approvalBinding.inputSha256)
      .toBe(orchestrator.getTask('V2-NO-SHA')!.executionInputSha256);
    gates.evaluateDecision(gateId, 'APPROVED', 'Research only', sign(pending));
    expect(orchestrator.getTask('V2-NO-SHA')!.status).toBe('WAITING_HUMAN_APPROVAL');
    expect(() => orchestrator.resolveGateDecision(gateId, 'APPROVED'))
      .toThrow(/pinned task\/input\/output/);
  });
});
