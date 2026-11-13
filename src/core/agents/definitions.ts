import { z } from 'zod';
import type { AgentSpec } from '../types/agent.ts';

// Common Schema definitions
const genericInputSchema = z.object({
  taskId: z.string(),
  context: z.record(z.string(), z.any()),
  parameters: z.record(z.string(), z.any()),
  priorAgentOutputs: z.record(z.string(), z.any()).optional(),
  userNotes: z.string().optional()
});

const genericOutputSchema = z.object({
  disciplineSummary: z.string(),
  keyMetrics: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  designDecisions: z.array(z.string()),
  metricProvenance: z.record(z.string(), z.object({
    sourceKind: z.enum(['SOURCE_DOCUMENT','HYPOTHESIS']),
    sourceReference: z.string().min(3),
    justification: z.string().min(5)
  })).optional(),
  assumptions: z.array(z.object({
    id: z.string(),
    category: z.enum(['ASSUMPTION', 'FACT', 'CALCULATION', 'TBD', 'PROPOSAL']),
    description: z.string(),
    sourceReference: z.string(),
    impactIfViolated: z.string(),
    isBaseline: z.boolean()
  })),
  openTbdItems: z.array(z.string()),
  requiresDirectorApproval: z.boolean(),
  approvalRationale: z.string().optional()
});

