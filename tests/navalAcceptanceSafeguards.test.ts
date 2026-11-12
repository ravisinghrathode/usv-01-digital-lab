import { describe, expect, it } from 'vitest';
import { HydrostaticsTool, ResistanceTool } from '../src/core/tools/naval/engineeringTools.ts';

const hull = { lwlMeters: 8, beamMeters: 2.4, draftMeters: 0.5 };
describe('Naval estimator acceptance safeguards', () => {
  it('identifies hydrostatic outputs as non-certified even with supplied KG', async () => {
    const output = await HydrostaticsTool.execute(HydrostaticsTool.inputSchema.parse({
      ...hull, kgMeters: 0.5, blockCoefficientCb: 0.45, waterplaneCoefficientCwp: 0.65
    }));
    expect(HydrostaticsTool.outputSchema.safeParse(output).success).toBe(true);
    expect(output.engineeringComplianceValidated).toBe(false);
  });

  it('rejects physically impossible propulsive efficiency', () => {
    const input = { ...hull, displacementTonnes: 3.5, speedKnots: 12 };
    expect(ResistanceTool.inputSchema.safeParse({ ...input, propulsiveEfficiencyEtaD: 0 }).success).toBe(false);
    expect(ResistanceTool.inputSchema.safeParse({ ...input, propulsiveEfficiencyEtaD: 1.3 }).success).toBe(false);
  });

  it('enforces power/unit consistency without implying resistance validation', async () => {
    const output = await ResistanceTool.execute(ResistanceTool.inputSchema.parse({
      ...hull, displacementTonnes: 3.5, speedKnots: 12, propulsiveEfficiencyEtaD: 0.65
    }));
    expect(ResistanceTool.outputSchema.safeParse(output).success).toBe(true);
    expect(output.totalResistanceKn).toBeGreaterThan(0);
    expect(output.shaftBrakePowerPbKw).toBeGreaterThan(output.effectivePowerPeKw);
    expect(output.engineeringComplianceValidated).toBe(false);
    expect(output.modelStatus).toBe('PRELIMINARY_EMPIRICAL_ESTIMATE');
  });
});
