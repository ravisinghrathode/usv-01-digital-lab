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

  it('rejects semantically duplicate governance constraints hidden by whitespace', () => {
    const ledger = makeLedger();
    ledger.constraints.push('  Independent human approval remains required  ');
    expect(() => summarizeUnverifiedRemediationLedger(ledger))
      .toThrow('malformed provenance metadata');

    const distinct = makeLedger();
    distinct.constraints.push('Independent external witness remains required');
    expect(summarizeUnverifiedRemediationLedger(distinct).notVerified).toBe(12);
  });

  it('rejects whitespace-equivalent governance constraints without changing distinct constraints', () => {
    const ledger = makeLedger();
    ledger.constraints[0] = 'Independent human approval remains required';
    ledger.constraints.push('Independent  human\tapproval remains required');
    expect(() => summarizeUnverifiedRemediationLedger(ledger))
      .toThrow('malformed provenance metadata');

    const distinct = makeLedger();
    distinct.constraints.push('Independent human acceptance remains required');
    expect(summarizeUnverifiedRemediationLedger(distinct).notVerified).toBe(12);
  });

  it('rejects case-equivalent governance constraints while retaining distinct requirements', () => {
    const ledger = makeLedger();
    ledger.constraints.push('independent HUMAN approval remains required');
    expect(() => summarizeUnverifiedRemediationLedger(ledger))
      .toThrow('malformed provenance metadata');

    const distinct = makeLedger();
    distinct.constraints.push('Independent engineering review remains required');
    expect(summarizeUnverifiedRemediationLedger(distinct).notVerified).toBe(12);
  });

  it('rejects Unicode variation selectors in evidence notes and governance constraints', () => {
    for (const selector of [String.fromCodePoint(0xFE0F), String.fromCodePoint(0xE0100)]) {
      const evidence = makeLedger();
      evidence.items[0].verification = 'Review pending' + selector;
      expect(() => summarizeUnverifiedRemediationLedger(evidence)).toThrow('invalid verification note');

      const governance = makeLedger();
      governance.constraints[0] += selector;
      expect(() => summarizeUnverifiedRemediationLedger(governance)).toThrow('malformed provenance metadata');
    }
    expect(summarizeUnverifiedRemediationLedger(makeLedger()).notVerified).toBe(12);
  });

  it('rejects fabricated noncanonical PR URLs for partial claims', () => {
    const ledger = makeLedger();
    ledger.items[0].state = 'partial-implementation-awaiting-review';
    ledger.items[0].pullRequest = 'https://github.com/other/repo/pull/1';
    ledger.items[0].verification = 'Pending external review';
    expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('noncanonical PR link');
  });
  it('rejects unsafe-integer PR identifiers that cannot be resolved exactly', () => {
    for (const identifier of ['9007199254740992', '999999999999999999999999999999']) {
      const ledger = makeLedger();
      ledger.items[0].state = 'partial-implementation-awaiting-review';
      ledger.items[0].pullRequest = 'https://github.com/ravisinghrathode/usv-01-digital-lab/pull/' + identifier;
      ledger.items[0].verification = 'External review pending';
      expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('noncanonical PR link');
    }
    const valid = makeLedger();
    valid.items[0].state = 'partial-implementation-awaiting-review';
    valid.items[0].pullRequest = 'https://github.com/ravisinghrathode/usv-01-digital-lab/pull/201';
    valid.items[0].verification = 'External review pending';
    expect(summarizeUnverifiedRemediationLedger(valid).partiallyImplemented).toBe(1);
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

  it('rejects hidden approval claims on array containers', () => {
    const ledger = makeLedger();
    Object.defineProperty(ledger.items, 'stageEApproved', { value: true, enumerable: false });
    expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('unsupported items array field');
    const constraints = makeLedger();
    Object.defineProperty(constraints.constraints, Symbol('approval'), { value: true });
    expect(() => summarizeUnverifiedRemediationLedger(constraints)).toThrow('unsupported constraints array field');
  });

  it('rejects accessor-backed array indices without executing them', () => {
    const ledger = makeLedger();
    let calls = 0;
    Object.defineProperty(ledger.items, '0', {
      configurable: true,
      get() { calls++; return makeLedger().items[0]; },
    });
    expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('accessor-backed items array field');
    expect(calls).toBe(0);
  });

  it('rejects sparse arrays and still accepts ordinary JSON arrays', () => {
    const ledger = makeLedger();
    delete (ledger.items as Array<unknown>)[0];
    expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('sparse items array');
    expect(summarizeUnverifiedRemediationLedger(makeLedger()).notVerified).toBe(12);
  });

  it('rejects accessor-backed root fields before executing any getters', () => {
    for (const field of ['schemaVersion', 'items', 'constraints'] as const) {
      const ledger = makeLedger();
      let calls = 0;
      Object.defineProperty(ledger, field, {
        configurable: true,
        enumerable: true,
        get() { calls += 1; throw new Error('GETTER_EXECUTED'); },
      });
      expect(() => summarizeUnverifiedRemediationLedger(ledger)).toThrow('accessor-backed root field');
      expect(calls).toBe(0);
    }
  });


});
