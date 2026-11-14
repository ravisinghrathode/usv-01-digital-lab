import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {REGISTER_FILE,validateRegister} from '../scripts/external-software-register.mjs';
import {validateFossenReceipt,verifyRunMetadata,proposeUsage} from '../scripts/external-software-usage.mjs';
const db=validateRegister(JSON.parse(await readFile(REGISTER_FILE,'utf8')));
const original=db.records.find(r=>r.id==='EXT-001');
const labHead='b'.repeat(40), image='sha256:'+'c'.repeat(64);
const verification={
 phase:'CONTAINER_BENCHMARK',status:'REFERENCE_CASES_PASSED_UNVERIFIED_ENGINEERING',
 repository:original.repository,commit:original.source.commit,tree:original.source.tree,image,
 vesselRelease:false,engineeringValidation:false,
 cases:['angle-zero','angle-three-pi','saturation-upper','identity-rotation','skew-matrix'].map(caseId=>({caseId,passed:true,observations:[]}))
};
const raw=JSON.stringify(verification)+'\n';
const digest='sha256:'+createHash('sha256').update(raw).digest('hex');
const receipt={schemaVersion:1,recordId:'EXT-001',kind:'SANDBOX_EVALUATION',project:'USV-01',
 custodianAgent:'A26',softwareApproved:false,engineeringValidated:false,toolRegistered:false,vesselReleased:false,
 runId:'43588877661',runUrl:'https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/43588877661',
 sourceCommit:original.source.commit,sourceTree:original.source.tree,imageId:image,verificationSha256:digest,labHeadSha:labHead};
const run={id:43588877661,event:'workflow_dispatch',status:'completed',conclusion:'success',head_branch:'main',
 head_sha:labHead,path:'.github/workflows/fossen-isolated-evaluation.yml',
 repository:{full_name:'ravisinghrathode/usv-01-digital-lab'},html_url:receipt.runUrl};
const clone=x=>structuredClone(x);
test('validated research receipt cannot claim approval or naval release',()=>{
 assert.equal(validateFossenReceipt(receipt,verification,db).adoption,'NOT_APPROVED');
 for(const k of ['softwareApproved','engineeringValidated','toolRegistered','vesselReleased']){
  assert.throws(()=>validateFossenReceipt({...receipt,[k]:true},verification,db),/unapproved research/);
 }
});
test('reference case results must be real, complete and match source SHA/tree/image',()=>{
 assert.throws(()=>validateFossenReceipt(receipt,{...verification,cases:verification.cases.slice(1)},db),/results not proven/);
 assert.throws(()=>validateFossenReceipt(receipt,{...verification,image:'sha256:'+'d'.repeat(64)},db),/results not proven/);
 assert.throws(()=>validateFossenReceipt({...receipt,sourceCommit:'f'.repeat(40)},verification,db),/provenance mismatch/);
 assert.throws(()=>validateFossenReceipt(receipt,{...verification,engineeringValidation:true},db),/results not proven/);
});
test('GitHub Actions evidence must be successful manual workflow on protected main SHA',()=>{
 assert.equal(verifyRunMetadata(receipt,run),true);
 for(const change of [{conclusion:'failure'},{event:'pull_request'},{head_branch:'dev'},{head_sha:'0'.repeat(40)},
 {path:'.github/workflows/rogue.yml'},{repository:{full_name:'untrusted/fork'}}]){
  assert.throws(()=>verifyRunMetadata(receipt,{...run,...change}),/did not confirm/);
 }
});
test('receipt SHA256 binds raw verification bytes, not only JSON values',()=>{
 assert.throws(()=>proposeUsage(db,receipt,verification,run,JSON.stringify(verification)),/digest mismatch/);
});
test('approved Github run proposes one sandbox use without approving external software',()=>{
 const {proposed,added}=proposeUsage(db,receipt,verification,run,raw);
 assert.equal(added,true);
 const r=proposed.records.find(x=>x.id==='EXT-001');
 assert.equal(r.actualUsage.length,1);
 assert.equal(r.actualUsage[0].kind,'SANDBOX_EVALUATION');
 assert.equal(r.actualUsage[0].executor,'GITHUB_ACTIONS_DISPOSABLE_RUNNER');
 assert.equal(r.adoption,'NOT_APPROVED');
 assert.equal(r.engineeringValidation,'NOT_VALIDATED');
 assert.equal(r.installation,'NOT_INSTALLED');
 assert.equal(r.registeredToolId,null);
 assert.equal(r.actualUsage[0].executionEvidence,receipt.runUrl);
 assert.equal(db.records.find(x=>x.id==='EXT-001').actualUsage.length,0);
 const onceMore=proposeUsage(proposed,receipt,verification,run,raw);
 assert.equal(onceMore.added,false);
 assert.equal(onceMore.proposed.records.find(x=>x.id==='EXT-001').actualUsage.length,1);
});
