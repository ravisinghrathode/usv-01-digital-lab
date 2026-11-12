import type {
  EngineeringTask,
  InterAgentMessage
} from '../types/orchestrator.ts';
import { ExecutionEngine } from '../engine/ExecutionEngine.ts';
import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ApprovalGateManager } from '../safety/HumanApprovalGate.ts';
import { AuditLogger } from '../safety/AuditLogger.ts';

export class CentralOrchestrator {
  private static instance: CentralOrchestrator;
  private executionEngine = ExecutionEngine.getInstance();
  private registry = AgentRegistry.getInstance();
  private gateManager = ApprovalGateManager.getInstance();
  private auditLogger = AuditLogger.getInstance();

  private tasks: Map<string, EngineeringTask> = new Map();
  private messageBus: InterAgentMessage[] = [];
  private isRunning: boolean = false;

  private constructor() {
    this.gateManager.onDecision((gate) => {
      this.handleGateDecision(gate.id, gate.state as 'APPROVED' | 'REJECTED');
    });
  }

  public static getInstance(): CentralOrchestrator {
    if (!CentralOrchestrator.instance) {
      CentralOrchestrator.instance = new CentralOrchestrator();
    }
    return CentralOrchestrator.instance;
  }

  public handleGateDecision(gateId: string, decision: 'APPROVED' | 'REJECTED'): void {
    for (const task of this.tasks.values()) {
      if (task.approvalGateId === gateId || task.id === gateId) {
        if (decision === 'APPROVED') {
          task.status = 'COMPLETED';
        } else if (decision === 'REJECTED') {
          task.status = 'FAILED';
        }
      }
    }
  }

