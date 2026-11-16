import {afterEach,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  auditLocalReferenceBytes,type LocalReferenceRecord
} from '../src/core/verification/LocalReferenceAdmission.ts';
const dirs:string[]=[];
afterEach(async()=>{await Promise.all(dirs.splice(0).map(x=>rm(x,{recursive:true,force:true})))});
const sha='a'.repeat(40);
async function setup(){
  const dir=await mkdtemp(path.join(os.tmpdir(),'usv-m05-ref-'));
  const outside=await mkdtemp(path.join(os.tmpdir(),'usv-m05-other-'));
  dirs.push(dir,outside);
  await mkdir(path.join(dir,'references'));
  await writeFile(path.join(dir,'references','sample.txt'),'SYNTHETIC TEST NOT REAL STANDARD');
  await writeFile(path.join(outside,'restricted.txt'),'CONFIDENTIAL NEVER EXPORTED');
  return{dir,outside,root:path.join(dir,'references')};
}
function digest(bytes:string){
  return 'sha256:'+createHash('sha256').update(bytes).digest('hex');
}
function record():LocalReferenceRecord{
  return{
    id:'SYN-BM-001',relativePath:'sample.txt',
    expectedSha256:digest('SYNTHETIC TEST NOT REAL STANDARD'),
    sourceUri:'https://example.org/synthetic-no-real-source',edition:'TEST ONLY',
    applicabilityNote:'Synthetic test-only applicability; no claim of source authenticity',
    declaredRights:'PUBLIC_OR_OPEN_CLAIM_UNVERIFIED'
  };
}
describe('M05 exact-byte local reference admission does not authenticate publishers',()=>{
  it('matches local bytes and exact source without promoting legal, physical or engineering credibility',async()=>{
    const {root}=await setup();
    const result=await auditLocalReferenceBytes({sourceCommitSha:sha,
      allowedLocalDirectory:root,records:[record()]});
    expect(result.allLocalBytesMatch).toBe(true);
    expect(result.entries[0].observedSha256).toBe(record().expectedSha256);
    expect(result.entries[0].status).toBe('LOCAL_BYTES_MATCH_SOURCE_UNVERIFIED');
    expect(result.sourcePublisherAuthenticated).toBe(false);
    expect(result.rightsVerified).toBe(false);
    expect(result.engineeringReleaseApproved).toBe(false);
    expect(result.entries[0].independentExpertReviewPassed).toBe(false);
  });
  it('rejects replaced bytes and duplicate IDs',async()=>{
    const {root}=await setup();
    await writeFile(path.join(root,'sample.txt'),'CHANGED');
    const r=await auditLocalReferenceBytes({sourceCommitSha:sha,
      allowedLocalDirectory:root,records:[record(),record()]});
    expect(r.allLocalBytesMatch).toBe(false);
    expect(r.entries.map(x=>x.status)).toEqual([
      'BLOCKED_HASH_MISMATCH','BLOCKED_INVALID_METADATA']);
  });
  it('rejects absolute paths, traversal, symlink escapes and missing files',async()=>{
    const {root,outside}=await setup();
    await symlink(path.join(outside,'restricted.txt'),path.join(root,'escape.txt'));
    const cases=['../restricted.txt','/tmp/elsewhere.txt','escape.txt','missing.txt'];
    for(const rel of cases){
      const r=await auditLocalReferenceBytes({sourceCommitSha:sha,
        allowedLocalDirectory:root,records:[{...record(),relativePath:rel}]});
      expect(r.allLocalBytesMatch).toBe(false);
      expect(r.entries[0].status).toMatch(/^BLOCKED_/);
    }
  });
  it('rejects fake URLs, missing editions, unapproved rights labels and a stale source ID',async()=>{
    const {root}=await setup();
    for(const change of [
      {sourceUri:'http://example.org/not-https'},
      {sourceUri:'https://127.0.0.1/private'},
      {sourceUri:'https://user:pass@example.org'},
      {edition:''},
      {declaredRights:'AUTHORIZED_BY_AI'}
    ]){
      const r=await auditLocalReferenceBytes({sourceCommitSha:sha,
        allowedLocalDirectory:root,records:[{...record(),...change}] as LocalReferenceRecord[]});
      expect(r.entries[0].status).toBe('BLOCKED_INVALID_METADATA');
    }
    await expect(auditLocalReferenceBytes({
      sourceCommitSha:'bad',allowedLocalDirectory:root,records:[record()]
    })).rejects.toThrow(/EXACT_SOURCE_SHA_REQUIRED/);
    const missing=await auditLocalReferenceBytes({
      sourceCommitSha:sha,allowedLocalDirectory:root,records:[]
    });
    expect(missing.allLocalBytesMatch).toBe(false);
  });
});
