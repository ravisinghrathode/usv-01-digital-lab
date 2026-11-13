/**
 * USV-01 evidence acquisition and decision-support gate.
 *
 * SECURITY BOUNDARY: everything passed to this module is an untrusted claim.
 * A valid URL/hash, passing calculation, AI agreement or a supplied reviewer
 * identity never constitutes authenticated evidence or Director authorization.
 * No physical vessel actuator or autopilot connection is provided here.
 */
import { z } from 'zod';
import { ACCEPTANCE_REQUIREMENTS, type AcceptanceId } from './AcceptanceGate.ts';

export const CONFIGURATION_CATALOG = [
  {
    id: 'USV01-PORTABLE-CONCEPT-REVA',
    source: 'USV01-PARAM-001 / USV01-PHYS-001 Rev A (Library)',
    configurationClass: 'PROPOSED_SEPARATE_CONCEPT',
    approximateLoaM: 2.5,
    targetDisplacementKg: 120,
    approvalState: 'NOT_APPROVED'
  },
  {
    id: 'USV01-TACTICAL-REV04',
    source: 'USV01_PROJECT_CONTEXT.md Rev 0.4 (GitHub)',
    configurationClass: 'REPOSITORY_ASSERTED_BASELINE',
    approximateLoaM: 11.2,
    targetDisplacementKg: 6200,
    approvalState: 'SOURCE_ASSERTION_NOT_INDEPENDENTLY_CERTIFIED'
  }
] as const;
export type ConfigurationId = typeof CONFIGURATION_CATALOG[number]['id'];

export const EVIDENCE_OBLIGATIONS: Record<AcceptanceId, readonly string[]> = {
  'AGT-01': ['LIVE_EXECUTION', 'SOFTWARE_TEST'],
  'AGT-02': ['REFERENCE_CALCULATION', 'INDEPENDENT_REVIEW'],
  'HYD-01': ['CAD_HYDROSTATICS', 'GZ_STABILITY', 'INDEPENDENT_REVIEW'],
  'RES-01': ['RESISTANCE_CORRELATION', 'SPEED_POWER', 'SUPPLIER_DATA'],
  'STR-01': ['STRUCTURAL_ANALYSIS', 'MATERIAL_DATA', 'INDEPENDENT_REVIEW'],
  'AUT-01': ['SAFETY_SCENARIO', 'HIL_TEST', 'INDEPENDENT_REVIEW'],
  'MAR-01': ['MARINE_MEASUREMENTS', 'INDEPENDENT_REVIEW'],
  'INT-01': ['LIVE_SERVICE'],
  'INT-02': ['LIVE_SERVICE', 'RECOVERY_TEST'],
  'INT-03': ['KNOWLEDGE_SYNC', 'RECOVERY_TEST'],
  'SEC-01': ['SECURITY_TEST'],
  'SEC-02': ['INDEPENDENT_SECURITY_TEST'],
  'GOV-01': ['DIRECTOR_APPROVAL'],
  'GOV-02': ['INDEPENDENT_REVIEW'],
  'DEP-01': ['LIVE_SERVICE', 'RECOVERY_TEST']
};

export const EVIDENCE_KINDS = [
  'LIVE_EXECUTION','SOFTWARE_TEST','REFERENCE_CALCULATION',
  'CAD_HYDROSTATICS','GZ_STABILITY','RESISTANCE_CORRELATION','SPEED_POWER',
  'SUPPLIER_DATA','STRUCTURAL_ANALYSIS','MATERIAL_DATA','SAFETY_SCENARIO',
  'HIL_TEST','MARINE_MEASUREMENTS','LIVE_SERVICE','RECOVERY_TEST',
  'KNOWLEDGE_SYNC','SECURITY_TEST','INDEPENDENT_SECURITY_TEST',
  'DIRECTOR_APPROVAL','INDEPENDENT_REVIEW'
] as const;

const sha = z.string().regex(/^[0-9a-f]{40}$/);
const digest = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const id = z.string().min(1).max(128);
const https = z.string().url().refine(value => {
  try {
    const uri = new URL(value);
    return uri.protocol === 'https:' && !uri.username && !uri.password &&
      uri.hostname.length > 0;
  } catch { return false; }
}, 'Evidence references must be HTTPS without embedded credentials');
const configId = z.enum([
  'USV01-PORTABLE-CONCEPT-REVA', 'USV01-TACTICAL-REV04'
]);
const acceptanceIds = new Set<string>(ACCEPTANCE_REQUIREMENTS.map(r => r.id));
const requirementId = z.string().refine(value => acceptanceIds.has(value), 'Unknown requirement ID');

