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
  reason: 'INDEPENDENT_REFERENCE_AND_SOURCE_REVIEW_REQUIRED' | 'OUTPUT_TASK_ID_MISMATCH' | 'INVALID_EXECUTION_RECEIPT';
}

export function evidenceAdmissionForOutput(
  taskId: string,
  output: AgentExecutionOutput | undefined
): UnadmittedEvidenceStatus {
  // A receipt for another task cannot establish this task's execution state.
  const taskBoundOutput = output?.taskId === taskId ? output : undefined;
  // Runtime receipts can arrive from persistence or external providers despite
  // compile-time types. Never echo unknown status/verification claims as facts.
  const validStatus = taskBoundOutput && ['SUCCESS', 'PARTIAL', 'FAILED', 'NEEDS_HUMAN_APPROVAL'].includes(taskBoundOutput.status);
  const validVerification = taskBoundOutput && (taskBoundOutput.verificationStatus === undefined ||
    ['UNVERIFIED', 'CALCULATED_VERIFIED', 'HUMAN_APPROVED', 'SYNTHETIC_MOCK', 'EXECUTION_FAILED'].includes(taskBoundOutput.verificationStatus));
  const trustedReceipt = validStatus && validVerification ? taskBoundOutput : undefined;
  return {
    taskId,
    executionStatus: trustedReceipt?.status ?? 'NOT_EXECUTED',
    executionSucceeded: trustedReceipt?.status === 'SUCCESS',
    modelReportedEvidenceValid: trustedReceipt?.evidenceValid === true,
    modelReportedVerificationStatus: trustedReceipt?.verificationStatus ?? 'UNVERIFIED',
    independentTechnicalReviewAccepted: false,
    admittedAsEngineeringEvidence: false,
    engineeringReleaseApproved: false,
    reason: output && !taskBoundOutput
      ? 'OUTPUT_TASK_ID_MISMATCH'
      : taskBoundOutput && !trustedReceipt
        ? 'INVALID_EXECUTION_RECEIPT'
        : 'INDEPENDENT_REFERENCE_AND_SOURCE_REVIEW_REQUIRED'
  };
}

export function evidenceAdmissionForTasks(
  tasks: ReadonlyArray<Pick<EngineeringTask, 'id' | 'output'>>
): UnadmittedEvidenceStatus[] {
  return tasks.map(task => evidenceAdmissionForOutput(task.id, task.output));
}
