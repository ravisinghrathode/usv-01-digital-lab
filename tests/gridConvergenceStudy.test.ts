import {describe,expect,it} from 'vitest';
import {evaluateThreeGridConvergence,evaluateSolverGridConvergence} from '../src/core/verification/GridConvergenceStudy.ts';
import {createSolverJobManifest,evaluateSolverReceipt} from '../src/core/verification/RemoteSolverJobs.ts';

const d=(c:string)=>'sha256:'+c.repeat(64);
describe('Three-grid GCI screen',()=>{
  it('recovers second-order monotonic convergence and bounded fine-grid GCI',()=>{
    // Exact phi=1 with C*h^2, h={0.5,1,2}: 1.25,2,5.
    const r=evaluateThreeGridConvergence(
      {id:'fine',characteristicGridSize:0.5,scalarMetric:1.25,sourceDigest:d('a')},
      {id:'medium',characteristicGridSize:1,scalarMetric:2,sourceDigest:d('b')},
      {id:'coarse',characteristicGridSize:2,scalarMetric:5,sourceDigest:d('c')},
      0.3
    );
    expect(r.status).toBe('GCI_SCREEN_PASS_UNCERTIFIED');
    expect(r.observedOrder).toBeCloseTo(2,10);
    expect(r.extrapolatedMetric).toBeCloseTo(1,10);
    expect(r.fineGridGciFraction).toBeCloseTo(0.25,10);
    expect(r.externallyValidated).toBe(false);
    expect(r.engineeringReleaseAuthorized).toBe(false);
  });
  it('fails the screen when discretization uncertainty exceeds the declared limit',()=>{
    const r=evaluateThreeGridConvergence(
      {id:'fine',characteristicGridSize:0.5,scalarMetric:1.25,sourceDigest:d('a')},
      {id:'medium',characteristicGridSize:1,scalarMetric:2,sourceDigest:d('b')},
      {id:'coarse',characteristicGridSize:2,scalarMetric:5,sourceDigest:d('c')},
      0.1
    );
    expect(r.status).toBe('GCI_SCREEN_FAIL');
    expect(r.issues.join(' ')).toMatch(/exceeds/);
  });
  it('refuses non-monotonic or materially nonuniform refinement sequences',()=>{
    const nonmon=evaluateThreeGridConvergence(
      {id:'fine',characteristicGridSize:0.5,scalarMetric:1,sourceDigest:d('a')},
      {id:'medium',characteristicGridSize:1,scalarMetric:1.2,sourceDigest:d('b')},
      {id:'coarse',characteristicGridSize:2,scalarMetric:1.1,sourceDigest:d('c')},0.1);
    expect(nonmon.status).toBe('NON_MONOTONIC_OR_DEGENERATE');
    const irregular=evaluateThreeGridConvergence(
      {id:'fine',characteristicGridSize:0.5,scalarMetric:1,sourceDigest:d('a')},
      {id:'medium',characteristicGridSize:1,scalarMetric:1.2,sourceDigest:d('b')},
      {id:'coarse',characteristicGridSize:3,scalarMetric:2,sourceDigest:d('c')},0.1);
    expect(irregular.status).toBe('NON_MONOTONIC_OR_DEGENERATE');
  });
  it('derives GCI only from three retained single-run quality-screened solver receipts',()=>{
    const mk=(job:string,value:number,digest:string)=>{
      const m=createSolverJobManifest({
        jobRef:job,sourceCommit:'a'.repeat(40),family:'OPENFOAM_CFD',
        inputArtifactUri:'https://solver.example.org/'+job+'.zip',
        inputArtifactSha256:d('d'),meshArtifactSha256:d('e'),
        qualityPlan:{sourceReference:'TEST_GCI',residualThreshold:0.01,
          gridUncertaintyMaxFraction:0.3,maxMeshSkewness:4,maxNonOrthogonalityDeg:70}
      });
      return evaluateSolverReceipt(m,{
        jobId:job,acceptedInputDigest:m.manifestSha256,state:'COMPUTE_DONE_EVIDENCE_PENDING',
        solverVersion:'2606',outputArtifactUri:'https://solver.example.org/artifacts/'+job,
        outputSha256:digest,quality:{finalResidual:1e-5,gridUncertaintyFraction:null,
          maximumMeshSkewness:0.2,maximumNonOrthogonalityDeg:10},
        keyResults:{forceCoefficients:{coefficients:{Cd:value}}}
      });
    };
    const out=evaluateSolverGridConvergence(
      {id:'fine',characteristicGridSize:0.5,disposition:mk('GCI_FINE',1.25,d('1'))},
      {id:'medium',characteristicGridSize:1,disposition:mk('GCI_MEDIUM',2,d('2'))},
      {id:'coarse',characteristicGridSize:2,disposition:mk('GCI_COARSE',5,d('3'))},
      'forceCoefficients.coefficients.Cd',0.3
    );
    expect(out.report.status).toBe('GCI_SCREEN_PASS_UNCERTIFIED');
    expect(out.agentEvidence?.gridUncertaintyFraction).toBeCloseTo(0.25,10);
    expect(out.agentEvidence?.engineeringReleaseAuthorized).toBe(false);
  });

  it('rejects invalid evidence identity and unordered grids',()=>{
    expect(()=>evaluateThreeGridConvergence(
      {id:'fine',characteristicGridSize:1,scalarMetric:1,sourceDigest:'bad'},
      {id:'medium',characteristicGridSize:0.5,scalarMetric:2,sourceDigest:d('b')},
      {id:'coarse',characteristicGridSize:2,scalarMetric:3,sourceDigest:d('c')},0.1)
    ).toThrow(/ordered positive grid sizes/);
  });
});
