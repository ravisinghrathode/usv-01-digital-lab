/**
 * MAR-01 engineering evidence intake for USV-01's controlled digital lab.
 * A metadata check is NOT authentication of field measurements, rule compliance,
 * independent engineering review, or Director approval.
 *
 * Baseline geometry/ratings are deliberately not duplicated here. Use the exact
 * reviewed source revision and commit; never import the separate 2.5 m concept.
 */
export const MARINE_EVIDENCE_REQUIREMENTS = [
  { id: 'MAR-LR-01', kind: 'LAUNCH_RECOVERY_LOAD', description: 'Approved handling mass, CG, environmental/rigging load-case definition and lifting geometry' },
  { id: 'MAR-LR-02', kind: 'LAUNCH_RECOVERY_LOAD', description: 'Worst-case unequal point reactions, lifting load path and physical proof/inspection evidence' },
  { id: 'MAR-LR-03', kind: 'LAUNCH_RECOVERY_LOAD', description: 'Transport support, acceleration/restraint load cases and verified tie-down capacity' },
  { id: 'MAR-TH-01', kind: 'SEALED_HULL_THERMAL', description: 'Component dissipations, operating/survival temperatures, fouled/low-flow case and thermal network' },
  { id: 'MAR-TH-02', kind: 'SEALED_HULL_THERMAL', description: 'Instrumented worst-case steady/transient temperature evidence against component limits' },
  { id: 'MAR-TH-03', kind: 'SEALED_HULL_THERMAL', description: 'Ingress boundary and post-thermal-cycle sealing verification for selected construction' },
  { id: 'MAR-AC-01', kind: 'WET_END_ACOUSTIC', description: 'Selected transducer supplier ICD: mounting, envelope, aperture, electrical/data and service interfaces' },
  { id: 'MAR-AC-02', kind: 'WET_END_ACOUSTIC', description: 'Hydrodynamic/acoustic flow-noise, bubble, propulsor wash and structural shadowing assessment and trial' },
  { id: 'MAR-AC-03', kind: 'WET_END_ACOUSTIC', description: 'Hull penetration/connector integrity, vibration isolation, and service/reinstallation evidence' },
  { id: 'MAR-FC-01', kind: 'FOULING_CORROSION', description: 'Substrate/metal compatibility, galvanic/bonding design, coating and corrosion protection evidence' },
  { id: 'MAR-FC-02', kind: 'FOULING_CORROSION', description: 'Fouling inspection/cleaning access, permitted acoustic-face treatments and maintenance intervals' },
  { id: 'MAR-BC-01', kind: 'BILGE_CONDENSATION', description: 'Compartment low points, collection, vent/drain sealing, sensor location and serviceability' },
  { id: 'MAR-BC-02', kind: 'BILGE_CONDENSATION', description: 'Environmental cycling and bilge/humidity sensor, alarm and power-failure response tests' }
] as const;

export type MarineEvidenceRequirementId = typeof MARINE_EVIDENCE_REQUIREMENTS[number]['id'];
export type MarineEvidenceKind = typeof MARINE_EVIDENCE_REQUIREMENTS[number]['kind'];

export interface MarineEvidenceSubmission {
  requirementId: string;
  /** 40-char hex commit SHA of the exact engineering source baseline. */
  baselineSha: string;
  /** Controlled, accessible artifact; this field is an untrusted citation only. */
  referenceUri: string;
  /** Digest is provided by submitter, NOT independently authenticated here. */
  referenceSha256: string;
  /** Identifies load case, temperature/immersion envelope, or test environment. */
  conditionId: string;
  /** Identifies accepted procedure or supplier/standard-based verification plan. */
  verificationProcedureId: string;
  /** Identifies a documented design acceptance limit; no limits are invented here. */
  designLimitReference: string;
  /** Claimed review attribution only. Not independently authenticated here. */
  reviewedBy: string;
  /** Submitted outcome is untrusted until independent evidence review. */
  claimedOutcome: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
}

const shaPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;

export function assessMarineEvidence(
  baselineSha: string,
  submissions: readonly MarineEvidenceSubmission[] = []
) {
  const baselineValid = shaPattern.test(baselineSha);
  const requirementIds = new Set<string>(MARINE_EVIDENCE_REQUIREMENTS.map(r => r.id));
  const seen = new Set<string>();
  const invalidSubmissions: Array<{ requirementId: string; defects: string[] }> = [];
  const referenced = new Set<string>();

  for (const record of submissions) {
    const defects: string[] = [];
    const id = typeof record?.requirementId === 'string' ? record.requirementId : '';
    if (!requirementIds.has(id)) defects.push('unknown or missing MAR-01 requirement ID');
    if (seen.has(id)) defects.push('duplicate requirement evidence ID');
    seen.add(id);
    if (!baselineValid || record?.baselineSha !== baselineSha) defects.push('invalid or mismatched baseline SHA');
    if (typeof record?.referenceUri !== 'string' || !/^https:\/\/[^\s]+$/.test(record.referenceUri)) defects.push('missing controlled HTTPS evidence URI');
    if (typeof record?.referenceSha256 !== 'string' || !digestPattern.test(record.referenceSha256)) defects.push('missing or invalid SHA-256 provenance');
    for (const key of ['conditionId', 'verificationProcedureId', 'designLimitReference', 'reviewedBy'] as const) {
      if (typeof record?.[key] !== 'string' || !record[key].trim()) defects.push('missing ' + key);
    }
    if (!['PASS', 'FAIL', 'INCONCLUSIVE'].includes(record?.claimedOutcome)) defects.push('invalid claimed test outcome');
    if (record?.claimedOutcome !== 'PASS') defects.push('no submitted PASS outcome');
    if (defects.length) invalidSubmissions.push({ requirementId: id || '(missing)', defects });
    else referenced.add(id);
  }

  const missingRequirements = MARINE_EVIDENCE_REQUIREMENTS
    .filter(r => !referenced.has(r.id))
    .map(r => r.id);
  const metadataComplete = baselineValid && submissions.length > 0 &&
    invalidSubmissions.length === 0 && missingRequirements.length === 0;

  return {
    baselineValid,
    expectedRequirements: MARINE_EVIDENCE_REQUIREMENTS.length,
    submittedRecords: submissions.length,
    missingRequirements,
    invalidSubmissions,
    metadataComplete,
    status: submissions.length === 0 ? 'NO_EVIDENCE' as const
      : metadataComplete ? 'SUBMITTED_UNVERIFIED' as const
      : 'INCOMPLETE_OR_INVALID' as const,
    independentlyValidated: false as const,
    marineSystemsAccepted: false as const,
    reason: 'Software validates metadata completeness only. Engineering loads, supplier limits, measured performance, source authentication, independent review and authorized baseline sign-off remain external MAR-01 gates.'
  };
}
