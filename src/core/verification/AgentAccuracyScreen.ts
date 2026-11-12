/**
 * Independent TEST-INPUT arithmetic screening of the 26 genuine Gemini role outputs.
 * This verifies only stated numerical relationships, NOT hull-specific naval
 * performance, actual tool execution, third-party reference provenance or approval.
 */
export type AccuracyStatus =
  'ANALYTIC_PASS_UNCERTIFIED' | 'ANALYTIC_FAIL' |
  'QUALITATIVE_REVIEW_REQUIRED' | 'MISSING_SAMPLE';

interface Check { key: string; expected: number; tolerance: number; unit: string }
type Sample = {
  canonicalId: string; outputSchemaValid?: boolean; liveProviderObserved?: boolean;
  mentionsDeterministicToolWithoutTrace?: boolean;
  parsedOutput?: { keyMetrics?: Record<string, unknown>; requiresDirectorApproval?: boolean };
};
const displacementT = 10 * 2.5 * 0.6 * 0.45 * 1025 / 1000;
const ledgerKg = 1600 + 350 + 1100 + 150;
const dutyCycleLoadW = 6000 + 450 + 100 * 0.5 + 150 + 80 + 40 * 0.3;
export const REFERENCE_CASES: Record<string, readonly Check[]> = {
  A05: [{ key: 'calculated_cb', expected: 5500 / (1025 * 10 * 2.5 * 0.6), tolerance: 0.003, unit: '1' }],
  A06: [{ key: 'hydrostaticDisplacement_t', expected: displacementT, tolerance: 0.03, unit: 't' }],
  A07: [{ key: 'froudeNumber', expected: 15 * 1852 / 3600 / Math.sqrt(9.80665 * 10), tolerance: 0.02, unit: '1' }],
  A09: [{ key: 'allocatedMass_kg', expected: ledgerKg, tolerance: 0.01, unit: 'kg' },
        { key: 'unallocatedMass_kg', expected: 5500 - ledgerKg, tolerance: 0.01, unit: 'kg' }],
  A12: [{ key: 'designLiftForce_kN', expected: 5500 * 9.80665 * 2 / 1000, tolerance: 0.2, unit: 'kN' }],
  A14: [{ key: 'continuousLoad_W', expected: 6680, tolerance: 0.2, unit: 'W' },
        { key: 'usableCapacity_kWh', expected: 96, tolerance: 0.01, unit: 'kWh' },
        { key: 'preliminaryEndurance_h', expected: 96000 / dutyCycleLoadW, tolerance: 0.10, unit: 'h' }],
  A15: [{ key: 'hydrostaticMass_kg', expected: displacementT * 1000, tolerance: 10, unit: 'kg' }],
  A23: [{ key: 'hydrostatic_displacement_t', expected: displacementT, tolerance: 0.03, unit: 't' }],
  A25: [{ key: 'calc_disp_t', expected: displacementT, tolerance: 0.03, unit: 't' }]
};

export function screenAgentAccuracy(samples: readonly Sample[]) {
  const rows: { agentId: string; status: AccuracyStatus; findings: string[]; checked: number; passed: number }[] = [];
  for (let i = 1; i <= 26; i++) {
    const id = 'A' + String(i).padStart(2, '0');
    const matching = samples.filter(x => x.canonicalId === id);
    const c = matching[0];
    if (matching.length !== 1 || !c?.liveProviderObserved || !c.outputSchemaValid ||
        !c.parsedOutput || c.parsedOutput.requiresDirectorApproval !== true) {
      rows.push({ agentId: id, status: 'MISSING_SAMPLE', findings: ['Missing, duplicate or malformed live sample'], checked: 0, passed: 0 });
      continue;
    }
    const checks = REFERENCE_CASES[id] ?? [];
    const numeric = c.parsedOutput.keyMetrics ?? {};
    const findings: string[] = [];
    let passed = 0;
    for (const check of checks) {
      const observed = numeric[check.key];
      if (typeof observed !== 'number' || !Number.isFinite(observed)) {
        findings.push('Missing numeric metric: ' + check.key);
      } else if (Math.abs(observed - check.expected) > check.tolerance) {
        findings.push(check.key + ': deviation ' + Math.abs(observed - check.expected).toPrecision(4) +
          ' ' + check.unit + ' > reference tolerance ' + check.tolerance);
      } else {
        passed++;
      }
    }
    if (c.mentionsDeterministicToolWithoutTrace) {
      findings.push('Unsupported assertion referencing an unexecuted deterministic tool');
    }
    const status: AccuracyStatus = checks.length === 0 ? 'QUALITATIVE_REVIEW_REQUIRED' :
      findings.length ? 'ANALYTIC_FAIL' : 'ANALYTIC_PASS_UNCERTIFIED';
    if (!checks.length) findings.push('Independent specialty-domain reference and expert rubric pending');
    rows.push({ agentId: id, status, findings, checked: checks.length, passed });
  }
  const count = (s: AccuracyStatus) => rows.filter(r => r.status === s).length;
  return {
    basis: 'Synthetic 10m worked example. First-principles numerical checks only; not class/CFD/experimental validation',
    agentCount: 26, analyticPass: count('ANALYTIC_PASS_UNCERTIFIED'),
    analyticFail: count('ANALYTIC_FAIL'), humanReviewRequired: count('QUALITATIVE_REVIEW_REQUIRED'),
    sampleMissing: count('MISSING_SAMPLE'),
    independentlyValidatedAgents: 0, productionApproved: false as const, rows
  };
}
