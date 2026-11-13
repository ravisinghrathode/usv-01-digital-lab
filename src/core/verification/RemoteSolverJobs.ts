/**
 * Server-only OpenFOAM/CalculiX job interface. Remote execution is performed
 * only by a separately authenticated HTTPS solver service; this repository
 * never executes arbitrary SSH/shell commands or fabricates CFD/FEA outputs.
 */
import { createHash } from 'node:crypto';

const SHA = /^sha256:[a-f0-9]{64}$/;
const REV = /^[a-f0-9]{40}$/;
export type SolverFamily = 'OPENFOAM_CFD' | 'CALCULIX_FEA';
export interface SolverJobRequest {
  jobRef: string;
  sourceCommit: string;
  family: SolverFamily;
  inputArtifactUri: string;
  inputArtifactSha256: string;
  meshArtifactSha256: string;
  /** Acceptance criteria are externally selected and source-referenced, never silently defaulted. */
  qualityPlan: {
    sourceReference: string;
    residualThreshold: number;
    gridUncertaintyMaxFraction: number;
    maxMeshSkewness: number;
    maxNonOrthogonalityDeg: number;
  };
}
export interface SolverJobManifest extends SolverJobRequest {
  manifestSha256: string;
  releaseAuthorized: false;
  engineeringValidated: false;
}
export interface SolverServiceReceipt {
  jobId: string;
  acceptedInputDigest: string;
  state: 'QUEUED' | 'RUNNING' | 'COMPLETED';
  solverVersion?: string;
  outputArtifactUri?: string;
  outputSha256?: string;
  quality?: {
    finalResidual: number;
    gridUncertaintyFraction: number;
    maximumMeshSkewness: number;
    maximumNonOrthogonalityDeg: number;
  };
}
export interface SolverJobDisposition {
  status: 'SUBMITTED_UNVERIFIED' | 'COMPLETED_UNVERIFIED' | 'REJECTED';
  jobId: string | null;
  qualityScreenPassed: boolean;
  issues: string[];
  engineeringValidated: false;
  independentReferenceValidated: false;
  engineeringReleaseAuthorized: false;
  receipt: SolverServiceReceipt | null;
}
export type RemoteSubmissionTransport =
  (manifest: SolverJobManifest) => Promise<unknown>;
const httpsRef = (uri: string) => {
  try {
    const u = new URL(uri);
    return u.protocol === 'https:' && !!u.hostname &&
      !u.username && !u.password && !u.hash;
  } catch { return false; }
};
const sha256 = (v: unknown) => 'sha256:' + createHash('sha256').update(JSON.stringify(v)).digest('hex');
const finiteNonnegative = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;

export function createSolverJobManifest(raw: SolverJobRequest): SolverJobManifest {
  if (!raw || !['OPENFOAM_CFD', 'CALCULIX_FEA'].includes(raw.family) ||
      typeof raw.jobRef !== 'string' || !/^[A-Za-z0-9_-]{3,64}$/.test(raw.jobRef) ||
      !REV.test(raw.sourceCommit) || !httpsRef(raw.inputArtifactUri) ||
      !SHA.test(raw.inputArtifactSha256) || !SHA.test(raw.meshArtifactSha256) ||
      !raw.qualityPlan || typeof raw.qualityPlan.sourceReference !== 'string' ||
      !raw.qualityPlan.sourceReference.trim() ||
      !finiteNonnegative(raw.qualityPlan.residualThreshold) ||
      !finiteNonnegative(raw.qualityPlan.gridUncertaintyMaxFraction) ||
      !finiteNonnegative(raw.qualityPlan.maxMeshSkewness) ||
      !finiteNonnegative(raw.qualityPlan.maxNonOrthogonalityDeg) ||
      raw.qualityPlan.gridUncertaintyMaxFraction > 1 ||
      raw.qualityPlan.maxNonOrthogonalityDeg > 180) {
    throw new Error('Solver job invalid: exact source/artifact digests, HTTPS input, mesh and externally referenced quality criteria required');
  }
  const source = { ...raw };
  return {
    ...source,
    manifestSha256: sha256(source),
    releaseAuthorized: false,
    engineeringValidated: false
  };
}

