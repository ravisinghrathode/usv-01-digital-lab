import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { summarizeUnverifiedRemediationLedger } from '../src/core/remediation/RemediationStatus.ts';

const ledger = JSON.parse(fs.readFileSync(
  path.join(process.cwd(), 'docs/remediation/status.json'), 'utf8'
)) as Record<string, any>;

describe('closed-loop twelve-issue remediation reporting', () => {
  it('reports exactly 12 issues and never treats an unsigned ledger as verified closure', () => {
    const status = summarizeUnverifiedRemediationLedger(ledger);
    expect(status.total).toBe(12);
    expect(status.issues.map(row => row.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => 'PR-' + String(i + 1).padStart(2, '0'))
    );
    expect(status.completeAndIndependentlyVerified).toBe(0);
    expect(status.partiallyImplemented + status.notVerified).toBe(12);
    expect(status.conclusion).toBe('NO_INDEPENDENT_COMPLETION_EVIDENCE');
  });

  it('refuses unsupported completion claims, even when a PR URL and note are provided', () => {
    for (const status of ['complete', 'verified-complete', 'accepted', 'merged', 'APPROVED', 'partial-complete', 'partial-accepted', 'partial-verified']) {
      const fraudulent = structuredClone(ledger);
      fraudulent.items[0].state = status;
      fraudulent.items[0].verification = 'All tests passed (not independently verified)';
      expect(() => summarizeUnverifiedRemediationLedger(fraudulent))
        .toThrow('REMEDIATION_LEDGER_UNVERIFIED_COMPLETION_CLAIM');
    }
  });

  it('rejects duplicates, missing issues and arbitrary external PR links', () => {
    const duplicate = structuredClone(ledger);
    duplicate.items[1].id = 'PR-01';
    expect(() => summarizeUnverifiedRemediationLedger(duplicate)).toThrow();
    const missing = structuredClone(ledger);
    missing.items.pop();
    expect(() => summarizeUnverifiedRemediationLedger(missing)).toThrow();
    const hostile = structuredClone(ledger);
    hostile.items[0].pullRequest = 'https://example.invalid/fake-approval';
    expect(() => summarizeUnverifiedRemediationLedger(hostile))
      .toThrow(/noncanonical PR link/);
  });

  it('rejects unsupported partial-progress claims without an inspectable PR and blocker', () => {
    const noPr = structuredClone(ledger);
    noPr.items[0].state = 'partial-implementation-awaiting-review';
    noPr.items[0].pullRequest = '';
    expect(() => summarizeUnverifiedRemediationLedger(noPr))
      .toThrow('partial item lacks PR or blocker');

    for (const note of [null, '', '   ']) {
      const noBlocker = structuredClone(ledger);
      noBlocker.items[0].state = 'partial-implementation-awaiting-review';
      noBlocker.items[0].verification = note;
      expect(() => summarizeUnverifiedRemediationLedger(noBlocker))
        .toThrow('partial item lacks PR or blocker');
    }
  });

  it('rejects shadow approval and acceptance assertions in undeclared fields', () => {
    for (const [field, value] of [
      ['accepted', true], ['engineeringCertified', true],
      ['independentReview', { approved: true }], ['completeAndIndependentlyVerified', 12]
    ] as const) {
      const shadowRoot = structuredClone(ledger);
      shadowRoot[field] = value;
      expect(() => summarizeUnverifiedRemediationLedger(shadowRoot))
        .toThrow('unsupported root field');
      const shadowItem = structuredClone(ledger);
      shadowItem.items[0][field] = value;
      expect(() => summarizeUnverifiedRemediationLedger(shadowItem))
        .toThrow('unsupported item field');
    }
  });

  it('rejects malformed provenance metadata instead of trusting a partial status', () => {
    for (const [field, invalid] of [
      ['baseline', 'unversioned'],
      ['updatedAt', 'yesterday'],
      ['constraints', []],
      ['constraints', ['valid', '  ']],
      ['constraints', { approved: true }]
    ] as const) {
      const forged = structuredClone(ledger);
      forged[field] = invalid;
      expect(() => summarizeUnverifiedRemediationLedger(forged))
        .toThrow('malformed provenance metadata');
    }
  });

  it('bounds governance constraints and rejects duplicate declarations', () => {
    const repeated = structuredClone(ledger);
    repeated.constraints.push(repeated.constraints[0]);
    expect(() => summarizeUnverifiedRemediationLedger(repeated))
      .toThrow('malformed provenance metadata');

    const oversized = structuredClone(ledger);
    oversized.constraints = Array.from({ length: 33 }, (_, index) => 'Constraint ' + index);
    expect(() => summarizeUnverifiedRemediationLedger(oversized))
      .toThrow('malformed provenance metadata');
  });

  it('accepts a real canonical ISO provenance date and rejects calendar rollover', () => {
    const valid = structuredClone(ledger);
    valid.updatedAt = '2026-11-17';
    expect(summarizeUnverifiedRemediationLedger(valid).total).toBe(12);

    for (const date of ['2026-02-30', '2026-13-01', '2026-11-17T00:00:00Z', '2026-1-7', '2026-00-01']) {
      const invalid = structuredClone(ledger);
      invalid.updatedAt = date;
      expect(() => summarizeUnverifiedRemediationLedger(invalid))
        .toThrow('malformed provenance metadata');
    }
  });

  it('rejects control characters in untrusted status notes and constraints', () => {
    for (const control of ['\u0000', '\u001b', '\n', '\r', '\u007f']) {
      const note = structuredClone(ledger);
      note.items[0].verification = 'pending' + control + 'approved';
      expect(() => summarizeUnverifiedRemediationLedger(note))
        .toThrow('invalid verification note');
      const constraint = structuredClone(ledger);
      constraint.constraints[0] = 'safety' + control + 'bypass';
      expect(() => summarizeUnverifiedRemediationLedger(constraint))
        .toThrow('malformed provenance metadata');
    }
  });

  it('rejects Unicode bidirectional spoofing in notes and constraints', () => {
    for (const control of ['\\u202a', '\\u202e', '\\u2066', '\\u2069']) {
      const note = structuredClone(ledger);
      note.items[0].verification = 'pending' + control + 'approved';
      expect(() => summarizeUnverifiedRemediationLedger(note))
        .toThrow('invalid verification note');
      const constraint = structuredClone(ledger);
      constraint.constraints[0] = 'review' + control + 'accepted';
      expect(() => summarizeUnverifiedRemediationLedger(constraint))
        .toThrow('malformed provenance metadata');
    }
  });

  it('adds read-only status utility without rewriting authoritative source', () => {
    const manifest = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), 'package.json'), 'utf8'
    )) as { scripts: Record<string, string> };
    expect(manifest.scripts['remediation:status'])
      .toBe('tsx scripts/remediation/status.ts');
    const source = fs.readFileSync(path.join(process.cwd(),
      'scripts/remediation/status.ts'), 'utf8');
    expect(source).toContain('summarizeUnverifiedRemediationLedger');
    expect(source).not.toContain('writeFileSync');
  });
});
