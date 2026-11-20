import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { AgentExecutionOutput } from '../src/core/types/agent.ts';
import {
  evidenceAdmissionForOutput, evidenceAdmissionForTasks
} from '../src/core/verification/ExecutionEvidenceAdmission.ts';

const reportedSuccess: AgentExecutionOutput = {
  agentId: 'LEAD-SYS-01',
  taskId: 'TASK-REPORT-ONLY',
  timestamp: '2026-11-17T00:00:00.000Z',
  status: 'SUCCESS',
  provider: 'codex_cli',
  providerExecutionMode: 'LIVE_AI_GENERATION',
  verificationStatus: 'HUMAN_APPROVED',
  evidenceValid: true,
  data: { resistanceKn: 1.23, assertion: 'report only' },
  assumptions: [],
  deterministicToolEvidence: [],
  openTbdItems: [],
  warnings: [],
  recommendations: [],
  requiresDirectorApproval: false
};

describe('agent execution versus independent engineering evidence acceptance', () => {
  it('never promotes provider success or model claims to independently accepted reference evidence', () => {
    const actual = evidenceAdmissionForOutput('TASK-REPORT-ONLY', reportedSuccess);
    expect(actual.executionSucceeded).toBe(true);
    expect(actual.modelReportedEvidenceValid).toBe(true);
    expect(actual.modelReportedVerificationStatus).toBe('HUMAN_APPROVED');
    expect(actual.independentTechnicalReviewAccepted).toBe(false);
    expect(actual.admittedAsEngineeringEvidence).toBe(false);
    expect(actual.engineeringReleaseApproved).toBe(false);
    expect(actual.reason).toBe('INDEPENDENT_REFERENCE_AND_SOURCE_REVIEW_REQUIRED');
  });

  it('keeps a missing or failed run unadmitted without creating completion evidence', () => {
    const missing = evidenceAdmissionForOutput('MISSING', undefined);
    expect(missing.executionSucceeded).toBe(false);
    expect(missing.executionStatus).toBe('NOT_EXECUTED');
    expect(missing.admittedAsEngineeringEvidence).toBe(false);
    const failed = evidenceAdmissionForOutput('FAILED', {
      ...reportedSuccess,
      status: 'FAILED',
      evidenceValid: false,
      verificationStatus: 'EXECUTION_FAILED'
    });
    expect(failed.executionSucceeded).toBe(false);
    expect(failed.modelReportedEvidenceValid).toBe(false);
    expect(failed.engineeringReleaseApproved).toBe(false);
  });

  it('does not attribute a successful receipt to a different task', () => {
    const actual = evidenceAdmissionForOutput('TASK-OTHER', reportedSuccess);
    expect(actual.taskId).toBe('TASK-OTHER');
    expect(actual.executionStatus).toBe('NOT_EXECUTED');
    expect(actual.executionSucceeded).toBe(false);
    expect(actual.modelReportedEvidenceValid).toBe(false);
    expect(actual.modelReportedVerificationStatus).toBe('UNVERIFIED');
    expect(actual.reason).toBe('OUTPUT_TASK_ID_MISMATCH');
    expect(actual.admittedAsEngineeringEvidence).toBe(false);
    expect(actual.engineeringReleaseApproved).toBe(false);
  });

  it('returns a separate factual status for every workflow task', () => {
    const rows = evidenceAdmissionForTasks([
      { id: 'TASK-REPORT-ONLY', output: reportedSuccess },
      { id: 'TASK-PENDING' }
    ]);
    expect(rows.map(r => r.taskId)).toEqual(['TASK-REPORT-ONLY', 'TASK-PENDING']);
    expect(rows.every(r => r.admittedAsEngineeringEvidence === false)).toBe(true);
    expect(rows.every(r => r.engineeringReleaseApproved === false)).toBe(true);
  });

  it('wires factual evidence status to direct execution, workflow and gate decision APIs', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    const route = source.slice(
      source.indexOf("app.post('/api/agents/execute'"),
      source.indexOf("app.post('/api/orchestrator/decide-gate'")
    );
    expect(route).toContain('evidenceAdmission: evidenceAdmissionForOutput(');
    expect(route).toContain('evidenceAdmission: evidenceAdmissionForTasks(tasks)');
    const gate = source.slice(source.indexOf("app.post('/api/orchestrator/decide-gate'"));
    expect(gate).toContain('evidenceAdmission: evidenceAdmissionForTasks(tasks)');
  });
});
