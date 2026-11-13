import { z } from 'zod';

/**
 * RES-01 traceable evidence screening, not certification or authentication.
 * Evidence identifiers and hashes are caller-supplied metadata until independently
 * verified. This module deliberately NEVER approves an engineering release.
 */
const reference = z.string().trim().min(8).max(400);
const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const speed = z.number().finite().positive().max(100);
const positive = z.number().finite().positive();
const nonnegative = z.number().finite().nonnegative();

const resistancePoint = z.strictObject({
  id: reference,
  role: z.enum(['LOW_SPEED', 'HUMP_REGION', 'CRUISE', 'SPRINT']),
  speedKnots: speed,
  displacementKg: positive,
  totalAppendedCalmWaterResistanceN: positive,
  expandedResistanceUncertaintyN: nonnegative,
  addedEnvironmentResistanceN: nonnegative,
  resistanceSourceRef: reference,
  resistanceUncertaintySourceRef: reference,
  environmentalCorrectionSourceRef: reference
});

const propulsionPoint = z.strictObject({
  id: reference,
  speedKnots: speed,
  totalInstalledAvailableThrustN: positive,
  totalContinuousAvailableShaftPowerKw: positive,
  // Conservative lower eta and upper thrust deduction in calculations.
  quasiPropulsiveEfficiency: z.number().finite().positive().max(1),
  efficiencyAbsoluteUncertainty: nonnegative,
  thrustDeductionFraction: z.number().finite().nonnegative().max(0.95),
  thrustDeductionAbsoluteUncertainty: nonnegative,
  thrustCurveSourceRef: reference,
  powerCurveSourceRef: reference,
  efficiencySourceRef: reference,
  thrustDeductionSourceRef: reference,
  thermalDeratingSourceRef: reference
});

const trialPoint = z.strictObject({
  id: reference,
  nominalDesignSpeedKnots: speed,
  measuredSpeedThroughWaterKnots: speed,
  predictedSpeedAtMeasuredShaftPowerKnots: speed,
  measuredShaftPowerKw: positive,
  matchingPowerConditionSourceRef: reference,
  trialSourceRef: reference,
  instrumentCalibrationSourceRef: reference
});

export const resistancePropulsionEvidenceSchema = z.strictObject({
  schemaVersion: z.literal('1.0'),
  baseline: z.strictObject({
    // Rev 0.4 is the *repository candidate*, not an independently accepted design.
    revision: z.literal('USV01_REV_0_4'),
    sourceCommitSha: z.string().regex(/^[a-f0-9]{40}$/),
    geometryRevision: reference,
    hullOffsetsSourceRef: reference,
    hullOffsetsSha256: digest,
    lwlM: positive,
    designDisplacementKg: positive,
    wettedSurfaceAreaM2: positive,
    loadingCaseSourceRef: reference
  }),
  resistanceCurve: z.array(resistancePoint).max(200),
  propulsionCurve: z.array(propulsionPoint).max(200),
  speedPowerTrials: z.array(trialPoint).max(50),
  evidenceReferences: z.strictObject({
    humpCoverageAndConvergence: reference,
    scaleAndModelCorrelation: reference,
    podBollardPull: reference,
    cavitationVentilation: reference,
    oneDriveDegradedOperation: reference,
    motorEscElectricalProtection: reference,
    batteryEnergyAndEndurance: reference,
    actualEnvironmentalEnvelope: reference
  })
});

export type ResistancePropulsionEvidence = z.infer<typeof resistancePropulsionEvidenceSchema>;
export type ResistancePropulsionGate = 'RES-01-A' | 'RES-01-B' | 'RES-01-C' |
  'RES-01-D' | 'RES-01-E' | 'VVP-001' | 'GOV-02' | 'GOV-01';
export const RES01_GATES: readonly ResistancePropulsionGate[] = [
  'RES-01-A', 'RES-01-B', 'RES-01-C', 'RES-01-D', 'RES-01-E',
  'VVP-001', 'GOV-02', 'GOV-01'
];

export interface ResistancePowerCheck {
  caseId: string;
  speedKnots: number;
  effectivePowerUpperKw: number;
  requiredShaftPowerUpperKw: number;
  requiredTotalThrustUpperN: number;
  availableShaftPowerKw: number;
  availableTotalThrustN: number;
  powerCapacityPass: boolean;
  thrustCapacityPass: boolean;
}

