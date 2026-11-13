import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

describe('STAGE E: Deterministic Naval Engineering Tools', () => {
  const toolRegistry = ToolRegistry.getInstance();

  it('should register all 6 deterministic engineering tools', () => {
    const tools = toolRegistry.getAllTools();
    expect(tools.length).toBeGreaterThanOrEqual(6);
  });

  it('should execute hydrostatics calculation with mathematical accuracy', async () => {
    // 10m USV, Beam 2.5m, Draft 0.6m, Cb 0.45, KG 0.8m
    const input = {
      lwlMeters: 10.0,
      beamMeters: 2.5,
      draftMeters: 0.6,
      blockCoefficientCb: 0.45,
      waterplaneCoefficientCwp: 0.65,
      kgMeters: 0.8,
      seawaterDensityKgM3: 1025
    };

    const res = await toolRegistry.executeTool('TOOL-HYDROSTATICS-01', input, ['CALCULATION_EXEC']);
    expect(res.success).toBe(true);
    expect(res.output.displacedVolumeM3).toBeCloseTo(10 * 2.5 * 0.6 * 0.45, 2);
    expect(res.output.displacementTonnes).toBeGreaterThan(6.0);
    expect(res.output.metacentricHeightGmtM).toBeNull();
    expect(res.output.preliminaryGmScreeningM).not.toBeNull();
    expect(res.output.stabilityStatus).toBe('UNVERIFIED_ESTIMATE');
      expect(res.output.engineeringComplianceValidated).toBe(false);
  });

  it('should calculate hydrodynamic resistance and identify regime', async () => {
    const input = {
      lwlMeters: 10.0,
      beamMeters: 2.5,
      draftMeters: 0.6,
      displacementTonnes: 7.0,
      speedKnots: 20.0
    };

    const res = await toolRegistry.executeTool('TOOL-RESISTANCE-01', input, ['CALCULATION_EXEC']);
    expect(res.success).toBe(true);
    expect(res.output.froudeNumberFn).toBeGreaterThan(1.0);
    expect(res.output.hydrodynamicRegime).toBe('UNVERIFIED');
    expect(res.output.totalResistanceKn).toBeNull();
    expect(res.output.effectivePowerPeKw).toBeNull();
    expect(res.output.shaftBrakePowerPbKw).toBeNull();
    expect(res.output.modelStatus).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('should calculate mass properties and composite center of gravity', async () => {
    const input = {
      components: [
        { name: 'Bare Hull Structure', massKg: 1800, lcgMetersFromTransom: 4.8, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.6, designMarginPercent: 10 },
        { name: 'Twin Electric Inboard Motors', massKg: 350, lcgMetersFromTransom: 1.5, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.4, designMarginPercent: 5 },
        { name: 'Main Battery ESS (120 kWh LFP)', massKg: 1100, lcgMetersFromTransom: 3.5, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.35, designMarginPercent: 10 },
        { name: 'Sensor Mast & Avionics', massKg: 120, lcgMetersFromTransom: 5.5, tcgMetersFromCl: 0, vcgMetersFromKeel: 2.1, designMarginPercent: 15 }
      ],
      baselineLcbMetersFromTransom: 4.0
    };

    const res = await toolRegistry.executeTool('TOOL-MASS-BALANCE-01', input, ['CALCULATION_EXEC']);
    expect(res.success).toBe(true);
    expect(res.output.lightshipMassKg).toBe(3370);
    expect(res.output.totalDisplacementKg).toBeGreaterThan(3370);
    expect(res.output.compositeKgMeters).toBeLessThan(1.0); // low CG ensured
    expect(res.output.compositeTcgMeters).toBe(0); // symmetric
  });

  it('should calculate electrical load balance and battery endurance hours', async () => {
    const input = {
      busVoltageV: 48,
      batteryTotalKwh: 100,
      usableDepthOfDischarge: 0.8,
      consumers: [
        { name: 'Propulsion at 8 knot loiter', voltageV: 48, continuousPowerW: 8000, intermittentPowerW: 0, dutyCycle: 1, isEmergencyLoad: false },
        { name: 'Radar + LiDAR + Cameras', voltageV: 48, continuousPowerW: 450, intermittentPowerW: 100, dutyCycle: 0.5, isEmergencyLoad: true },
        { name: 'Autonomy Computer (NVIDIA Jetson / Orin)', voltageV: 48, continuousPowerW: 120, intermittentPowerW: 0, dutyCycle: 1, isEmergencyLoad: true },
        { name: 'Satellite Comms Transceiver', voltageV: 48, continuousPowerW: 60, intermittentPowerW: 40, dutyCycle: 0.3, isEmergencyLoad: true }
      ]
    };

    const res = await toolRegistry.executeTool('TOOL-ELECTRICAL-01', input, ['CALCULATION_EXEC']);
    expect(res.success).toBe(true);
    expect(res.output.usableBatteryKwh).toBe(80);
    expect(res.output.estimatedEnduranceHours).toBeNull();
    expect(res.output.idealizedEnergyUpperBoundHours).toBeGreaterThan(8);
    expect(res.output.emergencyEnduranceHours).toBeNull();
    expect(res.output.recommendedMainFuseRatingAmps).toBeNull();
  });

  it('should calculate ISO/DNV slamming pressure and plating thickness', async () => {
    const input = {
      displacementTonnes: 6.5,
      speedKnots: 25,
      lwlMeters: 9.5,
      deadriseAngleDeg: 18,
      unsupportedPanelWidthMm: 350,
      unsupportedPanelLengthMm: 700,
      materialYieldStrengthMpa: 125,
      safetyFactor: 2.0
    };

    const res = await toolRegistry.executeTool('TOOL-STRUCTURES-01', input, ['CALCULATION_EXEC']);
    expect(res.success).toBe(true);
    expect(res.output.designSlammingPressureKpa).toBeNull();
    expect(res.output.designUsePermitted).toBe(false);
    expect(res.output.minPlatingThicknessMm).toBeNull();
    expect(res.output.recommendedNominalThicknessMm).toBeNull();
  });

  it('should evaluate COLREGS encounter geometry and recommend give-way action', async () => {
    // Own vessel heading 000 at 12 knots. Target at bearing 045 (Starboard Bow) range 2.0 nm, heading 270 at 10 knots.
    const input = {
      ownCourseDeg: 0,
      ownSpeedKnots: 12,
      targetBearingDeg: 45, bearingReference: 'TRUE_NORTH',
      targetRangeNm: 2.0,
      targetCourseDeg: 270,
      targetSpeedKnots: 10, visibilityMode: 'IN_SIGHT', ownVesselType: 'POWER_DRIVEN', targetVesselType: 'POWER_DRIVEN'
    };

    const res = await toolRegistry.executeTool('TOOL-COLREGS-01', input, ['CALCULATION_EXEC']);
    expect(res.success).toBe(true);
    expect(res.output.closestPointOfApproachCpaNm).toBeLessThan(1.0);
    expect(res.output.timeToCpaMinutes).toBeGreaterThan(0);
    expect(res.output.colregsRuleApplicable).toBe('RULE_15_CROSSING_GIVE_WAY');
    expect(res.output.safeAlterationCourseDeg).toBeUndefined();
  });

  it('should enforce permission rejection if calling agent lacks permission', async () => {
    const input = {
      lwlMeters: 10.0,
      beamMeters: 2.5,
      draftMeters: 0.6,
      blockCoefficientCb: 0.45,
      kgMeters: 0.8
    };

    const res = await toolRegistry.executeTool('TOOL-HYDROSTATICS-01', input, ['READ_ONLY']);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Permission Denied');
  });

  it('should preserve explicit 0% design margin and NOT convert it to 10%', async () => {
    const input = {
      components: [
        { name: 'Certified Cast Keel Weight', massKg: 500, lcgMetersFromTransom: 3.0, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.1, designMarginPercent: 0 }
      ],
      baselineLcbMetersFromTransom: 3.0
    };

    const res = await toolRegistry.executeTool('TOOL-MASS-BALANCE-01', input, ['CALCULATION_EXEC']);
    expect(res.success).toBe(true);
    // Explicit 0% margin means margin mass is 0, total displacement mass is exactly 500 kg
    expect(res.output.designMarginMassKg).toBe(0);
    expect(res.output.totalDisplacementKg).toBe(500);
    expect(res.output.totalDisplacementTonnes).toBe(0.5);
  });
});
