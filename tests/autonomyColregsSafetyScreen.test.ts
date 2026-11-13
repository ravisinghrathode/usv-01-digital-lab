import { describe, expect, it } from 'vitest';
import { evaluateAutonomyColregsScreen, type SafetyContext } from '../src/core/verification/AutonomyColregsSafetyScreen.ts';

const base = (): SafetyContext => ({
  evidenceId: 'AUT01-SYNTHETIC-001',
  ownship: { courseDeg: 0, speedKnots: 12, vesselKind: 'POWER_DRIVEN' },
  contacts: [{
    id:'T01',bearingTrueDeg:0,rangeNm:2,courseTrueDeg:180,speedKnots:12,
    vesselKind:'POWER_DRIVEN',trackAgeSeconds:1,rangeStdNm:0.02,bearingStdDeg:1,
    speedStdKnots:0.2,sources:['RADAR','CAMERA']
  }],
  visibility:'IN_SIGHT',lookoutAssessment:'ASSESSED_ADEQUATE',sensorsHealthy:true,
  navigationIntegrityValid:true,propulsionHealthy:true,geofenceValid:true,
  energyReserveAdequate:true,insideOperationalDesignDomain:true,
  narrowChannelOrTrafficScheme:false,linkHealthy:true,humanEmergencyOverride:false,
  stationKeepingApprovedForCurrentRegion:false,recoveryCorridorApprovedAndClear:false,
  limits:{profileId:'SYNTHETIC-NOT-APPROVED',maxTrackAgeSeconds:3,cpaAlertThresholdNm:0.5,
    lookAheadMinutes:30,nearHeadOnDeg:6}
});
const run = (mutate: (x: SafetyContext) => void = () => {}) => {
  const input = base(); mutate(input); return evaluateAutonomyColregsScreen(input);
};
describe('AUT-01 conservative non-actuating safety screen', () => {
  it('detects a reciprocal head-on risk and computes 5-minute TCPA', () => {
    const r=run();
    expect(r.findings[0].encounter).toBe('HEAD_ON_CANDIDATE');
    expect(r.findings[0].cpaNm).toBeCloseTo(0,5);
    expect(r.findings[0].tcpaMinutes).toBeCloseTo(5,5);
    expect(r.findings[0].proximity).toBe('CPA_ALERT');
    expect(r.disposition).toBe('COLLISION_RISK_OPERATOR_ESCALATION');
  });
  it('labels a starboard crossing candidate',()=>{
    const r=run(x=>{x.contacts[0].bearingTrueDeg=45;x.contacts[0].courseTrueDeg=270;});
    expect(r.findings[0].encounter).toBe('CROSSING_GIVE_WAY_CANDIDATE');
  });
  it('labels a port crossing candidate',()=>{
    const r=run(x=>{x.contacts[0].bearingTrueDeg=315;x.contacts[0].courseTrueDeg=90;});
    expect(r.findings[0].encounter).toBe('CROSSING_STAND_ON_CANDIDATE');
  });
  it('prioritizes overtaking over crossing where target stern aspect is known',()=>{
    const r=run(x=>{x.contacts[0].bearingTrueDeg=0;x.contacts[0].courseTrueDeg=0;x.contacts[0].speedKnots=5;});
    expect(r.findings[0].encounter).toBe('OVERTAKING_TARGET_CANDIDATE');
  });
  it('recognizes target overtaking from own aft sector',()=>{
    const r=run(x=>{x.contacts[0].bearingTrueDeg=180;x.contacts[0].courseTrueDeg=0;x.contacts[0].speedKnots=20;});
    expect(r.findings[0].encounter).toBe('BEING_OVERTAKEN_CANDIDATE');
  });
  it('uses Rule 19, not Rule 14, in restricted visibility when not in sight',()=>{
    const r=run(x=>{x.visibility='RESTRICTED_NOT_IN_SIGHT';});
    expect(r.findings[0].encounter).toBe('RESTRICTED_VISIBILITY_RULE_19');
    expect(r.disposition).toBe('DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN');
  });
  it('abstains when visibility is unknown',()=>{
    const r=run(x=>{x.visibility='UNKNOWN';});
    expect(r.findings[0].encounter).toBe('UNDETERMINED');
  });
  it('refers fishing/non-power vessel to Rule 18 and contextual duties',()=>{
    const r=run(x=>{x.contacts[0].vesselKind='FISHING';});
    expect(r.findings[0].encounter).toBe('CONTEXT_DEPENDENT');
    expect(r.findings[0].applicableRuleCandidates).toContain('18');
  });
  it('refers narrow-channel context for human assessment',()=>{
    const r=run(x=>{x.narrowChannelOrTrafficScheme=true;});
    expect(r.findings[0].encounter).toBe('CONTEXT_DEPENDENT');
    expect(r.concerns).toContain('LOCAL_NAVIGATION_RULE_REVIEW_REQUIRED');
  });
  it('does not declare AIS-only track clear',()=>{
    const r=run(x=>{x.contacts[0].sources=['AIS'];});
    expect(r.findings[0].proximity).toBe('UNDETERMINED');
    expect(r.findings[0].concerns).toContain('AIS_ONLY_CANNOT_SUBSTITUTE_LOOKOUT');
  });
  it('flags stale tracks without false safe clearance',()=>{
    const r=run(x=>{x.contacts[0].trackAgeSeconds=5;});
    expect(r.findings[0].proximity).toBe('UNDETERMINED');
    expect(r.findings[0].concerns).toContain('TRACK_STALE_OR_INVALID');
  });
  it('requires characterized uncertainty and handles absent covariance proxies',()=>{
    const r=run(x=>{delete x.contacts[0].rangeStdNm;});
    expect(r.findings[0].conservativeCpaLowerBoundNm).toBeNull();
    expect(r.findings[0].proximity).toBe('UNDETERMINED');
  });
  it('rejects duplicate contact IDs',()=>{
    const r=run(x=>{x.contacts.push({...x.contacts[0]});});
    expect(r.concerns).toContain('DUPLICATE_CONTACT_ID');
    expect(r.disposition).toBe('DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN');
  });
  it('does not accept unsupported or missing vessel kinds',()=>{
    const r=run(x=>{x.contacts[0].vesselKind='UNKNOWN';});
    expect(r.findings[0].concerns).toContain('VESSEL_TYPE_UNVERIFIED');
  });
  it('requires human review for sensing failure',()=>{
    const r=run(x=>{x.sensorsHealthy=false;});
    expect(r.disposition).toBe('DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN');
  });
  it('never blindly returns-to-home or stops thrust when the link is lost',()=>{
    const r=run(x=>{x.linkHealthy=false;});
    expect(r.disposition).toBe('DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN');
    expect(r.thrustCommand).toBeNull();
  });
  it('permits only a non-actuating station-keep candidate with no observed risk',()=>{
    const r=run(x=>{x.linkHealthy=false;x.stationKeepingApprovedForCurrentRegion=true;
      x.contacts[0].bearingTrueDeg=90;x.contacts[0].courseTrueDeg=90;});
    expect(r.disposition).toBe('LINK_LOSS_STATION_KEEP_CANDIDATE');
    expect(r.autonomousManeuverAuthorized).toBe(false);
  });
  it('permits only a non-actuating recovery corridor candidate',()=>{
    const r=run(x=>{x.linkHealthy=false;x.recoveryCorridorApprovedAndClear=true;
      x.contacts[0].bearingTrueDeg=90;x.contacts[0].courseTrueDeg=90;});
    expect(r.disposition).toBe('LINK_LOSS_CORRIDOR_RECOVERY_CANDIDATE');
  });
  it('gives human emergency override highest supervisory priority',()=>{
    const r=run(x=>{x.linkHealthy=false;x.humanEmergencyOverride=true;x.sensorsHealthy=false;});
    expect(r.disposition).toBe('HUMAN_EMERGENCY_OVERRIDE_REQUEST');
  });
  it('keeps absolute actuation and compliance prohibitions in every tested fault state',()=>{
    const transforms: Array<(x: SafetyContext)=>void> = [
      ()=>{},x=>{x.visibility='UNKNOWN';},x=>{x.sensorsHealthy=false;},
      x=>{x.contacts[0].trackAgeSeconds=100;},x=>{x.linkHealthy=false;},
      x=>{x.humanEmergencyOverride=true;},x=>{x.ownship.speedKnots=-1;},
      x=>{x.limits.profileId='';},x=>{x.contacts=[];},
      x=>{x.propulsionHealthy=false;}
    ];
    for(const t of transforms){const r=run(t);
      expect(r.helmCommand).toBeNull();expect(r.thrustCommand).toBeNull();
      expect(r.requiresHumanReview).toBe(true);expect(r.colregsComplianceCertified).toBe(false);
      expect(r.autonomousManeuverAuthorized).toBe(false);expect(r.physicalSafetyValidated).toBe(false);
    }
  });
});
