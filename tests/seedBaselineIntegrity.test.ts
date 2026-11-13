import { describe, expect, it } from 'vitest';
import {
  INITIAL_PROJECT,
  INITIAL_NAVAL_PARTICULARS,
  INITIAL_WEIGHT_CG,
  INITIAL_RESISTANCE,
  INITIAL_SIMULATIONS,
  INITIAL_TEST_RECORDS,
  INITIAL_LOAD_CASES,
  INITIAL_POWER_LOADS,
  INITIAL_ACTIVITY_LOG,
  INITIAL_MATERIALS,
  INITIAL_KNOWLEDGE_NOTES
} from '../src/data/initialProjectData.ts';

describe('No fabricated engineering baseline or physical acceptance in starter fixtures', () => {
  it('starts with no approved vessel geometry or displacement', () => {
    expect(INITIAL_PROJECT.governanceState).toBe('Draft');
    expect(INITIAL_PROJECT.baselineRev).toContain('NO APPROVED VESSEL BASELINE');
    expect(INITIAL_NAVAL_PARTICULARS.validationState).toBe('Unverified / TBD');
    for (const [key, value] of Object.entries(INITIAL_NAVAL_PARTICULARS)) {
      if (key !== 'validationState') expect(value).toBe('TBD');
    }
  });

  it('does not preload fictional weighed masses, resistance or passed FAT records', () => {
    expect(INITIAL_WEIGHT_CG).toHaveLength(0);
    expect(INITIAL_RESISTANCE).toHaveLength(0);
    expect(INITIAL_TEST_RECORDS).toHaveLength(0);
    expect(INITIAL_POWER_LOADS).toHaveLength(0);
    expect(INITIAL_ACTIVITY_LOG).toHaveLength(0);
  });

  it('treats planned synthetic simulations and structural loads as unevaluated', () => {
    for (const sim of INITIAL_SIMULATIONS) {
      expect(sim.isIllustrative).toBe(true);
      expect(sim.runStatus).toBe('Draft');
      expect(sim.resultsSummary).toContain('no run or result verified');
      expect(sim.validationStatus).toContain('UNVERIFIED');
    }
    for (const load of INITIAL_LOAD_CASES) {
      expect(load.designPressureOrForce).toContain('TBD');
      expect(load.feaStatus).toContain('TBD');
    }
    expect(INITIAL_MATERIALS.every(m => m.isIllustrative)).toBe(true);
    expect(INITIAL_KNOWLEDGE_NOTES[0].contentMarkdown).toContain('Applicability Not Established');
    expect(INITIAL_KNOWLEDGE_NOTES.every(n => !n.googleDriveRef)).toBe(true);
  });
});
