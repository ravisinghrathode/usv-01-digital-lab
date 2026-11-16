import {generateKeyPairSync,sign} from 'node:crypto';
import {
  numericalDisciplineOutputDigest,numericalReviewSigningPayload
} from '../src/core/verification/NumericalVnVHarness.ts';
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
    expect(report.acceptedDisciplines).toEqual([]);
    expect(report.rejectedReviewDispositions).toHaveLength(2);
    expect(report.referenceArtifactsAuthenticated).toBe(false);
    expect(report.benchmarkEvaluations.every(x=>x.grade==='NUMERIC_SCREEN_PASS_UNCERTIFIED')).toBe(true);
    expect(report.rejectedReviewDispositions[0]).toContain('CI_AUTOMATION');
    expect(report.engineeringReleaseStatus).toBe('HOLD');
  });

  it('accepts only an exact-source/geometry/benchmark digest with externally anchored Ed25519 review',()=>{
    const keys=generateKeyPairSync('ed25519');
    const trusted={'EXT-01':{
      reviewerName:'Synthetic External Examiner',
      reviewerQualification:'TEST_ONLY_NOT_REAL_ENGINEER',
      publicKeyPem:keys.publicKey.export({type:'spki',format:'pem'}).toString()
    }};
    const benchmarks=[{
      benchmarkId:'SYN-HYD-1',discipline:'HYDROSTATICS_STABILITY' as const,
      quantity:'synthetic displacement',unit:'kg',
      standardOrSourceRef:'SYNTHETIC_CASE_ONLY_NO_AUTHENTICATED_STANDARD',
      artifactSha256:ARTIFACT_SHA,computedValue:2,referenceValue:2.01,
      referenceUncertainty:0.02,numericalUncertainty:0.01,approvedTolerance:0.1,
      topologySpecificChecked:true
    }];
    const review={
      discipline:'HYDROSTATICS_STABILITY' as const,
      outputDigest:numericalDisciplineOutputDigest(COMMIT,GEOM_SHA,'HYDROSTATICS_STABILITY',benchmarks),
      reviewerName:'Synthetic External Examiner',
      reviewerQualification:'TEST_ONLY_NOT_REAL_ENGINEER',
      reviewerType:'QUALIFIED_EXTERNAL_ENGINEER' as const,
      disposition:'ACCEPTED_WITH_LIMITS' as const,
      signedAtUtc:'2026-11-15T01:00:00Z',independentFromProducer:true,
      signerKeyId:'EXT-01',signatureBase64:''
    };
    review.signatureBase64=sign(null,numericalReviewSigningPayload(review,COMMIT,GEOM_SHA),
      keys.privateKey).toString('base64');
    const evaluate=(changes:Record<string,unknown>={})=>evaluateNumericalVnV({
      sourceCommitSha:COMMIT,geometrySha256:GEOM_SHA,
      benchmarks,reviewDispositions:[review],trustedReviewers:trusted,...changes
    });
    expect(evaluate().acceptedDisciplines).toEqual(['HYDROSTATICS_STABILITY']);
    expect(evaluate({sourceCommitSha:'b'.repeat(40)}).acceptedDisciplines).toEqual([]);
    expect(evaluate({geometrySha256:'sha256:'+'f'.repeat(64)}).acceptedDisciplines).toEqual([]);
    expect(evaluate({benchmarks:[{...benchmarks[0],computedValue:2.05}]}).acceptedDisciplines).toEqual([]);
    expect(evaluate({trustedReviewers:{}}).acceptedDisciplines).toEqual([]);
    expect(evaluate({reviewDispositions:[{...review,reviewerName:'Different Reviewer'}]}).acceptedDisciplines).toEqual([]);
    expect(evaluate({reviewDispositions:[{...review,signatureBase64:'AAA='}]}).acceptedDisciplines).toEqual([]);
    expect(evaluate({reviewDispositions:[{...review,reviewerType:'AI_MODEL'}]}).acceptedDisciplines).toEqual([]);
    expect(evaluate().engineeringReleaseStatus).toBe('HOLD');
  });

  it('never calls ordinary numeric comparisons converged and rejects duplicate solver receipts',()=>{
    const b={
      benchmarkId:'SYN-CFD-01',discipline:'CFD_FEA_NUMERICAL' as const,
      quantity:'synthetic quantity',unit:'m',
      standardOrSourceRef:'SYNTHETIC_NO_REAL_REFERENCE',
      artifactSha256:ARTIFACT_SHA,computedValue:1,referenceValue:1.001,
      referenceUncertainty:0.01,numericalUncertainty:0.01,approvedTolerance:0.05,
      topologySpecificChecked:true,isPartialScreenOnly:false
    };
    const r={
      solverFamily:'OPENFOAM_CFD' as const,pinnedSolverVersion:'vTest',
      solverBinaryDigest:ARTIFACT_SHA,geometrySha256:GEOM_SHA,
      meshConvergenceVerified:true,boundaryConditionsRef:'SYN-B-C',
      maxNormalizedResidual:0.00001,discretizationUncertainty:0.02,
      executionState:'EXECUTED_PINNED_HOST' as const
    };
    const args={sourceCommitSha:COMMIT,geometrySha256:GEOM_SHA,benchmarks:[b]};
    const noSolver=evaluateNumericalVnV(args);
    expect(noSolver.benchmarkEvaluations[0].grade).toBe('NUMERIC_SCREEN_PASS_UNCERTIFIED');
    expect(noSolver.solverStatus.OPENFOAM_CFD.status).toBe('NOT_RUN');
    const submitted=evaluateNumericalVnV({...args,solverReceipts:[r]});
    expect(submitted.solverStatus.OPENFOAM_CFD.status).toBe('DECLARED_RECEIPT_UNVERIFIED');
    expect(submitted.benchmarkEvaluations[0].grade).toBe('NUMERIC_SCREEN_PASS_UNCERTIFIED');
    const conflicted=evaluateNumericalVnV({...args,solverReceipts:[r,{...r,pinnedSolverVersion:'vOther'}]});
    expect(conflicted.solverStatus.OPENFOAM_CFD.status).toBe('NOT_RUN');
    expect(conflicted.engineeringReleaseStatus).toBe('HOLD');
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
