import { z } from 'zod';

export type AgentDivision =
  | 'DIRECTORATE'
  | 'REQUIREMENTS_BASELINE'
  | 'NAVAL_ARCHITECTURE'
  | 'STRUCTURES_MECHANICAL'
  | 'POWER_PROPULSION'
  | 'AUTONOMY_ELECTRONICS'
  | 'SYSTEMS_VVT'
  | 'OPERATIONS_DELIVERABLES';

export type AgentStatus = 'IDLE' | 'EXECUTING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'BLOCKED';

export type ExecutionPermission = 'READ_ONLY' | 'PARAM_PROPOSAL' | 'CALCULATION_EXEC' | 'BASELINE_DRAFT' | 'VVT_REVIEW';

export interface ModelConfig {
  preferredProvider: 'gemini' | 'openai' | 'mock_deterministic';
  modelName: string;
  temperature: number;
  maxTokens: number;
  fallbackToMock: boolean;
}

export interface AgentVerificationCriteria {
  requiredChecklist: string[];
  mandatoryDeterministicTools: string[];
  acceptanceThresholds: Record<string, string | number>;
  independentReviewRequired: boolean;
}

export interface AgentAuditRequirement {
  logLevel: 'INFO' | 'AUDIT' | 'SAFETY_CRITICAL';
  retainExecutionTrace: boolean;
  recordAssumptions: boolean;
  traceableToRequirementIds: boolean;
}

export interface AgentSpec {
  id: string; // e.g. 'LEAD-SYS-01'
  canonicalId: string; // Canonical HMEA v0.2 ID: 'A01' - 'A25'
  aliases?: string[]; // e.g. ['LEAD-SYS-01', 'A01']
  division: AgentDivision;
  name: string;
  speciality: string;
  responsibilities: string[];
  systemInstructions: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  requiredKnowledgeSources: string[];
  permittedTools: string[];
  modelConfig: ModelConfig;
  reportingTo: string; // ID of supervisor (e.g. 'LEAD-SYS-01' or 'HUMAN_DIRECTOR')
  dependencies: string[]; // Agent IDs required before this agent can complete work
  executionPermissions: ExecutionPermission[];
  verificationCriteria: AgentVerificationCriteria;
  auditRequirement: AgentAuditRequirement;
}

export interface AgentExecutionInput {
  taskId: string;
  context: Record<string, any>;
  parameters: Record<string, any>;
  priorAgentOutputs?: Record<string, any>;
  userNotes?: string;
}

export interface TraceableAssumption {
  id: string;
  category: 'ASSUMPTION' | 'FACT' | 'CALCULATION' | 'TBD' | 'PROPOSAL';
  description: string;
  sourceReference: string;
  impactIfViolated: string;
  isBaseline: boolean;
}

export interface AgentExecutionOutput {
  agentId: string;
  taskId: string;
  timestamp: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'NEEDS_HUMAN_APPROVAL';
  data: Record<string, any>;
  assumptions: TraceableAssumption[];
  deterministicToolEvidence: Array<{
    toolName: string;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    verified: boolean;
  }>;
  openTbdItems: string[];
  warnings: string[];
  recommendations: string[];
  requiresDirectorApproval: boolean;
  approvalRationale?: string;
}
