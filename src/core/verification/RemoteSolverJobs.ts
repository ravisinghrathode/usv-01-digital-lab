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
    maxElementAspectRatio?: number;
    minScaledJacobian?: number;
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
  state: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'COMPUTE_DONE_EVIDENCE_PENDING';
  solverVersion?: string;
  outputArtifactUri?: string;
  outputSha256?: string;
  quality?: {
    finalResidual: number | null;
    gridUncertaintyFraction: number | null;
    maximumMeshSkewness: number | null;
    maximumNonOrthogonalityDeg: number | null;
    maximumElementAspectRatio?: number | null;
    minimumScaledJacobian?: number | null;
  };
  keyResults?: Record<string, unknown>;
}
export interface SolverJobDisposition {
  status: 'SUBMITTED_UNVERIFIED' | 'COMPUTE_DONE_EVIDENCE_PENDING' | 'COMPLETED_UNVERIFIED' | 'REJECTED';
  jobId: string | null;
  qualityScreenPassed: boolean;
  meshAndResidualScreenPassed: boolean;
  gridConvergenceValidated: false;
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
      raw.qualityPlan.maxNonOrthogonalityDeg > 180 ||
      (raw.family === 'CALCULIX_FEA' &&
        (!finiteNonnegative(raw.qualityPlan.maxElementAspectRatio) ||
         raw.qualityPlan.maxElementAspectRatio! < 1 ||
         !finiteNonnegative(raw.qualityPlan.minScaledJacobian) ||
         raw.qualityPlan.minScaledJacobian! <= 0 ||
         raw.qualityPlan.minScaledJacobian! > 1))) {
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
    meshAndResidualScreenPassed: false, gridConvergenceValidated: false,
    issues: ['Untrusted or malformed solver service receipt'],
    engineeringValidated: false, independentReferenceValidated: false,
    engineeringReleaseAuthorized: false, receipt: null
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return invalid;
  const r = raw as Partial<SolverServiceReceipt>;
  if (typeof r.jobId !== 'string' || !/^[A-Za-z0-9_-]{3,128}$/.test(r.jobId) ||
      r.acceptedInputDigest !== manifest.manifestSha256 ||
      !['QUEUED', 'RUNNING', 'COMPLETED', 'COMPUTE_DONE_EVIDENCE_PENDING'].includes(r.state || '')) return invalid;
  const completed = r.state === 'COMPLETED';
  const computedWithoutConvergence = r.state === 'COMPUTE_DONE_EVIDENCE_PENDING';
  let qualityScreenPassed = false;
  let meshAndResidualScreenPassed = false;

  if (completed || computedWithoutConvergence) {
    if (!r.outputArtifactUri || !httpsRef(r.outputArtifactUri) ||
        !r.outputSha256 || !SHA.test(r.outputSha256) ||
        !r.solverVersion || !r.solverVersion.trim() ||
        r.solverVersion === 'NOT_RECORDED') {
      problems.push('Computed job lacks retained HTTPS result artifact, checksum or actual solver version');
    }
    const q = r.quality;
    if (manifest.family === 'OPENFOAM_CFD') {
      if (!q || !finiteNonnegative(q.finalResidual) ||
          !finiteNonnegative(q.maximumMeshSkewness) ||
          !finiteNonnegative(q.maximumNonOrthogonalityDeg)) {
        problems.push('Computed CFD job lacks final residual or mesh-quality evidence');
      } else {
        meshAndResidualScreenPassed =
          q.finalResidual <= manifest.qualityPlan.residualThreshold &&
          q.maximumMeshSkewness <= manifest.qualityPlan.maxMeshSkewness &&
          q.maximumNonOrthogonalityDeg <= manifest.qualityPlan.maxNonOrthogonalityDeg;
        if (!meshAndResidualScreenPassed) problems.push('CFD mesh or residual threshold not met');
      }
    } else {
      if (!q || !finiteNonnegative(q.maximumElementAspectRatio) ||
          !finiteNonnegative(q.minimumScaledJacobian) ||
          !finiteNonnegative(manifest.qualityPlan.maxElementAspectRatio) ||
          !finiteNonnegative(manifest.qualityPlan.minScaledJacobian)) {
        problems.push('Computed FEA job lacks C3D8 aspect/scaled-Jacobian quality evidence');
      } else {
        meshAndResidualScreenPassed =
          q.maximumElementAspectRatio <= manifest.qualityPlan.maxElementAspectRatio! &&
          q.minimumScaledJacobian >= manifest.qualityPlan.minScaledJacobian!;
        if (!meshAndResidualScreenPassed) problems.push('FEA mesh-quality threshold not met');
      }
    }
    if (completed) {
      if (!q || !finiteNonnegative(q.gridUncertaintyFraction)) {
        problems.push('Completed job lacks nonnegative grid/mesh-refinement uncertainty');
      } else {
        qualityScreenPassed =
          meshAndResidualScreenPassed &&
          q.gridUncertaintyFraction <= manifest.qualityPlan.gridUncertaintyMaxFraction;
        if (!qualityScreenPassed) problems.push('Grid/mesh-refinement uncertainty threshold not met');
      }
    }
  }
  const receipt = r as SolverServiceReceipt;
  return {
    status: problems.length ? 'REJECTED' : completed ? 'COMPLETED_UNVERIFIED' :
      computedWithoutConvergence ? 'COMPUTE_DONE_EVIDENCE_PENDING' : 'SUBMITTED_UNVERIFIED',
    jobId: r.jobId,
    qualityScreenPassed: completed && qualityScreenPassed && problems.length === 0,
    meshAndResidualScreenPassed: meshAndResidualScreenPassed && problems.length === 0,
    gridConvergenceValidated: false,
    issues: problems.concat(computedWithoutConvergence ?
      ['Solver subprocess completed with retained results and mesh/residual screening; grid-convergence and independent reference proof remain required'] :
      ['Server receipt is self-reported; validate solver output, mesh convergence, independent benchmarks and technical authority externally']),
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

/**
 * Query a previously submitted job. HTTPS only; polling cannot itself
 * authenticate remote model physics or justify vessel engineering release.
 */
export async function pollRemoteSolverJob(
  manifest: SolverJobManifest,
  transport?: (jobId: string) => Promise<unknown>
): Promise<SolverJobDisposition> {
  let raw: unknown;
  if (transport) {
    raw = await transport(manifest.jobRef);
  } else {
    const endpoint = process.env.USV_SOLVER_HTTPS_ENDPOINT;
    const token = process.env.USV_SOLVER_SERVICE_TOKEN;
    if (!endpoint || !httpsRef(endpoint) || !token || token.length < 32) {
      throw new Error('Authenticated HTTPS solver service required for polling');
    }
    const u = new URL(endpoint);
    if (!u.pathname.endsWith('/jobs')) throw new Error('Solver service endpoint must end with /jobs');
    u.pathname += '/' + encodeURIComponent(manifest.jobRef);
    const response = await fetch(u.toString(), {
      headers: {Authorization:'Bearer '+token},
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('Solver status query failed: HTTP '+response.status);
    raw = await response.json();
  }
  return evaluateSolverReceipt(manifest,raw);
}


/**
 * Data that agents may inspect as UNVERIFIED solver evidence. The helper never
 * promotes it to a design baseline and refuses queued/rejected jobs.
 */
export function getAgentUsableSolverEvidence(disposition: SolverJobDisposition) {
  if (!disposition.receipt ||
      !['COMPUTE_DONE_EVIDENCE_PENDING','COMPLETED_UNVERIFIED'].includes(disposition.status) ||
      !disposition.meshAndResidualScreenPassed) {
    return null;
  }
  return {
    sourceKind: 'REMOTE_SOLVER_OUTPUT_UNVERIFIED' as const,
    jobId: disposition.receipt.jobId,
    solverVersion: disposition.receipt.solverVersion,
    outputArtifactUri: disposition.receipt.outputArtifactUri,
    outputSha256: disposition.receipt.outputSha256,
    quality: disposition.receipt.quality,
    keyResults: disposition.receipt.keyResults ?? {},
    gridConvergenceValidated: false as const,
    engineeringReleaseAuthorized: false as const
  };
}