const baselineSchema = z.strictObject({
  configurationId: configId,
  revision: id,
  sourceCommitSha: sha,
  sourceDocumentUri: https,
  sourceDocumentSha256: digest,
  hullGeometryUri: https,
  hullGeometrySha256: digest,
  weightRegisterUri: https,
  weightRegisterSha256: digest,
  geometryFrameAndUnits: z.string().min(1),
  assertionStatus: z.enum(['PROPOSED', 'SOURCE_ASSERTED', 'DIRECTOR_APPROVED_CLAIM'])
});
const criterionSchema = z.strictObject({
  requirementId,
  configurationId: configId,
  criteriaReferenceUri: https,
  testProcedureUri: https,
  acceptanceBasis: z.string().min(1),
  declaredFrozenBeforeTest: z.boolean()
});
const evidenceSchema = z.strictObject({
  evidenceId: id,
  requirementId,
  configurationId: configId,
  sourceCommitSha: sha,
  hullGeometrySha256: digest,
  weightRegisterSha256: digest,
  evidenceKind: z.enum(EVIDENCE_KINDS),
  artifactUri: https,
  artifactSha256: digest,
  sourceDescription: z.string().min(1),
  criterionReferenceUri: https,
  verificationProcedureUri: https,
  claimedOutcome: z.enum(['PASS','FAIL','INCONCLUSIVE']),
  recordedBy: id
});
const reviewSchema = z.strictObject({
  reviewId: id,
  evidenceId: id,
  reviewerRole: z.enum(['CHATGPT','GEMINI','INDEPENDENT_ENGINEER']),
  verdict: z.enum(['PASS','FAIL','INCONCLUSIVE']),
  reviewArtifactUri: https,
  reviewArtifactSha256: digest
});

export const evidenceDecisionInputSchema = z.strictObject({
  schemaVersion: z.literal('1.0'),
  selectedBaseline: baselineSchema.nullable(),
  criteria: z.array(criterionSchema).max(250),
  evidence: z.array(evidenceSchema).max(5000),
  reviews: z.array(reviewSchema).max(5000)
});
export type EvidenceDecisionInput = z.infer<typeof evidenceDecisionInputSchema>;
export function parseEvidenceDecisionInput(value: unknown): EvidenceDecisionInput {
  return evidenceDecisionInputSchema.parse(value);
}

export type EvidenceFindingStatus =
  'NOT_TESTED' | 'MISSING_COVERAGE' | 'SUBMITTED_UNVERIFIED' |
  'CLAIMED_FAIL' | 'INCONCLUSIVE' | 'REJECTED_CONFIGURATION_CONFLICT';

