/**
 * Research-only M05 numerical V&V evidence boundary.
 * Neither model claims nor unanchored reviewer names establish engineering
 * validation. Cryptographic receipt verification is not human qualification.
 */
import {createHash, createPublicKey, verify} from 'node:crypto';

export type DisciplineId =
  | 'HYDROSTATICS_STABILITY'
  | 'RESISTANCE_PROPULSION_ENDURANCE'
  | 'CFD_FEA_NUMERICAL'
  | 'THERMAL_ELECTRICAL_ENERGY'
  | 'STRUCTURES_AND_LR'
  | 'WET_END_ACOUSTIC';

export interface DisciplineBenchmarkInput {
  benchmarkId: string;
  discipline: DisciplineId;
  quantity: string;
  unit: string;
  standardOrSourceRef: string;
  artifactSha256: string;
  computedValue: number;
  referenceValue: number;
  referenceUncertainty: number;
  numericalUncertainty: number;
  approvedTolerance: number;
  topologySpecificChecked: boolean;
  /** Optional physical hardware/resistance map citation (no unsubstantiated eta_D claims). */
  installedHardwareMapRef?: string;
  isPartialScreenOnly?: boolean;
}

export interface PinnedSolverRunReceipt {
  solverFamily: 'OPENFOAM_CFD' | 'CALCULIX_FEA';
  pinnedSolverVersion: string;
  solverBinaryDigest: string;
  geometrySha256: string;
  meshConvergenceVerified: boolean;
  boundaryConditionsRef: string;
  maxNormalizedResidual: number;
  discretizationUncertainty: number;
  executionState: 'EXECUTED_PINNED_HOST' | 'NOT_RUN';
}

export interface DisciplineReviewDisposition {
  discipline: DisciplineId;
  outputDigest: string;
  reviewerName: string;
  reviewerQualification: string;
  reviewerType: 'QUALIFIED_EXTERNAL_ENGINEER' | 'AI_MODEL' | 'CI_AUTOMATION';
  disposition: 'ACCEPTED_WITH_LIMITS' | 'HOLD' | 'REJECTED';
  signedAtUtc: string;
  independentFromProducer: boolean;
  /** Key ID must resolve to an external, operator-provisioned trust root. */
  signerKeyId?: string;
  /** Exactly 64 Ed25519 signature bytes in canonical base64. */
  signatureBase64?: string;
}

export interface TrustedNumericalReviewer {
  reviewerName: string;
  reviewerQualification: string;
  publicKeyPem: string;
}

export interface VnVBenchmarkEvaluation {
  benchmarkId: string;
  discipline: DisciplineId;
  absoluteError: number;
  combinedUncertainty: number;
  withinTolerance: boolean;
  exceedsValidationNoise: boolean;
  grade: 'NUMERIC_SCREEN_PASS_UNCERTIFIED' | 'FAIL_EXCEEDS_TOLERANCE' | 'INVALID_METADATA';
  notes: string[];
}

export interface NumericalVnVReport {
  schema: 'usv01-numerical-vnv/v1';
  sourceCommitSha: string;
  benchmarkEvaluations: VnVBenchmarkEvaluation[];
  solverStatus: Record<'OPENFOAM_CFD' | 'CALCULIX_FEA', {
    status: 'DECLARED_RECEIPT_UNVERIFIED' | 'NOT_RUN'; reason: string
  }>;
  /** Source SHA declared by submitter is NOT a verification of the source document. */
  referenceArtifactsAuthenticated: false;
  acceptedDisciplines: DisciplineId[];
  rejectedReviewDispositions: string[];
  overallStatus: 'PRELIMINARY_BENCHMARKED_HOLD_FOR_EXTERNAL_AND_DIRECTOR' | 'BLOCKED_FAILED_OR_INVALID_BENCHMARK';
  engineeringReleaseStatus: 'HOLD';
  independentPhysicalEvidenceRequired: true;
  directorApprovalRequired: true;
}

const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
const GIT_SHA_RE = /^[0-9a-f]{40}$/;
const STRICT_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
export const NUMERICAL_REVIEW_SIGNATURE_DOMAIN = 'USV01_NUMERICAL_VNV_REVIEW_V1\\n';

