import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {validatePolicy,authorizeAction,checkCandidate,evaluateEvidence,createDraftPackage,
 FAIL_CLOSED_PYTHON,POLICY_FILE,main} from '../scripts/external-integration-agent.mjs';
import {REGISTER_FILE} from '../scripts/external-software-register.mjs';
const p=validatePolicy(JSON.parse(await readFile(POLICY_FILE,'utf8')));
const db=JSON.parse(await readFile(REGISTER_FILE,'utf8'));
const manifest=fileURLToPath(new URL('../references/third-party-candidates/fossen-python-vehicle-simulator.json',import.meta.url));
const spec=JSON.parse(await readFile(manifest,'utf8'));
const record=db.records.find(x=>x.repository===spec.repository);
const clone=x=>structuredClone(x);
test('A26 coordinator is supporting service only and policy points to authoritative governance',()=>{
 assert.equal(p.coordinator,'A26');
 assert.equal(p.agentType,'SUPPORTING_SERVICE_NOT_ADDITIONAL_ENGINEERING_AGENT');
 assert.equal(p.sandboxHardening.network,'none');
 assert.equal(p.sandboxHardening.ephemeralHost,true);
 assert.equal(p.enforcement.autoRegistryWrites,false);
 assert.equal(p.enforcement.autoVesselRelease,false);
 assert.equal(checkCandidate(spec,db,p).id,'EXT-001');
});
test('autonomy permits drafting but blocks execution, registry writes, spending and self-approval',()=>{
 assert.equal(authorizeAction(p,'DRAFT_ADAPTER_CONTRACT').permitted,true);
 for(const a of p.alwaysForbidden)assert.deepEqual(authorizeAction(p,a),{permitted:false,disposition:'FORBIDDEN'});
 for(const a of p.blockedWithoutExplicitHumanAuthorization)assert.deepEqual(authorizeAction(p,a),{permitted:false,disposition:'HUMAN_GATE_OUTSIDE_THIS_SERVICE'});
 assert.equal(authorizeAction(p,'UNDECLARED_PRIVILEGED_ACTION').permitted,false);
});
test('permissions and authority cannot silently expand through policy JSON',()=>{
 for(const mutate of [
  x=>{x.coordinator='A27';},
  x=>{x.scope.allowedRepositoryVisibility='ANY';},
  x=>{x.scope.maxSourceFiles=5000;},
  x=>{x.scope.maxSourceFiles=null;},
  x=>{x.sandboxHardening.network='host';},
  x=>{x.sandboxHardening.minIndependentReferenceCases=1;},
  x=>{x.enforcement.autoRegistryWrites=true;},
  x=>{x.enforcement.qualificationClaimAllowed=true;},
  x=>{x.humanGates.software='AUTOMATIC';},
  x=>{x.alwaysForbidden=[];},
  x=>{x.allowedAutonomousActions.push('RUN_HOST_SHELL');},
  x=>{x.sourceOfAuthority=[];}
 ]){
  const bad=clone(p);mutate(bad);assert.throws(()=>validatePolicy(bad),/HOLD/);
 }
});
test('source identity, reviewers and independent domain specialist must match reviewed register',()=>{
 assert.throws(()=>checkCandidate({...spec,commit:'a'.repeat(40)},db,p),/source pin/);
 assert.throws(()=>checkCandidate({...spec,agents:spec.agents.filter(x=>x!=='A20')},db,p),/required agent/);
 assert.throws(()=>checkCandidate({...spec,agents:['A26','A15','A23','A20','A21','A18','A24']},db,p),/domain engineering/);
 assert.throws(()=>checkCandidate({...spec,repository:'unreviewed/upstream'},db,p),/reviewed external software register/);
 const replaced=clone(db);replaced.records.find(x=>x.id==='EXT-001').lifecycle='INTEGRATED';
 assert.throws(()=>checkCandidate(spec,replaced,p),/register|unapproved research/);
});
test('unverified stage cannot be mistaken for immutable Git-tree inspection',()=>{
 const e=evaluateEvidence(spec,record,null,null,p);
 assert.ok(e.blockers.includes('IMMUTABLE_TREE_STAGE_NOT_VERIFIED'));
 assert.equal(e.softwareQualified,false);
 assert.equal(e.agentToolRegistered,false);
 const stage={phase:'SOURCE_STAGED_NO_EXECUTION',repo:spec.repository,commit:spec.commit,
  tree:record.source.tree,dynamicExecution:false,approved:false};
 assert.ok(!evaluateEvidence(spec,record,stage,null,p).blockers.includes('IMMUTABLE_TREE_STAGE_NOT_VERIFIED'));
 assert.ok(evaluateEvidence(spec,record,{...stage,tree:'f'.repeat(40)},null,p).blockers.includes('IMMUTABLE_TREE_STAGE_NOT_VERIFIED'));
 assert.ok(evaluateEvidence(spec,record,{...stage,dynamicExecution:true},null,p).blockers.includes('IMMUTABLE_TREE_STAGE_NOT_VERIFIED'));
});
test('self-declared complete evidence cannot authenticate its own qualification',()=>{
 const stage={phase:'SOURCE_STAGED_NO_EXECUTION',repo:spec.repository,commit:spec.commit,
  tree:record.source.tree,dynamicExecution:false,approved:false};
 const cases=['analytic','marine','invalid'].map(id=>({
  id,units:'m',coordinateFrame:'NED',absoluteTolerance:0.01,
  independentReferenceEvidence:'https://github.com/example/reference',
  observedRunEvidence:'https://github.com/example/observed'}));
 const q={
  adapter:{sourceCommit:spec.commit,inputSchemaEvidence:'x',outputSchemaEvidence:'y',unitsFramesEvidence:'z'},
  supplyChain:{sourceCommit:spec.commit,lockDigest:'sha256',sbomEvidence:'x',cveReportEvidence:'x'},
  license:{compatibility:'REVIEWED_ACCEPTABLE',reviewEvidence:'x'},
  security:{sourceCommit:spec.commit,a20ReviewEvidence:'x',sandboxEvidence:'y'},
  execution:{sourceCommit:spec.commit,environment:'DISPOSABLE_NO_NETWORK',operatorAcknowledgementEvidence:'x',runEvidence:'y'},
  independentPhysics:{cases},
  review:{a15Evidence:'x',a23Evidence:'y',a18Evidence:'x',a24Evidence:'x',a20Evidence:'x',a21Evidence:'x'},
  reproducibility:{rollbackPlanEvidence:'x',repeatedRunEvidence:'x'}
 };
 const e=evaluateEvidence(spec,record,stage,q,p);
 assert.deepEqual(e.blockers,['EXACT_HEAD_AUTHENTICATED_SOFTWARE_APPROVAL_REQUIRED']);
 assert.equal(e.softwareQualified,false);
 assert.equal(e.agentToolRegistered,false);
 assert.equal(e.engineeringValidated,false);
 assert.equal(e.vesselReleased,false);
});
test('draft consists only of inactive adapter and independent TBD reference expectations',()=>{
 const pkg=createDraftPackage(spec,db,p);
 assert.equal(pkg.contract.permissions,'NONE');
 assert.equal(pkg.contract.executable,false);
 assert.equal(pkg.contract.inputSchema,'TBD');
 assert.equal(pkg.testPlan.cases.length,3);
 assert.ok(pkg.testPlan.cases.every(x=>String(x.independentExpected).startsWith('TBD')));
 assert.equal(pkg.testPlan.deriveExpectedFromCandidate,false);
 assert.equal(pkg.plan.toolRegistryModified,false);
 assert.equal(pkg.plan.approved,false);
 assert.equal(pkg.plan.policyId,p.policyId);
 assert.doesNotMatch(FAIL_CLOSED_PYTHON,/from python_vehicle_simulator|import numpy|importlib/);
});
test('Python adapter scaffold returns nonzero and does not execute third-party source',()=>{
 const python=spawnSync('python3',['-c',FAIL_CLOSED_PYTHON],{encoding:'utf8',timeout:5000,env:{PATH:process.env.PATH||'/usr/bin:/bin'}});
 if(python.error?.code==='ENOENT')return;
 assert.equal(python.status,78);
 assert.match(python.stderr,/not implemented or approved/);
});
test('CLI writes a controlled proposal package and rejects every execution command',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'usv01-a26-policy-'));
 try{
  await main(['prepare','--spec',manifest,'--out-dir',dir]);
  const out=JSON.parse(await readFile(path.join(dir,'governed-plan.json'),'utf8'));
  const contract=JSON.parse(await readFile(path.join(dir,'adapter-contract.json'),'utf8'));
  assert.equal(out.approved,false);
  assert.equal(out.disposition,'DRAFT_ONLY_NOT_EXECUTED_OR_QUALIFIED');
  assert.equal(contract.sourceCommit,spec.commit);
  for(const command of ['execute','install','approve','register','merge','release']){
   await assert.rejects(main([command,'--spec',manifest,'--out-dir',dir]),/only read-only prepare/);
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('weekly A26 preparation drafts only registered, source-pinned candidates',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'usv01-a26-weekly-'));
 try{
  await main(['prepare-all','--out-dir',dir]);
  const pkg=JSON.parse(await readFile(path.join(dir,'fossen-python-vehicle-simulator','governed-plan.json'),'utf8'));
  assert.equal(pkg.repository,'cybergalactic/PythonVehicleSimulator');
  assert.equal(pkg.disposition,'DRAFT_ONLY_NOT_EXECUTED_OR_QUALIFIED');
  assert.equal(pkg.approved,false);
  const py=await readFile(path.join(dir,'fossen-python-vehicle-simulator','unimplemented-adapter.py'),'utf8');
  assert.equal(py,FAIL_CLOSED_PYTHON);
  await assert.rejects(main(['prepare-all','--out-dir',dir,'--execute']),/prepare-all requires/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('canonical A26 role inherits charter restrictions without receiving external tool access',async()=>{
 const definitions=await readFile(fileURLToPath(new URL('../src/core/agents/definitions.ts',import.meta.url)),'utf8');
 const a26=definitions.slice(definitions.lastIndexOf('// 26. Global Navy USV'));
 assert.match(a26,/external-integration-policy\.json/);
 assert.match(a26,/EXTERNAL_INTEGRATION_AGENT_CHARTER\.md/);
 assert.match(a26,/A15\/A23/);
 assert.match(a26,/Never execute third-party software/);
 const granted=a26.match(/permittedTools: \[([^\]]+)\]/)?.[1]||'';
 assert.doesNotMatch(granted,/TOOL-EXT/);
 assert.match(a26,/executionPermissions: \['READ_ONLY', 'BASELINE_DRAFT'\]/);
});
