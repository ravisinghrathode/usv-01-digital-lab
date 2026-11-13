import type { EngineeringParameter, ArchitectureDecisionRecord, RiskEntry } from '../types/memory.ts';
import { AuditLogger } from '../safety/AuditLogger.ts';

export class SharedMemory {
  private static instance: SharedMemory;
  private parameters: Map<string, EngineeringParameter> = new Map();
  private adrs: Map<string, ArchitectureDecisionRecord> = new Map();
  private risks: Map<string, RiskEntry> = new Map();
  private auditLogger = AuditLogger.getInstance();
  private parameterListeners: Set<(param: EngineeringParameter) => void> = new Set();

  private constructor() {
    this.seedDefaultBaseline();
  }

  public static getInstance(): SharedMemory {
    if (!SharedMemory.instance) {
      SharedMemory.instance = new SharedMemory();
    }
    return SharedMemory.instance;
  }

  private seedDefaultBaseline(): void {
    // Rev 0.4 is an unverified historical proposal, NOT the controlled Gate 0 baseline.
    // This browser memory seeds illustrative values only and cannot release engineering.
    const starterParams: EngineeringParameter[] = [
      {
        id: 'USV-SYS-001',
        key: 'CONOPS_MISSION_PROFILE',
        name: 'Mission Profile & CONOPS',
        discipline: 'SYS',
        value: 'Littoral Patrol, Harbor Surveillance & Acoustic Anti-Submarine Loiter',
        unit: 'string',
        sourceDocOrCalculation: 'USV01_PROJECT_CONTEXT.md Rev 0.4 (historical, unverified)',
        status: 'ASSUMED',
        assumptions: ['HISTORICAL UNVERIFIED CONCEPT INPUT — NOT AN AUTHENTICATED VESSEL BASELINE.', 'Operating envelope: Sea State 3-4, 14 kt cruise, 22 kt sprint'],
        lastModifiedByAgent: 'LEAD-SYS-01',
        lastUpdatedAt: new Date().toISOString(),
        revision: 4
      },
      {
        id: 'USV-NA-001',
        key: 'PRINCIPAL_DIMENSIONS_LOA',
        name: 'Length Overall (LOA)',
        discipline: 'NA',
        value: 10.5,
        unit: 'meters',
        sourceDocOrCalculation: 'USV01_PROJECT_CONTEXT.md Rev 0.4 (historical, unverified)',
        status: 'ASSUMED',
        assumptions: ['HISTORICAL UNVERIFIED CONCEPT INPUT — NOT AN AUTHENTICATED VESSEL BASELINE.', '10.5m Planing Monohull with 19° deadrise'],
        lastModifiedByAgent: 'HULL-GEO-05',
        lastUpdatedAt: new Date().toISOString(),
        revision: 4
      },
      {
        id: 'USV-NA-002',
        key: 'PRINCIPAL_DIMENSIONS_BEAM',
        name: 'Beam Overall (B)',
        discipline: 'NA',
        value: 2.9,
        unit: 'meters',
        sourceDocOrCalculation: 'USV01_PROJECT_CONTEXT.md Rev 0.4 (historical, unverified)',
        status: 'ASSUMED',
        assumptions: ['HISTORICAL UNVERIFIED CONCEPT INPUT — NOT AN AUTHENTICATED VESSEL BASELINE.', 'Molded beam 2.90m, waterline beam 2.68m'],
        lastModifiedByAgent: 'HULL-GEO-05',
        lastUpdatedAt: new Date().toISOString(),
        revision: 4
      },
      {
        id: 'USV-NA-003',
        key: 'DESIGN_DRAFT',
        name: 'Full Load Design Draft (T)',
        discipline: 'NA',
        value: 0.65,
        unit: 'meters',
        sourceDocOrCalculation: 'USV01_PROJECT_CONTEXT.md Rev 0.4 (historical, unverified)',
        status: 'ASSUMED',
        assumptions: ['HISTORICAL UNVERIFIED CONCEPT INPUT — NOT AN AUTHENTICATED VESSEL BASELINE.', 'Design draft 0.65m; 0.80m freeboard above waterline'],
        lastModifiedByAgent: 'HULL-GEO-05',
        lastUpdatedAt: new Date().toISOString(),
        revision: 4
      },
      {
        id: 'USV-NA-004',
        key: 'FULL_LOAD_DISPLACEMENT',
        name: 'Full Load Displacement',
        discipline: 'NA',
        value: 6.2,
        unit: 'tonnes',
        sourceDocOrCalculation: 'USV01_PROJECT_CONTEXT.md Rev 0.4 (historical, unverified)',
        status: 'ASSUMED',
        assumptions: ['HISTORICAL UNVERIFIED CONCEPT INPUT — NOT AN AUTHENTICATED VESSEL BASELINE.', '6.20 tonnes full load; 8.52 tonnes reserve buoyancy'],
        lastModifiedByAgent: 'WGT-BAL-09',
        lastUpdatedAt: new Date().toISOString(),
        revision: 4
      },
      {
        id: 'USV-NA-005',
        key: 'TRANSVERSE_GMT',
        name: 'Transverse Metacentric Height (GMt)',
        discipline: 'NA',
        value: 1.32,
        unit: 'meters',
        sourceDocOrCalculation: 'USV01_PROJECT_CONTEXT.md Rev 0.4 (historical, unverified)',
        status: 'ASSUMED',
        assumptions: ['HISTORICAL UNVERIFIED CONCEPT INPUT — NOT AN AUTHENTICATED VESSEL BASELINE.', 'Historical, UNVERIFIED claim: GMt 1.32m; compliance not assessed'],
        lastModifiedByAgent: 'STAB-HYD-06',
        lastUpdatedAt: new Date().toISOString(),
        revision: 4
      },
      {
        id: 'USV-NA-006',
        key: 'CENTER_OF_GRAVITY_KG',
        name: 'Vertical Center of Gravity (KG)',
        discipline: 'NA',
        value: 0.66,
        unit: 'meters',
        sourceDocOrCalculation: 'USV01_PROJECT_CONTEXT.md Rev 0.4 (historical, unverified)',
        status: 'ASSUMED',
        assumptions: ['HISTORICAL UNVERIFIED CONCEPT INPUT — NOT AN AUTHENTICATED VESSEL BASELINE.', 'Lowered by keel-mounted 54 kWh battery bank'],
        lastModifiedByAgent: 'WGT-BAL-09',
        lastUpdatedAt: new Date().toISOString(),
        revision: 4
      },
      {
        id: 'USV-PROP-001',
        key: 'TARGET_MAX_SPEED',
        name: 'Maximum Sprint Speed',
        discipline: 'PROP',
        value: 22.0,
        unit: 'knots',
        sourceDocOrCalculation: 'USV01_PROJECT_CONTEXT.md Rev 0.4 (historical, unverified)',
        status: 'ASSUMED',
        assumptions: ['HISTORICAL UNVERIFIED CONCEPT INPUT — NOT AN AUTHENTICATED VESSEL BASELINE.', 'Fn = 1.115 planing regime; Rt = 10.45 kN'],
        lastModifiedByAgent: 'PROP-ENG-13',
        lastUpdatedAt: new Date().toISOString(),
        revision: 4
      },
      {
        id: 'USV-PROP-002',
        key: 'CRUISE_SPEED',
        name: 'Nominal Cruising Speed',
        discipline: 'PROP',
        value: 14.0,
        unit: 'knots',
        sourceDocOrCalculation: 'USV01_PROJECT_CONTEXT.md Rev 0.4 (historical, unverified)',
        status: 'ASSUMED',
        assumptions: ['HISTORICAL UNVERIFIED CONCEPT INPUT — NOT AN AUTHENTICATED VESSEL BASELINE.', 'Patrol endurance profile; Pe = 38.4 kW'],
        lastModifiedByAgent: 'PROP-ENG-13',
        lastUpdatedAt: new Date().toISOString(),
        revision: 4
      },
      {
        id: 'USV-ELEC-001',
        key: 'BATTERY_STORAGE_CAPACITY',
        name: 'Main Battery Pack Capacity',
        discipline: 'ELEC',
        value: 54.0,
        unit: 'kWh',
        sourceDocOrCalculation: 'USV01_PROJECT_CONTEXT.md Rev 0.4 (historical, unverified)',
        status: 'ASSUMED',
        assumptions: ['HISTORICAL UNVERIFIED CONCEPT INPUT — NOT AN AUTHENTICATED VESSEL BASELINE.', '48V DC bus, LiFePO4 chemistry with thermal containment'],
        lastModifiedByAgent: 'BATT-ESS-15',
        lastUpdatedAt: new Date().toISOString(),
        revision: 4
      }
    ];

    for (const p of starterParams) {
      this.parameters.set(p.id, p);
    }

    // Default ADRs
    this.adrs.set('ADR-001', {
      id: 'ADR-001',
      title: 'Deterministic Engineering vs Probabilistic LLM Separation',
      discipline: 'SYS',
      status: 'APPROVED',
      context: 'Naval engineering calculations (hydrostatics, stability, power) cannot rely on hallucinated LLM text.',
      decision: 'All mathematical and naval calculations must execute via verified deterministic tools. LLM agents act as workflow coordinators.',
      consequences: [
        'Calculations are 100% reproducible and verifiable',
        'Zod schemas validate numerical bounds at runtime',
        'Direct human authority required for safety-critical state transitions'
      ],
      proposedByAgent: 'LEAD-SYS-01',
      approvedBy: 'ENGINEERING_DIRECTOR',
      date: '2026-11-11'
    });

    this.adrs.set('ADR-002', {
      id: 'ADR-002',
      title: 'Historical 25-Agent Architecture Record (Superseded by 26-Agent Registry)',
      discipline: 'SYS',
      status: 'SUPERSEDED',
      context: 'Historical 25-agent process assertion, superseded by the current 26-agent registry; not proof of authenticated Director vessel design approval or engineering release.',
      decision: 'Formally accept the 25-agent architecture, verification test suite (22/22 pass), and baseline governance as the definitive USV-01 digital engineering lab.',
      consequences: [
        'All 25 agents locked to master registry baseline rev 1.0',
        'Unknown vessel parameters preserved as TBD until physical test data baselined',
        'Physical vessel actuator air-gap permanently enforced'
      ],
      proposedByAgent: 'INDEP-REV-23',
      approvedBy: 'ENGINEERING_DIRECTOR',
      date: '2026-11-11'
    });

    this.adrs.set('ADR-004', {
      id: 'ADR-004',
      title: 'Closed-Loop Agent-to-Simulation Synthesis',
      discipline: 'SYS',
      status: 'APPROVED',
      context: 'When agents calculate boat design parameters, the visual 3D model and realtime simulation of the boat must immediately and automatically reflect those found values without manual disconnects or static placeholders.',
      decision: 'Mandate reactive synchronization between agent outputs in SharedMemory and all visual simulation components (3D hull geometry, 6-DOF flotation wave tank, and radar COLREGS kinematics).',
      consequences: [
        'Eliminates placeholder and unlinked simulation states',
        'Provides real-time visual proof of agent-engineered physics and stability',
        'Directly couples deterministic naval calculations to live visual twin'
      ],
      proposedByAgent: 'LEAD-SYS-01',
      approvedBy: 'ENGINEERING_DIRECTOR',
      date: '2026-11-12'
    });

    // Default Risk
    this.risks.set('RSK-001', {
      id: 'RSK-001',
      title: 'Transverse Intact Stability Deficiency in Irregular High Sea States',
      category: 'SAFETY',
      severity: 5,
      likelihood: 2,
      mitigationStrategy: 'Enforce GMt >= 0.35m minimum and mandatory dynamic GZ righting arm evaluation per ISO 12217-5 before approval.',
      status: 'OPEN',
      ownerAgentId: 'STAB-HYD-06'
    });
  }

