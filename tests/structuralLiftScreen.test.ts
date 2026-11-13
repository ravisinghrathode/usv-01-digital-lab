import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

// Synthetic first-principles fixtures only, never approved USV-01 loads.
const base = () => ({
  handlingMassKg: 100,
  dynamicAmplificationFactor: 1,
  inputBasis: 'ILLUSTRATIVE' as const,
  massSourceRef: 'SYNTHETIC-TEST',
  loadShareSourceRef: 'SYNTHETIC-TEST',
  dynamicFactorSourceRef: 'SYNTHETIC-TEST',
  liftingPoints: [
    { pointId: 'port', verticalLoadShare: 0.5, slingAngleFromVerticalDeg: 0, pointAllowableLoadN: 600 },
    { pointId: 'starboard', verticalLoadShare: 0.5, slingAngleFromVerticalDeg: 0, pointAllowableLoadN: 600 },
  ],
});
const run = (input: unknown) =>
  ToolRegistry.getInstance().executeTool('TOOL-STRUCTURES-LIFT-01', input, ['CALCULATION_EXEC']);

describe('TOOL-STRUCTURES-LIFT-01 lifting statics only', () => {
  it('balances two vertical slings against exact gravity load', async () => {
    const result = await run(base());
    expect(result.success).toBe(true);
    expect(result.output.totalDesignVerticalLoadN).toBeCloseTo(980.665, 6);
    expect(result.output.sumVerticalReactionsN).toBeCloseTo(980.665, 6);
    expect(result.output.pointLoads[0].slingTensionN).toBeCloseTo(490.3325, 6);
    expect(result.output.capacityScreenStatus).toBe('WITHIN_ENTERED_WLL_ONLY');
    expect(result.output.structuralComplianceValidated).toBe(false);
    expect(result.output.liftingCertificationIssued).toBe(false);
  });

  it('calculates unequal four-point shares and raised tension from a 60-degree sling', async () => {
    const input = {
      ...base(),
      handlingMassKg: 120,
      liftingPoints: [
        { pointId: 'P1', verticalLoadShare: 0.4, slingAngleFromVerticalDeg: 0, pointAllowableLoadN: 2000 },
        { pointId: 'P2', verticalLoadShare: 0.3, slingAngleFromVerticalDeg: 60, pointAllowableLoadN: 2000 },
        { pointId: 'P3', verticalLoadShare: 0.2, slingAngleFromVerticalDeg: 0, pointAllowableLoadN: 2000 },
        { pointId: 'P4', verticalLoadShare: 0.1, slingAngleFromVerticalDeg: 0, pointAllowableLoadN: 2000 },
      ],
    };
    const result = await run(input);
    expect(result.success).toBe(true);
    const weight = 120 * 9.80665;
    expect(result.output.pointLoads[1].verticalReactionN).toBeCloseTo(weight * 0.3, 6);
    expect(result.output.pointLoads[1].slingTensionN).toBeCloseTo(weight * 0.6, 6);
    expect(result.output.pointLoads[1].horizontalForceMagnitudeN).toBeCloseTo(weight * 0.6 * Math.sin(Math.PI / 3), 6);
    expect(result.output.sumVerticalReactionsN).toBeCloseTo(weight, 6);
    expect(result.output.modelStatus).toBe('UNVERIFIED_LIFTING_STATICS_SCREEN');
  });

  it('scales load by mass and dynamic amplification factor', async () => {
    const result = await run({ ...base(), handlingMassKg: 200, dynamicAmplificationFactor: 1.5 });
    expect(result.success).toBe(true);
    expect(result.output.totalDesignVerticalLoadN).toBeCloseTo(200 * 9.80665 * 1.5, 6);
  });

  it('flags a specified allowable load exceeded and never issues certification', async () => {
    const input = base();
    input.liftingPoints[0].pointAllowableLoadN = 400;
    const result = await run(input);
    expect(result.success).toBe(true);
    expect(result.output.capacityScreenStatus).toBe('EXCEEDS_ENTERED_WLL');
    expect(result.output.pointLoads[0].utilizationRatio).toBeGreaterThan(1);
    expect(result.output.structuralComplianceValidated).toBe(false);
  });

  it('does not substitute a capacity when WLL is not known', async () => {
    const input = base();
    input.liftingPoints[0].pointAllowableLoadN = null as any;
    const result = await run(input);
    expect(result.success).toBe(true);
    expect(result.output.capacityScreenStatus).toBe('INCOMPLETE_WLL');
    expect(result.output.pointLoads[0].utilizationRatio).toBeNull();
  });

  it.each([
    ['unequal shares', { ...base(), liftingPoints: [ { ...base().liftingPoints[0], verticalLoadShare: 0.25 }, base().liftingPoints[1] ] }],
    ['angle from vertical at 89 deg', { ...base(), liftingPoints: [ { ...base().liftingPoints[0], slingAngleFromVerticalDeg: 89 }, base().liftingPoints[1] ] }],
    ['missing handling mass', { ...base(), handlingMassKg: undefined }],
    ['zero dynamic factor', { ...base(), dynamicAmplificationFactor: 0 }],
    ['duplicate points', { ...base(), liftingPoints: [ base().liftingPoints[0], base().liftingPoints[0] ] }],
    ['missing source', { ...base(), massSourceRef: '' }],
    ['unsupported invented approval', { ...base(), inputBasis: 'APPROVED', loadShareSourceRef: 'TBD' }],
  ])('rejects invalid %s', async (_label, input) => {
    const result = await run(input);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation');
  });

  it('enforces tool execution permissions', async () => {
    const result = await ToolRegistry.getInstance().executeTool('TOOL-STRUCTURES-LIFT-01', base(), []);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission Denied');
  });
});
