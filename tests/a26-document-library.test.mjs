import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {
  validateDocumentConfig,openAlexUrl,mapScholarlyWork,
  collectDocuments,archiveOpenLicensePdfs
} from '../scripts/a26-document-library.mjs';
const config=validateDocumentConfig(JSON.parse(await readFile(fileURLToPath(
  new URL('../config/a26-document-research.json',import.meta.url)),'utf8')));
const first=config.queries[0];
const work={
  id:'https://openalex.org/W1234567',
  display_name:'Autonomous Surface Vessel Hull Model and Sea Trials',
  doi:'https://doi.org/10.1234/fake',
  publication_date:'2026-01-14',
  type:'article',
  authorships:[{author:{display_name:'Public Scientist'}}],
  best_oa_location:{
    pdf_url:'https://arxiv.org/pdf/2601.01234',
    landing_page_url:'https://arxiv.org/abs/2601.01234',
    license:'cc-by'
  },
  open_access:{is_oa:true}
};
test('all configured public technical searches have bounds and no model credential',()=>{
  assert.equal(config.queries.length,18);
  assert.match(openAlexUrl(first,25),/^https:\/\/api.openalex.org\/works\?/);
  assert.throws(()=>validateDocumentConfig({...config,maxDownloads:100}));
});
test('extract publisher, DOI, provenance and license metadata without claiming validation',()=>{
  const result=mapScholarlyWork(work,first,'2026-11-15T00:00:00Z');
  assert.equal(result.id,'A26-PAPER-W1234567');
  assert.equal(result.documentStatus,'PUBLIC_METADATA_UNVERIFIED');
  assert.equal(result.openAccessStatus,'INDEXED_OPEN_ACCESS');
  assert.equal(result.archiveEligible,true);
  assert.equal(result.authors[0],'Public Scientist');
  assert.match(result.evidenceHash,/^sha256:/);
});
test('reject unsafe fulltext target or unlicensed article from automatic byte download',()=>{
  assert.equal(mapScholarlyWork({...work,id:'https://openalex.org/W1234568',
    best_oa_location:{...work.best_oa_location,license:null}},first,'2026-11-15T00:00:00Z').archiveEligible,false);
  assert.equal(mapScholarlyWork({...work,id:'https://openalex.org/W1234569',
    best_oa_location:{...work.best_oa_location,
      pdf_url:'https://127.0.0.1/secrets.pdf'}},first,'2026-11-15T00:00:00Z').archiveEligible,false);
  assert.equal(mapScholarlyWork({...work,id:'https://openalex.org/W1234570',
    best_oa_location:{...work.best_oa_location,
      pdf_url:'https://attacker.example/anything.pdf'}},first,'2026-11-15T00:00:00Z').archiveEligible,false);
});
test('deduplicate scholarly work identifiers across multiple related global searches',async()=>{
  const fixture=Object.fromEntries(config.queries.map(q=>[q,{results:[work]}]));
  const result=await collectDocuments({config,fixture,now:'2026-11-15T00:00:00Z'});
  assert.equal(result.records.length,1);
  assert.equal(result.queriesSucceeded,18);
  assert.equal(result.records[0].researchTerms.length,18);
  assert.equal(result.filesDownloaded,0);
  assert.equal(result.engineeringReleaseApproved,false);
});
test('bounded open-licensed PDFs receive content hashes, opaque filenames and no execution',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'a26-doc-'));
  try{
    let calls=0;
    const fixture=Object.fromEntries(config.queries.map(q=>[q,{results:[work]}]));
    const result=await collectDocuments({config,fixture});
    const receipts=await archiveOpenLicensePdfs(result,{dir,limit:1,fetchImpl:async(_url,options)=>{
      calls++;assert.equal(options.redirect,'error');
      assert.ok(!JSON.stringify(options).includes('Authorization'));
      return new Response(Buffer.from('%PDF-1.7\n% public sample\n'),{
        status:200,headers:{'content-type':'application/pdf'}});
    }});
    assert.equal(calls,1);
    assert.equal(receipts.length,1);
    assert.match(receipts[0].sha256,/^sha256:/);
    assert.equal((await readdir(dir)).length,1);
    assert.equal(receipts[0].status,'BYTES_RETRIEVED_UNVERIFIED_LICENSE_AND_CONTENT');
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('no PDF archive when source URL or open license metadata is missing',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'a26-no-pdf-'));
  try{
    const x=mapScholarlyWork({...work,best_oa_location:{...work.best_oa_location,
      license:null}},first,new Date().toISOString());
    const receipts=await archiveOpenLicensePdfs({records:[x]},{
      dir,limit:1,fetchImpl:()=>{throw Error('Should not fetch unlicensed paper');}});
    assert.equal(receipts.length,0);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('source API failures remain explicit and do not fabricate documents',async()=>{
  const result=await collectDocuments({config,
    fetchImpl:async()=>{throw Error('HTTP_429');}});
  assert.equal(result.records.length,0);
  assert.equal(result.queriesSucceeded,0);
  assert.equal(result.receipts.length,config.queries.length);
  assert.ok(result.receipts.every(x=>x.status==='FAILED'));
});