  public subscribe(callback: (param: EngineeringParameter) => void): () => void {
    this.parameterListeners.add(callback);
    return () => {
      this.parameterListeners.delete(callback);
    };
  }

  private notifyListeners(param: EngineeringParameter): void {
    for (const listener of this.parameterListeners) {
      try {
        listener(param);
      } catch (err) {
        console.error('Error in SharedMemory subscriber:', err);
      }
    }
  }

  // Untrusted browser cache: only authenticated controlled evidence and human
  // authorization can establish an approved vessel baseline.
  private rejectClientApproval(status: EngineeringParameter['status']): void {
    if (status === 'APPROVED' || status === 'DIRECTOR_APPROVED') {
      throw new Error('Client-side SharedMemory cannot approve engineering parameters; use controlled Gate 0 evidence and human authority.');
    }
  }

  public getParameter(id: string): EngineeringParameter | undefined {
    const value = this.parameters.get(id);
    return value ? structuredClone(value) : undefined;
  }

  public getAllParameters(): EngineeringParameter[] {
    return Array.from(this.parameters.values(), value => structuredClone(value));
  }

  public updateParameter(
    id: string,
    updates: Partial<EngineeringParameter>,
    modifyingAgentId: string
  ): EngineeringParameter {
    const existing = this.parameters.get(id);
    if (!existing) {
      throw new Error(`Parameter '${id}' does not exist.`);
    }
    this.rejectClientApproval(existing.status);
    this.rejectClientApproval(updates.status ?? existing.status);

    // Create immutable revision
    const revised: EngineeringParameter = {
      ...existing,
      ...updates,
      id: existing.id,
      revision: existing.revision + 1,
      lastModifiedByAgent: modifyingAgentId,
      lastUpdatedAt: new Date().toISOString()
    };

    this.parameters.set(id, structuredClone(revised));

    this.auditLogger.log({
      severity: 'INFO',
      agentId: modifyingAgentId,
      action: 'PARAMETER_UPDATED',
      details: {
        parameterId: id,
        previousValue: existing.value,
        newValue: revised.value,
        status: revised.status,
        revision: revised.revision
      }
    });

    this.notifyListeners(structuredClone(revised));

    return structuredClone(revised);
  }

