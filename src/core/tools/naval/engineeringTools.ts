import { z } from 'zod';
import type { EngineeringTool } from '../../types/tools.ts';

// 1. Hydrostatics Tool
export const HydrostaticsTool: EngineeringTool = {
  id: 'TOOL-HYDROSTATICS-01',
  name: 'Naval Hydrostatics & Intact Stability Calculator',
  category: 'HYDROSTATICS',
  description: 'Deterministic calculation of hull underwater volume, displacement, KB, BMt, KMt, and metacentric height (GMt) based on principal particulars.',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: z.object({
    lwlMeters: z.number().positive(),
    beamMeters: z.number().positive(),
    draftMeters: z.number().positive(),
    blockCoefficientCb: z.number().min(0.30).max(0.95).optional(),
    waterplaneCoefficientCwp: z.number().min(0.4).max(0.95).optional(),
    kgMeters: z.number().nonnegative().optional(),
    displacementTonnes: z.number().positive().optional(),
    seawaterDensityKgM3: z.number().min(900).max(1100).default(1025)
  }).passthrough().superRefine((data, ctx) => {
    if (data.blockCoefficientCb === undefined && data.displacementTonnes === undefined) {
      ctx.addIssue({ code: 'custom', message: 'An explicit Cb or measured displacement is required; arbitrary hull fullness is prohibited.' });
      return;
    }
    const prism = data.lwlMeters * data.beamMeters * data.draftMeters;
    const inferredCb = data.displacementTonnes === undefined ? undefined :
      (data.displacementTonnes * 1000) / (data.seawaterDensityKgM3 * prism);
    if (inferredCb !== undefined && (inferredCb < 0.30 || inferredCb > 0.95)) {
      ctx.addIssue({ code: 'custom', message: 'Mass implies Cb outside supported hull envelope.' });
    }
    if (inferredCb !== undefined && data.blockCoefficientCb !== undefined &&
        Math.abs(inferredCb - data.blockCoefficientCb) > 0.01 * data.blockCoefficientCb) {
      ctx.addIssue({ code: 'custom', message: 'Displacement, Cb and hull prism contradict mass conservation.' });
    }
  }),
  outputSchema: z.object({
    displacedVolumeM3: z.number(),
    displacementTonnes: z.number(),
    centerOfBuoyancyKbM: z.number(),
    transverseMetacentricRadiusBmtM: z.number(),
    transverseMetacenterKmtM: z.number(),
    metacentricHeightGmtM: z.null(),
    preliminaryGmScreeningM: z.number().nullable(),
    stabilityStatus: z.enum(['STABLE_COMPLIANT', 'MARGINAL', 'UNSTABLE_CRITICAL', 'UNVERIFIED_ESTIMATE']),
    isPreliminaryEstimate: z.boolean(),
    engineeringComplianceValidated: z.literal(false),
    kgSource: z.enum(['USER_PROVIDED', 'NOT_PROVIDED']),
    complianceCheck: z.object({
      minGmMet: z.boolean(),
      morrishKbApproximationM: z.number()
    })
  }),
  execute: (input: any) => {
    const { lwlMeters, beamMeters, draftMeters, seawaterDensityKgM3 = 1025 } = input;
    const prism = lwlMeters * beamMeters * draftMeters;
    const cb = input.blockCoefficientCb ??
      ((input.displacementTonnes * 1000) / (seawaterDensityKgM3 * prism));
    const cwp = input.waterplaneCoefficientCwp ?? Math.min(0.95, Math.max(0.4, cb + 0.18));
    const volume = prism * cb;
    const massT = volume * seawaterDensityKgM3 / 1000;
    // Parametric screening, NOT offset-integrated hydrostatics or GZ compliance.
    const kb = draftMeters * (5 / 6 - cb / (3 * cwp));
    const bmt = (cwp * lwlMeters * Math.pow(beamMeters, 3) / 12) / volume;
    const kmt = kb + bmt;
    const hasKg = input.kgMeters !== undefined;
    const gm = hasKg ? kmt - input.kgMeters : null;
    return {
      displacedVolumeM3: Number(volume.toFixed(3)),
      displacementTonnes: Number(massT.toFixed(3)),
      centerOfBuoyancyKbM: Number(kb.toFixed(3)),
      transverseMetacentricRadiusBmtM: Number(bmt.toFixed(3)),
      transverseMetacenterKmtM: Number(kmt.toFixed(3)),
      metacentricHeightGmtM: null, // No KG/GZ/offset-integrated, class-validated GM exists.
      preliminaryGmScreeningM: gm === null ? null : Number(gm.toFixed(3)),
      stabilityStatus: gm !== null && gm < 0 ? 'UNSTABLE_CRITICAL' : 'UNVERIFIED_ESTIMATE',
      isPreliminaryEstimate: true,
      engineeringComplianceValidated: false,
      kgSource: hasKg ? 'USER_PROVIDED' : 'NOT_PROVIDED',
      complianceCheck: {
        minGmMet: false, // Do not assert stability compliance from an approximate GM.
        morrishKbApproximationM: Number(kb.toFixed(3))
      }
    };
  }
};

