import { describe, expect, it } from 'vitest';
import {
  INITIAL_WORKSTREAMS,
  INITIAL_LOAD_CASES,
  INITIAL_MATERIALS,
  INITIAL_SIMULATIONS,
} from '../src/data/initialProjectData.ts';

/**
 * ECR-20261113-004: regression protection against the former fake-green
 * structural sample. Not a verification that an actual hull is structurally safe.
 */
describe('Structural project seed is unapproved and fails closed', () => {
  it('does not publish the mechanical workstream as nominal', () => {
    const structural = INITIAL_WORKSTREAMS.find(item => item.code === 'MEC');
    expect(structural).toBeDefined();
    expect(structural!.status).toBe('Blocked');
  });

  it('never marks synthetic structural load cases as FEA passes or sets approved factors', () => {
    expect(INITIAL_LOAD_CASES.length).toBeGreaterThan(0);
    for (const row of INITIAL_LOAD_CASES) {
      expect(row.governingStandard).toContain('TBD');
      expect(row.designPressureOrForce).toContain('TBD');
      expect(row.safetyFactorTarget).toBe('TBD');
      expect(row.feaStatus).toMatch(/TBD/);
      expect(row.feaStatus).not.toMatch(/Solved|Criteria Met|Approved/i);
      expect(row.feaStatus).not.toMatch(/^Verified/i);
    }
  });

  it('labels each candidate structural material as illustrative and not authoritative', () => {
    expect(INITIAL_MATERIALS.length).toBeGreaterThan(0);
    for (const mat of INITIAL_MATERIALS) {
      expect(mat.isIllustrative).toBe(true);
      expect(mat.notes).toMatch(/ILLUSTRATIVE/);
      expect(mat.notes).not.toMatch(/authoritative choice|selected for/i);
    }
  });

  it('does not treat a sample structural solver record as executed or certified', () => {
    const structuralSims = INITIAL_SIMULATIONS.filter(item => item.discipline === 'MEC');
    expect(structuralSims.length).toBeGreaterThan(0);
    for (const sim of structuralSims) {
      expect(sim.isIllustrative).toBe(true);
      expect(sim.runStatus).toBe('Draft');
      expect(sim.outputFiles).toMatch(/TBD/);
      expect(sim.resultsSummary).toMatch(/TBD/);
      expect(sim.validationStatus).toMatch(/NO VERIFIED FEA/);
    }
  });
});
