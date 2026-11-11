import { EngineeringParameter, ArchitectureDecisionRecord, RiskEntry } from '../types/memory.ts';
import { AuditLogger } from '../safety/AuditLogger.ts';

export class SharedMemory {
  private static instance: SharedMemory;
  private parameters: Map<string, EngineeringParameter> = new Map();
  private adrs: Map<string, ArchitectureDecisionRecord> = new Map();
  private risks: Map<string, RiskEntry> = new Map();
  private auditLogger = AuditLogger.getInstance();

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
    // Baseline parameters according to USV01_PROJECT_CONTEXT.md
    const starterParams: EngineeringParameter[] = [
      {
        id: 'USV-SYS-001',
        key: 'CONOPS_MISSION_PROFILE',
        name: 'Mission Profile & CONOPS',
        discipline: 'SYS',
        value: 'TBD',
        unit: 'string',
        status: 'TBD',
        assumptions: ['Operating envelope and payload not yet baselined by Engineering Director'],
        lastModifiedByAgent: 'LEAD-SYS-01',
        lastUpdatedAt: new Date().toISOString(),
        revision: 1
      },
      {
        id: 'USV-NA-001',
        key: 'PRINCIPAL_DIMENSIONS_LOA',
        name: 'Length Overall (LOA)',
        discipline: 'NA',
        value: 'TBD',
        unit: 'meters',
        status: 'TBD',
        assumptions: ['Treat unknown vessel particulars as TBD per governance rules'],
        lastModifiedByAgent: 'HULL-GEO-05',
        lastUpdatedAt: new Date().toISOString(),
        revision: 1
      },
      {
        id: 'USV-NA-002',
        key: 'PRINCIPAL_DIMENSIONS_BEAM',
        name: 'Beam Overall (B)',
        discipline: 'NA',
        value: 'TBD',
        unit: 'meters',
        status: 'TBD',
        assumptions: [],
        lastModifiedByAgent: 'HULL-GEO-05',
        lastUpdatedAt: new Date().toISOString(),
        revision: 1
      },
      {
        id: 'USV-NA-003',
        key: 'DESIGN_DRAFT',
        name: 'Full Load Design Draft (T)',
        discipline: 'NA',
        value: 'TBD',
        unit: 'meters',
        status: 'TBD',
        assumptions: [],
        lastModifiedByAgent: 'HULL-GEO-05',
        lastUpdatedAt: new Date().toISOString(),
        revision: 1
      },
      {
        id: 'USV-NA-004',
        key: 'FULL_LOAD_DISPLACEMENT',
        name: 'Full Load Displacement',
        discipline: 'NA',
        value: 'TBD',
        unit: 'tonnes',
        status: 'TBD',
        assumptions: [],
        lastModifiedByAgent: 'WGT-BAL-09',
        lastUpdatedAt: new Date().toISOString(),
        revision: 1
      },
      {
        id: 'USV-PROP-001',
        key: 'TARGET_MAX_SPEED',
        name: 'Maximum Sprint Speed',
        discipline: 'PROP',
        value: 'TBD',
        unit: 'knots',
        status: 'TBD',
        assumptions: [],
        lastModifiedByAgent: 'PROP-ENG-13',
        lastUpdatedAt: new Date().toISOString(),
        revision: 1
      },
      {
        id: 'USV-ELEC-001',
        key: 'BATTERY_STORAGE_CAPACITY',
        name: 'Main Battery Pack Capacity',
        discipline: 'ELEC',
        value: 'TBD',
        unit: 'kWh',
        status: 'TBD',
        assumptions: [],
        lastModifiedByAgent: 'BATT-ESS-15',
        lastUpdatedAt: new Date().toISOString(),
        revision: 1
      }
    ];

    for (const p of starterParams) {
      this.parameters.set(p.id, p);
    }

    // Default ADR
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

  public getParameter(id: string): EngineeringParameter | undefined {
    return this.parameters.get(id);
  }

  public getAllParameters(): EngineeringParameter[] {
    return Array.from(this.parameters.values());
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

    // Create immutable revision
    const revised: EngineeringParameter = {
      ...existing,
      ...updates,
      id: existing.id,
      revision: existing.revision + 1,
      lastModifiedByAgent: modifyingAgentId,
      lastUpdatedAt: new Date().toISOString()
    };

    this.parameters.set(id, revised);

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

    return revised;
  }

  public addParameter(param: EngineeringParameter): void {
    if (this.parameters.has(param.id)) {
      throw new Error(`Parameter with ID '${param.id}' already exists.`);
    }
    this.parameters.set(param.id, param);
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
**Authority:** [[Engineering Director]]

## Baseline Registers
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
