/**
 * USV-01 Digital Engineering Lab — Naval NotebookLM & Agent Learning Types
 * Data models for grounded notebook research, cross-agent clue harvesting, and multi-source study.
 */

import type { WorkstreamCode } from './engineering.ts';
import type { OperatingUsvModel, UsvPaperReference } from './usvIntelligence.ts';

export const NOTEBOOK_LM_VERSION = '1.0.0';

export interface NotebookSource {
  id: string;
  type: 'USV_VESSEL' | 'ACADEMIC_PAPER' | 'PROJECT_BASELINE';
  title: string;
  subtitle: string;
  countryOrPublisher: string;
  year: number;
  tags: string[];
  contentMarkdown: string;
  vesselModel?: OperatingUsvModel;
  paperReference?: UsvPaperReference;
  isSelectedForContext: boolean;
}

export interface NotebookCitation {
  sourceId: string;
  sourceTitle: string;
  quoteOrFact: string;
  metricReference?: string;
}

export interface NotebookChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  citations?: NotebookCitation[];
  recommendedClues?: AgentClueProposal[];
  isGrounded: boolean;
}

export interface AgentClueProposal {
  id: string;
  sourceVesselOrPaperId: string;
  sourceName: string;
  targetDiscipline: WorkstreamCode;
  allocatingAgentId: string;
  clueTitle: string;
  observedFeature: string;
  proposedApplicationToUsv01: string;
  expectedBenefit: string;
  potentialRiskOrTradeoff: string;
  governingFormula?: string;
  status: 'DISCOVERED' | 'EVALUATING' | 'TRIAL_PROPOSED' | 'ADOPTED' | 'REJECTED';
  createdDate: string;
}

export interface DisciplineLearningSummary {
  discipline: WorkstreamCode;
  disciplineName: string;
  leadAgentId: string;
  totalCluesDiscovered: number;
  activeProposals: AgentClueProposal[];
  topGlobalPrecedents: Array<{
    vesselName: string;
    feature: string;
  }>;
}
