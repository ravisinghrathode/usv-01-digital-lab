import { describe, expect, it } from 'vitest';
import { calculateTrimmedOffsetHydrostatics, type HydroInput } from './offsetHydrostatics.ts';

function input(): HydroInput {
  return {
    hull: {
      geometryReference: 'INDEPENDENT-ANALYTIC-RECTANGULAR-BOX',
      geometryRevision: 'test-v1',
      stations: [0, 5, 10].map(xM => ({
        xM, loops: [[[-1, 0], [1, 0], [1, 1], [-1, 1]]]
      }))
    },
    load: {
      id: 'RECTANGLE-TEST-ONLY',
      massKg: 10250, kgM: 0.4, lcgM: 5, tcgM: 0,
      freeSurfaceMomentKgM: 0
    },
    waterDensityKgM3: 1025,
    heelAnglesDeg: [0, 1, 5, 10]
  };
}

describe('HYD-01 prescribed-heel coupled heave and trim numerical screen', () => {
  it('gives zero trim, zero upright GZ and correct displaced volume for a balanced box', () => {
    const r = calculateTrimmedOffsetHydrostatics(input());
    expect(r.engineeringComplianceValidated).toBe(false);
    expect(r.status).toBe('GEOMETRY_DERIVED_UNVERIFIED');
    expect(r.method).toBe('COUPLED_HEAVE_TRIM_AT_PRESCRIBED_HEEL');
    for (const pt of r.results) {
      expect(pt.trimDeg).toBeCloseTo(0, 8);
      expect(pt.displacedVolumeM3).toBeCloseTo(10, 7);
      expect(pt.longitudinalMomentResidualM).toBeCloseTo(0, 7);
      expect(pt.correctedGzM).not.toBeNull();
    }
    expect(r.results[0].uncorrectedGzM).toBeCloseTo(0, 9);
    expect(r.results[1].uncorrectedGzM).toBeGreaterThan(0);
  });

  it('solves pitch equilibrium when LCG shifts forward and reverses for aft LCG', () => {
    const forward = input();
    forward.load.lcgM = 6;
    const r = calculateTrimmedOffsetHydrostatics(forward);
    for (const pt of r.results) {
      expect(pt.trimDeg).toBeGreaterThan(0);
      expect(pt.trimDeg).toBeLessThan(15);
      expect(Math.abs(pt.longitudinalMomentResidualM)).toBeLessThan(1e-7);
      expect(pt.displacedVolumeM3).toBeCloseTo(10, 7);
    }
    // For a 10 x 2 x 1 box at draft 0.5 m, the small-angle trim
    // slope is approximately (LCG - LCB) / (BML + KB - KG).
    expect(r.results[0].pitchSlope).toBeCloseTo(1 / (50 / 3 + 0.25 - 0.4), 2);
    const aft = input();
    aft.load.lcgM = 4;
    const other = calculateTrimmedOffsetHydrostatics(aft);
    expect(other.results[0].trimDeg).toBeLessThan(0);
    expect(Math.abs(other.results[0].longitudinalMomentResidualM)).toBeLessThan(1e-7);
  });

  it('fails closed when pitch cannot equilibrate within the defined screen', () => {
    const unbalanced = input();
    unbalanced.load.lcgM = 20; // beyond maximum hull x dimension
    expect(() => calculateTrimmedOffsetHydrostatics(unbalanced)).toThrow(/No static heave\/trim equilibrium/);
  });

  it('does not silently assume missing tank free-surface information is zero', () => {
    const sample = input();
    delete sample.load.freeSurfaceMomentKgM;
    const r = calculateTrimmedOffsetHydrostatics(sample);
    expect(r.results.every(pt => pt.correctedGzM === null)).toBe(true);
  });

  it('keeps reference identifiers and does not turn a numerical pass into certification', () => {
    const r = calculateTrimmedOffsetHydrostatics(input());
    expect(r.geometryReference).toBe('INDEPENDENT-ANALYTIC-RECTANGULAR-BOX');
    expect(r.geometryRevision).toBe('test-v1');
    expect(r.loadCaseId).toBe('RECTANGLE-TEST-ONLY');
    expect(r.limitations.some(x => x.includes('downflooding'))).toBe(true);
  });
});
