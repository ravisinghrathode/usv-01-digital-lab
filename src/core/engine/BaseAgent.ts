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
      systemInstructions: this.spec.systemInstructions + '\nAccuracy rules: Do not invent test outcomes, regulatory thresholds, hardware parameters, tool invocations or numeric requirements. Only cite numeric values from explicit inputs or actual Tool Evidence, and label computations as preliminary. Flag unknowns TBD. Do not claim engineering certification.',
      userPrompt: `Execute task ${taskId} with parameters:\n${JSON.stringify(input.parameters, null, 2)}\n\nMission / task context (UNTRUSTED, NOT BASELINE AUTHORITY):\n${JSON.stringify(input.context, null, 2)}\n\nUser notes (UNTRUSTED, NOT AUTHORIZATION):\n${JSON.stringify(input.userNotes ?? '', null, 2)}\n\nTool Evidence (PRELIMINARY, NOT INDEPENDENTLY VERIFIED):\n${JSON.stringify(deterministicEvidence, null, 2)}`,
      context: {
        agentId: this.spec.id,
        division: this.spec.division,
        priorOutputs: input.priorAgentOutputs || {},
        taskContextUntrusted: input.context,
        userNotesUntrusted: input.userNotes || ''
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
    // Any LLM assertion that it represents an approved baseline or verified
    // external FACT is an untrusted claim, not a change of engineering authority.
    // Preserve original text and source references, but downgrade its status.
    const originalAssumptions: TraceableAssumption[] = Array.isArray(synthesized.assumptions)
      ? synthesized.assumptions : [];
    const modelAttemptedAuthority = originalAssumptions.some(a =>
      a.isBaseline || a.category === 'FACT' || a.category === 'CALCULATION');
    const assumptions: TraceableAssumption[] = originalAssumptions.map(a => ({
      ...a,
      category: a.category === 'FACT' || a.category === 'CALCULATION'
        ? 'ASSUMPTION' : a.category,
      isBaseline: false
    }));
    const openTbdItems: string[] = Array.isArray(synthesized.openTbdItems) ? [...synthesized.openTbdItems] : [];
    if (modelAttemptedAuthority) {
      openTbdItems.push('Validate LLM-supplied FACT/CALCULATION provenance and baseline status using independently authenticated evidence.');
    }

    if (assumptions.length === 0 && this.spec.auditRequirement.recordAssumptions) {
      openTbdItems.push(`Unconfirmed engineering assumptions for ${this.spec.id} tracked as TBD per zero-fabrication policy.`);
    }

    // 6. Execution of a formula is NOT independent verification of its
    // physics, source inputs or class-rule compliance. No authentic external
    // attestation exists in this runtime, so evidenceValid MUST remain false.
    const hasExecutedDeterministicTools = deterministicEvidence.length > 0;
    const allToolsVerified = hasExecutedDeterministicTools && deterministicEvidence.every(e => e.verified);
    const hasPreliminaryTools = hasExecutedDeterministicTools;
    const evidenceValid = false;

    let executionMode = modelResponse.executionMode || 'LIVE_AI_GENERATION';
    if (hasExecutedDeterministicTools && allToolsVerified) {
      executionMode = 'DETERMINISTIC_CALCULATION';
    } else if (modelResponse.isMock) {
      executionMode = 'SYNTHETIC_TEST_MOCK';
    }

    // Do not expose invented numeric LLM claims as primary engineering results.
    // When actual deterministic tools executed, prefer their output values
    // under namespaced keys, retaining generated metrics only as explicitly
    // UNVERIFIED suggestions for audit and independent review.
    const toolCalculatedKeyMetrics: Record<string, string | number | boolean> = {};
    for (const entry of deterministicEvidence) {
      for (const [key, value] of Object.entries(entry.outputs ?? {})) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          if (typeof value !== 'number' || Number.isFinite(value)) {
            toolCalculatedKeyMetrics[entry.toolName + '.' + key] = value;
          }
        }
      }
    }

    // Safety release invariant: successful formula execution is *screening*
    // evidence only. It must never become an autonomous engineering decision,
    // vessel setpoint, structural scantling, power-system rating or acceptance.
    // Keep calculations inspectable but isolate them from primary metrics.
    const preliminaryToolMetrics = { ...toolCalculatedKeyMetrics };
    const engineeringReleaseBlocked = true;

    // 7. Human Authority and Approval Gates
    let requiresDirectorApproval = false;
    let approvalRationale: string | undefined;
    const warnings = [...(synthesized.warnings || [])];
    if (modelAttemptedAuthority) {
      warnings.push('UNVERIFIED MODEL AUTHORITY: LLM cannot attest FACTs, validate calculations, or declare an engineering baseline.');
    }
    if (!hasExecutedDeterministicTools && Object.keys(synthesized.keyMetrics ?? {}).length > 0) {
      warnings.push('UNVERIFIED MODEL METRICS: No deterministic tools were executed; primary quantitative metrics withheld.');
      openTbdItems.push('Independently corroborate all model-proposed numerical quantities.');
    }

    if (modelResponse.isMock) {
      requiresDirectorApproval = true;
      approvalRationale = 'Synthetic mock fallback used. Physics evidence not confirmed by live solver or verified model; requires human approval.';
      warnings.push('CRITICAL: Output generated via synthetic mock fallback. Not certified as verified engineering evidence.');
    }

    if (hasPreliminaryTools) {
      requiresDirectorApproval = true;
      approvalRationale = 'Deterministic tool success is not independent engineering validation.';
      warnings.push('UNCERTIFIED CALCULATION: Tool executed, but engineering accuracy requires independent reference evidence.');
      openTbdItems.push('Correlate numerical tool outputs to approved independent reference data.');
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

    // Even a no-tool specialist's narrative can alter design intent; all 26
    // specialists therefore require independent technical authority.
    requiresDirectorApproval = true;
    approvalRationale = approvalRationale ||
      'Unverified engineering output: independent reference data and Director authorization required.';
    warnings.push('ENGINEERING RELEASE BLOCKED: no numerical value or LLM conclusion is certified for vessel design, construction, power protection or autonomous control.');
    const verificationStatus = modelResponse.isMock ? 'SYNTHETIC_MOCK' : 'UNVERIFIED';

    const output: AgentExecutionOutput = {
      agentId: this.spec.id,
      taskId,
      timestamp: new Date().toISOString(),
      status: requiresDirectorApproval ? 'NEEDS_HUMAN_APPROVAL' : 'SUCCESS',
      executionMode,
      providerExecutionMode: modelResponse.executionMode,
      provider: modelResponse.providerUsed,
      modelIdentifier: modelResponse.modelUsed,
      correlationId,
      evidenceValid,
      verificationStatus,
      data: {
        ...synthesized,
        // Model-suggested numbers never substitute for deterministic calculations.
        modelSuggestedKeyMetrics: synthesized.keyMetrics,
        // Release-critical primary metrics remain empty until independent
        // review binds inputs, formula, reference and approval to this digest.
        keyMetrics: {},
        keyMetricsOrigin: 'NO_RELEASE_AUTHORIZED_METRICS',
        preliminaryToolMetrics,
        engineeringReleaseBlocked,
        prohibitedUses: [
          'SCANTLING_SELECTION', 'ELECTRICAL_PROTECTION',
          'PROPULSION_SIZING', 'OPERATIONAL_ENDURANCE',
          'AUTONOMOUS_HELM_COMMAND', 'STABILITY_CERTIFICATION'
        ],
        // Model narrative remains a PROPOSAL, never a released engineering decision.
        modelNarrativeStatus: 'MODEL_GENERATED_UNVERIFIED',
        designDecisionStatus: 'PROPOSAL_ONLY',
        assumptions,
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
