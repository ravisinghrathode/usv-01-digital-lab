import type { AgentSpec, AgentExecutionInput, AgentExecutionOutput, TraceableAssumption } from '../types/agent.ts';
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
    const correlationId = input.correlationId || `corr-${this.spec.id}-${Date.now()}`;

    this.auditLogger.log({
      severity: this.spec.auditRequirement.logLevel === 'SAFETY_CRITICAL' ? 'SAFETY_CRITICAL' : 'INFO',
      agentId: this.spec.id,
      taskId,
      action: 'AGENT_EXECUTION_STARTED',
      details: { inputParams: Object.keys(input.parameters || {}), correlationId }
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
        details: { errors: inputParse.error.issues, correlationId }
      });

      return {
        agentId: this.spec.id,
        taskId,
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        executionMode: 'EXECUTION_FAILED',
        correlationId,
        evidenceValid: false,
        verificationStatus: 'EXECUTION_FAILED',
        data: { error: errorMsg },
        assumptions: [],
        deterministicToolEvidence: [],
        openTbdItems: ['Input data schema error'],
        warnings: [errorMsg],
        recommendations: ['Correct input parameters to match agent schema'],
        requiresDirectorApproval: false
      };
    }

    // 2. Execute Mandatory Deterministic Tools if required
    const deterministicEvidence: Array<{
      toolName: string;
      inputs: Record<string, any>;
      outputs: Record<string, any>;
      verified: boolean;
    }> = [];

    for (const toolId of this.spec.verificationCriteria.mandatoryDeterministicTools) {
      if (!this.spec.permittedTools.includes(toolId)) {
        const permError = `Agent '${this.spec.id}' configuration violation: Mandatory tool '${toolId}' is not in permittedTools.`;
        return {
          agentId: this.spec.id,
          taskId,
          timestamp: new Date().toISOString(),
          status: 'FAILED',
          executionMode: 'EXECUTION_FAILED',
          correlationId,
          evidenceValid: false,
          verificationStatus: 'EXECUTION_FAILED',
          data: { error: permError },
          assumptions: [],
          deterministicToolEvidence: [],
          openTbdItems: [permError],
          warnings: [permError],
          recommendations: ['Update agent configuration in AgentRegistry'],
          requiresDirectorApproval: false
        };
      }

      // Tool permission check
      if (!this.spec.executionPermissions.includes('CALCULATION_EXEC')) {
        const errorMsg = `Permission Denied: Agent '${this.spec.id}' lacks CALCULATION_EXEC permission required to execute '${toolId}'.`;
        this.auditLogger.log({
          severity: 'SAFETY_CRITICAL',
          agentId: this.spec.id,
          taskId,
          action: 'TOOL_PERMISSION_DENIED',
          details: { toolId, permissions: this.spec.executionPermissions }
        });

        return {
          agentId: this.spec.id,
          taskId,
          timestamp: new Date().toISOString(),
          status: 'FAILED',
          executionMode: 'EXECUTION_FAILED',
          correlationId,
          evidenceValid: false,
          verificationStatus: 'EXECUTION_FAILED',
          data: { error: errorMsg },
          assumptions: [],
          deterministicToolEvidence: [],
          openTbdItems: ['CALCULATION_EXEC permission required'],
          warnings: [errorMsg],
          recommendations: ['Grant CALCULATION_EXEC permission in agent specification'],
          requiresDirectorApproval: false
        };
      }

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
            input: toolRes.input,
            correlationId
          }
        });

        return {
          agentId: this.spec.id,
          taskId,
          timestamp: new Date().toISOString(),
          status: 'FAILED',
          executionMode: 'EXECUTION_FAILED',
          correlationId,
          evidenceValid: false,
          verificationStatus: 'EXECUTION_FAILED',
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
          requiresDirectorApproval: false // A failed calculation remains FAILED; human approval cannot certify an invalid calculation
        };
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
      },
      correlationId
    };

    let modelResponse;
    try {
      modelResponse = await this.modelRouter.generate(promptRequest, this.spec.modelConfig);
    } catch (err: any) {
      const errorMsg = `Model generation failed for agent '${this.spec.id}': ${err.message || String(err)}`;
      this.auditLogger.log({
        severity: 'SAFETY_CRITICAL',
        agentId: this.spec.id,
        taskId,
        action: 'MODEL_EXECUTION_FAILED',
        details: { error: errorMsg, correlationId }
      });

      return {
        agentId: this.spec.id,
        taskId,
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        executionMode: 'EXECUTION_FAILED',
        correlationId,
        evidenceValid: false,
        verificationStatus: 'EXECUTION_FAILED',
        data: { error: errorMsg },
        assumptions: [],
        deterministicToolEvidence: deterministicEvidence,
        openTbdItems: ['Model execution failed'],
        warnings: [errorMsg],
        recommendations: ['Check model configuration and network connectivity'],
        requiresDirectorApproval: false
      };
    }

    const synthesized = modelResponse.parsedJson || {
      disciplineSummary: modelResponse.content,
      keyMetrics: {},
      designDecisions: [],
      assumptions: [],
      openTbdItems: []
    };

    // 4. Strict Output Schema Validation
    const outputParse = this.spec.outputSchema.safeParse(synthesized);
    if (!outputParse.success) {
      const errorMsg = `Agent output failed schema validation: ${outputParse.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
      this.auditLogger.log({
        severity: 'WARN',
        agentId: this.spec.id,
        taskId,
        action: 'OUTPUT_VALIDATION_FAILED',
        details: { errors: outputParse.error.issues, correlationId }
      });

      return {
        agentId: this.spec.id,
        taskId,
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        executionMode: 'EXECUTION_FAILED',
        correlationId,
        evidenceValid: false,
        verificationStatus: 'EXECUTION_FAILED',
        data: { error: errorMsg, rawContent: modelResponse.content },
        assumptions: [],
        deterministicToolEvidence: deterministicEvidence,
        openTbdItems: ['Malformed agent output rejected'],
        warnings: [errorMsg],
        recommendations: ['Enforce output JSON conforms to declared outputSchema'],
        requiresDirectorApproval: false
      };
    }

    // 5. Traceable Assumptions & Zero Fabrication
    // Never fabricate default assumptions if the agent returns none. Preserve unconfirmed parameters as TBD.
    const assumptions: TraceableAssumption[] = Array.isArray(synthesized.assumptions) ? synthesized.assumptions : [];
    const openTbdItems: string[] = Array.isArray(synthesized.openTbdItems) ? [...synthesized.openTbdItems] : [];

    if (assumptions.length === 0 && this.spec.auditRequirement.recordAssumptions) {
      openTbdItems.push(`Unconfirmed engineering assumptions for ${this.spec.id} tracked as TBD per zero-fabrication policy.`);
    }

    // 6. Evidence Validity Determination
    // AI-generated text alone NEVER establishes evidenceValid: true.
    // Evidence validity derives strictly from executed deterministic tools or formal verification.
    const hasExecutedDeterministicTools = deterministicEvidence.length > 0;
    const allToolsVerified = hasExecutedDeterministicTools && deterministicEvidence.every(e => e.verified);
    const evidenceValid = allToolsVerified;

    let executionMode = modelResponse.executionMode || 'LIVE_AI_GENERATION';
    if (hasExecutedDeterministicTools && allToolsVerified) {
      executionMode = 'DETERMINISTIC_CALCULATION';
    } else if (modelResponse.isMock) {
      executionMode = 'SYNTHETIC_TEST_MOCK';
    }

    // 7. Human Authority and Approval Gates
    let requiresDirectorApproval = false;
    let approvalRationale: string | undefined;
    const warnings = [...(synthesized.warnings || [])];

    if (modelResponse.isMock) {
      requiresDirectorApproval = true;
      approvalRationale = 'Synthetic mock fallback used. Physics evidence not confirmed by live solver or verified model; requires human approval.';
      warnings.push('CRITICAL: Output generated via synthetic mock fallback. Not certified as verified engineering evidence.');
    }

    // Client-supplied exploratory flags never override registered safety and independent-review policy.
    const isExplicitlyNonCritical = false;

    if (!isExplicitlyNonCritical && this.spec.verificationCriteria.independentReviewRequired) {
      requiresDirectorApproval = true;
      approvalRationale = approvalRationale || `Agent ${this.spec.id} (${this.spec.name}) requires Independent Review and Director Sign-off per Verification Policy.`;
    }

    if (!isExplicitlyNonCritical && this.spec.auditRequirement.logLevel === 'SAFETY_CRITICAL') {
      requiresDirectorApproval = true;
      approvalRationale = approvalRationale || `Safety-critical engineering output from ${this.spec.id} requires Engineering Director approval.`;
    }

    const verificationStatus = modelResponse.isMock
      ? 'SYNTHETIC_MOCK'
      : evidenceValid
      ? 'CALCULATED_VERIFIED'
      : 'UNVERIFIED';

    const output: AgentExecutionOutput = {
      agentId: this.spec.id,
      taskId,
      timestamp: new Date().toISOString(),
      status: requiresDirectorApproval ? 'NEEDS_HUMAN_APPROVAL' : 'SUCCESS',
      executionMode,
      provider: modelResponse.providerUsed,
      modelIdentifier: modelResponse.modelUsed,
      correlationId,
      evidenceValid,
      verificationStatus,
      data: {
        ...synthesized,
        isMockFallback: !!modelResponse.isMock,
        evidenceValid,
        executionTimeMs: performance.now() - startTime,
        modelUsed: modelResponse.modelUsed,
        executionMode
      },
      assumptions,
      deterministicToolEvidence: deterministicEvidence,
      openTbdItems,
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
        toolsRun: deterministicEvidence.length,
        evidenceValid,
        executionMode,
        correlationId
      }
    });

    return output;
  }
}
