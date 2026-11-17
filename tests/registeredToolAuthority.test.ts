import { describe, expect, it, vi } from 'vitest';
import { executeRegisteredMandatoryTool } from '../src/core/tools/RegisteredToolAuthority.ts';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { BaseAgent } from '../src/core/engine/BaseAgent.ts';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

const hydro = {
  lwlMeters: 10, beamMeters: 2.5, draftMeters: 0.6,
  blockCoefficientCb: 0.45, waterplaneCoefficientCwp: 0.65,
  kgMeters: 0.8, seawaterDensityKgM3: 1025
};
const role = 'HULL-GEO-05';
const mandatory = 'TOOL-HYDROSTATICS-01';

describe('Server-code registry-bound mandatory tool authority', () => {
  it('rejects foreign, optional, unknown-role and invalid-task tool calls', async () => {
    for (const test of [
      ['LEAD-SYS-01', mandatory, 'TASK-BROKER-1'],
      [role, 'TOOL-RESISTANCE-01', 'TASK-BROKER-2'],
      ['NONEXISTENT-AGENT', mandatory, 'TASK-BROKER-3'],
      [role, mandatory, ''],
    ]) {
      const result = await executeRegisteredMandatoryTool(test[0], test[1], test[2], hydro);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Registered tool authority denied');
      expect(result.engineeringReleaseAuthorized).toBe(false);
      expect(result.resultDisposition).toBe('ANALYSIS_ONLY_NEVER_ACTUATE');
    }
  });

  it('runs a real registered mandatory calculation with no caller-supplied permissions', async () => {
    const result = await executeRegisteredMandatoryTool(role, mandatory, 'TASK-BROKER-OK', hydro);
    expect(result.success).toBe(true);
    expect(result.output.displacedVolumeM3).toBeCloseTo(6.75);
    expect(result.independentReferenceValidated).toBe(false);
    expect(result.engineeringReleaseAuthorized).toBe(false);
  });

  it('does not trust mutated registry or BaseAgent role permission arrays', async () => {
    // The broker policy is captured independently of the mutable public
    // registry and the mutable BaseAgent.spec, awaiting PR #184.
    const mutable = AgentRegistry.getInstance().requireAgent('A01');
    const original = [...mutable.executionPermissions];
    try {
      mutable.executionPermissions.push('CALCULATION_EXEC');
      mutable.permittedTools.push(mandatory);
      mutable.verificationCriteria.mandatoryDeterministicTools.push(mandatory);
      const result = await executeRegisteredMandatoryTool('LEAD-SYS-01', mandatory, 'TASK-BROKER-FORGED', hydro);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not a mandatory permitted tool');
    } finally {
      mutable.executionPermissions.splice(0, mutable.executionPermissions.length, ...original);
      mutable.permittedTools.pop();
      mutable.verificationCriteria.mandatoryDeterministicTools.pop();
    }
  });

  it('does not send a model-provided authority claim to the registry tool executor', async () => {
    const spy = vi.spyOn(ToolRegistry.getInstance(), 'executeTool');
    try {
      const result = await executeRegisteredMandatoryTool(
        role, mandatory, 'TASK-BROKER-CONTEXT', { ...hydro, executionPermissions: ['READ_ONLY'] }
      );
      // Schema may reject the unrelated property; it must never become
      // the authorization list passed to the tool executor.
      expect(result.engineeringReleaseAuthorized).toBe(false);
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][2]).toContain('CALCULATION_EXEC');
      expect(spy.mock.calls[0][2]).not.toContain('READ_ONLY');
    } finally {
      spy.mockRestore();
    }
  });

  it('keeps derived authority independent of an injected BaseAgent specification', () => {
    const registry = AgentRegistry.getInstance();
    const existing = registry.requireAgent('A01');
    const fake = new BaseAgent({
      ...existing,
      permittedTools: [mandatory],
      executionPermissions: ['CALCULATION_EXEC'],
      verificationCriteria: {
        ...existing.verificationCriteria,
        mandatoryDeterministicTools: [mandatory]
      }
    });
    expect(fake.spec.permittedTools).toContain(mandatory);
    // The only permitted execution entry point is the source-captured
    // policy; fake instance fields do not change the broker's denial.
    return expect(executeRegisteredMandatoryTool(fake.spec.id, mandatory, 'TASK-BROKER-FAKE', hydro))
      .resolves.toMatchObject({ success: false });
  });
});
