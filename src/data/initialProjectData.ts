import type {
  ProjectInfo,
  WorkstreamSummary,
  Requirement,
  DesignDecision,
  EngineeringRisk,
  SimulationJob,
  VerificationPlan,
  TestRecord,
  ComponentBOM,
  ActivityLogItem,
  PrincipalParticulars,
  WeightCGItem,
  ResistanceEstimate,
  MaterialRecord,
  LoadCaseRecord,
  PowerLoadItem,
  InterfaceDefinition,
  KnowledgeNote
} from '../types/engineering.ts';

export const INITIAL_PROJECT: ProjectInfo = {
  id: 'PRJ-USV-01',
  name: 'USV-01 Digital Engineering Lab',
  code: 'USV-01',
  description: 'Autonomous maritime surface vessel digital engineering lifecycle platform, requirements baseline, and physics simulation registry.',
  status: 'Active',
  governanceState: 'Draft',
  baselineRev: 'NO APPROVED VESSEL BASELINE — DEMO DATA ONLY',
  leadEngineer: 'Unassigned — no attributed engineering approval',
  securityClassification: 'Engineering Controlled Baseline',
  lastUpdated: '2026-11-12 17:00 UTC'
};

export const INITIAL_WORKSTREAMS: WorkstreamSummary[] = [
  {
    code: 'SYS',
    name: 'Systems Engineering',
    lead: 'Unassigned — demo workstream',
    status: 'Pending Inputs',
    completionPercent: 0,
    openItemsCount: 5,
    openDecisionsCount: 2,
    openRisksCount: 3,
    lastActivity: 'No independently verified workstream evidence loaded',
    description: 'Top-level mission CONOPS, requirements decomposition, ICD registers, and cross-discipline verification matrix.'
  },
  {
    code: 'NAV',
    name: 'Naval Architecture',
    lead: 'Unassigned — demo workstream',
    status: 'Pending Inputs',
    completionPercent: 0,
    openItemsCount: 8,
    openDecisionsCount: 1,
    openRisksCount: 2,
    lastActivity: 'No independently verified workstream evidence loaded',
    description: 'Hull form geometry, principal particulars, intact/damage stability under IMO 2008 IS Code, and weight/LCG tracking.'
  },
  {
    code: 'HYD',
    name: 'Hydrodynamics',
    lead: 'Unassigned — demo workstream',
    status: 'Pending Inputs',
    completionPercent: 0,
    openItemsCount: 4,
    openDecisionsCount: 2,
    openRisksCount: 1,
    lastActivity: 'No independently verified workstream evidence loaded',
    description: 'Calm-water resistance, speed-power estimation, seakeeping RAO analyses, cavitation margins, and CFD HPC job registry.'
  },
  {
    code: 'MEC',
    name: 'Mechanical & Structural',
    lead: 'Unassigned — demo workstream',
    status: 'Pending Inputs',
    completionPercent: 0,
    openItemsCount: 6,
    openDecisionsCount: 1,
    openRisksCount: 2,
    lastActivity: 'No independently verified workstream evidence loaded',
    description: 'Hull girder longitudinal strength, transverse frames, material database, component CAD registry, and FEA stress runs.'
  },
  {
    code: 'ELE',
    name: 'Electrical & Power',
    lead: 'Unassigned — demo workstream',
    status: 'Pending Inputs',
    completionPercent: 0,
    openItemsCount: 7,
    openDecisionsCount: 1,
    openRisksCount: 2,
    lastActivity: 'No independently verified workstream evidence loaded',
    description: 'Isolated DC bus topology, LiFePO4 battery energy storage, 24h operational duty-cycle load balance, and galvanic protection.'
  },
  {
    code: 'PRP',
    name: 'Propulsion',
    lead: 'Unassigned — demo workstream',
    status: 'Pending Inputs',
    completionPercent: 0,
    openItemsCount: 5,
    openDecisionsCount: 1,
    openRisksCount: 1,
    lastActivity: 'No independently verified workstream evidence loaded',
    description: 'Electric drive motors, ESC inverter cooling, propeller blade cavitation margins, and drive integration verification.'
  },
  {
    code: 'AUT',
    name: 'Software & Autonomy',
    lead: 'Unassigned — demo workstream',
    status: 'Pending Inputs',
    completionPercent: 0,
    openItemsCount: 9,
    openDecisionsCount: 3,
    openRisksCount: 3,
    lastActivity: 'No independently verified workstream evidence loaded',
    description: 'Dual-redundant autonomy stack, RTK GNSS/INS sensor fusion, radar/LiDAR perception, fail-safe watchdogs, and ICDs.'
  },
  {
    code: 'VNV',
    name: 'Verification & Validation',
    lead: 'Unassigned — demo workstream',
    status: 'Pending Inputs',
    completionPercent: 0,
    openItemsCount: 4,
    openDecisionsCount: 0,
    openRisksCount: 1,
    lastActivity: 'No independently verified workstream evidence loaded',
    description: 'Test procedure register, HIL test environments, calibrated instrumentation logs, non-conformance deviations, and approvals.'
  }
];

