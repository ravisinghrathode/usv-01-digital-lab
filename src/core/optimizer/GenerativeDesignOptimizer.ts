/**
 * USV-01 Generative Multi-Agent Design Optimization Engine
 * LEGACY EXPLORATORY SCENARIO GENERATOR ONLY. Uses assumed coefficients and
 * synthetic scoring/votes; outputs are not live 26-agent calculations, validated
 * hydrostatics, powering, stability or regulatory compliance evidence.
 */

import { calculateSavitskyPlaning, SavitskyInputs } from '../../utils/navalCalculators';

export type DesignPhilosophy = 'BALANCED_PATROL' | 'ALPHA_SPRINT' | 'BRAVO_ENDURANCE' | 'CHARLIE_GUARDIAN';

export interface SeaStateMetric {
  seaState: number; // 1 to 5
  description: string;
  significantWaveHeightM: number;
  verticalAccelG: number;
  slammingRisk: 'MINIMAL' | 'MODERATE' | 'ELEVATED' | 'HAZARDOUS';
  naturalRollPeriodSec: number;
  rollResonanceRisk: boolean;
  deckWetnessProbabilityPercent: number;
}

export interface ScenarioRuleCheck {
  agentId: string;
  canonicalId: string;
  name: string;
  division: 'DIRECTORATE' | 'NAVAL_ARCH' | 'PROPULSION' | 'AUTONOMY' | 'SYSTEMS';
  vote: 'SCREEN_PASS_UNVERIFIED' | 'SCREEN_FAIL_UNVERIFIED';
  metric: string;
  rationale: string;
}

export interface LocalSensitivity {
  parameter: string;
  displayName: string;
  targetChangePercent: number | null; // finite difference response to +1% input
  inputPerturbationPercent: number;
  primaryTarget: string;
  architecturalGuidance: string;
}

export type HullTopology = 'MONOHULL' | 'CATAMARAN';

export interface CandidateDesign {
  id: string;
  generation: number;
  philosophy: DesignPhilosophy;
  hullType: HullTopology;    // Legacy heuristic topology exploration, not agent evaluation
  /** Reproducibility metadata, NEVER engineering validation. */
  runSeed: number;
  scenarioRevision: string;
  /** Number of seeded PRNG draws consumed before this candidate was generated. */
  drawIndex: number;
  // 7 Free Design Parameters
  lwlMeters: number;         // Waterline length (6.0m - 14.0m)
  beamMeters: number;        // Waterline beam (1.8m - 3.8m)
  draftMeters: number;       // Draft (0.45m - 0.95m)
  deadriseDeg: number;       // Transom deadrise (14° - 26°)
  lcgPercent: number;        // LCG from stern (% of LWL, 30% - 42%)
  batteryKwh: number;        // Battery energy capacity (30 - 90 kWh)
  motorKwTotal: number;      // Twin installed motor power (40 - 120 kW)

  // Synthesized Physics Telemetry
  displacementTonnes: number;
  kgMeters: number;          // Vertical center of gravity
  kbMeters: number;          // Center of buoyancy
  kmtMeters: number;         // Transverse metacenter
  gmtMeters: number;         // Transverse metacentric height (GMt)
  peakDragKn: number;        // Savitsky peak hump resistance
  cruiseDragKn: number;      // Drag at 14 knots cruise
  sprintSpeedKnots: number;  // Max achievable sprint speed
  cruisePowerKw: number;     // Power required at 14 knots
  enduranceHours: number;    // Hours at 14 knots
  rangeNm: number;           // Total range in nautical miles
  slammingPressureKpa: number; // ISO 12215-5 bottom slamming pressure

  // Multi-Sea-State Dynamics (SS 1 - 5)
  seaStates: SeaStateMetric[];

  // 12 purely synthetic input/heuristic checks (no agent review)
  scenarioRuleChecks: ScenarioRuleCheck[];

  // Local 1% finite-difference influence (unverified model)
  localSensitivities: LocalSensitivity[];

  // Evaluation & Verdict
  status: 'SURVIVED' | 'REJECTED_STABILITY' | 'REJECTED_DRAG' | 'REJECTED_RANGE' | 'REJECTED_STRUCTURE' | 'REJECTED_FLOTATION';
  fitnessScore: number;      // 0 - 100
  failedGate?: string;
  rejectionReason?: string;

  // Multi-Agent Dialectical Debate & Learnings
  debateTranscript: { agentId: string; role: string; statement: string; sentiment: 'ENDORSE' | 'OBJECT' | 'COMPROMISE' }[];
  agentLearnings: { agentId: string; lesson: string; invariantProposed?: string }[];
}

export interface LearnedInvariant {
  id: string;
  agentId: string;
  category: 'STABILITY' | 'HYDRODYNAMICS' | 'ENERGY' | 'STRUCTURE' | 'GEOMETRY';
  ruleStatement: string;
  discoveredAtGeneration: number;
  mathEvidence: string;
}

export class GenerativeDesignOptimizer {
  private static instance: GenerativeDesignOptimizer;
  private history: CandidateDesign[] = [];
  private learnedInvariants: LearnedInvariant[] = [];
  private currentGeneration: number = 0;
  private currentChampion: CandidateDesign | null = null;
  /** Explicit reproducibility seed, NOT an engineering baseline identifier. */
  private seed = 0x55535631;
  private randomState = this.seed;
  private draws = 0;
  private readonly scenarioRevision = 'LEGACY_HEURISTIC_REV_0_4_UNVERIFIED';

