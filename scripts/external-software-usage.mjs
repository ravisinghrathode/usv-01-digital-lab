/**
 * Import authenticated evidence from the manual Fossen research-only workflow.
 * Produces a review-only register proposal. NEVER grants tool authority.
 * No repository writes, no automatic approval, no changes to vessel baselines.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateRegister,renderOverview,REGISTER_FILE} from './external-software-register.mjs';
const ROOT='ravisinghrathode/usv-01-digital-lab';
const SHA=/^[0-9a-f]{40}$/;
const IMG=/^sha256:[0-9a-f]{64}$/;
const RUN=/^[1-9][0-9]{0,16}$/;
const EXPECTED_PATH='.github/workflows/fossen-isolated-evaluation.yml';
const EXPECTED_STATUS='REFERENCE_CASES_PASSED_UNVERIFIED_ENGINEERING';
const EXPECTED_REPO='cybergalactic/PythonVehicleSimulator';
const EXPECTED_PROJECT='USV-01';
const EXPECTED_ID='EXT-001';
function invalid(s){throw Error('External usage receipt rejected: '+s);}
function sha256(raw){return createHash('sha256').update(raw).digest('hex');}

export function validateFossenReceipt(receipt,verification,db){
 validateRegister(db);
 const record=db.records.find(x=>x.id===EXPECTED_ID);
 if(!record||record.repository!==EXPECTED_REPO||record.lifecycle!=='EVALUATING')invalid('expected unapproved Fossen research candidate');
 if(!receipt||receipt.schemaVersion!==1||receipt.recordId!==EXPECTED_ID||receipt.kind!=='SANDBOX_EVALUATION'||
   receipt.project!==EXPECTED_PROJECT||receipt.custodianAgent!=='A26'||
   receipt.softwareApproved!==false||receipt.engineeringValidated!==false||
   receipt.toolRegistered!==false||receipt.vesselReleased!==false)invalid('receipt must remain unapproved research only');
 if(!RUN.test(String(receipt.runId||''))||!SHA.test(receipt.labHeadSha||'')||
  receipt.runUrl!=='https://github.com/'+ROOT+'/actions/runs/'+receipt.runId)invalid('invalid GitHub Actions run identity');
 if(receipt.sourceCommit!==record.source.commit||receipt.sourceTree!==record.source.tree||
   !IMG.test(receipt.imageId||'')||!IMG.test(receipt.verificationSha256||'') )invalid('source/image/provenance mismatch');
 if(!verification||verification.phase!=='CONTAINER_BENCHMARK'||verification.status!==EXPECTED_STATUS||
    verification.repository!==record.repository||verification.commit!==record.source.commit||
    verification.tree!==record.source.tree||verification.image!==receipt.imageId||
    verification.vesselRelease!==false||verification.engineeringValidation!==false||
    !Array.isArray(verification.cases)||verification.cases.length!==5||
    !verification.cases.every(x=>x.passed===true&&typeof x.caseId==='string'))invalid('real Fossen reference results not proven');
 if(new Set(verification.cases.map(x=>x.caseId)).size!==5)invalid('duplicate smoke-test cases');
 const required=['angle-zero','angle-three-pi','saturation-upper','identity-rotation','skew-matrix'];
 if(required.some(x=>!verification.cases.some(y=>y.caseId===x)))invalid('required smoke-test cases missing');
 return record;
}
export function verifyRunMetadata(receipt,run){
 if(!run||String(run.id)!==String(receipt.runId)||run.event!=='workflow_dispatch'||
    run.status!=='completed'||run.conclusion!=='success'||run.head_branch!=='main'||
    run.head_sha!==receipt.labHeadSha||run.path!==EXPECTED_PATH||
    run.repository?.full_name!==ROOT||run.html_url!==receipt.runUrl)invalid('GitHub API did not confirm successful controlled main-branch workflow');
 return true;
}
export function proposeUsage(db,receipt,verification,run,verificationRaw){
 const record=validateFossenReceipt(receipt,verification,db);
 verifyRunMetadata(receipt,run);
 if(receipt.verificationSha256!=='sha256:'+sha256(verificationRaw))invalid('verification artifact digest mismatch');
 const signature=receipt.runUrl;
 if(record.actualUsage.some(x=>x.executionEvidence===signature))return {proposed:db,added:false};
 const copy=structuredClone(db);
 const r=copy.records.find(x=>x.id===EXPECTED_ID);
 r.actualUsage.push({
  kind:'SANDBOX_EVALUATION',project:EXPECTED_PROJECT,agent:'A26',
  executor:'GITHUB_ACTIONS_DISPOSABLE_RUNNER',
  sourceCommit:receipt.sourceCommit,
  labSourceCommit:receipt.labHeadSha,
  executionEvidence:signature,
  verificationSha256:receipt.verificationSha256,
  caseCount:verification.cases.length,
  outcome:'ELEMENTARY_GNC_SMOKE_ONLY_UNCERTIFIED'
 });
 r.evidence.push({type:'DISPOSABLE_GNC_SMOKE_TEST',url:signature,status:'PASSED_SOFTWARE_ONLY_NOT_MARINE_VALIDATION'});
 r.nextAction='Review source/wheel/base SBOM and licensing; independently validate representative marine-dynamics cases; approve software separately from any USV-01 engineering baseline.';
 validateRegister(copy);
 return {proposed:copy,added:true};
}
async function githubRun(runId,fetchImpl=fetch,token=process.env.GITHUB_TOKEN||''){
 const headers={Accept:'application/vnd.github+json','User-Agent':'USV01-evidence-reconciliation'};
 if(token)headers.Authorization='Bearer '+token;
 const url='https://api.github.com/repos/'+ROOT+'/actions/runs/'+runId;
 const response=await fetchImpl(url,{headers,signal:AbortSignal.timeout(20000)});
 if(!response.ok)invalid('GitHub workflow metadata fetch failed: HTTP '+response.status);
 return response.json();
}
export async function main(args=process.argv.slice(2)){
 if(args.length!==8||args[0]!=='--receipt'||args[2]!=='--verification'||args[4]!=='--proposal-out'||args[6]!=='--overview-out')invalid('usage: --receipt file --verification file --proposal-out file --overview-out file');
 const db=validateRegister(JSON.parse(await readFile(REGISTER_FILE,'utf8')));
 const receipt=JSON.parse(await readFile(args[1],'utf8'));
 const raw=await readFile(args[3],'utf8'),verification=JSON.parse(raw);
 validateFossenReceipt(receipt,verification,db); // Refuse untrusted input before contacting GitHub
 if(receipt.verificationSha256!=='sha256:'+sha256(raw))invalid('verification file changed');
 const run=await githubRun(receipt.runId);
 const {proposed,added}=proposeUsage(db,receipt,verification,run,raw);
 await mkdir(path.dirname(path.resolve(args[5])),{recursive:true,mode:0o700});
 await mkdir(path.dirname(path.resolve(args[7])),{recursive:true,mode:0o700});
 await writeFile(args[5],JSON.stringify(proposed,null,2)+'\n',{mode:0o600});
 await writeFile(args[7],renderOverview(proposed),{mode:0o600});
 console.log(JSON.stringify({status:'USAGE_REVIEW_PROPOSAL_ONLY',added,run:receipt.runUrl,cases:verification.cases.length,automaticallyApproved:false,automaticallyInstalled:false,engineeringReleased:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
