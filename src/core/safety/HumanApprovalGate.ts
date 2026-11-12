import type { HumanApprovalGate, ApproverIdentity } from '../types/safety.ts';
import { AuditLogger } from './AuditLogger.ts';
import { verifyApproverSignature } from './ApproverSigner.ts';

export class ApprovalGateManager {
  private static instance: ApprovalGateManager;
  private gates: Map<string, HumanApprovalGate> = new Map();
  private auditLogger = AuditLogger.getInstance();
  private decisionListeners: Array<(gate: HumanApprovalGate) => void> = [];

  private constructor() {}

  public static getInstance(): ApprovalGateManager {
    if (!ApprovalGateManager.instance) {
      ApprovalGateManager.instance = new ApprovalGateManager();
    }
    return ApprovalGateManager.instance;
  }

  public onDecision(listener: (gate: HumanApprovalGate) => void): () => void {
    this.decisionListeners.push(listener);
    return () => {
      this.decisionListeners = this.decisionListeners.filter(l => l !== listener);
    };
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
   * Evaluates human decision. Only an authenticated Engineering Director with a verified user ID
   * and valid cryptographic signature can approve or reject.
   */
  public evaluateDecision(
    gateId: string,
    decision: 'APPROVED' | 'REJECTED',
    directorNotes: string,
    approver: ApproverIdentity
  ): HumanApprovalGate {
    const gate = this.gates.get(gateId);
    if (!gate) {
      throw new Error(`Approval gate '${gateId}' not found.`);
    }

    if (gate.state !== 'PENDING') {
      throw new Error(`Approval gate '${gateId}' is already finalized with status: ${gate.state}`);
    }

    if (!approver || typeof approver !== 'object') {
      this.auditLogger.log({
        severity: 'SAFETY_CRITICAL',
        agentId: gate.agentId,
        taskId: gate.taskId,
        action: 'UNAUTHORIZED_APPROVAL_ATTEMPT',
        details: { reason: 'Missing or invalid approver identity object', gateId }
      });
      throw new Error("Security Violation: Approver must provide verified ApproverIdentity object with cryptographic signature.");
    }

    const identity = approver;

    if (identity.role !== 'ENGINEERING_DIRECTOR' || !identity.userId || identity.userId === 'usr-unverified') {
      this.auditLogger.log({
        severity: 'SAFETY_CRITICAL',
        agentId: gate.agentId,
        taskId: gate.taskId,
        action: 'UNAUTHORIZED_APPROVAL_ATTEMPT',
        details: { attemptedRole: identity.role, userId: identity.userId, gateId }
      });
      throw new Error("Security Violation: Only 'ENGINEERING_DIRECTOR' has authority to approve safety-critical gates.");
    }

    // Cryptographic signature verification: binds gateId, decision, and identity
    const isValidSignature = verifyApproverSignature(gateId, decision, identity);
    if (!isValidSignature) {
      this.auditLogger.log({
        severity: 'SAFETY_CRITICAL',
        agentId: gate.agentId,
        taskId: gate.taskId,
        action: 'CRYPTOGRAPHIC_SIGNATURE_VERIFICATION_FAILED',
        details: {
          gateId,
          decision,
          userId: identity.userId,
          role: identity.role,
          authenticatedAt: identity.authenticatedAt
        }
      });
      throw new Error("Security Violation: Cryptographic signature verification failed. Forged, invalid, or expired approval signature.");
    }

    gate.state = decision;
    gate.decidedAt = new Date().toISOString();
    gate.decidedBy = `${identity.userName} (${identity.userId}) [${identity.role}]`;
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
        userId: identity.userId,
        verifiedSignature: true,
        notes: directorNotes
      }
    });

    for (const listener of this.decisionListeners) {
      try {
        listener(gate);
      } catch (err) {
        console.error('ApprovalGateManager listener error:', err);
      }
    }

    return gate;
  }
}

