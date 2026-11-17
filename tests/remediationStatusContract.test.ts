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
