import { describe, it, expect } from 'vitest';
import { evaluateAutonomyColregsScreen, type SafetyContext } from '../src/core/verification/AutonomyColregsSafetyScreen.ts';
import { compileSensorEvidenceFrame, type SensorEvidenceLimits, type SensorObservation } from '../src/core/verification/AutonomySensorEvidence.ts';
import { evaluateAutonomySilReplay, type SilStep } from '../src/core/verification/AutonomySilReplay.ts';
const base=():SafetyContext=>({
 evidenceId:'SYNTHETIC-BASE',ownship:{courseDeg:0,speedKnots:12,vesselKind:'POWER_DRIVEN'},
 contacts:[{id:'T01',bearingTrueDeg:0,rangeNm:2,courseTrueDeg:180,speedKnots:12,vesselKind:'POWER_DRIVEN',
  trackAgeSeconds:1,rangeStdNm:0.01,bearingStdDeg:1,speedStdKnots:0.1,sources:['RADAR','CAMERA']}],
 headingAspectVerified:true,visibility:'IN_SIGHT',lookoutAssessment:'ASSESSED_ADEQUATE',sensorsHealthy:true,
 navigationIntegrityValid:true,propulsionHealthy:true,geofenceValid:true,energyReserveAdequate:true,
 insideOperationalDesignDomain:true,narrowChannelOrTrafficScheme:false,linkHealthy:true,
 humanEmergencyOverride:false,stationKeepingApprovedForCurrentRegion:false,recoveryCorridorApprovedAndClear:false,
 limits:{profileId:'SYNTHETIC',maxTrackAgeSeconds:3,cpaAlertThresholdNm:0.5,lookAheadMinutes:30,nearHeadOnDeg:6}
});
const epoch=100_000;
const limits=():SensorEvidenceLimits=>({profileId:'SYNTHETIC-SENSOR-CONTRACT',
  maxObservationAgeMs:3000,maxCrossSensorAgeMs:1000,
  maxRangeDifferenceNm:0.1,maxBearingDifferenceDeg:5,maxCourseDifferenceDeg:10,maxSpeedDifferenceKnots:2});
const radar=():SensorObservation=>({targetId:'T01',source:'RADAR',observedAtMs:epoch-500,
 bearingTrueDeg:0,rangeNm:2,courseTrueDeg:180,speedKnots:12,
 rangeStdNm:0.02,bearingStdDeg:1,speedStdKnots:0.2,vesselKind:'POWER_DRIVEN'});
const camera=():SensorObservation=>({...radar(),source:'CAMERA',bearingTrueDeg:1,rangeNm:2.02});
const evaluate=(readings:SensorObservation[],lim=limits())=>compileSensorEvidenceFrame(base(),readings,epoch,lim);
const frame=(atMs:number,mutate:(v:SafetyContext)=>void=()=>{}):SilStep=>{
 const c=base();c.evidenceId=`STEP-${atMs}`;mutate(c);
 return {atMs,context:c,simulatedAbortAvailable:true};
};
const replay=(steps:SilStep[])=>evaluateAutonomySilReplay({id:'AUT-SIL-REGRESSION',inputProfileReference:'SYNTHETIC',maxEvidenceGapMs:1000,steps});

