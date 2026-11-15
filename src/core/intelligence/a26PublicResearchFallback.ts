/**
 * Browser-safe, read-only fallback for the PUBLIC A26 review feed.
 *
 * Required by Vite-only / Google AI Studio Lab previews that have no Express
 * /api backend. It never writes or promotes data into the engineering store.
 * All published review records are PUBLIC_SOURCE_SAFE_ONLY and UNVERIFIED.
 * Credentials are deliberately not accepted or exposed in the browser.
 */
const REPO = 'ravisinghrathode/usv-01-digital-lab';
const GITHUB = 'https://api.github.com/repos/' + REPO;
const PREFIX = 'refs/heads/automation/a26-fleet-discovery-';
const MAX_BYTES = 1_000_000;
const CACHE_MS = 15 * 60 * 1000;
let snapshot: {expires:number;data:A26PublicFeed} | null = null;

export interface A26PublicFeed {
  success: true;
  researchStatus: 'UNVERIFIED_PUBLIC_RESEARCH';
  engineeringReleaseApproved: false;
  sourceMode: 'PUBLIC_GITHUB_READ_ONLY';
  sourceRevision: string;
  sourceUrl: string;
  runId: string;
  leads: Array<{id:string;title:string;summary:string;sources:Array<{url:string|null}>}>;
  publications: Array<{id:string;title:string;doi:string|null;sourceUrl:string|null;pdfUrl:string|null}>;
  vessels: Array<{id:string;model:string;manufacturer:string;country:string;
    status:'UNVERIFIED_REVIEW_REQUIRED';
    sources:Array<{url:string|null;sha256:string|null;identityCorroborated:boolean}>;
    claims:Array<{field:string;value:string;quotation:string;sourceUrl:string|null}>}>;
}

