import { describe, it, expect, beforeEach } from 'vitest';
import { CentralOrchestrator } from '../src/core/orchestrator/CentralOrchestrator.ts';
import { ApprovalGateManager } from '../src/core/safety/HumanApprovalGate.ts';

describe('STAGE D: Central Orchestrator & Task DAG Scheduler', () => {
  let orchestrator: CentralOrchestrator;
  let gateManager: ApprovalGateManager;

  beforeEach(() => {
    orchestrator = CentralOrchestrator.getInstance();
    gateManager = ApprovalGateManager.getInstance();
    orchestrator.clearTasks();
  });

  it('should formulate topological execution stages for dependent tasks', () => {
    // Task 1: Hull geometry definition
    orchestrator.registerTask({
      id: 'TASK-HULL-01',
      title: 'Hull Lines Definition',
      description: 'Define parametric particulars',
      assignedAgentId: 'HULL-GEO-05',
      discipline: 'NA',
      priority: 'HIGH',
      dependencies: [],
      input: { taskId: 'TASK-HULL-01', context: {}, parameters: { lwlMeters: 10, beamMeters: 2.5, draftMeters: 0.6 } },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: false
    });

    // Task 2: Mass balance (depends on Hull)
    orchestrator.registerTask({
      id: 'TASK-MASS-02',
      title: 'Mass Balance Ledger',
      description: 'SWBS weight groups',
      assignedAgentId: 'WGT-BAL-09',
      discipline: 'NA',
      priority: 'HIGH',
      dependencies: ['TASK-HULL-01'],
      input: { taskId: 'TASK-MASS-02', context: {}, parameters: { components: [] } },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: false
    });

    // Task 3: Hydrostatic stability (depends on both Hull and Mass)
    orchestrator.registerTask({
      id: 'TASK-STAB-03',
      title: 'Hydrostatic & Intact Stability',
      description: 'Check GMt',
      assignedAgentId: 'STAB-HYD-06',
      discipline: 'NA',
      priority: 'CRITICAL',
      dependencies: ['TASK-HULL-01', 'TASK-MASS-02'],
      input: { taskId: 'TASK-STAB-03', context: {}, parameters: { lwlMeters: 10, beamMeters: 2.5, draftMeters: 0.6, blockCoefficientCb: 0.45, kgMeters: 0.8 } },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: true
    });

    const plan = orchestrator.getExecutionPlan();
    expect(plan.length).toBe(3);
    expect(plan[0]).toEqual(['TASK-HULL-01']);
    expect(plan[1]).toEqual(['TASK-MASS-02']);
    expect(plan[2]).toEqual(['TASK-STAB-03']);
  });

  it('should detect cyclic dependencies and reject invalid DAGs', () => {
    orchestrator.registerTask({
      id: 'TASK-A',
      title: 'Task A',
      description: 'A',
      assignedAgentId: 'REQ-TRC-02',
      discipline: 'SYS',
      priority: 'MEDIUM',
      dependencies: ['TASK-B'],
      input: { taskId: 'TASK-A', context: {}, parameters: {} },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: false
    });

    orchestrator.registerTask({
      id: 'TASK-B',
      title: 'Task B',
      description: 'B',
      assignedAgentId: 'CONOPS-03',
      discipline: 'SYS',
      priority: 'MEDIUM',
      dependencies: ['TASK-A'],
      input: { taskId: 'TASK-B', context: {}, parameters: {} },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: false
    });

    expect(() => orchestrator.getExecutionPlan()).toThrow('Cyclic task dependency detected');
  });

  it('should execute tasks, pass data, and create safety approval gates for safety-critical tasks', async () => {
    orchestrator.registerTask({
      id: 'TASK-STAB-RUN',
      title: 'Intact Stability Check',
      description: 'Verify GMt > 0.35m',
      assignedAgentId: 'STAB-HYD-06',
      discipline: 'NA',
      priority: 'CRITICAL',
      dependencies: [],
      input: {
        taskId: 'TASK-STAB-RUN',
        context: {},
        parameters: {
          lwlMeters: 10.0,
          beamMeters: 2.5,
          draftMeters: 0.6,
          blockCoefficientCb: 0.45,
          waterplaneCoefficientCwp: 0.65,
          kgMeters: 0.8,
          seawaterDensityKgM3: 1025
        }
      },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: true
    });

    const result = await orchestrator.executeWorkflow();
    expect(result.waitingApproval).toBe(1);

    const task = orchestrator.getTask('TASK-STAB-RUN')!;
    expect(task.status).toBe('WAITING_HUMAN_APPROVAL');
    expect(task.approvalGateId).toBeDefined();

    const gate = gateManager.getGate(task.approvalGateId!);
    expect(gate).toBeDefined();
    expect(gate?.state).toBe('PENDING');
  });

  it('should route inter-agent messages cleanly', () => {
    const msg = orchestrator.sendMessage({
      senderAgentId: 'HULL-GEO-05',
      recipientAgentId: 'STAB-HYD-06',
      channel: 'DATA_EXCHANGE',
      payload: { draftMeters: 0.65, lwlMeters: 10.2 }
    });

    expect(msg.id).toBeDefined();
    const inbox = orchestrator.getMessages({ recipientAgentId: 'STAB-HYD-06' });
    expect(inbox.length).toBeGreaterThanOrEqual(1);
    expect(inbox[0].payload.draftMeters).toBe(0.65);
  });
});
