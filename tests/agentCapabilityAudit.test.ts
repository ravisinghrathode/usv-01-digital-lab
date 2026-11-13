import { describe, expect, it } from 'vitest';
import { auditAgentCapabilities } from '../src/core/verification/AgentCapabilityAudit.ts';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

describe('Live registry capability truthfulness', () => {
  it('does not confuse declared tool names, executable tool registrations and review rubrics', () => {
    const audit = auditAgentCapabilities();
    expect(audit.registeredAgents).toBe(26);
    expect(audit.actualRegisteredTools).toBe(ToolRegistry.getInstance().getAllTools().length);
    expect(audit.findings.map(x => x.canonicalId)).toEqual(AgentRegistry.getInstance().getAllAgents().map(x => x.canonicalId));
    expect(audit.findings.every(x => x.engineeringVerified === false)).toBe(true);
    expect(audit.findings.every(x => x.reviewRubric.length > 0)).toBe(true);
    expect(audit.allRoleEngineeringAccuracyValidated).toBe(false);
    expect(audit.engineeringReleaseAuthorized).toBe(false);
    for (const role of audit.findings) {
      for (const tool of role.executableToolIds) expect(ToolRegistry.getInstance().getTool(tool)).toBeDefined();
      for (const tool of role.unregisteredToolIds) expect(ToolRegistry.getInstance().getTool(tool)).toBeUndefined();
      if (role.capability === 'ADVISORY_ONLY_NO_EXECUTABLE_TOOL') expect(role.mandatoryToolIds).toHaveLength(0);
    }
  });
});