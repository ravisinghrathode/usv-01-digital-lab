/**
 * AUT-01 synthetic sensor-evidence contract.
 * This is NOT perception, sensor fusion, track association, or calibration.
 * It rejects inconsistent/stale multi-source observations before passing any
 * candidates to a non-actuating collision-risk screen.
 */
import type { Contact, SafetyContext, SourceKind } from './AutonomyColregsSafetyScreen.ts';
export interface SensorObservation {
  targetId: string;
  source: SourceKind;
  observedAtMs: number;
  /** All bearings/course angles are TRUE degrees, not raw radar-relative angles. */
  bearingTrueDeg: number;
  rangeNm: number;
  courseTrueDeg: number;
  speedKnots: number;
  rangeStdNm: number;
  bearingStdDeg: number;
  speedStdKnots: number;
  /** Classification is not trustworthy without separately validated identity/type evidence. */
  vesselKind: Contact['vesselKind'];
}
export interface SensorEvidenceLimits {
  profileId: string;
  maxObservationAgeMs: number;
  maxCrossSensorAgeMs: number;
  maxRangeDifferenceNm: number;
  maxBearingDifferenceDeg: number;
  maxCourseDifferenceDeg: number;
  maxSpeedDifferenceKnots: number;
}
export interface TrackEvidenceFinding {
  targetId: string;
  verdict: 'CANDIDATE_NON_CERTIFIED' | 'REJECTED';
  sources: SourceKind[];
  concerns: string[];
}
export interface SensorEvidenceFrame {
  context: SafetyContext;
  tracks: TrackEvidenceFinding[];
  frameConcerns: string[];
  isCalibratedOrFused: false;
  eligibleForNavigationControl: false;
}
const finite = (x: number) => typeof x === 'number' && Number.isFinite(x);
const bound = (x: number,lo:number,hi:number) => finite(x) && x>=lo && x<=hi;
const differenceDeg=(a:number,b:number)=>Math.abs((((a-b)%360)+540)%360-180);
const allowed: SourceKind[]=['RADAR','LIDAR','CAMERA','VISUAL_OBSERVER','AIS'];
const validVessel = (s: string) => ['POWER_DRIVEN','SAILING','FISHING','NUC','RAM','CBD','UNKNOWN'].includes(s);
const goodLimits=(l: SensorEvidenceLimits)=>l?.profileId?.trim() &&
  [l.maxObservationAgeMs,l.maxCrossSensorAgeMs,l.maxRangeDifferenceNm,
   l.maxBearingDifferenceDeg,l.maxCourseDifferenceDeg,l.maxSpeedDifferenceKnots]
   .every(x=>finite(x)&&x>0);
const observationValid=(p:SensorObservation)=>p?.targetId?.trim() &&
  allowed.includes(p.source) && finite(p.observedAtMs) &&
  bound(p.bearingTrueDeg,0,360) && finite(p.rangeNm) && p.rangeNm>0 &&
  bound(p.courseTrueDeg,0,360) && finite(p.speedKnots) && p.speedKnots>=0 &&
  finite(p.rangeStdNm) && p.rangeStdNm>0 && finite(p.bearingStdDeg) && p.bearingStdDeg>0 &&
  finite(p.speedStdKnots) && p.speedStdKnots>0 && validVessel(p.vesselKind);

/**
 * Frames are read-only sensor-evidence projections. Track validity NEVER proves
 * proper Rule-5 lookout; it merely prevents contradictory input from being
 * silently declared healthy by the software. No target disappearance is proof
 * that a hazard disappeared.
 */