// 2. Hydrodynamic Resistance & Powering Tool — RES-01 evidence-gated Rev B
// PROVENANCE IS NOT VALIDATION. Evidence IDs are references for independent
// verification; neither these inputs nor deterministic arithmetic approve a design.
export const ResistanceTool: EngineeringTool = {
  id: 'TOOL-RESISTANCE-01',
  name: 'Evidence-gated Resistance & Propulsive Power Screen',
  category: 'HYDRODYNAMICS',
  description: 'Calculates Froude number and optional ITTC-1957 smooth-plate friction. Total resistance and shaft power remain null until separately evidenced inputs are supplied; never substitutes fabricated residual coefficients or efficiency defaults.',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: z.object({
    lwlMeters: z.number().positive(),
    beamMeters: z.number().positive(),
    draftMeters: z.number().positive(),
    displacementTonnes: z.number().positive(),
    speedKnots: z.number().positive(),
    seawaterDensityKgM3: z.number().positive().default(1025),
    kinematicViscosityM2S: z.number().positive().default(1.188e-6),
    wettedSurfaceAreaM2: z.number().positive().optional(),
    wettedAreaEvidenceRef: z.string().trim().min(8).optional(),
    documentedTotalResistanceKn: z.number().positive().optional(),
    resistanceEvidenceRef: z.string().trim().min(8).optional(),
    totalResistanceRangeKn: z.object({
      min: z.number().nonnegative(),
      max: z.number().positive()
    }).optional(),
    propulsiveEfficiencyEtaD: z.number().positive().max(1).optional(),
    efficiencyEvidenceRef: z.string().trim().min(8).optional(),
    efficiencyRange: z.object({
      min: z.number().positive().max(1),
      max: z.number().positive().max(1)
    }).optional()
  }).passthrough().superRefine((d, ctx) => {
    const flag = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (d.displacementTonnes * 1000 > d.seawaterDensityKgM3 * d.lwlMeters * d.beamMeters * d.draftMeters) {
      flag('displacementTonnes', 'Mass exceeds the geometric enclosing prism; check dimensions, mass and reference water density.');
    }
    if (d.wettedSurfaceAreaM2 !== undefined && !d.wettedAreaEvidenceRef) {
      flag('wettedAreaEvidenceRef', 'A source/revision identifier is required for wetted area.');
    }
    if (d.documentedTotalResistanceKn !== undefined && !d.resistanceEvidenceRef) {
      flag('resistanceEvidenceRef', 'A source/revision identifier is required for externally derived total resistance.');
    }
    if (d.totalResistanceRangeKn !== undefined) {
      if (d.documentedTotalResistanceKn === undefined) flag('documentedTotalResistanceKn', 'Bounds require a documented central resistance estimate.');
      else if (d.totalResistanceRangeKn.min > d.documentedTotalResistanceKn || d.totalResistanceRangeKn.max < d.documentedTotalResistanceKn) {
        flag('totalResistanceRangeKn', 'Resistance bounds must contain the central value.');
      }
    }
    if (d.propulsiveEfficiencyEtaD !== undefined && !d.efficiencyEvidenceRef) {
      flag('efficiencyEvidenceRef', 'A source/revision identifier is required for quasi-propulsive efficiency.');
    }
    if (d.efficiencyRange !== undefined) {
      if (d.propulsiveEfficiencyEtaD === undefined) flag('propulsiveEfficiencyEtaD', 'Efficiency bounds require a documented central efficiency.');
      else if (d.efficiencyRange.min > d.propulsiveEfficiencyEtaD || d.efficiencyRange.max < d.propulsiveEfficiencyEtaD) {
        flag('efficiencyRange', 'Efficiency bounds must contain the central value.');
      }
    }
  }),
  outputSchema: z.object({
    speedMps: z.number(),
    froudeNumberFn: z.number(),
    froudeSpeedBand: z.enum(['LOW', 'INTERMEDIATE', 'HIGH']),
    hydrodynamicRegime: z.literal('UNVERIFIED'),
    reynoldsNumber: z.number(),
    frictionCoefficientCf: z.number(),
    frictionalResistanceKn: z.number().nullable(),
    residualResistanceKn: z.null(),
    totalResistanceKn: z.number().nullable(),
    effectivePowerPeKw: z.number().nullable(),
    shaftBrakePowerPbKw: z.number().nullable(),
    effectivePowerRangeKw: z.object({ min: z.number(), max: z.number() }).nullable(),
    shaftBrakePowerRangeKw: z.object({ min: z.number(), max: z.number() }).nullable(),
    missingEvidence: z.array(z.string()),
    engineeringComplianceValidated: z.literal(false),
    modelStatus: z.enum(['INSUFFICIENT_EVIDENCE', 'EVIDENCE_REFERENCED_UNVERIFIED'])
  }),
  execute: (input: any) => {
    // Defaults in the input schema are explicitly preliminary *fluid properties*,
    // never hull-derived areas, residual drag, efficiency, or motor ratings.
    const g = 9.80665;
    const speedMps = input.speedKnots * (1852 / 3600);
    const fn = speedMps / Math.sqrt(g * input.lwlMeters);
    const re = speedMps * input.lwlMeters / input.kinematicViscosityM2S;
    if (re <= 100 || !Number.isFinite(re)) {
      throw new Error('Reynolds number is outside the valid ITTC-1957 correlation range.');
    }
    const cf = 0.075 / Math.pow(Math.log10(re) - 2, 2);
    const q = 0.5 * input.seawaterDensityKgM3 * speedMps * speedMps;
    const frictionKn = input.wettedSurfaceAreaM2 === undefined
      ? null : q * input.wettedSurfaceAreaM2 * cf / 1000;
    // External total-resistance data must already account for all relevant
    // hull/appendage effects at the specified condition: do NOT add Rf again.
    const totalKn = input.documentedTotalResistanceKn ?? null;
    const powerKw = totalKn === null ? null : totalKn * speedMps;
    const shaftKw = powerKw === null || input.propulsiveEfficiencyEtaD === undefined
      ? null : powerKw / input.propulsiveEfficiencyEtaD;
    const rRange = input.totalResistanceRangeKn;
    const eRange = input.efficiencyRange;
    const peRange = rRange ? { min: rRange.min * speedMps, max: rRange.max * speedMps } : null;
    const pbRange = rRange && eRange
      ? { min: rRange.min * speedMps / eRange.max, max: rRange.max * speedMps / eRange.min }
      : null;
    const missingEvidence: string[] = [];
    if (frictionKn === null) missingEvidence.push('CAD/offset-derived wetted area and its provenance');
    if (totalKn === null) missingEvidence.push('hull-specific total resistance curve from validated CFD, tow test, or accepted reference with uncertainty');
    if (input.propulsiveEfficiencyEtaD === undefined) missingEvidence.push('propulsor/hull interaction and quasi-propulsive efficiency evidence');
    if (peRange === null) missingEvidence.push('resistance uncertainty interval');
    if (pbRange === null) missingEvidence.push('combined resistance and efficiency uncertainty intervals');
    missingEvidence.push('verified wake/thrust-deduction, bollard pull, manoeuvring and cavitation/ventilation limits');
    missingEvidence.push('motor/ESC/shaft and thermal ratings; duty cycle; sea-trial correlation; human approval');

    const round = (x: number | null) => x === null ? null : Number(x.toFixed(6));
    return {
      speedMps: round(speedMps),
      froudeNumberFn: round(fn),
      froudeSpeedBand: fn < 0.4 ? 'LOW' : fn < 0.9 ? 'INTERMEDIATE' : 'HIGH',
      hydrodynamicRegime: 'UNVERIFIED' as const,
      reynoldsNumber: Number(re.toPrecision(9)),
      frictionCoefficientCf: round(cf),
      frictionalResistanceKn: round(frictionKn),
      residualResistanceKn: null,
      totalResistanceKn: round(totalKn),
      effectivePowerPeKw: round(powerKw),
      shaftBrakePowerPbKw: round(shaftKw),
      effectivePowerRangeKw: peRange ? { min: round(peRange.min)!, max: round(peRange.max)! } : null,
      shaftBrakePowerRangeKw: pbRange ? { min: round(pbRange.min)!, max: round(pbRange.max)! } : null,
      missingEvidence,
      engineeringComplianceValidated: false as const,
      modelStatus: totalKn === null || shaftKw === null
        ? 'INSUFFICIENT_EVIDENCE' as const
        : 'EVIDENCE_REFERENCED_UNVERIFIED' as const
    };
  }
};

