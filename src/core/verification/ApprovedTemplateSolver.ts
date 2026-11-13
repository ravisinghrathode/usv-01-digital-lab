/**
 * Client for operator-approved solver templates.
 *
 * Agents never upload solver archives or dictionaries. They choose an approved
 * template ID and bounded numeric parameters. The authenticated solver service
 * materializes the deterministic case, hashes/stages it, then returns the
 * ordinary SolverJobManifest used by the existing fail-closed receipt logic.
 */
import {
  createSolverJobManifest,
  evaluateSolverReceipt,
  pollRemoteSolverJob,
  getAgentUsableSolverEvidence,
  type SolverJobManifest,
  type SolverJobDisposition
} from './RemoteSolverJobs.ts';

const SHA=/^sha256:[0-9a-f]{64}$/;
const REV=/^[0-9a-f]{40}$/;
const ID=/^[A-Za-z0-9_-]{3,64}$/;

export interface ApprovedTemplateJobRequest {
  jobRef:string;
  sourceCommit:string;
  templateId:string;
  templateDigest:string;
  parameters:Record<string,number>;
}
export interface ApprovedTemplateSubmission {
  manifest:SolverJobManifest;
  disposition:SolverJobDisposition;
  templateMaterialization?:Record<string,unknown>;
}
export interface TemplateTransport {
  submit:(request:ApprovedTemplateJobRequest)=>Promise<unknown>;
  poll:(jobId:string)=>Promise<unknown>;
}
const validate=(x:ApprovedTemplateJobRequest)=>{
  if(!x||!ID.test(x.jobRef)||!REV.test(x.sourceCommit)||!ID.test(x.templateId)||
    !SHA.test(x.templateDigest)||!x.parameters||typeof x.parameters!=='object'||
    Array.isArray(x.parameters)||!Object.keys(x.parameters).length||
    Object.values(x.parameters).some(v=>typeof v!=='number'||!Number.isFinite(v))){
    throw new Error('Approved template job requires exact source/template digests and finite bounded numeric parameters');
  }
};
const endpoint=(kind:'template'|'jobs')=>{
  const base=process.env.USV_SOLVER_HTTPS_ENDPOINT;
  const token=process.env.USV_SOLVER_SERVICE_TOKEN;
  if(!base||!token||token.length<32)throw new Error('Authenticated solver endpoint/token required');
  const u=new URL(base);
  if(u.protocol!=='https:'||!u.hostname||u.username||u.password||u.hash||
    !u.pathname.endsWith('/jobs'))throw new Error('USV_SOLVER_HTTPS_ENDPOINT must be HTTPS and end with /jobs');
  if(kind==='template')u.pathname=u.pathname.slice(0,-5)+'/template-jobs';
  return {u,token};
};
const defaultSubmit=async(request:ApprovedTemplateJobRequest)=>{
  const {u,token}=endpoint('template');
  const response=await fetch(u,{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    body:JSON.stringify(request),signal:AbortSignal.timeout(20000)
  });
  if(!response.ok)throw new Error('Approved template solver service rejected request: HTTP '+response.status);
  return response.json();
};

export async function submitApprovedTemplateSolverJob(
  request:ApprovedTemplateJobRequest,
  transport?:TemplateTransport
):Promise<ApprovedTemplateSubmission>{
  validate(request);
  const raw=await (transport?transport.submit(request):defaultSubmit(request));
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Malformed template solver response');
  const r=raw as Record<string,unknown>;
  if(!r.manifest||typeof r.manifest!=='object'||Array.isArray(r.manifest)){
    throw new Error('Template service did not return generated solver manifest');
  }
  const m=r.manifest as Record<string,unknown>;
  const regenerated=createSolverJobManifest({
    jobRef:m.jobRef as string,sourceCommit:m.sourceCommit as string,
    family:m.family as 'OPENFOAM_CFD'|'CALCULIX_FEA',
    inputArtifactUri:m.inputArtifactUri as string,inputArtifactSha256:m.inputArtifactSha256 as string,
    meshArtifactSha256:m.meshArtifactSha256 as string,
    qualityPlan:m.qualityPlan as Parameters<typeof createSolverJobManifest>[0]['qualityPlan']
  });
  if(regenerated.manifestSha256!==m.manifestSha256){
    throw new Error('Template service manifest digest mismatch');
  }
  const disposition=evaluateSolverReceipt(regenerated,r);
  return {
    manifest:regenerated,disposition,
    templateMaterialization:
      r.templateMaterialization&&typeof r.templateMaterialization==='object'&&!Array.isArray(r.templateMaterialization)
        ? r.templateMaterialization as Record<string,unknown>:undefined
  };
}

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export async function runApprovedTemplateSolverJob(
  request:ApprovedTemplateJobRequest,
  options:{pollIntervalMs?:number;timeoutMs?:number}={},
  transport?:TemplateTransport
):Promise<ApprovedTemplateSubmission & {agentEvidence:ReturnType<typeof getAgentUsableSolverEvidence>}>{
  const first=await submitApprovedTemplateSolverJob(request,transport);
  let disposition=first.disposition;
  const pollMs=Math.max(50,Math.min(options.pollIntervalMs??2000,30000));
  const timeout=Math.max(1000,Math.min(options.timeoutMs??20*60_000,2*60*60_000));
  const start=Date.now();
  while(disposition.status==='SUBMITTED_UNVERIFIED'){
    if(Date.now()-start>timeout)throw new Error('Approved template solver job timed out without fabricating completion');
    await sleep(pollMs);
    disposition=await pollRemoteSolverJob(
      first.manifest,
      transport?jobId=>transport.poll(jobId):undefined
    );
  }
  return {...first,disposition,agentEvidence:getAgentUsableSolverEvidence(disposition)};
}
