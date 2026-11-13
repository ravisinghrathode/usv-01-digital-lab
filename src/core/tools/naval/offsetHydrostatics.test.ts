import { describe, expect, it } from 'vitest';
import { calculateOffsetHydrostatics, type HydroInput, type OffsetPoint } from './offsetHydrostatics.ts';

function rectangle(y0: number, y1: number, z0: number, z1: number): OffsetPoint[] {
  return [[y0, z0], [y1, z0], [y1, z1], [y0, z1]];
}

function boxInput(): HydroInput {
  return {
    hull: {
      geometryReference: 'ANALYTIC-RECTANGULAR-BARGE-ONLY',
      geometryRevision: 'test-v1',
      stations: [0, 10].map(xM => ({ xM, loops: [rectangle(-1, 1, 0, 1)] }))
    },
    load: {
      id: 'ANALYTIC-TEST-01',
      massKg: 10250,
      kgM: 0.4,
      lcgM: 5,
      tcgM: 0,
      freeSurfaceMomentKgM: 0
    },
    waterDensityKgM3: 1025,
    heelAnglesDeg: [0, 1, 5, 10]
  };
}

describe('HYD-01 section-derived hydrostatics', () => {
  it('reproduces rectangular barge volume, KB, LCB, LCF, BMt and BMl', () => {
    const r = calculateOffsetHydrostatics(boxInput());
    expect(r.equilibriumDraftM).toBeCloseTo(0.5, 8);
    expect(r.displacedVolumeM3).toBeCloseTo(10, 8);
    expect(r.buoyantMassKg).toBeCloseTo(10250, 7);
    expect(r.displacementClosureErrorKg).toBeCloseTo(0, 7);
    expect(r.kbM).toBeCloseTo(0.25, 8);
    expect(r.lcbM).toBeCloseTo(5, 8);
    expect(r.lcfM).toBeCloseTo(5, 8);
    expect(r.waterplaneAreaM2).toBeCloseTo(20, 8);
    expect(r.bmtM).toBeCloseTo(2 / 3, 8);
    expect(r.bmlM).toBeCloseTo(50 / 3, 8);
    expect(r.uncorrectedGmtM).toBeCloseTo(0.25 + 2 / 3 - 0.4, 8);
    expect(r.freeSurfaceCorrectedGmtM).toBeCloseTo(r.uncorrectedGmtM!, 8);
    expect(r.longitudinalImbalanceM).toBeCloseTo(0, 8);
    expect(r.engineeringComplianceValidated).toBe(false);
    expect(r.status).toBe('GEOMETRY_DERIVED_UNVERIFIED');
  });

  it('reproduces symmetric two-hull waterplane transverse inertia', () => {
    const input = boxInput();
    input.hull.stations = [0, 6].map(xM => ({
      xM,
      loops: [rectangle(-2, -1, 0, 1), rectangle(1, 2, 0, 1)]
    }));
    input.load.massKg = 6150;
    input.load.lcgM = 3;
    const r = calculateOffsetHydrostatics(input);
    expect(r.equilibriumDraftM).toBeCloseTo(0.5, 8);
    expect(r.displacedVolumeM3).toBeCloseTo(6, 8);
    expect(r.bmtM).toBeCloseTo(28 / 6, 8);
    expect(r.tcbM).toBeCloseTo(0, 8);
  });

  it('calculates positive righting lever for positive heel and zero GZ when upright', () => {
    const r = calculateOffsetHydrostatics(boxInput());
    expect(r.curve[0].uncorrectedGzM).toBeCloseTo(0, 8);
    expect(r.curve[1].uncorrectedGzM).toBeGreaterThan(0);
    expect(r.curve[2].uncorrectedGzM).toBeGreaterThan(0);
    for (const p of r.curve) expect(p.volumeM3).toBeCloseTo(10, 7);
  });

  it('retains unknown free-surface correction as null, not zero', () => {
    const input = boxInput();
    delete input.load.freeSurfaceMomentKgM;
    const r = calculateOffsetHydrostatics(input);
    expect(r.freeSurfaceCorrectedGmtM).toBeNull();
    expect(r.curve.every(p => p.freeSurfaceCorrectedGzM === null)).toBe(true);
    expect(r.engineeringComplianceValidated).toBe(false);
  });

  it('subtracts free-surface correction from GM and each heel GZ', () => {
    const input = boxInput();
    input.load.freeSurfaceMomentKgM = 1025; // 0.1 m loss at 10,250 kg
    const r = calculateOffsetHydrostatics(input);
    expect(r.freeSurfaceCorrectedGmtM).toBeCloseTo(r.uncorrectedGmtM! - 0.1, 8);
    for (const p of r.curve) {
      expect(p.freeSurfaceCorrectedGzM).toBeCloseTo(
        p.uncorrectedGzM - 0.1 * Math.sin(p.heelDeg * Math.PI / 180), 8);
    }
  });

  it('rejects insufficient buoyancy, invalid offset geometry and missing provenance', () => {
    const overload = boxInput();
    overload.load.massKg = 25000;
    expect(() => calculateOffsetHydrostatics(overload)).toThrow(/exhausts/);
    const missingRef = boxInput();
    missingRef.hull.geometryReference = '';
    expect(() => calculateOffsetHydrostatics(missingRef)).toThrow(/Geometry source/);
    const reversedStations = boxInput();
    reversedStations.hull.stations.reverse();
    expect(() => calculateOffsetHydrostatics(reversedStations)).toThrow(/strictly increasing/);
    const missingLoad = boxInput();
    missingLoad.load.massKg = Number.NaN;
    expect(() => calculateOffsetHydrostatics(missingLoad)).toThrow(/finite/);
  });

  it('detects asymmetric longitudinal mass placement without claiming trim closure', () => {
    const input = boxInput();
    input.load.lcgM = 6;
    const r = calculateOffsetHydrostatics(input);
    expect(r.longitudinalImbalanceM).toBeCloseTo(1, 8);
    expect(r.fixedTrimOnly).toBe(true);
    expect(r.engineeringComplianceValidated).toBe(false);
  });
});

