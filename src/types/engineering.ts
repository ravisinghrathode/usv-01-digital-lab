/**
 * USV-01 Digital Engineering Lab — Data Model Types
 * Authoritative systems engineering schema
 */

export type WorkstreamCode = 
  | 'SYS' // Systems Engineering
  | 'NAV' // Naval Architecture
  | 'HYD' // Hydrodynamics
  | 'MEC' // Mechanical and Structural
  | 'ELE' // Electrical and Power
  | 'PRP' // Propulsion
  | 'AUT' // Software and Autonomy
  | 'VNV'; // Verification and Validation

export interface ProjectInfo {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'Active' | 'Paused' | 'Archived';
  governanceState: 'Draft' | 'In Review' | 'Approved Baseline' | 'Superseded';
  baselineRev: string;
  leadEngineer: string;
  securityClassification: string;
  lastUpdated: string;
}

export interface WorkstreamSummary {
  code: WorkstreamCode;
  name: string;
  lead: string;
  status: 'Nominal' | 'Under Review' | 'Blocked' | 'Pending Inputs';
  completionPercent: number; // calculated or estimated
  openItemsCount: number;
  openDecisionsCount: number;
  openRisksCount: number;
  lastActivity: string;
  description: string;
}

export type RequirementPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type VerificationMethod = 'Analysis' | 'Test' | 'Demonstration' | 'Inspection' | 'Simulation';
export type EngineeringStatus = 'Draft' | 'In Review' | 'Approved' | 'Superseded' | 'Rejected' | 'Archived';

