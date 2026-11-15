/**
 * Public, read-only A26 software-discovery feed. This does not read the
 * protected software adoption register or grant execution authority.
 */
const API='https://api.github.com/repos/ravisinghrathode/usv-01-digital-lab';
const MAX_BYTES=1_000_000;
let cache:{value:RepositoryDiscoveryFeed;expires:number}|null=null;
export interface DiscoveredRepository {
 name:string;url:string;description:string;score:number;categories:string[];
 licenseSpdx:string|null;lastPushedAt:string|null;
 adoptionStatus:'DISCOVERED_AWAITING_HUMAN_AND_INDEPENDENT_REVIEW';
}
export interface RepositoryDiscoveryFeed {
 schemaVersion:1;agentId:'INTEL-USV-26';
 classification:'PUBLIC_SOURCE_SAFE_ONLY';reviewStatus:'UNVERIFIED_REVIEW_REQUIRED';
 engineeringReleaseApproved:false;softwareAdoptionApproved:false;
 runId:string;sourceRevision:string;generatedAt:string;
 provider:'GITHUB_PUBLIC_REPOSITORY_SEARCH';completedQueries:number;plannedQueries:number;
 coverageComplete:false;errors:string[];candidates:DiscoveredRepository[];
}
async function json(url:string,fetcher:typeof fetch){
 const u=new URL(url);
 if(u.origin!=='https://api.github.com'||!u.pathname.startsWith('/repos/ravisinghrathode/usv-01-digital-lab/'))
  throw Error('REPOSITORY_DISCOVERY_REMOTE_FORBIDDEN');
 const response=await fetcher(u.href,{headers:{Accept:'application/vnd.github+json'},
  redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('REPOSITORY_DISCOVERY_HTTP_'+response.status);
 if(Number(response.headers.get('content-length')||0)>MAX_BYTES)throw Error('REPOSITORY_DISCOVERY_TOO_LARGE');
 const body=await response.text();
 if(body.length>MAX_BYTES)throw Error('REPOSITORY_DISCOVERY_TOO_LARGE');
 return JSON.parse(body);
}
export function validateRepositoryDiscovery(data:any):RepositoryDiscoveryFeed{
 if(!data||data.schemaVersion!==1||data.agentId!=='INTEL-USV-26'||
  data.classification!=='PUBLIC_SOURCE_SAFE_ONLY'||
  data.reviewStatus!=='UNVERIFIED_REVIEW_REQUIRED'||
  data.engineeringReleaseApproved!==false||data.softwareAdoptionApproved!==false||
  data.provider!=='GITHUB_PUBLIC_REPOSITORY_SEARCH'||data.coverageComplete!==false||
  !/^\d{6,15}$/.test(String(data.runId))||!/^[a-f0-9]{40}$/.test(String(data.sourceRevision))||
  !Array.isArray(data.candidates)||data.candidates.length>300||data.completedQueries<1||
  !Array.isArray(data.errors)||data.errors.length>100)
  throw Error('REPOSITORY_DISCOVERY_UNTRUSTED_PAYLOAD');
 const seen=new Set<string>();
 for(const c of data.candidates){
  if(!c||!/^[-\w.]{1,100}\/[-\w.]{1,100}$/.test(c.name)||c.url!=='https://github.com/'+c.name||
   c.adoptionStatus!=='DISCOVERED_AWAITING_HUMAN_AND_INDEPENDENT_REVIEW'||
   !Array.isArray(c.categories)||c.categories.length>20||typeof c.description!=='string'||
   !Number.isFinite(c.score)||seen.has(c.name.toLowerCase()))
   throw Error('REPOSITORY_DISCOVERY_INVALID_CANDIDATE');
  seen.add(c.name.toLowerCase());
 }
 return data as RepositoryDiscoveryFeed;
}
export async function getPublicRepositoryDiscovery({
 fetcher=fetch,force=false
}:{fetcher?:typeof fetch;force?:boolean}={}):Promise<RepositoryDiscoveryFeed>{
 if(!force&&cache&&cache.expires>Date.now())return cache.value;
 const ref=await json(API+'/git/ref/heads/research/live-code-repositories',fetcher);
 if(ref.ref!=='refs/heads/research/live-code-repositories'||
  !/^[a-f0-9]{40}$/.test(String(ref.object?.sha||'')))
  throw Error('REPOSITORY_DISCOVERY_LIVE_REF_INVALID');
 const item=await json(API+'/contents/references/live-research/repository-scout.json?ref='+ref.object.sha,fetcher);
 if(item.type!=='file'||item.encoding!=='base64'||item.size>MAX_BYTES||typeof item.content!=='string')
  throw Error('REPOSITORY_DISCOVERY_INVALID_FILE');
 const buffer=Uint8Array.from(atob(item.content.replace(/\s/g,'')),ch=>ch.charCodeAt(0));
 if(buffer.length>MAX_BYTES)throw Error('REPOSITORY_DISCOVERY_TOO_LARGE');
 const result=validateRepositoryDiscovery(JSON.parse(new TextDecoder().decode(buffer)));
 cache={value:result,expires:Date.now()+60_000};
 return result;
}