export const INITIAL_REQUIREMENTS: Requirement[] = [
  {
    id: 'REQ-SYS-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'SYS',
    title: '[SAMPLE] Remote Operational Telemetry & Watchdog Link',
    description: 'The USV-01 vessel system shall maintain continuous bi-directional health telemetry with the remote command station, triggering autonomous loiter or fail-safe stop if telemetry is lost exceeding [TBD] seconds.',
    category: 'Safety & Control',
    priority: 'Critical',
    subsystemAllocation: 'Software & Autonomy / Electrical',
    verificationMethod: 'Test',
    acceptanceCriteria: 'Autonomous fail-safe mode engages within [TBD] seconds of simulated RF carrier loss across 10/10 trials.',
    owner: 'Dr. M. Lindqvist',
    revision: 'Rev 1.1',
    status: 'Draft',
    isIllustrative: true,
    relatedDecisions: ['DEC-AUT-001'],
    relatedSimulations: ['SIM-AUT-001'],
    relatedVerifications: ['VER-HIL-002'],
    createdAt: '2026-10-15',
    updatedAt: '2026-11-01'
  },
  {
    id: 'REQ-NAV-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'NAV',
    title: '[SAMPLE] Intact Stability Envelope Compliance',
    description: 'The vessel shall satisfy the intact-stability design basis applicable to its approved configuration, service and jurisdiction. Flag/class applicability and acceptance thresholds remain TBD.',
    category: 'Naval Architecture',
    priority: 'Critical',
    subsystemAllocation: 'Naval Architecture',
    verificationMethod: 'Analysis',
    acceptanceCriteria: 'TBD — approved hull offsets, measured KG, loading cases, downflooding, independently verified GZ and class/flag rules required before determining limits.',
    owner: 'K. Tanaka',
    revision: 'Rev 1.0',
    status: 'Draft',
    isIllustrative: true,
    relatedDecisions: ['DEC-NAV-001'],
    relatedSimulations: ['SIM-NAV-001'],
    relatedVerifications: ['VER-TOW-003'],
    createdAt: '2026-10-18',
    updatedAt: '2026-10-28'
  },
  {
    id: 'REQ-NAV-002',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'NAV',
    title: '[SAMPLE] Draft and Freeboard Operational Envelope',
    description: 'The vessel full-load design draft shall not exceed [TBD] meters to allow shallow coastal access, while maintaining a minimum design freeboard of [TBD] meters.',
    category: 'Operational',
    priority: 'High',
    subsystemAllocation: 'Naval Architecture',
    verificationMethod: 'Inspection',
    acceptanceCriteria: 'Measured calm-water waterline marks confirm draft <= [TBD] m at fully loaded displacement (TBD kg).',
    owner: 'K. Tanaka',
    revision: 'Rev 0.9',
    status: 'In Review',
    isIllustrative: true,
    relatedDecisions: ['DEC-NAV-001'],
    relatedSimulations: [],
    relatedVerifications: ['VER-TOW-003'],
    createdAt: '2026-10-20',
    updatedAt: '2026-11-02'
  },
  {
    id: 'REQ-HYD-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'HYD',
    title: '[SAMPLE] Calm-Water Resistance Characterization',
    description: 'The bare hull and appendaged hydrodynamic resistance shall be characterized from 2 knots up to [TBD] knots sprint speed via validated numerical models correlated with scale model test data.',
    category: 'Performance',
    priority: 'High',
    subsystemAllocation: 'Hydrodynamics',
    verificationMethod: 'Simulation',
    acceptanceCriteria: 'CFD VOF resistance predictions within +/- 6% of towing tank scale force measurements at equivalent Froude numbers.',
    owner: 'A. Boucher',
    revision: 'Rev 1.2',
    status: 'In Review',
    isIllustrative: true,
    relatedDecisions: ['DEC-NAV-001'],
    relatedSimulations: ['SIM-HYD-001'],
    relatedVerifications: ['VER-TOW-003'],
    createdAt: '2026-10-22',
    updatedAt: '2026-11-05'
  },
  {
    id: 'REQ-MEC-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'MEC',
    title: '[SAMPLE] Bottom Slamming Pressure Structural Integrity',
    description: 'The forward hull plating and framing shall withstand dynamic hydrodynamic slamming pressure calculated in accordance with DNV-RU-HSLC for design speed [TBD] knots in Sea State [TBD].',
    category: 'Structural',
    priority: 'Critical',
    subsystemAllocation: 'Mechanical & Structural',
    verificationMethod: 'Analysis',
    acceptanceCriteria: 'Von Mises peak stress in aluminum framing shall not exceed 0.80 of yield strength (Marine 5083-H116) under peak design slamming head.',
    owner: 'H. Richter',
    revision: 'Rev 1.0',
    status: 'Draft',
    isIllustrative: true,
    relatedDecisions: ['DEC-NAV-001'],
    relatedSimulations: ['SIM-MEC-001'],
    relatedVerifications: ['VER-STR-001'],
    createdAt: '2026-10-25',
    updatedAt: '2026-11-03'
  },
  {
    id: 'REQ-ELE-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'ELE',
    title: '[SAMPLE] Isolated Dual DC Bus Architecture',
    description: 'The electrical power system shall provide galvanically isolated DC buses: a dedicated propulsion high-current bus ([TBD] V) and an isolated avionics/sensor bus (24V DC).',
    category: 'Electrical Architecture',
    priority: 'Critical',
    subsystemAllocation: 'Electrical & Power',
    verificationMethod: 'Test',
    acceptanceCriteria: 'Insulation resistance > 10 MOhm between propulsion power ground and avionics ground; transient voltage drop < 5% during motor step throttle.',
    owner: 'S. Patel',
    revision: 'Rev 1.0',
    status: 'Draft',
    isIllustrative: true,
    relatedDecisions: ['DEC-ELE-001'],
    relatedSimulations: [],
    relatedVerifications: ['VER-FAT-001'],
    createdAt: '2026-10-27',
    updatedAt: '2026-11-04'
  },
  {
    id: 'REQ-AUT-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'AUT',
    title: '[SAMPLE] COLREGs Collision Avoidance Autonomous Maneuver',
    description: 'The autonomous navigation system shall detect marine surface traffic via fused radar/LiDAR/AIS and execute COLREGs Rule 14 (Head-on) and Rule 15 (Crossing) compliant avoidance maneuvers with minimum CPA of [TBD] meters.',
    category: 'Autonomy & Navigation',
    priority: 'Critical',
    subsystemAllocation: 'Software & Autonomy',
    verificationMethod: 'Simulation',
    acceptanceCriteria: 'Zero collision events across 50 Monte Carlo maritime scenario simulations with minimum Closest Point of Approach (CPA) maintained >= [TBD] m.',
    owner: 'E. Chen',
    revision: 'Rev 0.8',
    status: 'Draft',
    isIllustrative: true,
    relatedDecisions: ['DEC-AUT-001'],
    relatedSimulations: ['SIM-AUT-001'],
    relatedVerifications: ['VER-HIL-002'],
    createdAt: '2026-11-01',
    updatedAt: '2026-11-08'
  }
];

