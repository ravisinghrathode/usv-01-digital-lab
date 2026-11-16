import {afterEach,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {CandidateLedger} from '../src/core/digital-thread/CandidateLedger.ts';
import {recordUnverifiedDesignLoop} from '../src/core/digital-thread/DesignLoopLedgerBridge.ts';
import type {DesignLoopReport} from '../src/core/optimizer/AgentDesignLoop.ts';
const dirs:string[]=[];
afterEach(async()=>{await Promise.all(dirs.splice(0).map(d=>rm(d,{recursive:true,force:true})))});
const source='a'.repeat(40);
function example(runId:string):DesignLoopReport{
  const rev=(index:number,geometry:number)=>({
    index,screened:{
      parameters:{lwlMeters:geometry,beamMeters:2},conceptTopology:'MONOHULL',
      inputDigest:'sha256:'+createHash('sha256').update(
        JSON.stringify({lwlMeters:geometry,beamMeters:2})).digest('hex'),
      sourceKind:'MODEL_PROPOSAL_UNVERIFIED',
      unverifiedMetricProvenance:{},missingEngineeringInputs:['mass and CG'],
      screenResults:[],solverEvaluations:[]
    },critique:{findings:['Revise source assumptions'],openTbdItems:['CG unknown'],
      unverifiedRecommendations:['Do not release']},
    proposalAgent:'LEAD-SYS-01',critiqueAgent:'INDEP-REV-15',
    proposalTrace:{status:'UNVERIFIED',provider:'codex_cli',executionMode:'LIVE_AI_GENERATION',outputDigest:'digest'},
    critiqueTrace:{status:'UNVERIFIED',provider:'codex_cli',executionMode:'LIVE_AI_GENERATION',outputDigest:'digest'},
    specialistReviews:[]
  });
  return {
    runId,sourceCommit:source,revisions:[rev(0,10),rev(1,11),rev(2,12)],
    comparison:{approvedDesignSelected:false},independentEngineeringValidated:false,
    detailedDesignAuthorized:false,engineeringReleaseAuthorized:false
  } as unknown as DesignLoopReport;
}
async function ledger(){
 const dir=await mkdtemp(path.join(os.tmpdir(),'usv-loop-ledger-'));
 dirs.push(dir);
 return new CandidateLedger(path.join(dir,'journal.json'));
}
const options=(candidateId:string)=>({
 candidateId,missionId:'MISSION-01',configurationId:'CFG-01',expectedSourceSha:source,
 classification:'RESTRICTED_METADATA_ONLY' as const
});
describe('M03 design-loop bridge is research-only and source-pinned',()=>{
 it('records two candidate histories with two revisions each and reproducible replay',async()=>{
   const store=await ledger();
   const a=await recordUnverifiedDesignLoop(example('RUN-A'),store,options('CAND-A'));
   const b=await recordUnverifiedDesignLoop(example('RUN-B'),store,options('CAND-B'));
   expect(a.recordedRevisions).toBe(3);
   expect(b.recordedRevisions).toBe(3);
   expect((await store.readEvents())).toHaveLength(6);
   expect((await recordUnverifiedDesignLoop(example('RUN-A'),store,options('CAND-A'))).lastEventHash)
     .toBe(a.lastEventHash);
   const s=await store.readAll();
   expect(s).toHaveLength(2);
   for(const c of s){
     expect(c.revisionCount).toBe(3);
     expect(c.domainStates.HYDROSTATICS).toBe('BLOCKED');
     expect(c.domainStates.MASS_CG).toBe('NOT_RUN');
     expect(c.engineeringReleaseApproved).toBe(false);
   }
 });
 it('blocks false release claims, stale report, missing critique and no-change revisions',async()=>{
   const store=await ledger();
   const rpt=example('RUN-C');
   await expect(recordUnverifiedDesignLoop(rpt,store,{...options('CAND-C'),
     expectedSourceSha:'b'.repeat(40)})).rejects.toThrow(/SOURCE_MISMATCH/);
   const forgedRelease={...rpt,engineeringReleaseAuthorized:true} as unknown as DesignLoopReport;
   await expect(recordUnverifiedDesignLoop(forgedRelease,store,options('CAND-C')))
     .rejects.toThrow(/RELEASE_REFUSED/);
   const unchanged=example('RUN-D');
   unchanged.revisions[1].screened.parameters.lwlMeters=10;
   unchanged.revisions[1].screened.inputDigest=unchanged.revisions[0].screened.inputDigest;
   await expect(recordUnverifiedDesignLoop(unchanged,store,options('CAND-D')))
     .rejects.toThrow(/NO_ACTUAL_PROPOSAL_CHANGE/);
   const inconsistent=example('RUN-BAD-DIGEST');
   inconsistent.revisions[1].screened.inputDigest='sha256:'+'b'.repeat(64);
   await expect(recordUnverifiedDesignLoop(inconsistent,store,options('CAND-BAD')))
     .rejects.toThrow(/REPORT_INPUT_DIGEST_MISMATCH/);
   const noCritique=example('RUN-E');
   noCritique.revisions[0].critique.findings=[];
   noCritique.revisions[0].critique.openTbdItems=[];
   await expect(recordUnverifiedDesignLoop(noCritique,store,options('CAND-E')))
     .rejects.toThrow(/PREVIOUS_AGENT_CRITIQUE_MISSING/);
   // Invalid later proposals cannot create even a partial candidate history.
   const snapshots=await store.readAll();
   expect(snapshots).toHaveLength(0);
 });
 it('rejects concept topology switch and non-finite model numbers',async()=>{
   const store=await ledger();
   const mixed=example('RUN-MIXED');
   mixed.revisions[1].screened.conceptTopology='CATAMARAN';
   await expect(recordUnverifiedDesignLoop(mixed,store,options('CAND-MIXED')))
     .rejects.toThrow(/TOPOLOGY_OR_SEQUENCE_CHANGED/);
   const invalid=example('RUN-INVALID');
   invalid.revisions[0].screened.parameters.lwlMeters=NaN;
   await expect(recordUnverifiedDesignLoop(invalid,store,options('CAND-INVALID')))
     .rejects.toThrow(/INVALID_MODEL_NUMBER/);
 });
});
