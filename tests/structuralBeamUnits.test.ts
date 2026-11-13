import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

// ECR-20261113-004 — synthetic arithmetic benchmark only.
// No hull geometry, scantling rule pressure, weld design or class compliance inferred.
const input = {
  displacementTonnes: 0.12,
  speedKnots: 4,
  lwlMeters: 2.3,
  deadriseAngleDeg: 18,
  unsupportedPanelWidthMm: 450,
  unsupportedPanelLengthMm: 900,
  materialYieldStrengthMpa: 125,
  safetyFactor: 2
};

const run = (overrides: Record<string, unknown> = {}) =>
  ToolRegistry.getInstance().executeTool('TOOL-STRUCTURES-01', { ...input, ...overrides }, ['CALCULATION_EXEC']);

describe('Preliminary structure screening: consistent beam units', () => {
  it('matches simple support UDL bending benchmark in N*m and cm^3', async () => {
    const r = await run();
    expect(r.success).toBe(true);
    expect(r.output.designSlammingPressureKpa).toBe(35);
    expect(r.output.allowableStressMpa).toBe(62.5);
    // 35 kPa * 0.45 m = 15,750 N/m; 0.9m span; M = q*l*l/8 = 1594.6875 N*m.
    expect(r.output.stiffenerPeakMomentNm).toBeCloseTo(1594.688, 3);
    // Z[cm^3] = M[N*m] / allowable[MPa] = 1594.6875 / 62.5 = 25.515 cm^3.
    expect(r.output.stiffenerSectionModulusCm3).toBeCloseTo(25.52, 2);
    expect(r.output.stiffenerBeamModel).toBe('SIMPLY_SUPPORTED_UDL_ARITHMETIC_ONLY');
    expect(r.output.engineeringComplianceValidated).toBe(false);
    expect(r.output.modelStatus).toBe('UNVALIDATED_SCANTLING_SCREEN');
  });

  it('scales section modulus with tributary width and span squared', async () => {
    const narrow = await run({ unsupportedPanelWidthMm: 300 });
    const wide = await run({ unsupportedPanelWidthMm: 600 });
    expect(wide.success).toBe(true);
    expect(wide.output.stiffenerPeakMomentNm).toBeCloseTo(narrow.output.stiffenerPeakMomentNm * 2, 1);

    const shortSpan = await run({ unsupportedPanelLengthMm: 600 });
    const longSpan = await run({ unsupportedPanelLengthMm: 1200 });
    expect(longSpan.output.stiffenerPeakMomentNm).toBeCloseTo(shortSpan.output.stiffenerPeakMomentNm * 4, 1);
  });

  it('does not use beam arithmetic as a certification or a released plating thickness', async () => {
    const r = await run();
    expect(r.output.engineeringComplianceValidated).toBe(false);
    expect(r.output.stiffenerBeamModel).toContain('ARITHMETIC_ONLY');
  });
});
