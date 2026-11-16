import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

const registry = ToolRegistry.getInstance();
const toolId = 'TOOL-HYDROSTATICS-01';
const input = {
  lwlMeters: 10, beamMeters: 2.5, draftMeters: 0.6, blockCoefficientCb: 0.45,
  waterplaneCoefficientCwp: 0.65, kgMeters: 0.8, seawaterDensityKgM3: 1025
};

describe('Tool execution authorization and audit snapshot invariants', () => {
  it('denies missing, empty and malformed permission claims before tool calculation', async () => {
    for (const permissions of [undefined, [], 'CALCULATION_EXEC', ['READ_ONLY']]) {
      const result = await registry.executeTool(toolId, input, permissions as string[]);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Permission Denied/);
      expect(result.engineeringReleaseAuthorized).toBe(false);
    }
    const valid = await registry.executeTool(toolId, input, ['CALCULATION_EXEC']);
    expect(valid.success).toBe(true);
    expect(valid.resultDisposition).toBe('ANALYSIS_ONLY_NEVER_ACTUATE');
  });

  it('freezes registered descriptor and permission array', () => {
    const tool = registry.getTool(toolId)!;
    expect(Object.isFrozen(tool)).toBe(true);
    expect(Object.isFrozen(tool.requiredPermissions)).toBe(true);
    expect(tool.requiredPermissions).toContain('CALCULATION_EXEC');
    expect(registry.getAllTools().find(t => t.id === toolId)).toBe(tool);
  });

  it('keeps audit inputs/outputs independent of caller objects and history readers', async () => {
    registry.clearHistory();
    const userInput = structuredClone(input);
    const result = await registry.executeTool(toolId, userInput, ['CALCULATION_EXEC']);
    expect(result.success).toBe(true);
    const expected = registry.getExecutionHistory()[0].output.displacedVolumeM3;
    userInput.lwlMeters = 1000;
    result.input.lwlMeters = 999;
    result.output.displacedVolumeM3 = -500;
    const view = registry.getExecutionHistory();
    view[0].success = false;
    view[0].input.lwlMeters = 777;
    view[0].output.displacedVolumeM3 = 123456;
    view.length = 0;
    const next = registry.getExecutionHistory();
    expect(next).toHaveLength(1);
    expect(next[0].success).toBe(true);
    expect(next[0].input.lwlMeters).toBe(10);
    expect(next[0].output.displacedVolumeM3).toBe(expected);
  });

  it('does not lose denied non-cloneable inputs from the audit ledger', async () => {
    registry.clearHistory();
    const result = await registry.executeTool(toolId, { callback: () => 'not cloneable' }, []);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Audit capture failed');
    expect(registry.getExecutionHistory()).toHaveLength(1);
    expect(registry.getExecutionHistory()[0].input).toEqual({});
    expect(registry.getExecutionHistory()[0].success).toBe(false);
  });
});