const safeText=(v:unknown,max=320)=>String(v??'').replace(/[\u0000-\u001f\u007f<>]/g,' ').trim().slice(0,max);
const safeUrl=(v:unknown):string|null=>{
  try {const url=new URL(String(v));return url.protocol==='https:'&&!url.username&&!url.password?url.href.slice(0,1200):null;}
  catch{return null;}
};
async function jsonRequest(url:string,fetcher:typeof fetch):Promise<any>{
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||parsed.origin!=='https://api.github.com'||
    !parsed.pathname.startsWith('/repos/'+REPO+'/'))
    throw Error('A26_PUBLIC_SOURCE_URL_FORBIDDEN');
  const result=await fetcher(parsed.href,{headers:{Accept:'application/vnd.github+json'},
    redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!result.ok)throw Error('A26_PUBLIC_GITHUB_HTTP_'+result.status);
  const length=Number(result.headers.get('content-length')||0);
  if(length>MAX_BYTES)throw Error('A26_PUBLIC_SOURCE_TOO_LARGE');
  const body=await result.text();
  if(body.length>MAX_BYTES)throw Error('A26_PUBLIC_SOURCE_TOO_LARGE');
  return JSON.parse(body);
}
async function stableSource(fetcher:typeof fetch){
  const response=await jsonRequest(GITHUB+'/git/ref/heads/research/live-a26',fetcher);
  if(response?.ref!=='refs/heads/research/live-a26'||
     !/^[a-f0-9]{40}$/.test(String(response.object?.sha||'')))
    throw Error('A26_LIVE_REF_INVALID');
  return {sha:response.object.sha as string,branch:'research/live-a26'};
}
async function publishedSource(fetcher:typeof fetch){
  const refs=await jsonRequest(GITHUB+'/git/matching-refs/heads/automation/a26-fleet-discovery-',fetcher);
  if(!Array.isArray(refs)||refs.length>10000)throw Error('A26_NO_PUBLIC_REVIEW_BRANCH');
  const matching=refs.filter((r:any)=>typeof r.ref==='string'&&r.ref.startsWith(PREFIX)&&
    /^\d{6,15}$/.test(r.ref.slice(PREFIX.length))&&/^[a-f0-9]{40}$/.test(r.object?.sha||''));
  matching.sort((a:any,b:any)=>Number(b.ref.slice(PREFIX.length))-Number(a.ref.slice(PREFIX.length)));
  if(!matching.length)throw Error('A26_NO_PUBLIC_REVIEW_BRANCH');
  return {sha:matching[0].object.sha as string,branch:matching[0].ref.slice('refs/heads/'.length) as string};
}
async function pinnedFile(file:string,sha:string,fetcher:typeof fetch):Promise<any>{
  const response=await jsonRequest(GITHUB+'/contents/'+file+'?ref='+sha,fetcher);
  if(response.type!=='file'||response.encoding!=='base64'||typeof response.content!=='string'||
    !Number.isFinite(response.size)||response.size>MAX_BYTES)
    throw Error('A26_PUBLIC_FILE_INVALID');
  const encoded=response.content.replace(/\s/g,'');
  if(encoded.length>MAX_BYTES*1.5)throw Error('A26_PUBLIC_FILE_TOO_LARGE');
  const bytes=Uint8Array.from(atob(encoded),(char)=>char.charCodeAt(0));
  if(bytes.byteLength>MAX_BYTES)throw Error('A26_PUBLIC_FILE_TOO_LARGE');
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function validatePublicFeed(fleet:any,docs:any,sourceIndex:any,manifest:any,
  source:{sha:string;branch:string}):A26PublicFeed{
  if(fleet?.schemaVersion!==1||fleet.agentId!=='INTEL-USV-26'||
    fleet.classification!=='PUBLIC_SOURCE_SAFE_ONLY'||!Array.isArray(fleet.records)||
    fleet.records.length>2000||!fleet.records.every((r:any)=>r.status==='DISCOVERED_UNVERIFIED'))
    throw Error('A26_PUBLIC_FLEET_INVALID');
  if(docs?.schemaVersion!==1||docs.agentId!=='INTEL-USV-26'||
    docs.classification!=='PUBLIC_SOURCE_SAFE_ONLY'||
    docs.reviewStatus!=='UNVERIFIED_PUBLIC_DOCUMENTS'||
    !Array.isArray(docs.records)||docs.records.length>3000||
    !docs.records.every((r:any)=>r.reviewStatus==='REVIEW_REQUIRED'))
    throw Error('A26_PUBLIC_DOCUMENTS_INVALID');
  if(sourceIndex?.schemaVersion!==1||sourceIndex.report?.engineeringReleaseApproved!==false||
    !Array.isArray(sourceIndex.records)||sourceIndex.records.length>2000)
    throw Error('A26_PUBLIC_SOURCES_INVALID');
  if(manifest?.schemaVersion!==1||manifest.agentId!=='INTEL-USV-26'||
    manifest.classification!=='PUBLIC_SOURCE_SAFE_ONLY'||
    manifest.reviewStatus!=='UNVERIFIED_REVIEW_REQUIRED'||
    manifest.engineeringReleaseApproved!==false||
    !/^\d{6,15}$/.test(String(manifest.runId||''))||
    !/^[a-f0-9]{40}$/.test(String(manifest.headSha||''))||
    (source.branch!=='research/live-a26' && manifest.runId!==source.branch.slice('automation/a26-fleet-discovery-'.length)))
    throw Error('A26_PUBLIC_MANIFEST_INVALID');
  return {
    success:true,researchStatus:'UNVERIFIED_PUBLIC_RESEARCH',
    engineeringReleaseApproved:false,sourceMode:'PUBLIC_GITHUB_READ_ONLY',
    sourceRevision:source.sha,sourceUrl:'https://github.com/'+REPO+'/tree/'+source.branch,
    runId:manifest.runId,
    leads:fleet.records.map((r:any)=>({
      id:safeText(r.id,160),title:safeText(r.title),summary:safeText(r.summary,480),
      sources:(Array.isArray(r.evidence)?r.evidence:[]).slice(0,4).map((s:any)=>({
        url:safeUrl(s.publicArticleUrl)
      }))
    })),
    publications:docs.records.map((r:any)=>({
      id:safeText(r.id,160),title:safeText(r.title),doi:safeUrl(r.doi),
      sourceUrl:safeUrl(r.sourceUrl),pdfUrl:safeUrl(r.fullTextPdfLink)
    })),
    vessels:sourceIndex.records.map((r:any)=>({
      id:safeText(r.key,200),model:safeText(r.model,160),
      manufacturer:safeText(r.manufacturer,160),country:safeText(r.country,80),
      status:'UNVERIFIED_REVIEW_REQUIRED' as const,
      sources:(Array.isArray(r.sources)?r.sources:[]).slice(0,12).map((s:any)=>({
        url:safeUrl(s.url),
        sha256:/^sha256:[a-f0-9]{64}$/.test(String(s.sha256||''))?s.sha256:null,
        identityCorroborated:s.identityConfirmed===true
      })),
      claims:Object.values(r.fields||{}).flat().slice(0,30).map((c:any)=>({
        field:safeText(c.field,80),value:safeText(c.value,150),
        quotation:safeText(c.quotation,400),sourceUrl:safeUrl(c.sourceUrl)
      }))
    }))
  };
}
export async function getPublicA26ReviewFeed({
  fetcher=fetch,force=false
}:{fetcher?:typeof fetch;force?:boolean}={}):Promise<A26PublicFeed>{
  if(!force&&snapshot&&Date.now()<snapshot.expires)return snapshot.data;
  // Prefer the stable, automatically updated research-only ref. Older numbered review
  // branches remain a backwards-compatible fallback during first rollout.
  const source=await stableSource(fetcher).catch(()=>publishedSource(fetcher));
  const [fleet,docs,sources,manifest]=await Promise.all([
    pinnedFile('references/fleet-intelligence/discovery-register.json',source.sha,fetcher),
    pinnedFile('references/fleet-intelligence/document-register.json',source.sha,fetcher),
    pinnedFile('references/a26-public-review/source-index.json',source.sha,fetcher),
    pinnedFile('references/a26-public-review/manifest.json',source.sha,fetcher)
  ]);
  const data=validatePublicFeed(fleet,docs,sources,manifest,source);
  snapshot={expires:Date.now()+CACHE_MS,data};
  return data;
}
