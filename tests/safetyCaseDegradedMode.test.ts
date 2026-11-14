import { describe, expect, it } from 'vitest';
import {
  evaluateLinkLossDegradedOptions,
  evaluateMarineSafetyCase,
  REQUIRED_M07_HAZARD_CATEGORIES,
  type FmeaHazardRecord
} from '../src/core/safety-case/MarineSafetyCaseEngine.ts';

const COMMIT = '4b6bf3107abd50fec0074a98563979ca9dae9b42';

describe('M07 — B08 marine safety case, link-loss degraded evaluation, and non-actuating invariants', () => {
  it('rejects universal zero-thrust link loss in congested or near-hazard waters without emitting any actuation', () => {
    const nearHazard = evaluateLinkLossDegradedOptions({
      scenarioId: 'SCN-COASTAL-DRIFT',
      driftSpeedKnots: 2.5,
      nearestHazardDistanceNm: 0.4,
      linkRecoveryWindowMinutes: 15, // 2.5 * 0.25 = 0.625 NM > 0.2 NM margin
      batteryReservePercent: 55,
      propulsionHealthy: true,
      navIntegrityValid: true,
      returnCorridorClear: true,
      stationKeepRegionPermitted: true,
      trafficDensity: 'MODERATE_COASTAL'
    });

    expect(nearHazard.zeroThrustSafeUniversalAssumptionRejected).toBe(true);
    expect(nearHazard.helmCommand).toBeNull();
    expect(nearHazard.thrustCommand).toBeNull();
    expect(nearHazard.actuationAuthorized).toBe(false);

    const zeroEval = nearHazard.evaluations.find(e => e.mode === 'ZERO_THRUST_DRIFT');
    expect(zeroEval?.safetyAssessment).toBe('UNSAFE_DRIFT_HAZARD');
    expect(nearHazard.recommendedForHumanApproval).toBe('SAFE_LOITER');
  });

  it('requires all 12 marine hazard categories, fault-injection proof, and rejects historical AUT-01 CI claims', () => {
    const partialHazards: FmeaHazardRecord[] = [
      {
        hazardId: 'HAZ-01',
        category: 'LOSS_OF_COMMS',
        severity: 5,
        occurrence: 3,
        detection: 2,
        mitigationControl: 'Degraded corridor / human alert',
        linkedRequirementId: 'REQ-SAF-01',
        silOrPhysicalEvidenceRef: 'SIL-RCP-01',
        status: 'VERIFIED_WITH_INDEPENDENT_WITNESS'
      }
    ];

    const incomplete = evaluateMarineSafetyCase({
      sourceCommitSha: COMMIT,
      hazards: partialHazards,
      faultCases: [{ faultCaseId: 'FI-1', category: 'LOSS_OF_COMMS', executed: false, independentOraclePassed: false, evidenceRef: null }],
      claimHistoricalAut01CiAsSafety: true
    });
    expect(incomplete.overallStatus).toBe('BLOCKED_OPEN_HAZARDS_OR_GAPS');
    expect(incomplete.missingHazardCategories).toHaveLength(11);
    expect(incomplete.historicalAut01CiAcceptedAsNavSafety).toBe(false);
    expect(incomplete.openBlockers.some(b => b.includes('Historical AUT-01 software CI'))).toBe(true);
    expect(incomplete.actuationAuthorized).toBe(false);

    // Complete 12-category matrix + 100% fault coverage still keeps release/seaTrial/actuation FALSE
    const fullHazards: FmeaHazardRecord[] = REQUIRED_M07_HAZARD_CATEGORIES.map((category, idx) => ({
      hazardId: `HAZ-${idx + 1}`,
      category,
      severity: 4,
      occurrence: 2,
      detection: 2,
      mitigationControl: `Engineered control for ${category}`,
      linkedRequirementId: `REQ-${idx + 1}`,
      silOrPhysicalEvidenceRef: `SIL-WITNESS-${idx + 1}`,
      status: 'VERIFIED_WITH_INDEPENDENT_WITNESS'
    }));

    const complete = evaluateMarineSafetyCase({
      sourceCommitSha: COMMIT,
      hazards: fullHazards,
      faultCases: REQUIRED_M07_HAZARD_CATEGORIES.map((category, idx) => ({
        faultCaseId: `FI-${idx + 1}`,
        category,
        executed: true,
        independentOraclePassed: true,
        evidenceRef: `ORACLE-RCP-${idx + 1}`
      }))
    });
    expect(complete.overallStatus).toBe('SAFETY_CASE_COMPLETE_FOR_INDEPENDENT_REVIEW');
    expect(complete.engineeringReleaseAuthorized).toBe(false);
    expect(complete.seaTrialAuthorized).toBe(false);
    expect(complete.actuationAuthorized).toBe(false);
  });
});
