import { describe, expect, it } from 'vitest';
import { summarizeUnverifiedRemediationLedger } from '../src/core/remediation/RemediationStatus';

function ledgerWithLink(link: string) {
  return {
    schemaVersion: 'USV-REMEDIATION-1',
    baseline: 'a'.repeat(40),
    updatedAt: '2026-11-19',
    constraints: ['No unreviewed engineering acceptance'],
    items: Array.from({ length: 12 }, (_, i) => ({
      id: 'PR-' + String(i + 1).padStart(2, '0'),
      state: i === 0 ? 'partial-implementation-awaiting-review' : 'not-verified',
      pullRequest: i === 0 ? link : '',
      verification: i === 0 ? 'Independent approval outstanding' : null
    }))
  };
}

describe('remediation ledger PR URL bounds', () => {
  it('accepts a canonical repository PR URL', () => {
    const summary = summarizeUnverifiedRemediationLedger(ledgerWithLink('https://github.com/ravisinghrathode/usv-01-digital-lab/pull/201'));
    expect(summary.partiallyImplemented).toBe(1);
    expect(summary.completeAndIndependentlyVerified).toBe(0);
  });

  it('rejects oversized decimal PR identifiers before accepting provenance', () => {
    const url = 'https://github.com/ravisinghrathode/usv-01-digital-lab/pull/' + '9'.repeat(100_000);
    expect(() => summarizeUnverifiedRemediationLedger(ledgerWithLink(url))).toThrow('REMEDIATION_LEDGER_INVALID: noncanonical PR link');
  });
});
