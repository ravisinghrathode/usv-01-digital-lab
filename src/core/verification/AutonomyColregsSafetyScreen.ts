/**
 * USV-01 AUT-01: deterministic COLREG-related encounter and safety-supervisor
 * SCREENING ONLY. Not a COLREG oracle, navigator, autopilot or actuating controller.
 * Numerical limits are test-plan parameters, not statutory safe-passing minima.
 */
export type VisibilityRegime = 'IN_SIGHT' | 'RESTRICTED_NOT_IN_SIGHT' | 'UNKNOWN';
export type VesselKind = 'POWER_DRIVEN' | 'SAILING' | 'FISHING' | 'NUC' | 'RAM' | 'CBD' | 'UNKNOWN';
export type SourceKind = 'RADAR' | 'CAMERA' | 'LIDAR' | 'AIS' | 'VISUAL_OBSERVER';
export type EncounterKind =
  | 'HEAD_ON_CANDIDATE' | 'OVERTAKING_TARGET_CANDIDATE'
  | 'BEING_OVERTAKEN_CANDIDATE' | 'CROSSING_GIVE_WAY_CANDIDATE'
  | 'CROSSING_STAND_ON_CANDIDATE' | 'RESTRICTED_VISIBILITY_RULE_19'
  | 'CONTEXT_DEPENDENT' | 'UNDETERMINED';
export type Proximity = 'CPA_ALERT' | 'CPA_SCREEN_NEGATIVE' | 'UNDETERMINED';
export type SupervisoryDisposition =
  | 'HUMAN_EMERGENCY_OVERRIDE_REQUEST'
  | 'DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN'
  | 'COLLISION_RISK_OPERATOR_ESCALATION'
  | 'LINK_LOSS_STATION_KEEP_CANDIDATE'
  | 'LINK_LOSS_CORRIDOR_RECOVERY_CANDIDATE'
  | 'NON_ACTUATING_SUPERVISION';

export interface Ownship { courseDeg: number; speedKnots: number; vesselKind: VesselKind }
export interface Contact {
  id: string;
  bearingTrueDeg: number; rangeNm: number; courseTrueDeg: number; speedKnots: number;
  vesselKind: VesselKind;
  trackAgeSeconds: number;
  /** Uncertainty inputs must be measured/characterized; 0 is not accepted as proof of no error. */
  rangeStdNm?: number; bearingStdDeg?: number; speedStdKnots?: number;
  sources: SourceKind[];
}
export interface ScreeningLimits {
  maxTrackAgeSeconds: number;
  cpaAlertThresholdNm: number;
  lookAheadMinutes: number;
  /** Heuristics only; not codified COLREG angular boundaries. */
  nearHeadOnDeg: number;
  /** No threshold grants navigational release. */
  profileId: string;
}
export interface SafetyContext {
  evidenceId: string;
  ownship: Ownship;
  contacts: Contact[];
  visibility: VisibilityRegime;
  lookoutAssessment: 'ASSESSED_ADEQUATE' | 'DEGRADED' | 'UNASSESSED';
  sensorsHealthy: boolean;
  navigationIntegrityValid: boolean;
  propulsionHealthy: boolean;
  geofenceValid: boolean;
  energyReserveAdequate: boolean;
  insideOperationalDesignDomain: boolean;
  /** These contexts require navigation-expert interpretation beyond a simple 2-vessel rule screen. */
  narrowChannelOrTrafficScheme: boolean;
  linkHealthy: boolean;
  humanEmergencyOverride: boolean;
  stationKeepingApprovedForCurrentRegion: boolean;
  recoveryCorridorApprovedAndClear: boolean;
  limits: ScreeningLimits;
}
export interface ContactFinding {
  id: string;
  encounter: EncounterKind;
  proximity: Proximity;
  cpaNm: number | null;
  tcpaMinutes: number | null;
  conservativeCpaLowerBoundNm: number | null;
  applicableRuleCandidates: string[];
  concerns: string[];
}
export interface SafetyScreenResult {
  evidenceId: string;
  disposition: SupervisoryDisposition;
  findings: ContactFinding[];
  concerns: string[];
  requiresHumanReview: true;
  helmCommand: null;
  thrustCommand: null;
  autonomousManeuverAuthorized: false;
  colregsComplianceCertified: false;
  physicalSafetyValidated: false;
  evidenceClass: 'SYNTHETIC_DECISION_SUPPORT_ONLY';
}
const finite = (n: number) => typeof n === 'number' && Number.isFinite(n);
const between = (x: number, low: number, high: number) => finite(x) && x >= low && x <= high;
const normalize = (deg: number) => ((deg % 360) + 360) % 360;
const signed = (deg: number) => ((normalize(deg) + 180) % 360) - 180;
const degToRad = Math.PI / 180;
const norm = (x: number, y: number) => Math.hypot(x, y);
const validKind = (s: string): s is VesselKind => ['POWER_DRIVEN','SAILING','FISHING','NUC','RAM','CBD','UNKNOWN'].includes(s);
const allSources = new Set<SourceKind>(['RADAR','CAMERA','LIDAR','AIS','VISUAL_OBSERVER']);
const limitsValid = (p: ScreeningLimits) => !!p.profileId?.trim() &&
  finite(p.maxTrackAgeSeconds) && p.maxTrackAgeSeconds > 0 &&
  finite(p.cpaAlertThresholdNm) && p.cpaAlertThresholdNm > 0 &&
  finite(p.lookAheadMinutes) && p.lookAheadMinutes > 0 &&
  between(p.nearHeadOnDeg, 1, 15);

