/**
 * M05 local reference byte admission, never publisher/source authentication.
 * Safe for private licensed artifacts: metadata/digests only leave this API.
 * No network fetch and no inference that a document or standard is licensed.
 */
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,realpath} from 'node:fs/promises';
import path from 'node:path';

const SHA40=/^[a-f0-9]{40}$/;
const SHA256=/^sha256:[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/;
const MAX_BYTES=50*1024*1024;
export interface LocalReferenceRecord {
  id:string;
  relativePath:string;
  expectedSha256:string;
  sourceUri:string;
  edition:string;
  applicabilityNote:string;
  declaredRights:'PUBLIC_OR_OPEN_CLAIM_UNVERIFIED'|'PRIVATE_LICENSE_CLAIM_UNVERIFIED';
}
export interface ReferenceByteFinding {
  id:string;
  status:'LOCAL_BYTES_MATCH_SOURCE_UNVERIFIED'|
    'BLOCKED_INVALID_METADATA'|'BLOCKED_UNSAFE_PATH_OR_FILE'|'BLOCKED_HASH_MISMATCH';
  observedSha256?:string;
  /** Content license, publisher authority and expert applicability are NOT automated. */
  sourcePublisherAuthenticated:false;
  rightsVerified:false;
  independentExpertReviewPassed:false;
}
export interface ReferenceByteAudit {
  schema:'usv01-reference-byte-audit/v1';
  sourceCommitSha:string;
  entries:ReferenceByteFinding[];
  allLocalBytesMatch:boolean;
  sourcePublisherAuthenticated:false;
  rightsVerified:false;
  engineeringReleaseApproved:false;
}
function safeSourceUri(uri:unknown):boolean {
  if(typeof uri!=='string')return false;
  try{
    const u=new URL(uri);
    return u.protocol==='https:' && !!u.hostname && !u.username && !u.password &&
      !/^(localhost|127\\.|0\\.|10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[01])\\.|\\[?::1\\]?)/i.test(u.hostname) &&
      !u.hostname.endsWith('.local');
  }catch{return false;}
}
function safeRelativePath(raw:unknown):raw is string{
  return typeof raw==='string' && raw.length>0 && raw.length<350 &&
    !path.isAbsolute(raw) && !/^[A-Za-z]:/.test(raw) &&
    raw.split(/[\\/]/).every(part=>part && part!=='.' && part!=='..');
}
function validMetadata(r:LocalReferenceRecord):boolean{
  return Boolean(r && typeof r==='object' &&
    typeof r.id==='string' && ID.test(r.id) &&
    safeRelativePath(r.relativePath) &&
    typeof r.expectedSha256==='string' && SHA256.test(r.expectedSha256) &&
    safeSourceUri(r.sourceUri) &&
    typeof r.edition==='string' && r.edition.trim().length>0 && r.edition.length<200 &&
    typeof r.applicabilityNote==='string' && r.applicabilityNote.trim().length>=10 &&
    r.applicabilityNote.length<=1000 &&
    (r.declaredRights==='PUBLIC_OR_OPEN_CLAIM_UNVERIFIED'||
      r.declaredRights==='PRIVATE_LICENSE_CLAIM_UNVERIFIED'));
}
async function safeReferenceFile(root:string,relative:string):Promise<string>{
  const segments=relative.split(/[\\/]/);
  let current=root;
  for(const name of segments){
    current=path.join(current,name);
    const info=await lstat(current);
    if(info.isSymbolicLink())throw new Error('M05_REFERENCE_SYMLINK_BLOCKED');
  }
  const final=await realpath(current);
  if(!final.startsWith(root+path.sep))throw new Error('M05_REFERENCE_PATH_ESCAPED');
  const info=await lstat(final);
  if(!info.isFile()||info.size===0||info.size>MAX_BYTES)
    throw new Error('M05_REFERENCE_INVALID_FILE');
  return final;
}
async function streamedDigest(filename:string):Promise<string>{
  const hash=createHash('sha256');
  let bytes=0;
  for await(const chunk of createReadStream(filename)){
    bytes+=(chunk as Buffer).length;
    if(bytes>MAX_BYTES)throw new Error('M05_REFERENCE_OVERSIZE_DURING_READ');
    hash.update(chunk as Buffer);
  }
  if(bytes===0)throw new Error('M05_REFERENCE_EMPTY');
  return 'sha256:'+hash.digest('hex');
}

/** Caller must independently pin the source commit and trust the local root. */
export async function auditLocalReferenceBytes(input:{
  sourceCommitSha:string;
  allowedLocalDirectory:string;
  records:readonly LocalReferenceRecord[];
}):Promise<ReferenceByteAudit>{
  if(!SHA40.test(input.sourceCommitSha))
    throw new Error('M05_REFERENCE_EXACT_SOURCE_SHA_REQUIRED');
  if(!Array.isArray(input.records)||input.records.length>200)
    throw new Error('M05_REFERENCE_CATALOG_INVALID');
  const root=await realpath(input.allowedLocalDirectory);
  const observed=new Set<string>();
  const entries:ReferenceByteFinding[]=[];
  for(const record of input.records){
    const id=typeof record?.id==='string'?record.id:'INVALID';
    if(!validMetadata(record)||observed.has(id)){
      entries.push({id,status:'BLOCKED_INVALID_METADATA',
        sourcePublisherAuthenticated:false,rightsVerified:false,
        independentExpertReviewPassed:false});
      continue;
    }
    observed.add(id);
    try{
      const filename=await safeReferenceFile(root,record.relativePath);
      const observedSha256=await streamedDigest(filename);
      entries.push({
        id, observedSha256,
        status:observedSha256===record.expectedSha256
          ? 'LOCAL_BYTES_MATCH_SOURCE_UNVERIFIED':'BLOCKED_HASH_MISMATCH',
        sourcePublisherAuthenticated:false,rightsVerified:false,
        independentExpertReviewPassed:false
      });
    }catch{
      entries.push({id,status:'BLOCKED_UNSAFE_PATH_OR_FILE',
        sourcePublisherAuthenticated:false,rightsVerified:false,
        independentExpertReviewPassed:false});
    }
  }
  return{
    schema:'usv01-reference-byte-audit/v1',
    sourceCommitSha:input.sourceCommitSha,entries,
    allLocalBytesMatch:entries.length>0 &&
      entries.every(x=>x.status==='LOCAL_BYTES_MATCH_SOURCE_UNVERIFIED'),
    sourcePublisherAuthenticated:false,rightsVerified:false,
    engineeringReleaseApproved:false
  };
}
