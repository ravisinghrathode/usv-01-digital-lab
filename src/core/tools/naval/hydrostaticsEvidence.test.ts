import { describe, expect, it } from 'vitest';
import { HydrostaticsTool } from './engineeringTools.ts';

const hull = {
  lwlMeters: 5.5,
  beamMeters: 2.2,
  draftMeters: 0.35,
  blockCoefficientCb: 0.44,
  seawaterDensityKgM3: 1025
};

describe('Hydrostatics evidence integrity', () => {
  it('must not certify compliance when KG is assumed', async () => {
    const input = HydrostaticsTool.inputSchema.parse(hull);
    const output = await HydrostaticsTool.execute(input);
    expect(output.stabilityStatus).toBe('UNVERIFIED_ESTIMATE');
    expect(output.kgSource).toBe('ASSUMED_FOR_ESTIMATE');
    expect(output.isPreliminaryEstimate).toBe(true);
    expect(output.complianceCheck.minGmMet).toBe(false);
    expect(HydrostaticsTool.outputSchema.safeParse(output).success).toBe(true);
  });

  it('distinguishes a supplied KG from an estimated value', async () => {
    const input = HydrostaticsTool.inputSchema.parse({ ...hull, kgMeters: 0.3 });
    const output = await HydrostaticsTool.execute(input);
    expect(output.kgSource).toBe('USER_PROVIDED');
    expect(output.isPreliminaryEstimate).toBe(false);
    expect(output.stabilityStatus).not.toBe('UNVERIFIED_ESTIMATE');
    expect(HydrostaticsTool.outputSchema.safeParse(output).success).toBe(true);
  });
});
