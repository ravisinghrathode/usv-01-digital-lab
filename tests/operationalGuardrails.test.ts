import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';
import { HydrostaticsTool, ResistanceTool } from '../src/core/tools/naval/engineeringTools.ts';

describe('Operational engineering guardrails', () => {
  it('requires exactly 26 canonical roles with no dependency cycles or missing permitted tools', () => {
    const registry = AgentRegistry.getInstance();
    const tools = ToolRegistry.getInstance();
    const snapshot = registry.validateRegistry();
    expect(snapshot.valid, snapshot.errors.join('; ')).toBe(true);
    expect(registry.getAllAgents()).toHaveLength(26);
    for (let i = 1; i <= 26; i++) {
      const id = 'A' + i.toString().padStart(2, '0');
      const agent = registry.requireAgent(id);
      expect(agent.canonicalId).toBe(id);
      for (const toolId of agent.verificationCriteria.mandatoryDeterministicTools) {
        expect(agent.permittedTools).toContain(toolId);
        expect(tools.getTool(toolId)).toBeDefined();
      }
    }
  });

  it('rejects displacement outside the physical enclosing prism', () => {
    const valid = { lwlMeters: 10, beamMeters: 2.5, draftMeters: 0.6, speedKnots: 15, displacementTonnes: 5 };
    expect(ResistanceTool.inputSchema.safeParse(valid).success).toBe(true);
    expect(ResistanceTool.inputSchema.safeParse({ ...valid, displacementTonnes: 30 }).success).toBe(false);
  });

  it('rejects implausible density rather than silently asserting stability', () => {
    const valid = { lwlMeters: 10, beamMeters: 2.5, draftMeters: 0.6 };
    expect(HydrostaticsTool.inputSchema.safeParse({ ...valid, seawaterDensityKgM3: -10 }).success).toBe(false);
    expect(HydrostaticsTool.inputSchema.safeParse({ ...valid, seawaterDensityKgM3: 1025, blockCoefficientCb: 0.44 }).success).toBe(true);
  });
});
