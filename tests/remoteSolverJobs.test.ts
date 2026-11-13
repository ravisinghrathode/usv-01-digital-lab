import { describe, expect, it } from 'vitest';
import { createSolverJobManifest, evaluateSolverReceipt, submitRemoteSolverJob } from '../src/core/verification/RemoteSolverJobs.ts';

const d = 'sha256:' + 'a'.repeat(64);
const raw = () => ({
  jobRef: 'CFD_UNIT_TEST_001',
  sourceCommit: 'b'.repeat(40),
  family: 'OPENFOAM_CFD' as const,
  inputArtifactUri: 'https://example.org/model/input',
  inputArtifactSha256: d, meshArtifactSha256: d,
  qualityPlan: { sourceReference: 'Synthetic unit-test specification only',
    residualThreshold: 1e-4, gridUncertaintyMaxFraction: 0.04,
    maxMeshSkewness: 2, maxNonOrthogonalityDeg: 65 }
});
describe('Remote CFD/FEA job evidence', () => {
  it('binds solver job to source and mesh digests, does not claim remote execution', () => {
    const a = createSolverJobManifest(raw());
    const b = createSolverJobManifest(raw());
    expect(a).toEqual(b);
    expect(a.manifestSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(a.engineeringValidated).toBe(false);
    expect(createSolverJobManifest({ ...raw(), family: 'CALCULIX_FEA' }).manifestSha256).not.toBe(a.manifestSha256);
  });
  it('rejects missing mesh, non-HTTPS artifact or unknown quality thresholds', () => {
    expect(() => createSolverJobManifest({ ...raw(), meshArtifactSha256: '' })).toThrow();
    expect(() => createSolverJobManifest({ ...raw(), inputArtifactUri: 'http://example.org/mesh' })).toThrow();
    expect(() => createSolverJobManifest({ ...raw(), qualityPlan: { ...raw().qualityPlan, residualThreshold: NaN } })).toThrow();
  });
  it('records a completed mesh-converged result as unverified even if remote reports success', async () => {
    const manifest = createSolverJobManifest(raw());
    const receipt = { jobId: '123_CFD_TEST', state: 'COMPLETED' as const, acceptedInputDigest: manifest.manifestSha256,
      solverVersion: 'openfoam-test-synthetic',
      outputArtifactUri: 'https://example.org/output', outputSha256: d,
      quality: { finalResidual: 0.00001, gridUncertaintyFraction: 0.01, maximumMeshSkewness: 0.2, maximumNonOrthogonalityDeg: 20 } };
    const result = await submitRemoteSolverJob(manifest, async () => receipt);
    expect(result.status).toBe('COMPLETED_UNVERIFIED');
    expect(result.qualityScreenPassed).toBe(true);
    expect(result.engineeringValidated).toBe(false);
    expect(result.independentReferenceValidated).toBe(false);
    expect(result.engineeringReleaseAuthorized).toBe(false);
  });
  it('fails closed on dishonest digests, absent mesh convergence or malformed receipts', () => {
    const m = createSolverJobManifest(raw());
    expect(evaluateSolverReceipt(m, { jobId: 'RUN_001', state: 'COMPLETED', acceptedInputDigest: d }).status).toBe('REJECTED');
    const bad = evaluateSolverReceipt(m, { jobId: 'RUN_001', state: 'COMPLETED', acceptedInputDigest: m.manifestSha256 });
    expect(bad.status).toBe('REJECTED');
    expect(bad.engineeringReleaseAuthorized).toBe(false);
  });
});