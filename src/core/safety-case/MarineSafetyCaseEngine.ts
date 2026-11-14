export type MarineHazardCategory =
  | 'LOSS_OF_COMMS'
  | 'NAV_UNCERTAINTY'
  | 'UNCONTROLLED_DRIFT'
  | 'COLREG_COLLISION'
  | 'PROPULSION_FAULT'
  | 'BATTERY_THERMAL_RUNAWAY'
  | 'CYBER_TAKEOVER'
  | 'L_AND_R_TRANSIENT'
  | 'SEALED_HULL_THERMAL'
  | 'BILGE_CONDENSATION'
  | 'FOULING_CORROSION'
  | 'WET_END_ACOUSTIC';

export const REQUIRED_M07_HAZARD_CATEGORIES: readonly MarineHazardCategory[] = [
  'LOSS_OF_COMMS',
  'NAV_UNCERTAINTY',
  'UNCONTROLLED_DRIFT',
  'COLREG_COLLISION',
  'PROPULSION_FAULT',
  'BATTERY_THERMAL_RUNAWAY',
  'CYBER_TAKEOVER',
  'L_AND_R_TRANSIENT',
  'SEALED_HULL_THERMAL',
  'BILGE_CONDENSATION',
  'FOULING_CORROSION',
  'WET_END_ACOUSTIC'
] as const;

export interface FmeaHazardRecord {
  hazardId: string;
  category: MarineHazardCategory;
  severity: 1 | 2 | 3 | 4 | 5;
  occurrence: 1 | 2 | 3 | 4 | 5;
  detection: 1 | 2 | 3 | 4 | 5;
  mitigationControl: string;
  linkedRequirementId: string;
  silOrPhysicalEvidenceRef: string | null;
  status: 'MITIGATED_UNVERIFIED' | 'VERIFIED_WITH_INDEPENDENT_WITNESS' | 'OPEN_BLOCKER';
}

export interface LinkLossScenarioInput {
  scenarioId: string;
  driftSpeedKnots: number;
  nearestHazardDistanceNm: number;
  linkRecoveryWindowMinutes: number;
  batteryReservePercent: number;
  propulsionHealthy: boolean;
  navIntegrityValid: boolean;
  returnCorridorClear: boolean;
  stationKeepRegionPermitted: boolean;
  trafficDensity: 'OPEN_LOW' | 'MODERATE_COASTAL' | 'CONGESTED_TSS';
}

export type LinkLossCandidateMode =
  | 'ZERO_THRUST_DRIFT'
  | 'SAFE_LOITER'
  | 'RETURN_CORRIDOR'
  | 'CONTROLLED_ABORT';

export interface LinkLossOptionEvaluation {
  mode: LinkLossCandidateMode;
  safetyAssessment: 'CANDIDATE_VIABLE_FOR_REVIEW' | 'UNSAFE_DRIFT_HAZARD' | 'UNAVAILABLE_FAULT' | 'BLOCKED_BY_TRAFFIC_OR_CORRIDOR';
  projectedDriftDistanceNm: number;
  rationale: string;
}

export interface LinkLossDecisionReport {
  scenarioId: string;
  evaluations: LinkLossOptionEvaluation[];
  zeroThrustSafeUniversalAssumptionRejected: true;
  recommendedForHumanApproval: LinkLossCandidateMode | 'HUMAN_INTERVENTION_REQUIRED';
  // Non-actuating guarantee: safety assessment NEVER commands helm or thrust actuators.
  helmCommand: null;
  thrustCommand: null;
  actuationAuthorized: false;
}

export interface FaultInjectionOracleCase {
  faultCaseId: string;
  category: MarineHazardCategory;
  executed: boolean;
  independentOraclePassed: boolean;
  evidenceRef: string | null;
}

export interface SafetyCaseSummary {
  schema: 'usv01-marine-safety-case/v1';
  sourceCommitSha: string;
  missingHazardCategories: MarineHazardCategory[];
  openBlockers: string[];
  faultInjectionCoverageRatio: number;
  historicalAut01CiAcceptedAsNavSafety: false;
  overallStatus: 'SAFETY_CASE_COMPLETE_FOR_INDEPENDENT_REVIEW' | 'BLOCKED_OPEN_HAZARDS_OR_GAPS';
  engineeringReleaseAuthorized: false;
  seaTrialAuthorized: false;
  actuationAuthorized: false;
}

const GIT_SHA = /^[0-9a-f]{40}$/;

/**
 * Evaluate degraded link-loss candidates explicitly comparing zero-thrust drift against
 * safe-loiter, return-corridor, and controlled-abort without issuing any live actuation.
 */
