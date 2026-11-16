/**
 * Opt-in bridge from actual A01/A15 research design loop to the M03 ledger.
 * Records only hashes of untrusted model proposals/critiques, never geometry
 * as released engineering data. No live model, tool or approval is invoked.
 */
import type { DesignLoopReport, DesignRevision } from '../optimizer/AgentDesignLoop.ts';
import { createHash } from 'node:crypto';
import {
  CandidateLedger, sha256,
  type CandidateEvent, type Classification, type Sha256
} from './CandidateLedger.ts';

const SHA=/^[a-f0-9]{40}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/;
const topology=(value:string): 'MONOHULL'|'CATAMARAN'|'TRIMARAN'|'OTHER' => {
  if (value === 'MONOHULL' || value === 'CATAMARAN' ||
      value === 'TRIMARAN' || value === 'OTHER') return value;
  throw new Error('M03_CONCEPT_TOPOLOGY_NOT_DECLARED');
};
function screenedDigest(rev:DesignRevision,sourceSha:string):Sha256 {
  if (rev.screened.sourceKind!=='MODEL_PROPOSAL_UNVERIFIED' ||
      !rev.screened.inputDigest || !rev.screened.parameters ||
      typeof rev.screened.parameters!=='object') {
    throw new Error('M03_UNVERIFIED_PROPOSAL_MISSING');
  }
  if(Object.values(rev.screened.parameters).some(n=>typeof n!=='number'||!Number.isFinite(n)))
    throw new Error('M03_INVALID_MODEL_NUMBER');
  const originalDigest='sha256:'+createHash('sha256')
    .update(JSON.stringify(rev.screened.parameters)).digest('hex');
  if(rev.screened.inputDigest!==originalDigest)
    throw new Error('M03_REPORT_INPUT_DIGEST_MISMATCH');
  return sha256({
    classification:'UNVERIFIED_MODEL_PROPOSAL_HASH_ONLY',
    sourceSha,topology:rev.screened.conceptTopology,
    rawProposalInputDigest:rev.screened.inputDigest,
    proposedParameters:rev.screened.parameters
  });
}
const transaction = (runId:string,candidateId:string,step:string) =>
  'M03-'+sha256({runId,candidateId,step}).slice(7,35);

export interface RecordDesignLoopOptions {
  candidateId:string; missionId:string; configurationId:string;
  expectedSourceSha:string; classification:Classification;
}
export interface RecordedLoop {
  candidateId:string; lastEventHash:Sha256; recordedRevisions:number;
  sourceSha:string; unverifiedDraftOnly:true;
  independentlyEngineeringValidated:false; engineeringReleaseApproved:false;
}
export async function recordUnverifiedDesignLoop(
  report:DesignLoopReport, ledger:CandidateLedger, options:RecordDesignLoopOptions
):Promise<RecordedLoop>{
  for(const [k,v] of Object.entries(options)){
    if(k!=='classification' && (!ID.test(v)||v.length>80))
      throw new Error('M03_INVALID_BRIDGE_OPTION_'+k.toUpperCase());
  }
  if(!SHA.test(options.expectedSourceSha)||report.sourceCommit!==options.expectedSourceSha)
    throw new Error('M03_REPORT_SOURCE_MISMATCH');
  if(report.independentEngineeringValidated!==false ||
    report.detailedDesignAuthorized!==false ||
    report.engineeringReleaseAuthorized!==false ||
    report.comparison?.approvedDesignSelected!==false)
    throw new Error('M03_UNVERIFIED_REPORT_RELEASE_REFUSED');
  if(!Array.isArray(report.revisions)||report.revisions.length<1||report.revisions.length>100)
    throw new Error('M03_NO_BOUNDED_RESEARCH_REVISIONS');
  const first=report.revisions[0];
  const concept=topology(first.screened.conceptTopology);
  // Validate *all* proposed revisions first so a malformed later revision
  // cannot leave a misleading successful prefix in the journal.
  const digests:Sha256[]=[];
  for(let index=0;index<report.revisions.length;index++){
    const rev=report.revisions[index];
    if(rev.index!==index || topology(rev.screened.conceptTopology)!==concept)
      throw new Error('M03_CANDIDATE_TOPOLOGY_OR_SEQUENCE_CHANGED');
    const digest=screenedDigest(rev,report.sourceCommit);
    if(index>0 && digests[index-1]===digest)
      throw new Error('M03_NO_ACTUAL_PROPOSAL_CHANGE');
    if(index>0){
      const previous=report.revisions[index-1].critique;
      if(!previous || (!previous.findings?.length && !previous.openTbdItems?.length))
        throw new Error('M03_PREVIOUS_AGENT_CRITIQUE_MISSING');
    }
    digests.push(digest);
  }
  let event:CandidateEvent|undefined;
  for(let index=0;index<report.revisions.length;index++){
    const revisionId='REV-'+String(index+1).padStart(3,'0');
    const geometryDigest=digests[index];
    if(index===0){
      event=await ledger.append({
        kind:'CANDIDATE_CREATED',txId:transaction(report.runId,options.candidateId,'create'),
        projectId:'USV-01',candidateId:options.candidateId,
        revisionId,missionId:options.missionId,configurationId:options.configurationId,
        topology:concept,sourceSha:report.sourceCommit,
        classification:options.classification,
        inputDigests:[{domain:'GEOMETRY',digest:geometryDigest}]
      });
    }else{
      const previous=report.revisions[index-1].critique;
      const critiqueDigest=sha256({kind:'UNVERIFIED_A15_MODEL_CRITIQUE',
        sourceSha:report.sourceCommit,critique:previous});
      event=await ledger.append({
        kind:'REVISION_PROPOSED',txId:transaction(report.runId,options.candidateId,revisionId),
        candidateId:options.candidateId,revisionId,
        parentRevisionId:'REV-'+String(index).padStart(3,'0'),
        expectedHeadHash:event!.eventHash,sourceSha:report.sourceCommit,
        changeReasonSha256:critiqueDigest,
        inputDigests:[{domain:'GEOMETRY',digest:geometryDigest}]
      });
    }
  }
  return {
    candidateId:options.candidateId,lastEventHash:event!.eventHash,
    recordedRevisions:report.revisions.length,sourceSha:report.sourceCommit,
    unverifiedDraftOnly:true,independentlyEngineeringValidated:false,
    engineeringReleaseApproved:false
  };
}
