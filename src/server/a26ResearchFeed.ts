/**
 * A26 review-only research feed.
 * Reads the latest successful-source proposal branch produced by the GitHub
 * Actions collector, NOT the controlled engineering dataset.
 *
 * Every upstream byte is untrusted data. No model status or engineering release
 * can be inferred from these provisional research records.
 */
const REPO='ravisinghrathode/usv-01-digital-lab';
const BRANCH_PREFIX='automation/a26-fleet-discovery-';
const API='https://api.github.com/repos/'+REPO;
const MAX_BYTES=5*1024*1024;
const CACHE_MS=60_000;
let cache={expires:0, value:null};
const clean=(v,n=300)=>String(v??'').replace(/[\u0000-\u001f\u007f<>]/g,' ').trim().slice(0,n);
function safeUrl(value){
  try{const u=new URL(String(value));return u.protocol==='https:' && !u.username&&!u.password ? u.href.slice(0,1200):null;}
  catch{return null;}
}
function headers(){
  // A dedicated read-only token may be configured for private repositories.
  // Never return or log its value.
  const token=process.env.USV01_GITHUB_READ_TOKEN;
  return {'Accept':'application/vnd.github+json','User-Agent':'USV01-A26-Research-Reader/1.0',
    ...(token?{'Authorization':'Bearer '+token}:{})};
}
async function getJson(url,fetcher){
  const u=new URL(url);
  if(u.protocol!=='https:'||u.hostname!=='api.github.com'||!u.pathname.startsWith('/repos/'+REPO+'/'))
    throw Error('A26_UNTRUSTED_REMOTE_HOST');
  const response=await fetcher(u.href,{headers:headers(),signal:AbortSignal.timeout(12000),redirect:'error'});
  if(!response.ok)throw Error('A26_GITHUB_HTTP_'+response.status);
  if(Number(response.headers.get('content-length')||0)>MAX_BYTES)throw Error('A26_REMOTE_TOO_LARGE');
  const reader=response.body?.getReader();if(!reader)throw Error('A26_EMPTY_RESPONSE');
  let bytes=0;const parts=[];
  try {
    while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;
      if(bytes>MAX_BYTES)throw Error('A26_REMOTE_TOO_LARGE');parts.push(Buffer.from(value));}
  }finally{await reader.cancel().catch(()=>{});}
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
async function latestBranch(fetcher){
  // GitHub REST branch listings are bounded. Explicit snapshot references avoid
  // inferring a trusted release from a draft research PR.
  const listed=await getJson(API+'/branches?per_page=100',fetcher);
  if(!Array.isArray(listed))throw Error('A26_BRANCH_LIST_INVALID');
  const eligible=listed.filter(b=>typeof b.name==='string' &&
    /^automation\/a26-fleet-discovery-[0-9]{6,15}$/.test(b.name) &&
    /^[a-f0-9]{40}$/.test(String(b.commit?.sha||'')));
  eligible.sort((a,b)=>Number(b.name.slice(BRANCH_PREFIX.length))-Number(a.name.slice(BRANCH_PREFIX.length)));
  if(eligible.length===0)throw Error('A26_NO_PUBLISHED_REVIEW_BRANCH');
  return {branch:eligible[0].name,revision:eligible[0].commit.sha};
}
async function fileFromCommit(p,sha,fetcher){
  const item=await getJson(API+'/contents/'+p+'?ref='+sha,fetcher);
  if(item.type!=='file'||item.encoding!=='base64'||typeof item.content!=='string'||item.size>MAX_BYTES)
    throw Error('A26_INVALID_REVIEW_FILE');
  const binary=Buffer.from(item.content.replace(/\s/g,''),'base64');
  if(binary.length>MAX_BYTES)throw Error('A26_REVIEW_FILE_TOO_LARGE');
  return JSON.parse(binary.toString('utf8'));
}
export function shapeResearchFeed(fleet,docs,source){
  if(fleet?.schemaVersion!==1||fleet.agentId!=='INTEL-USV-26'||
     fleet.classification!=='PUBLIC_SOURCE_SAFE_ONLY'||!Array.isArray(fleet.records)||
     fleet.records.length>2000||!fleet.records.every(r=>r.status==='DISCOVERED_UNVERIFIED'))
    throw Error('A26_UNTRUSTED_FLEET_REGISTER');
  if(docs?.schemaVersion!==1||docs.agentId!=='INTEL-USV-26'||
     docs.classification!=='PUBLIC_SOURCE_SAFE_ONLY'||
     docs.reviewStatus!=='UNVERIFIED_PUBLIC_DOCUMENTS'||!Array.isArray(docs.records)||
     docs.records.length>3000||!docs.records.every(r=>r.reviewStatus==='REVIEW_REQUIRED'))
    throw Error('A26_UNTRUSTED_DOCUMENT_REGISTER');
  const leads=fleet.records.map(r=>({
    id:clean(r.id,160),title:clean(r.title),summary:clean(r.summary,480),
    firstSeenAt:clean(r.firstSeenAt,40),status:'DISCOVERED_UNVERIFIED',
    sources:Array.isArray(r.evidence)?r.evidence.slice(0,4).map(e=>({
      url:safeUrl(e.publicArticleUrl),sha256:clean(e.entrySha256,80),
      publishedAt:clean(e.publishedAt,40)
    })).filter(e=>e.url):[]
  }));
  const publications=docs.records.map(r=>({
    id:clean(r.id,160),title:clean(r.title),doi:safeUrl(r.doi),
    sourceUrl:safeUrl(r.sourceUrl),pdfUrl:safeUrl(r.fullTextPdfLink),
    publishedAt:clean(r.publishedAt,40),
    license:clean(r.openLicenseMetadata,90),status:'REVIEW_REQUIRED'
  }));
  return {success:true,agentId:'INTEL-USV-26',classification:'PUBLIC_SOURCE_SAFE_ONLY',
    researchStatus:'UNVERIFIED_PUBLIC_RESEARCH',source:'GITHUB_UNVERIFIED_REVIEW_BRANCH',
    sourceBranch:source.branch,sourceRevision:source.revision,
    sourceUrl:'https://github.com/'+REPO+'/tree/'+source.branch,
    retrievedAt:new Date().toISOString(),
    counts:{fleetLeads:leads.length,publications:publications.length},
    leads,publications,independentlyVerified:0,
    engineeringReleaseApproved:false,knowledgeGraphApproved:false};
}
export async function loadA26ResearchFeed({fetcher=fetch,force=false}={}){
  if(!force&&cache.value&&Date.now()<cache.expires)return cache.value;
  // Fail closed on errors. Do not substitute an empty baseline and report 0
  // records when fresh research exists but GitHub is temporarily inaccessible.
  const source=await latestBranch(fetcher);
  const [fleet,docs]=await Promise.all([
    fileFromCommit('references/fleet-intelligence/discovery-register.json',source.revision,fetcher),
    fileFromCommit('references/fleet-intelligence/document-register.json',source.revision,fetcher)
  ]);
  const data=shapeResearchFeed(fleet,docs,source);
  cache={expires:Date.now()+CACHE_MS,value:data};
  return data;
}
