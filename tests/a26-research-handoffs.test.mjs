import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeHandoffs,handoffMarkdown} from '../scripts/a26-research-handoffs.mjs';
const fleet={agentId:'INTEL-USV-26',register:{records:[
 {id:'A26-FLEET-'+'a'.repeat(16),title:'Prototype autonomous vessel battery propulsion sea trials',
  summary:'Public article only',evidence:[{publicArticleUrl:'https://www.navalnews.com/a'}]},
 {id:'A26-FLEET-'+'b'.repeat(16),title:'Unmanned surface vessel structural composite hull',
  summary:'Trade press prototype',evidence:[{publicArticleUrl:'https://news.usni.org/b'}]}
]}};
const documents={agentId:'INTEL-USV-26',records:[
 {id:'A26-PAPER-W123',title:'Hydrodynamic resistance of unmanned surface vessels',
  researchTerms:['USV seakeeping'],doi:'https://doi.org/10.1234/fake',
  sourceUrl:'https://openalex.org/W123'}
]};
test('A26 proposes bounded, source-linked, unverified discipline review questions',()=>{
 const triage=proposeHandoffs({fleet,documents});
 assert.ok(triage.proposals.length>=3);
 assert.ok(triage.proposals.some(p=>p.discipline==='HYDRODYNAMICS'));
 assert.ok(triage.proposals.some(p=>p.discipline==='POWER_AND_PROPULSION'));
 assert.ok(triage.proposals.every(p=>p.state==='UNVERIFIED_RESEARCH_HANDOFF'));
 assert.ok(triage.proposals.every(p=>p.humanReviewRequired===true));
 assert.ok(triage.proposals.every(p=>p.autonomousBaselineAdoption===false));
 assert.equal(triage.downstreamAgentsExecuted,0);
 assert.equal(triage.engineeringConclusionsVerified,0);
 assert.equal(triage.engineeringReleaseApproved,false);
 assert.match(handoffMarkdown(triage),/NOT design decisions/);
});
test('unknown source or out-of-bounds workload fails closed',()=>{
 assert.throws(()=>proposeHandoffs({fleet:{},documents}));
 assert.throws(()=>proposeHandoffs({fleet,documents,limit:2000}));
 assert.throws(()=>proposeHandoffs({fleet,documents,maxPerSource:999}));
});
