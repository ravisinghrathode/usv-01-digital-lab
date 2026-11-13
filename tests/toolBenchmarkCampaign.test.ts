import { describe, expect, it } from 'vitest';
import { runToolBenchmarkCampaign } from '../src/core/verification/ToolBenchmarkCampaign.ts';

const reference = () => ({
  id: 'UNIT_RECTANGULAR_PRISM_01',
  toolId: 'TOOL-HYDROSTATICS-01',
  input: { lwlMeters: 10, beamMeters: 3, draftMeters: 0.5, blockCoefficientCb: 0.5 },
  numericOutputPath: 'displacedVolumeM3',
  referenceValue: 7.5,
  absoluteTolerance: 0.001, relativeTolerance: 0,
  unit: 'm3',
  referenceUri: 'https://example.org/unit-test-only-not-a-validated-source',
  referenceSha256: 'sha256:' + 'a'.repeat(64),
  referenceMethod: 'Analytical rectangular-prism arithmetic, synthetic unit test'
});
describe('Source-digested deterministic tool numeric benchmark campaign', () => {
  it('compares genuine tool output with independent arithmetic but never claims source attestation', async () => {
    const r = await runToolBenchmarkCampaign([reference()]);
    expect(r.status).toBe('NUMERIC_SCREEN_PASS_UNCERTIFIED');
    expect(r.cases[0].calculatedValue).toBe(7.5);
    expect(r.sourceAuthenticated).toBe(false);
    expect(r.independentlyEngineeringValidated).toBe(false);
    expect(r.engineeringReleaseAuthorized).toBe(false);
  });
  it('detects numerical disagreement and invalid/missing provenance', async () => {
    const bad = await runToolBenchmarkCampaign([{ ...reference(), referenceValue: 9 }]);
    expect(bad.status).toBe('NUMERIC_SCREEN_FAIL');
    const missing = await runToolBenchmarkCampaign([{ ...reference(), referenceSha256: '' }]);
    expect(missing.status).toBe('INVALID_OR_FAILED_TOOL');
    const none = await runToolBenchmarkCampaign([]);
    expect(none.status).toBe('NO_REFERENCE_DATA');
  });
  it('does not accept an invented path or failing tool output', async () => {
    const r = await runToolBenchmarkCampaign([{ ...reference(), numericOutputPath: 'invented.result' }]);
    expect(r.status).toBe('INVALID_OR_FAILED_TOOL');
    expect(r.cases[0].toolSucceeded).toBe(false);
  });
});