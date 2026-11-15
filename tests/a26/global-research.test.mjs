import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { canonicalKey, deduplicateCandidates, verifyClaim, normalizeText,
  retrieveSource, extractDiscoveryLinks, collect } from '../../scripts/a26/global-research.mjs';
test('canonical deduplication and aliases preserve independent URLs',()=>{
 const out=deduplicateCandidates([
 {model:'DriX H-8',manufacturer:'Exail',country:'France',sources:[{url:'https://www.exail.com/a'}]},
 {model:'DriX H8',manufacturer:'Exail',country:'France',sources:[{url:'https://www.exail.com/b'}]}]);
 assert.equal(out.length,1);
 assert.equal(out[0].sources.length,2);
 assert.equal(canonicalKey({manufacturer:'Exail',model:'DriX H8'}),'exail:drixh8');
});
test('claims are rejected without exact quotation in fetched source',()=>{
 const source={id:'s',url:'https://example.org/test',sha256:'sha256:abc',retrievedAt:'2026-11-15T00:00:00Z'};
 assert.equal(verifyClaim('Speed 12 knots',{field:'speed',value:'90 knots',quote:'Speed 90 knots'},source),null);
 assert.equal(verifyClaim('Speed 12 knots',{field:'speed',value:'12 knots',quote:'Speed 12 knots'},source),null); // quote too short
 assert.equal(verifyClaim('Length of the vessel is 7.4 metres',{field:'length',value:'7.4 metres',quote:'Length of the vessel is 7.4 metres'},source).field,'length');
});
test('discovery stays inside source hostname and excludes insecure links',()=>{
 const links=extractDiscoveryLinks('<a href="/product/usv-a">A</a><a href="https://evil.example/usv">bad</a><a href="http://example.org/usv">http</a><a href="/product/usv-a">dup</a>', 'https://example.org/catalog');
 assert.deepEqual(links,['https://example.org/product/usv-a']);
});
test('robots disallow and redirect fail closed',async()=>{
 const fetcher=async url=>{
   if(String(url).endsWith('/robots.txt')) return new Response('User-agent: *\nDisallow: /private',{status:200});
   return new Response('Should not fetch',{status:200,headers:{'content-type':'text/html'}});
 };
 await assert.rejects(retrieveSource({id:'blocked',url:'https://example.org/private/usv'},{fetcher}),/ROBOTS_DISALLOWED/);
 const redirect=async url=>String(url).endsWith('/robots.txt')?new Response('',{status:404}):
    new Response(null,{status:302,headers:{location:'https://other.example/usv'}});
 await assert.rejects(retrieveSource({id:'redirect',url:'https://example.org/usv'},{fetcher:redirect}),/REDIRECT_REQUIRES_REVIEW/);
});
test('source snapshot contains SHA, evidence quotation, and no engineering approval',async()=>{
 const d=await mkdtemp(path.join(os.tmpdir(),'a26-e2e-'));
 try{
   const seeds=[{id:'x',model:'Bluebottle',manufacturer:'Ocius',country:'Australia',
      sources:[{id:'s',url:'https://example.org/usv/bluebottle',
        claims:[{field:'length',value:'7.4 metres',quote:'The Bluebottle hull length is 7.4 metres'}]}]}];
   const registry=path.join(d,'seeds.json');await writeFile(registry,JSON.stringify(seeds));
   const fetcher=async url=>String(url).endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /',{status:200}):
      new Response('<html><body>Bluebottle. The Bluebottle hull length is 7.4 metres.</body></html>',{status:200,headers:{'content-type':'text/html'}});
   const report=await collect({registryPath:registry,outputDir:path.join(d,'out'),fetcher,delayMs:0});
   assert.equal(report.totalCandidateModels,1);
   assert.equal(report.countriesRepresented,1);
   assert.equal(report.identityCorroborated,1);
   assert.equal(report.fieldEvidenceItems,1);
   assert.equal(report.independentlyValidated,0);
   assert.equal(report.engineeringReleaseApproved,false);
   const index=JSON.parse(await readFile(path.join(d,'out','evidence-index.json'),'utf8'));
   assert.match(index.records[0].sources[0].sha256,/^sha256:[a-f0-9]{64}$/);
   assert.equal(index.records[0].fields.length[0].sourceId,'s');
   assert.equal(index.records[0].sources[0].evidenceStatus,'SOURCE_IDENTITY_CORROBORATED_UNREVIEWED');
   const second=await collect({registryPath:registry,outputDir:path.join(d,'out'),fetcher:async()=>{throw Error('network must not be called on recent cache');},delayMs:0});
   assert.equal(second.totalCandidateModels,1);
 }finally{await rm(d,{recursive:true,force:true});}
});
test('source retrieval cannot access localhost or raw network addresses',async()=>{
 await assert.rejects(retrieveSource({id:'a',url:'https://127.0.0.1/usv'}),/PUBLIC_HTTPS_HOST_REQUIRED/);
 await assert.rejects(retrieveSource({id:'a',url:'http://example.org/usv'}),/PUBLIC_HTTPS_HOST_REQUIRED/);
});
