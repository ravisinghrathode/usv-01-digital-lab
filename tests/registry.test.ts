import { describe, it, expect } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';

describe('STAGE B: Agent Organization & Master Registry', () => {
  const registry = AgentRegistry.getInstance();

  it('should register exactly 25 agents', () => {
    expect(registry.getCount()).toBe(25);
  });

  it('should pass complete structural and dependency validation without errors', () => {
    const validation = registry.validateRegistry();
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should verify all 25 agents have valid unique IDs and system instructions', () => {
    const agents = registry.getAllAgents();
    const idSet = new Set<string>();

    for (const agent of agents) {
      expect(agent.id).toBeTruthy();
      expect(idSet.has(agent.id)).toBe(false);
      idSet.add(agent.id);

      expect(agent.name.length).toBeGreaterThan(3);
      expect(agent.speciality.length).toBeGreaterThan(5);
      expect(agent.systemInstructions.length).toBeGreaterThan(20);
      expect(agent.responsibilities.length).toBeGreaterThanOrEqual(2);
      expect(agent.permittedTools).toBeDefined();
      expect(agent.verificationCriteria).toBeDefined();
      expect(agent.auditRequirement).toBeDefined();
    }
  });

  it('should ensure all dependencies exist in registry', () => {
    const agents = registry.getAllAgents();
    for (const agent of agents) {
      for (const depId of agent.dependencies) {
        expect(registry.getAgent(depId)).toBeDefined();
      }
    }
  });

  it('should retrieve agents by division correctly', () => {
    const naAgents = registry.getAgentsByDivision('NAVAL_ARCHITECTURE');
    expect(naAgents.length).toBe(5); // HULL-GEO-05, STAB-HYD-06, RES-SEAK-07, MAN-MOT-08, WGT-BAL-09

    const elecAgents = registry.getAgentsByDivision('POWER_PROPULSION');
    expect(elecAgents.length).toBe(3); // PROP-ENG-13, ELEC-PWR-14, BATT-ESS-15
  });
});
