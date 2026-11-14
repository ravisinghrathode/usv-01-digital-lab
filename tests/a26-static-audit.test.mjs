import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {validateAudit,AUDIT_FILE} from '../scripts/a26-static-audit.mjs';
import {validatePolicy,POLICY_FILE,CANDIDATE_DIR,checkCandidate} from '../scripts/external-integration-agent.mjs';
import {validateRegister,REGISTER_FILE} from '../scripts/external-software-register.mjs';
const p=validatePolicy(JSON.parse(await readFile(POLICY_FILE,'utf8')));
const db=validateRegister(JSON.parse(await readFile(REGISTER_FILE,'utf8')));
const audit=JSON.parse(await readFile(AUDIT_FILE,'utf8'));
const manifests=await Promise.all(audit.records.map(x=>readFile(path.join(CANDIDATE_DIR,x.id+'.json'),'utf8').then(JSON.parse)));
const copy=x=>structuredClone(x);
test('eight source-pinned research dossiers are internally consistent and unapproved',()=>{
 const x=validateAudit(audit,db,p,manifests);
 assert.equal(x.audited,8);
 assert.equal(x.licenseApproved,0);
 assert.equal(x.agentToolsActivated,0);
 assert.equal(x.anyThirdPartyCodeExecuted,false);
 assert.equal(audit.records.filter(x=>x.licenseFinding.includes('NO_ROOT_LICENSE')).length,1);
});
test('all seven new manifests plus Fossen require exact commit/tree and independent roles',()=>{
 assert.equal(manifests.length,8);
 for(const m of manifests){
  assert.equal(checkCandidate(m,db,p).repository,m.repository);
  assert.equal(m.execution,'NOT_AUTHORIZED');
  assert.equal(m.approval,'NOT_APPROVED');
  assert.equal(m.runner,undefined);
  assert.equal(m.cases,undefined);
  assert.throws(()=>checkCandidate({...m,sourceTree:'f'.repeat(40)},db,p),/source tree conflicts/);
 }
});
test('immutable record, manifest and blob pins fail closed on substitution',()=>{
 let x=copy(audit);x.records[0].pinnedCommit='a'.repeat(40);
 assert.throws(()=>validateAudit(x,db,p,manifests),/source-controlled register/);
 x=copy(audit);x.records[0].inspectedFiles[0].gitBlobSha='not-a-real-sha';
 assert.throws(()=>validateAudit(x,db,p,manifests),/Git blob provenance/);
 x=copy(audit);x.records[0].inspectedFiles[0].sourceUrl='https://github.com/untrusted/README';
 assert.throws(()=>validateAudit(x,db,p,manifests),/Git blob provenance/);
 x=copy(audit);x.records[0].inspectedFiles.push(copy(x.records[0].inspectedFiles[0]));
 assert.throws(()=>validateAudit(x,db,p,manifests),/Git blob provenance/);
});
test('missing or mislabeled legal evidence cannot be promoted to permissible use',()=>{
 const x=copy(audit);
 const item=x.records.find(r=>r.repository==='Neumi/open_echo');
 assert.equal(item.licenseFinding,'NO_ROOT_LICENSE_FILE_IN_PINNED_ROOT_LISTING_HOLD');
 item.licenseFinding='AVAILABLE_UNCONDITIONALLY';
 assert.throws(()=>validateAudit(x,db,p,manifests),/absent root license/);
});
test('passing smoke tests or agent claim cannot certify independent marine physics',()=>{
 for(const [key,v] of [['licenseApproved',true],['securityQualified',true],
   ['benchmarkPassed',true],['acceptedForEngineering',true],
   ['agentRuntimeRegistered',true],['actualUse',true]]){
  const x=copy(audit);
  x.records[1][key]=v;
  assert.throws(()=>validateAudit(x,db,p,manifests),/incorrectly promoted/);
 }
 const x=copy(audit);
 x.records[0].independentBenchmarkPlan[0].expected='1.0';
 x.records[0].independentBenchmarkPlan[0].completed=true;
 assert.throws(()=>validateAudit(x,db,p,manifests),/unsupported numerical reference/);
});
test('must include all three independent benchmark families with units and frames explicitly TBD',()=>{
 for(const change of [
  x=>{x.records[0].independentBenchmarkPlan=x.records[0].independentBenchmarkPlan.slice(1)},
  x=>{x.records[0].independentBenchmarkPlan[0].units='metres'},
  x=>{x.records[0].independentBenchmarkPlan[0].source='CANDIDATE_OWN_RESULT'},
  x=>{x.records[0].independentBenchmarkPlan[0].completed=true}
 ]){
  const x=copy(audit);change(x);assert.throws(()=>validateAudit(x,db,p,manifests),/reference|test families/);
 }
});
test('manifest injection cannot add foreign runner or preapproved source execution',()=>{
 const m=copy(manifests);
 m[0].runner={image:'evil',argv:['sh','-c','curl bogus']};
 assert.throws(()=>validateAudit(audit,db,p,m),/Runner|executable or mismatched/);
 const d=copy(manifests);
 d[0].execution='AUTHORIZED';
 assert.throws(()=>validateAudit(audit,db,p,d),/executable or mismatched/);
});
test('policy revision and legal/source guardrails cannot be weakened in data',()=>{
 for(const edit of [
  x=>{x.revision=1},
  x=>{x.staticSourceAudit.rejectMetadataAsLicenseApproval=false},
  x=>{x.staticSourceAudit.requireUnitsFramesAndUncertainty=false},
  x=>{x.staticSourceAudit.rejectUnlicensedHardwareFirmwareUse=false},
  x=>{x.staticSourceAudit.extraActionEnabled=true}
 ]){
  const x=copy(p);edit(x);
  assert.throws(()=>validatePolicy(x),/HOLD/);
  assert.throws(()=>validateAudit(audit,db,x,manifests),/HOLD/);
 }
});