/** Relative vector solution. Never extrapolate a negative TCPA into a future CPA. */
function kinematics(own: Ownship, c: Contact): { cpaNm: number; tcpaMinutes: number } | null {
  if (!between(own.courseDeg, 0, 360) || !finite(own.speedKnots) || own.speedKnots < 0 ||
      !between(c.bearingTrueDeg, 0, 360) || !between(c.courseTrueDeg, 0, 360) ||
      !finite(c.rangeNm) || c.rangeNm <= 0 || !finite(c.speedKnots) || c.speedKnots < 0) return null;
  const ownN = own.speedKnots * Math.cos(own.courseDeg * degToRad);
  const ownE = own.speedKnots * Math.sin(own.courseDeg * degToRad);
  const relN = c.speedKnots * Math.cos(c.courseTrueDeg * degToRad) - ownN;
  const relE = c.speedKnots * Math.sin(c.courseTrueDeg * degToRad) - ownE;
  const posN = c.rangeNm * Math.cos(c.bearingTrueDeg * degToRad);
  const posE = c.rangeNm * Math.sin(c.bearingTrueDeg * degToRad);
  const rel2 = relN ** 2 + relE ** 2;
  const tcpaHours = rel2 <= 1e-12 ? 0 : Math.max(0, -(posN * relN + posE * relE) / rel2);
  const cpaNm = norm(posN + relN * tcpaHours, posE + relE * tcpaHours);
  if (!finite(cpaNm) || !finite(tcpaHours)) return null;
  return { cpaNm, tcpaMinutes: tcpaHours * 60 };
}

function encounter(own: Ownship, c: Contact, visibility: VisibilityRegime, specialContext: boolean, headOnDeg: number):
  { kind: EncounterKind; rules: string[] } {
  if (visibility === 'RESTRICTED_NOT_IN_SIGHT') return {kind:'RESTRICTED_VISIBILITY_RULE_19',rules:['2','5','6','7','8','19','35']};
  if (visibility === 'UNKNOWN') return {kind:'UNDETERMINED',rules:['2','5','6','7','8']};
  if (specialContext) return {kind:'CONTEXT_DEPENDENT',rules:['2','5','6','7','8','9','10','18']};
  const ownAspect = Math.abs(signed(c.bearingTrueDeg - own.courseDeg));
  const targetSeesOwn = Math.abs(signed(normalize(c.bearingTrueDeg + 180) - c.courseTrueDeg));
  // Rule 13 overtaking geometry: ownship lies abaft 22.5 degrees behind target beam.
  // Screening alone cannot prove overtaking from a single instantaneous track.
  if (targetSeesOwn > 112.5 && own.speedKnots > c.speedKnots) {
    return {kind:'OVERTAKING_TARGET_CANDIDATE',rules:['2','5','7','8','13','34']};
  }
  if (ownAspect > 112.5 && c.speedKnots > own.speedKnots) {
    return {kind:'BEING_OVERTAKEN_CANDIDATE',rules:['2','5','7','8','13','17','34']};
  }
  if (own.vesselKind !== 'POWER_DRIVEN' || c.vesselKind !== 'POWER_DRIVEN') {
    return {kind:'CONTEXT_DEPENDENT',rules:['2','5','7','8','18']};
  }
  const diff = Math.abs(signed(own.courseDeg - c.courseTrueDeg));
  if (ownAspect <= headOnDeg && targetSeesOwn <= headOnDeg && diff >= 180 - 2 * headOnDeg) {
    return {kind:'HEAD_ON_CANDIDATE',rules:['2','5','7','8','14','16','34']};
  }
  if (ownAspect <= 112.5) {
    const relative = signed(c.bearingTrueDeg - own.courseDeg);
    if (relative > headOnDeg) return {kind:'CROSSING_GIVE_WAY_CANDIDATE',rules:['2','5','7','8','15','16','34']};
    if (relative < -headOnDeg) return {kind:'CROSSING_STAND_ON_CANDIDATE',rules:['2','5','7','8','15','17','34']};
  }
  return {kind:'UNDETERMINED',rules:['2','5','6','7','8']};
}

