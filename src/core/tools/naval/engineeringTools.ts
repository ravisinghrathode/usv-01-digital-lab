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
    blockCoefficientCb: z.number().min(0.30).max(0.95).optional().default(0.44),
    waterplaneCoefficientCwp: z.number().min(0.4).max(0.95).optional(),
    kgMeters: z.number().positive().optional(),
    displacementTonnes: z.number().positive().optional(),
    seawaterDensityKgM3: z.number().default(1025)
  }),
  outputSchema: z.object({
    displacedVolumeM3: z.number(),
    displacementTonnes: z.number(),
    centerOfBuoyancyKbM: z.number(),
    transverseMetacentricRadiusBmtM: z.number(),
    transverseMetacenterKmtM: z.number(),
    metacentricHeightGmtM: z.number(),
    stabilityStatus: z.enum(['STABLE_COMPLIANT', 'MARGINAL', 'UNSTABLE_CRITICAL']),
    complianceCheck: z.object({
      minGmMet: z.boolean(),
      morrishKbApproximationM: z.number()
    })
  }),
  execute: (input: any) => {
    const { lwlMeters, beamMeters, draftMeters, seawaterDensityKgM3 = 1025 } = input;
    let blockCoefficientCb = input.blockCoefficientCb ?? 0.44;
    if (input.displacementTonnes && !input.blockCoefficientCb) {
      const vol = (input.displacementTonnes * 1000) / seawaterDensityKgM3;
      blockCoefficientCb = Math.min(0.85, Math.max(0.35, vol / (lwlMeters * beamMeters * draftMeters)));
    }
    const cwp = input.waterplaneCoefficientCwp || Number((blockCoefficientCb + 0.18).toFixed(3));

    // Underwater volume (m^3)
    const displacedVolumeM3 = lwlMeters * beamMeters * draftMeters * blockCoefficientCb;
    
    // Displacement (metric tonnes)
    const displacementTonnes = (displacedVolumeM3 * seawaterDensityKgM3) / 1000;

    // Center of buoyancy KB (m) via Normand formula:
    // KB = draft * (5/6 - Cb / (3 * Cwp))
    const centerOfBuoyancyKbM = draftMeters * (5 / 6 - blockCoefficientCb / (3 * cwp));

    // Waterplane moment of inertia IT = (1/12) * Cwp * L * B^3 (approximate for typical hull)
    const it = (1 / 12) * cwp * lwlMeters * Math.pow(beamMeters, 3);

    // Transverse metacentric radius BMt = IT / Volume
    const transverseMetacentricRadiusBmtM = it / displacedVolumeM3;

    // KMt = KB + BMt
    const transverseMetacenterKmtM = centerOfBuoyancyKbM + transverseMetacentricRadiusBmtM;

    // If KG is not explicitly supplied, estimate typical USV KG based on draft:
    // KG ~ draft * 1.15 for low-profile planing USV (battery in keel)
    const kgMeters = input.kgMeters ?? Number((draftMeters * 1.15).toFixed(3));

    // GMt = KMt - KG
    const metacentricHeightGmtM = transverseMetacenterKmtM - kgMeters;

    let stabilityStatus: 'STABLE_COMPLIANT' | 'MARGINAL' | 'UNSTABLE_CRITICAL' = 'STABLE_COMPLIANT';
    if (metacentricHeightGmtM < 0.15) {
      stabilityStatus = 'UNSTABLE_CRITICAL';
    } else if (metacentricHeightGmtM < 0.35) {
      stabilityStatus = 'MARGINAL';
    }

    return {
      displacedVolumeM3: Number(displacedVolumeM3.toFixed(3)),
      displacementTonnes: Number(displacementTonnes.toFixed(3)),
      centerOfBuoyancyKbM: Number(centerOfBuoyancyKbM.toFixed(3)),
      transverseMetacentricRadiusBmtM: Number(transverseMetacentricRadiusBmtM.toFixed(3)),
      transverseMetacenterKmtM: Number(transverseMetacenterKmtM.toFixed(3)),
      metacentricHeightGmtM: Number(metacentricHeightGmtM.toFixed(3)),
      stabilityStatus,
      complianceCheck: {
        minGmMet: metacentricHeightGmtM >= 0.35,
        morrishKbApproximationM: Number(centerOfBuoyancyKbM.toFixed(3))
      }
    };
  }
};