describe('AUT-01 non-fusing synthetic sensor evidence gateway',()=>{
 it('accepts internally consistent radar and camera for advisory screening only',()=>{
   const r=evaluate([radar(),camera()]);
   expect(r.tracks[0].verdict).toBe('CANDIDATE_NON_CERTIFIED');
   expect(r.context.sensorsHealthy).toBe(true);
   expect(r.context.contacts[0].sources).toEqual(['RADAR','CAMERA']);
   expect(evaluateAutonomyColregsScreen(r.context).findings[0].encounter).toBe('HEAD_ON_CANDIDATE');
   expect(r.eligibleForNavigationControl).toBe(false);
   expect(r.isCalibratedOrFused).toBe(false);
 });
 it('rejects stale measurements instead of asserting clear water',()=>{
   const x=radar();x.observedAtMs=epoch-4000;
   const r=evaluate([x]);
   expect(r.tracks[0].concerns).toContain('STALE_OR_FUTURE_SENSOR_SAMPLE');
   expect(r.context.sensorsHealthy).toBe(false);
   expect(evaluateAutonomyColregsScreen(r.context).disposition).toBe('DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN');
 });
 it('rejects future-dated sensor evidence',()=>{const x=radar();x.observedAtMs=epoch+1;
   expect(evaluate([x]).tracks[0].concerns).toContain('STALE_OR_FUTURE_SENSOR_SAMPLE');
 });
 it('refuses AIS-only as proof of lookout',()=>{const x=radar();x.source='AIS';
   expect(evaluate([x]).tracks[0].concerns).toContain('AIS_ONLY_NOT_INDEPENDENT_LOOKOUT');
 });
 it('rejects contradictions in range',()=>{const x=camera();x.rangeNm=5;
   const r=evaluate([radar(),x]);expect(r.tracks[0].concerns).toContain('CROSS_SENSOR_CONTRADICTION');
   expect(r.context.contacts).toHaveLength(0);
 });
 it('rejects contradictory target course/speed',()=>{const x=camera();x.courseTrueDeg=90;x.speedKnots=30;
   expect(evaluate([radar(),x]).tracks[0].concerns).toContain('CROSS_SENSOR_CONTRADICTION');
 });
 it('correctly wraps 359 vs 1 degrees at north',()=>{const a=radar();a.bearingTrueDeg=359;const b=camera();b.bearingTrueDeg=1;
   expect(evaluate([a,b]).tracks[0].verdict).toBe('CANDIDATE_NON_CERTIFIED');
 });
 it('rejects cross-source timestamp skew',()=>{const x=camera();x.observedAtMs=epoch-2500;
   expect(evaluate([radar(),x]).tracks[0].concerns).toContain('CROSS_SENSOR_TIME_SKEW');
 });
 it('rejects duplicate measurements from the same source',()=>{
   expect(evaluate([radar(),radar()]).tracks[0].concerns).toContain('DUPLICATE_SOURCE_FOR_TRACK');
 });
 it('rejects vessel class not established',()=>{const x=radar();x.vesselKind='UNKNOWN';
   expect(evaluate([x]).tracks[0].concerns).toContain('VESSEL_CLASSIFICATION_UNKNOWN');
 });
 it('rejects nonpositive uncertainty estimates',()=>{const x=radar();x.rangeStdNm=0;
   expect(evaluate([x]).tracks[0].concerns).toContain('INVALID_OR_UNCALIBRATED_OBSERVATION_FIELDS');
 });
 it('does not confuse no sensor contacts with safe open water',()=>{
   const r=evaluate([]);expect(r.frameConcerns).toContain('NO_SENSOR_OBSERVATIONS');
   expect(r.context.sensorsHealthy).toBe(false);
   expect(evaluateAutonomyColregsScreen(r.context).disposition).toBe('DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN');
 });
 it('rejects an untraceable evidence profile',()=>{const l=limits();l.profileId='';
   expect(evaluate([radar()],l).tracks[0].verdict).toBe('REJECTED');
 });
 it('cannot hide an invalid contact among valid ones',()=>{
   const bad={...camera(),targetId:'T02',observedAtMs:epoch-10000};
   const r=evaluate([radar(),bad]);
   expect(r.context.contacts).toHaveLength(1);
   expect(r.context.sensorsHealthy).toBe(false);
   expect(evaluateAutonomyColregsScreen(r.context).disposition).toBe('DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN');
 });
 it('rejects classification disagreements',()=>{const x=camera();x.vesselKind='FISHING';
   expect(evaluate([radar(),x]).tracks[0].verdict).toBe('REJECTED');
 });
});