export function evaluateEvidenceDecision(
  input: EvidenceDecisionInput,
  evaluatedCommitSha: string
) {
  const required = ACCEPTANCE_REQUIREMENTS.map(x => x.id);
  const chosen = input.selectedBaseline;
  const knownConfig = CONFIGURATION_CATALOG.find(x => x.id === chosen?.configurationId);
  const problems: string[] = [];
  if (!/^[0-9a-f]{40}$/.test(evaluatedCommitSha)) problems.push('INVALID_EVALUATED_COMMIT');
  if (!chosen) problems.push('NO_AUTHORITATIVE_VESSEL_CONFIGURATION_SELECTED');
  if (chosen && chosen.sourceCommitSha !== evaluatedCommitSha) problems.push('BASELINE_COMMIT_MISMATCH');
  if (chosen && !knownConfig) problems.push('UNKNOWN_VESSEL_CONFIGURATION');
  if (chosen?.configurationId === 'USV01-PORTABLE-CONCEPT-REVA') {
    problems.push('PORTABLE_REV_A_IS_PROPOSED_AND_NOT_THE_TACTICAL_VESSEL');
  }
  // Neither stored assertion nor "Director approved" text proves a signed baseline.
  const criterionIds = new Set<string>();
  const quarantinedCriteria: Array<{requirementId:string; reason:string}> = [];
  for (const plan of input.criteria) {
    if (criterionIds.has(plan.requirementId)) {
      quarantinedCriteria.push({requirementId:plan.requirementId, reason:'DUPLICATE_CRITERION'});
    }
    criterionIds.add(plan.requirementId);
    if (!chosen || plan.configurationId !== chosen.configurationId) {
      quarantinedCriteria.push({requirementId:plan.requirementId, reason:'CROSS_CONFIGURATION_CRITERION'});
    }
    if (!plan.declaredFrozenBeforeTest) {
      quarantinedCriteria.push({requirementId:plan.requirementId, reason:'CRITERION_NOT_FROZEN'});
    }
  }
  const seenEvidence = new Set<string>();
  const rejectedEvidence: Array<{evidenceId:string; reason:string}> = [];
  const acceptedMetadata: EvidenceDecisionInput['evidence'] = [];
  for (const record of input.evidence) {
    const reasons: string[] = [];
    if (seenEvidence.has(record.evidenceId)) reasons.push('DUPLICATE_EVIDENCE_ID');
    seenEvidence.add(record.evidenceId);
    if (!chosen || record.configurationId !== chosen.configurationId) reasons.push('CROSS_CONFIGURATION_EVIDENCE');
    if (record.sourceCommitSha !== evaluatedCommitSha ||
        record.sourceCommitSha !== chosen?.sourceCommitSha) reasons.push('BASELINE_COMMIT_MISMATCH');
    if (record.hullGeometrySha256 !== chosen?.hullGeometrySha256 ||
        record.weightRegisterSha256 !== chosen?.weightRegisterSha256) reasons.push('GEOMETRY_OR_MASS_REVISION_MISMATCH');
    const plan = input.criteria.find(p => p.requirementId === record.requirementId &&
      p.configurationId === chosen?.configurationId);
    if (!plan || plan.criteriaReferenceUri !== record.criterionReferenceUri ||
        plan.testProcedureUri !== record.verificationProcedureUri) reasons.push('UNCONTROLLED_CRITERION_OR_TEST_PROCEDURE');
    const methods = EVIDENCE_OBLIGATIONS[record.requirementId as AcceptanceId];
    if (!methods?.includes(record.evidenceKind)) reasons.push('EVIDENCE_KIND_NOT_APPLICABLE');
    if (reasons.length) {
      for (const reason of reasons) rejectedEvidence.push({evidenceId:record.evidenceId, reason});
    } else {
      acceptedMetadata.push(record);
    }
  }
  if (quarantinedCriteria.length) problems.push('INVALID_OR_CONFLICTING_ACCEPTANCE_CRITERIA');
  if (rejectedEvidence.length) problems.push('REJECTED_EVIDENCE_PRESENT');

  const knownEvidenceIds = new Set(acceptedMetadata.map(x => x.evidenceId));
  const reviewsWithUnknownEvidence = input.reviews.filter(x => !knownEvidenceIds.has(x.evidenceId))
    .map(x => x.reviewId);
  if (reviewsWithUnknownEvidence.length) problems.push('UNBOUND_INDEPENDENT_REVIEW_REFERENCES');
  const reviewConflicts: string[] = [];
  for (const record of acceptedMetadata) {
    const perRecord = input.reviews.filter(r => r.evidenceId === record.evidenceId);
    const chatgpt = perRecord.find(x => x.reviewerRole === 'CHATGPT')?.verdict;
    const gemini = perRecord.find(x => x.reviewerRole === 'GEMINI')?.verdict;
    if (chatgpt && gemini && chatgpt !== gemini) reviewConflicts.push(record.evidenceId);
  }
  if (reviewConflicts.length) problems.push('DUAL_AI_DISAGREEMENT');
  const findings = required.map(requirementId => {
    const obligations = EVIDENCE_OBLIGATIONS[requirementId];
    const present = acceptedMetadata.filter(x => x.requirementId === requirementId);
    const missingEvidenceKinds = obligations.filter(kind => !present.some(x => x.evidenceKind === kind));
    const criterion = input.criteria.find(x => x.requirementId === requirementId &&
      x.configurationId === chosen?.configurationId);
    const rejected = input.evidence.some(x => x.requirementId === requirementId) &&
      rejectedEvidence.some(x => input.evidence.some(y =>
        y.requirementId === requirementId && y.evidenceId === x.evidenceId));
    let status: EvidenceFindingStatus = 'NOT_TESTED';
    if (rejected) status = 'REJECTED_CONFIGURATION_CONFLICT';
    else if (present.some(x => x.claimedOutcome === 'FAIL')) status = 'CLAIMED_FAIL';
    else if (present.some(x => x.claimedOutcome === 'INCONCLUSIVE')) status = 'INCONCLUSIVE';
    else if (present.length && (!criterion || missingEvidenceKinds.length)) status = 'MISSING_COVERAGE';
    else if (present.length) status = 'SUBMITTED_UNVERIFIED';
    return {
      requirementId,
      requiredEvidenceKinds: obligations,
      submittedValidMetadataCount: present.length,
      missingEvidenceKinds,
      status,
      authorityVerified: false as const,
      engineeringAccepted: false as const
    };
  });
  const missingCriteria = required.filter(r => !input.criteria.some(x =>
    x.requirementId === r && x.configurationId === chosen?.configurationId));
  if (missingCriteria.length) problems.push('MISSING_CONTROLLED_ACCEPTANCE_CRITERIA');
  if (!chosen) problems.push('CAD_AND_WEIGHT_REGISTER_EVIDENCE_ABSENT');

  const gate0ReadyForExternalReview =
    Boolean(chosen) && chosen?.configurationId === 'USV01-TACTICAL-REV04' &&
    problems.length === 0 && missingCriteria.length === 0 &&
    input.criteria.length === required.length &&
    input.criteria.every(x => x.declaredFrozenBeforeTest);

  return {
    schemaVersion: '1.0',
    evaluatedCommitSha,
    selectedConfiguration: chosen?.configurationId ?? null,
    sourceClaim: knownConfig ?? null,
    gate0Status: gate0ReadyForExternalReview
      ? 'METADATA_READY_FOR_EXTERNAL_CONFIGURATION_REVIEW' as const
      : 'HOLD_CONFIGURATION_AND_CRITERIA' as const,
    gate0ReadyForExternalReview,
    independentConfigurationAuthenticationVerified: false as const,
    authoritativeEngineeringBaselineApproved: false as const,
    releaseApproved: false as const,
    problems: [...new Set(problems)],
    missingCriteria,
    quarantinedCriteria,
    rejectedEvidence,
    reviewsWithUnknownEvidence,
    dualAiDisagreements: reviewConflicts,
    findings,
    allEvidenceIndependentlyAccepted: false as const,
    nextActions: [
      'Resolve tactical versus portable vessel configuration identity and CAD/source revision',
      'Obtain approved watertight hull geometry, mass and CG, and applicable criteria before physical validation',
      'Attach independently sourced raw test outputs and authenticated reviews to the exact design configuration',
      'Resolve independent ChatGPT/Gemini technical disagreements against source measurements',
      'Secure Director signature for the exact unchanged release baseline before any engineering approval'
    ],
    caveat: 'This is metadata inspection and decision support, not proof of physical performance, qualified independent review, regulatory compliance or Director authorization.'
  };
}

