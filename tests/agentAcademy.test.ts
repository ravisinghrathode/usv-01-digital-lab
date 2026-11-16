import { describe, it, expect } from 'vitest';
import { selectAcademyStudyTransport } from '../src/core/academy/StudyTransportPolicy.ts';
import { CHATGPT_SOL_MODEL } from '../src/core/models/DualSubscriptionRoutingPolicy.ts';
import { validatePilotRequest, sanitizedSubscriptionEnvironment, SAFE_ROLES } from '../src/core/mission-control/SubscriptionCliAdapter.ts';
import { generateKeyPairSync, sign } from 'node:crypto';
import {
  ACADEMY_VERSION, buildAgentAcademyCurricula, evaluateAcademicCriteria,
  type AssessmentEvidence, type SignedQualificationRecord
} from '../src/core/academy/AgentAcademy.ts';
import {
  academyEvidenceBytes, verifyAcademyQualification
} from '../src/core/academy/QualificationVerifier.ts';

const curricula = buildAgentAcademyCurricula();
const sha40 = 'a'.repeat(40);
const digest = 'b'.repeat(64);

function goodEvidence(id='A05'): AssessmentEvidence {
  const curriculum = curricula.find(c => c.canonicalId === id)!;
  return {
    canonicalId: id, curriculumVersion: ACADEMY_VERSION, sourceSha: sha40,
    sourceProofs: curriculum.requiredSources.map(s => ({
      id:s.id, editionVerified:true, rightsVerified:true, applicabilityVerified:true,
      provenanceSha256:digest
    })),
    foundation:{ scorePercent:90, unseen:true, attemptSha256:digest },
    specialist:{ scorePercent:95, unseen:true, attemptSha256:digest },
    safety:{ passed:3, total:3, criticalFailures:0, attemptSha256:digest },
    tools:{ passed:curriculum.practicalTasks.toolEvidence.length,
      total:curriculum.practicalTasks.toolEvidence.length, attemptSha256:digest },
    independentReference:{ passed:true, referenceSha256:digest, assessmentSha256:digest }
  };
}

function signedRecord(evidence:AssessmentEvidence) {
  const reviewer = generateKeyPairSync('ed25519');
  const director = generateKeyPairSync('ed25519');
  const record: SignedQualificationRecord = {
    evidence, reviewer:{ identity:'Independent human examiner', qualification:'Documented domain examiner',
      signatureBase64:'' },
    director:{ identity:'Human engineering director', signatureBase64:'' }
  };
  const payload = academyEvidenceBytes(record);
  record.reviewer.signatureBase64 = sign(null,payload,reviewer.privateKey).toString('base64');
  record.director.signatureBase64 = sign(null,payload,director.privateKey).toString('base64');
  return {
    record,
    reviewerPem:reviewer.publicKey.export({type:'spki',format:'pem'}).toString(),
    directorPem:director.publicKey.export({type:'spki',format:'pem'}).toString()
  };
}

