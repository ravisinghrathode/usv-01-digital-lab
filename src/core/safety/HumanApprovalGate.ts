import { HumanApprovalGate } from '../types/safety.ts';
import { AuditLogger } from './AuditLogger.ts';

export class ApprovalGateManager {
  private static instance: ApprovalGateManager;
  private gates: Map<string, HumanApprovalGate> = new Map();
  private auditLogger = AuditLogger.getInstance();

  private constructor() {}

  public static getInstance(): ApprovalGateManager {
    if (!ApprovalGateManager.instance) {
      ApprovalGateManager.instance = new ApprovalGateManager();
    }
    return ApprovalGateManager.instance;
  }

  public createGate(gateData: Omit<HumanApprovalGate, 'id' | 'state' | 'requestedAt'>): HumanApprovalGate {
    const id = `GATE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const gate: HumanApprovalGate = {
      id,
      ...gateData,
      state: 'PENDING',
      requestedAt: new Date().toISOString()
    };

    this.gates.set(id, gate);

    this.auditLogger.log({
      severity: 'SAFETY_CRITICAL',
      agentId: gate.agentId,
      taskId: gate.taskId,
      action: 'APPROVAL_GATE_REQUESTED',
      details: {
        gateId: id,
        title: gate.title,
        safetyImplication: gate.safetyImplication
      }
    });

    return gate;
  }

  public getGate(id: string): HumanApprovalGate | undefined {
    return this.gates.get(id);
  }

  public getAllGates(): HumanApprovalGate[] {
    return Array.from(this.gates.values());
  }

  public getPendingGates(): HumanApprovalGate[] {
    return this.getAllGates().filter(g => g.state === 'PENDING');
  }

  /**
   * Evaluates human decision. Only the authenticated Engineering Director can approve or reject.
   */
  public evaluateDecision(
    gateId: string,
    decision: 'APPROVED' | 'REJECTED',
    directorNotes: string,
    approverRole: string = 'ENGINEERING_DIRECTOR'
  ): HumanApprovalGate {
    const gate = this.gates.get(gateId);
    if (!gate) {
      throw new Error(`Approval gate '${gateId}' not found.`);
    }

    if (gate.state !== 'PENDING') {
      throw new Error(`Approval gate '${gateId}' is already finalized with status: ${gate.state}`);
    }

    if (approverRole !== 'ENGINEERING_DIRECTOR') {
      this.auditLogger.log({
        severity: 'SAFETY_CRITICAL',
        agentId: gate.agentId,
        taskId: gate.taskId,
        action: 'UNAUTHORIZED_APPROVAL_ATTEMPT',
        details: { attemptedRole: approverRole, gateId }
      });
      throw new Error(`Security Violation: Only 'ENGINEERING_DIRECTOR' has authority to sign off safety-critical gates.`);
    }

    gate.state = decision;
    gate.decidedAt = new Date().toISOString();
    gate.decidedBy = approverRole;
    gate.directorNotes = directorNotes;

    this.auditLogger.log({
      severity: 'APPROVAL_ACTION',
      agentId: gate.agentId,
      taskId: gate.taskId,
      action: `GATE_${decision}`,
      details: {
        gateId,
        decision,
        decidedBy: approverRole,
        notes: directorNotes
      }
    });

    return gate;
  }
}
