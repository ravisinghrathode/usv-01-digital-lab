import { describe, expect, it } from 'vitest';
import {
  screenResistancePropulsionEvidence,
  resistancePropulsionEvidenceSchema,
  RES01_GATES
} from '../src/core/verification/ResistancePropulsionEvidence.ts';

// All numbers, references and sources in this fixture are INVENTED UNIT-TEST
// INPUTS ONLY. No fixture may be repurposed as USV-01 measured evidence.
const ref = 'TEST-NOT-PHYSICAL-RECORD';
const digest = 'sha256:' + 'f'.repeat(64);
const r = (id: string, role: 'LOW_SPEED'|'HUMP_REGION'|'CRUISE'|'SPRINT',
  speedKnots: number, total: number) => ({
    id, role, speedKnots, displacementKg: 6200,
    totalAppendedCalmWaterResistanceN: total,
    expandedResistanceUncertaintyN: 100,
    addedEnvironmentResistanceN: 200,
    resistanceSourceRef: ref,
    resistanceUncertaintySourceRef: ref,
    environmentalCorrectionSourceRef: ref
  });
const p = (id: string, speedKnots: number) => ({
  id, speedKnots, totalInstalledAvailableThrustN: 20000,
  totalContinuousAvailableShaftPowerKw: 200,
  quasiPropulsiveEfficiency: 0.65,
  efficiencyAbsoluteUncertainty: 0.05,
  thrustDeductionFraction: 0.15,
  thrustDeductionAbsoluteUncertainty: 0.02,
  thrustCurveSourceRef: ref, powerCurveSourceRef: ref,
  efficiencySourceRef: ref, thrustDeductionSourceRef: ref,
  thermalDeratingSourceRef: ref
});
const trial = (id: string, nominal: number) => ({
  id, nominalDesignSpeedKnots: nominal,
  measuredSpeedThroughWaterKnots: nominal,
  predictedSpeedAtMeasuredShaftPowerKnots: nominal,
  measuredShaftPowerKw: 120,
  matchingPowerConditionSourceRef: ref,
  trialSourceRef: ref,
  instrumentCalibrationSourceRef: ref
});
function sample() {
  return {
    schemaVersion: '1.0' as const,
    baseline: {
      revision: 'USV01_REV_0_4' as const,
      sourceCommitSha: 'a'.repeat(40),
      geometryRevision: ref, hullOffsetsSourceRef: ref,
      hullOffsetsSha256: digest,
      lwlM: 10.5, designDisplacementKg: 6200,
      wettedSurfaceAreaM2: 25,
      loadingCaseSourceRef: ref
    },
    resistanceCurve: [
      r('TEST-R-LOW', 'LOW_SPEED', 4, 250),
      r('TEST-R-HUMP', 'HUMP_REGION', 9, 1300),
      r('TEST-R-CRUISE', 'CRUISE', 14, 1500),
      r('TEST-R-SPRINT', 'SPRINT', 22, 4000)
    ],
    propulsionCurve: [p('TEST-P-CRUISE', 14), p('TEST-P-SPRINT', 22)],
    speedPowerTrials: [trial('TEST-T-CRUISE', 14), trial('TEST-T-SPRINT', 22)],
    evidenceReferences: {
      humpCoverageAndConvergence: ref, scaleAndModelCorrelation: ref,
      podBollardPull: ref, cavitationVentilation: ref,
      oneDriveDegradedOperation: ref, motorEscElectricalProtection: ref,
      batteryEnergyAndEndurance: ref, actualEnvironmentalEnvelope: ref
    }
  };
}

