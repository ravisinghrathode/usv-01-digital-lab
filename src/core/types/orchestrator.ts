import type { AgentExecutionInput, AgentExecutionOutput } from './agent.ts';

export type TaskStatus = 
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING_HUMAN_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'SKIPPED';

export interface EngineeringTask {
  id: string; // e.g. 'TASK-HYDRO-01'
  title: string;
  description: string;
  assignedAgentId: string;
  discipline: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dependencies: string[]; // Task IDs that must complete first
  input: AgentExecutionInput;
  output?: AgentExecutionOutput;
  status: TaskStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  safetyCritical: boolean;
  approvalGateId?: string;
}

export interface TaskDAGNode {
  task: EngineeringTask;
  children: string[]; // task IDs dependent on this task
  parents: string[]; // task IDs this task depends on
}

export interface OrchestratorWorkflow {
  id: string;
  name: string;
  description: string;
  tasks: Map<string, EngineeringTask> | Record<string, EngineeringTask>;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface InterAgentMessage {
  id: string;
  senderAgentId: string;
  recipientAgentId: string; // or 'BROADCAST'
  timestamp: string;
  channel: 'DATA_EXCHANGE' | 'QUERY' | 'VERIFICATION_REQUEST' | 'SAFETY_ALERT';
  payload: Record<string, any>;
  correlationTaskId?: string;
}