  private nextRandom(): number {
    // Mulberry32: fixed 32-bit integer operations make scenario sampling repeatable.
    this.randomState = (this.randomState + 0x6D2B79F5) >>> 0;
    let t = this.randomState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    this.draws += 1;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public getRunMetadata() {
    return { runSeed: this.seed, scenarioRevision: this.scenarioRevision, randomDraws: this.draws, generation: this.currentGeneration,
      screeningOnly: true as const, engineeringReleaseAuthorized: false as const };
  }

  private constructor() {
    this.seedBaselineInvariants();
  }

  /**
   * Per-campaign instance: avoids corrupting another user's interactive
   * optimizer state or interleaving seeded random draws between design runs.
   */
  public static createIsolated(seed: number): GenerativeDesignOptimizer {
    const optimizer = new GenerativeDesignOptimizer();
    optimizer.resetOptimizer(seed);
    return optimizer;
  }

  public static getInstance(): GenerativeDesignOptimizer {
    if (!GenerativeDesignOptimizer.instance) {
      GenerativeDesignOptimizer.instance = new GenerativeDesignOptimizer();
    }
    return GenerativeDesignOptimizer.instance;
  }

  private seedBaselineInvariants() {
    // Previous "rules" claimed universal IMO stability, hydrodynamic planing
    // and laminate thresholds with no approved vessel/standard applicability.
    // Never seed an evidence ledger with unverified normative statements.
    this.learnedInvariants = [];
  }

  public getHistory(): CandidateDesign[] {
    return this.history;
  }

  public getChampion(): CandidateDesign | null {
    return this.currentChampion;
  }

  public getLearnedInvariants(): LearnedInvariant[] {
    return this.learnedInvariants;
  }

  public resetOptimizer(seed: number = this.seed) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) {
      throw new Error('Optimizer seed must be an unsigned 32-bit integer');
    }
    this.seed = seed >>> 0;
    this.randomState = this.seed;
    this.draws = 0;
    this.history = [];
    this.currentGeneration = 0;
    this.currentChampion = null;
    this.seedBaselineInvariants();
  }

  /**
   * Run a single seeded exploratory trial with unverified heuristic screening
   */
  public runIteration(targetPhilosophy: DesignPhilosophy = 'BALANCED_PATROL'): CandidateDesign {
    this.currentGeneration += 1;
    const gen = this.currentGeneration;

    // Mutate parameters using seeded exploratory heuristics, never approved vessel particulars.
    const candidate = this.generateCandidateParameters(gen, targetPhilosophy);

    // 1. Solve Naval Physics
    this.solvePhysics(candidate);

    // 2. Solve Multi-Sea-State Dynamics (SS 1 - 5)
    this.solveSeaStateDynamics(candidate);

    // 3. Compute local one-factor-at-a-time scenario sensitivity
    this.computeLocalSensitivities(candidate);

    // 4. Evaluate 5 Multi-Agent Physics Gates
    this.evaluateHeuristicScenarioGates(candidate);

    // 5. Legacy synthetic input-rule checks (NOT live agent executions)
    this.evaluateSyntheticRuleVotes(candidate);

    // 6. Update Champion if Survived and Higher Fitness
    if (candidate.status === 'SURVIVED') {
      if (!this.currentChampion || candidate.fitnessScore > this.currentChampion.fitnessScore) {
        this.currentChampion = candidate;
      }
    }

    this.history.unshift(candidate);
    return candidate;
  }

  private generateCandidateParameters(gen: number, phil: DesignPhilosophy): CandidateDesign {
    // Apply philosophy weightings
    let lwlMin = 9.0, lwlMax = 12.5;
    let bMin = 2.4, bMax = 3.2;
    let deadriseMin = 18.0, deadriseMax = 22.0;
    let battMin = 45.0, battMax = 70.0;
    let motorMin = 60.0, motorMax = 90.0;

    if (phil === 'ALPHA_SPRINT') {
      lwlMin = 8.5; lwlMax = 11.0;
      bMin = 2.2; bMax = 2.7;
      deadriseMin = 20.0; deadriseMax = 25.0;
      battMin = 35.0; battMax = 50.0;
      motorMin = 80.0; motorMax = 120.0;
    } else if (phil === 'BRAVO_ENDURANCE') {
      lwlMin = 10.5; lwlMax = 13.5;
      bMin = 2.6; bMax = 3.3;
      deadriseMin = 16.0; deadriseMax = 19.5;
      battMin = 60.0; battMax = 85.0;
      motorMin = 50.0; motorMax = 70.0;
    } else if (phil === 'CHARLIE_GUARDIAN') {
      lwlMin = 10.0; lwlMax = 12.8;
      bMin = 2.8; bMax = 3.5;
      deadriseMin = 21.0; deadriseMax = 25.5;
      battMin = 50.0; battMax = 65.0;
      motorMin = 70.0; motorMax = 100.0;
    }

    // In early generations, allow broader exploration; later generations converge near champions
    const variance = Math.max(0.08, 1.0 / Math.sqrt(gen + 1));

    const baseLwl = this.currentChampion ? this.currentChampion.lwlMeters : (lwlMin + lwlMax) / 2;
    const baseBeam = this.currentChampion ? this.currentChampion.beamMeters : (bMin + bMax) / 2;
    const baseDeadrise = this.currentChampion ? this.currentChampion.deadriseDeg : (deadriseMin + deadriseMax) / 2;
    const baseBatt = this.currentChampion ? this.currentChampion.batteryKwh : (battMin + battMax) / 2;
    const baseMotor = this.currentChampion ? this.currentChampion.motorKwTotal : (motorMin + motorMax) / 2;

    const jitter = (min: number, max: number, base: number) => {
      const delta = (max - min) * variance * (this.nextRandom() - 0.5);
      return Math.min(Math.max(base + delta, min), max);
    };

    // Explore both Monohull and Catamaran topologies dynamically
    let hullType: HullTopology;
    if (this.currentChampion && this.nextRandom() > 0.35) {
      // 65% of the time, explore variations of the leading champion's topology
      hullType = this.currentChampion.hullType;
    } else {
      // 35% of the time, test counter-hypotheses between Monohull and Catamaran
      hullType = this.nextRandom() > 0.5 ? 'CATAMARAN' : 'MONOHULL';
    }

    if (hullType === 'CATAMARAN') {
      bMin = Math.max(2.8, bMin * 1.15);
      bMax = Math.min(3.8, bMax * 1.2);
    }

    const lwl = Number(jitter(lwlMin, lwlMax, baseLwl).toFixed(2));
    const beam = Number(jitter(bMin, bMax, baseBeam).toFixed(2));
    const deadrise = Number(jitter(deadriseMin, deadriseMax, baseDeadrise).toFixed(1));
    const battery = Number(jitter(battMin, battMax, baseBatt).toFixed(1));
    const motor = Number(jitter(motorMin, motorMax, baseMotor).toFixed(1));
    const lcg = Number((34.5 + (this.nextRandom() - 0.5) * 4 * variance).toFixed(1));
    const draft = Number((0.55 + (battery / 100) * 0.18).toFixed(2));

    return {
      id: `ITER-${gen.toString().padStart(3, '0')}`,
      generation: gen,
      runSeed: this.seed,
      scenarioRevision: this.scenarioRevision,
      drawIndex: this.draws,
      philosophy: phil,
      hullType,
      lwlMeters: lwl,
      beamMeters: beam,
      draftMeters: draft,
      deadriseDeg: deadrise,
      lcgPercent: lcg,
      batteryKwh: battery,
      motorKwTotal: motor,
      displacementTonnes: 0,
      kgMeters: 0,
      kbMeters: 0,
      kmtMeters: 0,
      gmtMeters: 0,
      peakDragKn: 0,
      cruiseDragKn: 0,
      sprintSpeedKnots: 0,
      cruisePowerKw: 0,
      enduranceHours: 0,
      rangeNm: 0,
      slammingPressureKpa: 0,
      seaStates: [],
      scenarioRuleChecks: [],
      localSensitivities: [],
      status: 'SURVIVED',
      fitnessScore: 0,
      debateTranscript: [],
      agentLearnings: []
    };
  }

  public solvePhysics(c: CandidateDesign) {
    const isCat = c.hullType === 'CATAMARAN';

    // 1. Mass balance: Structure + Battery + Propulsion + Avionics/Payload + Margin
    // Catamaran has twin demi-hulls + cross-deck bridgedeck structure (+17% structural composite mass)
    const hullStructureKg = isCat
      ? c.lwlMeters * c.beamMeters * 68.0
      : c.lwlMeters * c.beamMeters * 58.0;

    const batteryKg = c.batteryKwh * 11.5; // LiFePO4 cells + BMS + IP67 casing (~87 Wh/kg pack level)
    const motorDrivetrainKg = c.motorKwTotal * 6.5; // Twin PMSM pods, inverters, steering actuators
    const avionicsPayloadKg = 420.0; // Radar, LiDAR, cameras, Jetson, communications
    const growthMarginKg = (hullStructureKg + batteryKg + motorDrivetrainKg + avionicsPayloadKg) * 0.08;

    const totalMassKg = hullStructureKg + batteryKg + motorDrivetrainKg + avionicsPayloadKg + growthMarginKg;
    c.displacementTonnes = Number((totalMassKg / 1000).toFixed(2));

    // 2. Vertical Center of Gravity (KG)
    const sumMomentsZ =
      hullStructureKg * (c.draftMeters * (isCat ? 1.25 : 1.1)) +
      batteryKg * (c.draftMeters * 0.45) +
      motorDrivetrainKg * (c.draftMeters * 0.6) +
      avionicsPayloadKg * 1.85 +
      growthMarginKg * 0.9;
    c.kgMeters = Number((sumMomentsZ / totalMassKg).toFixed(2));

    // 3. Hydrostatics: Archimedes Draft & Metacenter
    const rhoSeawater = 1.025; // t/m³
    const displacedVolumeM3 = c.displacementTonnes / rhoSeawater;

    if (isCat) {
      // Catamaran Hydrostatics (Parallel Axis Theorem)
      const demiBeam = c.beamMeters * 0.28;
      const cbDemi = 0.48; // Slender demi-hull block coefficient
      const demiVolume = displacedVolumeM3 / 2.0;
      c.draftMeters = Number((demiVolume / (c.lwlMeters * demiBeam * cbDemi)).toFixed(2));
      c.kbMeters = Number((c.draftMeters * 0.54).toFixed(2));

      // Parallel Axis Theorem for Catamaran Transverse Inertia:
      // I_T = 2 * (i_demi + A_demi * y^2) where y = 0.36 * B
      const cwpDemi = 0.70;
      const demiAw = cwpDemi * c.lwlMeters * demiBeam;
      const iDemi = (cwpDemi * c.lwlMeters * Math.pow(demiBeam, 3)) / 12.0;
      const ySpacing = c.beamMeters * 0.36;
      const totalIt = 2.0 * (iDemi + demiAw * Math.pow(ySpacing, 2));

      const bmt = totalIt / displacedVolumeM3;
      c.kmtMeters = Number((c.kbMeters + bmt).toFixed(2));
      c.gmtMeters = Number((c.kmtMeters - c.kgMeters).toFixed(2)); // High intact stability (1.4m - 2.6m)
    } else {
      // Deep-V Monohull Hydrostatics
      const cb = 0.44; // Deep-V block coefficient
      c.draftMeters = Number((displacedVolumeM3 / (c.lwlMeters * c.beamMeters * cb)).toFixed(2));
      c.kbMeters = Number((c.draftMeters * 0.53).toFixed(2)); // Centroid of submerged V
      const cwp = 0.66; // Waterplane area coefficient
      const iwp = (cwp * c.lwlMeters * Math.pow(c.beamMeters, 3)) / 12.0; // Second moment of waterplane
      const bmt = iwp / displacedVolumeM3;
      c.kmtMeters = Number((c.kbMeters + bmt).toFixed(2));
      c.gmtMeters = Number((c.kmtMeters - c.kgMeters).toFixed(2)); // Normal intact stability (0.35m - 0.75m)
    }

    // 4. Hydrodynamic Resistance & Drag Calculation
    const etaProp = isCat ? 0.65 : 0.62;

    if (isCat) {
      // Catamaran Resistance via Insel & Molland Slender Body Wave Interference
      const demiBeam = c.beamMeters * 0.28;
      const spacingRatio = (c.beamMeters * 0.72) / c.lwlMeters;
      const interferenceBeta = 1.0 + 0.30 * Math.exp(-spacingRatio * 4.2);

      // Slender demi-hulls have smooth transition without harsh planing hump
      c.peakDragKn = Number((7.4 * interferenceBeta * (c.displacementTonnes / 6.0)).toFixed(2));
      c.cruiseDragKn = Number((5.6 * interferenceBeta * (c.displacementTonnes / 6.0)).toFixed(2));

      // Sprint speed calculation
      let maxSpeed = 16;
      for (let s = 14; s <= 30; s += 2) {
        const speedMs = s * 0.514444;
        const dragAtSpeedKn = c.cruiseDragKn * Math.pow(s / 14, 1.65);
        const reqKw = (dragAtSpeedKn * speedMs) / etaProp;
        if (reqKw <= c.motorKwTotal) {
          maxSpeed = s;
        }
      }
      c.sprintSpeedKnots = maxSpeed;
    } else {
      // Monohull Savitsky Planing Formulation
      const savitskyInputs: SavitskyInputs = {
        massKg: totalMassKg,
        beamM: c.beamMeters,
        deadriseDeg: c.deadriseDeg,
        lcgM: (c.lcgPercent / 100) * c.lwlMeters
      };

      const hydroResult = calculateSavitskyPlaning(savitskyInputs);
      c.peakDragKn = Number((hydroResult.peakHumpResistanceKN).toFixed(2));

      // Drag at cruise (14 knots) and sprint speed calculation
      const point14 = hydroResult.curve.find(p => p.speedKnots === 14) || hydroResult.curve[5];
      c.cruiseDragKn = Number((point14?.totalResistanceKN || 8.5).toFixed(2));

      let maxSpeed = 14;
      for (const pt of hydroResult.curve) {
        const reqKw = (pt.totalResistanceKN * pt.speedMs) / etaProp;
        if (reqKw <= c.motorKwTotal) {
          maxSpeed = pt.speedKnots;
        }
      }
      c.sprintSpeedKnots = maxSpeed;
    }

    c.cruisePowerKw = Number(((c.cruiseDragKn * (14 * 0.514444)) / etaProp).toFixed(1));

    // 5. Energy Budget & Endurance
    const hotelLoadKw = 1.8;
    const totalCruiseDrawKw = c.cruisePowerKw + hotelLoadKw;
    const usableBatteryKwh = c.batteryKwh * 0.90; // 90% DoD
    c.enduranceHours = Number((usableBatteryKwh / totalCruiseDrawKw).toFixed(1));
    c.rangeNm = Number((c.enduranceHours * 14.0).toFixed(0));

    // 6. ISO 12215-5 Slamming Design Pressure
    const betaRad = (c.deadriseDeg * Math.PI) / 180;
    const nCg = 3.2; // 3.2g design acceleration in Sea State 3
    if (isCat) {
      // Catamaran Wet-Deck Tunnel Clearance & Slamming
      const wetDeckClearance = 0.75 - c.draftMeters;
      const tunnelFactor = wetDeckClearance < 0.20 ? 1.35 : 0.88;
      c.slammingPressureKpa = Number(
        (0.10 * (1 + 0.3 * nCg) * Math.pow(c.sprintSpeedKnots, 1.45) * Math.pow(c.displacementTonnes / c.lwlMeters, 0.30) * tunnelFactor).toFixed(1)
      );
    } else {
      c.slammingPressureKpa = Number(
        (0.12 * (1 + 0.3 * nCg) * Math.pow(c.sprintSpeedKnots, 1.55) * Math.pow(c.displacementTonnes / c.lwlMeters, 0.32) / Math.tan(betaRad)).toFixed(1)
      );
    }
  }

  private solveSeaStateDynamics(c: CandidateDesign) {
    const seaStateDefs = [
      { ss: 1, name: 'Calm (Rippled)', hs: 0.1, vKn: c.sprintSpeedKnots },
      { ss: 2, name: 'Smooth (Wavelets)', hs: 0.5, vKn: c.sprintSpeedKnots * 0.95 },
      { ss: 3, name: 'Slight/Moderate (Operational Limit)', hs: 1.0, vKn: 14.0 },
      { ss: 4, name: 'Moderate/Rough (Seakeeping Test)', hs: 1.875, vKn: 10.0 },
      { ss: 5, name: 'Rough (Survival Mode)', hs: 3.0, vKn: 6.0 }
    ];

    const freeboardMeters = Math.max(0.6, 1.45 - c.draftMeters);

    c.seaStates = seaStateDefs.map(def => {
      // Fridsma / Savitsky vertical acceleration formula:
      // a_cg = 0.012 * (V / sqrt(L))^1.8 * (Hs / B) * (1 + 10 / beta)
      const froudeV = (def.vKn * 0.514444) / Math.sqrt(9.81 * c.lwlMeters);
      const accelG = Number((0.85 * froudeV * (def.hs / c.beamMeters) * (18 / c.deadriseDeg)).toFixed(2));

      // Natural Roll Period: T_phi = 2 * C * B / sqrt(GMt) where C ~ 0.38
      const gmtPositive = Math.max(0.05, c.gmtMeters);
      const naturalRollPeriod = Number(((2 * 0.38 * c.beamMeters) / Math.sqrt(gmtPositive)).toFixed(2));

      // Wave encounter period in head/bow seas
      const wavePeriod = 3.2 * Math.sqrt(def.hs);
      const resonanceRisk = Math.abs(naturalRollPeriod - wavePeriod) < 0.6;

      // Deck Wetness Probability: P_wet = 100 * exp(-2 * Fb^2 / Hs^2)
      const deckWetnessProb = def.hs > 0.2
        ? Number((100 * Math.exp((-2 * Math.pow(freeboardMeters, 2)) / Math.pow(def.hs, 2))).toFixed(1))
        : 0;

      let slammingRisk: 'MINIMAL' | 'MODERATE' | 'ELEVATED' | 'HAZARDOUS' = 'MINIMAL';
      if (accelG > 3.5 || def.hs >= 2.5) {
        slammingRisk = 'HAZARDOUS';
      } else if (accelG > 2.2 || def.hs >= 1.5) {
        slammingRisk = 'ELEVATED';
      } else if (accelG > 1.2) {
        slammingRisk = 'MODERATE';
      }

      return {
        seaState: def.ss,
        description: def.name,
        significantWaveHeightM: def.hs,
        verticalAccelG: accelG,
        slammingRisk,
        naturalRollPeriodSec: naturalRollPeriod,
        rollResonanceRisk: resonanceRisk,
        deckWetnessProbabilityPercent: Math.min(deckWetnessProb, 100)
      };
    });
  }

  private computeLocalSensitivities(c: CandidateDesign) {
    // Real finite differences of the legacy deterministic heuristic solver.
    // This is one-factor-at-a-time LOCAL numerical influence, NOT Sobol
    // variance decomposition, uncertainty bounds or physical calibration.
    type NumericParam = 'beamMeters' | 'batteryKwh' | 'deadriseDeg' | 'lwlMeters' | 'motorKwTotal';
    type NumericTarget = 'gmtMeters' | 'enduranceHours' | 'peakDragKn' | 'sprintSpeedKnots';
    const specs: Array<{ key: NumericParam; target: NumericTarget; name: string; description: string }> = [
      { key: 'beamMeters', target: 'gmtMeters', name: 'Waterline Beam', description: 'Approximate GM screening' },
      { key: 'batteryKwh', target: 'enduranceHours', name: 'Battery Hypothesis', description: 'Synthetic energy-duration equation' },
      { key: 'deadriseDeg', target: 'peakDragKn', name: 'Transom Deadrise', description: 'Legacy approximate resistance' },
      { key: 'lwlMeters', target: 'peakDragKn', name: 'Waterline Length', description: 'Legacy approximate resistance' },
      { key: 'motorKwTotal', target: 'sprintSpeedKnots', name: 'Installed Motor Hypothesis', description: 'Discrete speed scanning, finite difference may be zero' }
    ];
    c.localSensitivities = specs.map(spec => {
      const original = c[spec.key];
      const relative = 0.01;
      const delta = original * relative;
      const trial: CandidateDesign = {
        ...c, [spec.key]: original + delta,
        seaStates: [], scenarioRuleChecks: [], localSensitivities: [],
        debateTranscript: [], agentLearnings: []
      };
      this.solvePhysics(trial);
      const baseTarget = c[spec.target];
      const perturbed = trial[spec.target];
      const change = Number.isFinite(baseTarget) && Number.isFinite(perturbed) && Math.abs(baseTarget) > 1e-12
        ? Number((((perturbed - baseTarget) / Math.abs(baseTarget)) * 100).toFixed(3))
        : null;
      return {
        parameter: spec.key, displayName: spec.name,
        inputPerturbationPercent: 1,
        targetChangePercent: change,
        primaryTarget: spec.description,
        architecturalGuidance: 'UNVERIFIED one-at-a-time +1% input sensitivity in legacy heuristic, not a Sobol index or validated naval-design recommendation.'
      };
    });
  }

  private evaluateHeuristicScenarioGates(c: CandidateDesign) {
    // These are configurable exploratory preference screens from the historical
    // demonstration model, NOT naval engineering acceptance or agent debate.
    c.debateTranscript = [{
      agentId: 'SYNTHETIC_SCENARIO_GATE',
      role: 'Legacy numerical hypothesis screen',
      statement: 'Illustrative formulas and thresholds only. No role-level AI execution, physical verification, applicable class rules, or approved mission baseline.',
      sentiment: 'OBJECT'
    }];
    c.agentLearnings = [];
    const reject = (status: CandidateDesign['status'], reason: string, fitness: number) => {
      c.status = status;
      c.failedGate = 'LEGACY_UNVERIFIED_HEURISTIC';
      c.rejectionReason = reason;
      c.fitnessScore = fitness;
    };
    if (![c.lwlMeters,c.beamMeters,c.draftMeters,c.displacementTonnes,c.gmtMeters,
          c.peakDragKn,c.sprintSpeedKnots,c.enduranceHours,c.slammingPressureKpa,c.cruisePowerKw]
        .every(Number.isFinite)) {
      reject('REJECTED_FLOTATION', 'Nonfinite numerical result in approximate model', 0);
    } else if (c.draftMeters < 0.40 || c.draftMeters > 0.88) {
      reject('REJECTED_FLOTATION', 'Historical hypothetical draft range [0.40,0.88]m not satisfied; not a verified operating constraint', 15);
    } else if (c.gmtMeters < 0.35) {
      reject('REJECTED_STABILITY', 'Approximate GM below legacy 0.35m scenario screening reference; this is NOT IMO compliance classification', 25);
    } else if (c.peakDragKn > 15.5 || c.sprintSpeedKnots < 21) {
      reject('REJECTED_DRAG', 'Historical trial resistance/speed preference not met; no validated powering envelope or CFD/sea-trial data', 40);
    } else if (c.enduranceHours < 8) {
      reject('REJECTED_RANGE', 'Hypothetical 8h demo preference not met; mission requirement and endurance model are unverified', 55);
    } else if (c.slammingPressureKpa > 135) {
      reject('REJECTED_STRUCTURE', 'Unverified synthetic slamming threshold exceeded; does not establish laminate or ISO adequacy', 65);
    } else {
      c.status = 'SURVIVED';
      c.failedGate = undefined;
      c.rejectionReason = undefined;
      const scoreEndurance = Math.min((c.enduranceHours / 12) * 30, 30);
      const scoreStability = Math.min(((c.gmtMeters - 0.35) / 1.0) * 25, 25);
      const scoreSpeed = Math.min(((c.sprintSpeedKnots - 20) / 6) * 25, 25);
      const scoreEfficiency = Math.min((15.0 / Math.max(0.001, c.cruisePowerKw)) * 20, 20);
      c.fitnessScore = Number(Math.max(0, Math.min(100,
        scoreEndurance + scoreStability + scoreSpeed + scoreEfficiency)).toFixed(1));
    }
  }

  private evaluateSyntheticRuleVotes(c: CandidateDesign) {
    // Transparent scenario hygiene tests, NOT agent executions, domain
    // certification, class-rule compliance, seakeeping prediction or approval.
    // The rules intentionally avoid pretending to cover safety-critical physics.
    const finitePositive = (value: number) => Number.isFinite(value) && value > 0;
    const rules: Array<{
      id: string; name: string;
      division: ScenarioRuleCheck['division'];
      pass: boolean; metric: string; rationale: string;
    }> = [
      {
        id: 'SCR-001', name: 'Illustrative hull length check',
        division: 'NAVAL_ARCH', pass: finitePositive(c.lwlMeters),
        metric: 'Waterline length is finite and positive',
        rationale: 'Input sanitation only. No hull offsets or CAD geometry examined.'
      },
      {
        id: 'SCR-002', name: 'Illustrative beam check',
        division: 'NAVAL_ARCH', pass: finitePositive(c.beamMeters),
        metric: 'Beam is finite and positive',
        rationale: 'Input sanitation only. No independent resistance or stability evidence.'
      },
      {
        id: 'SCR-003', name: 'Illustrative draft check',
        division: 'NAVAL_ARCH', pass: finitePositive(c.draftMeters),
        metric: 'Draft is finite and positive',
        rationale: 'Not an equilibrium solution from controlled offsets and loading conditions.'
      },
      {
        id: 'SCR-004', name: 'Screened displacement check',
        division: 'NAVAL_ARCH', pass: finitePositive(c.displacementTonnes),
        metric: 'Screened mass is finite and positive',
        rationale: 'Estimated coefficients and component masses, not verified weight ledger or inclining test.'
      },
      {
        id: 'SCR-005', name: 'Screened KG check',
        division: 'NAVAL_ARCH', pass: Number.isFinite(c.kgMeters) && c.kgMeters >= 0,
        metric: 'Illustrative KG is finite and nonnegative',
        rationale: 'No accepted center-of-gravity measurement or free-surface correction.'
      },
      {
        id: 'SCR-006', name: 'Screened initial GM check',
        division: 'NAVAL_ARCH', pass: finitePositive(c.gmtMeters),
        metric: 'Approximate GM positive (NOT IMO criterion)',
        rationale: 'Positive approximate GM alone establishes neither GZ stability nor statutory compliance.'
      },
      {
        id: 'SCR-007', name: 'Screened resistance sanity',
        division: 'PROPULSION', pass: finitePositive(c.cruiseDragKn) && finitePositive(c.peakDragKn),
        metric: 'Approximate resistance is finite and positive',
        rationale: 'Legacy empirical resistance lacks independently benchmarked model-test data.'
      },
      {
        id: 'SCR-008', name: 'Installed motor hypothesis',
        division: 'PROPULSION', pass: finitePositive(c.motorKwTotal),
        metric: 'Assumed motor rating is finite and positive',
        rationale: 'No supplier datasheet, efficiency map, propulsor match or sea trial verified.'
      },
      {
        id: 'SCR-009', name: 'Battery hypothesis',
        division: 'PROPULSION', pass: finitePositive(c.batteryKwh),
        metric: 'Assumed battery capacity is finite and positive',
        rationale: 'Pack usable energy, DC bus losses and safety controls not qualified.'
      },
      {
        id: 'SCR-010', name: 'Illustrative endurance sanity',
        division: 'PROPULSION', pass: finitePositive(c.enduranceHours),
        metric: 'Heuristic endurance is finite and positive',
        rationale: 'No duty-cycle, loss, battery aging or weather validation; NOT a mission-endurance prediction.'
      },
      {
        id: 'SCR-011', name: 'Illustrative slamming indicator',
        division: 'SYSTEMS', pass: Number.isFinite(c.slammingPressureKpa) && c.slammingPressureKpa >= 0,
        metric: 'Heuristic pressure indicator is finite',
        rationale: 'Not a laminate/core capacity check, ISO scantling assessment or FEA.'
      },
      {
        id: 'SCR-012', name: 'Sea-state input coverage',
        division: 'SYSTEMS', pass: c.seaStates.length === 5,
        metric: 'Five generated sea-state rows present',
        rationale: 'Coverage of synthetic inputs only; no RAO, slamming trial, or validated seakeeping model.'
      }
    ];
    c.scenarioRuleChecks = rules.map(rule => ({
      agentId: rule.id, canonicalId: rule.id,
      name: rule.name, division: rule.division,
      vote: rule.pass ? 'SCREEN_PASS_UNVERIFIED' : 'SCREEN_FAIL_UNVERIFIED',
      metric: rule.metric, rationale: rule.rationale
    }));
  }

  private recordLearnedInvariant(agentId: string, category: any, ruleStatement: string, mathEvidence: string) {
    if (!this.learnedInvariants.some(inv => inv.ruleStatement === ruleStatement)) {
      this.learnedInvariants.push({
        id: `INVAR-${this.learnedInvariants.length + 1}`,
        agentId,
        category,
        ruleStatement,
        discoveredAtGeneration: this.currentGeneration,
        mathEvidence
      });
    }
  }

  /**
   * Run custom parameter exploration for live "what-if" studio
   */
  public evaluateCustomHypothesis(params: {
    hullType?: HullTopology;
    lwlMeters: number;
    beamMeters: number;
    deadriseDeg: number;
    batteryKwh: number;
    motorKwTotal: number;
    lcgPercent: number;
    payloadKg?: number;
  }): CandidateDesign {
    const candidate: CandidateDesign = {
      id: 'CUSTOM-STUDIO',
      generation: this.currentGeneration,
      runSeed: this.seed,
      scenarioRevision: this.scenarioRevision,
      drawIndex: this.draws,
      philosophy: 'BALANCED_PATROL',
      hullType: params.hullType || (this.currentChampion ? this.currentChampion.hullType : 'CATAMARAN'),
      lwlMeters: params.lwlMeters,
      beamMeters: params.beamMeters,
      draftMeters: 0.6,
      deadriseDeg: params.deadriseDeg,
      lcgPercent: params.lcgPercent,
      batteryKwh: params.batteryKwh,
      motorKwTotal: params.motorKwTotal,
      displacementTonnes: 0,
      kgMeters: 0,
      kbMeters: 0,
      kmtMeters: 0,
      gmtMeters: 0,
      peakDragKn: 0,
      cruiseDragKn: 0,
      sprintSpeedKnots: 0,
      cruisePowerKw: 0,
      enduranceHours: 0,
      rangeNm: 0,
      slammingPressureKpa: 0,
      seaStates: [],
      scenarioRuleChecks: [],
      localSensitivities: [],
      status: 'SURVIVED',
      fitnessScore: 0,
      debateTranscript: [],
      agentLearnings: []
    };

    this.solvePhysics(candidate);
    this.solveSeaStateDynamics(candidate);
    this.computeLocalSensitivities(candidate);
    this.evaluateHeuristicScenarioGates(candidate);
    this.evaluateSyntheticRuleVotes(candidate);

    return candidate;
  }

  /**
   * Run Red Team Cross-Examination (INDEP-REV-24) on current champion
   */
  public generateRedTeamChallenge(): {
    question: string;
    skepticismCategory: string;
    candidateVulnerability: string;
    engineeringDefense: string;
    verifiedMath: string;
  }[] {
    const c = this.currentChampion || this.history[0];
    if (!c) return [];
    const questions = [
      ['How can this hull topology be justified?', 'Hull architecture',
       'No authoritative CAD or model-test comparison of monohull and catamaran'],
      ['How are principal dimensions and displacement verified?', 'Hydrostatics and mass',
       'No approved offsets, measured mass/CG, loading cases, GZ or downflooding studies'],
      ['What supports the predicted speed and endurance?', 'Resistance and energy',
       'No validated CFD/tank data, propulsive efficiency map or full electrical duty cycle'],
      ['What happens after a propulsion actuator fails?', 'Propulsion redundancy',
       'No documented failure modes, controlled dynamic simulation or real HIL tests'],
      ['What verifies composite scantlings in slamming?', 'Structures',
       'No qualified laminate layup, loads, structural solver convergence or test coupon results'],
      ['How can the vessel safely operate in the ODD?', 'Autonomy and sea trials',
       'No approved sensor calibration, closed-loop SIL, HIL, COLREG observer or permitted sea trials']
    ] as const;
    return questions.map(([question, skepticismCategory, candidateVulnerability]) => ({
      question, skepticismCategory, candidateVulnerability,
      engineeringDefense: 'NOT DEMONSTRATED. This exploratory scenario provides no verified engineering defense.',
      verifiedMath: 'MISSING: independent source-backed calculations, applicable standards, qualified review and physical acceptance.'
    }));
  }

  /**
   * Export unverified exploratory concept dossier formatted for executive review
   */
  public generateExecutiveDefenseDossierMarkdown(candidate?: CandidateDesign): string {
    const c = candidate || this.currentChampion || this.history[0];
    if (!c) return '# USV-01 Executive Design Defense Dossier\nNo candidate data available.';

    const passes = c.scenarioRuleChecks.filter(a => a.vote === 'SCREEN_PASS_UNVERIFIED').length;
    const fails = c.scenarioRuleChecks.filter(a => a.vote === 'SCREEN_FAIL_UNVERIFIED').length;

    return `# USV-01 DIGITAL LAB | EXECUTIVE NAVAL DESIGN DEFENSE DOSSIER
**Document Control:** USV-01-DEF-DOSSIER-REV-1.0 (SCREENING / NOT FOR DESIGN RELEASE)\n**Reproducibility Seed:** ${c.runSeed} | PRNG draw index: ${c.drawIndex} | Scenario revision: ${c.scenarioRevision}\n**Numerical Confidence:** UNVERIFIED LEGACY HEURISTIC; deterministic replay does not validate engineering accuracy.
**UNVERIFIED EXPLORATORY CANDIDATE:** ${c.id} (Generation #${c.generation})
**Design Philosophy:** ${c.philosophy}
**Composite Multi-Objective Fitness:** ${c.fitnessScore} / 100
**Synthetic screening rule status (NOT actual agent consensus):** ${c.status} (${passes} tentative passes, ${fails} failures; no engineering approval)

---

## 1. Executive Summary & Design Justification
**WARNING — SCREENING ONLY.** All numbers below are illustrative outputs from a legacy heuristic generator with undocumented/uncalibrated assumptions. No verified vessel geometry, loading, resistance, propulsion efficiency, independent FEA, external source authentication or real 26-agent project-specific debate is demonstrated. This is NOT an engineering design certificate, regulatory compliance statement or authorization to update the controlled baseline. The synthetic scoring cannot establish capsize prevention, structures, performance, or suitability.

### Primary Geometry & Performance Parameters:
- **Hull Topology Architecture:** **${c.hullType}**
- **Length Waterline (LWL):** ${c.lwlMeters} m
- **Beam Waterline (B):** ${c.beamMeters} m (L/B Ratio: ${(c.lwlMeters / c.beamMeters).toFixed(2)})
- **Operating Draft (T):** ${c.draftMeters} m
- **Transom Deadrise (β):** ${c.deadriseDeg}°
- **Full Load Displacement (Δ):** ${c.displacementTonnes} metric tonnes
- **Transverse Metacentric Height (GMt):** **${c.gmtMeters} m** *(unverified approximation; NO IMO compliance claim)*
- **Installed Electric Propulsion:** ${c.motorKwTotal} kW twin PMSM pods
- **Battery Storage (ESS):** ${c.batteryKwh} kWh LiFePO4
- **Sprint Speed:** ${c.sprintSpeedKnots} knots
- **Patrol Endurance @ 14kt Cruise:** **${c.enduranceHours} hours** *(illustrative scenario only; mission requirement unconfirmed)*
- **Total Operational Range:** ${c.rangeNm} nautical miles

---

## 2. Multi-Sea-State Dynamics & Survivability (Sea States 1 - 5)
| Sea State | Wave Height (Hs) | Sprint/Transit Speed | Vertical Accel (a_cg) | Slamming Hazard | Roll Period (T_phi) | Deck Wetness Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${c.seaStates.map(s => `| **SS ${s.seaState}** (${s.description}) | ${s.significantWaveHeightM} m | ${s.seaState <= 2 ? c.sprintSpeedKnots : s.seaState === 3 ? 14 : s.seaState === 4 ? 10 : 6} kt | ${s.verticalAccelG} g | ${s.slammingRisk} | ${s.naturalRollPeriodSec} s | ${s.deckWetnessProbabilityPercent}% |`).join('\n')}

---

## 3. Local finite-difference influence — NOT Sobol/validated sensitivities
These heuristic sensitivity indicators are unvalidated and do not establish robustness:
${c.localSensitivities.map(s => `- **${s.displayName}**: +${s.inputPerturbationPercent}% input => ${s.targetChangePercent === null ? 'NOT AVAILABLE' : s.targetChangePercent + '%'} output change (legacy local model)\n  *Target:* ${s.primaryTarget}\n  *Limitations:* ${s.architecturalGuidance}`).join('\n')}

---

## 4. Synthetic Input Screening Matrix — NOT Real Agent Execution
| Agent ID | Discipline | Vote | Evaluated Criterion | Engineering Justification |
| :--- | :--- | :--- | :--- | :--- |
${c.scenarioRuleChecks.map(a => `| **${a.agentId}** | ${a.name} | **${a.vote}** | ${a.metric} | ${a.rationale} |`).join('\n')}

---

## 5. Architectural Trade-Offs — SOURCE EVIDENCE MISSING
No validated monohull/catamaran comparative resistance curves, stability curves, deck arrangements, structural weights, model tests or shipyard cost quotations are attached. No superiority or cost percentages may be asserted. See source-identified agent research and independent concept-selection gates before issuing a recommendation.

---

## 6. Heuristic Rules Ledger — NOT Validated Invariants
No externally established invariant is registered. Synthetic rule thresholds must not be treated as approved source evidence:
${this.learnedInvariants.map(inv => `### [${inv.id}] Discovered at Generation #${inv.discoveredAtGeneration} by ${inv.agentId} (${inv.category})
- **Rule:** ${inv.ruleStatement}
- **Proof:** \`${inv.mathEvidence}\``).join('\n\n')}

---

## 7. Senior Leadership Red Team Cross-Examination
${this.generateRedTeamChallenge().map((q, idx) => `### Question ${idx + 1}: ${q.question}
**Scrutiny Category:** ${q.skepticismCategory}
**Vulnerability Audited:** ${q.candidateVulnerability}
**Unverified Heuristic Defense:** ${q.engineeringDefense}
**Screening Formula (not validated):** \`${q.verifiedMath}\``).join('\n\n')}

---
*Illustrative deterministic scenario only. NOT certified, NOT independently verified, NOT ISO 12215 or IMO-compliant evidence. Project Lead concept selection requires an evidence-backed multi-agent trade review; safety release requires qualified engineering approvals.*
`;
  }
}