describe('HYD-01 regression: offset topology and varying waterplane', () => {
  it('integrates linearly tapered rectangular sections and longitudinal moments', () => {
    const input = boxInput();
    input.hull.stations[0].loops = [rectangle(-0.5, 0.5, 0, 1)];
    input.hull.stations[1].loops = [rectangle(-1.5, 1.5, 0, 1)];
    input.load.lcgM = 35 / 6;
    const r = calculateOffsetHydrostatics(input);
    expect(r.equilibriumDraftM).toBeCloseTo(0.5, 8);
    expect(r.displacedVolumeM3).toBeCloseTo(10, 8);
    expect(r.lcbM).toBeCloseTo(35 / 6, 8);
    expect(r.lcfM).toBeCloseTo(35 / 6, 8);
    expect(r.bmlM).toBeCloseTo(55 / 3 - 55 / 18, 8); // 15.27778 m; central waterplane moment / 10 m³
  });

  it('rejects crossing polygons, nested loops, and double-counted overlapping hulls', () => {
    const crossing = boxInput();
    crossing.hull.stations[0].loops = [[[0,0],[2,2],[0,2],[2,0],[3,-1]]];
    expect(() => calculateOffsetHydrostatics(crossing)).toThrow(/Self-intersecting/);
    const nested = boxInput();
    nested.hull.stations = [0, 10].map(xM => ({
      xM, loops: [rectangle(-1,1,0,1), rectangle(-0.3,0.3,0.2,0.8)]
    }));
    expect(() => calculateOffsetHydrostatics(nested)).toThrow(/Nested/);
    const overlapping = boxInput();
    overlapping.hull.stations = [0, 10].map(xM => ({
      xM, loops: [rectangle(-1,1,0,1), rectangle(0.5,1.5,0,1)]
    }));
    expect(() => calculateOffsetHydrostatics(overlapping)).toThrow(/Overlapping/);
  });
});
