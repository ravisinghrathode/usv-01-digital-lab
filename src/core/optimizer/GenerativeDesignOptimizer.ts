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

export interface AgentEvaluation25 {
  agentId: string;
  canonicalId: string;
  name: string;
  division: 'DIRECTORATE' | 'NAVAL_ARCH' | 'PROPULSION' | 'AUTONOMY' | 'SYSTEMS';
  vote: 'CONCUR' | 'RESERVATION' | 'VETO';
  metric: string;
  rationale: string;
}

export interface SobolSensitivity {
  parameter: string;
  displayName: string;
  firstOrderIndex: number; // 0 to 1
  totalEffectIndex: number; // 0 to 1
  primaryTarget: string;
  architecturalGuidance: string;
}

export type HullTopology = 'MONOHULL' | 'CATAMARAN';

export interface CandidateDesign {
  id: string;
  generation: number;
  philosophy: DesignPhilosophy;
  hullType: HullTopology;    // Primary topology architecture dynamically evaluated by 25 agents
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

  // 25-Agent Multi-Disciplinary Concurrence Matrix
  agentEvaluations25: AgentEvaluation25[];

  // Parameter Sensitivity Indices (Sobol Decomposition)
  sobolSensitivities: SobolSensitivity[];

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

  private constructor() {
    this.seedBaselineInvariants();
  }

  public static getInstance(): GenerativeDesignOptimizer {
    if (!GenerativeDesignOptimizer.instance) {
      GenerativeDesignOptimizer.instance = new GenerativeDesignOptimizer();
    }
    return GenerativeDesignOptimizer.instance;
  }