export function evaluateLinkLossDegradedOptions(input: LinkLossScenarioInput): LinkLossDecisionReport {
  const projectedDriftDistanceNm = (input.driftSpeedKnots * input.linkRecoveryWindowMinutes) / 60;
  const driftClearsHazard = projectedDriftDistanceNm < input.nearestHazardDistanceNm * 0.5;
  const zeroThrustSafe = driftClearsHazard && input.trafficDensity === 'OPEN_LOW';

  const evals: LinkLossOptionEvaluation[] = [
    {
      mode: 'ZERO_THRUST_DRIFT',
      safetyAssessment: zeroThrustSafe ? 'CANDIDATE_VIABLE_FOR_REVIEW' : 'UNSAFE_DRIFT_HAZARD',
      projectedDriftDistanceNm,
      rationale: zeroThrustSafe
        ? `Drift ${projectedDriftDistanceNm.toFixed(3)} NM < 50% hazard margin in low-density open water`
        : `Zero thrust risks drifting ${projectedDriftDistanceNm.toFixed(3)} NM toward hazard at ${input.nearestHazardDistanceNm.toFixed(3)} NM or into ${input.trafficDensity}`
    },
    {
      mode: 'SAFE_LOITER',
      safetyAssessment:
        !input.propulsionHealthy || !input.navIntegrityValid || input.batteryReservePercent < 25
          ? 'UNAVAILABLE_FAULT'
          : !input.stationKeepRegionPermitted
            ? 'BLOCKED_BY_TRAFFIC_OR_CORRIDOR'
            : 'CANDIDATE_VIABLE_FOR_REVIEW',
      projectedDriftDistanceNm: 0,
      rationale: 'Station-keeping requires healthy propulsion, valid navigation integrity, >=25% battery, and cleared holding box'
    },
    {
      mode: 'RETURN_CORRIDOR',
      safetyAssessment:
        !input.propulsionHealthy || !input.navIntegrityValid || input.batteryReservePercent < 30
          ? 'UNAVAILABLE_FAULT'
          : !input.returnCorridorClear
            ? 'BLOCKED_BY_TRAFFIC_OR_CORRIDOR'
            : 'CANDIDATE_VIABLE_FOR_REVIEW',
      projectedDriftDistanceNm: 0,
      rationale: 'Pre-cleared return track requires >=30% energy reserve and unobstructed corridor'
    },
    {
      mode: 'CONTROLLED_ABORT',
      safetyAssessment: 'CANDIDATE_VIABLE_FOR_REVIEW',
      projectedDriftDistanceNm,
      rationale: 'Immediate safety alert / controlled shutdown preparation if propulsion or nav fails'
    }
  ];

  const preferred =
    evals.find(e => e.mode === 'SAFE_LOITER' && e.safetyAssessment === 'CANDIDATE_VIABLE_FOR_REVIEW')?.mode ??
    evals.find(e => e.mode === 'RETURN_CORRIDOR' && e.safetyAssessment === 'CANDIDATE_VIABLE_FOR_REVIEW')?.mode ??
    (zeroThrustSafe ? 'ZERO_THRUST_DRIFT' : 'HUMAN_INTERVENTION_REQUIRED');

  return {
    scenarioId: input.scenarioId,
    evaluations: evals,
    zeroThrustSafeUniversalAssumptionRejected: true,
    recommendedForHumanApproval: preferred,
    helmCommand: null,
    thrustCommand: null,
    actuationAuthorized: false
  };
}

export function evaluateMarineSafetyCase(input: {
  sourceCommitSha: string;
  hazards: readonly FmeaHazardRecord[];
  faultCases: readonly FaultInjectionOracleCase[];
  claimHistoricalAut01CiAsSafety?: boolean;
}): SafetyCaseSummary {
  if (!GIT_SHA.test(input.sourceCommitSha)) {
    throw new Error('Exact 40-hex sourceCommitSha required for M07 safety case');
  }

  const openBlockers: string[] = [];
  if (input.claimHistoricalAut01CiAsSafety === true) {
    openBlockers.push('REJECTED: Historical AUT-01 software CI cannot be promoted as navigational safety evidence');
  }

  const coveredCategories = new Set(input.hazards.map(h => h.category));
  const missingHazardCategories = REQUIRED_M07_HAZARD_CATEGORIES.filter(cat => !coveredCategories.has(cat));
  if (missingHazardCategories.length > 0) {
    openBlockers.push(`Missing hazard FMEA coverage for: ${missingHazardCategories.join(', ')}`);
  }

  for (const h of input.hazards) {
    if (!h.linkedRequirementId.trim() || !h.mitigationControl.trim()) {
      openBlockers.push(`Hazard ${h.hazardId} missing linked requirement or mitigation control`);
    }
    if (h.status === 'OPEN_BLOCKER') {
      openBlockers.push(`Open hazard blocker ${h.hazardId} (${h.category})`);
    }
    if (h.status === 'VERIFIED_WITH_INDEPENDENT_WITNESS' && !h.silOrPhysicalEvidenceRef) {
      openBlockers.push(`Hazard ${h.hazardId} marked verified without SIL/physical evidence reference`);
    }
  }

  const totalFaults = input.faultCases.length;
  const passedFaults = input.faultCases.filter(f => f.executed && f.independentOraclePassed && !!f.evidenceRef).length;
  const faultInjectionCoverageRatio = totalFaults > 0 ? passedFaults / totalFaults : 0;

  if (totalFaults === 0 || passedFaults < totalFaults) {
    openBlockers.push(`Fault injection coverage incomplete (${passedFaults}/${totalFaults} passed with oracle & receipt)`);
  }

  return {
    schema: 'usv01-marine-safety-case/v1',
    sourceCommitSha: input.sourceCommitSha,
    missingHazardCategories,
    openBlockers,
    faultInjectionCoverageRatio,
    historicalAut01CiAcceptedAsNavSafety: false,
    overallStatus:
      openBlockers.length === 0
        ? 'SAFETY_CASE_COMPLETE_FOR_INDEPENDENT_REVIEW'
        : 'BLOCKED_OPEN_HAZARDS_OR_GAPS',
    engineeringReleaseAuthorized: false,
    seaTrialAuthorized: false,
    actuationAuthorized: false
  };
}
