/**
 * AUT-01 SYNTHETIC CLOSED-LOOP SIL DEMONSTRATOR.
 *
 * Deliberately simplified planar ground-motion model, hypothetical turn policy
 * and perfect synthetic observations. No hull hydrodynamics, yaw inertia,
 * propulsion control, sensor fusion, maritime approval, or physical actuation.
 * NEVER connect this module to GNC, ROS, navigation equipment or actuators.
 */
import { evaluateAutonomyColregsScreen, type SafetyContext } from './AutonomyColregsSafetyScreen.ts';
export interface SyntheticOwnship {
  eastNm: number; northNm: number; headingTrueDeg: number; speedKnots: number;
}
export interface SyntheticTraffic {
  id: string; eastNm: number; northNm: number; courseTrueDeg: number; speedKnots: number;
}
export interface SyntheticClosedLoopCase {
  scenarioId: string;
  /** An explicitly non-approved physics profile, not calibrated vessel dynamics. */
  physicsProfileId: string;
  own: SyntheticOwnship;
  traffic: SyntheticTraffic[];
  durationSeconds: number;
  stepSeconds: number;
  turnRateLimitDegPerSecond: number;
  riskSeparationNm: number;
  /** Demonstration policies only; never helm setpoints. */
  policy: 'HOLD_COURSE_SYNTHETIC' | 'HEAD_ON_STARBOARD_DEMO_SYNTHETIC';
  /** Constant ground drift from current, not a validated ocean model. */
  currentEastKnots: number;
  currentNorthKnots: number;
  geofence?: {eastMinNm:number;eastMaxNm:number;northMinNm:number;northMaxNm:number};
  linkLossAtSeconds?: number;
}
export interface SyntheticTracePoint {
  timeSeconds: number;
  ownEastNm: number; ownNorthNm: number; ownHeadingTrueDeg: number;
  hypotheticalTargetHeadingDeg: number;
  nearestTargetNm: number;
  advisoryDisposition: string;
  hypotheticalTurnTriggered: boolean;
  evidenceId: string;
}
export interface SyntheticClosedLoopResult {
  scenarioId: string;
  status: 'SYNTHETIC_ENVELOPE_PASS_UNCERTIFIED' | 'SYNTHETIC_ENVELOPE_FAIL' | 'INVALID_SYNTHETIC_INPUT';
  minSweptSeparationNm: number | null;
  violations: string[];
  trace: SyntheticTracePoint[];
  simulatedFeedbackLoop: true;
  hullDynamicsValidated: false;
  sensorsValidated: false;
  realTimeRuntimeValidated: false;
  navigationReleaseAuthorized: false;
  colregsComplianceCertified: false;
  helmCommand: null;
  thrustCommand: null;
}
const finite=(x:number)=>typeof x==='number'&&Number.isFinite(x);
const normalize=(x:number)=>((x%360)+360)%360;
const signed=(x:number)=>((normalize(x)+180)%360)-180;
const vector=(speedKnots:number,headingDeg:number,dtSeconds:number)=>({
  eastNm:speedKnots*Math.sin(headingDeg*Math.PI/180)*dtSeconds/3600,
  northNm:speedKnots*Math.cos(headingDeg*Math.PI/180)*dtSeconds/3600
});
const validPosition=(v:{eastNm:number;northNm:number})=>finite(v?.eastNm)&&finite(v?.northNm);
const dist=(e:number,n:number)=>Math.hypot(e,n);
const sampleWithinGeofence=(p:SyntheticOwnship,c:SyntheticClosedLoopCase['geofence'])=>
  !c||(p.eastNm>=c.eastMinNm &&p.eastNm<=c.eastMaxNm&&
       p.northNm>=c.northMinNm&&p.northNm<=c.northMaxNm);