  public registerTask(task: EngineeringTask): void {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task with ID '${task.id}' already exists.`);
    }

    // Verify assigned agent exists
    const agent = this.registry.getAgent(task.assignedAgentId);
    if (!agent) {
      throw new Error(`Cannot assign task '${task.id}' to unknown agent '${task.assignedAgentId}'`);
    }

    this.tasks.set(task.id, {
      ...task,
      status: 'PENDING',
      createdAt: task.createdAt || new Date().toISOString()
    });

    this.auditLogger.log({
      severity: 'INFO',
      agentId: task.assignedAgentId,
      taskId: task.id,
      action: 'TASK_REGISTERED',
      details: { title: task.title, dependencies: task.dependencies }
    });
  }

  public getTask(id: string): EngineeringTask | undefined {
    return this.tasks.get(id);
  }

  public getAllTasks(): EngineeringTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Topological sorting and dependency cycle check for tasks.
   */
  public getExecutionPlan(): string[][] {
    const taskIds = Array.from(this.tasks.keys());
    const inDegree: Map<string, number> = new Map();
    const adjList: Map<string, string[]> = new Map();

    for (const id of taskIds) {
      inDegree.set(id, 0);
      adjList.set(id, []);
    }

    for (const [id, task] of this.tasks.entries()) {
      for (const depId of task.dependencies) {
        if (!this.tasks.has(depId)) {
          throw new Error(`Task '${id}' has missing dependency '${depId}'`);
        }
        adjList.get(depId)!.push(id);
        inDegree.set(id, (inDegree.get(id) || 0) + 1);
      }
    }

    const stages: string[][] = [];
    let readyQueue: string[] = taskIds.filter(id => inDegree.get(id) === 0);
    let visitedCount = 0;

    while (readyQueue.length > 0) {
      stages.push([...readyQueue]);
      visitedCount += readyQueue.length;

      const nextQueue: string[] = [];
      for (const curr of readyQueue) {
        for (const child of adjList.get(curr) || []) {
          const deg = (inDegree.get(child) || 1) - 1;
          inDegree.set(child, deg);
          if (deg === 0) {
            nextQueue.push(child);
          }
        }
      }
      readyQueue = nextQueue;
    }

    if (visitedCount !== taskIds.length) {
      throw new Error('Cyclic task dependency detected! Cannot formulate linear execution plan.');
    }

    return stages;
  }

  /**
   * Executes the entire workflow plan in topological stages.
   * Tasks within the same stage run concurrently.
   */
  public async executeWorkflow(): Promise<{ completed: number; failed: number; waitingApproval: number }> {
    if (this.isRunning) {
      throw new Error('Orchestrator workflow is already running.');
    }

    this.isRunning = true;
    let completed = 0;
    let failed = 0;
    let waitingApproval = 0;

    try {
      const stages = this.getExecutionPlan();

      for (const stage of stages) {
        // Execute all tasks in current stage concurrently
        await Promise.all(
          stage.map(async taskId => {
            const task = this.tasks.get(taskId)!;

            // Fail-closed dependency validation:
            // Downstream tasks MUST NOT execute if any upstream dependency failed or is awaiting approval.
            const unfulfilledDeps: string[] = [];
            for (const depId of task.dependencies) {
              const depTask = this.tasks.get(depId);
              // Check if dependency was awaiting approval and its gate has since been approved
              if (depTask && depTask.status === 'WAITING_HUMAN_APPROVAL' && depTask.approvalGateId) {
                const gate = this.gateManager.getGate(depTask.approvalGateId);
                if (gate && gate.state === 'APPROVED') {
                  depTask.status = 'COMPLETED';
                }
              }
              if (!depTask || depTask.status !== 'COMPLETED') {
                unfulfilledDeps.push(`${depId} (${depTask?.status || 'NOT_FOUND'})`);
              }
            }

            if (unfulfilledDeps.length > 0) {
              task.status = 'BLOCKED';
              task.error = `Upstream dependency not satisfied: [${unfulfilledDeps.join(', ')}]. Downstream task execution halted (fail-closed).`;
              failed++;
              this.auditLogger.log({
                severity: 'SAFETY_CRITICAL',
                agentId: task.assignedAgentId,
                taskId: task.id,
                action: 'TASK_BLOCKED_DEPENDENCY_FAILURE',
                details: { unfulfilledDeps }
              });
              return;
            }

            // Gather authentic outputs of parent dependencies
            const priorOutputs: Record<string, any> = {};
            for (const depId of task.dependencies) {
              const depTask = this.tasks.get(depId);
              if (depTask?.output) {
                priorOutputs[depId] = depTask.output.data;
              }
            }

            task.status = 'RUNNING';
            task.startedAt = new Date().toISOString();

            const input = {
              ...task.input,
              taskId: task.id,
              priorAgentOutputs: priorOutputs,
              safetyCritical: task.safetyCritical
            };

            const output = await this.executionEngine.executeAgent(task.assignedAgentId, input);
            task.output = output;
            task.completedAt = new Date().toISOString();

            // Correct state machine:
            // 1. A failed calculation or output MUST remain FAILED (even if safetyCritical)
            if (output.status === 'FAILED') {
              task.status = 'FAILED';
              task.error = output.data?.error || 'Task execution failed';
              failed++;
              this.auditLogger.log({
                severity: 'SAFETY_CRITICAL',
                agentId: task.assignedAgentId,
                taskId: task.id,
                action: 'TASK_EXECUTION_FAILED',
                details: { error: task.error }
              });
            } else if (output.status === 'NEEDS_HUMAN_APPROVAL' || task.safetyCritical) {
              // 2. Needs approval or safety-critical with valid interim calculation
              task.status = 'WAITING_HUMAN_APPROVAL';
              waitingApproval++;

              // Create approval gate
              const gate = this.gateManager.createGate({
                taskId: task.id,
                agentId: task.assignedAgentId,
                title: `Safety & Baseline Review: ${task.title}`,
                description: `Agent ${task.assignedAgentId} completed analysis with safety implications.`,
                safetyImplication: output.approvalRationale || 'Baseline modification or safety-critical engineering output.',
                proposedChanges: output.data
              });

              task.approvalGateId = gate.id;
            } else if (output.status === 'SUCCESS') {
              // 3. Completed successfully without gate requirement
              task.status = 'COMPLETED';
              completed++;
            } else {
              task.status = 'FAILED';
              task.error = output.data?.error || 'Task execution failed';
              failed++;
            }
          })
        );
      }
    } finally {
      this.isRunning = false;
    }

    return { completed, failed, waitingApproval };
  }

  /**
   * Synchronizes human director approval decision back into task state.
   */
  public resolveGateDecision(gateId: string, decision: 'APPROVED' | 'REJECTED'): { taskId: string; newStatus: 'COMPLETED' | 'FAILED' } {
    const gate = this.gateManager.getGate(gateId);
    if (!gate) {
      throw new Error(`Approval gate '${gateId}' not found.`);
    }
    const task = this.tasks.get(gate.taskId);
    if (!task) {
      throw new Error(`Task '${gate.taskId}' associated with gate '${gateId}' not found.`);
    }

    // Engineering invariant: Human approval CANNOT convert an invalid/failed calculation into a verified result!
    if (task.output?.status === 'FAILED' || task.output?.data?.error) {
      task.status = 'FAILED';
      task.error = 'Engineering Safety Invariant: Human approval cannot certify an invalid calculation output.';
      this.auditLogger.log({
        severity: 'SAFETY_CRITICAL',
        agentId: task.assignedAgentId,
        taskId: task.id,
        action: 'INVALID_APPROVAL_CONVERSION_BLOCKED',
        details: { gateId, decision }
      });
      return { taskId: task.id, newStatus: 'FAILED' };
    }

    if (decision === 'APPROVED') {
      task.status = 'COMPLETED';
      if (task.output) {
        task.output.status = 'SUCCESS';
        task.output.verificationStatus = 'HUMAN_APPROVED';
      }
      this.auditLogger.log({
        severity: 'INFO',
        agentId: task.assignedAgentId,
        taskId: task.id,
        action: 'TASK_APPROVED_BY_DIRECTOR',
        details: { gateId }
      });
      return { taskId: task.id, newStatus: 'COMPLETED' };
    } else {
      task.status = 'FAILED';
      task.error = `Rejected at Human Authority Gate: ${gate.directorNotes || 'Director rejection'}`;
      this.auditLogger.log({
        severity: 'WARN',
        agentId: task.assignedAgentId,
        taskId: task.id,
        action: 'TASK_REJECTED_BY_DIRECTOR',
        details: { gateId, reason: gate.directorNotes }
      });
      return { taskId: task.id, newStatus: 'FAILED' };
    }
  }

  // Inter-Agent Messaging
  public sendMessage(msg: Omit<InterAgentMessage, 'id' | 'timestamp'>): InterAgentMessage {
    const fullMsg: InterAgentMessage = {
      id: `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...msg
    };

