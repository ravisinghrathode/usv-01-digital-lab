import { describe, expect, it } from 'vitest';
import { evaluateNumericalVnV } from '../src/core/verification/NumericalVnVHarness.ts';

const COMMIT = '4b6bf3107abd50fec0074a98563979ca9dae9b42';
const GEOM_SHA = 'sha256:' + 'a'.repeat(64);
const ARTIFACT_SHA = 'sha256:' + 'b'.repeat(64);

describe('M05 — B06 evidence-graded numerical V&V harness & solver NOT_RUN gating', () => {
  it('computes ASME validation uncertainty, flags missing CFD/FEA as NOT_RUN, and rejects AI/CI self-attestation', () => {
    const report = evaluateNumericalVnV({
      sourceCommitSha: COMMIT,
      geometrySha256: GEOM_SHA,
      benchmarks: [
        {
          benchmarkId: 'BM-HYD-01',
          discipline: 'HYDROSTATICS_STABILITY',
          quantity: 'Displacement',
          unit: 'kg',
          standardOrSourceRef: 'ISO-12217-Wigley-Oracle',
          artifactSha256: ARTIFACT_SHA,
          computedValue: 10248,
          referenceValue: 10250,
          referenceUncertainty: 10,
          numericalUncertainty: 5,
          approvedTolerance: 50,
          topologySpecificChecked: true,
          isPartialScreenOnly: true
        },
        {
          benchmarkId: 'BM-RES-01',
          discipline: 'RESISTANCE_PROPULSION_ENDURANCE',
          quantity: 'ResidualResistance',
          unit: 'N',
          standardOrSourceRef: 'ITTC-78-Wigley-57',
          artifactSha256: ARTIFACT_SHA,
          computedValue: 412,
          referenceValue: 410,
          referenceUncertainty: 8,
          numericalUncertainty: 6,
          approvedTolerance: 25,
          topologySpecificChecked: true
        }
      ],
      reviewDispositions: [
        {
          discipline: 'HYDROSTATICS_STABILITY',
          outputDigest: ARTIFACT_SHA,
          reviewerName: 'CI GitHub Action Bot',
          reviewerQualification: 'Automation',
          reviewerType: 'CI_AUTOMATION',
          disposition: 'ACCEPTED_WITH_LIMITS',
          signedAtUtc: '2026-11-15T00:00:00Z',
          independentFromProducer: true
        },
        {
          discipline: 'RESISTANCE_PROPULSION_ENDURANCE',
          outputDigest: ARTIFACT_SHA,
          reviewerName: 'Dr. M. Hydro, PE',
          reviewerQualification: 'Chartered Naval Architect',
          reviewerType: 'QUALIFIED_EXTERNAL_ENGINEER',
          disposition: 'ACCEPTED_WITH_LIMITS',
          signedAtUtc: '2026-11-15T00:00:00Z',
          independentFromProducer: true
        }
      ]
    });

    expect(report.overallStatus).toBe('PRELIMINARY_BENCHMARKED_HOLD_FOR_EXTERNAL_AND_DIRECTOR');
    expect(report.solverStatus.OPENFOAM_CFD.status).toBe('NOT_RUN');
    expect(report.solverStatus.CALCULIX_FEA.status).toBe('NOT_RUN');
    expect(report.acceptedDisciplines).toEqual(['RESISTANCE_PROPULSION_ENDURANCE']);
    expect(report.rejectedReviewDispositions[0]).toContain('CI_AUTOMATION');
    expect(report.engineeringReleaseStatus).toBe('HOLD');
  });

  it('rejects stale-geometry solver receipts back to NOT_RUN and blocks failed benchmark tolerances', () => {
    const staleSolver = evaluateNumericalVnV({
      sourceCommitSha: COMMIT,
      geometrySha256: GEOM_SHA,
      benchmarks: [
        {
          benchmarkId: 'BM-FAIL',
          discipline: 'STRUCTURES_AND_LR',
          quantity: 'PeakStressMPa',
          unit: 'MPa',
          standardOrSourceRef: 'DNV-HSLC-Sec4',
          artifactSha256: ARTIFACT_SHA,
          computedValue: 290,
          referenceValue: 180,
          referenceUncertainty: 5,
          numericalUncertainty: 5,
          approvedTolerance: 20,
          topologySpecificChecked: true
        }
      ],
      solverReceipts: [
        {
          solverFamily: 'CALCULIX_FEA',
          pinnedSolverVersion: 'ccx-2.21',
          solverBinaryDigest: ARTIFACT_SHA,
          geometrySha256: 'sha256:' + 'f'.repeat(64), // stale!
          meshConvergenceVerified: true,
          boundaryConditionsRef: 'BC-1',
          maxNormalizedResidual: 1e-5,
          discretizationUncertainty: 0.02,
          executionState: 'EXECUTED_PINNED_HOST'
        }
      ]
    });
    expect(staleSolver.overallStatus).toBe('BLOCKED_FAILED_OR_INVALID_BENCHMARK');
    expect(staleSolver.solverStatus.CALCULIX_FEA.status).toBe('NOT_RUN');
    expect(staleSolver.benchmarkEvaluations[0].grade).toBe('FAIL_EXCEEDS_TOLERANCE');
  });
});
