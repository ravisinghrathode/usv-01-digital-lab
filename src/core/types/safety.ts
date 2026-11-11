export type ApprovalState = 'PENDING' | 'APPROVED' | 'REJECTED';

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
  decidedBy?: string; // Must be 'ENGINEERING_DIRECTOR'
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
