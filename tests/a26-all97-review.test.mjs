import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeQueue,validateQueue,scanSources,summarizeScan,renderScanMarkdown,QUEUE_FILE} from '../scripts/a26-all97-review.mjs';
import {REGISTER_FILE} from '../scripts/external-software-register.mjs';
const db=JSON.parse(await readFile(REGISTER_FILE,'utf8'));
const queue=JSON.parse(await readFile(QUEUE_FILE,'utf8'));
const clone=x=>structuredClone(x);
test('all 97 registered sources have individual evidence holds and no authority',()=>{
 const s=validateQueue(queue,db);
 assert.deepEqual(s,{records:97,hold:97,pinsMissing:0,metadataUnknown:44,priorDetailedAudits:8});
 assert.deepEqual(queue,makeQueue(db));
 for(const r of queue.entries){
  assert.equal(r.disposition,'HOLD_NOT_QUALIFIED');
  assert.equal(r.gates.A20,'PENDING_SBOM_CVE_SUPPLY_CHAIN_AND_SECURITY');
  assert.equal(r.gates.A21,'PENDING_INTERFACE_IO_AUTHENTICATION_AND_DATA_BOUNDARY');
  assert.equal(r.gates.A04_A23,'PENDING_ARCHITECTURE_FIT_AND_INDEPENDENT_REVIEW');
  assert.equal(r.gates.humanLegal,'PENDING_LICENSE_COMPATIBILITY_REVIEW');
  assert.equal(r.agentExecutionAuthorized,false);
  assert.equal(r.vesselReleaseAuthorized,false);
 }
});
test('reject omitted, substituted, duplicated and falsely approved audit records',()=>{
 for(const mutate of [
  x=>x.entries.pop(),
  x=>x.entries[1].id=x.entries[0].id,
  x=>x.entries[0].sourceCommit='a'.repeat(40),
  x=>x.entries[0].gates.A20='APPROVED',
  x=>x.entries[0].agentExecutionAuthorized=true,
  x=>x.entries[0].disposition='QUALIFIED'
 ]){
  const altered=clone(queue);mutate(altered);
  assert.throws(()=>validateQueue(altered,db),/queue differs|Repeated repository/);
 }
});
test('all 97 entries are source pinned, while missing root license remains legal HOLD',()=>{
 assert.equal(queue.entries.filter(x=>!x.sourceCommit||!x.sourceTree).length,0);
 assert.equal(queue.entries.find(x=>x.id==='EXT-002').sourceCommit,'47106de10b73e6a6c764c23d6b3919779b40721a');
 assert.equal(queue.entries.find(x=>x.id==='EXT-003').licenseMetadata,'UNKNOWN');
 assert.equal(queue.entries.find(x=>x.id==='EXT-003').disposition,'HOLD_NOT_QUALIFIED');
 assert.equal(queue.entries.find(x=>x.id==='EXT-004').sourceTree,'37ecc9bb23fc22c72006227ec808ac76338d5211');
});
test('verified source and root license blob are static evidence, not qualification',async()=>{
 const entry=queue.entries[0];const sha=entry.sourceCommit,tree=entry.sourceTree;
 const calls=[];
 const mock=async (url,opts)=>{
  calls.push({url,method:opts.method});
  if(url.endsWith('/git/commits/'+sha))return Response.json({sha,tree:{sha:tree}});
  if(url.endsWith('/git/trees/'+tree))return Response.json({sha:tree,tree:[
   {type:'blob',path:'LICENSE',sha:'d'.repeat(40)},
   {type:'blob',path:'requirements.txt',sha:'b'.repeat(40)}
  ]});
  return Response.json({message:'missing'},{status:404});
 };
 const result=(await scanSources([entry],{fetchImpl:mock,concurrency:1}))[0];
 assert.equal(result.source.status,'PIN_AND_TREE_VERIFIED_STATIC_ONLY');
 assert.equal(result.root.status,'ROOT_LICENSE_BLOBS_LISTED_NOT_LEGAL_REVIEWED');
 assert.deepEqual(result.root.manifestPaths,['requirements.txt']);
 assert.equal(result.qualification,'HOLD_NOT_QUALIFIED');
 assert.equal(result.softwareAdoptionApproved,false);
 assert.ok(calls.every(x=>x.method==='GET'&&x.url.startsWith('https://api.github.com/repos/')));
 const summary=summarizeScan([result]); assert.equal(summary.pinnedVerified,1);
 assert.match(renderScanMarkdown({registerId:'test',registerSha256:'d'.repeat(64),generatedAt:'2026-11-17',entries:[result],summary}),/HOLD_NOT_QUALIFIED/);
});
test('tree mismatch, missing pins and missing upstream leave permanent holds',async()=>{
 const entry=queue.entries[0];
 const denied=async()=>Response.json({message:'not found'},{status:404});
 const a=(await scanSources([entry],{fetchImpl:denied}))[0];
 assert.equal(a.source.status,'HOLD_UPSTREAM_COMMIT_UNAVAILABLE');
 assert.equal(a.root.status,'ROOT_NOT_INSPECTED');
 const wrong=async()=>Response.json({sha:entry.sourceCommit,tree:{sha:'f'.repeat(40)}});
 const b=(await scanSources([entry],{fetchImpl:wrong}))[0];
 assert.equal(b.source.status,'HOLD_COMMIT_OR_TREE_MISMATCH');
 const unpinned={...queue.entries[2],sourceCommit:null,sourceTree:null};
 assert.ok(unpinned);
 const mock=async url=>{
  if(url.endsWith('/git/trees/'+'c'.repeat(40)))return Response.json({sha:'c'.repeat(40),tree:[]});
  if(url.endsWith('/commits/main'))return Response.json({sha:'b'.repeat(40),commit:{tree:{sha:'c'.repeat(40)}}});
  return Response.json({default_branch:'main',private:false});
 };
 const c=(await scanSources([unpinned],{fetchImpl:mock}))[0];
 assert.equal(c.source.status,'HOLD_MISSING_CANONICAL_PIN');
 assert.equal(c.source.proposedCurrentCommit,'b'.repeat(40));
 assert.equal(c.softwareAdoptionApproved,false);
});
