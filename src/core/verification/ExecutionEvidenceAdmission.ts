import type { AgentExecutionOutput } from '../types/agent.ts';
import type { EngineeringTask } from '../types/orchestrator.ts';

/**
 * The server has execution receipts, but no independently signed technical
 * evidence admission bound to a reference artifact and physical input.
 * Model results and ordinary human task gates cannot silently satisfy that.
 */
export interface UnadmittedEvidenceStatus {
  taskId: string;
  executionStatus: AgentExecutionOutput['status'] | 'NOT_EXECUTED';
  executionSucceeded: boolean;
  modelReportedEvidenceValid: boolean;
  modelReportedVerificationStatus: NonNullable<AgentExecutionOutput['verificationStatus']> | 'UNVERIFIED';
  independentTechnicalReviewAccepted: false;
  admittedAsEngineeringEvidence: false;
  engineeringReleaseApproved: false;
  reason: 'INDEPENDENT_REFERENCE_AND_SOURCE_REVIEW_REQUIRED';
}

export function evidenceAdmissionForOutput(
  taskId: string,
  output: AgentExecutionOutput | undefined
): UnadmittedEvidenceStatus {
  return {
    taskId,
    executionStatus: output?.status ?? 'NOT_EXECUTED',
    executionSucceeded: output?.status === 'SUCCESS',
    modelReportedEvidenceValid: output?.evidenceValid === true,
    modelReportedVerificationStatus: output?.verificationStatus ?? 'UNVERIFIED',
    independentTechnicalReviewAccepted: false,
    admittedAsEngineeringEvidence: false,
    engineeringReleaseApproved: false,
    reason: 'INDEPENDENT_REFERENCE_AND_SOURCE_REVIEW_REQUIRED'
  };
}

export function evidenceAdmissionForTasks(
  tasks: ReadonlyArray<Pick<EngineeringTask, 'id' | 'output'>>
): UnadmittedEvidenceStatus[] {
  return tasks.map(task => evidenceAdmissionForOutput(task.id, task.output));
}
