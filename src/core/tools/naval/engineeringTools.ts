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
    lwlMeters: z.coerce.number().positive(),
    beamMeters: z.coerce.number().positive(),
    draftMeters: z.coerce.number().positive(),
    blockCoefficientCb: z.coerce.number().min(0.30).max(0.95).optional(),
    waterplaneCoefficientCwp: z.coerce.number().min(0.4).max(0.95).optional(),
    kgMeters: z.coerce.number().nonnegative().optional(),
    displacementTonnes: z.coerce.number().positive().optional(),
    seawaterDensityKgM3: z.coerce.number().min(900).max(1100).default(1025)
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
    metacentricHeightGmtM: z.number().nullable(),
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
      metacentricHeightGmtM: gm === null ? null : Number(gm.toFixed(3)),
      stabilityStatus: gm !== null && gm < 0 ? 'UNSTABLE_CRITICAL' : 'UNVERIFIED_ESTIMATE',
      isPreliminaryEstimate: true,
      engineeringComplianceValidated: false,
      kgSource: hasKg ? 'USER_PROVIDED' : 'NOT_PROVIDED',
      complianceCheck: {
        minGmMet: gm !== null && gm >= 0.35,
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
  }).strict().superRefine((d, ctx) => {
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
      name: z.string(),
      massKg: z.coerce.number().positive(),
      lcgMetersFromTransom: z.coerce.number(),
      tcgMetersFromCl: z.coerce.number(),
      vcgMetersFromKeel: z.coerce.number().nonnegative(),
      designMarginPercent: z.coerce.number().min(0).max(50).default(10)
    })).min(1, 'Mass ledger cannot be empty'),
    baselineLcbMetersFromTransom: z.coerce.number().optional()
  }).passthrough(),
  outputSchema: z.object({
    lightshipMassKg: z.number(),
    designMarginMassKg: z.number(),
    totalDisplacementKg: z.number(),
    totalDisplacementTonnes: z.number(),
    compositeLcgMeters: z.number(),
    compositeTcgMeters: z.number(),
    compositeKgMeters: z.number(),
    longitudinalTrimEvaluation: z.object({
      lcbAlignmentMeters: z.number().optional(),
      trimRisk: z.enum(['ALIGNED', 'EXCESSIVE_TRIM_AFT', 'EXCESSIVE_TRIM_FWD'])
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
      const margin = (comp.designMarginPercent ?? 10) / 100;
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

    let trimRisk: 'ALIGNED' | 'EXCESSIVE_TRIM_AFT' | 'EXCESSIVE_TRIM_FWD' = 'ALIGNED';
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
    busVoltageV: z.coerce.number().positive().default(48),
    batteryTotalKwh: z.coerce.number().positive().default(120),
    usableDepthOfDischarge: z.coerce.number().min(0.1).max(1.0).default(0.8),
    consumers: z.array(z.object({
      name: z.string(),
      voltageV: z.coerce.number().default(48),
      continuousPowerW: z.coerce.number().nonnegative(),
      intermittentPowerW: z.coerce.number().nonnegative().default(0),
      dutyCycle: z.coerce.number().min(0).max(1).default(1),
      isEmergencyLoad: z.boolean().default(false)
    })).default([])
  }).passthrough(),
  outputSchema: z.object({
    totalContinuousPowerW: z.number(),
    averagePowerW: z.number(),
    peakPowerW: z.number(),
    nominalBusCurrentAmps: z.number(),
    usableBatteryKwh: z.number(),
    estimatedEnduranceHours: z.number(),
    emergencyLoadPowerW: z.number(),
    emergencyEnduranceHours: z.number(),
    recommendedMainFuseRatingAmps: z.number()
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
        emergencyLoadPowerW += c.continuousPowerW;
      }
    }

    const nominalBusCurrentAmps = averagePowerW / busVoltageV;
    const peakCurrentAmps = peakPowerW / busVoltageV;
    const usableBatteryKwh = batteryTotalKwh * usableDepthOfDischarge;

    const estimatedEnduranceHours = averagePowerW > 0 ? (usableBatteryKwh * 1000) / averagePowerW : 0;
    const emergencyEnduranceHours = emergencyLoadPowerW > 0 ? (usableBatteryKwh * 1000) / emergencyLoadPowerW : 0;

    // Recommended fuse rating (1.5x peak current rounded up to standard size)
    const recommendedMainFuseRatingAmps = Math.ceil(peakCurrentAmps * 1.5 / 10) * 10;

    return {
      totalContinuousPowerW: Number(totalContinuousPowerW.toFixed(1)),
      averagePowerW: Number(averagePowerW.toFixed(1)),
      peakPowerW: Number(peakPowerW.toFixed(1)),
      nominalBusCurrentAmps: Number(nominalBusCurrentAmps.toFixed(2)),
      usableBatteryKwh: Number(usableBatteryKwh.toFixed(2)),
      estimatedEnduranceHours: Number(estimatedEnduranceHours.toFixed(2)),
      emergencyLoadPowerW: Number(emergencyLoadPowerW.toFixed(1)),
      emergencyEnduranceHours: Number(emergencyEnduranceHours.toFixed(2)),
      recommendedMainFuseRatingAmps
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
    displacementTonnes: z.coerce.number().positive(),
    speedKnots: z.coerce.number().positive(),
    lwlMeters: z.coerce.number().positive(),
    deadriseAngleDeg: z.coerce.number().min(5).max(45).default(18),
    unsupportedPanelWidthMm: z.coerce.number().positive().default(450),
    unsupportedPanelLengthMm: z.coerce.number().positive().default(900),
    materialYieldStrengthMpa: z.coerce.number().positive().default(125), // 5083-H111 default
    safetyFactor: z.coerce.number().min(1).default(2.0)
  }).passthrough(),
  outputSchema: z.object({
    designSlammingPressureKpa: z.number(),
    allowableStressMpa: z.number(),
    aspectRatioCorrectionFactorK2: z.number(),
    minPlatingThicknessMm: z.number(),
    recommendedNominalThicknessMm: z.number(),
    stiffenerSectionModulusCm3: z.number(),
    engineeringComplianceValidated: z.literal(false),
    modelStatus: z.literal('UNVALIDATED_SCANTLING_SCREEN')
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

    // ISO 12215-5 slamming pressure for high-speed craft:
    // P_slam = (1.8 * Delta / Lwl) * (1 + 0.08 * V^2) * ((50 - deadrise) / 30) (kPa)
    const deadriseFactor = Math.max(0.5, (50 - deadriseAngleDeg) / 30);
    const baseP = (1.8 * displacementTonnes / lwlMeters) * (1 + 0.08 * Math.pow(speedKnots, 2));
    const designSlammingPressureKpa = Math.max(35, baseP * deadriseFactor);

    // Aspect ratio factor k2 = min(0.5, 0.271 * (a/b)^0.5 ...)
    const aspectRatio = unsupportedPanelLengthMm / unsupportedPanelWidthMm;
    const k2 = Math.min(0.5, 0.35 + 0.15 * Math.min(aspectRatio, 2.0));

    const allowableStressMpa = materialYieldStrengthMpa / safetyFactor;

    // Plating thickness formula: t = b * sqrt(P * k2 / (1000 * sigma_all))
    const minPlatingThicknessMm = (unsupportedPanelWidthMm) * Math.sqrt((designSlammingPressureKpa * k2) / (1000 * allowableStressMpa));
    const recommendedNominalThicknessMm = Math.ceil(minPlatingThicknessMm * 2) / 2; // round up to nearest 0.5mm

    // Stiffener section modulus: SM = (P * s * l^2) / (12 * sigma_all) (in cm^3)
    const sMeters = unsupportedPanelWidthMm / 1000;
    const lMeters = unsupportedPanelLengthMm / 1000;
    const stiffenerSectionModulusCm3 = (designSlammingPressureKpa * sMeters * Math.pow(lMeters, 2) * 1000) / (12 * allowableStressMpa * 10);

    return {
      designSlammingPressureKpa: Number(designSlammingPressureKpa.toFixed(1)),
      allowableStressMpa: Number(allowableStressMpa.toFixed(1)),
      aspectRatioCorrectionFactorK2: Number(k2.toFixed(3)),
      minPlatingThicknessMm: Number(minPlatingThicknessMm.toFixed(2)),
      recommendedNominalThicknessMm,
      stiffenerSectionModulusCm3: Number(stiffenerSectionModulusCm3.toFixed(2)),
      engineeringComplianceValidated: false,
      modelStatus: 'UNVALIDATED_SCANTLING_SCREEN'
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
    ownCourseDeg: z.coerce.number().min(0).max(360),
    ownSpeedKnots: z.coerce.number().nonnegative(),
    targetBearingDeg: z.coerce.number().min(0).max(360),
    targetRangeNm: z.coerce.number().positive(),
    targetCourseDeg: z.coerce.number().min(0).max(360),
    targetSpeedKnots: z.coerce.number().nonnegative()
  }).passthrough(),
  outputSchema: z.object({
    relativeSpeedKnots: z.number(),
    closestPointOfApproachCpaNm: z.number(),
    timeToCpaMinutes: z.number(),
    relativeBearingDeg: z.number(),
    colregsRuleApplicable: z.enum(['RULE_14_HEAD_ON', 'RULE_15_CROSSING_GIVE_WAY', 'RULE_15_CROSSING_STAND_ON', 'RULE_13_OVERTAKING', 'SAFE_PASSING']),
    mandatedAction: z.string(),
    safeAlterationCourseDeg: z.number().optional()
  }),
  execute: (input: any) => {
    const { ownCourseDeg, ownSpeedKnots, targetBearingDeg, targetRangeNm, targetCourseDeg, targetSpeedKnots } = input;

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

    let colregsRule: 'RULE_14_HEAD_ON' | 'RULE_15_CROSSING_GIVE_WAY' | 'RULE_15_CROSSING_STAND_ON' | 'RULE_13_OVERTAKING' | 'SAFE_PASSING' = 'SAFE_PASSING';
    let mandatedAction = 'Geometry screening only: assess sensor uncertainty; no certified maneuver.';
    const safeCourse: number | undefined = undefined; // Never propose unvalidated helm setpoints.

    if (cpaNm < 1.0 && timeToCpaMinutes > 0) {
      // Risk of collision exists
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
      closestPointOfApproachCpaNm: Number(cpaNm.toFixed(2)),
      timeToCpaMinutes: Number(timeToCpaMinutes.toFixed(1)),
      relativeBearingDeg: Number(relBearing.toFixed(1)),
      colregsRuleApplicable: colregsRule,
      mandatedAction,
      safeAlterationCourseDeg: safeCourse
    };
  }
};