// 3. Mass Balance & Centers of Gravity Tool
export const MassBalanceTool: EngineeringTool = {
  id: 'TOOL-MASS-BALANCE-01',
  name: 'Mass Properties & Center of Gravity Ledger',
  category: 'WEIGHT_MASS',
  description: 'Deterministic SWBS mass distribution, composite centers (KG, LCG, TCG), and design growth margins.',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: z.object({
    components: z.array(z.object({
      name: z.string().trim().min(1),
      massKg: z.number().positive(),
      lcgMetersFromTransom: z.number(),
      tcgMetersFromCl: z.number(),
      vcgMetersFromKeel: z.number().nonnegative(),
      designMarginPercent: z.number().min(0).max(50)
    })).min(1, 'Mass ledger cannot be empty'),
    baselineLcbMetersFromTransom: z.number().optional()
  }).passthrough().superRefine((data, ctx) => {
    const names = data.components.map(c => c.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate component names: mass ledger double-counting risk.' });
    }
  }),
  outputSchema: z.object({
    lightshipMassKg: z.number(),
    designMarginMassKg: z.number(),
    totalDisplacementKg: z.number(),
    totalDisplacementTonnes: z.number(),
    massLedgerComplete: z.literal(false),
    hydrostaticDisplacementReconciled: z.literal(false),
    compositeLcgMeters: z.number(),
    compositeTcgMeters: z.number(),
    compositeKgMeters: z.number(),
    longitudinalTrimEvaluation: z.object({
      lcbAlignmentMeters: z.number().optional(),
      trimRisk: z.enum(['ALIGNED', 'EXCESSIVE_TRIM_AFT', 'EXCESSIVE_TRIM_FWD', 'UNASSESSED_NO_LCB'])
    })
  }),
  execute: (input: any) => {
    const { components, baselineLcbMetersFromTransom } = input;

    let lightshipMassKg = 0;
    let designMarginMassKg = 0;
    let sumLcgMoment = 0;
    let sumTcgMoment = 0;
    let sumVcgMoment = 0;

    for (const comp of components) {
      const margin = comp.designMarginPercent / 100;
      const totalCompMass = comp.massKg * (1 + margin);

      lightshipMassKg += comp.massKg;
      designMarginMassKg += comp.massKg * margin;

      sumLcgMoment += totalCompMass * comp.lcgMetersFromTransom;
      sumTcgMoment += totalCompMass * comp.tcgMetersFromCl;
      sumVcgMoment += totalCompMass * comp.vcgMetersFromKeel;
    }

    const totalDisplacementKg = lightshipMassKg + designMarginMassKg;
    const totalDisplacementTonnes = totalDisplacementKg / 1000;

    const compositeLcgMeters = totalDisplacementKg > 0 ? sumLcgMoment / totalDisplacementKg : 0;
    const compositeTcgMeters = totalDisplacementKg > 0 ? sumTcgMoment / totalDisplacementKg : 0;
    const compositeKgMeters = totalDisplacementKg > 0 ? sumVcgMoment / totalDisplacementKg : 0;

    let trimRisk: 'ALIGNED' | 'EXCESSIVE_TRIM_AFT' | 'EXCESSIVE_TRIM_FWD' | 'UNASSESSED_NO_LCB' =
      baselineLcbMetersFromTransom === undefined ? 'UNASSESSED_NO_LCB' : 'ALIGNED';
    let lcbDiff: number | undefined;

    if (baselineLcbMetersFromTransom !== undefined) {
      lcbDiff = compositeLcgMeters - baselineLcbMetersFromTransom;
      if (lcbDiff > 0.5) {
        trimRisk = 'EXCESSIVE_TRIM_FWD';
      } else if (lcbDiff < -0.5) {
        trimRisk = 'EXCESSIVE_TRIM_AFT';
      }
    }

    return {
      lightshipMassKg: Number(lightshipMassKg.toFixed(2)),
      designMarginMassKg: Number(designMarginMassKg.toFixed(2)),
      totalDisplacementKg: Number(totalDisplacementKg.toFixed(2)),
      totalDisplacementTonnes: Number(totalDisplacementTonnes.toFixed(3)),
      massLedgerComplete: false,
      hydrostaticDisplacementReconciled: false,
      compositeLcgMeters: Number(compositeLcgMeters.toFixed(3)),
      compositeTcgMeters: Number(compositeTcgMeters.toFixed(3)),
      compositeKgMeters: Number(compositeKgMeters.toFixed(3)),
      longitudinalTrimEvaluation: {
        lcbAlignmentMeters: lcbDiff !== undefined ? Number(lcbDiff.toFixed(3)) : undefined,
        trimRisk
      }
    };
  }
};

