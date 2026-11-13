import { describe, it, expect } from 'vitest';
import { assessMarineEvidence, MARINE_EVIDENCE_REQUIREMENTS, type MarineEvidenceSubmission } from '../src/core/verification/MarineSystemsEvidenceGate.ts';

const sha = 'a'.repeat(40);
const record = (id: string): MarineEvidenceSubmission => ({
  requirementId: id, baselineSha: sha,
  referenceUri: 'https://example.org/unverified-test-report',
  referenceSha256: 'sha256:' + 'b'.repeat(64),
  conditionId: 'LOAD-OR-ENV-CASE-PROPOSED',
  verificationProcedureId: 'PROCEDURE-TBD-EXAMPLE',
  designLimitReference: 'LIMIT-TBD-EXAMPLE',
  reviewedBy: 'Unverified claimant',
  claimedOutcome: 'PASS'
});

describe('MAR-01 marine systems evidence intake is fail-closed', () => {
  it('requires a traceable package across lifting, thermal, acoustic, fouling and bilge', () => {
    const result = assessMarineEvidence(sha);
    expect(MARINE_EVIDENCE_REQUIREMENTS).toHaveLength(13);
    expect(new Set(MARINE_EVIDENCE_REQUIREMENTS.map(x => x.id)).size).toBe(13);
    expect(new Set(MARINE_EVIDENCE_REQUIREMENTS.map(x => x.kind)).size).toBe(5);
    expect(result.status).toBe('NO_EVIDENCE');
    expect(result.missingRequirements).toHaveLength(13);
    expect(result.marineSystemsAccepted).toBe(false);
  });
  it('does not certify even a complete, self-attested package', () => {
    const result = assessMarineEvidence(sha, MARINE_EVIDENCE_REQUIREMENTS.map(x => record(x.id)));
    expect(result.metadataComplete).toBe(true);
    expect(result.status).toBe('SUBMITTED_UNVERIFIED');
    expect(result.independentlyValidated).toBe(false);
    expect(result.marineSystemsAccepted).toBe(false);
  });
  it('rejects stale baseline, missing documentary limits and non-HTTPS sources', () => {
    const result = assessMarineEvidence(sha, [
      { ...record('MAR-LR-01'), baselineSha: 'c'.repeat(40), designLimitReference: '', referenceUri: 'file:///uncontrolled' }
    ]);
    expect(result.status).toBe('INCOMPLETE_OR_INVALID');
    expect(result.invalidSubmissions[0].defects).toContain('invalid or mismatched baseline SHA');
    expect(result.invalidSubmissions[0].defects).toContain('missing designLimitReference');
    expect(result.marineSystemsAccepted).toBe(false);
  });
  it('rejects duplicate or unknown requirement IDs, fabricated digests and claimed failures', () => {
    const result = assessMarineEvidence(sha, [
      record('MAR-LR-01'), record('MAR-LR-01'),
      { ...record('UNKNOWN'), referenceSha256: 'unverified', claimedOutcome: 'FAIL' }
    ]);
    expect(result.invalidSubmissions.length).toBe(2);
    expect(result.invalidSubmissions.some(x => x.defects.includes('duplicate requirement evidence ID'))).toBe(true);
    expect(result.invalidSubmissions.some(x => x.defects.includes('unknown or missing MAR-01 requirement ID'))).toBe(true);
    expect(result.metadataComplete).toBe(false);
  });
  it('rejects invalid baseline and coverage gaps', () => {
    const result = assessMarineEvidence('TBD', [record('MAR-LR-01')]);
    expect(result.baselineValid).toBe(false);
    expect(result.missingRequirements).toHaveLength(13);
    expect(result.status).toBe('INCOMPLETE_OR_INVALID');
  });
});
