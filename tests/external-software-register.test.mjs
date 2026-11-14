import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateRegister,renderOverview,reconcileScout} from '../scripts/external-software-register.mjs';
const db=validateRegister(JSON.parse(await readFile(fileURLToPath(new URL('../src/data/externalSoftwareRegister.json',import.meta.url)),'utf8')));
const clone=x=>JSON.parse(JSON.stringify(x));
const candidate={name:'research/NewVesselTool',url:'https://github.com/research/NewVesselTool',description:'Example unreviewed research metadata',
  categories:['marine-simulation'],agentReviewers:['A08','A26'],licenseSpdx:'MIT',score:95};
test('curated catalog validates; Fossen is not approved, installed or project-used',()=>{
 assert.equal(db.records.length,4);
 const r=db.records[0];
 assert.equal(r.id,'EXT-001');
 assert.equal(r.lifecycle,'EVALUATING');
 assert.equal(r.adoption,'NOT_APPROVED');
 assert.equal(r.installation,'NOT_INSTALLED');
 assert.equal(r.registeredToolId,null);
 assert.equal(r.actualUsage.length,0);
 assert.equal(r.plannedUsage[0].project,'USV-01');
});
test('overview reports planned use separately from actual execution',()=>{
 const s=renderOverview(db);
 assert.match(s,/4 tracked/);
 assert.match(s,/0 evidenced usage events/);
 assert.match(s,/EXT-001/);
 assert.match(s,/zero evidenced uses/);
 assert.doesNotMatch(s,/100% qualified/);
});
test('reject fake approval without independent evidence',()=>{
 const x=clone(db);x.records[0].adoption='APPROVED';
 assert.throws(()=>validateRegister(x),/claimed approval/);
});
test('reject unapproved tool registry activation',()=>{
 const x=clone(db);x.records[0].registeredToolId='TOOL-EXT-FOSSEN';
 assert.throws(()=>validateRegister(x),/executable registry ID/);
});
test('reject actual use lacking full source and evidence chain',()=>{
 const x=clone(db);
 x.records[0].actualUsage=[{kind:'SANDBOX_EVALUATION',project:'USV-01',agent:'A08',sourceCommit:'master'}];
 assert.throws(()=>validateRegister(x),/actual usage lacks/);
});
test('reject project engineering use without Director acceptance',()=>{
 const x=clone(db);x.records[0].actualUsage=[{kind:'ENGINEERING_BASELINE',project:'USV-01',agent:'A08',
   sourceCommit:db.records[0].source.commit,executionEvidence:'https://github.com/example/evidence'}];
 assert.throws(()=>validateRegister(x),/baseline usage not approved/);
});
test('Scout only proposes new discoveries; never changes existing qualification',()=>{
 const report={provider:'GITHUB_PUBLIC_REPOSITORY_SEARCH',generatedAt:'2026-11-14T00:00:00Z',candidates:[
   candidate,{...candidate,name:db.records[0].repository,url:db.records[0].repositoryUrl},
   candidate]};
 const {proposed,newCount}=reconcileScout(db,report);
 assert.equal(newCount,1);
 assert.equal(db.records.length,4);
 assert.equal(proposed.records.length,5);
 const fresh=proposed.records.find(r=>r.repository==='research/NewVesselTool');
 assert.equal(fresh.lifecycle,'DISCOVERED');
 assert.equal(fresh.source.commit,null);
 assert.equal(fresh.adoption,'NOT_APPROVED');
 assert.equal(fresh.installation,'NOT_INSTALLED');
 assert.equal(fresh.actualUsage.length,0);
 assert.equal(proposed.records.find(r=>r.id==='EXT-001').source.tree,db.records[0].source.tree);
});
test('reject fixture reports and malformed/duplicate upstream metadata',()=>{
 assert.throws(()=>reconcileScout(db,{provider:'OFFLINE_TEST_FIXTURE',candidates:[candidate]}),/invalid\/fixture/);
 const x=clone(db);x.records.push({...x.records[0],id:'EXT-005'});
 assert.throws(()=>validateRegister(x),/duplicate upstream/);
 const r=reconcileScout(db,{provider:'OFFLINE_TEST_FIXTURE',candidates:[candidate]},{allowFixture:true});
 assert.equal(r.newCount,1);
});

test('sandbox evaluation needs pinned local runner and proof hash',()=>{
 const x=clone(db);
 x.records[0].actualUsage=[{
   kind:'SANDBOX_EVALUATION',project:'USV-01',agent:'A26',
   sourceCommit:x.records[0].source.commit,
   executionEvidence:'https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/12345'
 }];
 assert.throws(()=>validateRegister(x),/unverified sandbox evidence provenance/);
});
test('unapproved external software never claims an operational agent-tool invocation',()=>{
 const x=clone(db);
 x.records[0].actualUsage=[{
   kind:'AGENT_TOOL_INVOCATION',project:'USV-01',agent:'A08',
   sourceCommit:x.records[0].source.commit,
   executionEvidence:'https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/12345',
   runtimeEvidence:'https://github.com/ravisinghrathode/usv-01-digital-lab/pull/92',
   invocationId:'FAKE-001'
 }];
 assert.throws(()=>validateRegister(x),/agent invocation needs approved runtime evidence/);
});
