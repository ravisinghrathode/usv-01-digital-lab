/**
 * Registered tool availability, not marketing claims or tool-name mentions.
 * Tool-less roles remain research/review specialists with explicit rubrics.
 */
import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ToolRegistry } from '../tools/ToolRegistry.ts';
import { ROLE_ACCURACY_OBLIGATIONS } from './RoleAccuracyObligations.ts';

export type CapabilityClass =
  | 'DETERMINISTIC_SCREENING_AVAILABLE_UNCERTIFIED'
  | 'ADVISORY_ONLY_NO_EXECUTABLE_TOOL'
  | 'TOOL_PERMISSION_OR_REGISTRATION_GAP';

export interface AgentCapabilityFinding {
  canonicalId: string;
  runtimeId: string;
  role: string;
  capability: CapabilityClass;
  declaredToolIds: string[];
  executableToolIds: string[];
  unregisteredToolIds: string[];
  mandatoryToolIds: string[];
  independentReviewRequired: boolean;
  /** A checklist is a review rubric, not an engineering calculator. */
  reviewRubric: string[];
  knowledgeReferences: string[];
  independentReferenceChallenge: string;
  independentProofRequired: string;
  issues: string[];
  engineeringVerified: false;
}

export function auditAgentCapabilities() {
  const registry = AgentRegistry.getInstance();
  const actualTools = new Set(ToolRegistry.getInstance().getAllTools().map(t => t.id));
  const findings: AgentCapabilityFinding[] = registry.getAllAgents().map(spec => {
    const obligation = ROLE_ACCURACY_OBLIGATIONS.find(x => x.canonicalId === spec.canonicalId);
    const executableToolIds = spec.permittedTools.filter(id => actualTools.has(id));
    const unregisteredToolIds = spec.permittedTools.filter(id => !actualTools.has(id));
    const mandatoryToolIds = spec.verificationCriteria.mandatoryDeterministicTools;
    const toolPermission = spec.executionPermissions.includes('CALCULATION_EXEC');
    const issues: string[] = [];
    if (mandatoryToolIds.some(t => !actualTools.has(t) || !spec.permittedTools.includes(t))) {
      issues.push('Mandatory tool is unregistered or missing permission declaration');
    }
    if (mandatoryToolIds.length && !toolPermission) issues.push('Mandatory tool caller lacks CALCULATION_EXEC');
    if (!spec.verificationCriteria.requiredChecklist.length) {
      issues.push('No reviewer rubric / acceptance criteria present');
    }
    if (!spec.requiredKnowledgeSources.length) issues.push('No domain reference source names declared');
    if (!obligation) issues.push('Independent reference challenge not registered');
    if (unregisteredToolIds.length) issues.push('Declared tool names without executable ToolRegistry implementation');
    let capability: CapabilityClass = executableToolIds.length && toolPermission
      ? 'DETERMINISTIC_SCREENING_AVAILABLE_UNCERTIFIED'
      : 'ADVISORY_ONLY_NO_EXECUTABLE_TOOL';
    if (mandatoryToolIds.some(t => !actualTools.has(t)) ||
        (mandatoryToolIds.length && !toolPermission)) {
      capability = 'TOOL_PERMISSION_OR_REGISTRATION_GAP';
    }
    return {
      canonicalId: spec.canonicalId, runtimeId: spec.id, role: spec.name, capability,
      declaredToolIds: [...spec.permittedTools], executableToolIds,
      unregisteredToolIds, mandatoryToolIds: [...mandatoryToolIds],
      independentReviewRequired: spec.verificationCriteria.independentReviewRequired,
      reviewRubric: [...spec.verificationCriteria.requiredChecklist],
      knowledgeReferences: [...spec.requiredKnowledgeSources],
      independentReferenceChallenge: obligation?.representativeChallenge || 'MISSING',
      independentProofRequired: obligation?.independentlyRequired || 'MISSING',
      issues,
      engineeringVerified: false as const
    };
  });
  return {
    registeredAgents: findings.length,
    actualRegisteredTools: actualTools.size,
    executableToolRoles: findings.filter(x => x.capability === 'DETERMINISTIC_SCREENING_AVAILABLE_UNCERTIFIED').length,
    advisoryOnlyRoles: findings.filter(x => x.capability === 'ADVISORY_ONLY_NO_EXECUTABLE_TOOL').length,
    configurationGapRoles: findings.filter(x => x.capability === 'TOOL_PERMISSION_OR_REGISTRATION_GAP').length,
    rolesWithoutRubric: findings.filter(x => !x.reviewRubric.length).length,
    rolesWithoutSourceNames: findings.filter(x => !x.knowledgeReferences.length).length,
    findings,
    allRoleEngineeringAccuracyValidated: false as const,
    engineeringReleaseAuthorized: false as const
  };
}