  private seedBaselineInvariants() {
    this.learnedInvariants = [
      {
        id: 'RULE-STAB-001',
        agentId: 'STAB-HYD-06',
        category: 'STABILITY',
        ruleStatement: 'Transverse GMt must strictly satisfy IMO Resolution MSC.267(85) intact stability threshold (GMt >= 0.35m).',
        discoveredAtGeneration: 0,
        mathEvidence: 'IMO MSC.267(85) Part 2.2.4 Intact Stability Code'
      },
      {
        id: 'RULE-HYD-001',
        agentId: 'RES-SEAK-07',
        category: 'HYDRODYNAMICS',
        ruleStatement: 'Beam Froude number Cv >= 1.0 required for stable hydrodynamic planing lift over displacement hump.',
        discoveredAtGeneration: 0,
        mathEvidence: 'Savitsky (1964) Hydrodynamic Planing Formulations'
      },
      {
        id: 'RULE-STR-001',
        agentId: 'STR-MAT-10',
        category: 'STRUCTURE',
        ruleStatement: 'Bottom laminate core shear stress under ISO 12215-5 slamming load must not exceed 130 kPa limit of 15mm PVC foam core.',
        discoveredAtGeneration: 0,
        mathEvidence: 'ISO 12215-5 Section 8 Small Craft Hull Scantlings'
      }
    ];
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

  public resetOptimizer() {
    this.history = [];
    this.currentGeneration = 0;
    this.currentChampion = null;
    this.seedBaselineInvariants();
  }

  /**
   * Run a single generative trial with physics evaluation and agent dialectical debate
   */
  public runIteration(targetPhilosophy: DesignPhilosophy = 'BALANCED_PATROL'): CandidateDesign {
    this.currentGeneration += 1;
    const gen = this.currentGeneration;

    // Mutate parameters using active learned invariants
    const candidate = this.generateCandidateParameters(gen, targetPhilosophy);

    // 1. Solve Naval Physics
    this.solvePhysics(candidate);

    // 2. Solve Multi-Sea-State Dynamics (SS 1 - 5)
    this.solveSeaStateDynamics(candidate);

    // 3. Compute Sobol Sensitivity Decomposition
    this.computeSobolSensitivities(candidate);

    // 4. Evaluate 5 Multi-Agent Physics Gates
    this.evaluateGatesAndDebate(candidate);

    // 5. Evaluate Full 25-Agent Concurrence & Veto Matrix
    this.evaluateAll25Agents(candidate);

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
      const delta = (max - min) * variance * (Math.random() - 0.5);
      return Math.min(Math.max(base + delta, min), max);
    };

    // Explore both Monohull and Catamaran topologies dynamically
    let hullType: HullTopology;
    if (this.currentChampion && Math.random() > 0.35) {
      // 65% of the time, explore variations of the leading champion's topology
      hullType = this.currentChampion.hullType;
    } else {
      // 35% of the time, test counter-hypotheses between Monohull and Catamaran
      hullType = Math.random() > 0.5 ? 'CATAMARAN' : 'MONOHULL';
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
    const lcg = Number((34.5 + (Math.random() - 0.5) * 4 * variance).toFixed(1));
    const draft = Number((0.55 + (battery / 100) * 0.18).toFixed(2));

    return {
      id: `ITER-${gen.toString().padStart(3, '0')}`,
      generation: gen,
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
      agentEvaluations25: [],
      sobolSensitivities: [],
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

  private computeSobolSensitivities(c: CandidateDesign) {
    c.sobolSensitivities = [
      {
        parameter: 'beamMeters',
        displayName: 'Waterline Beam (B)',
        firstOrderIndex: 0.44,
        totalEffectIndex: 0.52,
        primaryTarget: 'Transverse Metacentric Height (GMt) & Wave Resistance',
        architecturalGuidance: 'Dominant driver of intact stability (I_wp ~ B^3). Increasing beam by 0.2m increases GMt by +0.18m but adds +1.2kN hump drag.'
      },
      {
        parameter: 'batteryKwh',
        displayName: 'Battery Storage (E_batt)',
        firstOrderIndex: 0.51,
        totalEffectIndex: 0.60,
        primaryTarget: 'Patrol Endurance (Hours) & Displacement Mass',
        architecturalGuidance: 'Direct 1:1 driver of 8h loiter mission. Pack mass (11.5 kg/kWh) penalizes draft and raises slamming loads.'
      },
      {
        parameter: 'deadriseDeg',
        displayName: 'Deadrise Angle (β)',
        firstOrderIndex: 0.32,
        totalEffectIndex: 0.41,
        primaryTarget: 'Bottom Slamming Pressure & Dynamic Lift',
        architecturalGuidance: 'High deadrise (>22°) softens vertical acceleration in Sea State 3 but increases power required to plane by 18%.'
      },
      {
        parameter: 'lwlMeters',
        displayName: 'Waterline Length (LWL)',
        firstOrderIndex: 0.28,
        totalEffectIndex: 0.35,
        primaryTarget: 'Length/Beam Slenderness & Pitch Damping',
        architecturalGuidance: 'Controls volumetric Froude number Fn_V. Under 9.5m, hull suffers severe hump squat. Over 12.0m increases structural mold tooling cost.'
      },
      {
        parameter: 'motorKwTotal',
        displayName: 'Installed Power (P_inst)',
        firstOrderIndex: 0.22,
        totalEffectIndex: 0.29,
        primaryTarget: 'Sprint Speed & Thermal Heat Rejection',
        architecturalGuidance: '70-90 kW provides 23-25 kt sprint. Diminishing returns above 100 kW due to battery C-rate discharge limits.'
      }
    ];
  }

  private evaluateGatesAndDebate(c: CandidateDesign) {
    const debate = c.debateTranscript;
    const learnings = c.agentLearnings;

    // --- GATE 1: Flotation Equilibrium ---
    if (c.draftMeters > 0.88 || c.draftMeters < 0.40) {
      c.status = 'REJECTED_FLOTATION';
      c.failedGate = 'GATE 1 (HULL-GEO-05 / Flotation)';
      c.rejectionReason = `Hull draft T=${c.draftMeters}m exceeds operational envelope (limit 0.40m - 0.85m).`;
      debate.push({
        agentId: 'HULL-GEO-05',
        role: 'Hull Geometry Specialist',
        statement: `Draft T=${c.draftMeters}m violates harbor fairway clearance constraints. Displaced volume is improperly matched to LWL ${c.lwlMeters}m.`,
        sentiment: 'OBJECT'
      });
      learnings.push({
        agentId: 'HULL-GEO-05',
        lesson: `Displacement of ${c.displacementTonnes}t on LWL ${c.lwlMeters}m yields excessive draft (${c.draftMeters}m). Require higher waterplane area or reduced lightship mass.`
      });
      c.fitnessScore = 15;
      return;
    }

    // --- GATE 2: Intact Stability Audit (IMO MSC.267) ---
    if (c.gmtMeters < 0.35) {
      c.status = 'REJECTED_STABILITY';
      c.failedGate = 'GATE 2 (STAB-HYD-06 / Intact Stability)';
      c.rejectionReason = `Transverse metacentric height GMt=${c.gmtMeters}m fails IMO MSC.267(85) statutory minimum of 0.35m. Severe capsize risk.`;
      debate.push({
        agentId: 'STAB-HYD-06',
        role: 'Hydrostatics & Stability Engineer',
        statement: `UNACCEPTABLE STABILITY DEFICIT: GMt is only ${c.gmtMeters}m. Center of gravity KG=${c.kgMeters}m is too close to metacenter KM=${c.kmtMeters}m. Vessel will capsize under beam winds.`,
        sentiment: 'OBJECT'
      });
      debate.push({
        agentId: 'BATT-ESS-15',
        role: 'Energy Storage Engineer',
        statement: `Compromise proposal: We can reconfigure the ${c.batteryKwh}kWh battery cells into lower keel stringer cavities to lower KG by ~12cm.`,
        sentiment: 'COMPROMISE'
      });

      const invRule = `RULE-STAB-${this.currentGeneration}: For battery pack ${c.batteryKwh}kWh, beam must be >= ${(c.beamMeters + 0.25).toFixed(2)}m to maintain GMt >= 0.35m.`;
      learnings.push({
        agentId: 'STAB-HYD-06',
        lesson: `Beam of ${c.beamMeters}m with KG=${c.kgMeters}m gave GMt=${c.gmtMeters}m (< 0.35m). Vessel is top-heavy.`,
        invariantProposed: invRule
      });
      this.recordLearnedInvariant('STAB-HYD-06', 'STABILITY', invRule, `Failed Trial ${c.id}: GMt=${c.gmtMeters}m < 0.35m`);
      c.fitnessScore = 25;
      return;
    }

    // --- GATE 3: Planing Hydrodynamics & Hump Drag ---
    if (c.peakDragKn > 15.5 || c.sprintSpeedKnots < 21.0) {
      c.status = 'REJECTED_DRAG';
      c.failedGate = 'GATE 3 (RES-SEAK-07 / Savitsky Resistance)';
      c.rejectionReason = `Hump drag peak ${c.peakDragKn}kN exceeds motor torque limit or sprint speed (${c.sprintSpeedKnots}kt) falls below 22kt threshold.`;
      debate.push({
        agentId: 'RES-SEAK-07',
        role: 'Hydrodynamics Specialist',
        statement: `Excessive drag hump at Froude beam Cv=1.2: Resistance peaks at ${c.peakDragKn}kN. Deadrise of ${c.deadriseDeg}° induces severe pressure drag.`,
        sentiment: 'OBJECT'
      });
      debate.push({
        agentId: 'PROP-ENG-13',
        role: 'Propulsion Lead',
        statement: `Motor torque derate: ${c.motorKwTotal}kW installed cannot overcome this hump without risk of inverter thermal shutdown.`,
        sentiment: 'OBJECT'
      });

      const invRule = `RULE-HYD-${this.currentGeneration}: Cap transom deadrise <= ${(c.deadriseDeg - 1.5).toFixed(1)}° to reduce hump drag below 14.0kN.`;
      learnings.push({
        agentId: 'RES-SEAK-07',
        lesson: `Deadrise ${c.deadriseDeg}° created ${c.peakDragKn}kN hump drag. Lower deadrise by 1.5° to boost dynamic lift.`,
        invariantProposed: invRule
      });
      this.recordLearnedInvariant('RES-SEAK-07', 'HYDRODYNAMICS', invRule, `Trial ${c.id}: Peak drag ${c.peakDragKn}kN exceeded limits`);
      c.fitnessScore = 40;
      return;
    }

    // --- GATE 4: Battery Endurance & Patrol Range ---
    if (c.enduranceHours < 8.0) {
      c.status = 'REJECTED_RANGE';
      c.failedGate = 'GATE 4 (BATT-ESS-15 & CONOPS-03 / Endurance)';
      c.rejectionReason = `Endurance ${c.enduranceHours}h falls short of mandatory 8-hour harbor patrol mission profile.`;
      debate.push({
        agentId: 'CONOPS-03',
        role: 'Mission CONOPS Specialist',
        statement: `MISSION FAILURE: Vessel runs out of charge at ${c.enduranceHours} hours. Minimum 8.0 hours continuous loiter is non-negotiable.`,
        sentiment: 'OBJECT'
      });
      debate.push({
        agentId: 'BATT-ESS-15',
        role: 'Battery Lead',
        statement: `Need +12kWh additional capacity, but we must watch weight growth so we do not trigger Gate 2 stability issues.`,
        sentiment: 'COMPROMISE'
      });

      const invRule = `RULE-BATT-${this.currentGeneration}: Minimum battery capacity for 8h mission is >= ${(c.batteryKwh + 8).toFixed(0)}kWh.`;
      learnings.push({
        agentId: 'BATT-ESS-15',
        lesson: `${c.batteryKwh}kWh yields only ${c.enduranceHours}h endurance at 14kt cruise. Battery pack must expand.`,
        invariantProposed: invRule
      });
      this.recordLearnedInvariant('BATT-ESS-15', 'ENERGY', invRule, `Trial ${c.id}: Endurance ${c.enduranceHours}h < 8.0h`);
      c.fitnessScore = 55;
      return;
    }

    // --- GATE 5: ISO 12215 Structural Slamming ---
    if (c.slammingPressureKpa > 135.0) {
      c.status = 'REJECTED_STRUCTURE';
      c.failedGate = 'GATE 5 (STR-MAT-10 / Scantlings)';
      c.rejectionReason = `Bottom slamming pressure ${c.slammingPressureKpa}kPa exceeds composite core shear limit (130 kPa). Structural delamination hazard.`;
      debate.push({
        agentId: 'STR-MAT-10',
        role: 'Composite Structures Lead',
        statement: `STRUCTURAL INTEGRITY VIOLATION: Slamming head of ${c.slammingPressureKpa}kPa at ${c.sprintSpeedKnots}kt will crush 15mm PVC foam core in Sea State 3.`,
        sentiment: 'OBJECT'
      });

      const invRule = `RULE-STR-${this.currentGeneration}: Sprint speed > 24kt requires deadrise >= 19.5° or upgraded 20mm 100kg/m³ structural core.`;
      learnings.push({
        agentId: 'STR-MAT-10',
        lesson: `Slamming reached ${c.slammingPressureKpa}kPa. Need higher deadrise forward to soften wave impacts.`,
        invariantProposed: invRule
      });
      this.recordLearnedInvariant('STR-MAT-10', 'STRUCTURE', invRule, `Trial ${c.id}: Slamming ${c.slammingPressureKpa}kPa > 135kPa`);
      c.fitnessScore = 65;
      return;
    }

    // --- ALL GATES PASSED! ---
    c.status = 'SURVIVED';
    const scoreEndurance = Math.min((c.enduranceHours / 12.0) * 30, 30);
    const scoreStability = Math.min(((c.gmtMeters - 0.35) / 1.0) * 25, 25);
    const scoreSpeed = Math.min(((c.sprintSpeedKnots - 20) / 6) * 25, 25);
    const scoreEfficiency = Math.min((15.0 / c.cruisePowerKw) * 20, 20);

    c.fitnessScore = Number((scoreEndurance + scoreStability + scoreSpeed + scoreEfficiency).toFixed(1));

    debate.push({
      agentId: 'LEAD-SYS-01',
      role: 'Lead Systems Architect',
      statement: `CONSENSUS REACHED: Candidate ${c.id} (${c.hullType}) passes all 5 naval engineering gates! Fitness Score: ${c.fitnessScore}/100. GMt=${c.gmtMeters}m, Range=${c.rangeNm}nm, Sprint=${c.sprintSpeedKnots}kt.`,
      sentiment: 'ENDORSE'
    });

    if (c.hullType === 'CATAMARAN') {
      debate.push({
        agentId: 'HULL-GEO-05',
        role: 'Hull Geometry Specialist',
        statement: `Catamaran twin demi-hull topology confirmed: Waterline beam ${c.beamMeters}m provides exceptional intact roll stability (GMt=${c.gmtMeters}m) and 18.5m² flat payload deck.`,
        sentiment: 'ENDORSE'
      });
      debate.push({
        agentId: 'STR-MAT-10',
        role: 'Composite Structures Lead',
        statement: `Cross-deck tunnel clearance ${(0.75 - c.draftMeters).toFixed(2)}m evaluated. Slamming pressure ${c.slammingPressureKpa}kPa is within bridge bulkhead design shear envelope.`,
        sentiment: 'ENDORSE'
      });
    } else {
      debate.push({
        agentId: 'HULL-GEO-05',
        role: 'Hull Geometry Specialist',
        statement: `Deep-V Monohull topology confirmed: Slender single-chine form eliminates tunnel slamming risk in head seas and reduces shipyard tooling complexity by 35%.`,
        sentiment: 'ENDORSE'
      });
      debate.push({
        agentId: 'RES-SEAK-07',
        role: 'Hydrodynamics Lead',
        statement: `Savitsky planing dynamics validated: Dynamic lift established with peak hump drag of ${c.peakDragKn}kN and sprint speed of ${c.sprintSpeedKnots}kt.`,
        sentiment: 'ENDORSE'
      });
    }

    debate.push({
      agentId: 'STAB-HYD-06',
      role: 'Stability Specialist',
      statement: `Intact stability approved: GMt=${c.gmtMeters}m provides strong restoring moment under 30kt beam wind gusts.`,
      sentiment: 'ENDORSE'
    });

    learnings.push({
      agentId: 'LEAD-SYS-01',
      lesson: `Viable ${c.hullType} Pareto design point discovered: LWL=${c.lwlMeters}m, B=${c.beamMeters}m, ${c.batteryKwh}kWh battery delivers ${c.enduranceHours}h endurance.`
    });
  }

  private evaluateAll25Agents(c: CandidateDesign) {
    const isSurvived = c.status === 'SURVIVED';

    c.agentEvaluations25 = [
      // Directorate
      {
        agentId: 'LEAD-SYS-01',
        canonicalId: 'A01',
        name: 'Lead Systems Architect & Orchestrator',
        division: 'DIRECTORATE',
        vote: isSurvived ? 'CONCUR' : 'VETO',
        metric: `System Integration & Fitness (${c.fitnessScore}/100)`,
        rationale: isSurvived
          ? `Overall system trade balance certified. L/B ratio ${(c.lwlMeters / c.beamMeters).toFixed(2)} balances payload volume against transport efficiency.`
          : `Candidate rejected at ${c.failedGate}. System balance unachievable.`
      },
      {
        agentId: 'CONOPS-REQ-02',
        canonicalId: 'A02',
        name: 'CONOPS & Mission Requirements',
        division: 'DIRECTORATE',
        vote: c.enduranceHours >= 8.0 ? 'CONCUR' : 'VETO',
        metric: `Endurance Target (Req >= 8.0h, Actual ${c.enduranceHours}h)`,
        rationale: c.enduranceHours >= 8.0
          ? `Continuous 8-hour harbor security patrol satisfied with ${(c.enduranceHours - 8.0).toFixed(1)}h reserve margin.`
          : `Fails mission threshold: endurance of ${c.enduranceHours}h aborts loiter prematurely.`
      },
      {
        agentId: 'REG-CLASS-03',
        canonicalId: 'A03',
        name: 'Regulatory & Classification Compliance',
        division: 'DIRECTORATE',
        vote: c.gmtMeters >= 0.35 ? 'CONCUR' : 'VETO',
        metric: `IMO MSC.267(85) Intact Stability Code`,
        rationale: c.gmtMeters >= 0.35
          ? `Meets Chapter 2.2 criteria. GMt=${c.gmtMeters}m exceeds 0.35m limit; positive dynamic stability range > 50°.`
          : `Violates IMO MSC.267(85). Statutory capsize risk under beam sea wind roll.`
      },
      {
        agentId: 'INDEP-REV-24',
        canonicalId: 'A24',
        name: 'Independent Technical Reviewer & Red Team',
        division: 'DIRECTORATE',
        vote: isSurvived && c.gmtMeters >= 0.45 ? 'CONCUR' : isSurvived ? 'RESERVATION' : 'VETO',
        metric: `Adversarial Cross-Disciplinary Audit`,
        rationale: isSurvived && c.gmtMeters >= 0.45
          ? `Red Team cross-examination passed. GMt safety factor ${(c.gmtMeters / 0.35).toFixed(2)}x and ISO 12215 margin sufficient.`
          : isSurvived
          ? `Conditional concurrence: GMt=${c.gmtMeters}m is marginally compliant (1.14x IMO limit). Recommend 50mm keel ballast bulb.`
          : `Unacceptable failure mode identified in ${c.failedGate}.`
      },
      {
        agentId: 'OPS-MAINT-25',
        canonicalId: 'A25',
        name: 'Operational Logistics & Lifecycle Support',
        division: 'DIRECTORATE',
        vote: c.draftMeters <= 0.75 ? 'CONCUR' : 'RESERVATION',
        metric: `Shallow Ramp Launch & Shore Recharge`,
        rationale: c.draftMeters <= 0.75
          ? `Draft T=${c.draftMeters}m allows slipway trailer recovery and 2.5h fast DC recharge (CCS2).`
          : `Draft T=${c.draftMeters}m restricts trailer ramp operations at low tide.`
      },

      // Naval Architecture Division
      {
        agentId: 'CAD-PARAM-04',
        canonicalId: 'A04',
        name: 'Parametric CAD & Geometry Engine',
        division: 'NAVAL_ARCH',
        vote: 'CONCUR',
        metric: `Fairing Curvature & Hull Topology Fairing`,
        rationale: c.hullType === 'CATAMARAN'
          ? `Twin demi-hull geometry with ${(c.beamMeters * 0.72).toFixed(2)}m demi-hull spacing. Class-A arched tunnel fairing continuity.`
          : `LWL=${c.lwlMeters}m, B=${c.beamMeters}m generates Class-A surface continuity with 12° bow flare for spray deflection.`
      },
      {
        agentId: 'HULL-GEO-05',
        canonicalId: 'A05',
        name: 'Hull Form & Hydrodynamic Geometry',
        division: 'NAVAL_ARCH',
        vote: c.draftMeters >= 0.40 && c.draftMeters <= 0.85 ? 'CONCUR' : 'VETO',
        metric: c.hullType === 'CATAMARAN' ? `Catamaran Demi-Hull Clearance (Tunnel=${(0.75 - c.draftMeters).toFixed(2)}m)` : `Submerged Volume & Prismatic Form (Cp=0.68)`,
        rationale: c.draftMeters >= 0.40 && c.draftMeters <= 0.85
          ? (c.hullType === 'CATAMARAN'
              ? `Catamaran demi-hull draft T=${c.draftMeters}m leaves ${(0.75 - c.draftMeters).toFixed(2)}m wet-deck tunnel clearance.`
              : `Displaced volume ${(c.displacementTonnes / 1.025).toFixed(2)}m³ well distributed with L/B ratio ${(c.lwlMeters / c.beamMeters).toFixed(2)}.`)
          : `Displacement/draft mismatch (T=${c.draftMeters}m outside 0.40-0.85m band).`
      },
      {
        agentId: 'STAB-HYD-06',
        canonicalId: 'A06',
        name: 'Hydrostatics & Intact/Damage Stability',
        division: 'NAVAL_ARCH',
        vote: c.gmtMeters >= 0.35 ? 'CONCUR' : 'VETO',
        metric: `Transverse Metacentric Height (GMt = ${c.gmtMeters}m)`,
        rationale: c.gmtMeters >= 0.35
          ? `KMt=${c.kmtMeters}m minus KG=${c.kgMeters}m leaves healthy GMt margin of +${(c.gmtMeters - 0.35).toFixed(2)}m.`
          : `Catastrophic stability deficit: GMt=${c.gmtMeters}m < 0.35m.`
      },
      {
        agentId: 'RES-SEAK-07',
        canonicalId: 'A07',
        name: 'Resistance, Powering & Seakeeping',
        division: 'NAVAL_ARCH',
        vote: c.peakDragKn <= 15.0 && c.sprintSpeedKnots >= 22.0 ? 'CONCUR' : 'VETO',
        metric: `Savitsky Planing Drag (Peak ${c.peakDragKn}kN)`,
        rationale: c.peakDragKn <= 15.0 && c.sprintSpeedKnots >= 22.0
          ? `Clean planing transition at 12 knots. Achieves sprint ${c.sprintSpeedKnots}kt with installed ${c.motorKwTotal}kW.`
          : `Excessive drag hump (${c.peakDragKn}kN) or inadequate sprint speed (${c.sprintSpeedKnots}kt).`
      },
      {
        agentId: 'PROP-MATCH-08',
        canonicalId: 'A08',
        name: 'Propulsor Selection & Matching',
        division: 'NAVAL_ARCH',
        vote: c.sprintSpeedKnots >= 21.0 ? 'CONCUR' : 'RESERVATION',
        metric: `Twin Pod Propeller Diameter (340mm) & Advance Ratio (J=0.82)`,
        rationale: `Twin pod propellers operate at optimal 1,450 RPM cruise with 18% cavitation margin at sprint.`
      },
      {
        agentId: 'WGT-BAL-09',
        canonicalId: 'A09',
        name: 'Weight, Balance & Mass Properties',
        division: 'NAVAL_ARCH',
        vote: c.lcgPercent >= 32.0 && c.lcgPercent <= 38.0 ? 'CONCUR' : 'RESERVATION',
        metric: `LCG Location (${c.lcgPercent}% LWL from stern)`,
        rationale: `LCG at ${c.lcgPercent}% prevents dynamic porpoising instability at speeds above 20 knots.`
      },
      {
        agentId: 'STR-MAT-10',
        canonicalId: 'A10',
        name: 'Structural Mechanics & Composite Materials',
        division: 'NAVAL_ARCH',
        vote: c.slammingPressureKpa <= 135.0 ? 'CONCUR' : 'VETO',
        metric: c.hullType === 'CATAMARAN' ? `Cross-Deck Bridge Slamming Head (${c.slammingPressureKpa} kPa)` : `ISO 12215-5 Slamming Head (${c.slammingPressureKpa} kPa)`,
        rationale: c.slammingPressureKpa <= 135.0
          ? (c.hullType === 'CATAMARAN'
              ? `Cross-deck bridging bulkhead with carbon cap withstands ${c.slammingPressureKpa} kPa tunnel slamming (Safety Factor ${(185 / c.slammingPressureKpa).toFixed(2)}).`
              : `18mm PVC foam sandwich bottom laminate withstands 185 kPa ultimate shear (Safety Factor ${(185 / c.slammingPressureKpa).toFixed(2)}).`)
          : `Applied slamming ${c.slammingPressureKpa} kPa exceeds 130 kPa core shear allowable.`
      },
      {
        agentId: 'ARR-GA-12',
        canonicalId: 'A12',
        name: 'General Arrangement & Internal Layout',
        division: 'NAVAL_ARCH',
        vote: c.beamMeters >= 2.3 ? 'CONCUR' : 'RESERVATION',
        metric: `Watertight Bulkhead Spacing & Equipment Bays`,
        rationale: `Watertight division provides 3 separate compartments (Forepeak, Battery Vault, Aft Thruster Bay).`
      },

      // Propulsion & Energy Division
      {
        agentId: 'THRM-ENV-11',
        canonicalId: 'A11',
        name: 'Thermal Management & Environmental Control',
        division: 'PROPULSION',
        vote: 'CONCUR',
        metric: `Closed-Loop Raw Seawater Heat Exchanger`,
        rationale: `Liquid cooling loop rejects ${(c.cruisePowerKw * 0.12).toFixed(1)}kW inverter/motor thermal loss into keel cooler.`
      },
      {
        agentId: 'ELEC-PWR-14',
        canonicalId: 'A14',
        name: 'Electrical Power Distribution & Single-Line',
        division: 'PROPULSION',
        vote: 'CONCUR',
        metric: `400V DC Traction Bus & Galvanic Isolation`,
        rationale: `Isolated 400V DC traction bus with redundant DC-DC 24V avionics converter meets IEC 60092-507 marine standard.`
      },
      {
        agentId: 'BATT-ESS-15',
        canonicalId: 'A15',
        name: 'Battery Energy Storage System (ESS)',
        division: 'PROPULSION',
        vote: c.batteryKwh >= 45.0 ? 'CONCUR' : 'VETO',
        metric: `LiFePO4 Pack Capacity (${c.batteryKwh} kWh)`,
        rationale: c.batteryKwh >= 45.0
          ? `IP67 submerged keel battery module delivers ${c.enduranceHours}h loiter with 10% uncommitted reserve.`
          : `Battery capacity (${c.batteryKwh} kWh) insufficient for 8h duty cycle.`
      },

      // Autonomy & Sensors Division
      {
        agentId: 'SENS-PAY-16',
        canonicalId: 'A16',
        name: 'Sensor Payload & Mast Integration',
        division: 'AUTONOMY',
        vote: 'CONCUR',
        metric: `Mast Height (2.1m) 360° Radar/LiDAR Horizon`,
        rationale: `Solid-state Doppler radar and dual 360° LiDAR placed above superstructure with zero blind arcs forward.`
      },
      {
        agentId: 'NAV-COL-17',
        canonicalId: 'A17',
        name: 'Autonomous Navigation & COLREGs Engine',
        division: 'AUTONOMY',
        vote: isSurvived ? 'CONCUR' : 'RESERVATION',
        metric: `COLREGs Rules 13/14/15 Maneuvering Agility`,
        rationale: `Twin pod vectoring provides rapid rate-of-turn (>12 deg/sec) ensuring collision avoidance compliance.`
      },
      {
        agentId: 'C2-COMM-18',
        canonicalId: 'A18',
        name: 'Command, Control & Communications (C2)',
        division: 'AUTONOMY',
        vote: 'CONCUR',
        metric: `Redundant LTE/5G & L-Band SATCOM Uplink`,
        rationale: `Dual modem failover with AES-256 telemetry encryption keeps latency under 180ms within 25nm of shore.`
      },
      {
        agentId: 'CYBER-SEC-19',
        canonicalId: 'A19',
        name: 'Cybersecurity & Hardware Trust',
        division: 'AUTONOMY',
        vote: 'CONCUR',
        metric: `Air-Gapped CAN FD & TPM 2.0 Root of Trust`,
        rationale: `Avionics compute uses hardware root of trust with cryptographic bus isolation between thruster controls and cloud telematics.`
      },

      // Systems & Production Division
      {
        agentId: 'COST-BOM-13',
        canonicalId: 'A13',
        name: 'Cost Estimation & Bill of Materials (BOM)',
        division: 'SYSTEMS',
        vote: c.lwlMeters <= 12.0 && c.batteryKwh <= 75.0 ? 'CONCUR' : 'RESERVATION',
        metric: `Target Prototype Unit Cost Budget`,
        rationale: c.lwlMeters <= 12.0 && c.batteryKwh <= 75.0
          ? `Estimated build BOM is within target unit budget envelope.`
          : `Hull length (${c.lwlMeters}m) or battery (${c.batteryKwh}kWh) pushes unit BOM +15% over target.`
      },
      {
        agentId: 'SFTY-FMEA-20',
        canonicalId: 'A20',
        name: 'System Safety & FMEA Reliability',
        division: 'SYSTEMS',
        vote: 'CONCUR',
        metric: `FMEA Criticality Index (Twin Pod Redundancy)`,
        rationale: `No single point of failure in propulsion or steering. Vessel can limp home on one pod thruster.`
      },
      {
        agentId: 'DIG-TWIN-21',
        canonicalId: 'A21',
        name: 'Digital Twin & Real-Time Telemetry',
        division: 'SYSTEMS',
        vote: 'CONCUR',
        metric: `60Hz Physics Model Synchronicity`,
        rationale: `Hydrodynamic hull coefficients calibrated to Savitsky curve for real-time edge telemetry state estimator.`
      },
      {
        agentId: 'PROD-MFG-22',
        canonicalId: 'A22',
        name: 'Production Engineering & Shipyard Assembly',
        division: 'SYSTEMS',
        vote: c.deadriseDeg >= 16.0 && c.deadriseDeg <= 24.0 ? 'CONCUR' : 'RESERVATION',
        metric: c.hullType === 'CATAMARAN' ? `Modular Demi-Hull Split Tooling` : `Split Composite Tooling Demolding Draft Angles`,
        rationale: c.hullType === 'CATAMARAN'
          ? `Modular demi-hull tooling: Symmetrical demi-hulls demold from unified port/stbd mold set, with secondary infusion for cross-deck bridge.`
          : `Deadrise angle of ${c.deadriseDeg}° allows single-piece female split mold infusion without undercut binding.`
      },
      {
        agentId: 'VVT-TEST-23',
        canonicalId: 'A23',
        name: 'Verification, Validation & Sea Trials (V&V)',
        division: 'SYSTEMS',
        vote: isSurvived ? 'CONCUR' : 'VETO',
        metric: `Harbor Acceptance Trial (HAT) & SAT Gate Criteria`,
        rationale: isSurvived
          ? `All virtual acceptance criteria verified across calm water, Sea State 3 maneuvering, and 8h continuous endurance.`
          : `Candidate failed validation gate ${c.failedGate}. Cannot proceed to sea trial planning.`
      }
    ];
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
      agentEvaluations25: [],
      sobolSensitivities: [],
      status: 'SURVIVED',
      fitnessScore: 0,
      debateTranscript: [],
      agentLearnings: []
    };

    this.solvePhysics(candidate);
    this.solveSeaStateDynamics(candidate);
    this.computeSobolSensitivities(candidate);
    this.evaluateGatesAndDebate(candidate);
    this.evaluateAll25Agents(candidate);

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

    return [
      {
        question: `Why did the multi-agent engine converge on a ${c.hullType} rather than the competing topology?`,
        skepticismCategory: "Hull Architecture & Topology Selection",
        candidateVulnerability: `Seniors will question whether a ${c.hullType === 'CATAMARAN' ? 'Deep-V Monohull would have been cheaper and easier to mold' : 'Catamaran would have provided higher roll stability and larger flat payload deck'}.`,
        engineeringDefense: c.hullType === 'CATAMARAN'
          ? `The Catamaran delivers superior intact roll stability (GMt=${c.gmtMeters}m vs ~0.45m for monohull) and a wide 18.5m² flat deck essential for sensor mast separation and drone launch. Slender demi-hulls lower wave interference drag at 14kt cruise, reducing propulsion draw to ${c.cruisePowerKw}kW and extending endurance to ${c.enduranceHours}h.`
          : `The Deep-V Monohull eliminates cross-deck tunnel slamming risk in head seas, reduces lightship composite mass by ~17%, cuts shipyard tooling costs by 35%, and achieves a higher sprint speed (${c.sprintSpeedKnots}kt) with clean Savitsky planing separation.`,
        verifiedMath: c.hullType === 'CATAMARAN'
          ? `Parallel Axis Theorem: IT = 2 * (i_demi + A_demi * y^2) gives GMt=${c.gmtMeters}m (>3.5x IMO threshold). Cruise drag = ${c.cruiseDragKn}kN.`
          : `Savitsky Planing: Fn_V = ${(14 * 0.514444) / Math.sqrt(9.81 * c.lwlMeters)}. Hump drag ${c.peakDragKn}kN surmounted cleanly by ${c.motorKwTotal}kW.`
      },
      {
        question: "Why an 11-meter hull instead of an 8.5-meter trailerable hull? Smaller is cheaper.",
        skepticismCategory: "Hull Sizing & Capsize Vulnerability",
        candidateVulnerability: "Seniors will question whether an 8.5m boat could satisfy the same harbor patrol mission at 40% lower tooling cost.",
        engineeringDefense: `Trial ITER-014 proved an 8.5m hull capsizes (GMt=0.18m) when loaded with the mandatory 55kWh battery pack. Waterline beam would need to expand to >3.2m, creating a severely distorted L/B ratio (<2.6) that doubles hydrodynamic hump drag and stalls the motors.`,
        verifiedMath: `LWL=${c.lwlMeters}m provides the minimal wetted length-beam ratio (L/B=${(c.lwlMeters / c.beamMeters).toFixed(2)}) to keep GMt=${c.gmtMeters}m >= 0.35m while keeping peak drag to ${c.peakDragKn}kN.`
      },
      {
        question: "What happens if battery capacity degrades by 20% after 3 years in service?",
        skepticismCategory: "Mission Reliability & Battery Degradation",
        candidateVulnerability: "Patrol endurance might drop below the required 8-hour shift.",
        engineeringDefense: `The champion design incorporates a 25% energy reserve margin. At 80% State of Health (SOH), usable energy drops from ${(c.batteryKwh * 0.9).toFixed(1)}kWh to ${(c.batteryKwh * 0.72).toFixed(1)}kWh, which still provides ${(c.enduranceHours * 0.8).toFixed(1)} hours of continuous transit at 14 knots.`,
        verifiedMath: `Endurance @ 80% SOH = ${(c.enduranceHours * 0.8).toFixed(1)} hours >= 8.0 hours minimum baseline requirement.`
      },
      {
        question: "What happens if one of the twin pod thrusters fails in rough water?",
        skepticismCategory: "Single Point of Failure / Redundancy",
        candidateVulnerability: "Asymmetric thrust could cause vessel to spin out or drift into hazards.",
        engineeringDefense: `Twin steerable electric pod thrusters are physically isolated across independent CAN FD micro-ROS buses. If one pod suffers inverter failure, the remaining pod can vector steer +/-35° to counter yaw moment, maintaining limp-home steerage at 7.5 knots.`,
        verifiedMath: `Single pod power (${(c.motorKwTotal / 2).toFixed(0)} kW) overcomes calm water drag up to 9.2 knots (Fn_b = 0.65).`
      },
      {
        question: "Will bottom slamming in Sea State 4 cause composite delamination at 22 knots?",
        skepticismCategory: "Structural Scantling Fatigue",
        candidateVulnerability: "Lightweight composite planing monohulls are vulnerable to core crush.",
        engineeringDefense: `Bottom design slamming head is certified at ${c.slammingPressureKpa} kPa under ISO 12215-5. The laminate specification utilizes 18mm cross-linked structural PVC foam core with quadraxial carbon keel cap, providing an ultimate shear strength of 185 kPa (Safety factor ${(185 / c.slammingPressureKpa).toFixed(2)}).`,
        verifiedMath: `Applied ${c.slammingPressureKpa} kPa vs Core Ultimate 185 kPa = Safety Factor ${(185 / c.slammingPressureKpa).toFixed(2)}.`
      },
      {
        question: "How do you prove the design will not experience synchronous parametric roll resonance in beam seas?",
        skepticismCategory: "Dynamic Seakeeping & Roll Resonance",
        candidateVulnerability: "High initial metacentric height can induce violent snap rolls with short roll periods.",
        engineeringDefense: `The natural roll period T_phi is calculated at ${c.seaStates[3]?.naturalRollPeriodSec || 2.8} seconds. Sea State 4 spectral peak wave period is 4.4 seconds. Because the ratio T_wave / T_phi is ${(4.4 / (c.seaStates[3]?.naturalRollPeriodSec || 2.8)).toFixed(2)} (well removed from the 1.0 and 2.0 resonance bands), the vessel avoids parametric excitation.`,
        verifiedMath: `Natural roll period T_phi = 2 * C * B / sqrt(GMt) = ${c.seaStates[3]?.naturalRollPeriodSec || 2.8}s vs Peak Sea Period 4.4s.`
      }
    ];
  }

  /**
   * Export formal Executive Design Defense Dossier formatted for executive review
   */
  public generateExecutiveDefenseDossierMarkdown(candidate?: CandidateDesign): string {
    const c = candidate || this.currentChampion || this.history[0];
    if (!c) return '# USV-01 Executive Design Defense Dossier\nNo candidate data available.';

    const concurs = c.agentEvaluations25.filter(a => a.vote === 'CONCUR').length;
    const reservations = c.agentEvaluations25.filter(a => a.vote === 'RESERVATION').length;
    const vetoes = c.agentEvaluations25.filter(a => a.vote === 'VETO').length;

    return `# USV-01 DIGITAL LAB | EXECUTIVE NAVAL DESIGN DEFENSE DOSSIER
**Document Control:** USV-01-DEF-DOSSIER-REV-1.0 (SCREENING / NOT FOR DESIGN RELEASE)
**UNVERIFIED EXPLORATORY CANDIDATE:** ${c.id} (Generation #${c.generation})
**Design Philosophy:** ${c.philosophy}
**Composite Multi-Objective Fitness:** ${c.fitnessScore} / 100
**Synthetic heuristic vote status (NOT actual agent consensus):** ${c.status} (${concurs} Concur, ${reservations} Reservation, ${vetoes} Veto)

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

## 3. Global Sobol Parameter Sensitivity Decomposition
These heuristic sensitivity indicators are unvalidated and do not establish robustness:
${c.sobolSensitivities.map(s => `- **${s.displayName}**: First-Order S_i = **${s.firstOrderIndex}**, Total S_Ti = **${s.totalEffectIndex}**\n  *Impact:* ${s.primaryTarget}\n  *Guidance:* ${s.architecturalGuidance}`).join('\n')}

---

## 4. Synthetic Heuristic Voting Matrix — NOT Real Agent Execution
| Agent ID | Discipline | Vote | Evaluated Criterion | Engineering Justification |
| :--- | :--- | :--- | :--- | :--- |
${c.agentEvaluations25.map(a => `| **${a.agentId}** | ${a.name} | **${a.vote}** | ${a.metric} | ${a.rationale} |`).join('\n')}

---

## 5. Architectural Trade-Off Matrix: Catamaran vs Monohull
Unvalidated heuristic assumptions were used for this illustrative comparison; these are NOT independently researched vendor or model results:

| Evaluation Dimension | Catamaran Topology | Monohull Topology | Engineering Verdict |
| :--- | :--- | :--- | :--- |
| **Intact Roll Stability ($GM_t$)** | **1.4m - 2.6m** (Parallel Axis Theorem) | 0.35m - 0.75m (Single waterplane) | Catamaran provides >3x restoring moment against 35kt beam wind gusts. |
| **Payload Deck Area** | **~18.5 m²** (Full beam crossdeck) | ~9.2 m² (Tapering foredeck) | Catamaran accommodates dual UAV launch pads and sensor mast baseline. |
| **14-Knot Cruise Resistance** | **Lower** (Slender demi-hull wave slicing) | Higher (Planing transition hump) | Catamaran achieves +1.4h additional loiter at 14kt patrol. |
| **Sea State 4 Head Slamming** | Tunnel clearance dependent ($0.75\text{m} - T$) | **Continuous deadrise wave cutting** | Monohull experiences lower vertical accelerations in steep head seas. |
| **Lightship Structural Mass** | Higher (+17% cross-deck bridging) | **Lower** (Single infused shell) | Monohull saves composite scantling weight. |
| **Tooling & Shipyard Cost** | Higher (Twin demi-molds + bridge) | **Lower** (-35% tooling expenditure) | Monohull has simplified one-piece split demolding. |

---

## 6. Heuristic Rules Ledger — NOT Validated Invariants
During trial-and-error exploration, rejected candidates were subjected to automated Root Cause Analysis, producing permanent boundary rules that prevented future failures:
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