function contentDigest(value: unknown): string {
  return 'sha256:' + createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/**
 * Binds an exact candidate source, geometry and each actual compared value,
 * tolerance, uncertainty and reference identifier to a discipline review.
 * Do not mistake a supplied artifact digest for independently authenticated
 * reference measurements; source inspection remains external.
 */
export function numericalDisciplineOutputDigest(
  sourceCommitSha: string, geometrySha256: string, discipline: DisciplineId,
  benchmarks: readonly DisciplineBenchmarkInput[]
): string {
  const rows=benchmarks.filter(b=>b.discipline===discipline)
    .map(b=>({
      benchmarkId:b.benchmarkId,quantity:b.quantity,unit:b.unit,
      standardOrSourceRef:b.standardOrSourceRef,artifactSha256:b.artifactSha256,
      computedValue:b.computedValue,referenceValue:b.referenceValue,
      referenceUncertainty:b.referenceUncertainty,
      numericalUncertainty:b.numericalUncertainty,
      approvedTolerance:b.approvedTolerance,
      topologySpecificChecked:b.topologySpecificChecked,
      isPartialScreenOnly:b.isPartialScreenOnly===true,
      installedHardwareMapRef:b.installedHardwareMapRef ?? null
    })).sort((a,b)=>a.benchmarkId.localeCompare(b.benchmarkId));
  return contentDigest({
    schema:'usv01-numerical-reviewed-discipline/v1',
    sourceCommitSha, geometrySha256,discipline,rows
  });
}

/** The source and geometry bind the review even when the same numbers recur. */
export function numericalReviewSigningPayload(
  review: DisciplineReviewDisposition, sourceCommitSha: string,
  geometrySha256: string
): Buffer {
  return Buffer.from(NUMERICAL_REVIEW_SIGNATURE_DOMAIN + JSON.stringify({
    schema:'usv01-numerical-review-signature/v1',
    sourceCommitSha,geometrySha256,signerKeyId:review.signerKeyId,
    discipline:review.discipline,outputDigest:review.outputDigest,
    reviewerName:review.reviewerName,reviewerQualification:review.reviewerQualification,
    reviewerType:review.reviewerType,disposition:review.disposition,
    independentFromProducer:review.independentFromProducer,
    signedAtUtc:review.signedAtUtc
  }),'utf8');
}

function independentlySignedReview(
  review:DisciplineReviewDisposition, sourceSha:string,
  geometrySha:string, trust:Readonly<Record<string,TrustedNumericalReviewer>>
):boolean{
  const anchor=review.signerKeyId ? trust[review.signerKeyId] : undefined;
  if(!anchor || anchor.reviewerName!==review.reviewerName ||
    anchor.reviewerQualification!==review.reviewerQualification ||
    !review.reviewerName.trim() || !review.reviewerQualification.trim() ||
    !review.independentFromProducer ||
    review.reviewerType!=='QUALIFIED_EXTERNAL_ENGINEER' ||
    !Number.isFinite(Date.parse(review.signedAtUtc)) ||
    typeof review.signatureBase64!=='string' ||
    !STRICT_BASE64.test(review.signatureBase64)) return false;
  try{
    const signature=Buffer.from(review.signatureBase64,'base64');
    if(signature.length!==64 || signature.toString('base64')!==review.signatureBase64)
      return false;
    const pub=createPublicKey(anchor.publicKeyPem);
    if(pub.asymmetricKeyType!=='ed25519') return false;
    return verify(null,numericalReviewSigningPayload(review,sourceSha,geometrySha),pub,signature);
  }catch{return false;}
}


export function evaluateNumericalVnV(input: {
  sourceCommitSha: string;
  geometrySha256: string;
  benchmarks: readonly DisciplineBenchmarkInput[];
  solverReceipts?: readonly PinnedSolverRunReceipt[];
  reviewDispositions?: readonly DisciplineReviewDisposition[];
  /**
   * Trust anchors provisioned by the operator OUTSIDE the evidence submission.
   * Never accept a key embedded in a model response, PR artifact or public CI.
   */
  trustedReviewers?: Readonly<Record<string,TrustedNumericalReviewer>>;
}): NumericalVnVReport {
  if (!GIT_SHA_RE.test(input.sourceCommitSha)) {
    throw new Error('Exact 40-hex sourceCommitSha is required for V&V evaluation');
  }
  if (!SHA256_RE.test(input.geometrySha256)) {
    throw new Error('Exact geometrySha256 is required');
  }

  const seenBenchmarkIds=new Set<string>();
  const benchmarkEvaluations: VnVBenchmarkEvaluation[] = input.benchmarks.map(b => {
    const notes: string[] = [];
    const repeatedId=seenBenchmarkIds.has(b.benchmarkId);
    seenBenchmarkIds.add(b.benchmarkId);
    const metadataOk =
      !repeatedId &&
      b.benchmarkId.trim().length > 0 &&
      b.standardOrSourceRef.trim().length > 0 &&
      b.unit.trim().length > 0 &&
      SHA256_RE.test(b.artifactSha256) &&
      b.topologySpecificChecked &&
      [b.computedValue, b.referenceValue, b.referenceUncertainty, b.numericalUncertainty, b.approvedTolerance].every(
        Number.isFinite
      ) &&
      b.referenceUncertainty >= 0 &&
      b.numericalUncertainty >= 0 &&
      b.approvedTolerance >= 0;

    if (!metadataOk) {
      return {
        benchmarkId: b.benchmarkId,
        discipline: b.discipline,
        absoluteError: Number.NaN,
        combinedUncertainty: Number.NaN,
        withinTolerance: false,
        exceedsValidationNoise: true,
        grade: 'INVALID_METADATA',
        notes: ['Missing artifact SHA-256, standard reference, finite tolerances, or topology-specific check']
      };
    }

    const absoluteError = Math.abs(b.computedValue - b.referenceValue);
    const combinedUncertainty = Math.hypot(b.referenceUncertainty, b.numericalUncertainty);
    const withinTolerance = absoluteError <= b.approvedTolerance;
    const exceedsValidationNoise = absoluteError > combinedUncertainty;

    if (b.isPartialScreenOnly) {
      notes.push('Partial screen remains preliminary only; full domain qualification pending');
    }
    if (b.discipline === 'RESISTANCE_PROPULSION_ENDURANCE' && !b.installedHardwareMapRef) {
      notes.push('Propulsive/hardware efficiency remains uncalibrated (no installed hardware map)');
    }

    // Numerical agreement does not establish a solver was run, that a mesh
    // converged, or that any reference/source was independently authenticated.
    const grade: VnVBenchmarkEvaluation['grade'] = !withinTolerance
      ? 'FAIL_EXCEEDS_TOLERANCE'
      : 'NUMERIC_SCREEN_PASS_UNCERTIFIED';

    return {
      benchmarkId: b.benchmarkId,
      discipline: b.discipline,
      absoluteError,
      combinedUncertainty,
      withinTolerance,
      exceedsValidationNoise,
      grade,
      notes
    };
  });

  // Fail-closed solver receipt status: missing/incomplete/stale-geometry solvers strictly report NOT_RUN.
  const solverStatus: NumericalVnVReport['solverStatus'] = {
    OPENFOAM_CFD: { status: 'NOT_RUN', reason: 'NOT_RUN: no pinned OpenFOAM convergence/BC/uncertainty receipt for current geometrySha256' },
    CALCULIX_FEA: { status: 'NOT_RUN', reason: 'NOT_RUN: no pinned CalculiX convergence/BC/uncertainty receipt for current geometrySha256' }
  };

  const seenSolvers = new Set<PinnedSolverRunReceipt['solverFamily']>();
  const duplicateSolvers = new Set<PinnedSolverRunReceipt['solverFamily']>();
  for (const r of input.solverReceipts ?? []) {
    if (seenSolvers.has(r.solverFamily)) duplicateSolvers.add(r.solverFamily);
    seenSolvers.add(r.solverFamily);
    if (r.executionState !== 'EXECUTED_PINNED_HOST') continue;
    const valid =
      r.pinnedSolverVersion.trim().length > 0 &&
      SHA256_RE.test(r.solverBinaryDigest) &&
      r.geometrySha256 === input.geometrySha256 &&
      r.meshConvergenceVerified &&
      r.boundaryConditionsRef.trim().length > 0 &&
      Number.isFinite(r.maxNormalizedResidual) &&
      r.maxNormalizedResidual > 0 &&
      r.maxNormalizedResidual <= 1e-3 &&
      Number.isFinite(r.discretizationUncertainty) &&
      r.discretizationUncertainty >= 0;

    if (valid) {
      solverStatus[r.solverFamily] = {
        status: 'DECLARED_RECEIPT_UNVERIFIED',
        reason: `Pinned solver ${r.pinnedSolverVersion} metadata passes format checks; signature, binary, mesh/BCs, convergence and physical validity remain unverified`
      };
    } else {
      solverStatus[r.solverFamily] = {
        status: 'NOT_RUN',
        reason: 'Rejected incomplete, stale-geometry, or unconverged solver receipt; treated as NOT_RUN'
      };
    }
  }

  // Contradictory/duplicate receipts do not become trusted by ordering them.
  for (const solverFamily of duplicateSolvers) {
    solverStatus[solverFamily] = {
      status:'NOT_RUN',
      reason:'Conflicting/duplicate solver receipts: no unique authenticated execution evidence'
    };
  }

  // Filter independent review dispositions: NEVER accept AI model or CI self-attestation.
  const acceptedDisciplines: DisciplineId[] = [];
  const rejectedReviewDispositions: string[] = [];

  const reviewedDisciplines = new Set<DisciplineId>();
  for (const rev of input.reviewDispositions ?? []) {
    if (reviewedDisciplines.has(rev.discipline)) {
      rejectedReviewDispositions.push(`${rev.discipline}: duplicate or contradictory review, no unique acceptance`);
      const index=acceptedDisciplines.indexOf(rev.discipline);
      if(index>=0)acceptedDisciplines.splice(index,1);
      continue;
    }
    reviewedDisciplines.add(rev.discipline);
    if (rev.reviewerType!=='QUALIFIED_EXTERNAL_ENGINEER') {
      rejectedReviewDispositions.push(
        `${rev.discipline}: rejected non-independent ${rev.reviewerType} disposition`);
      continue;
    }
    const grades=benchmarkEvaluations.filter(e=>e.discipline===rev.discipline);
    // Compare rows by cardinality and status, not a duplicated ID lookup.
    const validRows=grades.length>0 &&
      grades.length===input.benchmarks.filter(b=>b.discipline===rev.discipline).length &&
      grades.every(e=>e.grade==='NUMERIC_SCREEN_PASS_UNCERTIFIED');
    const expected=numericalDisciplineOutputDigest(
      input.sourceCommitSha,input.geometrySha256,rev.discipline,input.benchmarks);
    if (!validRows || rev.outputDigest!==expected ||
        !independentlySignedReview(
          rev,input.sourceCommitSha,input.geometrySha256,input.trustedReviewers??{})) {
      rejectedReviewDispositions.push(
        `${rev.discipline}: missing/invalid external Ed25519 signature, exact input digest, trusted identity, or successful benchmark`);
      continue;
    }
    if (rev.disposition==='ACCEPTED_WITH_LIMITS') {
      acceptedDisciplines.push(rev.discipline);
    } else {
      rejectedReviewDispositions.push(
        `${rev.discipline}: signed external review disposition is ${rev.disposition}`);
    }
  }

  const anyInvalidOrFailed =
    benchmarkEvaluations.length === 0 ||
    benchmarkEvaluations.some(e => e.grade === 'FAIL_EXCEEDS_TOLERANCE' || e.grade === 'INVALID_METADATA');

  return {
    schema: 'usv01-numerical-vnv/v1',
    sourceCommitSha: input.sourceCommitSha,
    benchmarkEvaluations,
    solverStatus,
    referenceArtifactsAuthenticated:false,
    acceptedDisciplines: Array.from(new Set(acceptedDisciplines)),
    rejectedReviewDispositions,
    overallStatus: anyInvalidOrFailed
      ? 'BLOCKED_FAILED_OR_INVALID_BENCHMARK'
      : 'PRELIMINARY_BENCHMARKED_HOLD_FOR_EXTERNAL_AND_DIRECTOR',
    engineeringReleaseStatus: 'HOLD',
    independentPhysicalEvidenceRequired: true,
    directorApprovalRequired: true
  };
}
