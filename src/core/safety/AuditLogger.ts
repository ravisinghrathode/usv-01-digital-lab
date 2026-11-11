import { AuditLogEntry } from '../types/safety.ts';

export class AuditLogger {
  private static instance: AuditLogger;
  private logs: AuditLogEntry[] = [];

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  public log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.logs.push(fullEntry);

    if (fullEntry.severity === 'SAFETY_CRITICAL') {
      console.error(`[SAFETY_CRITICAL AUDIT] Agent: ${fullEntry.agentId || 'SYS'} | Action: ${fullEntry.action}`, fullEntry.details);
    }

    return fullEntry;
  }

  public getLogs(filter?: { severity?: string; agentId?: string; taskId?: string; action?: string }): AuditLogEntry[] {
    let result = [...this.logs];
    if (filter?.severity) {
      result = result.filter(l => l.severity === filter.severity);
    }
    if (filter?.agentId) {
      result = result.filter(l => l.agentId === filter.agentId);
    }
    if (filter?.taskId) {
      result = result.filter(l => l.taskId === filter.taskId);
    }
    if (filter?.action) {
      result = result.filter(l => l.action === filter.action);
    }
    return result;
  }

  public clear(): void {
    this.logs = [];
  }
}
