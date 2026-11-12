/**
 * Dimensionally labelled marine-system envelope checks for sourced measurements.
 * Does not substitute class rules, detailed test procedures or independent review.
 */
export type MarineCheckKind =
  | 'LAUNCH_RECOVERY_LOAD'
  | 'SEALED_HULL_THERMAL'
  | 'WET_END_ACOUSTIC'
  | 'FOULING_CORROSION'
  | 'BILGE_CONDENSATION';

export interface MarineEnvelopeCase {
  id: string;
  kind: MarineCheckKind;
  observed: number;
  maximumAllowed: number;
  unit: string;
  sourceReference: string;
  designLimitReference: string;
}
const expectedKinds: MarineCheckKind[] = [
  'LAUNCH_RECOVERY_LOAD', 'SEALED_HULL_THERMAL', 'WET_END_ACOUSTIC',
  'FOULING_CORROSION', 'BILGE_CONDENSATION'
];

export function evaluateMarineEnvelope(cases: readonly MarineEnvelopeCase[]) {
  const ids = new Set<string>();
  const findings = cases.map(item => {
    const defects: string[] = [];
    if (!item.id.trim() || ids.has(item.id)) defects.push('missing or duplicate case ID');
    ids.add(item.id);
    if (!Number.isFinite(item.observed) || !Number.isFinite(item.maximumAllowed) ||
        item.observed < 0 || item.maximumAllowed <= 0) defects.push('invalid engineering measurements or limits');
    if (!item.unit.trim() || !item.sourceReference.trim() || !item.designLimitReference.trim()) {
      defects.push('source, units or approved design limit missing');
    }
    if (item.observed > item.maximumAllowed) defects.push('observed value exceeds submitted limit');
    return {
      id: item.id, kind: item.kind,
      status: defects.length ? 'ENVELOPE_FAIL' as const : 'NUMERIC_ENVELOPE_PASS_UNCERTIFIED' as const,
      defects
    };
  });
  const missingKinds = expectedKinds.filter(k => !cases.some(c => c.kind === k));
  return {
    casesChecked: cases.length,
    missingKinds,
    findings,
    numericEnvelopePass: missingKinds.length === 0 && findings.length >= expectedKinds.length &&
      findings.every(f => f.status === 'NUMERIC_ENVELOPE_PASS_UNCERTIFIED'),
    independentlyValidated: false as const,
    marineSystemsAccepted: false as const
  };
}