export function evaluateSolverReceipt(
  manifest: SolverJobManifest, raw: unknown
): SolverJobDisposition {
  const problems: string[] = [];
  const invalid: SolverJobDisposition = {
    status: 'REJECTED', jobId: null, qualityScreenPassed: false,
    issues: ['Untrusted or malformed solver service receipt'],
    engineeringValidated: false, independentReferenceValidated: false,
    engineeringReleaseAuthorized: false, receipt: null
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return invalid;
  const r = raw as Partial<SolverServiceReceipt>;
  if (typeof r.jobId !== 'string' || !/^[A-Za-z0-9_-]{3,128}$/.test(r.jobId) ||
      r.acceptedInputDigest !== manifest.manifestSha256 ||
      !['QUEUED', 'RUNNING', 'COMPLETED'].includes(r.state || '')) return invalid;
  const completed = r.state === 'COMPLETED';
  let qualityScreenPassed = false;
  if (completed) {
    if (!r.outputArtifactUri || !httpsRef(r.outputArtifactUri) ||
        !r.outputSha256 || !SHA.test(r.outputSha256) ||
        !r.solverVersion || !r.solverVersion.trim()) {
      problems.push('Completed job lacks authenticated artifact link, output checksum or solver version');
    }
    const q = r.quality;
    if (!q || !finiteNonnegative(q.finalResidual) ||
        !finiteNonnegative(q.gridUncertaintyFraction) ||
        !finiteNonnegative(q.maximumMeshSkewness) ||
        !finiteNonnegative(q.maximumNonOrthogonalityDeg)) {
      problems.push('Missing or nonfinite convergence, mesh or grid-refinement evidence');
    } else {
      qualityScreenPassed =
        q.finalResidual <= manifest.qualityPlan.residualThreshold &&
        q.gridUncertaintyFraction <= manifest.qualityPlan.gridUncertaintyMaxFraction &&
        q.maximumMeshSkewness <= manifest.qualityPlan.maxMeshSkewness &&
        q.maximumNonOrthogonalityDeg <= manifest.qualityPlan.maxNonOrthogonalityDeg;
      if (!qualityScreenPassed) problems.push('Mesh/convergence screening thresholds not met');
    }
  }
  const receipt = r as SolverServiceReceipt;
  return {
    status: problems.length ? 'REJECTED' : completed ? 'COMPLETED_UNVERIFIED' : 'SUBMITTED_UNVERIFIED',
    jobId: r.jobId,
    qualityScreenPassed: completed && qualityScreenPassed && problems.length === 0,
    issues: problems.concat('Server receipt is self-reported; validate solver output, mesh convergence, independent benchmarks and technical authority externally'),
    engineeringValidated: false, independentReferenceValidated: false,
    engineeringReleaseAuthorized: false, receipt
  };
}

/** Default transport is a locked-down HTTPS service, not SSH or arbitrary shell. */
export async function submitRemoteSolverJob(
  manifest: SolverJobManifest,
  transport?: RemoteSubmissionTransport
): Promise<SolverJobDisposition> {
  const allowed = createSolverJobManifest({
    jobRef: manifest.jobRef, sourceCommit: manifest.sourceCommit, family: manifest.family,
    inputArtifactUri: manifest.inputArtifactUri, inputArtifactSha256: manifest.inputArtifactSha256,
    meshArtifactSha256: manifest.meshArtifactSha256, qualityPlan: manifest.qualityPlan
  });
  if (allowed.manifestSha256 !== manifest.manifestSha256) {
    throw new Error('Solver job manifest digest mismatch');
  }
  let remote: unknown;
  if (transport) {
    remote = await transport(manifest);
  } else {
    const endpoint = process.env.USV_SOLVER_HTTPS_ENDPOINT;
    const token = process.env.USV_SOLVER_SERVICE_TOKEN;
    if (!endpoint || !httpsRef(endpoint) || !token || token.length < 16) {
      throw new Error('Remote solver unavailable: configure authenticated HTTPS endpoint and service token; no fake solver execution');
    }
    const result = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(manifest),
      signal: AbortSignal.timeout(15000)
    });
    if (!result.ok) throw new Error('Remote solver service rejected request (HTTP ' + result.status + ')');
    remote = await result.json();
  }
  return evaluateSolverReceipt(manifest, remote);
}
