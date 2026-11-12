/**
 * Comprehensive USV-01 acceptance gate.
 *
 * A test passing is not a safety-critical engineering approval. In particular,
 * observed connections, deterministic tool outputs and a stored assertion are
 * never treated as independent certification.
 */
export const ACCEPTANCE_REQUIREMENTS = [
  { id: 'SEC-01', domain: 'SECURITY', criterion: 'Authenticated routes and RBAC', requiresExternal: true },
  { id: 'SEC-02', domain: 'SECURITY', criterion: 'Independent data-integrity and penetration review', requiresExternal: true },
  { id: 'GOV-01', domain: 'GOVERNANCE', criterion: 'Director signature covering the exact baseline digest', requiresExternal: true },
  { id: 'GOV-02', domain: 'GOVERNANCE', criterion: 'Independent engineering peer review', requiresExternal: true },
  { id: 'AGT-01', domain: 'AGENTS', criterion: '26-agent structural registration and wiring', requiresExternal: false },
  { id: 'AGT-02', domain: 'AGENTS', criterion: '26 agent-specific execution benchmark suites', requiresExternal: true },
  { id: 'HYD-01', domain: 'NAVAL', criterion: 'Hydrostatics and righting arm reference validation', requiresExternal: true },
  { id: 'RES-01', domain: 'NAVAL', criterion: 'Resistance prediction correlated to physical or independently validated data', requiresExternal: true },
  { id: 'STR-01', domain: 'NAVAL', criterion: 'Loads, structure, fatigue and buckling verified', requiresExternal: true },
  { id: 'AUT-01', domain: 'SAFETY', criterion: 'COLREG and loss-of-link scenario acceptance', requiresExternal: true },
  { id: 'MAR-01', domain: 'NAVAL', criterion: 'Launch/recovery and marine system integration verification', requiresExternal: true },
  { id: 'INT-01', domain: 'INTEGRATION', criterion: 'Google AI Studio deploy SHA and authenticated handshake', requiresExternal: true },
  { id: 'INT-02', domain: 'INTEGRATION', criterion: 'Google Drive permission and write/read roundtrip', requiresExternal: true },
  { id: 'INT-03', domain: 'INTEGRATION', criterion: 'Obsidian graph roundtrip and conflict handling', requiresExternal: true },
  { id: 'DEP-01', domain: 'DEPLOYMENT', criterion: 'Production deployment, restore drill, observability and TLS', requiresExternal: true }
] as const;

export type AcceptanceId = typeof ACCEPTANCE_REQUIREMENTS[number]['id'];
export type AcceptanceStatus = 'PENDING_EVIDENCE' | 'SUBMITTED_UNVERIFIED' | 'VERIFIED';

export interface AcceptanceEvidence {
  requirementId: AcceptanceId;
  baselineSha: string;
  referenceUri: string;
  referenceSha256: string;
  sourceType: 'PHYSICAL_TEST' | 'INDEPENDENT_REVIEW' | 'SERVICE_HANDSHAKE' | 'PRODUCTION_TEST';
  reviewedBy: string;
  independentlyVerified: boolean;
  /** Independent attestation verification must occur outside this module. */
  attestationVerified: boolean;
}

const commitPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;

export function evaluateAcceptance(
  baselineSha: string,
  evidence: readonly AcceptanceEvidence[] = []
) {
  // Invalid SHA is never a matching baseline: reject accidental placeholder metadata.
  const baselineValid = commitPattern.test(baselineSha);
  const requirements = ACCEPTANCE_REQUIREMENTS.map(requirement => {
    const submitted = evidence.filter(item => item.requirementId === requirement.id);
    const matching = submitted.filter(item =>
      baselineValid &&
      item.baselineSha === baselineSha &&
      digestPattern.test(item.referenceSha256) &&
      /^https:\/\//.test(item.referenceUri) &&
      item.reviewedBy.trim().length > 0 &&
      item.sourceType !== undefined
    );
    // A boolean in an application object is not cryptographic verification.
    // There is intentionally NO automatic VERIFIED status for externally supplied evidence.
    const status: AcceptanceStatus = matching.length > 0
      ? 'SUBMITTED_UNVERIFIED'
      : 'PENDING_EVIDENCE';
    return {
      ...requirement,
      status,
      submittedArtifacts: submitted.length,
      matchingArtifacts: matching.length,
      needsIndependentValidation: true
    };
  });
  return {
    baselineSha,
    baselineValid,
    requirements,
    verifiedCount: requirements.filter(x => x.status === 'VERIFIED').length,
    pendingCount: requirements.filter(x => x.status !== 'VERIFIED').length,
    engineeringReleaseAccepted: false,
    reason: 'Evidence submissions require independent source authentication, review and cryptographic Director approval; never auto-certify.'
  };
}