export const INITIAL_DECISIONS: DesignDecision[] = [
  {
    id: 'DEC-NAV-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'NAV',
    title: '[SAMPLE] Hull Form Architecture: Deep-V Monohull vs Symmetric Catamaran',
    problemStatement: 'Determine primary hull configuration to balance transverse stability for payload sensors, rough-water seakeeping, calm-water resistance, and trailerable transportability.',
    alternatives: [
      'Alternative A: Symmetric High-Speed Catamaran (High initial GM, wide sensor deck, increased wet surface at low speeds)',
      'Alternative B: Deep-V Monohull with Hard Chines (Superior rough sea slicing, narrow beam, higher roll at low loiter speeds)',
      'Alternative C: Monohull with Outrigger Floats / Trimaran (Complex fabrication, high deck area)'
    ],
    rationale: 'Trade study matrix currently ranks Alternative A higher for sensor mast stability during slow loiter, but awaiting CFD resistance curves and trailer width regulatory constraints before final sign-off.',
    supportingEvidence: 'Preliminary hydrodynamic comparisons in Report USV01-NAV-TR-002 and CFD run SIM-HYD-001.',
    consequences: 'Selection determines structural bulkhead placement, propulsion drive spacing, and trailer cradles.',
    reviewer: 'Chief Naval Architect',
    approvalState: 'In Review',
    revision: 'Rev 0.3',
    isAiProposal: false,
    isIllustrative: true,
    createdAt: '2026-10-20',
    updatedAt: '2026-11-04'
  },
  {
    id: 'DEC-ELE-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'ELE',
    title: '[SAMPLE] Battery Chemistry Selection: LiFePO4 vs NMC for Marine Enclosure',
    problemStatement: 'Select energy storage cell chemistry balancing volumetric energy density (Wh/L), thermal runaway auto-ignition tolerance in a hermetically sealed marine compartment, and cycle life.',
    alternatives: [
      'Alternative 1: Lithium Iron Phosphate (LiFePO4) — Superior thermal runaway threshold (>270°C), 3000+ cycles, lower gravimetric density (~150 Wh/kg)',
      'Alternative 2: Nickel Manganese Cobalt (NMC) — High gravimetric density (~240 Wh/kg), lower thermal stability (<210°C), requires aerosol fire-suppression'
    ],
    rationale: 'LiFePO4 selected as baseline design choice due to uncrewed maritime fire safety constraints where active firefighting intervention is impossible at sea.',
    supportingEvidence: 'Risk assessment R-01 and cell abuse test documentation IEEE 45 compliant.',
    consequences: 'Increased mass budget allocated to Naval Architecture weight estimate (+18% battery volume compared to NMC).',
    reviewer: 'Lead Power Systems Engineer',
    approvalState: 'Draft',
    revision: 'Rev 1.0',
    isAiProposal: false,
    isIllustrative: true,
    createdAt: '2026-10-28',
    updatedAt: '2026-11-02'
  },
  {
    id: 'DEC-AUT-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'AUT',
    title: '[SAMPLE] Autonomy Software Middleware: ROS2 Humble with DDS vs Custom C++ RTOS',
    problemStatement: 'Select middleware communication backbone for sensor data pipelines (LiDAR point clouds, Radar tracks, NMEA sentences, motor control commands).',
    alternatives: [
      'Option A: ROS2 Humble LTS over CycloneDDS (Standard marine autonomy community tooling, rich driver ecosystem, real-time publish-subscribe)',
      'Option B: Custom ZeroMQ / Protobuf pipeline (Lightweight, zero external dependencies, but requires custom tooling and introspection)'
    ],
    rationale: 'ROS2 Humble LTS adopted for modular node lifecycle management, standardized sensor message definitions (sensor_msgs, geographic_msgs), and DDS QoS profiles.',
    supportingEvidence: 'Latency benchmarking report USV01-AUT-SW-001 showing < 8ms round-trip latency on Jetson AGX Orin.',
    consequences: 'Requires Linux PREEMPT_RT kernel patch on autonomy compute hardware.',
    reviewer: 'Software Architecture Review Board',
    approvalState: 'Draft',
    revision: 'Rev 1.1',
    isAiProposal: false,
    isIllustrative: true,
    createdAt: '2026-10-30',
    updatedAt: '2026-11-06'
  }
];