const sweptDistance=(r0e:number,r0n:number,r1e:number,r1n:number)=>{
  const de=r1e-r0e,dn=r1n-r0n,d2=de*de+dn*dn;
  const f=d2<1e-16?0:Math.max(0,Math.min(1,-(r0e*de+r0n*dn)/d2));
  return dist(r0e+f*de,r0n+f*dn);
};
function valid(c:SyntheticClosedLoopCase):boolean {
  if(!c?.scenarioId?.trim() || !c.physicsProfileId?.startsWith('SYNTHETIC-'))return false;
  const a=c.own;
  if(!validPosition(a)||!finite(a.headingTrueDeg)||a.headingTrueDeg<0||a.headingTrueDeg>360||
    !finite(a.speedKnots)||a.speedKnots<0)return false;
  if(!finite(c.durationSeconds)||c.durationSeconds<=0||c.durationSeconds>3600||
    !finite(c.stepSeconds)||c.stepSeconds<0.1||c.stepSeconds>120||
    !finite(c.turnRateLimitDegPerSecond)||c.turnRateLimitDegPerSecond<=0||
    c.turnRateLimitDegPerSecond>5||
    !finite(c.riskSeparationNm)||c.riskSeparationNm<=0||
    !finite(c.currentEastKnots)||!finite(c.currentNorthKnots)||
    !['HOLD_COURSE_SYNTHETIC','HEAD_ON_STARBOARD_DEMO_SYNTHETIC'].includes(c.policy)||
    !Array.isArray(c.traffic)||c.traffic.length===0||c.traffic.length>25)return false;
  if(c.linkLossAtSeconds!==undefined&&(!finite(c.linkLossAtSeconds)||
      c.linkLossAtSeconds<0||c.linkLossAtSeconds>c.durationSeconds))return false;
  if(c.geofence && (!finite(c.geofence.eastMinNm)||!finite(c.geofence.eastMaxNm)||
    !finite(c.geofence.northMinNm)||!finite(c.geofence.northMaxNm)||
    c.geofence.eastMaxNm<=c.geofence.eastMinNm||
    c.geofence.northMaxNm<=c.geofence.northMinNm))return false;
  const seen=new Set<string>();
  for(const t of c.traffic){
    if(!t?.id?.trim()||seen.has(t.id)||!validPosition(t)||
      !finite(t.courseTrueDeg)||t.courseTrueDeg<0||t.courseTrueDeg>360||
      !finite(t.speedKnots)||t.speedKnots<0)return false;
    seen.add(t.id);
  }
  return true;
}
const result=(scenarioId:string,status:SyntheticClosedLoopResult['status'],minSweptSeparationNm:number|null,
 violations:string[],trace:SyntheticTracePoint[]):SyntheticClosedLoopResult=>({
  scenarioId,status,minSweptSeparationNm,violations,trace,simulatedFeedbackLoop:true,
  hullDynamicsValidated:false,sensorsValidated:false,realTimeRuntimeValidated:false,
  navigationReleaseAuthorized:false,colregsComplianceCertified:false,
  helmCommand:null,thrustCommand:null
});
function contextAt(c:SyntheticClosedLoopCase,own:SyntheticOwnship,
 traffic:SyntheticTraffic[],t:number):SafetyContext {
  const toDegrees=(x:number)=>normalize(x*180/Math.PI);
  return {
    evidenceId:`${c.scenarioId}:SIM-T${t.toFixed(3)}`,
    ownship:{courseDeg:own.headingTrueDeg,speedKnots:own.speedKnots,vesselKind:'POWER_DRIVEN'},
    contacts:traffic.map(x=>{
      const east=x.eastNm-own.eastNm,north=x.northNm-own.northNm;
      return {id:x.id,bearingTrueDeg:toDegrees(Math.atan2(east,north)),
        rangeNm:Math.max(1e-10,dist(east,north)),courseTrueDeg:x.courseTrueDeg,
        speedKnots:x.speedKnots,vesselKind:'POWER_DRIVEN' as const,
        trackAgeSeconds:0,rangeStdNm:0.005,bearingStdDeg:0.5,speedStdKnots:0.1,
        sources:['RADAR','CAMERA'] as const};
    }).map(x=>({...x,sources:[...x.sources]})),
    headingAspectVerified:true,visibility:'IN_SIGHT',lookoutAssessment:'ASSESSED_ADEQUATE',
    sensorsHealthy:true,navigationIntegrityValid:true,propulsionHealthy:true,
    geofenceValid:sampleWithinGeofence(own,c.geofence),energyReserveAdequate:true,
    insideOperationalDesignDomain:true,narrowChannelOrTrafficScheme:false,
    linkHealthy:c.linkLossAtSeconds===undefined || t<c.linkLossAtSeconds,
    humanEmergencyOverride:false,stationKeepingApprovedForCurrentRegion:false,
    recoveryCorridorApprovedAndClear:false,
    limits:{profileId:'SYNTHETIC-CLOSED-LOOP-ONLY',maxTrackAgeSeconds:1,
      cpaAlertThresholdNm:c.riskSeparationNm,lookAheadMinutes:30,nearHeadOnDeg:6}
  };
}
/**
 * Evaluates a toy feedback policy against an independent geometric minimum
 * separation monitor. The advisory screen neither supplies nor approves helm.
 */
