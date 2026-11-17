export const REMEDIATION_IDS = Array.from(
  { length: 12 }, (_, index) => 'PR-' + String(index + 1).padStart(2, '0')
) as readonly string[];

export interface RemediationSummary {
  schemaVersion: 'USV-REMEDIATION-1';
  total: 12;
  completeAndIndependentlyVerified: 0;
  partiallyImplemented: number;
  notVerified: number;
  issues: Array<{
    id: string;
    status: 'PARTIAL_IMPLEMENTATION' | 'NOT_VERIFIED';
    pullRequest: string | null;
    blocker: string;
  }>;
  conclusion: 'NO_INDEPENDENT_COMPLETION_EVIDENCE';
  warning: 'A repository status declaration is not a verified GitHub merge, CI run, independent reviewer signature, or naval engineering release';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Explicitly rejects any claimed accepted/complete state until a separately
 * authenticated verifier can validate CI, human review, exact SHA and E2E
 * acceptance. This legacy status file CANNOT certify itself.
 */
export function summarizeUnverifiedRemediationLedger(value: unknown): RemediationSummary {
  if (!isRecord(value) || value.schemaVersion !== 'USV-REMEDIATION-1' ||
      !Array.isArray(value.items) || value.items.length !== REMEDIATION_IDS.length) {
    throw new Error('REMEDIATION_LEDGER_INVALID: expected 12 canonical tasks');
  }
  const issues: RemediationSummary['issues'] = [];
  const seen = new Set<string>();
  for (const [index, unknownItem] of value.items.entries()) {
    if (!isRecord(unknownItem)) throw new Error('REMEDIATION_LEDGER_INVALID: malformed item');
    const id = unknownItem.id;
    if (id !== REMEDIATION_IDS[index] || seen.has(id as string)) {
      throw new Error('REMEDIATION_LEDGER_INVALID: duplicate or out-of-order item');
    }
    seen.add(id as string);
    const state = unknownItem.state;
    const isPartial = state === 'partial-implementation-awaiting-review';
    if (!isPartial && state !== 'not-verified') {
      throw new Error('REMEDIATION_LEDGER_UNVERIFIED_COMPLETION_CLAIM: ' + String(id) +
        ' cannot be declared complete using this unsigned status file');
    }
    const link = unknownItem.pullRequest;
    if (typeof link !== 'string' ||
        (link.length > 0 &&
          !/^https:\/\/github\.com\/ravisinghrathode\/usv-01-digital-lab\/pull\/[1-9][0-9]*$/.test(link))) {
      throw new Error('REMEDIATION_LEDGER_INVALID: noncanonical PR link');
    }
    // A partial implementation must identify inspectable work and an explicit
    // outstanding verification note. Otherwise the dashboard could display
    // progress based solely on an unsubstantiated state string.
    if (isPartial && (!link || typeof unknownItem.verification !== 'string' ||
        !unknownItem.verification.trim())) {
      throw new Error('REMEDIATION_LEDGER_INVALID: partial item lacks PR or blocker');
    }
    if (unknownItem.verification !== null &&
        unknownItem.verification !== undefined &&
        (typeof unknownItem.verification !== 'string' ||
          unknownItem.verification.length > 4000)) {
      throw new Error('REMEDIATION_LEDGER_INVALID: invalid verification note');
    }
    issues.push({
      id: id as string,
      status: isPartial ? 'PARTIAL_IMPLEMENTATION' : 'NOT_VERIFIED',
      pullRequest: link || null,
      blocker: typeof unknownItem.verification === 'string' && unknownItem.verification.trim()
        ? unknownItem.verification : 'No evidence of complete independent acceptance recorded'
    });
  }
  const partiallyImplemented = issues.filter(i => i.status === 'PARTIAL_IMPLEMENTATION').length;
  return {
    schemaVersion: 'USV-REMEDIATION-1',
    total: 12,
    completeAndIndependentlyVerified: 0,
    partiallyImplemented,
    notVerified: 12 - partiallyImplemented,
    issues,
    conclusion: 'NO_INDEPENDENT_COMPLETION_EVIDENCE',
    warning: 'A repository status declaration is not a verified GitHub merge, CI run, independent reviewer signature, or naval engineering release'
  };
}
