import { describe, expect, it } from 'vitest';
import { parseAcceptanceEvidence, parseReferenceMeasurements } from '../src/core/verification/AcceptanceInputParser.ts';
import { runAcceptanceCampaign } from '../src/core/verification/AcceptanceCampaign.ts';

const sha = 'a'.repeat(40);
const reference = {
  id: 'HYD-REFERENCE-001', quantity: 'Displacement', referenceValue: 6,
  observedValue: 6.01, absoluteTolerance: 0.02,
  relativeTolerance: 0.001, unit: 'tonnes', sourceReference: 'approved-revision-001'
};
const evidence = {
  requirementId: 'HYD-01', baselineSha: sha,
  referenceUri: 'https://example.org/controlled/reference',
  referenceSha256: 'sha256:' + 'b'.repeat(64),
  sourceType: 'PHYSICAL_TEST', reviewedBy: 'Named reviewer',
  independentlyVerified: true, attestationVerified: true
};

describe('Single-pass acceptance evidence inputs', () => {
  it('accepts numerically sound reference data and includes it in the campaign', () => {
    const measurements = parseReferenceMeasurements([reference]);
    const r = runAcceptanceCampaign({ baselineSha: sha, benchmarkMeasurements: measurements });
    expect(r.benchmark.status).toBe('NUMERIC_PASS_UNCERTIFIED');
    expect(r.releaseApproved).toBe(false);
  });

  it('accepts source references but does not treat user-supplied review flags as verified', () => {
    const entries = parseAcceptanceEvidence([evidence]);
    const r = runAcceptanceCampaign({ baselineSha: sha, evidence: entries });
    expect(r.workstreams.find(w => w.id === 'WS-03')?.acceptanceCriteria[0]?.status).toBe('SUBMITTED_UNVERIFIED');
    expect(r.releaseApproved).toBe(false);
  });

  it('rejects injected properties and invalid URL or baseline', () => {
    expect(() => parseAcceptanceEvidence([{ ...evidence, apiKey: 'secret' }])).toThrow();
    expect(() => parseAcceptanceEvidence([{ ...evidence, referenceUri: 'http://example.org/unsafe' }])).toThrow();
    expect(() => parseAcceptanceEvidence([{ ...evidence, baselineSha: 'main' }])).toThrow();
  });

  it('rejects nonfinite benchmark values and negative tolerances', () => {
    expect(() => parseReferenceMeasurements([{ ...reference, observedValue: Infinity }])).toThrow();
    expect(() => parseReferenceMeasurements([{ ...reference, relativeTolerance: -0.02 }])).toThrow();
  });
});
