/**
 * No-model preflight for all 26 USV-01 specialist agents.
 * It invokes real deterministic tools with the supplied illustrative inputs;
 * the resulting evidence never constitutes vessel release, live AI verification,
 * or independent engineering certification.
 */
import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ToolRegistry } from '../tools/ToolRegistry.ts';
import type { AgentExecutionInput } from '../types/agent.ts';

export interface AgentPreflightFinding {
  canonicalId: string;
  agentId: string;
  inputSchemaValid: boolean;
  toolEvidence: Array<{
    toolId: string;
    success: boolean;
    inputSchemaValid: boolean;
    error?: string;
    validationErrors?: string[];
  }>;
  blockers: string[];
  readyForModelAttempt: boolean;
}

export interface CodexCampaignPreflight {
  status: 'PREFLIGHT_READY_NO_AI_CALLS' | 'PREFLIGHT_BLOCKED_NO_AI_CALLS';
  totalAgents: number;
  agentInputsValid: number;
  deterministicToolsPassed: number;
  deterministicToolsFailed: number;
  liveCodexCalls: 0;
  independentlyEngineeringValidated: false;
  engineeringReleaseApproved: false;
  findings: AgentPreflightFinding[];
}

export async function preflightCodexAgentCases(
  cases: Record<string, AgentExecutionInput>
): Promise<CodexCampaignPreflight> {
  const specs = AgentRegistry.getInstance().getAllAgents();
  const tools = ToolRegistry.getInstance();
  const findings: AgentPreflightFinding[] = [];
  let passed = 0, failed = 0;

  for (const spec of specs) {
    const input = cases[spec.canonicalId];
    const inputSchemaValid = !!input && spec.inputSchema.safeParse(input).success;
    const blockers: string[] = [];
    const toolEvidence: AgentPreflightFinding['toolEvidence'] = [];

    if (!inputSchemaValid) blockers.push('Agent input schema invalid or missing');

    for (const toolId of spec.verificationCriteria.mandatoryDeterministicTools) {
      const tool = tools.getTool(toolId);
      if (!tool) {
        failed++;
        blockers.push('Missing mandatory registered tool: ' + toolId);
        toolEvidence.push({ toolId, success: false, inputSchemaValid: false, error: 'Tool not registered' });
        continue;
      }
      const inputParse = tool.inputSchema.safeParse(input?.parameters ?? {});
      const authorized = spec.permittedTools.includes(toolId) &&
        tool.requiredPermissions.every(permission => spec.executionPermissions.includes(permission));
      if (!authorized || !inputParse.success) {
        failed++;
        const error = !authorized ? 'Specialist lacks required tool authorization' :
          'Mandatory tool input schema failed';
        blockers.push(toolId + ': ' + error);
        toolEvidence.push({
          toolId, success: false, inputSchemaValid: inputParse.success,
          error, validationErrors: inputParse.success ? undefined :
            inputParse.error.issues.map(issue => issue.path.join('.') + ': ' + issue.message)
        });
        continue;
      }
      // Execute the actual deterministic implementation; no models or token use.
      const execution = await tools.executeTool(toolId, input!.parameters, spec.executionPermissions);
      if (execution.success) passed++; else {
        failed++;
        blockers.push(toolId + ': ' + (execution.error || 'Deterministic execution failed'));
      }
      toolEvidence.push({
        toolId, success: execution.success, inputSchemaValid: true,
        error: execution.error, validationErrors: execution.validationErrors
      });
    }
    findings.push({
      canonicalId: spec.canonicalId, agentId: spec.id, inputSchemaValid,
      toolEvidence, blockers,
      readyForModelAttempt: inputSchemaValid && blockers.length === 0
    });
  }

  const allReady = findings.length === 26 && findings.every(row => row.readyForModelAttempt);
  return {
    status: allReady ? 'PREFLIGHT_READY_NO_AI_CALLS' : 'PREFLIGHT_BLOCKED_NO_AI_CALLS',
    totalAgents: findings.length,
    agentInputsValid: findings.filter(x => x.inputSchemaValid).length,
    deterministicToolsPassed: passed, deterministicToolsFailed: failed,
    liveCodexCalls: 0,
    independentlyEngineeringValidated: false, engineeringReleaseApproved: false,
    findings
  };
}