export const INITIAL_RISKS: EngineeringRisk[] = [
  {
    id: 'RSK-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'ELE',
    description: '[SAMPLE] Battery compartment thermal runaway or venting in sealed marine hull during sustained peak power draw.',
    probability: 2,
    impact: 5,
    riskScore: 10,
    mitigation: 'Mandate LiFePO4 chemistry (DEC-ELE-001), redundant cell temperature sensors, IP67 pressure-relief blast valves, and automated emergency battery disconnect.',
    owner: 'S. Patel',
    status: 'Mitigated',
    isIllustrative: true,
    createdAt: '2026-10-22',
    updatedAt: '2026-11-02'
  },
  {
    id: 'RSK-002',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'AUT',
    description: '[SAMPLE] Telemetry line-of-sight RF dropout during high sea state due to antenna immersion or wave masking.',
    probability: 4,
    impact: 4,
    riskScore: 16,
    mitigation: 'Dual redundant antenna mast diversity, low-orbit satellite failover link, and deterministic dead-reckoning loiter behavior (REQ-SYS-001).',
    owner: 'E. Chen',
    status: 'Open',
    isIllustrative: true,
    createdAt: '2026-10-25',
    updatedAt: '2026-11-08'
  },
  {
    id: 'RSK-003',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'NAV',
    description: '[SAMPLE] Centre of gravity (VCG) height escalation as mast-mounted sensors (Radar, EO/IR PTZ) are integrated, degrading transverse GM.',
    probability: 3,
    impact: 4,
    riskScore: 12,
    mitigation: 'Implement rigorous weight & CG budget with 15% design margin; carbon-fiber mast fabrication to minimize top-weight.',
    owner: 'K. Tanaka',
    status: 'Open',
    isIllustrative: true,
    createdAt: '2026-10-29',
    updatedAt: '2026-11-07'
  },
  {
    id: 'RSK-004',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'HYD',
    description: '[SAMPLE] Propeller blade root cavitation inception occurring below maximum cruise velocity, inducing vibration and blade erosion.',
    probability: 2,
    impact: 4,
    riskScore: 8,
    mitigation: 'Perform detailed lifting line and BEM cavitation analysis across full operating wake field before propeller casting sign-off.',
    owner: 'A. Boucher',
    status: 'Open',
    isIllustrative: true,
    createdAt: '2026-11-03',
    updatedAt: '2026-11-09'
  }
];

