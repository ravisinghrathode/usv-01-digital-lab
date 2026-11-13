import { describe, it, expect } from 'vitest';
import { ACCEPTANCE_REQUIREMENTS } from '../src/core/verification/AcceptanceGate.ts';
import {
  CONFIGURATION_CATALOG, EVIDENCE_OBLIGATIONS,
  evaluateEvidenceDecision, parseEvidenceDecisionInput, screenPowerFeasibility,
  evidenceDecisionMarkdown, type EvidenceDecisionInput
} from '../src/core/verification/EvidenceDecisionGate.ts';

const commitSha = 'a'.repeat(40);
const digest = 'sha256:' + 'b'.repeat(64);
const digest2 = 'sha256:' + 'c'.repeat(64);
const uri = 'https://example.org/source-evidence';
const configId = 'USV01-TACTICAL-REV04' as const;
const baseline: NonNullable<EvidenceDecisionInput['selectedBaseline']> = {
  configurationId: configId, revision: 'Rev 0.4 — synthetic test fixture',
  sourceCommitSha: commitSha, sourceDocumentUri: uri, sourceDocumentSha256: digest,
  hullGeometryUri: 'https://example.org/hull', hullGeometrySha256: digest,
  weightRegisterUri: 'https://example.org/mass', weightRegisterSha256: digest2,
  geometryFrameAndUnits: 'metres / starboard-x, forward-y, up-z, origin declared',
  assertionStatus: 'SOURCE_ASSERTED'
};
const criteria: EvidenceDecisionInput['criteria'] = ACCEPTANCE_REQUIREMENTS.map(r => ({
  requirementId: r.id, configurationId: configId,
  criteriaReferenceUri: 'https://example.org/criteria/' + r.id,
  testProcedureUri: 'https://example.org/procedure/' + r.id,
  acceptanceBasis: 'Unit test only — no engineering acceptance basis',
  declaredFrozenBeforeTest: true
}));
function emptyFixture(): EvidenceDecisionInput {
  return {schemaVersion:'1.0',selectedBaseline:null,criteria:[],evidence:[],reviews:[]};
}
function fullFixture(): EvidenceDecisionInput {
  return {schemaVersion:'1.0',selectedBaseline:baseline,criteria:[...criteria],evidence:[],reviews:[]};
}
function evidence(
  requirementId = 'HYD-01',
  evidenceKind: EvidenceDecisionInput['evidence'][number]['evidenceKind'] = 'CAD_HYDROSTATICS'
): EvidenceDecisionInput['evidence'][number] {
  return {
    evidenceId: 'EV-01', requirementId, configurationId: configId,
    sourceCommitSha:commitSha,hullGeometrySha256:digest,
    weightRegisterSha256:digest2,evidenceKind,
    artifactUri:uri, artifactSha256:digest,
    sourceDescription:'Synthetic test record only, not physical evidence',
    criterionReferenceUri:'https://example.org/criteria/' + requirementId,
    verificationProcedureUri:'https://example.org/procedure/' + requirementId,
    claimedOutcome:'PASS', recordedBy:'Synthetic Author'
  };
}

