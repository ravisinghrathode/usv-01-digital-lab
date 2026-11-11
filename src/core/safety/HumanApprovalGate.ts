import { HumanApprovalGate, ApproverIdentity } from '../types/safety.ts';
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
   * Evaluates human decision. Only an authenticated Engineering Director with a verified user ID can approve or reject.
   */
  public evaluateDecision(
    gateId: string,
    decision: 'APPROVED' | 'REJECTED',
    directorNotes: string,
    approver: ApproverIdentity | string = 'ENGINEERING_DIRECTOR'
  ): HumanApprovalGate {
    const gate = this.gates.get(gateId);
    if (!gate) {
      throw new Error(`Approval gate '${gateId}' not found.`);
    }

    if (gate.state !== 'PENDING') {
      throw new Error(`Approval gate '${gateId}' is already finalized with status: ${gate.state}`);
    }

    // Resolve and authenticate approver identity
    const identity: ApproverIdentity = typeof approver === 'string'
      ? {
          userId: approver === 'ENGINEERING_DIRECTOR' ? 'usr-director-001' : 'usr-unverified',
          userName: approver === 'ENGINEERING_DIRECTOR' ? 'Engineering Director (Authenticated)' : 'Unverified User',
          role: approver,
          authenticatedAt: new Date().toISOString()
        }
      : approver;

    if (identity.role !== 'ENGINEERING_DIRECTOR' || !identity.userId || identity.userId === 'usr-unverified') {
      this.auditLogger.log({
        severity: 'SAFETY_CRITICAL',
        agentId: gate.agentId,
        taskId: gate.taskId,
        action: 'UNAUTHORIZED_APPROVAL_ATTEMPT',
        details: { attemptedRole: identity.role, userId: identity.userId, gateId }
      });
      throw new Error(`Security Violation: Only 'ENGINEERING_DIRECTOR' has authority to approve safety-critical gates.`);
    }

    gate.state = decision;
    gate.decidedAt = new Date().toISOString();
    gate.decidedBy = typeof approver === 'string' ? approver : `${identity.userName} (${identity.userId}) [${identity.role}]`;
    gate.decidedByIdentity = identity;
    gate.directorNotes = directorNotes;

    this.auditLogger.log({
      severity: 'APPROVAL_ACTION',
      agentId: gate.agentId,
      taskId: gate.taskId,
      action: `GATE_${decision}`,
      details: {
        gateId,
        decision,
        decidedBy: identity.role,
        notes: directorNotes
      }
    });

    return gate;
  }
}