// 4. Electrical Load Balance & Battery Sizing Tool
export const ElectricalLoadTool: EngineeringTool = {
  id: 'TOOL-ELECTRICAL-01',
  name: 'DC Electrical Load Balance & Battery Sizing Calculator',
  category: 'ELECTRICAL',
  description: 'Deterministic load balance for 24V/48V/HV DC systems across transit, loiter, and emergency profiles.',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: z.object({
    busVoltageV: z.number().positive(),
    batteryTotalKwh: z.number().positive(),
    usableDepthOfDischarge: z.number().min(0.1).max(1.0),
    consumers: z.array(z.object({
      name: z.string().trim().min(1),
      voltageV: z.number().positive(),
      continuousPowerW: z.number().nonnegative(),
      intermittentPowerW: z.number().nonnegative(),
      dutyCycle: z.number().min(0).max(1),
      isEmergencyLoad: z.boolean()
    })).min(1, 'At least one real load is required')
  }).passthrough().superRefine((data, ctx) => {
    const names = data.consumers.map(c => c.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate electrical consumer names may double-count load.' });
    }
    if (data.consumers.some(c => c.voltageV !== data.busVoltageV)) {
      ctx.addIssue({ code: 'custom', message: 'Different consumer and DC bus voltages require a separately verified converter efficiency model.' });
    }
    if (data.consumers.every(c => c.continuousPowerW + c.intermittentPowerW * c.dutyCycle === 0)) {
      ctx.addIssue({ code: 'custom', message: 'Zero-load endurance cannot be represented as a finite mission duration.' });
    }
  }),
  outputSchema: z.object({
    totalContinuousPowerW: z.number(),
    averagePowerW: z.number(),
    peakPowerW: z.number(),
    nominalBusCurrentAmps: z.number(),
    usableBatteryKwh: z.number(),
    estimatedEnduranceHours: z.null(),
    idealizedEnergyUpperBoundHours: z.number(),
    missionEnduranceValidated: z.literal(false),
    emergencyLoadPowerW: z.number(),
    emergencyEnduranceHours: z.null(),
    idealizedEmergencyEnergyUpperBoundHours: z.number().nullable(),
    emergencySafeStateValidated: z.literal(false),
    recommendedMainFuseRatingAmps: z.null(),
    protectiveDeviceSizingValidated: z.literal(false)
  }),
  execute: (input: any) => {
    const { busVoltageV = 48, batteryTotalKwh, usableDepthOfDischarge = 0.8, consumers } = input;

    let totalContinuousPowerW = 0;
    let averagePowerW = 0;
    let peakPowerW = 0;
    let emergencyLoadPowerW = 0;

    for (const c of consumers) {
      totalContinuousPowerW += c.continuousPowerW;
      const compAvg = c.continuousPowerW + (c.intermittentPowerW * c.dutyCycle);
      averagePowerW += compAvg;
      peakPowerW += (c.continuousPowerW + c.intermittentPowerW);

      if (c.isEmergencyLoad) {
        emergencyLoadPowerW += compAvg; // include declared intermittent duty load
      }
    }

    const nominalBusCurrentAmps = averagePowerW / busVoltageV;
    const peakCurrentAmps = peakPowerW / busVoltageV;
    const usableBatteryKwh = batteryTotalKwh * usableDepthOfDischarge;

    const idealizedEnergyUpperBoundHours = usableBatteryKwh * 1000 / averagePowerW;
    const idealizedEmergencyEnergyUpperBoundHours = emergencyLoadPowerW > 0
      ? usableBatteryKwh * 1000 / emergencyLoadPowerW : null;
    // NEVER issue actual endurance, emergency reserve or fuse sizing without
    // measured losses, aging/temperature, safe-state load and DC fault studies.
    const estimatedEnduranceHours = null;
    const emergencyEnduranceHours = null;
    const recommendedMainFuseRatingAmps = null;

    return {
      totalContinuousPowerW: Number(totalContinuousPowerW.toFixed(1)),
      averagePowerW: Number(averagePowerW.toFixed(1)),
      peakPowerW: Number(peakPowerW.toFixed(1)),
      nominalBusCurrentAmps: Number(nominalBusCurrentAmps.toFixed(2)),
      usableBatteryKwh: Number(usableBatteryKwh.toFixed(2)),
      estimatedEnduranceHours,
      idealizedEnergyUpperBoundHours: Number(idealizedEnergyUpperBoundHours.toFixed(2)),
      missionEnduranceValidated: false,
      emergencyLoadPowerW: Number(emergencyLoadPowerW.toFixed(1)),
      emergencyEnduranceHours,
      idealizedEmergencyEnergyUpperBoundHours: idealizedEmergencyEnergyUpperBoundHours === null
        ? null : Number(idealizedEmergencyEnergyUpperBoundHours.toFixed(2)),
      emergencySafeStateValidated: false,
      recommendedMainFuseRatingAmps,
      protectiveDeviceSizingValidated: false
    };
  }
};