describe('AUT-01 bounded synthetic SIL replay',()=>{
 it('records a head-on collision escalation but never acts',()=>{
   const r=replay([frame(100)]);
   expect(r.status).toBe('SYNTHETIC_SCREEN_PASS');
   expect(r.observations[0].latch).toBe('OPERATOR_ESCALATION');
   expect(r.observations[0].screen.thrustCommand).toBeNull();
   expect(r.autonomyReleaseAuthorized).toBe(false);
 });
 it('does not automatically clear an existing operator escalation',()=>{
   const r=replay([frame(100),frame(200,x=>{x.contacts[0].bearingTrueDeg=90;x.contacts[0].courseTrueDeg=90;})]);
   expect(r.observations[1].latch).toBe('OPERATOR_ESCALATION');
 });
 it('latches a fail-safe hold after a gap in evidence timestamps',()=>{
   const r=replay([frame(100),frame(2000)]);
   expect(r.status).toBe('SYNTHETIC_SCREEN_FAIL');
   expect(r.observations[1].defects).toContain('SENSOR_EVIDENCE_GAP');
   expect(r.finalLatch).toBe('SAFETY_HOLD_LATCHED');
 });
 it('does not rearm automatically when radio and sensors recover',()=>{
   const r=replay([frame(100,x=>{x.linkHealthy=false;}),frame(200,x=>{x.contacts[0].bearingTrueDeg=90;x.contacts[0].courseTrueDeg=90;})]);
   expect(r.observations[0].latch).toBe('SAFETY_HOLD_LATCHED');
   expect(r.observations[1].latch).toBe('SAFETY_HOLD_LATCHED');
 });
 it('prioritizes emergency operator intervention and latches it',()=>{
   const r=replay([frame(100,x=>{x.humanEmergencyOverride=true;}),frame(200)]);
   expect(r.finalLatch).toBe('EMERGENCY_REVIEW_LATCHED');
 });
 it('rejects invalid or reversed timestamps',()=>{
   const r=replay([frame(200),frame(100)]);
   expect(r.status).toBe('SYNTHETIC_SCREEN_FAIL');
   expect(r.observations[1].defects).toContain('NON_MONOTONIC_TIME');
 });
 it('rejects missing or duplicated trace provenance',()=>{
   const a=frame(100),b=frame(200);b.context.evidenceId=a.context.evidenceId;
   expect(replay([a,b]).observations[1].defects).toContain('DUPLICATE_EVIDENCE_ID');
 });
 it('fails its own test if simulation abort is absent',()=>{
   const a=frame(100);a.simulatedAbortAvailable=false;
   expect(replay([a]).observations[0].defects).toContain('SIMULATED_ABORT_UNAVAILABLE');
 });
 it('keeps link-loss station keeping strictly in advisory/review mode',()=>{
   const r=replay([frame(100,x=>{x.linkHealthy=false;x.stationKeepingApprovedForCurrentRegion=true;
      x.contacts[0].bearingTrueDeg=90;x.contacts[0].courseTrueDeg=90;})]);
   expect(r.observations[0].disposition).toBe('LINK_LOSS_STATION_KEEP_CANDIDATE');
   expect(r.finalLatch).toBe('LINK_LOSS_REVIEW');
   expect(r.helmCommand).toBeNull();
 });
 it('keeps empty-contact link loss in degraded hold rather than station keeping',()=>{
   const r=replay([frame(100,x=>{x.contacts=[];x.linkHealthy=false;x.stationKeepingApprovedForCurrentRegion=true;})]);
   expect(r.observations[0].disposition).toBe('DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN');
   expect(r.finalLatch).toBe('SAFETY_HOLD_LATCHED');
 });
 it('escalates unresolved multi-target risk',()=>{
   const r=replay([frame(100,x=>{x.contacts.push({...x.contacts[0],id:'T02',bearingTrueDeg:20,courseTrueDeg:225});})]);
   expect(r.observations[0].screen.concerns).toContain('MULTI_CONTACT_CONSTRAINTS_UNRESOLVED');
   expect(r.finalLatch).toBe('SAFETY_HOLD_LATCHED');
 });
 it('detects deliberately false expected outcomes',()=>{
   const x=frame(100);x.expectedLatch='OBSERVING';
   expect(replay([x]).observations[0].defects).toContain('EXPECTED_LATCH_MISMATCH');
 });
 it('rejects empty scenario traces as non-evidence',()=>{
   const r=replay([]);expect(r.status).toBe('SYNTHETIC_SCREEN_FAIL');
   expect(r.defects).toContain('EMPTY_REPLAY');
 });
 it('never claims navigation, hardware or seagoing safety validation',()=>{
   const r=replay([frame(100),frame(200,x=>{x.sensorsHealthy=false;})]);
   expect(r.hardwareValidated).toBe(false);expect(r.collisionAvoidanceValidated).toBe(false);
   for(const obs of r.observations){
      expect(obs.screen.colregsComplianceCertified).toBe(false);
      expect(obs.screen.autonomousManeuverAuthorized).toBe(false);
      expect(obs.screen.helmCommand).toBeNull();
      expect(obs.screen.thrustCommand).toBeNull();
   }
 });
});