export const INITIAL_SIMULATIONS: SimulationJob[] = [
  {
    id: 'SIM-HYD-001',
    projectId: 'PRJ-USV-01',
    discipline: 'HYD',
    name: '[SAMPLE] Calm-Water Free-Surface VOF Resistance Mesh Run',
    geometryRevision: 'CAD-HULL-REV-0.2',
    inputConfiguration: 'SnappyHexMesh 4.8M cells, y+ ~ 30, prism layers 5, symmetry boundary on centerline.',
    solver: 'OpenFOAM v2312 (interFoam VOF)',
    boundaryConditions: 'Inlet velocity: [TBD m/s], Atmospheric pressure outlet, Slip bottom & side walls, No-slip hull wall.',
    unitsAndReferenceFrame: 'SI (m, s, kg); Origin at Transom centerline AP, X+ forward, Z+ up.',
    assumptions: 'Incompressible isothermal seawater (rho=1025 kg/m3, nu=1.18e-6 m2/s), fixed trim and sinkage.',
    computeEnvironment: 'Dedicated HPC Node: Dual AMD EPYC 7763 (128 cores), 256GB RAM.',
    runStatus: 'Draft',
    outputFiles: 'TBD — no actual solver output uploaded',
    resultsSummary: 'TBD — synthetic scenario only; no run or result verified',
    reviewer: 'Unassigned',
    validationStatus: 'UNVERIFIED — no independently authenticated result',
    isIllustrative: true,

    createdAt: '2026-11-02',
    updatedAt: '2026-11-08'
  },
  {
    id: 'SIM-MEC-001',
    projectId: 'PRJ-USV-01',
    discipline: 'MEC',
    name: '[SAMPLE] Forward Keel Slamming Pressure FEA Stress Analysis',
    geometryRevision: 'CAD-STR-REV-0.1',
    inputConfiguration: 'Shell element quad mesh (size 15mm), welded joint contacts modeled with rigid links.',
    solver: 'CalculiX / Code_Aster 16.2',
    boundaryConditions: 'Fixed constraints at bulkheads Station 2 and 4. Quasi-static peak slamming head applied normal to bottom skin.',
    unitsAndReferenceFrame: 'SI (mm, N, MPa); Global ship coordinates.',
    assumptions: 'Marine Aluminum 5083-H116 isotropic linear elastic behavior below yield (E=71 GPa, Poisson=0.33).',
    computeEnvironment: 'Engineering Workstation Linux (32 threads, 64GB RAM).',
    runStatus: 'Draft',
    outputFiles: 'TBD — no actual solver output uploaded',
    resultsSummary: 'TBD — synthetic scenario only; no run or result verified',
    reviewer: 'Unassigned',
    validationStatus: 'UNVERIFIED — no independently authenticated result',
    isIllustrative: true,
    createdAt: '2026-11-04',
    updatedAt: '2026-11-07'
  },
  {
    id: 'SIM-AUT-001',
    projectId: 'PRJ-USV-01',
    discipline: 'AUT',
    name: '[SAMPLE] COLREGs Monte Carlo Collision Avoidance Scenario Batch',
    geometryRevision: 'N/A — Kinematic vessel footprint model',
    inputConfiguration: '50 randomized multi-vessel encounters (head-on, crossing, overtaking), sensor noise standard deviations added.',
    solver: 'Gazebo Garden + ROS2 Humble Autonomy In-the-Loop',
    boundaryConditions: 'Open ocean bounding box 10km x 10km, wind/current perturbations modeled as Gaussian random walk.',
    unitsAndReferenceFrame: 'WGS84 / UTM Zone 31N; NED local navigation frame.',
    assumptions: 'Target vessels navigate at constant speed & course (non-cooperative yet predictable).',
    computeEnvironment: 'Autonomy Sim Server (Nvidia RTX 4090).',
    runStatus: 'Draft',
    outputFiles: 'TBD — no actual solver output uploaded',
    resultsSummary: 'TBD — synthetic scenario only; no run or result verified',
    reviewer: 'Unassigned',
    validationStatus: 'UNVERIFIED — no independently authenticated result',
    isIllustrative: true,
    createdAt: '2026-11-06',
    updatedAt: '2026-11-10'
  }
];