export function compileSensorEvidenceFrame(
  base: SafetyContext,
  observations: readonly SensorObservation[],
  frameTimeMs: number,
  limits: SensorEvidenceLimits
): SensorEvidenceFrame {
  const frameConcerns: string[]=[];
  const groups=new Map<string,SensorObservation[]>();
  if(!finite(frameTimeMs) || frameTimeMs < 0) frameConcerns.push('INVALID_FRAME_TIME');
  if(!goodLimits(limits)) frameConcerns.push('INVALID_SENSOR_EVIDENCE_PROFILE');
  if(!Array.isArray(observations) || observations.length===0) frameConcerns.push('NO_SENSOR_OBSERVATIONS');
  for(const obs of observations ?? []){
    const key=typeof obs?.targetId==='string' ? obs.targetId : '';
    const list=groups.get(key)??[];list.push(obs);groups.set(key,list);
  }
  const contacts:Contact[]=[];
  const tracks:TrackEvidenceFinding[]=[];
  for(const [targetId,readings] of groups){
    const problems:string[]=[];
    if(readings.some(p=>!observationValid(p))) problems.push('INVALID_OR_UNCALIBRATED_OBSERVATION_FIELDS');
    const names=readings.map(x=>x?.source).filter((x):x is SourceKind => !!x);
    if(new Set(names).size!==names.length) problems.push('DUPLICATE_SOURCE_FOR_TRACK');
    if(frameConcerns.includes('INVALID_FRAME_TIME') || frameConcerns.includes('INVALID_SENSOR_EVIDENCE_PROFILE')){
      problems.push('FRAME_TIME_OR_LIMITS_INVALID');
    }else{
      if(readings.some(p=>!finite(p.observedAtMs)||p.observedAtMs>frameTimeMs||
         frameTimeMs-p.observedAtMs>limits.maxObservationAgeMs)) problems.push('STALE_OR_FUTURE_SENSOR_SAMPLE');
      const times=readings.map(x=>x.observedAtMs);
      if(times.length>1 && Math.max(...times)-Math.min(...times)>limits.maxCrossSensorAgeMs){
        problems.push('CROSS_SENSOR_TIME_SKEW');
      }
    }
    if(names.length===1 && names[0]==='AIS') problems.push('AIS_ONLY_NOT_INDEPENDENT_LOOKOUT');
    if(readings.some(p=>p.vesselKind==='UNKNOWN')) problems.push('VESSEL_CLASSIFICATION_UNKNOWN');
    if(problems.length===0 && readings.length>1){
      for(const p of readings.slice(1)){
        const a=readings[0];
        if(Math.abs(a.rangeNm-p.rangeNm)>limits.maxRangeDifferenceNm ||
          differenceDeg(a.bearingTrueDeg,p.bearingTrueDeg)>limits.maxBearingDifferenceDeg ||
          differenceDeg(a.courseTrueDeg,p.courseTrueDeg)>limits.maxCourseDifferenceDeg ||
          Math.abs(a.speedKnots-p.speedKnots)>limits.maxSpeedDifferenceKnots ||
          a.vesselKind!==p.vesselKind){
          problems.push('CROSS_SENSOR_CONTRADICTION');break;
        }
      }
    }
    if(problems.length===0){
      // The primary sample is chosen deterministically by preferred physical
      // source. No unvalidated averaging or fabricated covariance is performed.
      const sorted=[...readings].sort((a,b)=>allowed.indexOf(a.source)-allowed.indexOf(b.source));
      const primary=sorted[0];
      contacts.push({id:targetId,bearingTrueDeg:primary.bearingTrueDeg,
        rangeNm:primary.rangeNm,courseTrueDeg:primary.courseTrueDeg,speedKnots:primary.speedKnots,
        vesselKind:primary.vesselKind,trackAgeSeconds:(frameTimeMs-Math.min(...readings.map(x=>x.observedAtMs)))/1000,
        rangeStdNm:Math.max(...readings.map(x=>x.rangeStdNm)),
        bearingStdDeg:Math.max(...readings.map(x=>x.bearingStdDeg)),
        speedStdKnots:Math.max(...readings.map(x=>x.speedStdKnots)),
        sources:sorted.map(x=>x.source)});
    }
    tracks.push({targetId,verdict:problems.length?'REJECTED':'CANDIDATE_NON_CERTIFIED',sources:names,concerns:problems});
  }
  if(tracks.some(x=>x.verdict==='REJECTED')) frameConcerns.push('REJECTED_TRACKS_PRESENT');
  if(contacts.length===0) frameConcerns.push('NO_ACCEPTABLE_TRACKS_NOT_PROOF_OF_CLEAR_WATER');
  return {
    context:{...base,contacts,sensorsHealthy:base.sensorsHealthy && frameConcerns.length===0},
    tracks,frameConcerns,isCalibratedOrFused:false,eligibleForNavigationControl:false
  };
}
