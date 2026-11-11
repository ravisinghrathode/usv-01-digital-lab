export type ParameterStatus = 'TBD' | 'ESTIMATE' | 'ASSUMED' | 'CALCULATED' | 'DIRECTOR_APPROVED';

export interface EngineeringParameter {
  id: string; // e.g. 'PARAM-LOA', 'PARAM-DISPL'
  key: string;
  name: string;
  discipline: string;
  value: any;
  unit: string;
  status: ParameterStatus;
  uncertaintyMarginPercent?: number;
  sourceDocOrCalculation?: string;
  assumptions: string[];
  lastModifiedByAgent: string;
  lastUpdatedAt: string;
  revision: number;
}

export interface ArchitectureDecisionRecord {
  id: string; // e.g. 'ADR-001'
  title: string;
  discipline: string;
  status: 'PROPOSED' | 'APPROVED' | 'SUPERSEDED' | 'REJECTED';
  context: string;
  decision: string;
  consequences: string[];
  proposedByAgent: string;
  approvedBy?: string;
  date: string;
}

export interface RiskEntry {
  id: string; // e.g. 'RSK-001'
  title: string;
  category: 'TECHNICAL' | 'SAFETY' | 'REGULATORY' | 'ENVIRONMENTAL';
  severity: 1 | 2 | 3 | 4 | 5;
  likelihood: 1 | 2 | 3 | 4 | 5;
  mitigationStrategy: string;
  status: 'OPEN' | 'MITIGATED' | 'ACCEPTED';
  ownerAgentId: string;
}