// 2. Hydrodynamic Resistance & Powering Tool
export const ResistanceTool: EngineeringTool = {
  id: 'TOOL-RESISTANCE-01',
  name: 'Hydrodynamic Resistance & Effective Power Estimator',
  category: 'HYDRODYNAMICS',
  description: 'Calculates Froude number, ITTC-57 skin friction, residual drag, total resistance (kN), effective power (PE), and required shaft brake power (PB).',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: z.object({
    lwlMeters: z.number().positive(),
    beamMeters: z.number().positive(),
    draftMeters: z.number().positive(),
    displacementTonnes: z.number().positive(),
    speedKnots: z.number().positive(),
    propulsiveEfficiencyEtaD: z.number().default(0.65),
    waterTempCelsius: z.number().default(15)
  }),
  outputSchema: z.object({
    speedMps: z.number(),
    froudeNumberFn: z.number(),
    hydrodynamicRegime: z.enum(['DISPLACEMENT', 'SEMI_DISPLACEMENT', 'PLANING']),
    reynoldsNumber: z.number(),
    frictionalResistanceKn: z.number(),
    residualResistanceKn: z.number(),
    totalResistanceKn: z.number(),
    effectivePowerPeKw: z.number(),
    shaftBrakePowerPbKw: z.number()
  }),
  execute: (input: any) => {
    const { lwlMeters, beamMeters, draftMeters, displacementTonnes, speedKnots, propulsiveEfficiencyEtaD = 0.65 } = input;
    const g = 9.80665;
    const rho = 1025;
    const nu = 1.188e-6; // kinematic viscosity for seawater at 15C

    const speedMps = speedKnots * 0.514444;
    const froudeNumberFn = speedMps / Math.sqrt(g * lwlMeters);

    let hydrodynamicRegime: 'DISPLACEMENT' | 'SEMI_DISPLACEMENT' | 'PLANING' = 'DISPLACEMENT';
    if (froudeNumberFn > 0.9) {
      hydrodynamicRegime = 'PLANING';
    } else if (froudeNumberFn >= 0.4) {
      hydrodynamicRegime = 'SEMI_DISPLACEMENT';
    }

    // Wetted surface area (approximate Denny-Mumford formula): S = 1.7 * L * T + (Cb * L * B)
    const cb = (displacementTonnes * 1000 / rho) / (lwlMeters * beamMeters * draftMeters);
    const wettedSurfaceM2 = 1.7 * lwlMeters * draftMeters + (cb * lwlMeters * beamMeters);

    // Reynolds number
    const reynoldsNumber = (speedMps * lwlMeters) / nu;

    // ITTC-57 friction coefficient
    const cf = 0.075 / Math.pow(Math.log10(reynoldsNumber) - 2, 2);

    // Residual resistance coefficient Cr (semi-empirical function of Fn and slenderness)
    let cr = 0.0015;
    if (froudeNumberFn > 0.4 && froudeNumberFn <= 0.8) {
      cr = 0.0015 + 0.006 * Math.pow(froudeNumberFn - 0.4, 1.8);
    } else if (froudeNumberFn > 0.8) {
      cr = 0.0045 + 0.002 * (froudeNumberFn - 0.8);
    }

    // Correlation allowance Ca
    const ca = 0.0004;

    const dynamicPressure = 0.5 * rho * Math.pow(speedMps, 2);
    const frictionalResistanceKn = (cf * dynamicPressure * wettedSurfaceM2) / 1000;
    const residualResistanceKn = ((cr + ca) * dynamicPressure * wettedSurfaceM2) / 1000;
    const totalResistanceKn = frictionalResistanceKn + residualResistanceKn;

    // Effective power Pe = Rt * V (kW)
    const effectivePowerPeKw = totalResistanceKn * speedMps;

    // Shaft brake power Pb = Pe / etaD (kW)
    const shaftBrakePowerPbKw = effectivePowerPeKw / propulsiveEfficiencyEtaD;

    return {
      speedMps: Number(speedMps.toFixed(2)),
      froudeNumberFn: Number(froudeNumberFn.toFixed(3)),
      hydrodynamicRegime,
      reynoldsNumber: Number(reynoldsNumber.toExponential(3)),
      frictionalResistanceKn: Number(frictionalResistanceKn.toFixed(3)),
      residualResistanceKn: Number(residualResistanceKn.toFixed(3)),
      totalResistanceKn: Number(totalResistanceKn.toFixed(3)),
      effectivePowerPeKw: Number(effectivePowerPeKw.toFixed(2)),
      shaftBrakePowerPbKw: Number(shaftBrakePowerPbKw.toFixed(2))
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
      massKg: z.number().positive(),
      lcgMetersFromTransom: z.number(),
      tcgMetersFromCl: z.number(),
      vcgMetersFromKeel: z.number().nonnegative(),
      designMarginPercent: z.number().min(0).max(50).default(10)
    })),
    baselineLcbMetersFromTransom: z.number().optional()
  }),
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
    busVoltageV: z.number().default(48),
    batteryTotalKwh: z.number().positive(),
    usableDepthOfDischarge: z.number().min(0.5).max(0.95).default(0.8),
    consumers: z.array(z.object({
      name: z.string(),
      voltageV: z.number().default(48),
      continuousPowerW: z.number().nonnegative(),
      intermittentPowerW: z.number().nonnegative().default(0),
      dutyCycle: z.number().min(0).max(1).default(1),
      isEmergencyLoad: z.boolean().default(false)
    }))
  }),
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
  name: 'Hull Bottom Slamming & Plating Scantling Calculator',
  category: 'STRUCTURES',
  description: 'Calculates bottom slamming pressure and minimum plating thickness according to DNV-RU-HSLC / ISO 12215-5.',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: z.object({
    displacementTonnes: z.number().positive(),
    speedKnots: z.number().positive(),
    lwlMeters: z.number().positive(),
    deadriseAngleDeg: z.number().min(5).max(45),
    unsupportedPanelWidthMm: z.number().positive(),
    unsupportedPanelLengthMm: z.number().positive(),
    materialYieldStrengthMpa: z.number().default(125), // 5083-H111 default
    safetyFactor: z.number().default(2.0)
  }),
  outputSchema: z.object({
    designSlammingPressureKpa: z.number(),
    allowableStressMpa: z.number(),
    aspectRatioCorrectionFactorK2: z.number(),
    minPlatingThicknessMm: z.number(),
    recommendedNominalThicknessMm: z.number(),
    stiffenerSectionModulusCm3: z.number()
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
    // P_slam = (0.25 * Delta / Lwl) * (1 + 0.08 * V^2) * ((50 - deadrise) / 30) (kPa)
    const deadriseFactor = Math.max(0.5, (50 - deadriseAngleDeg) / 30);
    const baseP = (0.25 * displacementTonnes / lwlMeters) * (1 + 0.08 * Math.pow(speedKnots, 2));
    const designSlammingPressureKpa = Math.max(45, baseP * deadriseFactor);

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
      stiffenerSectionModulusCm3: Number(stiffenerSectionModulusCm3.toFixed(2))
    };
  }
};

