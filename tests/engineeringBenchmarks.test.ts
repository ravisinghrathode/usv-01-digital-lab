import { describe, expect, it } from 'vitest';
import { evaluateBenchmark, type ReferenceMeasurement } from '../src/core/verification/EngineeringBenchmarks.ts';

const measured: ReferenceMeasurement = {
  id: 'REF-DISP-01', quantity: 'Displacement', referenceValue: 6, observedValue: 6.02,
  absoluteTolerance: 0.01, relativeTolerance: 0.005, unit: 'tonnes', sourceReference: 'independent-hydrostatic-sheet-001'
};
describe('Engineering benchmark acceptance (not certification)', () => {
  it('fails closed when no reference data exist', () => {
    const r = evaluateBenchmark([]);
    expect(r.status).toBe('NO_REFERENCE_DATA');
    expect(r.engineeringReleaseApproved).toBe(false);
  });
  it('compares with max of absolute and relative tolerances without certifying', () => {
    const r = evaluateBenchmark([measured]);
    expect(r.status).toBe('NUMERIC_PASS_UNCERTIFIED');
    expect(r.comparisons[0].allowableError).toBeCloseTo(0.03);
    expect(r.comparisons[0].absoluteError).toBeCloseTo(0.02);
    expect(r.independentlyValidated).toBe(false);
  });
  it('reports reference mismatch as failed', () => {
    expect(evaluateBenchmark([{ ...measured, observedValue: 8 }]).status).toBe('NUMERIC_FAIL');
  });
  it('rejects undefined tolerance, non-finite measurements, duplicate ids and missing provenance', () => {
    const bad = [
      { ...measured, relativeTolerance: -1 },
      { ...measured, referenceValue: Number.NaN },
      { ...measured, sourceReference: '' }
    ];
    expect(evaluateBenchmark(bad).status).toBe('INVALID_REFERENCE_DATA');
    expect(evaluateBenchmark([measured, measured]).status).toBe('INVALID_REFERENCE_DATA');
  });
  it('handles zero reference with absolute tolerance and no relative divide-by-zero', () => {
    const r = evaluateBenchmark([{ ...measured, referenceValue: 0, observedValue: 0.001 }]);
    expect(r.comparisons[0].relativeError).toBeNull();
    expect(r.comparisons[0].passed).toBe(true);
  });
});