function analyzeContact(own: Ownship, c: Contact, ctx: SafetyContext): ContactFinding {
  const concerns: string[] = [];
  if (!c.id?.trim()) concerns.push('MISSING_CONTACT_ID');
  if (!validKind(c.vesselKind)) concerns.push('UNSUPPORTED_VESSEL_TYPE');
  if (!finite(c.trackAgeSeconds) || c.trackAgeSeconds < 0 || c.trackAgeSeconds > ctx.limits.maxTrackAgeSeconds) concerns.push('TRACK_STALE_OR_INVALID');
  if (!Array.isArray(c.sources) || c.sources.length === 0 || c.sources.some(x => !allSources.has(x))) concerns.push('SENSOR_SOURCE_UNVERIFIED');
  if (Array.isArray(c.sources) && c.sources.length === 1 && c.sources[0] === 'AIS') concerns.push('AIS_ONLY_CANNOT_SUBSTITUTE_LOOKOUT');
  if (c.vesselKind === 'UNKNOWN') concerns.push('VESSEL_TYPE_UNVERIFIED');
  if (!finite(c.rangeStdNm!) || c.rangeStdNm! <= 0 ||
      !finite(c.bearingStdDeg!) || c.bearingStdDeg! <= 0 ||
      !finite(c.speedStdKnots!) || c.speedStdKnots! <= 0) concerns.push('UNCERTAINTY_UNCHARACTERIZED');
  const geometry = kinematics(own, c);
  if (!geometry) concerns.push('KINEMATICS_INVALID');
  const classified = geometry && validKind(c.vesselKind) ?
    encounter(own, c, ctx.visibility, ctx.narrowChannelOrTrafficScheme, ctx.limits.nearHeadOnDeg) :
    {kind:'UNDETERMINED' as const,rules:['2','5','6','7','8']};
  // First-order conservative corridor envelope. This is NOT a statistical
  // confidence interval, sensor-fusion covariance propagation or safety proof.
  const horizonHours = Math.min(geometry?.tcpaMinutes ?? 0, ctx.limits.lookAheadMinutes) / 60;
  const uncertainty = concerns.includes('UNCERTAINTY_UNCHARACTERIZED') || !geometry ? null :
    c.rangeStdNm! + c.rangeNm * Math.sin(Math.min(90, c.bearingStdDeg!) * degToRad) + c.speedStdKnots! * horizonHours;
  const lowerBound = uncertainty === null ? null : Math.max(0, geometry!.cpaNm - uncertainty);
  let proximity: Proximity = 'UNDETERMINED';
  if (geometry && lowerBound !== null && !concerns.some(x=>['TRACK_STALE_OR_INVALID','KINEMATICS_INVALID','SENSOR_SOURCE_UNVERIFIED'].includes(x))) {
    proximity = geometry.tcpaMinutes > 0 && geometry.tcpaMinutes <= ctx.limits.lookAheadMinutes && lowerBound <= ctx.limits.cpaAlertThresholdNm ?
      'CPA_ALERT' : 'CPA_SCREEN_NEGATIVE';
  }
  // Explicitly avoid false "safe passing" where a measurement is AIS only or visual lookout lacking.
  if (concerns.includes('AIS_ONLY_CANNOT_SUBSTITUTE_LOOKOUT')) proximity = 'UNDETERMINED';
  return {id:c.id,encounter:classified.kind,proximity,
    cpaNm:geometry?.cpaNm ?? null,tcpaMinutes:geometry?.tcpaMinutes ?? null,
    conservativeCpaLowerBoundNm:lowerBound,applicableRuleCandidates:classified.rules,concerns};
}

