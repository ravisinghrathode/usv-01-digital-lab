import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { BaseAgent } from './BaseAgent.ts';
import type { AgentExecutionInput, AgentExecutionOutput, AgentStatus } from '../types/agent.ts';
import { AuditLogger } from '../safety/AuditLogger.ts';

export class ExecutionEngine {
  private static instance: ExecutionEngine;
  private registry = AgentRegistry.getInstance();
  private agents: Map<string, BaseAgent> = new Map();
  private agentStatuses: Map<string, AgentStatus> = new Map();
  private executionHistory: AgentExecutionOutput[] = [];
  private auditLogger = AuditLogger.getInstance();

  private constructor() {
    this.initializeAgents();
  }

  public static getInstance(): ExecutionEngine {
    if (!ExecutionEngine.instance) {
      ExecutionEngine.instance = new ExecutionEngine();
    }
    return ExecutionEngine.instance;
  }

  private initializeAgents(): void {
    const specs = this.registry.getAllAgents();
    for (const spec of specs) {
      this.agents.set(spec.id, new BaseAgent(spec));
      this.agentStatuses.set(spec.id, 'IDLE');
    }
  }

  public getAgentStatus(agentId: string): AgentStatus {
    return this.agentStatuses.get(agentId) || 'IDLE';
  }

  public getAllStatuses(): Record<string, AgentStatus> {
    const statuses: Record<string, AgentStatus> = {};
    for (const [id, status] of this.agentStatuses.entries()) {
      statuses[id] = status;
    }
    return statuses;
  }

  /**
   * Executes a registered agent with retry and error recovery.
   * If running in browser environment, delegates execution to privileged backend.
   */
  public async executeAgent(
    agentId: string,
    input: AgentExecutionInput,
    maxRetries = 2
  ): Promise<AgentExecutionOutput> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`ExecutionEngine Error: Agent '${agentId}' is not loaded.`);
    }

    // In browser environment, dispatch to authenticated backend API
    if (typeof window !== 'undefined') {
      this.agentStatuses.set(agentId, 'EXECUTING');
      try {
        const { getSessionToken } = await import('../auth/authClient.ts');
        const token = getSessionToken();
        const res = await fetch('/api/agents/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            agentId,
            taskId: input.taskId,
            parameters: input.parameters,
            context: input.context,
            priorAgentOutputs: input.priorAgentOutputs,
            userNotes: input.userNotes,
            correlationId: input.correlationId
          })
        });

        if (res.ok) {
          const payload = await res.json();
          if (payload.success && payload.output) {
            const output = payload.output as AgentExecutionOutput;
            if (output.status === 'NEEDS_HUMAN_APPROVAL') {
              this.agentStatuses.set(agentId, 'WAITING_APPROVAL');
            } else if (output.status === 'SUCCESS') {
              this.agentStatuses.set(agentId, 'COMPLETED');
            } else {
              this.agentStatuses.set(agentId, 'FAILED');
            }
            this.executionHistory.push(output);
            return output;
          }
        }
        throw new Error(`Backend refused agent execution (HTTP ${res.status}).`);
      } catch (browserErr) {
        // Fail closed: never run an unprivileged local agent when server authorization fails.
        this.agentStatuses.set(agentId, 'FAILED');
        const error = browserErr instanceof Error ? browserErr.message : String(browserErr);
        const failureOutput: AgentExecutionOutput = {
          agentId, taskId: input.taskId, timestamp: new Date().toISOString(),
          status: 'FAILED', executionMode: 'EXECUTION_FAILED',
          correlationId: input.correlationId || `corr-browser-${Date.now()}`,
          evidenceValid: false, verificationStatus: 'EXECUTION_FAILED',
          data: { error: `Authenticated backend execution unavailable: ${error}` },
          assumptions: [], deterministicToolEvidence: [],
          openTbdItems: ['Backend execution not completed'], warnings: [error],
          recommendations: ['Restore authorized server connectivity and retry.'],
          requiresDirectorApproval: false
        };
        this.executionHistory.push(failureOutput);
        return failureOutput;
      }
    }

    this.agentStatuses.set(agentId, 'EXECUTING');

    let attempt = 0;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      try {
        const output = await agent.execute(input);

        if (output.status === 'NEEDS_HUMAN_APPROVAL') {
          this.agentStatuses.set(agentId, 'WAITING_APPROVAL');
        } else if (output.status === 'SUCCESS') {
          this.agentStatuses.set(agentId, 'COMPLETED');
        } else {
          this.agentStatuses.set(agentId, 'FAILED');
        }

        this.executionHistory.push(output);
        return output;
      } catch (err: any) {
        lastError = err;
        attempt++;
        this.auditLogger.log({
          severity: 'WARN',
          agentId,
          taskId: input.taskId,
          action: 'EXECUTION_RETRY_ATTEMPT',
          details: { attempt, maxRetries, error: err.message || String(err) }
        });

        if (attempt <= maxRetries) {
          // Linear backoff
          await new Promise(r => setTimeout(r, 100 * attempt));
        }
      }
    }

    // All retries failed
    this.agentStatuses.set(agentId, 'FAILED');
    const failureOutput: AgentExecutionOutput = {
      agentId,
      taskId: input.taskId,
      timestamp: new Date().toISOString(),
      status: 'FAILED',
      executionMode: 'EXECUTION_FAILED',
      correlationId: input.correlationId || `corr-err-${Date.now()}`,
      evidenceValid: false,
      verificationStatus: 'EXECUTION_FAILED',
      data: { error: `Failed after ${maxRetries} retries: ${lastError?.message || String(lastError)}` },
      assumptions: [],
      deterministicToolEvidence: [],
      openTbdItems: ['Task uncompleted due to runtime exception'],
      warnings: [`Agent exception: ${lastError?.message || String(lastError)}`],
      recommendations: ['Inspect logs and parameters'],
      requiresDirectorApproval: false
    };

    this.executionHistory.push(failureOutput);
    return failureOutput;
  }

  public getHistory(agentId?: string): AgentExecutionOutput[] {
    if (agentId) {
      return this.executionHistory.filter(h => h.agentId === agentId);
    }
    return [...this.executionHistory];
  }

  public resetAllStatuses(): void {
    for (const id of this.agentStatuses.keys()) {
      this.agentStatuses.set(id, 'IDLE');
    }
  }
}