    this.messageBus.push(fullMsg);

    this.auditLogger.log({
      severity: 'INFO',
      agentId: msg.senderAgentId,
      action: 'INTER_AGENT_MESSAGE_SENT',
      details: { recipient: msg.recipientAgentId, channel: msg.channel }
    });

    return fullMsg;
  }

  public sendAgentOutputMessage(senderAgentId: string, recipientAgentId: string, taskId: string, output: any): InterAgentMessage {
    return this.sendMessage({
      senderAgentId,
      recipientAgentId,
      channel: 'DATA_EXCHANGE',
      payload: {
        taskId,
        output: output?.data || output,
        evidenceValid: !!output?.evidenceValid,
        executionMode: output?.executionMode,
        verificationStatus: output?.verificationStatus,
        timestamp: new Date().toISOString()
      },
      correlationTaskId: taskId
    });
  }

  public getMessages(filter?: { recipientAgentId?: string; channel?: string }): InterAgentMessage[] {
    let result = [...this.messageBus];
    if (filter?.recipientAgentId) {
      result = result.filter(m => m.recipientAgentId === filter.recipientAgentId || m.recipientAgentId === 'BROADCAST');
    }
    if (filter?.channel) {
      result = result.filter(m => m.channel === filter.channel);
    }
    return result;
  }

  public clearTasks(): void {
    this.tasks.clear();
  }
}