/** Output may be logged/displayed; it must NEVER be forwarded to vessel actuators. */
export function evaluateAutonomyColregsScreen(ctx: SafetyContext): SafetyScreenResult {
  const concerns: string[] = [];
  if (!ctx.evidenceId?.trim()) concerns.push('MISSING_EVIDENCE_ID');
  if (!limitsValid(ctx.limits)) concerns.push('MISSING_OR_INVALID_SCREENING_PROFILE');
  if (!between(ctx.ownship.courseDeg,0,360) || !finite(ctx.ownship.speedKnots) || ctx.ownship.speedKnots < 0 ||
      !validKind(ctx.ownship.vesselKind)) concerns.push('OWN_NAVIGATION_STATE_INVALID');
  if (!['IN_SIGHT','RESTRICTED_NOT_IN_SIGHT','UNKNOWN'].includes(ctx.visibility)) concerns.push('VISIBILITY_INVALID');
  if (ctx.visibility === 'UNKNOWN') concerns.push('VISIBILITY_UNKNOWN');
  if (ctx.lookoutAssessment !== 'ASSESSED_ADEQUATE') concerns.push('LOOKOUT_NOT_DEMONSTRATED');
  if (!ctx.sensorsHealthy || !ctx.navigationIntegrityValid) concerns.push('NAVIGATION_OR_SENSING_DEGRADED');
  if (!ctx.propulsionHealthy || !ctx.energyReserveAdequate) concerns.push('PROPULSION_OR_ENERGY_DEGRADED');
  if (!ctx.geofenceValid || !ctx.insideOperationalDesignDomain) concerns.push('GEOFENCE_OR_ODD_UNSAFE');
  if (ctx.narrowChannelOrTrafficScheme) concerns.push('LOCAL_NAVIGATION_RULE_REVIEW_REQUIRED');
  if (ctx.visibility === 'RESTRICTED_NOT_IN_SIGHT') concerns.push('RESTRICTED_VISIBILITY_SAFE_SPEED_AND_RULE_19_REVIEW');
  if (!Array.isArray(ctx.contacts)) concerns.push('CONTACT_LIST_INVALID');
  const safeToScreen = limitsValid(ctx.limits) && !concerns.includes('OWN_NAVIGATION_STATE_INVALID') && Array.isArray(ctx.contacts);
  const findings = safeToScreen ? ctx.contacts.map(c=>analyzeContact(ctx.ownship,c,ctx)) : [];
  const ids = new Set<string>();
  for (const f of findings) {if (ids.has(f.id)) concerns.push('DUPLICATE_CONTACT_ID');ids.add(f.id);}
  const anyUnsafe = ctx.contacts?.length === 0 || findings.some(f=> f.proximity !== 'CPA_SCREEN_NEGATIVE' || f.concerns.length > 0);
  if (findings.length > 1 && findings.some(f=>f.proximity !== 'CPA_SCREEN_NEGATIVE')) concerns.push('MULTI_CONTACT_CONSTRAINTS_UNRESOLVED');
  if (anyUnsafe) concerns.push('UNRESOLVED_ENCOUNTER_RISK');
  if (!ctx.linkHealthy) concerns.push('SUPERVISORY_LINK_LOST_REJECT_STALE_COMMANDS');
  if (ctx.contacts?.length === 0) concerns.push('NO_CONTACTS_DOES_NOT_PROVE_CLEAR_WATER');
  const blocker = concerns.some(x=>[
    'MISSING_EVIDENCE_ID','MISSING_OR_INVALID_SCREENING_PROFILE','OWN_NAVIGATION_STATE_INVALID','VISIBILITY_INVALID',
    'VISIBILITY_UNKNOWN','LOOKOUT_NOT_DEMONSTRATED','NAVIGATION_OR_SENSING_DEGRADED',
    'PROPULSION_OR_ENERGY_DEGRADED','GEOFENCE_OR_ODD_UNSAFE','DUPLICATE_CONTACT_ID',
    'CONTACT_LIST_INVALID','NO_CONTACTS_DOES_NOT_PROVE_CLEAR_WATER','MULTI_CONTACT_CONSTRAINTS_UNRESOLVED','RESTRICTED_VISIBILITY_SAFE_SPEED_AND_RULE_19_REVIEW',
    'LOCAL_NAVIGATION_RULE_REVIEW_REQUIRED'
  ].includes(x));
  let disposition: SupervisoryDisposition = 'NON_ACTUATING_SUPERVISION';
  if (ctx.humanEmergencyOverride) disposition = 'HUMAN_EMERGENCY_OVERRIDE_REQUEST';
  else if (blocker || !ctx.linkHealthy && anyUnsafe) disposition = 'DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN';
  else if (!ctx.linkHealthy && ctx.stationKeepingApprovedForCurrentRegion) disposition = 'LINK_LOSS_STATION_KEEP_CANDIDATE';
  else if (!ctx.linkHealthy && ctx.recoveryCorridorApprovedAndClear) disposition = 'LINK_LOSS_CORRIDOR_RECOVERY_CANDIDATE';
  else if (!ctx.linkHealthy) disposition = 'DEGRADED_RESPONSE_REQUIRES_APPROVED_HAZARD_PLAN';
  else if (anyUnsafe) disposition = 'COLLISION_RISK_OPERATOR_ESCALATION';
  return {evidenceId:ctx.evidenceId,disposition,findings,concerns,requiresHumanReview:true,
    helmCommand:null,thrustCommand:null,autonomousManeuverAuthorized:false,
    colregsComplianceCertified:false,physicalSafetyValidated:false,evidenceClass:'SYNTHETIC_DECISION_SUPPORT_ONLY'};
}