export interface Requirement {
  id: string;
  projectId: string;
  subsystemCode: WorkstreamCode;
  title: string;
  description: string;
  category: string; // e.g. Functional, Operational, Safety, Environmental, Interface
  priority: RequirementPriority;
  parentReqId?: string;
  childReqIds?: string[];
  subsystemAllocation: string;
  verificationMethod: VerificationMethod;
  acceptanceCriteria: string;
  owner: string;
  revision: string;
  status: EngineeringStatus;
  isIllustrative: boolean; // Flagged true if SAMPLE data
  relatedDecisions: string[];
  relatedSimulations: string[];
  relatedVerifications: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DesignDecision {
  id: string;
  projectId: string;
  subsystemCode: WorkstreamCode;
  title: string;
  problemStatement: string;
  alternatives: string[];
  rationale: string;
  supportingEvidence: string;
  consequences: string;
  reviewer: string;
  approvalState: EngineeringStatus;
  revision: string;
  isAiProposal: boolean; // Must be false or require human sign-off
  isIllustrative: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EngineeringRisk {
  id: string;
  projectId: string;
  subsystemCode: WorkstreamCode;
  description: string;
  probability: number; // 1-5
  impact: number; // 1-5
  riskScore: number; // P * I
  mitigation: string;
  owner: string;
  status: 'Open' | 'Mitigated' | 'Closed' | 'Accepted';
  isIllustrative: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SimulationRunStatus = 
  | 'Draft' 
  | 'Ready' 
  | 'Queued' 
  | 'Running' 
  | 'Completed' 
  | 'Failed' 
  | 'Under Review' 
  | 'Approved';

export interface SimulationJob {
  id: string;
  projectId: string;
  discipline: WorkstreamCode | 'Multi-Physics';
  name: string;
  geometryRevision: string;
  inputConfiguration: string;
  solver: string;
  boundaryConditions: string;
  unitsAndReferenceFrame: string;
  assumptions: string;
  computeEnvironment: string; // e.g., HPC Cluster Node 4 / OpenFOAM v2312
  runStatus: SimulationRunStatus;
  outputFiles: string;
  resultsSummary: string; // Fictional results are prohibited; TBD if pending
  reviewer: string;
  validationStatus: string;
  isIllustrative: boolean;
  externalRefUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationPlan {
  id: string;
  projectId: string;
  subsystemCode: WorkstreamCode;
  title: string;
  procedureSummary: string;
  acceptanceCriteria: string;
  instrumentationAndCalibration: string;
  targetReqIds: string[];
  status: 'Draft' | 'Approved' | 'Executed' | 'Closed';
  owner: string;
  isIllustrative: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestRecord {
  id: string;
  planId: string;
  testDate: string;
  executingEngineer: string;
  resultStatus: 'Passed' | 'Failed' | 'Inconclusive' | 'Deviation Logged';
  measuredDataSummary: string;
  deviationsAndCorrectiveActions: string;
  evidenceAttachments: string[];
  isIllustrative: boolean;
  approvalStatus: EngineeringStatus;
  approver: string;
  createdAt: string;
}

export interface ComponentBOM {
  id: string;
  projectId: string;
  subsystemCode: WorkstreamCode;
  partNumber: string;
  description: string;
  manufacturer: string;
  supplier: string;
  technicalSpecs: string;
  quantity: number;
  unitCost: string;
  leadTimeWeeks: string;
  procurementStatus: 'Specifying' | 'Quoted' | 'Ordered' | 'Received' | 'In Inspection' | 'Installed';
  datasheetUrl?: string;
  quotationRef?: string;
  isIllustrative: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'ARCHIVE' | 'APPROVE' | 'REJECT' | 'REVISE' | 'IMPORT';
  recordType: string;
  recordId: string;
  details: string;
}

// Naval Architecture specific records
export interface PrincipalParticulars {
  loa: string; // "TBD"
  lwl: string; // "TBD"
  beamOverall: string; // "TBD"
  beamWaterline: string; // "TBD"
  depthMolded: string; // "TBD"
  draftDesign: string; // "TBD"
  draftScantling: string; // "TBD"
  freeboardDesign: string; // "TBD"
  blockCoefficientCb: string; // "TBD"
  prismaticCoefficientCp: string; // "TBD"
  displacementMolded: string; // "TBD"
  deadweightCapacity: string; // "TBD"
  validationState: 'Unverified / TBD' | 'Preliminary Calculations' | 'Towing Tank Certified';
}

export interface WeightCGItem {
  id: string;
  name: string;
  subsystem: WorkstreamCode;
  massKg: number | 'TBD';
  lcgM: number | 'TBD'; // m from AP
  vcgM: number | 'TBD'; // m from baseline
  tcgM: number | 'TBD'; // m from centerline
  confidence: 'TBD' | 'Estimate' | 'Calculated' | 'Weighed Actual';
  isIllustrative: boolean;
}

// Hydrodynamics specific records
export interface ResistanceEstimate {
  id: string;
  speedKnots: number | 'TBD';
  method: 'Holtrop-Mennen' | 'Savitsky Planing' | 'CFD VOF' | 'Towing Tank' | 'TBD';
  bareHullResistanceKN: number | 'TBD';
  appendageResistanceKN: number | 'TBD';
  effectivePowerKW: number | 'TBD';
  status: 'TBD' | 'Draft Estimation' | 'Peer Reviewed';
  notes: string;
}

// Mechanical and Materials
export interface MaterialRecord {
  id: string;
  materialName: string;
  specification: string;
  yieldStrengthMPa: number | 'TBD';
  ultimateStrengthMPa: number | 'TBD';
  densityKgM3: number | 'TBD';
  corrosionResistanceMarine: string;
  notes: string;
  isIllustrative: boolean;
}

export interface LoadCaseRecord {
  id: string;
  title: string;
  loadType: 'Bottom Slamming' | 'Hull Girder Bending' | 'Towing Bollard Pull' | 'Crane Lift' | 'Mast Wind Drag';
  governingStandard: string;
  designPressureOrForce: string;
  safetyFactorTarget: number;
  feaStatus: 'TBD' | 'Pending Meshing' | 'Solved - Criteria Met' | 'Failed Criteria';
}

// Electrical and Power
export interface PowerLoadItem {
  id: string;
  consumerName: string;
  subsystem: WorkstreamCode;
  voltageV: string;
  nominalPowerW: number | 'TBD';
  dutyCyclePercent: number | 'TBD';
  averageContinuousPowerW: number | 'TBD';
  peakPowerW: number | 'TBD';
  isEssential: boolean;
}

// Software and Autonomy Interface Control Document (ICD)
export interface InterfaceDefinition {
  id: string;
  title: string;
  sourceSubsystem: WorkstreamCode;
  targetSubsystem: WorkstreamCode;
  physicalMedium: 'Ethernet 1000BASE-T' | 'RS-422 Serial' | 'CAN 2.0B / NMEA 2000' | 'Discrete IO' | 'TBD';
  protocol: 'ROS2 / DDS' | 'NMEA 0183' | 'Modbus TCP' | 'Custom Binary' | 'TBD';
  frequencyHz: string;
  latencyBudgetMs: string;
  status: EngineeringStatus;
  isIllustrative: boolean;
}

// Knowledge Centre
export interface KnowledgeNote {
  id: string;
  title: string;
  category: 'Engineering Concept' | 'Research Note' | 'Lesson Learned' | 'Standard Reference' | 'Glossary Term' | 'BENCHMARK';
  subsystems: WorkstreamCode[];
  contentMarkdown: string; // Supports Obsidian wikilinks [[Topic]]
  obsidianVaultLink?: string;
  googleDriveRef?: string;
  lastUpdated: string;
  tags?: string[];
  governingStandards?: string[];
  relatedRequirementIds?: string[];
  author?: string;
  createdDate?: string;
  lastRevision?: string;
  verificationStatus?: string;
}
