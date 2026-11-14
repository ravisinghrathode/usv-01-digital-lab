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
}

export interface VnVBenchmarkEvaluation {
  benchmarkId: string;
  discipline: DisciplineId;
  absoluteError: number;
  combinedUncertainty: number;
  withinTolerance: boolean;
  exceedsValidationNoise: boolean;
  grade: 'EVIDENCE_GRADED_PRELIMINARY' | 'SOLVER_CONVERGED_UNRELEASED' | 'FAIL_EXCEEDS_TOLERANCE' | 'INVALID_METADATA';
  notes: string[];
}

export interface NumericalVnVReport {
  schema: 'usv01-numerical-vnv/v1';
  sourceCommitSha: string;
  benchmarkEvaluations: VnVBenchmarkEvaluation[];
  solverStatus: Record<'OPENFOAM_CFD' | 'CALCULIX_FEA', { status: 'VERIFIED_RECEIPT_ONLY' | 'NOT_RUN'; reason: string }>;
  acceptedDisciplines: DisciplineId[];
  rejectedReviewDispositions: string[];
  overallStatus: 'PRELIMINARY_BENCHMARKED_HOLD_FOR_EXTERNAL_AND_DIRECTOR' | 'BLOCKED_FAILED_OR_INVALID_BENCHMARK';
  engineeringReleaseStatus: 'HOLD';
  independentPhysicalEvidenceRequired: true;
  directorApprovalRequired: true;
}

const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
const GIT_SHA_RE = /^[0-9a-f]{40}$/;

export function evaluateNumericalVnV(input: {
  sourceCommitSha: string;
  geometrySha256: string;
  benchmarks: readonly DisciplineBenchmarkInput[];
  solverReceipts?: readonly PinnedSolverRunReceipt[];
  reviewDispositions?: readonly DisciplineReviewDisposition[];
}): NumericalVnVReport {
  if (!GIT_SHA_RE.test(input.sourceCommitSha)) {
    throw new Error('Exact 40-hex sourceCommitSha is required for V&V evaluation');
  }
  if (!SHA256_RE.test(input.geometrySha256)) {
    throw new Error('Exact geometrySha256 is required');
  }

  const benchmarkEvaluations: VnVBenchmarkEvaluation[] = input.benchmarks.map(b => {
    const notes: string[] = [];
    const metadataOk =
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

    const grade: VnVBenchmarkEvaluation['grade'] = !withinTolerance
      ? 'FAIL_EXCEEDS_TOLERANCE'
      : b.isPartialScreenOnly
        ? 'EVIDENCE_GRADED_PRELIMINARY'
        : 'SOLVER_CONVERGED_UNRELEASED';

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

  for (const r of input.solverReceipts ?? []) {
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
        status: 'VERIFIED_RECEIPT_ONLY',
        reason: `Pinned solver ${r.pinnedSolverVersion} receipt present (unreleased; subject to physical validation)`
      };
    } else {
      solverStatus[r.solverFamily] = {
        status: 'NOT_RUN',
        reason: 'Rejected incomplete, stale-geometry, or unconverged solver receipt; treated as NOT_RUN'
      };
    }
  }

  // Filter independent review dispositions: NEVER accept AI model or CI self-attestation.
  const acceptedDisciplines: DisciplineId[] = [];
  const rejectedReviewDispositions: string[] = [];

  for (const rev of input.reviewDispositions ?? []) {
    if (rev.reviewerType !== 'QUALIFIED_EXTERNAL_ENGINEER') {
      rejectedReviewDispositions.push(
        `${rev.discipline}: rejected non-independent ${rev.reviewerType} disposition (${rev.reviewerName})`
      );
      continue;
    }
    if (!rev.independentFromProducer || !rev.reviewerQualification.trim() || !SHA256_RE.test(rev.outputDigest)) {
      rejectedReviewDispositions.push(`${rev.discipline}: reviewer lacks independence, qualification, or digest binding`);
      continue;
    }
    if (rev.disposition === 'ACCEPTED_WITH_LIMITS') {
      acceptedDisciplines.push(rev.discipline);
    } else {
      rejectedReviewDispositions.push(`${rev.discipline}: external review disposition is ${rev.disposition}`);
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
