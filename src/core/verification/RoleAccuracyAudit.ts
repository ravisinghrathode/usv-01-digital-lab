import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ROLE_ACCURACY_OBLIGATIONS } from './RoleAccuracyObligations.ts';
import { screenAgentAccuracy } from './AgentAccuracyScreen.ts';

interface LiveRoleCase {
  canonicalId: string;
  agentId?: string;
  provider?: string;
  providerExecutionMode?: string;
  status?: string;
  outputSchemaValid?: boolean;
  modelProviderResponseId?: string;
  deterministicTools?: { id: string; success: boolean }[];
}
interface HistoricalSample {
  canonicalId: string;
  outputSchemaValid?: boolean;
  liveProviderObserved?: boolean;
  mentionsDeterministicToolWithoutTrace?: boolean;
  parsedOutput?: { keyMetrics?: Record<string, unknown>; requiresDirectorApproval?: boolean };
}
export interface AgentAccuracyAuditInputs {
  registeredCommit: string;
  nativeEvidenceCommit: string;
  nativeResults: readonly LiveRoleCase[];
  originalResults: readonly HistoricalSample[];
  /** The caller must independently hash actual workspace source bytes against
   * the observed runtime's sourceFileSha256 manifest before asserting this. */
  sourceFileDigestsMatch?: boolean;
}

/** Evidence-complete software smoke tests are distinct from INDEPENDENT technical acceptance. */
export function auditAll26AgentAccuracy(input: AgentAccuracyAuditInputs) {
  const registry = AgentRegistry.getInstance();
  const historic = screenAgentAccuracy(input.originalResults);
  const obligations = ROLE_ACCURACY_OBLIGATIONS;
  const findings = obligations.map(obligation => {
    const spec = registry.requireAgent(obligation.canonicalId);
    const samples = input.nativeResults.filter(x => x.canonicalId === obligation.canonicalId);
    const native = samples[0];
    const expectedTools = spec.verificationCriteria.mandatoryDeterministicTools;
    const actualTools = native?.deterministicTools ?? [];
    const registryCorrect = spec.canonicalId === obligation.canonicalId;
    const nativeRunObserved = samples.length === 1 && native.agentId === spec.id &&
      native.provider === 'gemini' &&
      native.providerExecutionMode === 'LIVE_AI_GENERATION' &&
      (native.status === 'SUCCESS' || native.status === 'NEEDS_HUMAN_APPROVAL') &&
      native.outputSchemaValid === true &&
      typeof native.modelProviderResponseId === 'string' &&
      native.modelProviderResponseId.length >= 10;
    const mandatoryToolsCorrect = nativeRunObserved &&
      actualTools.length === expectedTools.length &&
      expectedTools.every((tool, index) => actualTools[index]?.id === tool &&
        actualTools[index]?.success === true);
    const accuracy = historic.rows.find(r => r.agentId === obligation.canonicalId);
    const currentSourceExecuted = input.nativeEvidenceCommit === input.registeredCommit ||
      input.sourceFileDigestsMatch === true;
    const issues: string[] = [];
    if (!registryCorrect) issues.push('Canonical registry role mismatch');
    if (!nativeRunObserved) issues.push('Missing true live provider/ExecutionEngine role trace');
    if (!mandatoryToolsCorrect) issues.push('Missing/incorrect real mandatory ToolRegistry trace');
    if (!currentSourceExecuted) issues.push('Live engine evidence originated from an older repository source revision');
    if (accuracy?.status === 'ANALYTIC_FAIL') {
      issues.push('Original direct-model run failed analytic/provenance accuracy checks');
    }
    issues.push('Independently authenticated specialist reference and witness sign-off unavailable');
    return {
      canonicalId: obligation.canonicalId, role: spec.name,
      representativeChallenge: obligation.representativeChallenge,
      requiredIndependentEvidence: obligation.independentlyRequired,
      externalAttestationRequired: true as const,
      currentSourceExecuted,
      nativeRunObserved, mandatoryToolsCorrect,
      historicAnalyticStatus: accuracy?.status ?? 'MISSING_SAMPLE',
      historicalNumericalChecks: accuracy?.checked ?? 0,
      historicalNumericalPasses: accuracy?.passed ?? 0,
      issues,
      independentlyVerified: false as const,
      finalAcceptance: 'PENDING_INDEPENDENT_REVIEW' as const
    };
  });
  const seen = new Set(obligations.map(x => x.canonicalId));
  if (seen.size !== 26 || findings.length !== 26) {
    throw new Error('The independent reference audit MUST list exactly 26 unique canonical roles');
  }
  return {
    codeVersionUnderAudit: input.registeredCommit,
    archivedNativeVersion: input.nativeEvidenceCommit,
    currentEngineSourceHashMatched: input.sourceFileDigestsMatch === true,
    totalRoles: 26,
    nativeOperationalMatches: findings.filter(x => x.nativeRunObserved && x.mandatoryToolsCorrect).length,
    currentRevisionNativeMatches: findings.filter(x => x.currentSourceExecuted && x.nativeRunObserved && x.mandatoryToolsCorrect).length,
    arithmeticScreenPassedUncertified: historic.analyticPass,
    arithmeticScreenFailed: historic.analyticFail,
    qualitativeSpecialistReviewsPending: historic.humanReviewRequired,
    referenceEvidenceRequiredRoles: 26,
    independentlyAcceptedRoles: 0,
    engineeringReleaseApproved: false as const,
    findings
  };
}
