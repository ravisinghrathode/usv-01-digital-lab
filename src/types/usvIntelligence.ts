/**
 * USV-01 Digital Engineering Lab — Global Navy USV Fleet Intelligence Types
 * Schema for operational naval USV models, technical specifications, and academic research papers.
 */

export const USV_INTELLIGENCE_VERSION = '1.0.0';

export type UsvMissionProfile =
  | 'MCM' // Mine Countermeasures
  | 'ASW' // Anti-Submarine Warfare
  | 'ASuW' // Anti-Surface Warfare
  | 'ISR' // Intelligence, Surveillance, Reconnaissance
  | 'STRIKE' // Direct Action / One-Way Strike / Loitering
  | 'PATROL' // Coastal & EEZ Security / Force Protection
  | 'SURVEY' // Hydrographic & Oceanographic Survey
  | 'EW' // Electronic Warfare
  | 'MULTI_MISSION';

export type UsvHullForm =
  | 'Monohull Deep-V'
  | 'Catamaran'
  | 'Trimaran'
  | 'Planing Monohull'
  | 'SWATH'
  | 'Rigid Inflatable Hull (RHIB)'
  | 'Hydrofoil / Wave Piercing'
  | 'Wave Piercing Monohull';

export type UsvOperationalStatus =
  | 'Active Operational'
  | 'Combat Deployed'
  | 'Sea Trials'
  | 'Low-Rate Initial Production'
  | 'Technology Demonstrator'
  | 'Fleet Prototype';

export type AutonomyLevel =
  | 'AL-1 (Remote Control)'
  | 'AL-2 (Human-in-the-Loop Semi-Autonomous)'
  | 'AL-3 (Human-on-the-Loop Conditional Autonomy)'
  | 'AL-4 (High Autonomy - COLREGS Compliant)'
  | 'AL-5 (Full Mission Autonomy / Swarm)';

export interface UsvPaperReference {
  id: string;
  title: string;
  authors: string[];
  publication: string;
  year: number;
  doi?: string;
  url?: string;
  category: 'HYDRODYNAMICS' | 'AUTONOMY_CONTROL' | 'COLREGS' | 'PROPULSION' | 'SEAKEEPING' | 'SWARM_OPS';
  abstract: string;
  keyFindings: string[];
  governingFormulas?: string[];
}

export interface OperatingUsvModel {
  id: string;
  modelName: string;
  designationClass?: string;
  operatorNavy: string;
  country: string;
  countryCode: string; // ISO 2-letter e.g. 'US', 'GB', 'TR', 'UA', 'IL', 'FR', 'SG', 'AU', 'IN', 'CN'
  manufacturer: string;
  inServiceYear: number;
  status: UsvOperationalStatus;
  primaryMission: UsvMissionProfile;
  secondaryMissions: UsvMissionProfile[];

  // 1. Naval Architecture & Hull Dimensions
  dimensions: {
    lengthOverallM: number; // LOA (m)
    beamM: number; // Beam (m)
    draftM: number; // Draft (m)
    fullLoadDisplacementKg: number; // Full load displacement (kg or tons * 1000)
    displacementTonnes: number;
    payloadCapacityKg: number;
    hullMaterial: string;
    hullForm: UsvHullForm;
    maxSeaStateOperating: number; // NATO Sea State (e.g. 4, 5, 6)
    maxSeaStateSurvival: number;
  };

  // 2. Hydrodynamics & Performance
  performance: {
    maxSpeedKnots: number;
    cruiseSpeedKnots: number;
    rangeNauticalMiles: number;
    enduranceHours: number;
    enduranceDays?: number;
    froudeNumberMax?: number;
  };

  // 3. Machinery & Propulsion
  propulsion: {
    systemType: 'Diesel' | 'Diesel-Electric Hybrid' | 'All-Electric' | 'Gas Turbine' | 'Solar-Wave' | 'Outboard Marine Engine';
    engineDescription: string;
    totalPowerKw: number;
    propulsionUnit: 'Waterjet' | 'Fixed Pitch Propeller' | 'Surface Drive' | 'Electric Pod' | 'Wave Foil';
    fuelCapacityLiters?: number;
    batteryCapacityKwh?: number;
    auxiliaryEnergyHarvesting?: string;
  };

  // 4. Autonomy & Navigation Systems
  autonomy: {
    autonomyLevel: AutonomyLevel;
    architectureDescription: string;
    colregsCompliance: boolean;
    colregsRulesSupported: string[]; // e.g. ['Rule 8', 'Rule 13', 'Rule 14', 'Rule 15', 'Rule 16']
    c2Datalinks: string[]; // e.g. ['SATCOM (Starlink/Inmarsat)', 'Encrypted Mesh RF', '4G/LTE', 'Acoustic Modem']
    collisionAvoidanceSensors: string[];
  };

  // 5. Sensor Suite
  sensors: {
    surfaceRadar: string;
    electroOpticalInfrared: string;
    sonarSuite?: string;
    lidar?: string;
    electronicWarfare?: string;
    acousticSensors?: string;
  };

  // 6. Mission Packages & Armament
  missionPackage: {
    combatPayloadDescription: string;
    weaponsFitted?: string[];
    mcmEquipment?: string[];
    aswEquipment?: string[];
    surveillanceFeatures?: string[];
  };

  // 7. Research Papers & Knowledge Sources
  linkedPapers: UsvPaperReference[];

  // 8. Benchmark Analysis against USV-01 Baseline
  usv01BenchmarkDelta: {
    speedRatio: number; // foreign / USV-01 target
    enduranceRatio: number;
    displacementRatio: number;
    keyTakeaway: string;
    recommendedDesignImprovement: string;
  };

  // Metadata
  lastScrapedAt: string;
  dataSourceUrls: string[];
  verifiedByAnalyst: boolean;
}

export interface UsvScrapeQuery {
  country?: string;
  operatorNavy?: string;
  mission?: UsvMissionProfile | 'ALL';
  hullForm?: string | 'ALL';
  minSpeedKnots?: number;
  maxDisplacementTonnes?: number;
  autonomyLevel?: string | 'ALL';
  keyword?: string;
}

export interface UsvScrapeReport {
  executionTimestamp: string;
  totalVesselsScraped: number;
  sourcesQueried: string[];
  newVesselsIdentified: number;
  papersExtracted: number;
  activeNaviesCount: number;
  topPerformingVessels: {
    fastest: string;
    longestEndurance: string;
    largestDisplacement: string;
  };
}
