/**
 * Reproducible numerical benchmark comparison. This detects deviations against
 * supplied reference measurements; it does NOT authenticate their provenance
 * or establish design-rule compliance. Both remain external acceptance gates.
 */
export interface ReferenceMeasurement {
  id: string;
  quantity: string;
  referenceValue: number;
  observedValue: number;
  absoluteTolerance: number;
  relativeTolerance: number;
  unit: string;
  sourceReference: string;
}

export interface BenchmarkComparison {
  id: string;
  quantity: string;
  unit: string;
  absoluteError: number;
  relativeError: number | null;
  allowableError: number;
  passed: boolean;
}

export interface BenchmarkReport {
  status: 'NO_REFERENCE_DATA' | 'INVALID_REFERENCE_DATA' | 'NUMERIC_PASS_UNCERTIFIED' | 'NUMERIC_FAIL';
  comparisons: BenchmarkComparison[];
  invalidIds: string[];
  independentlyValidated: false;
  engineeringReleaseApproved: false;
}

export function evaluateBenchmark(measurements: readonly ReferenceMeasurement[]): BenchmarkReport {
  if (!measurements.length) {
    return { status: 'NO_REFERENCE_DATA', comparisons: [], invalidIds: [], independentlyValidated: false, engineeringReleaseApproved: false };
  }
  const invalidIds: string[] = [];
  const comparisons: BenchmarkComparison[] = [];
  const ids = new Set<string>();
  for (const m of measurements) {
    if (
      !m.id.trim() || ids.has(m.id) || !m.quantity.trim() ||
      !m.unit.trim() || !m.sourceReference.trim() ||
      ![m.referenceValue, m.observedValue, m.absoluteTolerance, m.relativeTolerance].every(Number.isFinite) ||
      m.absoluteTolerance < 0 || m.relativeTolerance < 0
    ) {
      invalidIds.push(m.id);
      continue;
    }
    ids.add(m.id);
    const absoluteError = Math.abs(m.observedValue - m.referenceValue);
    const relativeError = m.referenceValue === 0 ? null : absoluteError / Math.abs(m.referenceValue);
    const allowableError = Math.max(m.absoluteTolerance, Math.abs(m.referenceValue) * m.relativeTolerance);
    comparisons.push({
      id: m.id,
      quantity: m.quantity,
      unit: m.unit,
      absoluteError,
      relativeError,
      allowableError,
      passed: absoluteError <= allowableError
    });
  }
  return {
    status: invalidIds.length ? 'INVALID_REFERENCE_DATA' :
      comparisons.some(c => !c.passed) ? 'NUMERIC_FAIL' : 'NUMERIC_PASS_UNCERTIFIED',
    comparisons,
    invalidIds,
    independentlyValidated: false,
    engineeringReleaseApproved: false
  };
}
