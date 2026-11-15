/**
 * A26 public-source USV evidence collector.
 * Research only. Never grants engineering certification or downloads restricted files.
 * Node >=20; no paid API, browser automation, or LLM required for collection.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { consolidate } from './unified-evidence.mjs';

const ROOT = path.resolve('.local-concept-research/a26-global-usv');
const SEEDS = new URL('../../references/a26-public-usv-seeds.json', import.meta.url);
const USER_AGENT = 'USV01-A26-PublicResearch/1.0 (research-only; respects robots.txt)';
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = /^(text\/html|text\/plain|application\/pdf)(?:;|$)/i;
const FIELDS = new Set(['length','beam','draft','displacement','hull','propulsion','speed','endurance','range','payload','status','communications','autonomy','launchRecovery']);
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const sha = b => 'sha256:' + createHash('sha256').update(b).digest('hex');
const nowIso = () => new Date().toISOString();
export function normalizeName(s) { return clean(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,''); }
export function canonicalKey(c) { return normalizeName(c.manufacturer) + ':' + normalizeName(c.model); }
export function normalizeText(html) {
  return clean(String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>'));
}
export function verifyClaim(text, claim, source) {
  if (!FIELDS.has(claim.field) || typeof claim.value !== 'string' || typeof claim.quote !== 'string') return null;
  const quote = clean(claim.quote);
  if (quote.length < 12 || !normalizeText(text).toLowerCase().includes(quote.toLowerCase())) return null;
  if (!normalizeName(quote).includes(normalizeName(claim.value))) return null;
  return { field:claim.field, value:claim.value, unit:claim.unit ?? null, quotation:quote,
    sourceId:source.id, sourceUrl:source.url, sha256:source.sha256, acquiredAt:source.retrievedAt,
    evidenceStatus:'QUOTE_MATCHED_UNREVIEWED' };
}
export function deduplicateCandidates(candidates) {
  const map=new Map();
  for(const c of candidates) {
    const key=canonicalKey(c);
    if (!key || key === ':') continue;
    const existing=map.get(key);
    if(existing) {
      existing.aliases=[...new Set([...(existing.aliases||[]),...(c.aliases||[])])];
      existing.sources=[...new Map([...existing.sources,...(c.sources||[])].map(s=>[s.url,s])).values()];
    } else map.set(key,{...c, key, aliases:c.aliases||[], sources:[...(c.sources||[])]});
  }
  return [...map.values()];
}
function publicUrl(raw) {
  const u=new URL(raw);
  if(u.protocol!=='https:' || u.username || u.password || u.port || net.isIP(u.hostname) || 
     u.hostname==='localhost' || u.hostname.endsWith('.local') || u.hostname.endsWith('.internal') ||
     !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)) throw Error('PUBLIC_HTTPS_HOST_REQUIRED');
  u.hash='';
  return u;
}
function robotsAllows(body, targetPath) {
  const groups=[]; let agents=[], rules=[], readingRules=false;
  const finish=()=>{ if(agents.length) groups.push({agents,rules}); agents=[]; rules=[]; readingRules=false; };
  for(const original of body.split(/\r?\n/)){
    const line=original.split('#',1)[0].trim(); const i=line.indexOf(':'); if(i<0) continue;
    const k=line.slice(0,i).trim().toLowerCase(), v=line.slice(i+1).trim();
    if(k==='user-agent'){ if(readingRules) finish(); agents.push(v.toLowerCase()); }
    else if((k==='allow'||k==='disallow') && agents.length){readingRules=true; rules.push({kind:k,path:v});}
  }
  finish();
  const selected=groups.filter(g=>g.agents.some(a=>a==='*'||a==='usv01-a26-publicresearch'));
  let winner=null;
  for(const g of selected) for(const r of g.rules){
    if(!r.path)continue;
    const prefix=r.path.split('*',1)[0].replace(/\$$/,'');
    if(targetPath.startsWith(prefix) && (!winner || prefix.length>winner.length || (prefix.length===winner.length && r.kind==='allow')))
      winner={kind:r.kind,length:prefix.length};
  }
  return !winner || winner.kind==='allow';
}
export function extractDiscoveryLinks(html, sourceUrl, limit=30) {
  const base=publicUrl(sourceUrl), found=new Set();
  for(const m of String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)){
    try{
      const u=publicUrl(new URL(m[1],base).href);
      if(u.hostname!==base.hostname)continue;
      if(!/(usv|uncrewed|unmanned|surface-vessel|autonomous|drix|bluebottle|otter|mantas|devil-ray)/i.test(u.pathname))continue;
      if(/\.(?:zip|exe|dmg|tar|7z|rar)$/i.test(u.pathname))continue;
      found.add(u.href); if(found.size>=limit)break;
    }catch{}
  }
  return [...found];
}
async function getLimited(url, {limit=MAX_BYTES, fetcher=fetch}={}) {
  const response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(20000),
    headers:{'User-Agent':USER_AGENT,'Accept':'text/html, text/plain, application/pdf;q=0.7'}});
  if(response.status>=300 && response.status<400) throw Error('REDIRECT_REQUIRES_REVIEW');
  if(!response.ok) throw Error('HTTP_'+response.status);
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if(!ALLOWED_TYPES.test(type)) throw Error('UNSUPPORTED_CONTENT_TYPE:'+type);
  if(Number(response.headers.get('content-length')||0)>limit)throw Error('SOURCE_TOO_LARGE');
  const reader=response.body?.getReader();if(!reader)throw Error('EMPTY_RESPONSE');
  let size=0;const chunks=[];
  try{
    while(true){const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;if(size>limit)throw Error('SOURCE_TOO_LARGE');
      chunks.push(value);
    }
  }finally{await reader.cancel().catch(()=>{});}
  return {bytes:Buffer.concat(chunks),contentType:type};
}
export async function retrieveSource(entry,{fetcher=fetch,robotsCache=new Map()}={}) {
  const url=publicUrl(entry.url);
  const host=url.origin;let robot=robotsCache.get(host);
  if(robot===undefined){
    const response=await fetcher(host+'/robots.txt',{redirect:'manual',signal:AbortSignal.timeout(12000),
      headers:{'User-Agent':USER_AGENT}});
    if(response.status===404||response.status===410)robot='';
    else if(response.status!==200)throw Error('ROBOTS_NOT_VERIFIED:'+response.status);
    else {robot=await response.text();if(robot.length>200000)throw Error('ROBOTS_TOO_LARGE');}
    robotsCache.set(host,robot);
  }
  if(!robotsAllows(robot,url.pathname))throw Error('ROBOTS_DISALLOWED');
  const {bytes,contentType}=await getLimited(url.href,{fetcher});
  const retrievedAt=nowIso();
  return {id:entry.id, url:url.href, retrievedAt,sha256:sha(bytes),
    contentType, byteLength:bytes.length, bytes, text:contentType.includes('pdf')?'':normalizeText(bytes.toString('utf8'))};
}
async function atomicJson(file,data){
  await mkdir(path.dirname(file),{recursive:true,mode:0o700});
  const tmp=file+'.'+process.pid+'.tmp';
  await writeFile(tmp,JSON.stringify(data,null,2)+'\n',{mode:0o600});
  await rename(tmp,file);
}
async function previousIndex(outDir){
  try{return JSON.parse(await readFile(path.join(outDir,'evidence-index.json'),'utf8'));}
  catch(e){if(e.code==='ENOENT')return null;throw e;}
}
function assertSeed(seed){
  if(!seed.id||!seed.model||!seed.manufacturer||!seed.country||
    !Array.isArray(seed.sources)||seed.sources.length===0)throw Error('INVALID_SEED');
  for(const s of seed.sources){publicUrl(s.url);if(!s.id)throw Error('MISSING_SOURCE_ID');}
}
export async function collect({registryPath,outputDir=ROOT,staleDays=7,fetcher=fetch,delayMs=1100}={}){
  const registry=JSON.parse(await readFile(registryPath||SEEDS,'utf8'));
  if(!Array.isArray(registry)||registry.length>10000)throw Error('INVALID_REGISTRY');
  registry.forEach(assertSeed);
  const candidates=deduplicateCandidates(registry);
  const prior=await previousIndex(outputDir), old=new Map((prior?.records||[]).map(r=>[r.key,r]));
  const robotsCache=new Map(), records=[], discovery=new Set(), errors=[], seenHosts=new Map();
  for(const candidate of candidates){
    const sourceEvidence=[];
    for(const entry of candidate.sources){
      const last=old.get(candidate.key)?.sources?.find(s=>s.id===entry.id && s.url===entry.url);
      const recent=last && last.retrievedAt && (Date.now()-Date.parse(last.retrievedAt)<staleDays*86400000);
      if(recent && last.sha256 && last.blobPath){
        try {await stat(path.join(outputDir,last.blobPath));sourceEvidence.push({...last,cacheUsed:true});continue;}catch{}
      }
      try{
        const host=publicUrl(entry.url).hostname;
        const elapsed=Date.now()-(seenHosts.get(host)||0);
        if(seenHosts.has(host)&&elapsed<delayMs)await new Promise(r=>setTimeout(r,delayMs-elapsed));
        seenHosts.set(host,Date.now());
        const r=await retrieveSource(entry,{fetcher,robotsCache});
        const relative='blobs/'+r.sha256.slice(7)+(r.contentType.includes('pdf')?'.pdf':'.html');
        await mkdir(path.join(outputDir,'blobs'),{recursive:true,mode:0o700});
        await writeFile(path.join(outputDir,relative),r.bytes,{flag:'wx',mode:0o600}).catch(e=>{if(e.code!=='EEXIST')throw e;});
        const normalizedModel=normalizeName(candidate.model);
        const identityConfirmed=r.text && normalizeName(r.text).includes(normalizedModel);
        const claims=(entry.claims||[]).map(c=>verifyClaim(r.text,c,r)).filter(Boolean);
        const found=r.contentType.includes('html')?extractDiscoveryLinks(r.bytes.toString('utf8'),r.url):[];
        found.forEach(x=>discovery.add(x));
        sourceEvidence.push({id:r.id,url:r.url,retrievedAt:r.retrievedAt,sha256:r.sha256,
          byteLength:r.byteLength,contentType:r.contentType,blobPath:relative,
          identityConfirmed:!!identityConfirmed,claims,
          evidenceStatus:identityConfirmed?'SOURCE_IDENTITY_CORROBORATED_UNREVIEWED':'IDENTITY_NOT_CORROBORATED'});
      }catch(e){
        const error=String(e.message||e);
        errors.push({candidate:candidate.key,sourceId:entry.id,error});
        sourceEvidence.push({id:entry.id,url:entry.url,evidenceStatus:'FETCH_FAILED',error});
      }
    }
    const corroborated=sourceEvidence.filter(s=>s.identityConfirmed), hosts=new Set(corroborated.map(s=>new URL(s.url).hostname));
    const fields=Object.fromEntries([...FIELDS].map(field=>[field,sourceEvidence.flatMap(s=>s.claims||[]).filter(c=>c.field===field)]));
    const confidence=corroborated.length===0?0:hosts.size>1?0.7:0.4;
    records.push({key:candidate.key,model:candidate.model,manufacturer:candidate.manufacturer,
      country:candidate.country,aliases:candidate.aliases,statusClaim:candidate.status||'UNKNOWN',
      evidenceStatus:corroborated.length?'SOURCE_CORROBORATED_REVIEW_REQUIRED':'UNVERIFIED',
      confidence,uncertainty:'PUBLIC_SOURCE_ONLY_NOT_INDEPENDENTLY_REVIEWED',
      sources:sourceEvidence,fields,engineeringReleaseApproved:false});
  }
  const countries=[...new Set(records.map(r=>r.country))];
  const report={generatedAt:nowIso(),agentId:'INTEL-USV-26',classification:'PUBLIC_SOURCE_SAFE_ONLY',
    totalCandidateModels:records.length,countriesRepresented:countries.length,countries,
    identityCorroborated:records.filter(r=>r.confidence>0).length,
    fieldEvidenceItems:records.flatMap(r=>Object.values(r.fields).flat()).length,
    sourceFailures:errors.length,unreviewedDiscoveryLinks:discovery.size,
    globalCompleteness:'UNKNOWN_NOT_CLAIMED',researchAcceptancePassed:false,
    independentlyValidated:0,engineeringReleaseApproved:false};
  const index={schemaVersion:1,generatedAt:report.generatedAt,records,errors,
    discoveryCandidates:[...discovery].slice(0,5000),report};
  await atomicJson(path.join(outputDir,'evidence-index.json'),index);
  await atomicJson(path.join(outputDir,'coverage-report.json'),report);
  // Every manufacturer/institution collector run publishes the same A26
  // evidence contract as fleet/knowledge adapters, with zero auto-certification.
  await atomicJson(path.join(outputDir,'unified-a26-evidence.json'),consolidate({snapshots:index}));
  return report;
}
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  const args=process.argv.slice(2),flag=(k,d)=>{const p=args.indexOf(k);return p<0?d:args[p+1];};
  const command=args[0]||'collect';
  if(!['collect','report'].includes(command)){console.error('Usage: node scripts/a26/global-research.mjs collect|report [--registry path] [--out path] [--stale-days N]');process.exitCode=2;}
  else {
    try{
      const out=path.resolve(flag('--out',ROOT));
      if(command==='report'){
        const data=await previousIndex(out);
        if(!data)throw Error('NO_EVIDENCE_INDEX');
        console.log(JSON.stringify(data.report,null,2));
      }else{
        const staleDays=Number(flag('--stale-days','7'));
        if(!Number.isFinite(staleDays)||staleDays<0||staleDays>365)throw Error('INVALID_STALE_DAYS');
        const report=await collect({registryPath:flag('--registry',undefined),outputDir:out,staleDays});
        console.log(JSON.stringify(report,null,2));
      }
    }catch(e){console.error('A26 public-source collector failed:',e.message);process.exitCode=1;}
  }
}