describe('USV-01 Agent Academy source-linked curricula', () => {
  it('requests Sol on all 26 research study workers when explicitly enabled, without fabricating qualification', () => {
    const env:NodeJS.ProcessEnv = {
      AI_REVIEW_PROVIDER:'codex_cli', USV_SUBSCRIPTION_PILOT:'enabled',
      USV_ALLOW_PAID_AI_API:'false',USV_LAB_SCOPE:'RESEARCH_ONLY',
      USV_DUAL_PROVIDER_ROUTING:'enabled'
    };
    expect(curricula).toHaveLength(26);
    for(const c of curricula){
      const route=selectAcademyStudyTransport(c,env);
      expect(route.agentId).toBe(c.runtimeId);
      expect(route.modelOverride).toBe(CHATGPT_SOL_MODEL);
      expect(route.modelIdentityVerified).toBe(false);
      const args=SAFE_ROLES.worker.args('Study draft','/tmp/response.json',route.modelOverride);
      expect(args).toContain('gpt-6.1-sol');
    }
    const missingPilot=selectAcademyStudyTransport(curricula[0],{
      ...env, USV_SUBSCRIPTION_PILOT:'disabled'
    });
    expect(missingPilot.modelOverride).toBeUndefined();
    expect(() => selectAcademyStudyTransport({...curricula[0],runtimeId:'A26'} as any,env))
      .toThrow(/RUNTIME_AGENT_ID_MISMATCH/);
    const scrub=sanitizedSubscriptionEnvironment({PATH:'/usr/bin',OPENAI_API_KEY:'secret',
      GEMINI_API_KEY:'secret',USV_ALLOW_PAID_AI_API:'true'});
    expect(scrub.OPENAI_API_KEY).toBeUndefined();
    expect(scrub.GEMINI_API_KEY).toBeUndefined();
    expect(scrub.USV_ALLOW_PAID_AI_API).toBe('false');
  });
  it('creates exactly 26 non-duplicate role-specific curricula directly from the live registry', () => {
    expect(curricula.map(c => c.canonicalId)).toEqual(Array.from({length:26}, (_,i)=>
      'A' + String(i+1).padStart(2,'0')));
    expect(new Set(curricula.map(c => c.runtimeId)).size).toBe(26);
    for(const c of curricula) {
      expect(c.foundationModules.length).toBeGreaterThanOrEqual(4);
      expect(c.specialistOutcomes.length).toBeGreaterThan(2);
      expect(c.requiredSources.length).toBeGreaterThan(0);
      expect(c.practicalTasks.blindIndependentReference.length).toBeGreaterThan(20);
      expect(c.status).toBe('CURRICULUM_DEFINED_NOT_TRAINED');
      expect(c.requiredSources.every(s => s.access === 'UNVERIFIED_NOT_INGESTED')).toBe(true);
    }
  });

  it('requires strict scores, reference evidence, zero critical failures and mandatory tools', () => {
    const c=curricula.find(c => c.canonicalId==='A05')!;
    const good=goodEvidence();
    expect(evaluateAcademicCriteria(c,good,sha40,true,true,true).status)
      .toBe('QUALIFIED_SUPERVISED_RESEARCH_ONLY');
    expect(evaluateAcademicCriteria(c,{...good,specialist:{...good.specialist,scorePercent:94}},sha40,true,true,true).status)
      .toBe('HOLD_UNQUALIFIED');
    expect(evaluateAcademicCriteria(c,{...good,safety:{...good.safety,criticalFailures:1}},sha40,true,true,true).status)
      .toBe('HOLD_UNQUALIFIED');
    expect(evaluateAcademicCriteria(c,{...good,tools:{...good.tools,passed:0}},sha40,true,true,true).status)
      .toBe('HOLD_UNQUALIFIED');
    expect(evaluateAcademicCriteria(c,{...good,sourceProofs:[]},sha40,true,true,true).status)
      .toBe('HOLD_UNQUALIFIED');
    expect(evaluateAcademicCriteria(c,{...good,sourceSha:'c'.repeat(40)},sha40,true,true,true).status)
      .toBe('HOLD_UNQUALIFIED');
    expect(evaluateAcademicCriteria(c,undefined,sha40,false,false,false).status)
      .toBe('HOLD_UNQUALIFIED');
  });

  it('cryptographically verifies distinct external signatures, rejects forgery and preserves no-release constraints', () => {
    const c=curricula.find(c => c.canonicalId==='A05')!;
    const {record,reviewerPem,directorPem}=signedRecord(goodEvidence());
    const ok=verifyAcademyQualification(c,record,sha40,reviewerPem,directorPem);
    expect(ok.status).toBe('QUALIFIED_SUPERVISED_RESEARCH_ONLY');
    expect(ok.engineeringReleaseApproved).toBe(false);
    expect(ok.actuatorControlAuthorized).toBe(false);
    expect(verifyAcademyQualification(c,record,sha40,reviewerPem,reviewerPem).status)
      .toBe('HOLD_UNQUALIFIED');
    expect(verifyAcademyQualification(c,record,sha40,undefined,directorPem).status)
      .toBe('HOLD_UNQUALIFIED');
    expect(verifyAcademyQualification(c,record,'0'.repeat(40),reviewerPem,directorPem).status)
      .toBe('HOLD_UNQUALIFIED');
    const forged = structuredClone(record);
    forged.evidence.foundation.scorePercent = 100;
    expect(verifyAcademyQualification(c,forged,sha40,reviewerPem,directorPem).status)
      .toBe('HOLD_UNQUALIFIED');
    const relabel=structuredClone(record);
    relabel.reviewer.qualification='Unverified replacement qualification';
    expect(verifyAcademyQualification(c,relabel,sha40,reviewerPem,directorPem).status)
      .toBe('HOLD_UNQUALIFIED');
    const directorRelabel=structuredClone(record);
    directorRelabel.director.identity='A different named approver';
    expect(verifyAcademyQualification(c,directorRelabel,sha40,reviewerPem,directorPem).status)
      .toBe('HOLD_UNQUALIFIED');
    const selfReviewed=structuredClone(record);
    selfReviewed.director.identity=selfReviewed.reviewer.identity;
    expect(verifyAcademyQualification(c,selfReviewed,sha40,reviewerPem,directorPem).status)
      .toBe('HOLD_UNQUALIFIED');
  });
});
