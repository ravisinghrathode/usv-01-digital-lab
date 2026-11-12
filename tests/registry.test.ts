import { describe, it, expect } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';

describe('STAGE B: Agent Organization & Master Registry', () => {
  const registry = AgentRegistry.getInstance();

  it('should register all 26 directorate and specialist agents', () => {
    expect(registry.getCount()).toBe(26);
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
    expect(elecAgents.length).toBe(2); // PROP-ENG-13, ELEC-PWR-14

    const vvtAgents = registry.getAgentsByDivision('SYSTEMS_VVT');
    expect(vvtAgents.length).toBe(6); // INDEP-CRIT-15, TEST-DIR-18, ICD-ENG-21, FMEA-RSK-22, INDEP-REV-23, VVT-VAL-24
  });

  it('should support HMEA v0.2 canonical IDs A01-A26 with backwards-compatible alias resolution', () => {
    for (let i = 1; i <= 26; i++) {
      const canonicalId = `A${i.toString().padStart(2, '0')}`;
      const agentByCanonical = registry.getAgent(canonicalId);
      expect(agentByCanonical).toBeDefined();
      expect(agentByCanonical?.canonicalId).toBe(canonicalId);
      expect(registry.requireAgent(canonicalId)).toBeDefined();
    }

    // Lead Systems Architect
    expect(registry.getAgent('A01')?.id).toBe('LEAD-SYS-01');
    // Hull Form & Parametric Geometry
    expect(registry.getAgent('A05')?.id).toBe('HULL-GEO-05');
    // Intact Stability & Hydrostatics
    expect(registry.getAgent('A06')?.id).toBe('STAB-HYD-06');
    // Independent Technical Critic (A15)
    expect(registry.getAgent('A15')?.name).toBe('Independent Technical Critic');
    expect(registry.getAgent('A15')?.id).toBe('INDEP-CRIT-15');
    // Test & Verification Director (A18)
    expect(registry.getAgent('A18')?.name).toBe('Test & Verification Director');
    expect(registry.getAgent('A18')?.id).toBe('TEST-DIR-18');
    // Documentation & Obsidian Vault
    expect(registry.getAgent('A25')?.id).toBe('DOC-OBS-25');
    // Global Navy USV Fleet Intelligence & Benchmark Analyst
    expect(registry.getAgent('A26')?.id).toBe('INTEL-USV-26');
  });
});