describe('Gate 0 design configuration and evidence authority', () => {
  it('retains two distinct vessel identities and all 15 evidence obligations', () => {
    expect(CONFIGURATION_CATALOG).toHaveLength(2);
    expect(CONFIGURATION_CATALOG[0].approximateLoaM).toBe(2.5);
    expect(CONFIGURATION_CATALOG[1].approximateLoaM).toBe(11.2);
    expect(new Set(CONFIGURATION_CATALOG.map(x=>x.id)).size).toBe(2);
    expect(new Set(Object.keys(EVIDENCE_OBLIGATIONS))).toEqual(
      new Set(ACCEPTANCE_REQUIREMENTS.map(r=>r.id)));
  });
  it('holds with no authoritative geometry or criteria and provides concrete evidence gaps', () => {
    const r = evaluateEvidenceDecision(emptyFixture(),commitSha);
    expect(r.gate0ReadyForExternalReview).toBe(false);
    expect(r.releaseApproved).toBe(false);
    expect(r.missingCriteria).toHaveLength(15);
    expect(r.problems).toContain('NO_AUTHORITATIVE_VESSEL_CONFIGURATION_SELECTED');
    expect(r.findings.every(x=>x.status==='NOT_TESTED' && !x.engineeringAccepted)).toBe(true);
    expect(evidenceDecisionMarkdown(r)).toContain('NOT APPROVED');
  });
  it('allows a complete configuration metadata packet to be reviewed but never automatically approved', () => {
    const r = evaluateEvidenceDecision(fullFixture(),commitSha);
    expect(r.gate0ReadyForExternalReview).toBe(true);
    expect(r.gate0Status).toBe('METADATA_READY_FOR_EXTERNAL_CONFIGURATION_REVIEW');
    expect(r.authoritativeEngineeringBaselineApproved).toBe(false);
    expect(r.allEvidenceIndependentlyAccepted).toBe(false);
    expect(r.releaseApproved).toBe(false);
  });
  it('rejects different hull geometry, mass hash and source commit', () => {
    const f=fullFixture();
    f.evidence=[{...evidence(),hullGeometrySha256:'sha256:'+'d'.repeat(64)}];
    const r=evaluateEvidenceDecision(f,commitSha);
    expect(r.rejectedEvidence.some(x=>x.reason==='GEOMETRY_OR_MASS_REVISION_MISMATCH')).toBe(true);
    expect(r.findings.find(x=>x.requirementId==='HYD-01')?.status).toBe('REJECTED_CONFIGURATION_CONFLICT');
    expect(r.releaseApproved).toBe(false);
    const stale=fullFixture();
    stale.selectedBaseline={...baseline, sourceCommitSha:'e'.repeat(40)};
    expect(evaluateEvidenceDecision(stale,commitSha).problems).toContain('BASELINE_COMMIT_MISMATCH');
  });
  it('quarantines the separate 2.5m portable concept and any cross-variant evidence', () => {
    const f=fullFixture();
    f.selectedBaseline={...baseline,configurationId:'USV01-PORTABLE-CONCEPT-REVA'};
    f.evidence=[evidence()];
    const r=evaluateEvidenceDecision(f,commitSha);
    expect(r.problems).toContain('PORTABLE_REV_A_IS_PROPOSED_AND_NOT_THE_TACTICAL_VESSEL');
    expect(r.quarantinedCriteria.some(x=>x.reason==='CROSS_CONFIGURATION_CRITERION')).toBe(true);
    expect(r.rejectedEvidence.some(x=>x.reason==='CROSS_CONFIGURATION_EVIDENCE')).toBe(true);
    expect(r.gate0ReadyForExternalReview).toBe(false);
  });
  it('recognizes evidence coverage but never treats submitter claims as independent proof', () => {
    const f=fullFixture();
    f.evidence=[evidence(),{...evidence('HYD-01','GZ_STABILITY'),evidenceId:'EV-02'},
      {...evidence('HYD-01','INDEPENDENT_REVIEW'),evidenceId:'EV-03'}];
    const r=evaluateEvidenceDecision(f,commitSha);
    const hydro=r.findings.find(x=>x.requirementId==='HYD-01');
    expect(hydro?.status).toBe('SUBMITTED_UNVERIFIED');
    expect(hydro?.missingEvidenceKinds).toEqual([]);
    expect(r.releaseApproved).toBe(false);
    expect(hydro?.authorityVerified).toBe(false);
  });
  it('reports an explicit AI disagreement without majority-vote resolution', () => {
    const f=fullFixture();f.evidence=[evidence()];
    f.reviews=[
      {reviewId:'REV-CHAT',evidenceId:'EV-01',reviewerRole:'CHATGPT',verdict:'PASS',reviewArtifactUri:uri,reviewArtifactSha256:digest},
      {reviewId:'REV-GEM',evidenceId:'EV-01',reviewerRole:'GEMINI',verdict:'FAIL',reviewArtifactUri:uri,reviewArtifactSha256:digest}
    ];
    const r=evaluateEvidenceDecision(f,commitSha);
    expect(r.problems).toContain('DUAL_AI_DISAGREEMENT');
    expect(r.dualAiDisagreements).toEqual(['EV-01']);
    expect(r.gate0ReadyForExternalReview).toBe(false);
  });
  it('quarantines duplicate evidence, failed trials and malformed external metadata', () => {
    const f=fullFixture();f.evidence=[evidence(),{...evidence(), claimedOutcome:'FAIL'}];
    const r=evaluateEvidenceDecision(f,commitSha);
    expect(r.rejectedEvidence.some(x=>x.reason==='DUPLICATE_EVIDENCE_ID')).toBe(true);
    expect(r.releaseApproved).toBe(false);
    expect(()=>parseEvidenceDecisionInput({...emptyFixture(), unexpected:true})).toThrow();
    expect(()=>parseEvidenceDecisionInput({...emptyFixture(),selectedBaseline:{...baseline,hullGeometryUri:'http://example.org/unsafe'}})).toThrow();
    expect(()=>parseEvidenceDecisionInput({...emptyFixture(),evidence:[{...evidence(),artifactUri:'https://user:pass@example.org/file'}]})).toThrow();
  });
  it('rejects unfrozen criteria and invalid commit identity', () => {
    const f=fullFixture();f.criteria[0]={...criteria[0],declaredFrozenBeforeTest:false};
    const r=evaluateEvidenceDecision(f,'bad');
    expect(r.problems).toContain('CRITERION_NOT_FROZEN'.replace('CRITERION_NOT_FROZEN','INVALID_OR_CONFLICTING_ACCEPTANCE_CRITERIA'));
    expect(r.problems).toContain('INVALID_EVALUATED_COMMIT');
    expect(r.gate0ReadyForExternalReview).toBe(false);
  });
});

describe('Preliminary DC propulsion current and energy screening', () => {
  it('computes optimistic minimum current and endurance without approval', () => {
    const result=screenPowerFeasibility({
      requiredShaftPowerKw:182,usableEnergyKwh:54,busVoltageV:48,
      sourceReference:'Rev 0.4 source assertion, not a vendor-selected power bus'
    });
    expect(result.status).toBe('ARITHMETIC_SCREEN_UNCERTIFIED');
    expect(result.currentLowerBoundA).toBeCloseTo(3791.6666667,5);
    expect(result.enduranceUpperBoundH).toBeCloseTo(0.2967032967,5);
    expect(result.independentlyValidated).toBe(false);
    expect(result.accepted).toBe(false);
  });
  it('does not divide by zero, accept negative power, or accept empty provenance', () => {
    for(const p of [0,-1,NaN,Infinity]){
      expect(screenPowerFeasibility({requiredShaftPowerKw:p,usableEnergyKwh:54,busVoltageV:48,sourceReference:'test'}).status)
        .toBe('INVALID_INPUT');
    }
    expect(screenPowerFeasibility({requiredShaftPowerKw:182,usableEnergyKwh:54,busVoltageV:0,sourceReference:'test'}).status)
      .toBe('INVALID_INPUT');
    expect(screenPowerFeasibility({requiredShaftPowerKw:182,usableEnergyKwh:54,busVoltageV:48,sourceReference:''}).status)
      .toBe('INVALID_INPUT');
  });
});