export const INITIAL_VERIFICATION_PLANS: VerificationPlan[] = [
  {
    id: 'VER-FAT-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'ELE',
    title: '[SAMPLE] Factory Acceptance Test: DC Power Distribution Board & Isolation',
    procedureSummary: 'Verify galvanic isolation, overcurrent breaker tripping curves, and step load voltage sag on 48V and 24V buses in accordance with IEEE 45.',
    acceptanceCriteria: 'Galvanic resistance >= 10 MOhm at 500V test potential. Voltage sag <= 5% under 100A step load.',
    instrumentationAndCalibration: 'TBD — source and calibration records not provided',
    targetReqIds: ['REQ-ELE-001'],
    status: 'Draft',
    owner: 'S. Patel',
    isIllustrative: true,
    createdAt: '2026-10-28',
    updatedAt: '2026-11-05'
  },
  {
    id: 'VER-HIL-002',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'AUT',
    title: '[SAMPLE] Hardware-in-the-Loop: Autonomy Heartbeat Loss & Fail-Safe Response',
    procedureSummary: 'Simulate telemetry link failure between shoreside command console and vessel autonomy computer, record transition delay to loiter/anchor mode.',
    acceptanceCriteria: 'Fail-safe maneuver triggered within [TBD] seconds; thruster commands clamped to safe idle.',
    instrumentationAndCalibration: 'TBD — source and calibration records not provided',
    targetReqIds: ['REQ-SYS-001', 'REQ-AUT-001'],
    status: 'Draft',
    owner: 'E. Chen',
    isIllustrative: true,
    createdAt: '2026-11-02',
    updatedAt: '2026-11-08'
  },
  {
    id: 'VER-TOW-003',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'NAV',
    title: '[SAMPLE] Towing Tank Physical Resistance & Trim Trial',
    procedureSummary: 'Tow 1:5 scale physical hull model at designated carriage speeds in towing tank facility, record total drag and dynamic sinkage/trim.',
    acceptanceCriteria: 'Model drag measurements within +/- 5% of scaled CFD resistance prediction; no unpredicted porpoising or chine immersion.',
    instrumentationAndCalibration: 'TBD — source and calibration records not provided',
    targetReqIds: ['REQ-NAV-001', 'REQ-HYD-001'],
    status: 'Draft',
    owner: 'K. Tanaka',
    isIllustrative: true,
    createdAt: '2026-11-05',
    updatedAt: '2026-11-09'
  }
];

// Previous starter record claimed a passed 48.2 MOhm FAT and nonexistent attachments.
// Real test results must be imported through authenticated evidence workflows.
export const INITIAL_TEST_RECORDS: TestRecord[] = [];

export const INITIAL_COMPONENTS_BOM: ComponentBOM[] = [
  {
    id: 'BOM-001',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'AUT',
    partNumber: 'NAV-IMU-900',
    description: '[SAMPLE] Marine Tactical Grade MEMS GNSS/INS Navigation Sensor',
    manufacturer: 'Sparton / Inertial Marine Corp [ILLUSTRATIVE]',
    supplier: 'Maritime Systems Direct',
    technicalSpecs: 'Dual antenna RTK heading, 0.05° roll/pitch accuracy, IP68 sealed, NMEA 0183/2000 & Ethernet',
    quantity: 1,
    unitCost: '$12,450.00',
    leadTimeWeeks: '6 weeks',
    procurementStatus: 'Quoted',
    datasheetUrl: 'https://example.com/datasheets/nav-imu-900.pdf',
    isIllustrative: true,
    createdAt: '2026-10-25',
    updatedAt: '2026-11-04'
  },
  {
    id: 'BOM-002',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'ELE',
    partNumber: 'BAT-LFP-48V',
    description: '[SAMPLE] LiFePO4 Marine Certified Smart Energy Storage Module',
    manufacturer: 'BlueSeas Energy Storage Ltd [ILLUSTRATIVE]',
    supplier: 'Marine Power Wholesale',
    technicalSpecs: 'Nominal 51.2V DC, integrated CANbus BMS, thermal cutoff at 65°C, UN38.3 & DNV certified',
    quantity: 4,
    unitCost: '$3,800.00',
    leadTimeWeeks: '8 weeks',
    procurementStatus: 'Specifying',
    datasheetUrl: 'https://example.com/datasheets/bat-lfp-48v.pdf',
    isIllustrative: true,
    createdAt: '2026-10-28',
    updatedAt: '2026-11-06'
  },
  {
    id: 'BOM-003',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'AUT',
    partNumber: 'RAD-FMCW-4G',
    description: '[SAMPLE] Solid-State FMCW Solid Marine Radar Dome',
    manufacturer: 'Simrad / Furuno Marine [ILLUSTRATIVE]',
    supplier: 'Navico Commercial Marine',
    technicalSpecs: '24 RPM, 4G pulse compression, 50W equivalent RF, Ethernet radar spoke output, IPX6',
    quantity: 1,
    unitCost: '$4,200.00',
    leadTimeWeeks: '4 weeks',
    procurementStatus: 'Specifying',
    isIllustrative: true,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-08'
  },
  {
    id: 'BOM-004',
    projectId: 'PRJ-USV-01',
    subsystemCode: 'PRP',
    partNumber: 'MOT-PMSM-PRP',
    description: '[SAMPLE] Brushless Permanent Magnet Synchronous Propulsion Motor',
    manufacturer: 'Torqeedo / E-Propulsion Marine [ILLUSTRATIVE]',
    supplier: 'Electric Marine Drives Global',
    technicalSpecs: 'Continuous power rating [TBD kW], 48V DC liquid cooled, IP67 underwater pod unit',
    quantity: 2,
    unitCost: '$6,500.00',
    leadTimeWeeks: '10 weeks',
    procurementStatus: 'Specifying',
    isIllustrative: true,
    createdAt: '2026-11-03',
    updatedAt: '2026-11-09'
  }
];