export function runSyntheticClosedLoop(c:SyntheticClosedLoopCase):SyntheticClosedLoopResult {
  if(!valid(c))return result(c?.scenarioId??'INVALID','INVALID_SYNTHETIC_INPUT',null,
    ['INVALID_OR_NON_SYNTHETIC_SCENARIO'],[]);
  let own={...c.own};
  let traffic=c.traffic.map(x=>({...x}));
  let minSep=Infinity;const violations:string[]=[];const trace:SyntheticTracePoint[]=[];
  let demonstrationHeading:number|null=null;
  for(let t=0;t<c.durationSeconds;){
    const dt=Math.min(c.stepSeconds,c.durationSeconds-t);
    const ctx=contextAt(c,own,traffic,t);
    const advisory=evaluateAutonomyColregsScreen(ctx);
    if(c.policy==='HEAD_ON_STARBOARD_DEMO_SYNTHETIC' &&
       demonstrationHeading===null && ctx.linkHealthy &&
       advisory.findings.some(f=>f.encounter==='HEAD_ON_CANDIDATE' &&f.proximity==='CPA_ALERT')){
      // Counterfactual fixed setpoint for the DEMONSTRATOR ONLY.
      // Cannot transfer to COLREG screen, helm or real controller.
      demonstrationHeading=normalize(own.headingTrueDeg+30);
    }
    const targetHeading=demonstrationHeading??own.headingTrueDeg;
    const maxDelta=c.turnRateLimitDegPerSecond*dt;
    const delta=Math.max(-maxDelta,Math.min(maxDelta,signed(targetHeading-own.headingTrueDeg)));
    const updatedHeading=normalize(own.headingTrueDeg+delta);
    const move=vector(own.speedKnots,updatedHeading,dt);
    const nextOwn={...own,headingTrueDeg:updatedHeading,
      eastNm:own.eastNm+move.eastNm+c.currentEastKnots*dt/3600,
      northNm:own.northNm+move.northNm+c.currentNorthKnots*dt/3600};
    let nearest=Infinity;
    traffic=traffic.map(x=>{
      const drift=vector(x.speedKnots,x.courseTrueDeg,dt);
      const next={...x,eastNm:x.eastNm+drift.eastNm,
        northNm:x.northNm+drift.northNm};
      const d=sweptDistance(x.eastNm-own.eastNm,x.northNm-own.northNm,
        next.eastNm-nextOwn.eastNm,next.northNm-nextOwn.northNm);
      nearest=Math.min(nearest,d);
      return next;
    });
    minSep=Math.min(minSep,nearest);
    if(nearest<c.riskSeparationNm&&!violations.includes('SYNTHETIC_CONTACT_SEPARATION_BREACH')){
      violations.push('SYNTHETIC_CONTACT_SEPARATION_BREACH');
    }
    if(!sampleWithinGeofence(nextOwn,c.geofence)&&!violations.includes('SYNTHETIC_GEOFENCE_EXIT')){
      violations.push('SYNTHETIC_GEOFENCE_EXIT');
    }
    trace.push({timeSeconds:t+dt,ownEastNm:nextOwn.eastNm,
      ownNorthNm:nextOwn.northNm,ownHeadingTrueDeg:updatedHeading,
      hypotheticalTargetHeadingDeg:targetHeading,nearestTargetNm:nearest,
      advisoryDisposition:advisory.disposition,hypotheticalTurnTriggered:demonstrationHeading!==null,
      evidenceId:ctx.evidenceId});
    own=nextOwn;t+=dt;
  }
  return result(c.scenarioId,violations.length?'SYNTHETIC_ENVELOPE_FAIL':'SYNTHETIC_ENVELOPE_PASS_UNCERTIFIED',
    minSep,violations,trace);
}
