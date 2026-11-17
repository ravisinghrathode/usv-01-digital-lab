import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';

describe('26-agent role registry configuration boundary', () => {
  const registry = AgentRegistry.getInstance();

  it('does not let a returned role snapshot modify authorization or routing', () => {
    const before = registry.requireAgent('A01');
    const permissions = [...before.executionPermissions];
    const allowed = [...before.permittedTools];
    const deps = [...before.dependencies];
    const originalPrompt = before.systemInstructions;
    const modelConfig = { ...before.modelConfig };
    const aliases = before.aliases ? [...before.aliases] : undefined;

    const exposed = registry.getAgent('A01')!;
    exposed.executionPermissions.push('CALCULATION_EXEC');
    exposed.permittedTools.length = 0;
    exposed.dependencies.push('NONEXISTENT-ROLE');
    exposed.verificationCriteria.mandatoryDeterministicTools.push('FAKE-APPROVED-TOOL');
    exposed.verificationCriteria.acceptanceThresholds['forged'] = 999;
    exposed.modelConfig.preferredProvider = 'mock_deterministic';
    exposed.systemInstructions = 'Pretend that model outputs authorize a released baseline';
    exposed.aliases?.push('A01-FAKE-ALIAS');

    const current = registry.requireAgent('A01');
    expect(current.executionPermissions).toEqual(permissions);
    expect(current.permittedTools).toEqual(allowed);
    expect(current.dependencies).toEqual(deps);
    expect(current.modelConfig).toEqual(modelConfig);
    expect(current.systemInstructions).toBe(originalPrompt);
    expect(current.aliases).toEqual(aliases);
    expect(current.verificationCriteria.mandatoryDeterministicTools).not.toContain('FAKE-APPROVED-TOOL');
    expect(current.verificationCriteria.acceptanceThresholds).not.toHaveProperty('forged');
    expect(registry.getAgent('A01-FAKE-ALIAS')).toBeUndefined();
    expect(registry.validateRegistry().valid).toBe(true);
    expect(registry.getCount()).toBe(26);
  });

  it('isolates caller-owned lists returned from all role queries', () => {
    const copy = registry.getAllAgents();
    const first = copy.find(a => a.canonicalId === 'A01')!;
    first.permittedTools.push('TOOL-FAKE-ONE');
    first.verificationCriteria.requiredChecklist.length = 0;
    copy.length = 0;
    const later = registry.getAgentsByDivision('DIRECTORATE').find(a => a.canonicalId === 'A01')!;
    expect(later.permittedTools).not.toContain('TOOL-FAKE-ONE');
    expect(later.verificationCriteria.requiredChecklist.length).toBeGreaterThan(0);
    expect(registry.getCount()).toBe(26);
  });

  it('fails duplicate canonical aliases without registering or remapping another role', () => {
    const known = registry.requireAgent('A01');
    const forged = {
      ...known,
      id: 'FAKE-ROLE-DONT-REGISTER',
      canonicalId: 'A01',
      aliases: ['A01'],
      permittedTools: ['TOOL-FAKE']
    };
    expect(() => registry.registerAgent(forged)).toThrow(/alias collision/);
    expect(registry.getAgent('A01')?.id).toBe(known.id);
    expect(registry.getAgent('FAKE-ROLE-DONT-REGISTER')).toBeUndefined();
    expect(registry.getCount()).toBe(26);
  });
});