  public addParameter(param: EngineeringParameter): void {
    if (this.parameters.has(param.id)) {
      throw new Error(`Parameter with ID '${param.id}' already exists.`);
    }
    this.rejectClientApproval(param.status);
    this.parameters.set(param.id, structuredClone(param));
    this.notifyListeners(structuredClone(param));
  }

  public getAllAdrs(): ArchitectureDecisionRecord[] {
    return Array.from(this.adrs.values());
  }

  public addAdr(adr: ArchitectureDecisionRecord): void {
    this.adrs.set(adr.id, adr);
  }

  public getAllRisks(): RiskEntry[] {
    return Array.from(this.risks.values());
  }

  public addRisk(risk: RiskEntry): void {
    this.risks.set(risk.id, risk);
  }

  /**
   * Generates Obsidian-compatible Markdown vault notes with [[wikilinks]]
   */
  public exportObsidianVault(): Record<string, string> {
    const files: Record<string, string> = {};

    // 1. Master index note
    files['USV-01_Digital_Lab_Index.md'] = `# USV-01 Digital Engineering Lab — Knowledge Graph
**Revision Date:** ${new Date().toISOString().split('T')[0]}
**Engineering authority:** NONE IN THIS CLIENT-SIDE EXPORT; [[Engineering Director]] approval requires controlled Gate 0 evidence and authenticated human decision.

## Historical / Exploratory Parameter Register (UNVERIFIED)
${Array.from(this.parameters.values()).map(p => `- [[${p.id}]]: ${p.name} = **${p.value} ${p.unit}** (Status: \`${p.status}\`)`).join('\n')}

## Architecture Decisions
${Array.from(this.adrs.values()).map(a => `- [[${a.id}]]: ${a.title} (\`${a.status}\`)`).join('\n')}

## Risk Register
${Array.from(this.risks.values()).map(r => `- [[${r.id}]]: ${r.title} (Severity: ${r.severity}, Likelihood: ${r.likelihood})`).join('\n')}
`;

    // 2. Individual Parameter Notes
    for (const p of this.parameters.values()) {
      files[`${p.id}.md`] = `# ${p.id} — ${p.name}
- **Discipline:** \`${p.discipline}\`
- **Current Value:** ${p.value} ${p.unit}
- **Evidence class:** UI historical or exploratory only; not an authenticated engineering baseline
- **Status:** \`${p.status}\`
- **Revision:** ${p.revision}
- **Owner Agent:** [[${p.lastModifiedByAgent}]]
- **Updated:** ${p.lastUpdatedAt}

## Assumptions
${p.assumptions.length > 0 ? p.assumptions.map(a => `- ${a}`).join('\n') : '*No unverified assumptions recorded.*'}
`;
    }

    return files;
  }
}
