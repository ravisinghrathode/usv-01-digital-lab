import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { calculateGZStability } from '../src/utils/navalCalculators.ts';

describe('HYD-01 non-certifying GZ screening', () => {
  it('cannot set compliance pass from an approximate wall-sided curve', () => {
    const r = calculateGZStability({
      displacementKg: 6200, beamM: 2.9, draftM: 0.65, depthM: 1.45,
      vcgM: 0.66, blockCoeffCb: 0.42
    });
    expect(r.audit.criteria.overallPass).toBe(false);
    expect(r.audit.engineeringComplianceValidated).toBe(false);
    expect(typeof r.audit.criteria.screeningThresholdsMet).toBe('boolean');
  });

  it('preserves negative GZ and area for an unstable illustrative scenario', () => {
    const r = calculateGZStability({
      displacementKg: 1500, beamM: 0.8, draftM: 0.5, depthM: 1,
      vcgM: 3, blockCoeffCb: 0.4
    });
    expect(r.curve.find(p => p.heelDeg === 2)!.gzM).toBeLessThan(0);
    expect(r.audit.area0To30DegMrad).toBeLessThan(0);
    expect(r.audit.criteria.overallPass).toBe(false);
  });

  it('does not substitute positive freeboard when deck depth is below draft', () => {
    const r = calculateGZStability({
      displacementKg: 100, beamM: 1, draftM: 0.8, depthM: 0.5,
      vcgM: 0.2, blockCoeffCb: 0.4
    });
    expect(r.audit.criteria.overallPass).toBe(false);
    expect(r.audit.criteria.screeningThresholdsMet).toBe(false);
  });

  it('rejects nonfinite and unphysical values', () => {
    const valid = { displacementKg: 100, beamM: 1, draftM: 0.3, depthM: 0.5,
      vcgM: 0.2, blockCoeffCb: 0.4 };
    expect(() => calculateGZStability({ ...valid, beamM: NaN })).toThrow(/finite/);
    expect(() => calculateGZStability({ ...valid, displacementKg: -100 })).toThrow(/Negative/);
  });

  it('starts vessel dashboard with blank screening fields, not a claimed 6200kg baseline', () => {
    const source = fs.readFileSync(path.resolve('src/components/NavalArchitectureView.tsx'), 'utf8');
    expect(source).not.toContain('useState<number>(6200)');
    expect(source).toContain('useState<number>(0)');
    expect(source).not.toContain('IMO 2008 IS COMPLIANT');
  });
});
