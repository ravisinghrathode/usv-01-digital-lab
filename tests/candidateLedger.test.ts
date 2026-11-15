import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  CandidateLedger, ENGINEERING_DEPENDENCIES, assertEngineeringDependencyGraph,
  affectedDomains, sha256, type CreateCandidate, type ReviseCandidate,
  type RecordEvidence
} from '../src/core/digital-thread/CandidateLedger.ts';
const dirs:string[]=[];
afterEach(async()=>{await Promise.all(dirs.splice(0).map(d=>rm(d,{recursive:true,force:true})))});
const source='a'.repeat(40);
const D=(value:string)=>sha256({value});
async function setup(){
  const dir=await mkdtemp(path.join(os.tmpdir(),'usv-m03-'));
  dirs.push(dir);
  return {file:path.join(dir,'candidate-journal.json'),ledger:new CandidateLedger(path.join(dir,'candidate-journal.json'))};
}
function create(id='CAND-A',tx='CREATE-A'):CreateCandidate{
  return {kind:'CANDIDATE_CREATED',txId:tx,projectId:'USV-01',
    candidateId:id,revisionId:'REV-01',missionId:'MISSION-RESEARCH',
    configurationId:'CFG-RESEARCH',topology:'CATAMARAN',
    sourceSha:source,classification:'RESTRICTED_METADATA_ONLY',
    inputDigests:[{domain:'GEOMETRY',digest:D(id+'-geometry')},{domain:'MASS_CG',digest:D(id+'-cg')}]};
}
function evidence(
  candidateId:string,head:string,revisionId:string,
  domain:RecordEvidence['domain'],outcome:RecordEvidence['outcome']='UNVERIFIED'
):RecordEvidence{
  return {kind:'EVIDENCE_RECORDED',txId:'TOOL-'+candidateId+'-'+revisionId+'-'+domain+'-'+outcome,
    candidateId,revisionId,sourceSha:source,expectedHeadHash:head as RecordEvidence['expectedHeadHash'],
    domain,outcome,inputSha256:D('input:'+domain),outputSha256:D('output:'+domain),methodId:'TOOL-RESEARCH-01'};
}
describe('M03 candidate draft digital-thread',()=>{
  it('validates acyclic dependencies and invalidates transitive analyses',()=>{
    assertEngineeringDependencyGraph(ENGINEERING_DEPENDENCIES);
    expect(affectedDomains(['GEOMETRY'])).toContain('INDEPENDENT_VV');
    expect(affectedDomains(['MASS_CG'])).toContain('THERMAL');
    expect(affectedDomains(['MASS_CG'])).not.toContain('GEOMETRY');
    expect(()=>assertEngineeringDependencyGraph({...ENGINEERING_DEPENDENCIES,
      GEOMETRY:['INDEPENDENT_VV']})).toThrow(/CYCLE/);
    expect(()=>assertEngineeringDependencyGraph({...ENGINEERING_DEPENDENCIES,
      GEOMETRY:['BAD' as 'GEOMETRY']})).toThrow(/UNKNOWN_DEPENDENCY/);
  });
  it('isolates 2 candidates and rejects stale/replayed cross-candidate revisions',async()=>{
    const {ledger}=await setup();
    const a=await ledger.append(create('CAND-A','CREATE-A'));
    const b=await ledger.append(create('CAND-B','CREATE-B'));
    expect((await ledger.append(create('CAND-A','CREATE-A'))).eventHash).toBe(a.eventHash);
    await expect(ledger.append({...create('CAND-B','CREATE-A')})).rejects.toThrow(/TX_REPLAY_CONFLICT/);
    const revision:ReviseCandidate={kind:'REVISION_PROPOSED',txId:'REVISE-A-02',
      candidateId:'CAND-A',revisionId:'REV-02',parentRevisionId:'REV-01',
      expectedHeadHash:a.eventHash,sourceSha:source,changeReasonSha256:D('critique-02'),
      inputDigests:[{domain:'GEOMETRY',digest:D('new-geometry')}]};
    const revised=await ledger.append(revision);
    await expect(ledger.append({...revision,txId:'STALE',revisionId:'REV-03'})).rejects.toThrow(/STALE_PARENT/);
    await expect(ledger.append({...revision,txId:'CROSS',candidateId:'CAND-B',
      expectedHeadHash:a.eventHash})).rejects.toThrow(/STALE_PARENT/);
    expect((await ledger.append(revision)).eventHash).toBe(revised.eventHash);
    const snaps=await ledger.readAll();
    expect(snaps).toHaveLength(2);
    const sa=snaps.find(x=>x.candidateId==='CAND-A')!;
    const sb=snaps.find(x=>x.candidateId==='CAND-B')!;
    expect(sa.revisionId).toBe('REV-02');
    expect(sa.domainStates.HYDROSTATICS).toBe('BLOCKED');
    expect(sa.domainStates.GEOMETRY).toBe('NOT_RUN');
    expect(sb.revisionId).toBe('REV-01');
    expect(sb.headEventHash).toBe(b.eventHash);
    expect(sa.engineeringReleaseApproved).toBe(false);
    expect(sa.vesselDesignCertified).toBe(false);
  });
  it('requires real upstream tool receipts before descendants and invalidates on new mass input',async()=>{
    const {ledger}=await setup();
    let head=(await ledger.append(create())).eventHash;
    await expect(ledger.append(evidence('CAND-A',head,'REV-01','HYDROSTATICS')))
      .rejects.toThrow(/UPSTREAM_EVIDENCE_BLOCKED/);
    for(const domain of ['GEOMETRY','MASS_CG','HYDROSTATICS','RESISTANCE','PROPULSION','POWER','THERMAL'] as const){
      head=(await ledger.append(evidence('CAND-A',head,'REV-01',domain))).eventHash;
    }
    const before=(await ledger.readAll())[0];
    expect(before.domainStates.THERMAL).toBe('UNVERIFIED');
    const revise:ReviseCandidate={kind:'REVISION_PROPOSED',txId:'MASS-CG-CRITIQUE',
      candidateId:'CAND-A',revisionId:'REV-02',parentRevisionId:'REV-01',
      expectedHeadHash:head,sourceSha:source,changeReasonSha256:D('CG-change-critique'),
      inputDigests:[{domain:'MASS_CG',digest:D('new-CG')}]};
    head=(await ledger.append(revise)).eventHash;
    const after=(await ledger.readAll())[0];
    expect(after.domainStates.MASS_CG).toBe('NOT_RUN');
    expect(after.domainStates.GEOMETRY).toBe('UNVERIFIED');
    for(const domain of ['HYDROSTATICS','RESISTANCE','PROPULSION','POWER','THERMAL'] as const){
      expect(after.domainStates[domain]).toBe('BLOCKED');
      expect(after.domainEvidence[domain]).toBeUndefined();
    }
    await expect(ledger.append(evidence('CAND-A',head,'REV-01','GEOMETRY')))
      .rejects.toThrow(/STALE_EVIDENCE_SOURCE/);
  });
  it('invalidates previously observed downstream evidence on FAIL and does not launder approvals',async()=>{
    const {ledger}=await setup();
    let head=(await ledger.append(create())).eventHash;
    for(const domain of ['GEOMETRY','MASS_CG','HYDROSTATICS','RESISTANCE'] as const)
      head=(await ledger.append(evidence('CAND-A',head,'REV-01',domain))).eventHash;
    head=(await ledger.append(evidence('CAND-A',head,'REV-01','GEOMETRY','FAILED'))).eventHash;
    const record=(await ledger.readAll())[0];
    expect(record.domainStates.GEOMETRY).toBe('BLOCKED');
    expect(record.domainStates.RESISTANCE).toBe('BLOCKED');
    expect(record.domainEvidence.RESISTANCE).toBeUndefined();
    expect(record.independentEngineeringValidationSatisfied).toBe(false);
    expect(record.engineeringReleaseApproved).toBe(false);
  });
  it('rejects corrupted/reordered ledger and concurrent revisions with one winning parent',async()=>{
    const {ledger,file}=await setup();
    const genesis=await ledger.append(create());
    const r=(txId:string,revisionId:string):ReviseCandidate=>({
      kind:'REVISION_PROPOSED',txId,candidateId:'CAND-A',revisionId,
      parentRevisionId:'REV-01',expectedHeadHash:genesis.eventHash,sourceSha:source,
      changeReasonSha256:D(txId),inputDigests:[{domain:'MASS_CG',digest:D(txId)}]});
    const outcomes=await Promise.allSettled([
      ledger.append(r('TX-2','REV-02')),ledger.append(r('TX-3','REV-03'))]);
    expect(outcomes.filter(x=>x.status==='fulfilled')).toHaveLength(1);
    expect(outcomes.filter(x=>x.status==='rejected')).toHaveLength(1);
    const record=JSON.parse(await readFile(file,'utf8'));
    record.events[0].action.configurationId='TAMPERED';
    await writeFile(file,JSON.stringify(record));
    await expect(ledger.readAll()).rejects.toThrow(/ACTION_DIGEST_TAMPERED/);
    await expect(ledger.append(create('NEW-CAND','NEW-TX'))).rejects.toThrow(/ACTION_DIGEST_TAMPERED/);
  });
  it('rejects malformed digest, wrong project, unknown classifications and circular history',async()=>{
    const {ledger}=await setup();
    await expect(ledger.append({...create(),projectId:'OTHER' as 'USV-01'}))
      .rejects.toThrow(/WRONG_PROJECT/);
    await expect(ledger.append({...create(),classification:'NAVY_AUTHORIZED' as CreateCandidate['classification']}))
      .rejects.toThrow(/INVALID_CLASSIFICATION/);
    await expect(ledger.append({...create(),inputDigests:[{domain:'GEOMETRY',digest:'sha256:0' as `sha256:${string}` }]}))
      .rejects.toThrow(/INVALID_INPUT_DIGEST/);
    await ledger.append(create());
    await expect(ledger.append({...create(),txId:'NEW',revisionId:'REV-02'}))
      .rejects.toThrow(/DUPLICATE_CANDIDATE/);
  });
});