// 5. Structural Scantlings Calculator
export const StructuresTool: EngineeringTool = {
  id: 'TOOL-STRUCTURES-01',
  name: 'Preliminary Hull Bottom Slamming & Plating Estimator',
  category: 'STRUCTURES',
  description: 'Uncorrelated empirical screening estimates only; NOT a validated ISO/DNV class-rule implementation.',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: z.object({
    displacementTonnes: z.number().positive(),
    speedKnots: z.number().positive(),
    lwlMeters: z.number().positive(),
    deadriseAngleDeg: z.number().min(5).max(45),
    unsupportedPanelWidthMm: z.number().positive(),
    unsupportedPanelLengthMm: z.number().positive(),
    materialYieldStrengthMpa: z.number().positive(), // 5083-H111 default
    safetyFactor: z.number().min(1)
  }).passthrough(),
  outputSchema: z.object({
    designSlammingPressureKpa: z.null(),
    allowableStressMpa: z.number(),
    aspectRatioCorrectionFactorK2: z.null(),
    minPlatingThicknessMm: z.null(),
    recommendedNominalThicknessMm: z.null(),
    stiffenerSectionModulusCm3: z.null(),
    engineeringComplianceValidated: z.literal(false),
    modelStatus: z.literal('BLOCKED_UNVALIDATED_SCANTLING_FORMULA'),
    designUsePermitted: z.literal(false)
  }),
  execute: (input: any) => {
    const {
      displacementTonnes,
      speedKnots,
      lwlMeters,
      deadriseAngleDeg,
      unsupportedPanelWidthMm,
      unsupportedPanelLengthMm,
      materialYieldStrengthMpa = 125,
      safetyFactor = 2.0
    } = input;

    // The former formula was not traceable to an approved ISO/DNV rule,
    // and did not include material, weld, laminate, fatigue, load patches,
    // boundary conditions or test validation. Returning a thickness here
    // could put a vessel at risk. Refuse to provide ANY sizing output.
    return {
      designSlammingPressureKpa: null,
      allowableStressMpa: Number((materialYieldStrengthMpa / safetyFactor).toFixed(1)),
      aspectRatioCorrectionFactorK2: null,
      minPlatingThicknessMm: null,
      recommendedNominalThicknessMm: null,
      stiffenerSectionModulusCm3: null,
      engineeringComplianceValidated: false,
      modelStatus: 'BLOCKED_UNVALIDATED_SCANTLING_FORMULA',
      designUsePermitted: false
    };
  }
};