export const INITIAL_NAVAL_PARTICULARS: PrincipalParticulars = {
  loa: 'TBD',
  lwl: 'TBD',
  beamOverall: 'TBD',
  beamWaterline: 'TBD',
  depthMolded: 'TBD',
  draftDesign: 'TBD',
  draftScantling: 'TBD',
  freeboardDesign: 'TBD',
  blockCoefficientCb: 'TBD',
  prismaticCoefficientCp: 'TBD',
  displacementMolded: 'TBD',
  deadweightCapacity: 'TBD',
  validationState: 'Unverified / TBD'
};

// Real vessel mass and CG entries must be sourced from weighed/verified records.
// Synthetic 6.2-tonne sample values were removed from the live project baseline.
export const INITIAL_WEIGHT_CG: WeightCGItem[] = [];

// No source-backed towing tank, CFD or measured total resistance records provided.
export const INITIAL_RESISTANCE: ResistanceEstimate[] = [];

export const INITIAL_MATERIALS: MaterialRecord[] = [
  { id: 'MAT-01', materialName: 'Marine Aluminum 5083-H116', specification: 'ASTM B928 / DNV Grade 5083', yieldStrengthMPa: 215, ultimateStrengthMPa: 305, densityKgM3: 2660, corrosionResistanceMarine: 'Excellent in saltwater; highly resistant to intergranular attack', notes: 'ILLUSTRATIVE candidate material only; no primary hull selection or independent review', isIllustrative: true },
  { id: 'MAT-02', materialName: 'Marine Aluminum 6061-T6 Extrusion', specification: 'ASTM B221 / DNV Grade 6061', yieldStrengthMPa: 240, ultimateStrengthMPa: 290, densityKgM3: 2700, corrosionResistanceMarine: 'Good; requires marine anodizing or conversion coating', notes: 'ILLUSTRATIVE candidate; not procured or structurally accepted', isIllustrative: true },
  { id: 'MAT-03', materialName: 'Carbon Fiber / Epoxy Pre-Preg', specification: 'High-Modulus Toray T700 / Marine Epoxy', yieldStrengthMPa: 450, ultimateStrengthMPa: 620, densityKgM3: 1550, corrosionResistanceMarine: 'Inert; requires galvanic isolation when contacting aluminum', notes: 'ILLUSTRATIVE candidate; no hull laminate or stability claim accepted', isIllustrative: true }
];

export const INITIAL_LOAD_CASES: LoadCaseRecord[] = [
  { id: 'LC-01', title: '[SAMPLE — NOT VERIFIED] Bottom Slamming Pressure on Keel Plating (ISO 12215-5)', loadType: 'Bottom Slamming', governingStandard: 'ISO 12215-5 / DNV-RU-HSLC', designPressureOrForce: 'TBD', safetyFactorTarget: 2.2, feaStatus: 'TBD' },
  { id: 'LC-02', title: '[SAMPLE — NOT VERIFIED] Hull Girder Sagging & Hogging Bending', loadType: 'Hull Girder Bending', governingStandard: 'IMO HSC Code / DNV', designPressureOrForce: 'TBD', safetyFactorTarget: 2.0, feaStatus: 'TBD' },
  { id: 'LC-03', title: '[SAMPLE — NOT VERIFIED] Single-Point Crane Lift Acceleration', loadType: 'Crane Lift', governingStandard: 'ISO 12215-6', designPressureOrForce: 'TBD', safetyFactorTarget: 3.0, feaStatus: 'TBD' }
];

// No authenticated supplier load, bus rating or as-installed input-power budget.
export const INITIAL_POWER_LOADS: PowerLoadItem[] = [];