// 6. COLREGS Collision Avoidance Vector Tool
export const ColregsTool: EngineeringTool = {
  id: 'TOOL-COLREGS-01',
  name: 'COLREGS 1972 Collision Geometry & Encounter Solver',
  category: 'AUTONOMY_COLREGS',
  description: 'Deterministic calculation of Range, Bearing, Relative Velocity, CPA, TCPA, and COLREGS encounter classification.',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: z.object({
    ownCourseDeg: z.number().min(0).max(360),
    ownSpeedKnots: z.number().positive(),
    targetBearingDeg: z.number().min(0).max(360),
    targetRangeNm: z.number().positive(),
    targetCourseDeg: z.number().min(0).max(360),
    targetSpeedKnots: z.number().positive()
  }),
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
    let mandatedAction = 'Maintain course and speed; monitor contact.';
    let safeCourse: number | undefined;

    if (cpaNm < 1.0 && timeToCpaMinutes > 0) {
      // Risk of collision exists
      if (Math.abs(relBearing) <= 6 && courseDiff >= 170) {
        colregsRule = 'RULE_14_HEAD_ON';
        mandatedAction = 'Head-on encounter (Rule 14). Both vessels shall alter course to STARBOARD to pass port-to-port.';
        safeCourse = (ownCourseDeg + 30) % 360;
      } else if (relBearing > 5 && relBearing < 112.5) {
        colregsRule = 'RULE_15_CROSSING_GIVE_WAY';
        mandatedAction = 'Crossing situation (Rule 15). Target on STARBOARD bow. Own vessel is GIVE-WAY. Make early and substantial turn to STARBOARD.';
        safeCourse = (ownCourseDeg + 40) % 360;
      } else if (relBearing < -5 && relBearing > -112.5) {
        colregsRule = 'RULE_15_CROSSING_STAND_ON';
        mandatedAction = 'Crossing situation (Rule 15). Target on PORT bow. Own vessel is STAND-ON. Maintain course and speed, be prepared to take action under Rule 17.';
      } else if (Math.abs(relBearing) >= 112.5 && ownSpeedKnots > targetSpeedKnots) {
        colregsRule = 'RULE_13_OVERTAKING';
        mandatedAction = 'Overtaking situation (Rule 13). Own vessel is faster and approaching from abaft beam. Keep completely clear of target vessel.';
        safeCourse = (ownCourseDeg + 25) % 360;
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
