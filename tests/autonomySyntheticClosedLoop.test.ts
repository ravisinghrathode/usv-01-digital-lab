import { describe,it,expect } from 'vitest';
import { runSyntheticClosedLoop, type SyntheticClosedLoopCase } from '../src/core/verification/AutonomySyntheticClosedLoop.ts';
const base=():SyntheticClosedLoopCase=>({
 scenarioId:'AUT01-CLOSEDLOOP-SYNTHETIC',physicsProfileId:'SYNTHETIC-PLANE-DEMO-V1',
 own:{eastNm:0,northNm:0,headingTrueDeg:0,speedKnots:12},
 traffic:[{id:'V1',eastNm:0,northNm:2,courseTrueDeg:180,speedKnots:12}],
 durationSeconds:360,stepSeconds:10,turnRateLimitDegPerSecond:0.6,
 riskSeparationNm:0.12,policy:'HOLD_COURSE_SYNTHETIC',currentEastKnots:0,currentNorthKnots:0
});
const simulate=(edit:(s:SyntheticClosedLoopCase)=>void=()=>{})=>{
 const s=base();edit(s);return runSyntheticClosedLoop(s);
};
describe('AUT-01 simplified synthetic closed-loop counterfactual and swept separation',()=>{
 it('detects collision for opposing head-on hold-course policy',()=>{
  const r=simulate();
  expect(r.status).toBe('SYNTHETIC_ENVELOPE_FAIL');
  expect(r.violations).toContain('SYNTHETIC_CONTACT_SEPARATION_BREACH');
  expect(r.minSweptSeparationNm).toBeCloseTo(0,7);
 });
 it('uses feedback from the non-actuating screen to test a counterfactual turn',()=>{
  const r=simulate(s=>{s.policy='HEAD_ON_STARBOARD_DEMO_SYNTHETIC';});
  expect(r.trace.some(t=>t.hypotheticalTurnTriggered)).toBe(true);
  expect(r.trace[0].ownHeadingTrueDeg).toBeGreaterThan(0);
  expect(r.trace.at(-1)!.hypotheticalTargetHeadingDeg).toBe(30);
  expect(r.status).toBe('SYNTHETIC_ENVELOPE_PASS_UNCERTIFIED');
  expect(r.minSweptSeparationNm).toBeGreaterThan(0.12);
 });
 it('does not assume default zero thrust or safe navigation when link lost',()=>{
  const r=simulate(s=>{s.linkLossAtSeconds=0;s.policy='HEAD_ON_STARBOARD_DEMO_SYNTHETIC';});
  expect(r.trace.every(p=>!p.hypotheticalTurnTriggered)).toBe(true);
  expect(r.trace[0].advisoryDisposition).toBe('DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN');
  expect(r.navigationReleaseAuthorized).toBe(false);
 });
 it('detects a mid-step near miss even when sampled endpoints are far apart',()=>{
  const r=simulate(s=>{s.stepSeconds=120;});
  expect(r.minSweptSeparationNm).toBeCloseTo(0,7);
  expect(r.status).toBe('SYNTHETIC_ENVELOPE_FAIL');
 });
 it('preserves sampled-sweep CPA of constant course under changed time resolution',()=>{
  const a=simulate(s=>{s.stepSeconds=5;});
  const b=simulate(s=>{s.stepSeconds=100;});
  expect(a.minSweptSeparationNm).toBeCloseTo(b.minSweptSeparationNm!,7);
 });
 it('detects geofence exit in a starboard demonstration policy',()=>{
  const r=simulate(s=>{s.policy='HEAD_ON_STARBOARD_DEMO_SYNTHETIC';s.geofence={
    eastMinNm:-0.01,eastMaxNm:0.01,northMinNm:-1,northMaxNm:2
  };});
  expect(r.violations).toContain('SYNTHETIC_GEOFENCE_EXIT');
 });
 it('detects current-driven geofence excursions, not just water-relative motion',()=>{
  const r=simulate(s=>{s.currentEastKnots=10;s.geofence={
    eastMinNm:-0.2,eastMaxNm:0.2,northMinNm:-1,northMaxNm:3
  };});
  expect(r.violations).toContain('SYNTHETIC_GEOFENCE_EXIT');
 });
 it('rejects duplicate target IDs',()=>{
  expect(simulate(s=>{s.traffic.push({...s.traffic[0]});}).status).toBe('INVALID_SYNTHETIC_INPUT');
 });
 it('rejects non-finite or unbounded synthetic physics inputs',()=>{
  expect(simulate(s=>{s.turnRateLimitDegPerSecond=NaN;}).status).toBe('INVALID_SYNTHETIC_INPUT');
  expect(simulate(s=>{s.stepSeconds=360;}).status).toBe('INVALID_SYNTHETIC_INPUT');
  expect(simulate(s=>{s.physicsProfileId='APPROVED-PHYSICS';}).status).toBe('INVALID_SYNTHETIC_INPUT');
 });
 it('rejects missing target evidence instead of asserting empty water is safe',()=>{
  expect(simulate(s=>{s.traffic=[];}).status).toBe('INVALID_SYNTHETIC_INPUT');
 });
 it('captures multiple contact geometry without granting multi-target planning authority',()=>{
  const r=simulate(s=>{s.traffic.push({id:'V2',eastNm:1,northNm:1,courseTrueDeg:90,speedKnots:6});});
  expect(r.trace.length).toBeGreaterThan(0);
  expect(r.trace[0].advisoryDisposition).toBe('DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN');
  expect(r.navigationReleaseAuthorized).toBe(false);
 });
 it('rejects unsupported or invalid scenario boundaries',()=>{
  expect(simulate(s=>{s.durationSeconds=-1;}).status).toBe('INVALID_SYNTHETIC_INPUT');
  expect(simulate(s=>{s.geofence={eastMinNm:2,eastMaxNm:1,northMinNm:0,northMaxNm:1};}).status).toBe('INVALID_SYNTHETIC_INPUT');
 });
 it('does not emit a physical helm/thrust output or a COLREG certificate',()=>{
  const r=simulate(s=>{s.policy='HEAD_ON_STARBOARD_DEMO_SYNTHETIC';});
  expect(r.simulatedFeedbackLoop).toBe(true);
  expect(r.hullDynamicsValidated).toBe(false);
  expect(r.sensorsValidated).toBe(false);
  expect(r.realTimeRuntimeValidated).toBe(false);
  expect(r.navigationReleaseAuthorized).toBe(false);
  expect(r.colregsComplianceCertified).toBe(false);
  expect(r.helmCommand).toBeNull();
  expect(r.thrustCommand).toBeNull();
 });
});
