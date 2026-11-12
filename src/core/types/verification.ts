/**
 * Types and interfaces for the VERIFY USV-01 Single-Press Systems Verification Engine.
 * Pure TypeScript interfaces safe for both browser/client UI bundles and Node.js execution.
 */

export type VerificationVerdict = 'PASS' | 'CONDITIONAL' | 'FAIL';
export type CheckStatus = 'PASS' | 'FAIL' | 'CONDITIONAL' | 'BLOCKED' | 'SKIPPED' | 'UNVERIFIED';

export type AgentCapabilityStatus =
  | 'IMPLEMENTED'
  | 'TESTED'
  | 'SIMULATED'
  | 'UNAVAILABLE'
  | 'UNVERIFIED';

export interface IndividualCheckResult {
  id: string;
  category: 'REPO_INTEGRITY' | 'GOVERNANCE_STAGES' | 'HMEA_AGENTS' | 'ENGINEERING_INTEGRITY';
  title: string;
  status: CheckStatus;
  mandatory: boolean;
  summary: string;
  evidence: Record<string, any>;
  remediation?: string;
  timestamp: string;
}

export interface AgentReadinessReport {
  canonicalId: string;
  id: string;
  name: string;
  division: string;
  capabilityStatus: AgentCapabilityStatus;
  executionTestStatus: 'PASS' | 'FAIL' | 'UNVERIFIED';
  inputSchemaValid: boolean;
  outputSchemaValid: boolean;
  dependenciesRegistered: boolean;
  permittedTools: string[];
  mandatoryTools: string[];
  toolsRegistered: boolean;
  readinessScore: number; // 0 - 100
  findings: string[];
}

export interface VerificationReport {
  reportId: string;
  timestamp: string;
  executionDurationMs: number;
  system: string;
  systemVersion: string;
  evaluatedCommitSha: string;
  baselineDigest: string;
  branch: string;
  overallVerdict: VerificationVerdict;
  verdictRationale: string;
  summaryStatistics: {
    totalChecks: number;
    passed: number;
    conditional: number;
    failed: number;
    blocked: number;
    skipped: number;
    unverified: number;
    mandatoryFailedOrBlocked: number;
  };
  phases: {
    phase1_repoQuality: {
      title: string;
      status: CheckStatus;
      checks: IndividualCheckResult[];
    };
    phase2_governanceStages: {
      title: string;
      status: CheckStatus;
      checks: IndividualCheckResult[];
    };
    phase3_hmeaAgents: {
      title: string;
      status: CheckStatus;
      totalAgentsEvaluated: number;
      canonicalCoverage: string; // e.g. "25/25"
      checks: IndividualCheckResult[];
      agentReadiness: AgentReadinessReport[];
    };
    phase4_engineeringData: {
      title: string;
      status: CheckStatus;
      checks: IndividualCheckResult[];
    };
  };
  governanceFindings: {
    stageA: { risk: string; categories: string[]; requiresDirector: boolean };
    stageB: { secretsDetected: number; configValid: boolean; ecrValid: boolean };
    stageC: { provider: string; aiReviewStatus: string; deterministicStatus: string; isModelBacked: boolean };
    stageD: { humanApprovalRequired: boolean; signatureVerified: boolean; staleApproval: boolean; signatory?: string };
    stageE: { overallVerdict: string; passed: boolean; blockingReasons: string[] };
  };
  unresolvedBlockers: string[];
  remainingLimitations: string[];
  reportMarkdown: string;
}
