import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

describe('Deterministic Naval Engineering Tools: Physics Benchmarks & Analytical Checks', () => {
  const toolRegistry = ToolRegistry.getInstance();

  // =========================================================================
  // 1. TOOL-HYDROSTATICS-01: Hydrostatics & Intact Stability
  // =========================================================================
  describe('TOOL-HYDROSTATICS-01: Hydrostatics Benchmark', () => {
    it('should match analytical rectangular barge benchmark exactly', async () => {
      // Box barge analytical benchmark:
      // Length L = 10.0m, Beam B = 2.0m, Draft T = 0.5m, Cb = 0.95, Cwp = 0.95, KG = 0.4m, rho = 1025 kg/m3
      // Displaced volume V = 10 * 2 * 0.5 * 0.95 = 9.5 m3
      // Displacement = 9.5 * 1025 / 1000 = 9.7375 tonnes
      // Normand KB = 0.5 * (5/6 - 0.95 / (3 * 0.95)) = 0.5 * (5/6 - 1/3) = 0.5 * 0.5 = 0.25 m (exact mid-draft!)
      const input = {
        lwlMeters: 10.0,
        beamMeters: 2.0,
        draftMeters: 0.5,
        blockCoefficientCb: 0.95,
        waterplaneCoefficientCwp: 0.95,
        kgMeters: 0.4,
        seawaterDensityKgM3: 1025
      };

      const res = await toolRegistry.executeTool('TOOL-HYDROSTATICS-01', input, ['CALCULATION_EXEC']);
      expect(res.success).toBe(true);
      expect(res.output.displacedVolumeM3).toBeCloseTo(9.5, 2);
      expect(res.output.displacementTonnes).toBeCloseTo(9.738, 2);
      expect(res.output.centerOfBuoyancyKbM).toBeCloseTo(0.25, 2);
      expect(res.output.transverseMetacentricRadiusBmtM).toBeGreaterThan(0.5);
      expect(res.output.transverseMetacenterKmtM).toBeCloseTo(res.output.centerOfBuoyancyKbM + res.output.transverseMetacentricRadiusBmtM, 2);
      expect(res.output.metacentricHeightGmtM).toBeCloseTo(res.output.transverseMetacenterKmtM - 0.4, 2);
      expect(res.output.stabilityStatus).toBe('STABLE_COMPLIANT');
      expect(res.output.complianceCheck.minGmMet).toBe(true);
    });

    it('should identify critical instability when KG exceeds KMt (negative GMt)', async () => {
      const input = {
        lwlMeters: 10.0,
        beamMeters: 2.0,
        draftMeters: 0.8,
        blockCoefficientCb: 0.45,
        waterplaneCoefficientCwp: 0.65,
        kgMeters: 3.5, // Unrealistically high KG far above metacenter
        seawaterDensityKgM3: 1025
      };

      const res = await toolRegistry.executeTool('TOOL-HYDROSTATICS-01', input, ['CALCULATION_EXEC']);
      expect(res.success).toBe(true);
      expect(res.output.metacentricHeightGmtM).toBeLessThan(0);
      expect(res.output.stabilityStatus).toBe('UNSTABLE_CRITICAL');
      expect(res.output.complianceCheck.minGmMet).toBe(false);
    });

    it('should reject non-positive physical dimensions', async () => {
      const invalidInput = {
        lwlMeters: -10.0,
        beamMeters: 2.5,
        draftMeters: 0.6
      };

      const res = await toolRegistry.executeTool('TOOL-HYDROSTATICS-01', invalidInput, ['CALCULATION_EXEC']);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Validation');
    });
  });

  // =========================================================================
  // 2. TOOL-RESISTANCE-01: Hydrodynamic Resistance & Effective Power
  // =========================================================================
  describe('TOOL-RESISTANCE-01: Hydrodynamic Resistance Benchmark', () => {
    it('should correctly classify displacement, semi-displacement, and planing regimes based on Froude number', async () => {
      const base = {
        lwlMeters: 10.0,
        beamMeters: 2.5,
        draftMeters: 0.6,
        displacementTonnes: 6.0,
        propulsiveEfficiencyEtaD: 0.65
      };

      // Low speed: 5 knots -> Fn ~ 0.26 (< 0.4 => DISPLACEMENT)
      const resDisp = await toolRegistry.executeTool('TOOL-RESISTANCE-01', { ...base, speedKnots: 5.0 }, ['CALCULATION_EXEC']);
      expect(resDisp.success).toBe(true);
      expect(resDisp.output.froudeNumberFn).toBeLessThan(0.4);
      expect(resDisp.output.hydrodynamicRegime).toBe('DISPLACEMENT');

      // Mid speed: 12 knots -> Fn ~ 0.63 (0.4 <= Fn <= 0.9 => SEMI_DISPLACEMENT)
      const resSemi = await toolRegistry.executeTool('TOOL-RESISTANCE-01', { ...base, speedKnots: 12.0 }, ['CALCULATION_EXEC']);
      expect(resSemi.success).toBe(true);
      expect(resSemi.output.froudeNumberFn).toBeGreaterThanOrEqual(0.4);
      expect(resSemi.output.froudeNumberFn).toBeLessThanOrEqual(0.9);
      expect(resSemi.output.hydrodynamicRegime).toBe('SEMI_DISPLACEMENT');

      // High speed: 25 knots -> Fn ~ 1.30 (> 0.9 => PLANING)
      const resPlane = await toolRegistry.executeTool('TOOL-RESISTANCE-01', { ...base, speedKnots: 25.0 }, ['CALCULATION_EXEC']);
      expect(resPlane.success).toBe(true);
      expect(resPlane.output.froudeNumberFn).toBeGreaterThan(0.9);
      expect(resPlane.output.hydrodynamicRegime).toBe('PLANING');
    });

    it('should satisfy powering conservation: shaft brake power PB = PE / etaD > PE', async () => {
      const input = {
        lwlMeters: 10.0,
        beamMeters: 2.5,
        draftMeters: 0.6,
        displacementTonnes: 6.0,
        speedKnots: 20.0,
        propulsiveEfficiencyEtaD: 0.65
      };

      const res = await toolRegistry.executeTool('TOOL-RESISTANCE-01', input, ['CALCULATION_EXEC']);
      expect(res.success).toBe(true);
      const { effectivePowerPeKw, shaftBrakePowerPbKw } = res.output;
      expect(shaftBrakePowerPbKw).toBeCloseTo(effectivePowerPeKw / 0.65, 0);
      expect(shaftBrakePowerPbKw).toBeGreaterThan(effectivePowerPeKw);
    });
  });

  // =========================================================================
  // 3. TOOL-MASS-BALANCE-01: Mass Properties & Center of Gravity
  // =========================================================================
  describe('TOOL-MASS-BALANCE-01: Mass Balance Benchmark', () => {
    it('should compute exact composite CG for discrete masses and preserve 0% design margin', async () => {
      // Known point mass benchmark:
      // Item 1: 1000 kg at LCG = 2.0m, VCG = 0.5m, margin = 0%
      // Item 2: 2000 kg at LCG = 5.0m, VCG = 1.0m, margin = 0%
      // Total mass = 3000 kg
      // Composite LCG = (1000*2 + 2000*5) / 3000 = (2000 + 10000) / 3000 = 12000 / 3000 = 4.000m
      // Composite VCG = (1000*0.5 + 2000*1.0) / 3000 = (500 + 2000) / 3000 = 2500 / 3000 = 0.833m
      const input = {
        components: [
          { name: 'Keel Mass', massKg: 1000, lcgMetersFromTransom: 2.0, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.5, designMarginPercent: 0 },
          { name: 'Deck Equipment', massKg: 2000, lcgMetersFromTransom: 5.0, tcgMetersFromCl: 0, vcgMetersFromKeel: 1.0, designMarginPercent: 0 }
        ],
        baselineLcbMetersFromTransom: 4.0
      };

      const res = await toolRegistry.executeTool('TOOL-MASS-BALANCE-01', input, ['CALCULATION_EXEC']);
      expect(res.success).toBe(true);
      expect(res.output.lightshipMassKg).toBe(3000);
      expect(res.output.designMarginMassKg).toBe(0);
      expect(res.output.totalDisplacementKg).toBe(3000);
      expect(res.output.compositeLcgMeters).toBeCloseTo(4.0, 3);
      expect(res.output.compositeKgMeters).toBeCloseTo(0.833, 2);
      expect(res.output.compositeTcgMeters).toBe(0);
      expect(res.output.longitudinalTrimEvaluation.trimRisk).toBe('ALIGNED');
    });

    it('should detect excessive forward trim when LCG is significantly ahead of LCB', async () => {
      const input = {
        components: [
          { name: 'Heavy Bow Payload', massKg: 4000, lcgMetersFromTransom: 8.0, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.8, designMarginPercent: 10 }
        ],
        baselineLcbMetersFromTransom: 4.0 // LCG 8.0 is 4m ahead of LCB 4.0
      };

      const res = await toolRegistry.executeTool('TOOL-MASS-BALANCE-01', input, ['CALCULATION_EXEC']);
      expect(res.success).toBe(true);
      expect(res.output.longitudinalTrimEvaluation.trimRisk).toBe('EXCESSIVE_TRIM_FWD');
    });
  });

  // =========================================================================
  // 4. TOOL-ELECTRICAL-01: Electrical Load & Battery Endurance
  // =========================================================================
  describe('TOOL-ELECTRICAL-01: Electrical Load Benchmark', () => {
    it('should calculate battery endurance hours matching energy conservation (kWh / kW)', async () => {
      // 100 kWh total battery, 80% usable depth of discharge = 80 kWh usable
      // Constant 10 kW continuous load (10,000 W)
      // Analytical endurance: 80 kWh / 10 kW = 8.00 hours
      const input = {
        busVoltageV: 48,
        batteryTotalKwh: 100,
        usableDepthOfDischarge: 0.8,
        consumers: [
          { name: 'Propulsion Inverter', voltageV: 48, continuousPowerW: 10000, intermittentPowerW: 0, dutyCycle: 1, isEmergencyLoad: false },
          { name: 'Emergency Beacon & GPS', voltageV: 48, continuousPowerW: 100, intermittentPowerW: 0, dutyCycle: 1, isEmergencyLoad: true }
        ]
      };

      const res = await toolRegistry.executeTool('TOOL-ELECTRICAL-01', input, ['CALCULATION_EXEC']);
      expect(res.success).toBe(true);
      expect(res.output.usableBatteryKwh).toBe(80);
      expect(res.output.estimatedEnduranceHours).toBeCloseTo(80 / 10.1, 1); // 10.1 kW total
      expect(res.output.emergencyEnduranceHours).toBeCloseTo(80 / 0.1, 0); // 800 hours emergency
      expect(res.output.recommendedMainFuseRatingAmps).toBeGreaterThan(0);
    });

    it('should correctly scale nominal bus current inversely with bus voltage (P = V * I)', async () => {
      const consumers = [
        { name: 'Avionics Suite', voltageV: 24, continuousPowerW: 2400, intermittentPowerW: 0, dutyCycle: 1, isEmergencyLoad: true }
      ];

      // At 24V: I = 2400 / 24 = 100A
      const res24V = await toolRegistry.executeTool('TOOL-ELECTRICAL-01', { busVoltageV: 24, batteryTotalKwh: 50, consumers }, ['CALCULATION_EXEC']);
      expect(res24V.output.nominalBusCurrentAmps).toBeCloseTo(100, 1);

      // At 48V: I = 2400 / 48 = 50A
      const res48V = await toolRegistry.executeTool('TOOL-ELECTRICAL-01', { busVoltageV: 48, batteryTotalKwh: 50, consumers }, ['CALCULATION_EXEC']);
      expect(res48V.output.nominalBusCurrentAmps).toBeCloseTo(50, 1);
    });
  });

  // =========================================================================
  // 5. TOOL-STRUCTURES-01: Structural Slamming & Scantlings
  // =========================================================================
  describe('TOOL-STRUCTURES-01: Structural Scantling Benchmark', () => {
    it('should reduce slamming pressure for higher deadrise angle (deeper V-hull)', async () => {
      const base = {
        displacementTonnes: 6.0,
        speedKnots: 25.0,
        lwlMeters: 10.0,
        unsupportedPanelWidthMm: 400,
        unsupportedPanelLengthMm: 800,
        materialYieldStrengthMpa: 125,
        safetyFactor: 2.0
      };

      // Shallow deadrise (12 deg) vs Deep V deadrise (24 deg)
      const resShallow = await toolRegistry.executeTool('TOOL-STRUCTURES-01', { ...base, deadriseAngleDeg: 12 }, ['CALCULATION_EXEC']);
      const resDeep = await toolRegistry.executeTool('TOOL-STRUCTURES-01', { ...base, deadriseAngleDeg: 24 }, ['CALCULATION_EXEC']);

      expect(resShallow.success).toBe(true);
      expect(resDeep.success).toBe(true);
      expect(resDeep.output.designSlammingPressureKpa).toBeLessThan(resShallow.output.designSlammingPressureKpa);
      expect(resDeep.output.minPlatingThicknessMm).toBeLessThan(resShallow.output.minPlatingThicknessMm);
    });

    it('should increase required plating thickness with wider unsupported panel span', async () => {
      const base = {
        displacementTonnes: 6.0,
        speedKnots: 25.0,
        lwlMeters: 10.0,
        deadriseAngleDeg: 18,
        unsupportedPanelLengthMm: 800,
        materialYieldStrengthMpa: 125,
        safetyFactor: 2.0
      };

      const resNarrow = await toolRegistry.executeTool('TOOL-STRUCTURES-01', { ...base, unsupportedPanelWidthMm: 300 }, ['CALCULATION_EXEC']);
      const resWide = await toolRegistry.executeTool('TOOL-STRUCTURES-01', { ...base, unsupportedPanelWidthMm: 600 }, ['CALCULATION_EXEC']);

      expect(resNarrow.success).toBe(true);
      expect(resWide.success).toBe(true);
      expect(resWide.output.minPlatingThicknessMm).toBeGreaterThan(resNarrow.output.minPlatingThicknessMm);
    });
  });

  // =========================================================================
  // 6. TOOL-COLREGS-01: COLREGS Collision Kinematics
  // =========================================================================
  describe('TOOL-COLREGS-01: COLREGS 1972 Encounter Benchmark', () => {
    it('should identify Rule 14 Head-on encounter on reciprocal courses', async () => {
      // Own heading 000 at 12 knots. Target bearing 000 at 2.0 nm, heading 180 at 12 knots.
      const input = {
        ownCourseDeg: 0,
        ownSpeedKnots: 12,
        targetBearingDeg: 0,
        targetRangeNm: 2.0,
        targetCourseDeg: 180,
        targetSpeedKnots: 12
      };

      const res = await toolRegistry.executeTool('TOOL-COLREGS-01', input, ['CALCULATION_EXEC']);
      expect(res.success).toBe(true);
      expect(res.output.closestPointOfApproachCpaNm).toBeLessThan(0.1);
      expect(res.output.timeToCpaMinutes).toBeCloseTo(5.0, 0); // 24 knots relative speed = 2 nm in 5 min
      expect(res.output.colregsRuleApplicable).toBe('RULE_14_HEAD_ON');
      expect(res.output.safeAlterationCourseDeg).toBeDefined();
    });

    it('should identify Rule 15 Crossing Give-Way encounter when target is on Starboard bow', async () => {
      // Own heading 000 at 12 knots. Target bearing 045 at 2.0 nm, heading 270 at 10 knots.
      const input = {
        ownCourseDeg: 0,
        ownSpeedKnots: 12,
        targetBearingDeg: 45,
        targetRangeNm: 2.0,
        targetCourseDeg: 270,
        targetSpeedKnots: 10
      };

      const res = await toolRegistry.executeTool('TOOL-COLREGS-01', input, ['CALCULATION_EXEC']);
      expect(res.success).toBe(true);
      expect(res.output.colregsRuleApplicable).toBe('RULE_15_CROSSING_GIVE_WAY');
      expect(res.output.mandatedAction).toContain('STARBOARD');
    });

    it('should identify Rule 13 Overtaking encounter when own vessel is overtaking target ahead', async () => {
      // Own heading 000 at 20 knots. Target bearing 005 (ahead) at 1.0 nm, heading 000 at 8 knots.
      const input = {
        ownCourseDeg: 0,
        ownSpeedKnots: 20,
        targetBearingDeg: 5,
        targetRangeNm: 1.0,
        targetCourseDeg: 0,
        targetSpeedKnots: 8
      };

      const res = await toolRegistry.executeTool('TOOL-COLREGS-01', input, ['CALCULATION_EXEC']);
      expect(res.success).toBe(true);
      expect(res.output.colregsRuleApplicable).toBe('RULE_13_OVERTAKING');
      expect(res.output.mandatedAction).toContain('Overtaking');
    });

    it('should classify opening encounters with CPA > 1 nm as SAFE_PASSING', async () => {
      // Target opening at 8 nm range
      const input = {
        ownCourseDeg: 0,
        ownSpeedKnots: 10,
        targetBearingDeg: 180,
        targetRangeNm: 8.0,
        targetCourseDeg: 180,
        targetSpeedKnots: 12
      };

      const res = await toolRegistry.executeTool('TOOL-COLREGS-01', input, ['CALCULATION_EXEC']);
      expect(res.success).toBe(true);
      expect(res.output.colregsRuleApplicable).toBe('SAFE_PASSING');
    });
  });

  // =========================================================================
  // 7. Security & Permission Enforcement
  // =========================================================================
  describe('Tool Security & Permission Enforcement', () => {
    it('should reject execution without CALCULATION_EXEC permission', async () => {
      const input = {
        lwlMeters: 10.0,
        beamMeters: 2.5,
        draftMeters: 0.6
      };

      const res = await toolRegistry.executeTool('TOOL-HYDROSTATICS-01', input, ['READ_ONLY']);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Permission Denied');
    });
  });
});
