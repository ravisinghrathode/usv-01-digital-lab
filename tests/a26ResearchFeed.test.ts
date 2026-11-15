import {describe,it,expect} from 'vitest';
import {shapeResearchFeed} from '../src/server/a26ResearchFeed';

const meta={branch:'automation/a26-fleet-discovery-43666126420',revision:'a'.repeat(40)};
const fleet={schemaVersion:1,agentId:'INTEL-USV-26',classification:'PUBLIC_SOURCE_SAFE_ONLY',
  records:[{id:'lead-01',title:'USV reference',status:'DISCOVERED_UNVERIFIED',
    evidence:[{publicArticleUrl:'https://example.org/usv',entrySha256:'sha256:'+'a'.repeat(64)}]}]};
const documents={schemaVersion:1,agentId:'INTEL-USV-26',classification:'PUBLIC_SOURCE_SAFE_ONLY',
 reviewStatus:'UNVERIFIED_PUBLIC_DOCUMENTS',records:[{
  id:'paper-01',title:'Autonomous marine robotics',reviewStatus:'REVIEW_REQUIRED',
  doi:'https://doi.org/10.0000/example',fullTextPdfLink:'http://example.org/insecure.pdf'
 }]};

describe('A26 read-only Lab research feed',()=>{
 it('serves source-linked unverified documents and leads, never engineering authority',()=>{
   const r=shapeResearchFeed(fleet,documents,meta);
   expect(r.counts).toEqual({fleetLeads:1,publications:1});
   expect(r.engineeringReleaseApproved).toBe(false);
   expect(r.knowledgeGraphApproved).toBe(false);
   expect(r.leads[0].sources[0].url).toBe('https://example.org/usv');
   expect(r.publications[0].pdfUrl).toBe(null);
   expect(r.sourceRevision).toBe(meta.revision);
 });
 it('rejects unauthorized classification and unauthorized publication promotion',()=>{
   expect(()=>shapeResearchFeed({...fleet,classification:'RESTRICTED'},documents,meta))
     .toThrow('A26_UNTRUSTED_FLEET_REGISTER');
   expect(()=>shapeResearchFeed(fleet,{...documents,records:[{...documents.records[0],reviewStatus:'APPROVED'}]},meta))
     .toThrow('A26_UNTRUSTED_DOCUMENT_REGISTER');
 });
 it('rejects malformed source metadata and records outside review status',()=>{
   expect(()=>shapeResearchFeed({...fleet,records:[{...fleet.records[0],status:'CERTIFIED'}]},documents,meta))
     .toThrow('A26_UNTRUSTED_FLEET_REGISTER');
 });
});
