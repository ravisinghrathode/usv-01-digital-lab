import { AgentSpec } from '../types/agent.ts';
import { CryptographicAuditTrail } from '../safety/CryptographicAuditTrail.ts';
import { ECRRecord } from '../../../scripts/governance/ecr-tool.ts';

export interface AgentProposalRequest {
  agentId: string;
  targetSubsystem: string;
  proposedTitle: string;
  description: string;
  reason: string;
  affectedParameters: string[];
  calculationEvidence?: Record<string, any>;
}

export interface GovernanceResponse {
  success: boolean;
  actionTaken: 'PROPOSAL_QUEUED' | 'REJECTED_GOVERNANCE_VIOLATION' | 'GATE_ESCALATED';
  changeId?: string;
  message: string;
}

export class AgentGovernanceBridge {
  private static instance: AgentGovernanceBridge;
  private auditTrail = CryptographicAuditTrail.getInstance();
  private pendingProposals: Map<string, AgentProposalRequest> = new Map();

  private constructor() {}

  public static getInstance(): AgentGovernanceBridge {
    if (!AgentGovernanceBridge.instance) {
      AgentGovernanceBridge.instance = new AgentGovernanceBridge();
    }
    return AgentGovernanceBridge.instance;
  }

  /**
   * Allows an authorized agent (A01-A25) to propose an engineering change.
   * STRICT GOVERNANCE MANDATE: Agents CANNOT approve or merge proposals.
   */
  public submitProposal(proposal: AgentProposalRequest): GovernanceResponse {
    // 1. Validate agent identity conforms to canonical HMEA v0.2
    if (!proposal.agentId || !proposal.agentId.trim()) {
      return {
        success: false,
        actionTaken: 'REJECTED_GOVERNANCE_VIOLATION',
        message: 'Security Violation: Agent ID is missing or invalid.'
      };
    }

    // 2. Reject any attempt by an agent to propose modifying governance or auth directly
    if (proposal.targetSubsystem === 'GOV' || proposal.targetSubsystem === 'AUTH' || proposal.targetSubsystem === 'SAFETY_POLICY') {
      this.auditTrail.appendEntry({
        actor: proposal.agentId,
        role: 'AGENT',
        action: 'SECURITY_GATE_EVALUATED',
        details: {
          violation: 'ATTEMPTED_GOVERNANCE_RULE_OVERRIDE',
          attemptedSubsystem: proposal.targetSubsystem
        }
      });
      return {
        success: false,
        actionTaken: 'REJECTED_GOVERNANCE_VIOLATION',
        message: 'Security Violation: Agents are barred from altering governance, security, or safety policies directly.'
      };
    }

    const changeId = `ECR-AGENT-${Date.now().toString(36).toUpperCase()}-${proposal.agentId.replace(/[^A-Za-z0-9]/g, '')}`;
    this.pendingProposals.set(changeId, proposal);

    // 3. Record in append-only cryptographic audit trail
    this.auditTrail.appendEntry({
      actor: proposal.agentId,
      role: 'AGENT_PROPOSER',
      action: 'CHANGE_REQUEST_CREATED',
      changeId,
      details: {
        title: proposal.proposedTitle,
        subsystem: proposal.targetSubsystem,
        parameters: proposal.affectedParameters
      }
    });

    return {
      success: true,
      actionTaken: 'PROPOSAL_QUEUED',
      changeId,
      message: `Engineering change proposal registered as ${changeId}. Awaiting independent review and Engineering Director authorisation.`
    };
  }

  /**
   * Enforces that an agent CANNOT authorise any change, even if it is the author or reviewer.
   */
  public evaluateAgentAuthorizationAttempt(agentId: string, changeId: string): void {
    this.auditTrail.appendEntry({
      actor: agentId,
      role: 'AGENT',
      action: 'SECURITY_GATE_EVALUATED',
      changeId,
      details: {
        violation: 'AGENT_SELF_APPROVAL_ATTEMPT',
        status: 'BLOCKED'
      }
    });

    throw new Error(
      `Governance Violation: Agent '${agentId}' attempted to authorise change '${changeId}'. ` +
      `Non-Negotiable Principle 5: AI cannot independently authorise its own engineering changes. ` +
      `Human Engineering Director authorisation is mandatory.`
    );
  }

  public getPendingProposal(changeId: string): AgentProposalRequest | undefined {
    return this.pendingProposals.get(changeId);
  }
}