export interface ResistancePropulsionScreen {
  status: 'MISSING_EVIDENCE' | 'INVALID_EVIDENCE' |
    'NUMERIC_FAIL' | 'NUMERIC_PASS_UNCERTIFIED';
  issues: string[];
  missingGates: ResistancePropulsionGate[];
  numericalProblemGates: ResistancePropulsionGate[];
  cases: ResistancePowerCheck[];
  speedTrialChecks: Array<{
    caseId: string; nominalKnots: number; measuredKnots: number;
    speedErrorKnots: number; withinProjectTolerance: boolean;
  }>;
  numericalChecksPassed: boolean;
  independentlyValidated: false;
  releaseApproved: false;
}

const empty = (status: ResistancePropulsionScreen['status'], issues: string[],
  missingGates: ResistancePropulsionGate[]): ResistancePropulsionScreen => ({
  status, issues, missingGates, numericalProblemGates: [], cases: [], speedTrialChecks: [],
  numericalChecksPassed: false, independentlyValidated: false, releaseApproved: false
});

/**
 * This is a screening tool for supplied records. A referenced file or a
 * successful consistency check is not proof of its measurement provenance.
 * The final GOV-01/GOV-02 gates ALWAYS remain open in this model.
 */
export function screenResistancePropulsionEvidence(raw: unknown, expectedBaselineSha?: string): ResistancePropulsionScreen {
  if (raw === undefined || raw === null) {
    return empty('MISSING_EVIDENCE', ['No controlled RES-01 evidence package supplied'], [...RES01_GATES]);
  }
  const parsed = resistancePropulsionEvidenceSchema.safeParse(raw);
  if (!parsed.success) {
    return empty('INVALID_EVIDENCE', parsed.error.issues.map(
      i => (i.path.join('.') || 'root') + ': ' + i.message
    ), [...RES01_GATES]);
  }
  const data = parsed.data;
  const issues: string[] = [];
  const unresolved = new Set<ResistancePropulsionGate>();
  if (expectedBaselineSha && data.baseline.sourceCommitSha !== expectedBaselineSha) {
    issues.push('Evidence package source commit does not match the requested exact baseline SHA');
    unresolved.add('RES-01-A');
  }
  const ids = new Set<string>();
  for (const item of [...data.resistanceCurve, ...data.propulsionCurve, ...data.speedPowerTrials]) {
    if (ids.has(item.id)) issues.push('Duplicate evidence case ID: ' + item.id);
    ids.add(item.id);
  }
  // Prevent mixing the unrelated 2.5m / 120kg concept with this 10.5m / 6.2t
  // repository candidate. A different approved design needs a new revision.
  if (Math.abs(data.baseline.lwlM - 10.5) > 1e-6 ||
      Math.abs(data.baseline.designDisplacementKg - 6200) > 1e-6) {
    issues.push('Baseline revision does not match Rev 0.4 LWL=10.5m and 6200kg candidate; do not mix vessels');
    unresolved.add('RES-01-A');
  }
  if (data.baseline.wettedSurfaceAreaM2 <= 0) unresolved.add('RES-01-A');
  const cases: ResistancePowerCheck[] = [];
  const speedTrialChecks: ResistancePropulsionScreen['speedTrialChecks'] = [];
  for (const [role, target] of [['CRUISE', 14], ['SPRINT', 22]] as const) {
    const rset = data.resistanceCurve.filter(p => p.role === role && Math.abs(p.speedKnots - target) < 1e-6);
    const pset = data.propulsionCurve.filter(p => Math.abs(p.speedKnots - target) < 1e-6);
    const trials = data.speedPowerTrials.filter(p => Math.abs(p.nominalDesignSpeedKnots - target) < 1e-6);
    if (rset.length !== 1) { issues.push('Expected exactly one ' + role + ' total appended resistance case at ' + target + ' kn'); unresolved.add('RES-01-B'); }
    if (pset.length !== 1) { issues.push('Expected exactly one propulsor/motor capacity case at ' + target + ' kn'); unresolved.add('RES-01-D'); unresolved.add('RES-01-E'); }
    if (trials.length !== 1) { issues.push('Expected exactly one instrumented speed-power trial at ' + target + ' kn'); unresolved.add('VVP-001'); }
    const r = rset[0], p = pset[0], trial = trials[0];
    if (r && Math.abs(r.displacementKg - data.baseline.designDisplacementKg) > 1e-6) {
      issues.push(role + ' resistance measured at a different displacement to geometry baseline');
      unresolved.add('RES-01-B');
    }
    if (r && p) {
      const etaLow = p.quasiPropulsiveEfficiency - p.efficiencyAbsoluteUncertainty;
      const tHigh = p.thrustDeductionFraction + p.thrustDeductionAbsoluteUncertainty;
      if (etaLow <= 0 || tHigh >= 1) {
        issues.push(role + ' uncertain efficiency or thrust deduction is physically unusable');
        unresolved.add('RES-01-D');
      } else {
        const speedMs = target * 1852 / 3600;
        const totalRUpperN = r.totalAppendedCalmWaterResistanceN +
          r.expandedResistanceUncertaintyN + r.addedEnvironmentResistanceN;
        const shaftUpperKw = totalRUpperN * speedMs / (1000 * etaLow);
        const thrustUpperN = totalRUpperN / (1 - tHigh);
        cases.push({
          caseId: role, speedKnots: target,
          effectivePowerUpperKw: totalRUpperN * speedMs / 1000,
          requiredShaftPowerUpperKw: shaftUpperKw,
          requiredTotalThrustUpperN: thrustUpperN,
          availableShaftPowerKw: p.totalContinuousAvailableShaftPowerKw,
          availableTotalThrustN: p.totalInstalledAvailableThrustN,
          powerCapacityPass: p.totalContinuousAvailableShaftPowerKw >= shaftUpperKw,
          thrustCapacityPass: p.totalInstalledAvailableThrustN >= thrustUpperN
        });
        if (p.totalContinuousAvailableShaftPowerKw < shaftUpperKw) {
          issues.push(role + ' continuous shaft power insufficient under supplied upper resistance / lower efficiency bounds');
          unresolved.add('RES-01-E');
        }
        if (p.totalInstalledAvailableThrustN < thrustUpperN) {
          issues.push(role + ' thrust insufficient under supplied resistance and deduction bounds');
          unresolved.add('RES-01-D');
        }
      }
    }
    if (trial) {
      // VVP-001 compares observed speed against curve prediction at the same
      // measured shaft-power condition, NOT merely against nominal design speed.
      const error = Math.abs(trial.measuredSpeedThroughWaterKnots - trial.predictedSpeedAtMeasuredShaftPowerKnots);
      speedTrialChecks.push({
        caseId: role, nominalKnots: target,
        measuredKnots: trial.measuredSpeedThroughWaterKnots,
        speedErrorKnots: Number(error.toFixed(6)),
        withinProjectTolerance: error <= 0.5 // VVP-001 project criterion, not a generic ITTC threshold
      });
      if (error > 0.5) {
        issues.push(role + ' measured-versus-predicted speed differs by more than VVP-001 ±0.5 kn at matched shaft power');
        unresolved.add('VVP-001');
      }
    }
  }
  if (!data.resistanceCurve.some(p => p.role === 'HUMP_REGION') ||
      !data.resistanceCurve.some(p => p.role === 'LOW_SPEED')) {
    issues.push('Low-speed and hump-region resistance cases are not both represented');
    unresolved.add('RES-01-B');
  }
  for (const r of data.resistanceCurve) {
    if (Math.abs(r.displacementKg - data.baseline.designDisplacementKg) > 1e-6) {
      issues.push('Resistance case ' + r.id + ' has incompatible design displacement');
      unresolved.add('RES-01-B');
    }
  }
  // The external references for sea margin, wake, cavitation, durability and
  // sea trials are presence checks only; a separate qualified reviewer must
  // examine their content, test method, provenance, load case and uncertainty.
  if (issues.some(i => i.includes('environment'))) unresolved.add('RES-01-C');
  const hasNumerics = cases.length === 2 && speedTrialChecks.length === 2;
  const numericalChecksPassed = hasNumerics && issues.length === 0;
  const status = !hasNumerics ? 'MISSING_EVIDENCE' :
    issues.length ? 'NUMERIC_FAIL' : 'NUMERIC_PASS_UNCERTIFIED';
  // Data submitted by the same system are NEVER independent proof. Every physical
  // gate stays unclosed until authenticated sources and qualified external review.
  // `unresolved` records numerical defects but is NOT a replacement for authorization.
  return {
    status, issues, missingGates: [...RES01_GATES],
    numericalProblemGates: [...unresolved],
    cases, speedTrialChecks, numericalChecksPassed,
    independentlyValidated: false, releaseApproved: false
  };
}
