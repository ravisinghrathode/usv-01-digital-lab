import {describe,expect,it} from 'vitest';
import {createSolverJobManifest} from '../src/core/verification/RemoteSolverJobs.ts';
import {
  submitApprovedTemplateSolverJob,runApprovedTemplateSolverJob,
  type ApprovedTemplateJobRequest,type TemplateTransport
} from '../src/core/verification/ApprovedTemplateSolver.ts';

const d='sha256:'+'a'.repeat(64);
const request:ApprovedTemplateJobRequest={
  jobRef:'TPL_CFD_001',sourceCommit:'b'.repeat(40),
  templateId:'WIGLEY_CFD_V1',templateDigest:d,
  parameters:{lwlMeters:10,beamMeters:2.5,draftMeters:0.5,speedKnots:8}
};
const manifest=()=>createSolverJobManifest({
  jobRef:request.jobRef,sourceCommit:request.sourceCommit,family:'OPENFOAM_CFD',
  inputArtifactUri:'https://solver-template.local/TPL_CFD_001.zip',
  inputArtifactSha256:'sha256:'+'c'.repeat(64),
  meshArtifactSha256:'sha256:'+'d'.repeat(64),
  qualityPlan:{
    sourceReference:'TEST_TEMPLATE_PLAN',residualThreshold:0.01,
    gridUncertaintyMaxFraction:0.05,maxMeshSkewness:4,maxNonOrthogonalityDeg:70
  }
});

describe('Approved template solver client',()=>{
  it('submits bounded template parameters and returns usable unverified solver evidence only after quality screen',async()=>{
    const m=manifest();
    let polls=0;
    const transport:TemplateTransport={
      submit:async()=>({
        jobId:m.jobRef,acceptedInputDigest:m.manifestSha256,state:'QUEUED',
        manifest:m,templateMaterialization:{templateId:request.templateId,parameterDigest:d}
      }),
      poll:async jobId=>{
        polls++;
        return {
          jobId,acceptedInputDigest:m.manifestSha256,state:'COMPUTE_DONE_EVIDENCE_PENDING',
          solverVersion:'2606',
          outputArtifactUri:'https://solver.example.org/artifacts/'+jobId,
          outputSha256:'sha256:'+'e'.repeat(64),
          quality:{finalResidual:1e-4,gridUncertaintyFraction:null,
            maximumMeshSkewness:0.2,maximumNonOrthogonalityDeg:10},
          keyResults:{forceCoefficients:{coefficients:{Cd:0.01}}}
        };
      }
    };
    const result=await runApprovedTemplateSolverJob(request,{pollIntervalMs:50,timeoutMs:2000},transport);
    expect(polls).toBe(1);
    expect(result.disposition.status).toBe('COMPUTE_DONE_EVIDENCE_PENDING');
    expect(result.agentEvidence?.solverVersion).toBe('2606');
    expect(result.agentEvidence?.engineeringReleaseAuthorized).toBe(false);
    expect(result.templateMaterialization?.templateId).toBe('WIGLEY_CFD_V1');
  });

  it('refuses a service-generated manifest whose digest does not match the ordinary solver contract',async()=>{
    const m=manifest();
    const transport:TemplateTransport={
      submit:async()=>({
        jobId:m.jobRef,acceptedInputDigest:m.manifestSha256,state:'QUEUED',
        manifest:{...m,manifestSha256:'sha256:'+'f'.repeat(64)}
      }),
      poll:async()=>({})
    };
    await expect(submitApprovedTemplateSolverJob(request,transport)).rejects.toThrow(/digest mismatch/);
  });

  it('rejects malformed template requests before any transport call',async()=>{
    let called=false;
    const transport:TemplateTransport={submit:async()=>{called=true;return{}},poll:async()=>({})};
    await expect(submitApprovedTemplateSolverJob(
      {...request,templateDigest:'bad'},transport)).rejects.toThrow(/template job/);
    expect(called).toBe(false);
  });
});
