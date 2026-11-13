import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlanArgs, planInvestigations } from '../scripts/repository-integration-planner.mjs';
const sha='b'.repeat(40);
const tree='c'.repeat(40);
const report={provider:'OFFLINE_TEST_FIXTURE',generatedAt:'2026-11-14T00:00:00Z',candidates:[{name:'marine/solver',url:'https://github.com/marine/solver',score:88,agentReviewers:['A07','A15']},{name:'marine/solver',url:'https://github.com/marine/solver',score:88,agentReviewers:['A07']}]};
test('validates mandatory input and investigation bound',()=>{
  assert.throws(()=>parsePlanArgs([]));
  assert.throws(()=>parsePlanArgs(['--scout-report','x','--limit','100']));
  assert.equal(parsePlanArgs(['--scout-report','x','--limit','2']).limit,2);
});
test('plans a unique source-pinned investigation without granting adoption',async()=>{
  const calls=[];
  const fetchImpl=async url=>{calls.push(url);return {ok:true,json:async()=>url.endsWith('/main')?{sha,commit:{tree:{sha:tree}}}:{full_name:'marine/solver',default_branch:'main',license:{spdx_id:'MIT'},private:false,archived:false,disabled:false}}};
  const q=await planInvestigations(report,{limit:5,fetchImpl,now:'2026-11-14T00:00:00Z'});
  assert.equal(q.records.length,1);
  assert.equal(q.records[0].pinnedCommit,sha);
  assert.equal(q.records[0].pinnedTree,tree);
  assert.equal(q.records[0].missing.independentReferenceCases,'TBD');
  assert.equal(q.records[0].approved,false);
  assert.equal(q.toolRegistered,false);
  assert.ok(q.records[0].assignedAgents.includes('A23'));
  assert.equal(calls.length,2);
});
test('rejects forged report URLs and sources without matching identity',async()=>{
  const forged={...report,candidates:[{...report.candidates[0],url:'https://evil.invalid/repo'}]};
  await assert.rejects(planInvestigations(forged,{fetchImpl:async()=>({ok:true,json:async()=>({})})}),/No valid/);
  await assert.rejects(planInvestigations(report,{fetchImpl:async()=>({ok:true,json:async()=>({private:true,full_name:'marine/solver'})})}),/No candidate revision/);
});