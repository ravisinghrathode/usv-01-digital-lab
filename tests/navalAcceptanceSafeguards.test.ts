import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
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
      ...hull, displacementTonnes: 3.5, speedKnots: 12,
      documentedTotalResistanceKn: 3,
      resistanceEvidenceRef: 'TEST-SYNTHETIC-RESISTANCE',
      propulsiveEfficiencyEtaD: 0.65,
      efficiencyEvidenceRef: 'TEST-SYNTHETIC-ETA-065'
    }));
    expect(ResistanceTool.outputSchema.safeParse(output).success).toBe(true);
    expect(output.totalResistanceKn).toBe(3);
    expect(output.effectivePowerPeKw).toBeCloseTo(3 * 12 * 1852 / 3600, 5);
    expect(output.shaftBrakePowerPbKw).toBeGreaterThan(output.effectivePowerPeKw);
    expect(output.engineeringComplianceValidated).toBe(false);
    expect(output.modelStatus).toBe('EVIDENCE_REFERENCED_UNVERIFIED');
  });
});

describe('RES-01 dashboard provenance and motor sizing safeguard', () => {
  it('does not present an unsourced motor rating or efficiency multiplier as engineering output', () => {
    const ui = fs.readFileSync(path.resolve('src/components/HydrodynamicsView.tsx'), 'utf8');
    const context = fs.readFileSync(path.resolve('USV01_PROJECT_CONTEXT.md'), 'utf8');
    const propulsion = fs.readFileSync(path.resolve('src/components/PropulsionView.tsx'), 'utf8');
    expect(ui).toContain('PROPULSION POWER NOT ESTABLISHED');
    expect(ui).toContain('UNVALIDATED_HEURISTIC_DO_NOT_USE_FOR_PROPULSION_SELECTION');
    expect(ui).not.toMatch(/effectivePowerKW\s*\|\|\s*0\)\s*\/\s*0\.62/);
    expect(ui).not.toContain('Installed Motor (with 25% margin)');
    expect(context).toContain('unverified historical screening figure');
    expect(propulsion).toContain('Propulsion Architecture Proposal — Not Released');
  });
});