// 6. COLREGS Collision Avoidance Vector Tool
export const ColregsTool: EngineeringTool = {
  id: 'TOOL-COLREGS-01',
  name: 'COLREG Screening Geometry (Non-Actuating)',
  category: 'AUTONOMY_COLREGS',
  description: 'Deterministic calculation of Range, Bearing, Relative Velocity, CPA, TCPA, and COLREGS encounter classification.',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: z.object({
    ownCourseDeg: z.number().min(0).max(360),
    ownSpeedKnots: z.number().nonnegative(),
    targetBearingDeg: z.number().min(0).max(360),
    bearingReference: z.literal('TRUE_NORTH'),
    targetRangeNm: z.number().positive(),
    targetCourseDeg: z.number().min(0).max(360),
    targetSpeedKnots: z.number().nonnegative(),
    visibilityMode: z.enum(['IN_SIGHT', 'RESTRICTED', 'UNKNOWN']).default('UNKNOWN'),
    ownVesselType: z.enum(['POWER_DRIVEN', 'OTHER', 'UNKNOWN']).default('UNKNOWN'),
    targetVesselType: z.enum(['POWER_DRIVEN', 'OTHER', 'UNKNOWN']).default('UNKNOWN')
  }).passthrough(),
  outputSchema: z.object({
    relativeSpeedKnots: z.number(),
    closestPointOfApproachCpaNm: z.number(),
    timeToCpaMinutes: z.number(),
    relativeBearingDeg: z.number(),
    colregsRuleApplicable: z.enum(['RULE_14_HEAD_ON', 'RULE_15_CROSSING_GIVE_WAY', 'RULE_15_CROSSING_STAND_ON', 'RULE_13_OVERTAKING', 'SAFE_PASSING', 'RULE_19_RESTRICTED_VISIBILITY', 'LEGAL_APPLICABILITY_UNDETERMINED', 'OTHER_VESSEL_PRIORITY_UNASSESSED']),
    mandatedAction: z.string(),
    safeAlterationCourseDeg: z.number().optional(),
    visibilityMode: z.enum(['IN_SIGHT', 'RESTRICTED', 'UNKNOWN']),
    bearingReference: z.literal('TRUE_NORTH'),
    legalApplicabilityValidated: z.literal(false),
    maneuverValidated: z.literal(false)
  }),
  execute: (input: any) => {
    const { ownCourseDeg, ownSpeedKnots, targetBearingDeg, targetRangeNm,
      targetCourseDeg, targetSpeedKnots, visibilityMode = 'UNKNOWN',
      ownVesselType = 'UNKNOWN', targetVesselType = 'UNKNOWN' } = input;

    const toRad = Math.PI / 180;

    // Own velocity vector (North, East)
    const vOwnN = ownSpeedKnots * Math.cos(ownCourseDeg * toRad);
    const vOwnE = ownSpeedKnots * Math.sin(ownCourseDeg * toRad);

    // Target velocity vector
    const vTgtN = targetSpeedKnots * Math.cos(targetCourseDeg * toRad);
    const vTgtE = targetSpeedKnots * Math.sin(targetCourseDeg * toRad);

    // Relative velocity: V_rel = V_tgt - V_own
    const vRelN = vTgtN - vOwnN;
    const vRelE = vTgtE - vOwnE;
    const relativeSpeedKnots = Math.sqrt(vRelN * vRelN + vRelE * vRelE);

    // Target position relative to own vessel
    const posN = targetRangeNm * Math.cos(targetBearingDeg * toRad);
    const posE = targetRangeNm * Math.sin(targetBearingDeg * toRad);

    // Time to CPA: t_cpa = - (Pos . V_rel) / |V_rel|^2
    let timeToCpaHours = 0;
    let cpaNm = targetRangeNm;

    if (relativeSpeedKnots > 0.01) {
      const dot = posN * vRelN + posE * vRelE;
      timeToCpaHours = -dot / (relativeSpeedKnots * relativeSpeedKnots);

      if (timeToCpaHours > 0) {
        // Future position at CPA
        const cpaPosN = posN + vRelN * timeToCpaHours;
        const cpaPosE = posE + vRelE * timeToCpaHours;
        cpaNm = Math.sqrt(cpaPosN * cpaPosN + cpaPosE * cpaPosE);
      } else {
        // Vessels are opening (moving away)
        timeToCpaHours = 0;
        cpaNm = targetRangeNm;
      }
    }

    const timeToCpaMinutes = timeToCpaHours * 60;

    // Relative bearing = Target bearing - Own course (normalized to -180 to +180)
    let relBearing = targetBearingDeg - ownCourseDeg;
    while (relBearing > 180) relBearing -= 360;
    while (relBearing < -180) relBearing += 360;

    // Course difference
    let courseDiff = Math.abs(ownCourseDeg - targetCourseDeg);
    if (courseDiff > 180) courseDiff = 360 - courseDiff;

    let colregsRule: 'RULE_14_HEAD_ON' | 'RULE_15_CROSSING_GIVE_WAY' | 'RULE_15_CROSSING_STAND_ON' |
      'RULE_13_OVERTAKING' | 'SAFE_PASSING' | 'RULE_19_RESTRICTED_VISIBILITY' |
      'LEGAL_APPLICABILITY_UNDETERMINED' | 'OTHER_VESSEL_PRIORITY_UNASSESSED' = 'LEGAL_APPLICABILITY_UNDETERMINED';
    let mandatedAction = 'Geometry screening only: assess sensor uncertainty; no certified maneuver.';
    const safeCourse: number | undefined = undefined; // Never propose unvalidated helm setpoints.

    // COLREG 13–17 only apply to vessels IN SIGHT of one another;
    // crossing/head-on screening assumes BOTH vessels are POWER DRIVEN.
    // Neither circumstance can be assumed from GPS courses alone.
    if (visibilityMode === 'RESTRICTED') {
      colregsRule = 'RULE_19_RESTRICTED_VISIBILITY';
      mandatedAction = 'Restricted visibility: screen Rule 19, safe speed and lookout. Do not apply in-sight Rule 13–17 classifier.';
    } else if (visibilityMode !== 'IN_SIGHT') {
      colregsRule = 'LEGAL_APPLICABILITY_UNDETERMINED';
      mandatedAction = 'Visibility not established. Determine in-sight status before choosing COLREG encounter obligations.';
    } else if (ownVesselType !== 'POWER_DRIVEN' || targetVesselType !== 'POWER_DRIVEN') {
      colregsRule = 'OTHER_VESSEL_PRIORITY_UNASSESSED';
      mandatedAction = 'Vessel types not both confirmed as power-driven. Screen special-status priorities before maneuvering.';
    } else if (cpaNm >= 1.0 || timeToCpaMinutes <= 0) {
      colregsRule = 'SAFE_PASSING';
      mandatedAction = 'No close-approach risk identified by this single-contact geometry screen. NOT proof of safe passage.';
    } else if (cpaNm < 1.0 && timeToCpaMinutes > 0) {
      // One-contact geometry threshold is arbitrary, not a legal collision-risk limit.
      if (Math.abs(relBearing) <= 6 && courseDiff >= 170) {
        colregsRule = 'RULE_14_HEAD_ON';
        mandatedAction = 'Head-on candidate (Rule 14): STARBOARD action may apply; no verified helm command.';
        // No fixed-angle course command: projected CPA has not been validated.
      } else if (courseDiff <= 45 && ownSpeedKnots > targetSpeedKnots && Math.abs(relBearing) <= 67.5) {
        colregsRule = 'RULE_13_OVERTAKING';
        mandatedAction = 'Overtaking candidate (Rule 13): keep clear; verify aspect and maneuver independently.';
      } else if (relBearing > 5 && relBearing < 112.5) {
        colregsRule = 'RULE_15_CROSSING_GIVE_WAY';
        mandatedAction = 'Crossing candidate (Rule 15): target on STARBOARD side; evaluate GIVE-WAY actions with verified CPA.';
        // No certified evasive course in this screening model.
      } else if (relBearing < -5 && relBearing > -112.5) {
        colregsRule = 'RULE_15_CROSSING_STAND_ON';
        mandatedAction = 'Crossing candidate (Rule 15): possible STAND-ON obligations; assess Rule 17 and uncertainties.';
      }
    }

    return {
      relativeSpeedKnots: Number(relativeSpeedKnots.toFixed(2)),
      closestPointOfApproachCpaNm: Number(cpaNm.toFixed(5)), // sub-metre display resolution; NOT sensor accuracy
      timeToCpaMinutes: Number(timeToCpaMinutes.toFixed(4)),
      relativeBearingDeg: Number(relBearing.toFixed(1)),
      colregsRuleApplicable: colregsRule,
      mandatedAction,
      safeAlterationCourseDeg: safeCourse,
      visibilityMode,
      bearingReference: 'TRUE_NORTH',
      legalApplicabilityValidated: false,
      maneuverValidated: false
    };
  }
};
