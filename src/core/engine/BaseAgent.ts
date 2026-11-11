import { AgentSpec, AgentExecutionInput, AgentExecutionOutput, TraceableAssumption } from '../types/agent.ts';
import { ToolRegistry } from '../tools/ToolRegistry.ts';
import { ModelProviderRouter } from '../models/ModelProvider.ts';
import { AuditLogger } from '../safety/AuditLogger.ts';

export class BaseAgent {
  public spec: AgentSpec;
  protected toolRegistry = ToolRegistry.getInstance();
  protected modelRouter = ModelProviderRouter.getInstance();
  protected auditLogger = AuditLogger.getInstance();

  constructor(spec: AgentSpec) {
    this.spec = spec;
  }

  public async execute(input: AgentExecutionInput): Promise<AgentExecutionOutput> {
    const startTime = performance.now();
    const taskId = input.taskId || `TASK-${Date.now()}`;

    this.auditLogger.log({
      severity: this.spec.auditRequirement.logLevel === 'SAFETY_CRITICAL' ? 'SAFETY_CRITICAL' : 'INFO',
      agentId: this.spec.id,
      taskId,
      action: 'AGENT_EXECUTION_STARTED',
      details: { inputParams: Object.keys(input.parameters) }
    });

    // 1. Validate Input Schema
    const inputParse = this.spec.inputSchema.safeParse(input);
    if (!inputParse.success) {
      const errorMsg = `Input schema validation failed: ${inputParse.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
      this.auditLogger.log({
        severity: 'WARN',
        agentId: this.spec.id,
        taskId,
        action: 'INPUT_VALIDATION_FAILED',
        details: { errors: inputParse.error.issues }
      });

      return {
        agentId: this.spec.id,
        taskId,
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        data: { error: errorMsg },
        assumptions: [],
        deterministicToolEvidence: [],
        openTbdItems: ['Input data schema error'],
        warnings: [errorMsg],
        recommendations: ['Correct input parameters to match agent schema'],
        requiresDirectorApproval: false
      };
    }

    // 2. Execute Mandatory Deterministic Tools if required & input has sufficient parameters
    const deterministicEvidence: Array<{
      toolName: string;
      inputs: Record<string, any>;
      outputs: Record<string, any>;
      verified: boolean;
    }> = [];

    for (const toolId of this.spec.verificationCriteria.mandatoryDeterministicTools) {
      if (this.spec.permittedTools.includes(toolId)) {
        // Run tool with agent's permission set
        const toolRes = await this.toolRegistry.executeTool(toolId, input.parameters, this.spec.executionPermissions);
        deterministicEvidence.push({
          toolName: toolId,
          inputs: toolRes.input,
          outputs: toolRes.output,
          verified: toolRes.success
        });

        // Fail-closed: Mandatory calculation failure must halt synthesis
        if (!toolRes.success) {
          this.auditLogger.log({
            severity: 'SAFETY_CRITICAL',
            agentId: this.spec.id,
            taskId,
            action: 'MANDATORY_CALCULATION_FAILED',
            details: {
              toolId,
              error: toolRes.error,
              input: toolRes.input
            }
          });

          return {
            agentId: this.spec.id,
            taskId,
            timestamp: new Date().toISOString(),
            status: 'FAILED',
            data: {
              error: `Mandatory deterministic calculation '${toolId}' failed: ${toolRes.error}. Synthesis halted to prevent unverified engineering claims.`,
              failedToolId: toolId,
              toolInput: toolRes.input
            },
            assumptions: [],
            deterministicToolEvidence: deterministicEvidence,
            openTbdItems: [`Mandatory tool ${toolId} calculation failure must be resolved by engineering authority`],
            warnings: [`Calculation failure in mandatory tool ${toolId}`],
            recommendations: ['Verify input physics parameters and rerun calculation'],
            requiresDirectorApproval: true,
            approvalRationale: `Mandatory calculation '${toolId}' failed.`
          };
        }
      }
    }

    // 3. Synthesize via Model Provider Router
    const promptRequest = {
      systemInstructions: this.spec.systemInstructions,
      userPrompt: `Execute task ${taskId} with parameters:\n${JSON.stringify(input.parameters, null, 2)}\n\nTool Evidence:\n${JSON.stringify(deterministicEvidence, null, 2)}`,
      context: {
        agentId: this.spec.id,
        division: this.spec.division,
        priorOutputs: input.priorAgentOutputs || {}
      }
    };

    const modelResponse = await this.modelRouter.generate(promptRequest, this.spec.modelConfig);
    const synthesized = modelResponse.parsedJson || {
      disciplineSummary: modelResponse.content,
      keyMetrics: {},
      designDecisions: [],
      assumptions: [],
      openTbdItems: []
    };

    // 4. Traceable assumptions
    const assumptions: TraceableAssumption[] = synthesized.assumptions || [];
    if (this.spec.auditRequirement.recordAssumptions && assumptions.length === 0) {
      assumptions.push({
        id: `ASSUMP-${this.spec.id}-01`,
        category: 'ASSUMPTION',
        description: 'Standard marine environmental baseline operating conditions applied.',
        sourceReference: 'USV01_PROJECT_CONTEXT.md',
        impactIfViolated: 'Calculation margins would need recalculation under extreme sea states.',
        isBaseline: true
      });
    }

    // 5. Check if Director Approval is required
    let requiresDirectorApproval = false;
    let approvalRationale: string | undefined;

    const warnings = [...(synthesized.warnings || [])];

    // Synthetic mock fallback can NEVER be certified as verified baseline success
    if (modelResponse.isMock || !modelResponse.evidenceValid) {
      requiresDirectorApproval = true;
      approvalRationale = 'Synthetic mock fallback used. Physics evidence not confirmed by live solver or verified model; requires human approval.';
      warnings.push('CRITICAL: Output generated via synthetic mock fallback. Not certified as verified engineering evidence.');
    }

    if (this.spec.verificationCriteria.independentReviewRequired) {
      requiresDirectorApproval = true;
      approvalRationale = approvalRationale || `Agent ${this.spec.id} (${this.spec.name}) requires Independent Review and Director Sign-off per Verification Policy.`;
    }

    if (this.spec.auditRequirement.logLevel === 'SAFETY_CRITICAL') {
      requiresDirectorApproval = true;
      approvalRationale = approvalRationale || `Safety-critical engineering output from ${this.spec.id} requires Engineering Director approval.`;
    }

    const output: AgentExecutionOutput = {
      agentId: this.spec.id,
      taskId,
      timestamp: new Date().toISOString(),
      status: requiresDirectorApproval ? 'NEEDS_HUMAN_APPROVAL' : 'SUCCESS',
      data: {
        ...synthesized,
        isMockFallback: !!modelResponse.isMock,
        evidenceValid: !!modelResponse.evidenceValid,
        executionTimeMs: performance.now() - startTime,
        modelUsed: modelResponse.modelUsed
      },
      assumptions,
      deterministicToolEvidence: deterministicEvidence,
      openTbdItems: synthesized.openTbdItems || [],
      warnings,
      recommendations: synthesized.recommendations || [],
      requiresDirectorApproval,
      approvalRationale
    };

    this.auditLogger.log({
      severity: requiresDirectorApproval ? 'SAFETY_CRITICAL' : 'INFO',
      agentId: this.spec.id,
      taskId,
      action: 'AGENT_EXECUTION_COMPLETED',
      details: {
        status: output.status,
        requiresApproval: output.requiresDirectorApproval,
        toolsRun: deterministicEvidence.length
      }
    });

    return output;
  }
}