describe('RES-01 independent-data acceptance screening (NOT certification)', () => {
  it('fails closed and identifies every unclosed gate when no data exist', () => {
    const result = screenResistancePropulsionEvidence(undefined);
    expect(result.status).toBe('MISSING_EVIDENCE');
    expect(result.missingGates).toEqual(RES01_GATES);
    expect(result.numericalChecksPassed).toBe(false);
    expect(result.releaseApproved).toBe(false);
  });

  it('rejects malformed, unknown, non-finite and unsigned source metadata', () => {
    const data = sample();
    expect(resistancePropulsionEvidenceSchema.safeParse(data).success).toBe(true);
    expect(screenResistancePropulsionEvidence({ ...data, arbitrary: 1 }).status).toBe('INVALID_EVIDENCE');
    expect(screenResistancePropulsionEvidence({
      ...data, baseline: { ...data.baseline, hullOffsetsSha256: 'faked' }
    }).status).toBe('INVALID_EVIDENCE');
    expect(screenResistancePropulsionEvidence({
      ...data, propulsionCurve: [{ ...data.propulsionCurve[0], quasiPropulsiveEfficiency: Number.NaN }]
    }).status).toBe('INVALID_EVIDENCE');
  });

  it('propagates conservative resistance, efficiency and thrust deduction without approval', () => {
    const result = screenResistancePropulsionEvidence(sample());
    expect(result.status).toBe('NUMERIC_PASS_UNCERTIFIED');
    const sprint = result.cases.find(c => c.caseId === 'SPRINT')!;
    const V = 22 * 1852 / 3600;
    const Rupper = 4000 + 100 + 200;
    expect(sprint.effectivePowerUpperKw).toBeCloseTo(Rupper * V / 1000, 8);
    expect(sprint.requiredShaftPowerUpperKw).toBeCloseTo(Rupper * V / (1000 * 0.60), 8);
    expect(sprint.requiredTotalThrustUpperN).toBeCloseTo(Rupper / (1 - 0.17), 8);
    expect(sprint.powerCapacityPass).toBe(true);
    expect(sprint.thrustCapacityPass).toBe(true);
    expect(result.speedTrialChecks).toHaveLength(2);
    expect(result.missingGates).toEqual(RES01_GATES);
    expect(result.independentlyValidated).toBe(false);
    expect(result.releaseApproved).toBe(false);
  });

  it('flags inadequate continuous shaft power and installed thrust without offering motor acceptance', () => {
    const data = sample();
    data.propulsionCurve[1].totalContinuousAvailableShaftPowerKw = 1;
    data.propulsionCurve[1].totalInstalledAvailableThrustN = 1;
    const result = screenResistancePropulsionEvidence(data);
    expect(result.status).toBe('NUMERIC_FAIL');
    expect(result.cases.find(c => c.caseId === 'SPRINT')?.powerCapacityPass).toBe(false);
    expect(result.cases.find(c => c.caseId === 'SPRINT')?.thrustCapacityPass).toBe(false);
    expect(result.releaseApproved).toBe(false);
  });

  it('compares trial speed to prediction at measured shaft power, not nominal speed', () => {
    const data = sample();
    data.speedPowerTrials[1].measuredSpeedThroughWaterKnots = 21.9;
    data.speedPowerTrials[1].predictedSpeedAtMeasuredShaftPowerKnots = 21.7;
    const screened = screenResistancePropulsionEvidence(data);
    expect(screened.speedTrialChecks.find(x => x.caseId === 'SPRINT')?.speedErrorKnots).toBeCloseTo(0.2, 8);
    expect(screened.status).toBe('NUMERIC_PASS_UNCERTIFIED');
    data.speedPowerTrials[1].predictedSpeedAtMeasuredShaftPowerKnots = 21;
    const failed = screenResistancePropulsionEvidence(data);
    expect(failed.status).toBe('NUMERIC_FAIL');
    expect(failed.issues.join(' ')).toContain('VVP-001');
  });

  it('refuses to mix hull revisions, mass cases, missing hump and duplicate IDs', () => {
    const data = sample();
    data.baseline.lwlM = 2.5;
    data.resistanceCurve[0].displacementKg = 120;
    data.resistanceCurve.splice(1, 1);
    data.propulsionCurve[1].id = data.propulsionCurve[0].id;
    const result = screenResistancePropulsionEvidence(data);
    expect(result.status).toBe('NUMERIC_FAIL');
    expect(result.issues.join(' ')).toMatch(/do not mix vessels/i);
    expect(result.issues.join(' ')).toMatch(/different displacement/);
    expect(result.issues.join(' ')).toMatch(/hump-region/);
    expect(result.issues.join(' ')).toMatch(/Duplicate evidence case ID/);
    expect(result.releaseApproved).toBe(false);
  });

  it('blocks nonphysical uncertainty combinations', () => {
    const data = sample();
    data.propulsionCurve[0].efficiencyAbsoluteUncertainty = 0.8;
    data.propulsionCurve[1].thrustDeductionAbsoluteUncertainty = 0.9;
    const result = screenResistancePropulsionEvidence(data);
    expect(result.status).toBe('NUMERIC_FAIL');
    expect(result.cases).toHaveLength(0);
    expect(result.issues.join(' ')).toMatch(/physically unusable/);
  });
});
