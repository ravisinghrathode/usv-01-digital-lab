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

/** Binds one approval to an exact analysis payload and a source revision. */
export interface ApprovalEvidenceBinding {
  version: 'USV_GATE_CONTENT_V2';
  sourceSha: string;
  inputSha256: string;
  outputSha256: string;
  nonce: string;
  contentSha256: string;
}

export interface HumanApprovalGate {
  approvalBinding: ApprovalEvidenceBinding;
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
