export type ApprovalState = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApproverIdentity {
  userId: string;
  userName: string;
  role: 'ENGINEERING_DIRECTOR' | 'LEAD_SYSTEMS_ENGINEER' | 'ADMIN' | string;
  tokenSignature?: string;
  tokenOrSignature?: string;
  serverVerifiedSignature?: string;
  authenticatedAt: string;
}

export interface HumanApprovalGate {
  id: string; // e.g. 'GATE-001'
  taskId: string;
  agentId: string;
  title: string;
  description: string;
  safetyImplication: string;
  proposedChanges: Record<string, any>;
  state: ApprovalState;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string; // Authenticated user ID & role
  decidedByIdentity?: ApproverIdentity;
  directorNotes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  severity: 'INFO' | 'WARN' | 'SAFETY_CRITICAL' | 'APPROVAL_ACTION';
  agentId?: string;
  taskId?: string;
  action: string;
  details: Record<string, any>;
  operator?: string;
}
