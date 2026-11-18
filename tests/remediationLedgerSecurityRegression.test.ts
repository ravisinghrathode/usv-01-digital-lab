import { describe, expect, it } from 'vitest';
import { summarizeUnverifiedRemediationLedger } from '../src/core/remediation/RemediationStatus';

const makeLedger = () => ({
  schemaVersion: 'USV-REMEDIATION-1',
  baseline: 'a'.repeat(40),
  updatedAt: '2026-11-18',
  constraints: ['Independent human approval remains required'],
  items: Array.from({ length: 12 }, (_, index) => ({
    id: 'PR-' + String(index + 1).padStart(2, '0'),
    state: 'not-verified',
    pullRequest: '',
    verification: null as string | null,
  })),
});

describe('unverified remediation ledger security regressions', () => {
  it('never interprets an unsigned twelve-item ledger as independently complete', () => {
    const result = summarizeUnverifiedRemediationLedger(makeLedger());
    expect(result.completeAndIndependentlyVerified).toBe(0);
    expect(result.conclusion).toBe('NO_INDEPENDENT_COMPLETION_EVIDENCE');
  });

  it('rejects forged completion even when every other field is valid', () => {
    const ledger = makeLedger();
    ledger.items[0].state = 'complete';
    expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('UNVERIFIED_COMPLETION_CLAIM');
  });

  it('rejects an embedded independent approval field', () => {
    const ledger = { ...makeLedger(), independentlyApproved: true };
    expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('unsupported root field');
  });

  it('rejects visual direction overrides in verification notes', () => {
    const ledger = makeLedger();
    ledger.items[0].verification = 'pending\u202Eapproved';
    expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('invalid verification note');
  });

  it('rejects fabricated noncanonical PR URLs for partial claims', () => {
    const ledger = makeLedger();
    ledger.items[0].state = 'partial-implementation-awaiting-review';
    ledger.items[0].pullRequest = 'https://github.com/other/repo/pull/1';
    ledger.items[0].verification = 'Pending external review';
    expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('noncanonical PR link');
  });
  it('rejects non-enumerable forged root and item approval metadata', () => {
    const root = makeLedger();
    Object.defineProperty(root, 'stageEApproved', { value: true, enumerable: false });
    expect(() => summarizeUnverifiedRemediationLedger(root)).toThrow('unsupported root field');

    const nested = makeLedger();
    Object.defineProperty(nested.items[0], 'humanApproved', { value: true, enumerable: false });
    expect(() => summarizeUnverifiedRemediationLedger(nested)).toThrow('unsupported item field');
  });

  it('rejects symbol-keyed claims rather than silently discarding them', () => {
    const ledger = makeLedger();
    Object.defineProperty(ledger.items[0], Symbol('releaseApproval'), { value: true });
    expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('unsupported item field');
  });

  it('rejects accessor-backed ledger fields without invoking the getter', () => {
    const ledger = makeLedger();
    let calls = 0;
    Object.defineProperty(ledger.items[0], 'state', {
      enumerable: true,
      get() { calls += 1; return 'not-verified'; },
    });
    expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('accessor-backed item field');
    expect(calls).toBe(0);
  });

  it('still accepts ordinary JSON data records with no approval claims', () => {
    const parsed = JSON.parse(JSON.stringify(makeLedger())) as unknown;
    expect(summarizeUnverifiedRemediationLedger(parsed).notVerified).toBe(12);
  });

});
