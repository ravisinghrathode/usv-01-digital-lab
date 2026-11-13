/**
 * AUT-01 deterministic software-in-the-loop replay of ADVISORY state only.
 * No physical sensors, propulsion hardware or closed-loop vessel dynamics.
 * A passing trace is an internal regression result, never a sea-trial result.
 */
import { evaluateAutonomyColregsScreen, type SafetyContext,
  type SafetyScreenResult, type SupervisoryDisposition } from './AutonomyColregsSafetyScreen.ts';
export type AdvisoryLatch =
  | 'OBSERVING' | 'OPERATOR_ESCALATION' | 'LINK_LOSS_REVIEW'
  | 'SAFETY_HOLD_LATCHED' | 'EMERGENCY_REVIEW_LATCHED';
export interface SilStep {
  atMs: number;
  context: SafetyContext;
  simulatedAbortAvailable: boolean;
  expectedDisposition?: SupervisoryDisposition;
  expectedLatch?: AdvisoryLatch;
  expectedConcern?: string;
}
export interface SilReplayPlan {
  id: string;
  /** Must be a synthetic-only input profile; approval must be independently established elsewhere. */
  inputProfileReference: string;
  maxEvidenceGapMs: number;
  steps: SilStep[];
}
export interface SilObservation {
  step: number;
  atMs: number;
  disposition: SupervisoryDisposition;
  latch: AdvisoryLatch;
  screen: SafetyScreenResult;
  defects: string[];
}
export interface SilReplayResult {
  id: string;
  status: 'SYNTHETIC_SCREEN_PASS' | 'SYNTHETIC_SCREEN_FAIL';
  observations: SilObservation[];
  defects: string[];
  finalLatch: AdvisoryLatch;
  simulatorValidated: false;
  hardwareValidated: false;
  collisionAvoidanceValidated: false;
  helmCommand: null;
  thrustCommand: null;
  autonomyReleaseAuthorized: false;
}
const nonNegativeFinite = (x: number) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
/**
 * This replay deliberately latches degraded and emergency conditions.
 * Recovery/re-arm needs a separate physically verified controller and approved
 * human authorization; no auto-clear on reconnect or regained sensor signal.
 */
export function evaluateAutonomySilReplay(plan: SilReplayPlan): SilReplayResult {
  const defects: string[] = [];
  const observations: SilObservation[] = [];
  let latch: AdvisoryLatch = 'OBSERVING';
  if (!plan.id?.trim() || !plan.inputProfileReference?.trim()) defects.push('MISSING_REPLAY_PROVENANCE');
  if (!Number.isFinite(plan.maxEvidenceGapMs) || plan.maxEvidenceGapMs <= 0) defects.push('INVALID_GAP_PROFILE');
  if (!Array.isArray(plan.steps) || plan.steps.length===0) defects.push('EMPTY_REPLAY');
  let prevMs: number | undefined;
  const evidenceIds=new Set<string>();
  for(const [index,step] of (plan.steps ?? []).entries()){
    const problems:string[]=[];
    if(!nonNegativeFinite(step.atMs) || (prevMs!==undefined && step.atMs<=prevMs)) problems.push('NON_MONOTONIC_TIME');
    if(prevMs!==undefined && step.atMs-prevMs>plan.maxEvidenceGapMs) problems.push('SENSOR_EVIDENCE_GAP');
    if(evidenceIds.has(step.context.evidenceId)) problems.push('DUPLICATE_EVIDENCE_ID');
    evidenceIds.add(step.context.evidenceId);
    if(!step.simulatedAbortAvailable) problems.push('SIMULATED_ABORT_UNAVAILABLE');
    const screen=evaluateAutonomyColregsScreen(step.context);
    if(screen.helmCommand!==null || screen.thrustCommand!==null ||
       screen.autonomousManeuverAuthorized || screen.colregsComplianceCertified) problems.push('NAVIGATION_AUTHORITY_LEAK');
    const d=screen.disposition;
    if(latch!=='EMERGENCY_REVIEW_LATCHED' && step.context.humanEmergencyOverride) latch='EMERGENCY_REVIEW_LATCHED';
    else if(latch!=='EMERGENCY_REVIEW_LATCHED' && latch!=='SAFETY_HOLD_LATCHED'){
      if(problems.length || d==='DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN'){
        latch='SAFETY_HOLD_LATCHED';
      }else if(d==='COLLISION_RISK_OPERATOR_ESCALATION'){
        latch='OPERATOR_ESCALATION';
      }else if(d==='LINK_LOSS_STATION_KEEP_CANDIDATE' || d==='LINK_LOSS_CORRIDOR_RECOVERY_CANDIDATE'){
        latch='LINK_LOSS_REVIEW';
      }
      // A previously escalated status is intentionally not auto-cleared.
    }
    if(step.expectedDisposition && step.expectedDisposition!==d) problems.push('EXPECTED_DISPOSITION_MISMATCH');
    if(step.expectedLatch && step.expectedLatch!==latch) problems.push('EXPECTED_LATCH_MISMATCH');
    if(step.expectedConcern && !screen.concerns.includes(step.expectedConcern) &&
       !screen.findings.some(x=>x.concerns.includes(step.expectedConcern!))) problems.push('EXPECTED_CONCERN_MISSING');
    for(const issue of problems) defects.push(`STEP_${index}:${issue}`);
    observations.push({step:index,atMs:step.atMs,disposition:d,latch,screen,defects:problems});
    prevMs=step.atMs;
  }
  return {id:plan.id,status:defects.length?'SYNTHETIC_SCREEN_FAIL':'SYNTHETIC_SCREEN_PASS',
    observations,defects,finalLatch:latch,simulatorValidated:false,hardwareValidated:false,
    collisionAvoidanceValidated:false,helmCommand:null,thrustCommand:null,autonomyReleaseAuthorized:false};
}
