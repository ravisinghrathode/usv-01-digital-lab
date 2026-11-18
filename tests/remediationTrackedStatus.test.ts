import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { summarizeUnverifiedRemediationLedger } from '../src/core/remediation/RemediationStatus.ts';

describe('tracked remediation status file contract', () => {
  it('parses the committed status ledger without granting independent acceptance', () => {
    const ledger = JSON.parse(fs.readFileSync('docs/remediation/status.json', 'utf8'));
    const summary = summarizeUnverifiedRemediationLedger(ledger);
    expect(summary.total).toBe(12);
    expect(summary.completeAndIndependentlyVerified).toBe(0);
    expect(summary.conclusion).toBe('NO_INDEPENDENT_COMPLETION_EVIDENCE');
    expect(summary.partiallyImplemented + summary.notVerified).toBe(12);
  });

  it('rejects CI observations embedded in the authoritative status file', () => {
    const ledger = JSON.parse(fs.readFileSync('docs/remediation/status.json', 'utf8'));
    ledger.observations = { governanceConclusion: 'success' };
    expect(() => summarizeUnverifiedRemediationLedger(ledger))
      .toThrow(/unsupported root field/);
  });

  it('keeps the observational CI inventory separate from approval evidence', () => {
    const observations = JSON.parse(fs.readFileSync('docs/remediation/ci-observations.json', 'utf8'));
    expect(observations.schemaVersion).toBe('USV-REMEDIATION-CI-OBSERVATIONS-1');
    expect(observations.openTrackedPullRequests).toContain(201);
    expect(observations.securityBlocker.advisory).toBe('GHSA-fc5q-39xc-vjpf');
  });
});
