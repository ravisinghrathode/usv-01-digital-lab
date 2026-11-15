import test from 'node:test';
import assert from 'node:assert/strict';
import {fromFleetRegister,fromDocumentRegister,fromSnapshotIndex,consolidate,obsidianDraft} from '../../scripts/a26/unified-evidence.mjs';
const digest='sha256:'+'a'.repeat(64);
const fleet={schemaVersion:1,agentId:'INTEL-USV-26',classification:'PUBLIC_SOURCE_SAFE_ONLY',
 records:[{id:'A26-FLEET-1111111111111111',title:'DriX H-8 uncrewed surface vessel sea trial',status:'DISCOVERED_UNVERIFIED',firstSeenAt:'2026-11-15T00:00:00Z',
 evidence:[{publicArticleUrl:'https://example.org/fleet',entrySha256:digest,sourceId:'news'}]}]};
const docs={schemaVersion:1,agentId:'INTEL-USV-26',classification:'PUBLIC_SOURCE_SAFE_ONLY',reviewStatus:'UNVERIFIED_PUBLIC_DOCUMENTS',
 records:[{id:'A26-PAPER-W123',title:'Hydrodynamics of small USVs',doi:'https://doi.org/10.1234/example',reviewStatus:'REVIEW_REQUIRED',
 evidenceHash:digest,sourceVersions:[{hash:digest,observedAt:'2026-11-15T00:00:00Z'}]}]};
const snapshots={schemaVersion:1,report:{engineeringReleaseApproved:false},records:[{key:'exail:drixh8',model:'DriX H-8',country:'France',
 sources:[{id:'mfg',identityConfirmed:true,url:'https://example.org/usv',sha256:digest,contentType:'text/html',
 retrievedAt:'2026-11-15T00:00:00Z',claims:[{field:'length',value:'7.4 m',quotation:'DriX H-8 hull length 7.4 m'}]}]}]};
test('one intake preserves domain-specific records and candidate knowledge graph relation',()=>{
 const r=consolidate({fleet,documents:docs,snapshots});
 assert.deepEqual(r.statistics,{fleetLeads:1,knowledgeDocuments:1,usvSourceSnapshots:1,evidenceVersionConflicts:0});
 assert.equal(r.relations.length,1);
 assert.equal(r.relations[0].reviewStatus,'PENDING');
 assert.equal(r.records[2].claims[0].status,'QUOTE_MATCHED_UNREVIEWED');
 assert.equal(r.sourcesIndependentlyReviewed,0);
 assert.equal(r.engineeringReleaseApproved,false);
 assert.match(obsidianDraft(r.records[0]),/UNVERIFIED PUBLIC RESEARCH/);
});
test('requires research-only classification and refuses pre-approved documents',()=>{
 assert.throws(()=>fromFleetRegister({...fleet,classification:'SECRET'}),/CLASSIFICATION/);
 assert.throws(()=>fromDocumentRegister({...docs,records:[{...docs.records[0],reviewStatus:'APPROVED'}]}),/PROMOTION_FORBIDDEN/);
 assert.throws(()=>fromSnapshotIndex({...snapshots,report:{engineeringReleaseApproved:true}}),/SNAPSHOT_INDEX_INVALID/);
});
test('schema adapters accept PR123 report shape as well as persistent registers',()=>{
 const result=fromFleetRegister({...fleet,records:undefined,register:{records:fleet.records}});
 assert.equal(result.length,1);
 assert.equal(fromDocumentRegister(docs).length,1);
 assert.equal(fromSnapshotIndex(snapshots).length,1);
});
test('conflicting version hashes are not silently overridden',()=>{
 const a={...snapshots,records:[...snapshots.records,{...snapshots.records[0],
 sources:[{...snapshots.records[0].sources[0],sha256:'sha256:'+'b'.repeat(64)}]}]};
 const r=consolidate({snapshots:a});
 assert.equal(r.statistics.evidenceVersionConflicts,1);
 assert.equal(r.records.length,1);
});