export const MASTER_AGENTS: AgentSpec[] = [
  // 1. Lead Systems Architect
  {
    id: 'LEAD-SYS-01',
    canonicalId: 'A01',
    aliases: ['LEAD-SYS-01', 'A01'],
    division: 'DIRECTORATE',
    name: 'Lead Systems Architect & Orchestrator',
    speciality: 'System-of-systems engineering, workflow orchestration, baseline synthesis',
    responsibilities: [
      'Decompose engineering missions into inter-agent dependency DAGs',
      'Synthesize inter-disciplinary trade studies across all divisions',
      'Ensure overall system cohesion and enforce TBD tracking rules',
      'Route critical items to Human Engineering Director for sign-off'
    ],
    systemInstructions: `You are the Lead Systems Architect and Master Orchestrator for USV-01.
Your mandate is system synthesis, workflow orchestration, and baseline integrity.
Never approve safety-critical baselines without human director sign-off.
Enforce standard discipline prefixes (SYS, NA, HYD, STR, ELEC, PROP, SWA, VVT).
Track all missing values as TBD rather than assuming defaults.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['USV01_PROJECT_CONTEXT.md', 'SYSTEMS_ENGINEERING_HANDBOOK', 'ISO-15288'],
    permittedTools: ['TOOL-DAG-SCHEDULER', 'TOOL-BASELINE-QUERY', 'TOOL-AUDIT-LOGGER'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'HUMAN_DIRECTOR',
    dependencies: [],
    executionPermissions: ['READ_ONLY', 'BASELINE_DRAFT', 'VVT_REVIEW'],
    verificationCriteria: {
      requiredChecklist: ['Verify DAG acyclicity', 'Check all discipline inputs reconciled', 'Verify no unverified safety assumptions'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: { maxUnresolvedConflicts: 0 },
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'SAFETY_CRITICAL', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 2. Requirements & Traceability Engineer
  {
    id: 'REQ-TRC-02',
    canonicalId: 'A02',
    aliases: ['REQ-TRC-02', 'A02'],
    division: 'REQUIREMENTS_BASELINE',
    name: 'Requirements & Traceability Engineer',
    speciality: 'Requirements engineering, bidirectional traceability, compliance matrix',
    responsibilities: [
      'Maintain hierarchical requirement tree (Mission -> Subsystem -> Component)',
      'Map requirements to allocating subsystems and verification methods',
      'Flag orphaned requirements or unverified requirements'
    ],
    systemInstructions: `You are the USV-01 Requirements Engineer. Ensure every requirement has an ID (REQ-XXX),
allocated subsystem, clear verification method (Test, Analysis, Inspection, Demonstration), and acceptance criteria.
Never allow untraced assumptions.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['USV01_PROJECT_CONTEXT.md', 'INCOSE_REQUIREMENTS_GUIDE'],
    permittedTools: ['TOOL-TRACEABILITY-MATRIX', 'TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['LEAD-SYS-01'],
    executionPermissions: ['READ_ONLY', 'BASELINE_DRAFT'],
    verificationCriteria: {
      requiredChecklist: ['Check all requirements have unique IDs', 'Check verification method specified for 100% of requirements'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: { orphanRequirements: 0 },
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 3. Operational Profile & CONOPS Specialist
  {
    id: 'CONOPS-03',
    canonicalId: 'A03',
    aliases: ['CONOPS-03', 'A03'],
    division: 'REQUIREMENTS_BASELINE',
    name: 'Operational Profile & CONOPS Specialist',
    speciality: 'Concept of Operations, mission profile, environmental envelope, sea state limits',
    responsibilities: [
      'Define sea state, wind, current, temperature operational envelopes',
      'Define transit, loiter, dash, and station-keeping mission phases',
      'Determine operational endurance and duty cycle expectations'
    ],
    systemInstructions: `Define CONOPS strictly based on authorized director input.
Flag all unconfirmed environmental bounds (e.g. NATO Sea State 4 vs 5, operating water temps) as TBD.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['WMO_SEA_STATE_TABLES', 'USV01_PROJECT_CONTEXT.md'],
    permittedTools: ['TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.2, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['REQ-TRC-02'],
    executionPermissions: ['READ_ONLY', 'PARAM_PROPOSAL'],
    verificationCriteria: {
      requiredChecklist: ['Sea state envelope defined', 'Transit/Loiter speeds parameterized', 'TBD flags explicit'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: {},
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'INFO', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 4. Marine Regulatory & Class Standards Specialist
  {
    id: 'REG-STD-04',
    canonicalId: 'A04',
    aliases: ['REG-STD-04', 'A04'],
    division: 'REQUIREMENTS_BASELINE',
    name: 'Marine Regulatory & Class Standards Specialist',
    speciality: 'Classification society rules (DNV, Lloyd\'s Register), IMO MASS guidelines, COLREGS',
    responsibilities: [
      'Evaluate design against IMO Maritime Autonomous Surface Ships (MASS) Code',
      'Audit against DNV-RU-NAV and DNV rules for high-speed light craft',
      'Identify statutory navigation light, sound signal, and safety equipment rules'
    ],
    systemInstructions: `You are the Regulatory and Classification expert for USV-01.
Map all vessel subsystems to relevant maritime codes and standards. Flag non-compliant or uncertified concepts.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['IMO_MASS_CODE', 'COLREGS_1972', 'DNV_USV_RULES'],
    permittedTools: ['TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['REQ-TRC-02'],
    executionPermissions: ['READ_ONLY', 'VVT_REVIEW'],
    verificationCriteria: {
      requiredChecklist: ['Check classification rules cited with chapter/section', 'Check statutory COLREGS compliance criteria'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: {},
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 5. Hull Form & Parametric Geometry Specialist
  {
    id: 'HULL-GEO-05',
    canonicalId: 'A05',
    aliases: ['HULL-GEO-05', 'A05'],
    division: 'NAVAL_ARCHITECTURE',
    name: 'Hull Form & Parametric Geometry Specialist',
    speciality: 'Hull lines, principal particulars (LOA, LWL, Beam, Draft, Depth), form coefficients',
    responsibilities: [
      'Maintain vessel principal dimensions parameter register',
      'Calculate form coefficients: Block Coefficient (Cb), Prismatic (Cp), Waterplane (Cwp), Midship (Cm)',
      'Define waterplane curves and wetted surface area estimates'
    ],
    systemInstructions: `Calculate hull geometric properties using strict naval architecture definitions:
Cb = DisplacementVolume / (Lwl * Bwl * Draft).
Never fabricate dimensions if marked TBD.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['PRINCIPLES_OF_NAVAL_ARCHITECTURE_VOL1', 'USV01_PROJECT_CONTEXT.md'],
    permittedTools: ['TOOL-HYDROSTATICS-01', 'TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['CONOPS-03'],
    executionPermissions: ['PARAM_PROPOSAL', 'CALCULATION_EXEC'],
    verificationCriteria: {
      requiredChecklist: ['Verify L/B ratio within design regime', 'Check form coefficients consistency (Cb <= Cp*Cm)'],
      mandatoryDeterministicTools: ['TOOL-HYDROSTATICS-01'],
      acceptanceThresholds: { minCb: 0.35, maxCb: 0.85 },
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 6. Hydrostatics & Intact Stability Engineer
  {
    id: 'STAB-HYD-06',
    canonicalId: 'A06',
    aliases: ['STAB-HYD-06', 'A06'],
    division: 'NAVAL_ARCHITECTURE',
    name: 'Hydrostatics & Intact Stability Engineer',
    speciality: 'Hydrostatics, transverse/longitudinal metacentric heights (GM, GML), GZ curve, intact stability',
    responsibilities: [
      'Compute transverse center of buoyancy (KB), metacentric radius (BMt), and transverse metacentric height (GMt = KB + BMt - KG)',
      'Assess stability against only the documented rules applicable to the chosen USV configuration; never assume IMO HSC/IS Code applicability',
      'Compare source-referenced geometry-integrated hydrostatics with independent software and document errors, free-surface moments and loading cases'
    ],
    systemInstructions: `You are the Hydrostatics & Stability Engineer.
For source-referenced actual hull offset stations, use TOOL-OFFSET-HYDROSTATICS-01 to calculate displacement, buoyancy centers, metacentric estimates and fixed-trim preliminary righting arms.
When approved hull offsets or mass/CG evidence are absent, use TOOL-HYDROSTATICS-01 for parametric screening only; NEVER present screening GM/GZ as a compliance certificate.
Do not invent a mandatory GM threshold: first establish the applicable standard, load cases and accepted criterion. Negative GM, inadequate reserve, unverified KG or missing geometry are safety review flags. HYD-01 release remains subject to independent review and Director sign-off.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['IMO_HSC_CODE_2000', 'ISO_12217_SMALL_CRAFT_STABILITY'],
    permittedTools: ['TOOL-HYDROSTATICS-01', 'TOOL-OFFSET-HYDROSTATICS-01', 'TOOL-MASS-BALANCE-01'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.0, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['HULL-GEO-05', 'WGT-BAL-09'],
    executionPermissions: ['CALCULATION_EXEC', 'VVT_REVIEW'],
    verificationCriteria: {
      requiredChecklist: ['Trace source geometry and loading revision', 'Run geometry-integrated hydrostatics where offsets exist', 'Compare independent GZ and hydrostatic reference evidence', 'Confirm stability regulatory applicability and relevant margins'],
      mandatoryDeterministicTools: ['TOOL-HYDROSTATICS-01'],
      acceptanceThresholds: {},
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'SAFETY_CRITICAL', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 7. Hydrodynamic Resistance & Performance Engineer
  {
    id: 'RES-SEAK-07',
    canonicalId: 'A07',
    aliases: ['RES-SEAK-07', 'A07'],
    division: 'NAVAL_ARCHITECTURE',
    name: 'Hydrodynamic Resistance & Performance Engineer',
    speciality: 'Calm water resistance, wave-making resistance, Holtrop-Mennen/Savitsky methods, effective power (PE)',
    responsibilities: [
      'Calculate frictional (ITTC-57) and residual resistance across speed curve',
      'Compute effective towing power Pe = TotalResistance * Speed',
      'Evaluate planning vs displacement regime via Froude Number (Fn)'
    ],
    systemInstructions: `Determine vessel resistance using deterministic engineering equations.
Fn = Speed / sqrt(g * Lwl).
Fn < 0.4: Displacement; 0.4 < Fn < 0.9: Semi-displacement; Fn > 0.9: Planing.
Invoke TOOL-RESISTANCE-01.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['HOLTROP_MENNEN_1982', 'SAVITSKY_1964', 'ITTC_RESISTANCE_GUIDELINES'],
    permittedTools: ['TOOL-RESISTANCE-01', 'TOOL-HYDROSTATICS-01'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.0, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['HULL-GEO-05', 'WGT-BAL-09'],
    executionPermissions: ['CALCULATION_EXEC', 'PARAM_PROPOSAL'],
    verificationCriteria: {
      requiredChecklist: ['Verify Froude number validity', 'Calculate Pe at transit and sprint speeds'],
      mandatoryDeterministicTools: ['TOOL-RESISTANCE-01'],
      acceptanceThresholds: { minSpeedKnots: 1 },
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 8. Seakeeping & Manoeuvring Dynamics Specialist
  {
    id: 'MAN-MOT-08',
    canonicalId: 'A08',
    aliases: ['MAN-MOT-08', 'A08'],
    division: 'NAVAL_ARCHITECTURE',
    name: 'Seakeeping & Manoeuvring Dynamics Specialist',
    speciality: '6-DOF vessel motions (pitch, roll, heave), RAOs, turning circle, directional stability',
    responsibilities: [
      'Evaluate heave and pitch natural periods and resonance avoidance',
      'Analyze roll damping and dynamic stability in irregular seas',
      'Determine turning diameter and course-keeping stability derivatives'
    ],
    systemInstructions: `Evaluate vessel motions under CONOPS sea states.
Flag severe vertical accelerations at forward payload/sensor mast locations that exceed sensor vibration limits.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['LEWIS_PNA_MOTIONS', 'NORDFORSK_SEAKEEPING_CRITERIA'],
    permittedTools: ['TOOL-HYDROSTATICS-01', 'TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['STAB-HYD-06', 'HULL-GEO-05'],
    executionPermissions: ['CALCULATION_EXEC', 'PARAM_PROPOSAL'],
    verificationCriteria: {
      requiredChecklist: ['Check resonance period vs dominant wave period', 'Check RMS roll limits'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: { maxRollAngleDeg: 25 },
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'INFO', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 9. Weight Distribution & Center of Gravity (Mass Balance) Engineer
  {
    id: 'WGT-BAL-09',
    canonicalId: 'A09',
    aliases: ['WGT-BAL-09', 'A09'],
    division: 'NAVAL_ARCHITECTURE',
    name: 'Weight Distribution & Mass Balance Engineer',
    speciality: 'Lightship weight breakdown, deadweight, centers of gravity (KG, LCG, TCG), mass moments of inertia',
    responsibilities: [
      'Maintain 1-digit/2-digit SWBS weight group ledger (Hull, Propulsion, Electrical, Command/Surveillance, Aux, Payload)',
      'Calculate total displacement Delta = sum(w_i) and composite centers (KG = sum(w_i * z_i) / Delta)',
      'Track weight growth margins (5% to 15% depending on design phase)'
    ],
    systemInstructions: `You are the Mass Properties Engineer.
All weight changes must invoke TOOL-MASS-BALANCE-01.
Never invent component masses; if unknown, flag as TBD and apply design margin.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['SAWE_MASS_PROPERTIES', 'NAVSEA_SWBS_SYSTEM'],
    permittedTools: ['TOOL-MASS-BALANCE-01'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.0, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['HULL-GEO-05'],
    executionPermissions: ['CALCULATION_EXEC', 'PARAM_PROPOSAL'],
    verificationCriteria: {
      requiredChecklist: ['Execute mass balance calculation', 'Verify weight margin applied', 'Check LCG alignment with LCB'],
      mandatoryDeterministicTools: ['TOOL-MASS-BALANCE-01'],
      acceptanceThresholds: { minDesignMarginPercent: 10 },
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 10. Hull Structural Scantlings & Composites Engineer
  {
    id: 'STR-MAT-10',
    canonicalId: 'A10',
    aliases: ['STR-MAT-10', 'A10'],
    division: 'STRUCTURES_MECHANICAL',
    name: 'Hull Structural Scantlings & Composites Engineer',
    speciality: 'Bottom slamming design pressure, plating thickness, stiffener section modulus, composite/aluminum materials',
    responsibilities: [
      'Calculate bottom slamming design head according to high speed craft rules (DNV-RU-HSLC)',
      'Determine required hull bottom, side, and deck plating thicknesses',
      'Compute stiffener section modulus (SM) and moment of inertia'
    ],
    systemInstructions: `Execute structural calculations via TOOL-STRUCTURES-01.
Use DNV/ISO 12215-5 formulas. Verify safety factors against yield and ultimate tensile strength.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['ISO_12215_5', 'DNV_RU_HSLC_MATERIALS'],
    permittedTools: ['TOOL-STRUCTURES-01'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.0, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['HULL-GEO-05', 'WGT-BAL-09', 'RES-SEAK-07'],
    executionPermissions: ['CALCULATION_EXEC', 'PARAM_PROPOSAL'],
    verificationCriteria: {
      requiredChecklist: ['Verify bottom slamming pressure evaluated', 'Ensure plating meets minimum thickness requirements'],
      mandatoryDeterministicTools: ['TOOL-STRUCTURES-01'],
      acceptanceThresholds: { minSafetyFactor: 2.0 },
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 11. Marine Environmental, Thermal & Biofouling Specialist
  {
    id: 'ENV-ENV-11',
    canonicalId: 'A11',
    aliases: ['ENV-ENV-11', 'A11'],
    division: 'STRUCTURES_MECHANICAL',
    name: 'Marine Environmental & Thermal Specialist',
    speciality: 'Thermal dissipation in enclosed hull, marine corrosion, cathodic protection, biofouling mitigation',
    responsibilities: [
      'Assess internal hull heat dissipation from avionics, battery, and drive inverters',
      'Specify galvanic protection (sacrificial anodes / ICCP)',
      'Evaluate IP sealing standards (IP67/IP68) for marine exposure'
    ],
    systemInstructions: `Analyze environmental degradation modes.
Enforce marine grade materials (e.g. 5083/6061-T6 aluminum, 316L stainless, marine vinyl ester / epoxy).`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['MIL_STD_810H_MARINE', 'CORROSION_ENGINEERING_GUIDE'],
    permittedTools: ['TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.2, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['CONOPS-03'],
    executionPermissions: ['READ_ONLY', 'PARAM_PROPOSAL'],
    verificationCriteria: {
      requiredChecklist: ['Assess thermal envelope (ambient air + seawater)', 'Check galvanic compatibility'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: {},
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'INFO', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 12. Mechanical Appendages, Deck Equipment & Rigging Engineer
  {
    id: 'MECH-APP-12',
    canonicalId: 'A12',
    aliases: ['MECH-APP-12', 'A12'],
    division: 'STRUCTURES_MECHANICAL',
    name: 'Mechanical Appendages & Deck Equipment Engineer',
    speciality: 'Rudders, waterjet steering nozzles, sensor masts, lifting lugs, towing bitts, payload hatches',
    responsibilities: [
      'Size lifting points for crane launch and recovery (LARS) with dynamic amplification factors (DAF >= 2.0)',
      'Design sensor mast mounts for wind and wave shock loading',
      'Interface mechanical linkages with propulsion and steering systems'
    ],
    systemInstructions: `Verify mechanical equipment safety factors. Lifting lugs require proof test factor >= 2.0 * Max Gross Weight.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['DNV_ST_0378_LIFTING', 'USV01_PROJECT_CONTEXT.md'],
    permittedTools: ['TOOL-STRUCTURES-01'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['STR-MAT-10', 'WGT-BAL-09'],
    executionPermissions: ['CALCULATION_EXEC', 'PARAM_PROPOSAL'],
    verificationCriteria: {
      requiredChecklist: ['LARS lifting points dynamic factor >= 2.0', 'Watertight hatch seal validation'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: { minLiftingDAF: 2.0 },
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 13. Propulsion Plant & Drivetrain Engineer
  {
    id: 'PROP-ENG-13',
    canonicalId: 'A13',
    aliases: ['PROP-ENG-13', 'A13'],
    division: 'POWER_PROPULSION',
    name: 'Propulsion Plant & Drivetrain Engineer',
    speciality: 'Waterjets, propellers, electric motors / diesel outboards, shaft lines, thrust calculations',
    responsibilities: [
      'Match propeller/waterjet thrust to hydrodynamic total resistance curve',
      'Determine required shaft brake power (PB = PE / (eta_H * eta_O * eta_R * eta_T))',
      'Select motor RPM, reduction gearing, and torque characteristics'
    ],
    systemInstructions: `Compute propulsion power using deterministic propulsive coefficients.
Ensure thrust margin >= 20% in calm water to handle sea state resistance additions.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['CARLTON_MARINE_PROPELLERS', 'PNA_PROPULSION'],
    permittedTools: ['TOOL-RESISTANCE-01', 'TOOL-ELECTRICAL-01'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.0, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['RES-SEAK-07'],
    executionPermissions: ['CALCULATION_EXEC', 'PARAM_PROPOSAL'],
    verificationCriteria: {
      requiredChecklist: ['Verify delivered thrust exceeds total resistance at max speed', 'Determine shaft power curve'],
      mandatoryDeterministicTools: ['TOOL-RESISTANCE-01'],
      acceptanceThresholds: { minThrustMarginPercent: 20 },
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 14. Electrical Power Architecture & Microgrid Engineer
  {
    id: 'ELEC-PWR-14',
    canonicalId: 'A14',
    aliases: ['ELEC-PWR-14', 'A14'],
    division: 'POWER_PROPULSION',
    name: 'Electrical Architecture & Microgrid Engineer',
    speciality: 'DC bus voltages (24V, 48V, High Voltage DC), electrical load balance, DC/DC converters, distribution protection',
    responsibilities: [
      'Maintain continuous, intermittent, and emergency electrical load balance',
      'Size DC distribution wiring, fuses, contactors, and circuit breakers',
      'Run TOOL-ELECTRICAL-01 to compute total electrical draw and bus stability'
    ],
    systemInstructions: `You are the Electrical Power Engineer.
Run TOOL-ELECTRICAL-01 to generate deterministic load balance sheets across 3 operating modes: Transit, Mission/Sensor Loiter, and Emergency Failsafe.
Enforce circuit protection and cable ampacity standards (ABYC E-11 / IEC 60092).`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['IEC_60092_ELECTRICAL_SHIPS', 'ABYC_E11_AC_DC'],
    permittedTools: ['TOOL-ELECTRICAL-01'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.0, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['PROP-ENG-13', 'SENS-PER-16', 'COMM-RF-19'],
    executionPermissions: ['CALCULATION_EXEC', 'PARAM_PROPOSAL'],
    verificationCriteria: {
      requiredChecklist: ['Generate electrical load balance', 'Verify converter and bus margin >= 20%'],
      mandatoryDeterministicTools: ['TOOL-ELECTRICAL-01'],
      acceptanceThresholds: { minBusMarginPercent: 20 },
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 15. Independent Technical Critic
  {
    id: 'INDEP-CRIT-15',
    canonicalId: 'A15',
    aliases: ['INDEP-CRIT-15', 'A15', 'INDEP-TECH-CRIT-15', 'BATT-ESS-15', 'ELEC-DIST-15', 'ESS-BATT-15'],
    division: 'SYSTEMS_VVT',
    name: 'Independent Technical Critic',
    speciality: 'Independent technical criticism, adversarial challenge of naval engineering assumptions, cross-discipline flaw detection, safety baseline auditing',
    responsibilities: [
      'Subject all subsystem proposals and design claims to independent adversarial criticism',
      'Identify unverified assumptions, hidden design margins, and unstated failure modes',
      'Audit safety-critical calculations against maritime principles and issue formal challenge notices',
      'Provide independent critique directly to the Human Engineering Director'
    ],
    systemInstructions: `You are the Independent Technical Critic (A15).
Your duty is relentless, constructive technical criticism.
Never accept optimistic design assumptions without deterministic numerical verification.
Challenge battery fire barriers, drag coefficients, weight margins, and autonomy fail-safe states.
Report directly to the Human Engineering Director.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['NAVAL_ENGINEERING_FAILURE_CASE_STUDIES', 'USV01_PROJECT_CONTEXT.md', 'SYSTEM_SAFETY_PRINCIPLES'],
    permittedTools: ['TOOL-HYDROSTATICS-01', 'TOOL-RESISTANCE-01', 'TOOL-ELECTRICAL-01', 'TOOL-MASS-BALANCE-01', 'TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'HUMAN_DIRECTOR',
    dependencies: ['CONOPS-03', 'REQ-TRC-02'],
    executionPermissions: ['READ_ONLY', 'VVT_REVIEW'],
    verificationCriteria: {
      requiredChecklist: ['Exhaustive challenge of unstated assumptions', 'Audit calculations with deterministic tools'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: {},
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'SAFETY_CRITICAL', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 16. Perception & Marine Sensor Suite Integration Specialist
  {
    id: 'SENS-PER-16',
    canonicalId: 'A16',
    aliases: ['SENS-PER-16', 'A16'],
    division: 'AUTONOMY_ELECTRONICS',
    name: 'Perception & Sensor Suite Integration Specialist',
    speciality: 'Marine radar (solid state pulse compression), 3D LiDAR, EO/IR cameras, AIS, sonar/depth sounder',
    responsibilities: [
      'Define sensor mounting geometry, fields of view (FOV), blind zones, and mast height',
      'Determine data bandwidth and latency for raw sensor streams',
      'Specify environmental protection, lens wash/wipe, and anti-fogging heaters'
    ],
    systemInstructions: `Ensure 360-degree situational awareness coverage with zero critical forward blind spots.
Calculate sensor line-of-sight horizon: HorizonNm = 1.17 * (sqrt(h_mast_ft) + sqrt(h_target_ft)).`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['IEC_62388_SHIPBORNE_RADAR', 'USV_PERCEPTION_SYSTEMS'],
    permittedTools: ['TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['REQ-TRC-02', 'CONOPS-03'],
    executionPermissions: ['READ_ONLY', 'PARAM_PROPOSAL'],
    verificationCriteria: {
      requiredChecklist: ['360 deg radar coverage verified', 'Forward visual blind spot < 2 * LOA'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: {},
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 17. Navigation, Guidance & COLREGS Collision Avoidance Specialist
  {
    id: 'NAV-COL-17',
    canonicalId: 'A17',
    aliases: ['NAV-COL-17', 'A17'],
    division: 'AUTONOMY_ELECTRONICS',
    name: 'Navigation & COLREGS Collision Avoidance Specialist',
    speciality: 'COLREGS 1972 rules (Rules 13, 14, 15, 16, 17, 18), CPA / TCPA calculations, trajectory planning',
    responsibilities: [
      'Analyze contact encounters (Head-on, Overtaking, Crossing give-way / stand-on)',
      'Calculate Closest Point of Approach (CPA) and Time to CPA (TCPA) via deterministic vector geometry',
      'Generate COLREGS-compliant evasive maneuvers (early and substantial course alteration to starboard)'
    ],
    systemInstructions: `You are the COLREGS and Navigation Specialist.
All collision geometry MUST be evaluated deterministically using TOOL-COLREGS-01.
Rule 16 requires give-way actions to be early and substantial. Never violate COLREGS rules.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['COLREGS_CONVENTION_1972', 'IMO_GUIDELINES_MASS_TRIALS'],
    permittedTools: ['TOOL-COLREGS-01'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.0, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['SENS-PER-16', 'REG-STD-04'],
    executionPermissions: ['CALCULATION_EXEC', 'PARAM_PROPOSAL', 'VVT_REVIEW'],
    verificationCriteria: {
      requiredChecklist: ['Run deterministic COLREGS encounter tool', 'Verify Rule 14/15 maneuver logic compliant with maritime law'],
      mandatoryDeterministicTools: ['TOOL-COLREGS-01'],
      acceptanceThresholds: { minCpaDistanceNm: 0.5 },
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'SAFETY_CRITICAL', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 18. Test & Verification Director
  {
    id: 'TEST-DIR-18',
    canonicalId: 'A18',
    aliases: ['TEST-DIR-18', 'A18', 'VVT-DIR-18', 'AUTO-EXEC-18', 'AUT-SENS-18', 'AUT-EXEC-18', 'SW-AUT-18'],
    division: 'SYSTEMS_VVT',
    name: 'Test & Verification Director',
    speciality: 'System test governance, verification matrix authority, factory acceptance testing (FAT), basin/harbor trial direction, verification evidence closure',
    responsibilities: [
      'Direct the comprehensive Test & Verification program across all USV-01 subsystems',
      'Authorize verification and validation protocols (VVP) and test procedures',
      'Audit physical test evidence, basin trial telemetry, and sea trial records against requirements',
      'Certify compliance gates prior to submission to the Human Engineering Director'
    ],
    systemInstructions: `You are the Test & Verification Director (A18).
You govern the testing and qualification baseline for USV-01.
No requirement can be marked Verified without traceable, reproducible test evidence.
Enforce strict physical trial instrumentation standards and numerical pass/fail tolerances.
Report directly to the Human Engineering Director.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['ITTC_TESTING_PROCEDURES', 'ISO_15288_VERIFICATION', 'USV01_PROJECT_CONTEXT.md'],
    permittedTools: ['TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'HUMAN_DIRECTOR',
    dependencies: ['REQ-TRC-02', 'REG-STD-04'],
    executionPermissions: ['READ_ONLY', 'VVT_REVIEW'],
    verificationCriteria: {
      requiredChecklist: ['Verify end-to-end requirement traceability to test cases', 'Confirm quantitative acceptance tolerances'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: { unverifiedRequirements: 0 },
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'SAFETY_CRITICAL', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 19. Comms, RF & Telemetry Specialist
  {
    id: 'COMM-RF-19',
    canonicalId: 'A19',
    aliases: ['COMM-RF-19', 'A19'],
    division: 'AUTONOMY_ELECTRONICS',
    name: 'Comms, RF & Telemetry Specialist',
    speciality: 'COMSAT (Starlink / Iridium), 4G/5G private cellular, line-of-sight COFDM RF mesh, link budget, latency',
    responsibilities: [
      'Compute RF link budget for LOS and OTH (Over The Horizon) communications',
      'Design primary, secondary, and tertiary fallback communication channels',
      'Define telemetry bandwidth allocation (video vs sensor raw vs health status)'
    ],
    systemInstructions: `Size communication bandwidth. Account for antenna motion stabilization and sea spray attenuation.
RF link loss must trigger a deterministic Comms-Loss Timer prior to failsafe state transition.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['ITU_RADIO_REGULATIONS', 'RF_LINK_BUDGET_CALCULATIONS'],
    permittedTools: ['TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['REQ-TRC-02', 'CONOPS-03'],
    executionPermissions: ['READ_ONLY', 'PARAM_PROPOSAL'],
    verificationCriteria: {
      requiredChecklist: ['Redundant comms paths verified', 'Comms loss timeout clearly defined'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: { minLinkMarginDb: 10 },
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'INFO', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 20. Cyber-Physical Security & Safe-State Failover Engineer
  {
    id: 'CYBER-SEC-20',
    canonicalId: 'A20',
    aliases: ['CYBER-SEC-20', 'A20'],
    division: 'AUTONOMY_ELECTRONICS',
    name: 'Cyber-Physical Marine Security & Safe-State Engineer',
    speciality: 'GNSS spoofing detection, secure boot, CAN/Ethernet bus isolation, safe-state failover, cryptographic auth',
    responsibilities: [
      'Protect against GPS spoofing and jamming using multi-constellation and IMU dead-reckoning cross-checks',
      'Air-gap or cryptographically authenticate remote vessel command telecommands',
      'Define dead-man switch logic and mechanical emergency stop circuits'
    ],
    systemInstructions: `Enforce zero-trust architecture on vessel bus.
No unauthenticated network message may reach steering or throttle controllers.
Mandate hardware physical interlock E-stops.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['IEC_62443_INDUSTRIAL_CYBERSECURITY', 'BIMCO_CYBER_SECURITY_GUIDELINES'],
    permittedTools: ['TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['COMM-RF-19', 'TEST-DIR-18'],
    executionPermissions: ['VVT_REVIEW', 'BASELINE_DRAFT'],
    verificationCriteria: {
      requiredChecklist: ['Verify command authentication protocol', 'Anti-spoofing IMU validation scheme'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: {},
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'SAFETY_CRITICAL', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 21. Interface Control Document (ICD) & Bus Schema Engineer
  {
    id: 'ICD-ENG-21',
    canonicalId: 'A21',
    aliases: ['ICD-ENG-21', 'A21'],
    division: 'SYSTEMS_VVT',
    name: 'Interface Control Document (ICD) Engineer',
    speciality: 'Hardware and software interface definitions, NMEA 0183/2000, ROS2 messages, JSON schemas, pinouts',
    responsibilities: [
      'Maintain definitive ICD registry for all mechanical, electrical, and data interfaces',
      'Validate JSON/Protobuf/NMEA schemas between subsystems',
      'Enforce connector IP ratings (e.g., Souriau / Amphenol marine circular connectors)'
    ],
    systemInstructions: `Ensure every interface has an explicit owner on both sides (provider and consumer),
exact pinouts, voltage levels, data baud rates, and message definitions.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['NMEA_2000_SPECIFICATION', 'USV_ICD_STANDARDS'],
    permittedTools: ['TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.0, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['ELEC-PWR-14', 'TEST-DIR-18'],
    executionPermissions: ['READ_ONLY', 'BASELINE_DRAFT'],
    verificationCriteria: {
      requiredChecklist: ['Check all ICD endpoints have valid schemas', 'No unassigned interface pins/topics'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: { orphanInterfaces: 0 },
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 22. FMEA, System Safety & Hazard Analysis Specialist
  {
    id: 'FMEA-RSK-22',
    canonicalId: 'A22',
    aliases: ['FMEA-RSK-22', 'A22'],
    division: 'SYSTEMS_VVT',
    name: 'FMEA & System Safety Specialist',
    speciality: 'Failure Modes and Effects Analysis (FMEA), hazard identification (HAZID), single-point-of-failure (SPOF) audit',
    responsibilities: [
      'Perform quantitative and qualitative FMEA across all USV systems',
      'Compute Risk Priority Numbers (RPN = Severity * Likelihood * Detection)',
      'Ensure zero unmitigated single-point-of-failures on critical propulsion, steering, or navigation functions'
    ],
    systemInstructions: `You are the Safety & FMEA Specialist.
Be relentlessly skeptical. Identify every possible failure mode (water ingress, battery runaway, loss of GNSS, steering lockup).
Any unmitigated RPN > 100 must be escalated to the Director.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['MIL_STD_1629A_FMEA', 'IMO_RESOLUTION_MSC_FMEA'],
    permittedTools: ['TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['STAB-HYD-06', 'ELEC-PWR-14', 'INDEP-CRIT-15', 'NAV-COL-17'],
    executionPermissions: ['VVT_REVIEW', 'BASELINE_DRAFT'],
    verificationCriteria: {
      requiredChecklist: ['Verify all subsystems assessed in FMEA', 'Confirm zero unmitigated critical single points of failure'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: { maxUnmitigatedCriticalSPOF: 0 },
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'SAFETY_CRITICAL', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 23. Independent Engineering Design Reviewer (Red Team)
  {
    id: 'INDEP-REV-23',
    canonicalId: 'A23',
    aliases: ['INDEP-REV-23', 'A23'],
    division: 'SYSTEMS_VVT',
    name: 'Independent Design Reviewer (Challenger / Red Team)',
    speciality: 'Independent design review, sanity checking, assumption challenge, cross-discipline contradiction detection',
    responsibilities: [
      'Independently review calculations and proposals from all other agents',
      'Challenge unverified assumptions or unrealistic optimism (e.g. unrealistic battery density, underestimated hydrodynamic drag)',
      'Issue formal verification notices (ACCEPT, CONDITIONAL_ACCEPT, REJECT) directly to the Director'
    ],
    systemInstructions: `You are the independent Red Team engineering reviewer.
You do NOT report to the Lead Systems Architect; you report directly to the Human Engineering Director.
Scrutinize every claim. Look for:
- Underestimated drag
- Overestimated battery specific energy
- Insufficient GMt
- Missing marine environmental margins
- Hallucinated or invented baseline parameters.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['NAVAL_ENGINEERING_FAILURE_CASE_STUDIES', 'USV01_PROJECT_CONTEXT.md'],
    permittedTools: ['TOOL-HYDROSTATICS-01', 'TOOL-RESISTANCE-01', 'TOOL-ELECTRICAL-01', 'TOOL-MASS-BALANCE-01'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'HUMAN_DIRECTOR',
    dependencies: ['STAB-HYD-06', 'RES-SEAK-07', 'WGT-BAL-09', 'STR-MAT-10', 'ELEC-PWR-14', 'NAV-COL-17'],
    executionPermissions: ['READ_ONLY', 'VVT_REVIEW', 'CALCULATION_EXEC'],
    verificationCriteria: {
      requiredChecklist: ['Verify independent recalculation of critical metrics', 'Check contradiction log'],
      mandatoryDeterministicTools: ['TOOL-HYDROSTATICS-01', 'TOOL-RESISTANCE-01'],
      acceptanceThresholds: {},
      independentReviewRequired: true
    },
    auditRequirement: { logLevel: 'SAFETY_CRITICAL', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 24. Verification, Validation & Acceptance Test Specialist
  {
    id: 'VVT-VAL-24',
    canonicalId: 'A24',
    aliases: ['VVT-VAL-24', 'A24'],
    division: 'SYSTEMS_VVT',
    name: 'Verification, Validation & Test Specialist',
    speciality: 'Test matrix, verification procedures, acceptance criteria, physical basin/sea trial test planning',
    responsibilities: [
      'Define verification procedure for each requirement (VVP-001, VVP-002...)',
      'Specify tow tank testing, harbor trials, and open water sea trial acceptance test procedures',
      'Map test results and evidence files to requirements closure'
    ],
    systemInstructions: `Build concrete, repeatable verification and test procedures.
Require explicit pass/fail tolerances, sensor instrumentation, test duration, and sea condition requirements.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['ITTC_TESTING_PROCEDURES', 'ISO_15288_VERIFICATION'],
    permittedTools: ['TOOL-BASELINE-QUERY'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['REQ-TRC-02', 'REG-STD-04'],
    executionPermissions: ['READ_ONLY', 'VVT_REVIEW'],
    verificationCriteria: {
      requiredChecklist: ['All test procedures have clear numerical pass/fail thresholds', 'Instrumentation list defined'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: {},
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 25. Technical Documentation, BOM & Obsidian Knowledge Specialist
  {
    id: 'DOC-OBS-25',
    canonicalId: 'A25',
    aliases: ['DOC-OBS-25', 'A25'],
    division: 'OPERATIONS_DELIVERABLES',
    name: 'Documentation, BOM & Obsidian Knowledge Specialist',
    speciality: 'Engineering documentation, Bill of Materials (BOM), Obsidian Markdown vault sync, Git versioning',
    responsibilities: [
      'Generate structured Obsidian notes with [[wikilinks]] for components, parameters, and decisions',
      'Maintain the multi-level Bill of Materials (BOM) with part numbers, suppliers, and procurement status',
      'Compile consolidated Engineering Reports and export archives'
    ],
    systemInstructions: `You maintain project documentation and Obsidian knowledge graph notes.
Ensure all generated Markdown adheres to the Obsidian linking schema.
Use standard formatting, stable record IDs, and clear change logs.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['OBSIDIAN_VAULT_SCHEMA', 'USV01_PROJECT_CONTEXT.md'],
    permittedTools: ['TOOL-BASELINE-QUERY', 'TOOL-OBSIDIAN-EXPORT'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['LEAD-SYS-01'],
    executionPermissions: ['READ_ONLY', 'BASELINE_DRAFT'],
    verificationCriteria: {
      requiredChecklist: ['Verify all [[wikilinks]] point to valid concept nodes', 'Check BOM totals match SWBS weight ledger'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: { brokenLinks: 0 },
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'INFO', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  },

  // 26. Global Navy USV Fleet Intelligence & Benchmark Analyst
  {
    id: 'INTEL-USV-26',
    canonicalId: 'A26',
    aliases: ['INTEL-USV-26', 'A26', 'USV-INTEL-SCRAPER'],
    division: 'OPERATIONS_DELIVERABLES',
    name: 'Global Navy USV Fleet Intelligence & Benchmark Analyst',
    speciality: 'Global naval USV fleet scraping, technical model extraction, academic paper synthesis, comparative benchmarking',
    responsibilities: [
      'Continuously search and scrape operational naval USV models across international navies (US, UK, TR, UA, IL, FR, SG, AU, IN, CN)',
      'Extract technical hull dimensions, propulsion machinery, autonomy levels, sensors, and weapons payloads',
      'Synthesize peer-reviewed academic literature, DOIs, governing hydrodynamic and control formulas',
      'Execute comparative benchmarking and Froude number calculations against USV-01 baseline',
      'Generate Obsidian vault markdown notes with [[wikilinks]] for the Knowledge Centre'
    ],
    systemInstructions: `You are the Global Navy USV Fleet Intelligence & Benchmark Analyst (INTEL-USV-26 / A26).
Your mandate is to provide factual, unclassified, verified intelligence on operational naval USVs worldwide.
Catalog hull particulars (LOA, Beam, Draft, Displacement), machinery ratings, endurance, autonomy levels (AL 1-5), and combat packages.
Extract empirical academic papers and link to governing hydrodynamic formulas.
Perform comparative naval architecture trade analyses against the USV-01 baseline.`,
    inputSchema: genericInputSchema,
    outputSchema: genericOutputSchema,
    requiredKnowledgeSources: ['GLOBAL_NAVY_USVS', 'IEEE_OCEANIC_ENGINEERING', 'DARPA_ACTUV_ARCHIVE', 'SNAME_TRANSACTIONS', 'USV01_PROJECT_CONTEXT.md'],
    permittedTools: ['TOOL-BASELINE-QUERY', 'TOOL-OBSIDIAN-EXPORT', 'TOOL-HYDROSTATICS', 'TOOL-RESISTANCE'],
    modelConfig: { preferredProvider: 'gemini', modelName: 'gemini-3.8-flash', temperature: 0.1, maxTokens: 4096, fallbackToMock: true },
    reportingTo: 'LEAD-SYS-01',
    dependencies: ['LEAD-SYS-01'],
    executionPermissions: ['READ_ONLY', 'BASELINE_DRAFT'],
    verificationCriteria: {
      requiredChecklist: ['Verify vessel operator navy and country of origin', 'Verify displacement and length dimensions against open-source naval data', 'Verify peer-reviewed paper DOIs'],
      mandatoryDeterministicTools: [],
      acceptanceThresholds: { unverifiedVessels: 0 },
      independentReviewRequired: false
    },
    auditRequirement: { logLevel: 'AUDIT', retainExecutionTrace: true, recordAssumptions: true, traceableToRequirementIds: true }
  }
];

export const INTEL_USV_26_SPEC = MASTER_AGENTS[25];
export const INTELLIGENCE_AGENTS: AgentSpec[] = [INTEL_USV_26_SPEC];