/**
 * First-principles electrical energy/current sanity screen for a SPECIFIED
 * demand. It does not predict resistance, duty cycle, cruise range or sizing.
 */
export function screenPowerFeasibility(input: {
  requiredShaftPowerKw: number;
  usableEnergyKwh: number;
  busVoltageV: number;
  sourceReference: string;
}) {
  const values = [input.requiredShaftPowerKw, input.usableEnergyKwh, input.busVoltageV];
  if (!values.every(x => Number.isFinite(x) && x > 0) ||
      typeof input.sourceReference !== 'string' || !input.sourceReference.trim()) {
    return {status: 'INVALID_INPUT' as const, currentLowerBoundA: null, enduranceUpperBoundH: null,
      independentlyValidated: false as const, accepted: false as const};
  }
  return {
    status: 'ARITHMETIC_SCREEN_UNCERTIFIED' as const,
    currentLowerBoundA: input.requiredShaftPowerKw * 1000 / input.busVoltageV,
    enduranceUpperBoundH: input.usableEnergyKwh / input.requiredShaftPowerKw,
    sourceReference: input.sourceReference,
    caveat: 'Assumes shaft demand constant and a single DC bus at stated voltage. Electrical losses and auxiliary loads make true current higher and endurance lower. Real architecture, topology, mission duty cycle and thermal ratings require evidence.',
    independentlyValidated: false as const,
    accepted: false as const
  };
}

export function evidenceDecisionMarkdown(report: ReturnType<typeof evaluateEvidenceDecision>): string {
  const rows = report.findings.map(x =>
    '| ' + x.requirementId + ' | ' + x.status + ' | ' +
    x.missingEvidenceKinds.join(', ') + ' |').join('\n');
  return [
    '# USV-01 Evidence Acquisition & Decision Readiness',
    '',
    'Evaluated source commit: ' + report.evaluatedCommitSha,
    'Configuration: ' + (report.selectedConfiguration || 'NONE — HOLD'),
    'Gate 0: **' + report.gate0Status + '**',
    'External engineering/Director release: **NOT APPROVED**',
    '',
    'Blocking findings: ' + report.problems.join('; '),
    '',
    '| Acceptance criterion | Evidence metadata status | Required evidence still missing |',
    '|---|---|---|',
    rows,
    '',
    'Independent configuration authority: **NOT VERIFIED**. AI reviews, file URLs, evidence hashes,',
    'and even complete metadata do not independently certify design performance or authorize release.',
    ''
  ].join('\n');
}
