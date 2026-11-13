import { describe, expect, it } from 'vitest';
import { ACCEPTANCE_REQUIREMENTS, evaluateAcceptance, type AcceptanceEvidence } from '../src/core/verification/AcceptanceGate.ts';

const sha = 'a'.repeat(40);
const otherSha = 'b'.repeat(40);
const record: AcceptanceEvidence = {
  requirementId: 'HYD-01',
  baselineSha: sha,
  referenceUri: 'https://example.org/independent-tank-trial',
  referenceSha256: 'sha256:' + 'c'.repeat(64),
  sourceType: 'PHYSICAL_TEST',
  reviewedBy: 'Independent reviewer',
  independentlyVerified: true,
  attestationVerified: true
};
describe('USV-01 comprehensive acceptance is fail-closed', () => {
  it('enumerates all 15 acceptance criteria and never certifies without real authority', () => {
    expect(ACCEPTANCE_REQUIREMENTS).toHaveLength(15);
    const report = evaluateAcceptance(sha);
    expect(report.requirements).toHaveLength(15);
    expect(report.verifiedCount).toBe(0);
    expect(report.pendingCount).toBe(15);
    expect(report.engineeringReleaseAccepted).toBe(false);
  });

  it('treats a claim of validated evidence as a submission, not verified approval', () => {
    const report = evaluateAcceptance(sha, [record]);
    expect(report.requirements.find(r => r.id === 'HYD-01')?.status).toBe('SUBMITTED_UNVERIFIED');
    expect(report.requirements.find(r => r.id === 'HYD-01')?.matchingArtifacts).toBe(1);
    expect(report.verifiedCount).toBe(0);
  });

  it('rejects reference to a stale or invalid commit baseline', () => {
    expect(evaluateAcceptance(otherSha, [record]).requirements.find(r => r.id === 'HYD-01')?.status).toBe('PENDING_EVIDENCE');
    expect(evaluateAcceptance('unknown', [record]).baselineValid).toBe(false);
  });

  it('fails closed on malformed untrusted evidence without throwing', () => {
    const malformed = [
      null, undefined, 7, [], { requirementId: 'HYD-01' },
      { ...record, reviewedBy: null },
      { ...record, referenceUri: null },
      { ...record, referenceSha256: 12 },
      { ...record, sourceType: 'UNTRUSTED' },
      { ...record, independentlyVerified: 'yes' },
      { ...record, attestationVerified: 'yes' },
      { ...record, referenceUri: 'https://user:secret@example.org/evidence' },
      { ...record, referenceUri: 'https://example.org@attacker.test/ref' }
    ] as unknown as AcceptanceEvidence[];
    const report = evaluateAcceptance(sha, malformed);
    const hydro = report.requirements.find(r => r.id === 'HYD-01');
    expect(hydro?.status).toBe('PENDING_EVIDENCE');
    expect(hydro?.matchingArtifacts).toBe(0);
    expect(report.engineeringReleaseAccepted).toBe(false);
    expect(evaluateAcceptance(sha, null as unknown as AcceptanceEvidence[]).pendingCount).toBe(15);
    expect(evaluateAcceptance(null as unknown as string, [record]).baselineValid).toBe(false);
  });

  it('accepts well-formed submissions only as unverified, never certified', () => {
    const result = evaluateAcceptance(sha, [record]);
    expect(result.requirements.find(r => r.id === 'HYD-01')?.status).toBe('SUBMITTED_UNVERIFIED');
    expect(result.verifiedCount).toBe(0);
    expect(result.engineeringReleaseAccepted).toBe(false);
  });

  it('rejects untraceable evidence records', () => {
    const report = evaluateAcceptance(sha, [{ ...record, referenceSha256: 'no-checksum', referenceUri: 'file:///private/path' }]);
    expect(report.requirements.find(r => r.id === 'HYD-01')?.status).toBe('PENDING_EVIDENCE');
  });
});
