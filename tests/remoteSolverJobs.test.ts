import { describe, expect, it } from 'vitest';
import { createSolverJobManifest, evaluateSolverReceipt, submitRemoteSolverJob, pollRemoteSolverJob, getAgentUsableSolverEvidence } from '../src/core/verification/RemoteSolverJobs.ts';

const d = 'sha256:' + 'a'.repeat(64);
const raw = () => ({
  jobRef: 'CFD_UNIT_TEST_001',
  sourceCommit: 'b'.repeat(40),
  family: 'OPENFOAM_CFD' as const,
  inputArtifactUri: 'https://example.org/model/input',
  inputArtifactSha256: d, meshArtifactSha256: d,
  qualityPlan: { sourceReference: 'Synthetic unit-test specification only',
    residualThreshold: 1e-4, gridUncertaintyMaxFraction: 0.04,
    maxMeshSkewness: 2, maxNonOrthogonalityDeg: 65,
    maxElementAspectRatio: 5, minScaledJacobian: 0.2 }
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
    expect(result.meshAndResidualScreenPassed).toBe(true);
    expect(result.gridConvergenceValidated).toBe(false);
    expect(result.engineeringValidated).toBe(false);
    expect(result.independentReferenceValidated).toBe(false);
    expect(result.engineeringReleaseAuthorized).toBe(false);
  });
  it('accepts retained compute results only after mesh/residual screen, while grid convergence remains pending', async () => {
    const manifest=createSolverJobManifest(raw());
    const result=await pollRemoteSolverJob(manifest,async jobId=>({
      jobId,acceptedInputDigest:manifest.manifestSha256,
      state:'COMPUTE_DONE_EVIDENCE_PENDING',
      solverVersion:'OpenFOAM-v2506',
      outputArtifactUri:'https://solver.example.org/artifacts/'+jobId,
      outputSha256:d,
      quality:{finalResidual:0.00001,gridUncertaintyFraction:null,
        maximumMeshSkewness:0.2,maximumNonOrthogonalityDeg:20},
      keyResults:{forceCoefficients:{coefficients:{Cd:0.012}}}
    }));
    expect(result.status).toBe('COMPUTE_DONE_EVIDENCE_PENDING');
    expect(result.meshAndResidualScreenPassed).toBe(true);
    expect(result.qualityScreenPassed).toBe(false);
    expect(result.gridConvergenceValidated).toBe(false);
    expect(result.independentReferenceValidated).toBe(false);
    const usable=getAgentUsableSolverEvidence(result);
    expect(usable?.solverVersion).toBe('OpenFOAM-v2506');
    expect((usable?.keyResults as any).forceCoefficients.coefficients.Cd).toBe(0.012);
    expect(usable?.engineeringReleaseAuthorized).toBe(false);
    expect(result.issues.join(' ')).toMatch(/grid-convergence/);
  });

  it('rejects computed receipts missing retained artifacts, version or mesh quality', async () => {
    const manifest=createSolverJobManifest(raw());
    const missing=await pollRemoteSolverJob(manifest,async jobId=>({
      jobId,acceptedInputDigest:manifest.manifestSha256,
      state:'COMPUTE_DONE_EVIDENCE_PENDING',solverVersion:'NOT_RECORDED',
      quality:{finalResidual:null,gridUncertaintyFraction:null,
        maximumMeshSkewness:null,maximumNonOrthogonalityDeg:null}
    }));
    expect(missing.status).toBe('REJECTED');
    expect(missing.meshAndResidualScreenPassed).toBe(false);
    expect(getAgentUsableSolverEvidence(missing)).toBeNull();
  });
  it('cannot turn a failed remote run into a queued success',async()=>{
    const manifest=createSolverJobManifest(raw());
    const result=await pollRemoteSolverJob(manifest,async jobId=>({
      jobId,acceptedInputDigest:manifest.manifestSha256,state:'FAILED'
    }));
    expect(result.status).toBe('REJECTED');
  });

  it('fails closed on dishonest digests, absent mesh convergence or malformed receipts', () => {
    const m = createSolverJobManifest(raw());
    expect(evaluateSolverReceipt(m, { jobId: 'RUN_001', state: 'COMPLETED', acceptedInputDigest: d }).status).toBe('REJECTED');
    const bad = evaluateSolverReceipt(m, { jobId: 'RUN_001', state: 'COMPLETED', acceptedInputDigest: m.manifestSha256 });
    expect(bad.status).toBe('REJECTED');
    expect(bad.engineeringReleaseAuthorized).toBe(false);
  });
});