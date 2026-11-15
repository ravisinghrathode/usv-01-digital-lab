import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {campaign} from '../scripts/a26-fleet-campaign.mjs';
import {sourcePlan} from '../scripts/a26-fleet-discovery.mjs';
import {emptyDocumentRegister,mergeDocumentSources,
  validateDocumentRegister,documentMarkdown} from '../scripts/a26-document-register.mjs';
const config=JSON.parse(await readFile(fileURLToPath(
  new URL('../config/a26-fleet-discovery.json',import.meta.url)),'utf8'));
const sample='<rss><channel><item>'+
  '<title>Prototype autonomous surface vessel sea trial</title>'+
  '<link>https://news.usni.org/public-test</link>'+
  '<description>USV research vessel</description></item></channel></rss>';
test('63 global news and research searches are covered in every campaign',async()=>{
  const plan=sourcePlan(config);
  assert.equal(plan.length,63);
  const fixtures=Object.fromEntries(plan.map(p=>[p.id,sample]));
  const result=await campaign({config,fixtures,batchSize:24,maxBatches:4,
    now:'2026-11-15T00:00:00Z'});
  assert.equal(result.sourcesAttempted,63);
  assert.equal(result.sourcesSucceeded,63);
  assert.equal(result.campaignBatches.length,3);
  assert.equal(result.newResearchLeads,1);
  assert.equal(result.register.records.length,1);
  assert.equal(result.globalCoverageComplete,false);
  assert.equal(result.fleetModelsIndependentlyVerified,0);
  assert.equal(result.engineeringReleaseApproved,false);
});
test('repeated public campaign does not accumulate identical evidence',async()=>{
  const plan=sourcePlan(config);
  const fixtures=Object.fromEntries(plan.map(p=>[p.id,sample]));
  const first=await campaign({config,fixtures,batchSize:24,maxBatches:4,
    now:'2026-11-15T00:00:00Z'});
  const second=await campaign({config,baseline:first.register,fixtures,
    batchSize:24,maxBatches:4,now:'2026-11-16T00:00:00Z'});
  assert.equal(second.newResearchLeads,0);
  assert.equal(second.additionalArticleEvidence,0);
  assert.deepEqual(second.register,first.register);
});
test('partial outages are visible and do not certify global discovery',async()=>{
  const result=await campaign({config,fixtures:{'naval-news':sample},batchSize:24,
    maxBatches:4,now:'2026-11-15T00:00:00Z'});
  assert.equal(result.sourcesSucceeded,1);
  assert.equal(result.sourcesFailed,62);
  assert.equal(result.globalCoverageComplete,false);
  assert.equal(result.register.records.length,1);
});
test('document metadata merges with durable review gate and pins changed evidence',()=>{
  const initial=emptyDocumentRegister();
  const harvest={agentId:'INTEL-USV-26',status:'DOCUMENT_METADATA_UNVERIFIED',
    retrievedAt:'2026-11-15T00:00:00Z',records:[{
      id:'A26-PAPER-W1234',openAlexId:'https://openalex.org/W1234',
      title:'Public USV paper',researchTerms:['autonomous surface vessel'],
      evidenceHash:'sha256:'+'a'.repeat(64),documentStatus:'PUBLIC_METADATA_UNVERIFIED',
      fullTextPdfLink:null,openLicenseMetadata:'UNKNOWN'
    }]};
  const first=mergeDocumentSources(initial,harvest);
  assert.equal(first.discovered,1);
  assert.equal(first.register.records[0].reviewStatus,'REVIEW_REQUIRED');
  assert.equal(first.register.records[0].sourceVersions.length,1);
  const again=mergeDocumentSources(first.register,harvest);
  assert.equal(again.discovered,0);
  assert.deepEqual(again.register,first.register);
  const revised=mergeDocumentSources(again.register,{
    ...harvest,retrievedAt:'2026-11-16T00:00:00Z',
    records:[{...harvest.records[0],evidenceHash:'sha256:'+'b'.repeat(64)}]
  });
  assert.equal(revised.changed,1);
  assert.equal(revised.register.records[0].sourceVersions.length,2);
  assert.equal(revised.register.records[0].pendingMetadataChange.reviewStatus,'CONFLICT_REVIEW_REQUIRED');
  assert.match(documentMarkdown(revised.register),/UNVERIFIED/);
  assert.equal(validateDocumentRegister(revised.register),revised.register);
});
test('document register refuses fabricated engineering approval',()=>{
  const bad=emptyDocumentRegister();
  bad.records.push({id:'A26-PAPER-W1',reviewStatus:'APPROVED',sourceVersions:[]});
  assert.throws(()=>validateDocumentRegister(bad));
});