export const INITIAL_INTERFACES: InterfaceDefinition[] = [
  { id: 'ICD-001', title: '[SAMPLE] Autonomy Computer to Motor Inverter Throttle/Steer', sourceSubsystem: 'AUT', targetSubsystem: 'PRP', physicalMedium: 'CAN 2.0B / NMEA 2000', protocol: 'Custom Binary', frequencyHz: '50 Hz', latencyBudgetMs: '20 ms', status: 'Draft', isIllustrative: true },
  { id: 'ICD-002', title: '[SAMPLE] GNSS/INS Navigation State to Autonomy Perception', sourceSubsystem: 'AUT', targetSubsystem: 'AUT', physicalMedium: 'Ethernet 1000BASE-T', protocol: 'ROS2 / DDS', frequencyHz: '100 Hz', latencyBudgetMs: '10 ms', status: 'Draft', isIllustrative: true },
  { id: 'ICD-003', title: '[SAMPLE] Battery Management System (BMS) Telemetry to Power Controller', sourceSubsystem: 'ELE', targetSubsystem: 'SYS', physicalMedium: 'CAN 2.0B / NMEA 2000', protocol: 'Modbus TCP', frequencyHz: '10 Hz', latencyBudgetMs: '100 ms', status: 'In Review', isIllustrative: true }
];

export const INITIAL_KNOWLEDGE_NOTES: KnowledgeNote[] = [
  {
    id: 'NOTE-001',
    title: 'Naval Architecture Intact Stability Criteria [[Naval Architecture]]',
    category: 'Standard Reference',
    subsystems: ['NAV', 'SYS'],
    contentMarkdown: `## USV-01 Stability Rules — Applicability Not Established

The applicable flag, class, small-craft and unmanned-vessel intact stability basis has not been selected. No numerical IMO/ISO threshold is approved for this craft merely because it appears in a sample dataset.

Needed: source-controlled vessel dimensions/geometry, independently verified loading cases and KG, righting-arm curves, downflooding geometry and competent reviewer decision.

See [[Naval Architecture]] and [[Weight and CG Tracking]].`,
    obsidianVaultLink: '', // not authenticated; avoid fictional vault reference
    googleDriveRef: '', // no verified project Drive identifier
    lastUpdated: '2026-11-04'
  },
  {
    id: 'NOTE-002',
    title: 'COLREGs Autonomous Avoidance Rules [[Software and Autonomy]]',
    category: 'Engineering Concept',
    subsystems: ['AUT', 'SYS'],
    contentMarkdown: `## International Regulations for Preventing Collisions at Sea (COLREGs)

Autonomous implementation within the USV-01 autonomy stack:

- **Rule 14 (Head-on Situation)**: When two vessels are meeting on reciprocal courses, both shall alter course to starboard to pass port-to-port.
- **Rule 15 (Crossing Situation)**: When two power-driven vessels are crossing, the vessel having the other on her starboard side shall keep out of the way.
- **Rule 16 (Action by Give-way Vessel)**: Action shall be taken early and substantially.
- **Rule 17 (Action by Stand-on Vessel)**: Maintain course and speed, but take emergency action if give-way vessel fails to maneuver.

Traceability reference: [[Requirements Register]] -> \`REQ-AUT-001\`.`,
    obsidianVaultLink: '', // not authenticated; avoid fictional vault reference
    googleDriveRef: '', // no verified project Drive identifier
    lastUpdated: '2026-11-08'
  },
  {
    id: 'NOTE-003',
    title: 'Galvanic Corrosion and Marine Aluminum Isolation [[Mechanical and Structural]]',
    category: 'Lesson Learned',
    subsystems: ['MEC', 'ELE'],
    contentMarkdown: `## Marine Grade Aluminum 5083-H116 vs Stainless 316 Fasteners

Direct mechanical contact between stainless steel fasteners (AISI 316) and aluminum hull framing in salt water electrolyte causes aggressive galvanic pitting of the aluminum.

### Mandatory Mitigations:
- Install non-conductive dielectric washers (Nylon / PTFE / Delrin) under all bolt heads and nuts.
- Coat fasteners with marine anti-seize paste (Tef-Gel or Duralac).
- Ensure sacrificial zinc / aluminum hull anodes are properly bonded to the main hull grounding plate.`,
    obsidianVaultLink: '', // not authenticated; avoid fictional vault reference
    googleDriveRef: '', // no verified project Drive identifier
    lastUpdated: '2026-11-09'
  }
];

// Do not fabricate an immutable engineering audit trail from example users.
export const INITIAL_ACTIVITY_LOG: ActivityLogItem[] = [];
