/**
 * A26 public fleet intelligence collector. Zero model/API tokens, Node 22.
 * RSS/Atom HEADLINES are discovery leads, not verified operating USV records.
 * Source metadata is retained; no retrieved text is executed or treated as commands.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const CONFIG_PATH = fileURLToPath(new URL('../config/a26-fleet-discovery.json', import.meta.url));
const REGISTER_PATH = fileURLToPath(new URL('../references/fleet-intelligence/discovery-register.json', import.meta.url));
const FEED_HOSTS = new Set(['www.navalnews.com','news.usni.org',
  'www.naval-technology.com','news.google.com']);
const SIGNAL = /\b(?:USV|ASV|unmanned surface (?:vessel|vehicle|craft)|uncrewed surface (?:vessel|vehicle|craft)|autonomous surface (?:vessel|vehicle|craft)|maritime (?:surface )?drone|drone boat|surface drone|robotic surface vessel)\b/i;
const MAX_BYTES = 650000, MAX_SOURCES = 16, MAX_RECORDS = 500, MAX_EVIDENCE = 12;
const sha = value => createHash('sha256').update(value).digest('hex');

export function cleanText(value, max = 280) {
  const txt = String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi,'$1')
    .replace(/<[^>]*>/g,' ')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,m => {
      const dict = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
      const k = m.slice(1,-1).toLowerCase();
      if (dict[k]) return dict[k];
      const cp = k.startsWith('#x') ? parseInt(k.slice(2),16) : Number(k.slice(1));
      return cp > 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff)
        ? String.fromCodePoint(cp) : '';
    })
    .replace(/<[^>]*>/g,' ')
    .replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
  return txt.slice(0,max);
}
const normal = str => cleanText(str,900).normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

export function validateFeedUrl(input) {
  const u = new URL(input);
  if (u.protocol !== 'https:' || !FEED_HOSTS.has(u.hostname) ||
    u.username || u.password || u.port || u.hash ||
    (u.hostname === 'news.google.com' && u.pathname !== '/rss/search') ||
    (u.hostname !== 'news.google.com' && u.search)) {
    throw Error('UNAPPROVED_FEED_URL');
  }
  return u.toString();
}
function articleUrl(input) {
  try {
    const u = new URL(String(input));
    if (u.protocol !== 'https:' || u.username || u.password || u.port ||
      u.hostname.length > 140 || !u.hostname.includes('.') ||
      /(?:\.localhost|\.local|\.internal|\.invalid|\.test)$/.test(u.hostname) ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(u.hostname)) return null;
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(?:utm_.+|gclid|fbclid)$/i.test(key)) u.searchParams.delete(key);
    }
    return u.toString().slice(0,1200);
  } catch { return null; }
}
export function validateConfig(c) {
  if (!c || c.schemaVersion !== 1 || c.agentId !== 'INTEL-USV-26' ||
    c.scope !== 'PUBLIC_METADATA_RESEARCH_ONLY' ||
    !Array.isArray(c.sources) || c.sources.length < 2 || c.sources.length > 6 ||
    !Array.isArray(c.searches) || c.searches.length < 5 || c.searches.length > 10 ||
    !Array.isArray(c.knownModels) || c.knownModels.length < 14 ||
    !Number.isInteger(c.maxItemsPerFeed) || c.maxItemsPerFeed < 1 ||
    c.maxItemsPerFeed > 75 || c.maxCandidates !== MAX_RECORDS) {
    throw Error('FLEET_SCOUT_CONFIG_INVALID');
  }
  const ids = new Set();
  for (const s of c.sources) {
    if (!s || !/^[a-z0-9-]{3,50}$/.test(s.id) || ids.has(s.id) ||
      s.class !== 'TRADE_PRESS') throw Error('INVALID_SOURCE');
    ids.add(s.id);
    validateFeedUrl(s.url);
  }
  const queries = new Set();
  for (const q of c.searches) {
    if (!q || !/^[a-z0-9-]{3,50}$/.test(q.id) || queries.has(q.id) ||
      typeof q.query !== 'string' || q.query.length < 12 || q.query.length > 160) {
      throw Error('INVALID_PUBLIC_SEARCH');
    }
    queries.add(q.id);
  }
  const models = new Set();
  for (const m of c.knownModels) {
    if (!m || !/^USV-[A-Z0-9-]{4,32}$/.test(m.id) || models.has(m.id) ||
      !Array.isArray(m.aliases) || !m.aliases.length ||
      !m.aliases.every(a => typeof a === 'string' && a.length >= 3 && a.length <= 80)) {
      throw Error('INVALID_KNOWN_MODEL_ALIASES');
    }
    models.add(m.id);
  }
  return c;
}
export function sourcePlan(config) {
  validateConfig(config);
  return [
    ...config.sources.map(s => ({...s,url:validateFeedUrl(s.url)})),
    ...config.searches.map(q => {
      const url = new URL('https://news.google.com/rss/search');
      for (const [k,v] of [['q',q.query],['hl','en-US'],['gl','US'],['ceid','US:en']]) {
        url.searchParams.set(k,v);
      }
      return {id:'google-' + q.id,class:'AGGREGATOR_METADATA',url:validateFeedUrl(url.toString())};
    })
  ].slice(0,MAX_SOURCES);
}
const tag = (block,name) => {
  const re = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '\\s*>','i');
  return block.match(re)?.[1] || '';
};
export function parseFeed(xml,maxItems=45) {
  if (typeof xml !== 'string' || xml.length > MAX_BYTES ||
    /<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(xml)) throw Error('INVALID_FEED_BYTES');
  const rows = [];
  for (const x of xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1\s*>/gi)) {
    if (rows.length >= maxItems) break;
    const b = x[2];
    const title = cleanText(tag(b,'title'),240);
    const atom = b.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
    const url = articleUrl(cleanText(tag(b,'link') || atom?.[1],1400));
    if (!title || !url) continue;
    const summary = cleanText(tag(b,'description') || tag(b,'summary') || tag(b,'content'),360);
    const dt = Date.parse(cleanText(tag(b,'pubDate') || tag(b,'published') || tag(b,'updated'),90));
    const publishedAt = Number.isFinite(dt) ? new Date(dt).toISOString() : null;
    rows.push({title,url,summary,publishedAt});
  }
  return rows;
}
async function getFeed(url,fetchImpl) {
  validateFeedUrl(url);
  const response = await fetchImpl(url,{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{Accept:'application/rss+xml,application/atom+xml,application/xml,text/xml'}
  });
  if (!response.ok) throw Error('HTTP_' + response.status);
  if (!/xml|rss|atom/i.test(response.headers.get('content-type') || '')) {
    throw Error('NOT_AN_XML_FEED');
  }
  if (Number(response.headers.get('content-length') || '0') > MAX_BYTES ||
    !response.body) throw Error('FEED_TOO_LARGE_OR_EMPTY');
  const chunks = []; let total=0;
  const rd=response.body.getReader();
  try {
    while(true) {
      const {done,value}=await rd.read();
      if(done) break;
      total+=value.byteLength;
      if(total>MAX_BYTES) throw Error('FEED_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
  } finally {await rd.cancel().catch(()=>{});}
  return Buffer.concat(chunks).toString('utf8');
}
export const emptyRegister = () => ({
  schemaVersion:1,agentId:'INTEL-USV-26',
  classification:'PUBLIC_SOURCE_SAFE_ONLY',records:[]
});
export function validateRegister(reg) {
  if (!reg || reg.schemaVersion !== 1 || reg.agentId !== 'INTEL-USV-26' ||
    reg.classification !== 'PUBLIC_SOURCE_SAFE_ONLY' ||
    !Array.isArray(reg.records) || reg.records.length > MAX_RECORDS) {
    throw Error('UNSAFE_DISCOVERY_REGISTER');
  }
  const ids=new Set();
  for(const r of reg.records) {
    if (!r || !/^A26-FLEET-[0-9a-f]{16}$/.test(r.id) || ids.has(r.id) ||
      r.status !== 'DISCOVERED_UNVERIFIED' || !Array.isArray(r.evidence) ||
      r.evidence.length > MAX_EVIDENCE) throw Error('INVALID_DISCOVERY_RECORD');
    ids.add(r.id);
  }
  return reg;
}
function newCandidate(item,source,feedDigest,now,knownModels) {
  const name = normal(item.title);
  if (name.length < 8) return null;
  const searchable = ' ' + normal(item.title + ' ' + item.summary) + ' ';
  const modelIds = knownModels.filter(m => m.aliases.some(a =>
    searchable.includes(' ' + normal(a) + ' '))).map(m=>m.id).sort();
  return {
    id:'A26-FLEET-' + sha(name).slice(0,16),
    title:item.title,
    summary:item.summary,
    knownModelIds:modelIds,
    modelName:'UNKNOWN_UNLESS_EXISTING_CATALOGUE_MATCH',
    operatorNavy:'UNKNOWN',
    operationalStatus:'UNKNOWN_NOT_VERIFIED',
    status:'DISCOVERED_UNVERIFIED',
    firstSeenAt:now,
    openChecks:['SOURCE_AUTHENTICITY','MODEL_IDENTITY','NAVY_OPERATOR',
      'OPERATIONAL_STATUS','ENGINEERING_PARTICULARS'],
    evidence:[{
      sourceId:source.id,
      sourceClass:source.class,
      publicFeedUrl:source.url,
      publicArticleUrl:item.url,
      publishedAt:item.publishedAt,
      retrievedAt:now,
      feedSha256:'sha256:' + feedDigest,
      entrySha256:'sha256:' + sha(JSON.stringify(item))
    }]
  };
}
export async function runScout({config,baseline=emptyRegister(),fixture=null,
  fetchImpl=fetch,now=new Date().toISOString(),maxSources=MAX_SOURCES}) {
  validateConfig(config);validateRegister(baseline);
  if (!Number.isSafeInteger(maxSources) || maxSources<1 || maxSources>MAX_SOURCES) {
    throw Error('INVALID_SOURCE_LIMIT');
  }
  const plan=sourcePlan(config);
  const register=structuredClone(baseline);
  const indexed=new Map(register.records.map(r=>[r.id,r]));
  const receipts=[]; let leads=0,evidenceAdded=0,duplicates=0,headlineHits=0;
  let limited=maxSources<plan.length;
  for (const source of plan.slice(0,maxSources)) {
    try {
      const xml=fixture ? fixture[source.id] : await getFeed(source.url,fetchImpl);
      if (typeof xml !== 'string') throw Error('FIXTURE_SOURCE_MISSING');
      const feedDigest=sha(xml);
      const entries=parseFeed(xml,config.maxItemsPerFeed);
      let relevant=0;
      for (const item of entries) {
        if (!SIGNAL.test(item.title + ' ' + item.summary)) continue;
        relevant++;headlineHits++;
        const c=newCandidate(item,source,feedDigest,now,config.knownModels);
        if (!c) continue;
        const old=indexed.get(c.id);
        if (old) {
          duplicates++;
          const existingLinks=new Set(old.evidence.map(x=>x.publicArticleUrl));
          for (const e of c.evidence) {
            if (existingLinks.has(e.publicArticleUrl)) continue;
            if (old.evidence.length>=MAX_EVIDENCE) {limited=true;continue;}
            old.evidence.push(e);
            old.knownModelIds=[...new Set([...(old.knownModelIds||[]),...c.knownModelIds])].sort();
            evidenceAdded++;
          }
        } else if(register.records.length<MAX_RECORDS) {
          register.records.push(c);indexed.set(c.id,c);leads++;
        } else limited=true;
      }
      receipts.push({sourceId:source.id,class:source.class,feedUrl:source.url,
        status:'SUCCESS',at:now,feedSha256:'sha256:'+feedDigest,
        entriesSeen:entries.length,headlinesMatched:relevant,vesselsVerified:0});
    } catch(e) {
      receipts.push({sourceId:source.id,class:source.class,feedUrl:source.url,
        status:'FAILED',at:now,failure:String(e?.message||e).slice(0,80),
        entriesSeen:0,headlinesMatched:0,vesselsVerified:0});
    }
  }
  register.records.sort((a,b)=>a.id.localeCompare(b.id));
  const success=receipts.filter(r=>r.status==='SUCCESS').length;
  return {schemaVersion:1,agentId:'INTEL-USV-26',
    collectedAt:now,sourceRevision:'UNKNOWN',
    executionMode:fixture?'OFFLINE_FIXTURE':'PUBLIC_RSS_METADATA',
    evidenceType:'PUBLIC_RSS_HEADLINES_NOT_VERIFIED_VESSELS',
    sourcesAttempted:receipts.length,sourcesSucceeded:success,
    sourcesFailed:receipts.length-success,sourceReceipts:receipts,
    relevantHeadlines:headlineHits,newResearchLeads:leads,
    additionalArticleEvidence:evidenceAdded,duplicateHeadlines:duplicates,
    fleetModelsIndependentlyVerified:0,engineeringCalculationsVerified:0,
    globalCoverageComplete:false,coverageLimited:limited,
    needsIndependentReview:true,engineeringReleaseApproved:false,register};
}
const escapeCell = value => cleanText(value,260).replace(/\|/g,'\\|');
export function toReviewMarkdown(report) {
  const lines=['# A26 worldwide naval USV research discovery queue','',
    '**DISCOVERED_UNVERIFIED — Not an operational naval fleet inventory.**',
    'Collected from public RSS/Atom metadata; not independently verified.',
    'No model tokens, engineering calculations, vessel releases or private Navy data.','',
    'Unreviewed public research leads: '+report.register.records.length,
    'Verified new operating vessels: 0','',
    '| Candidate ID | Headline | Existing model mention | Evidence links |',
    '| --- | --- | --- | --- |'];
  for(const r of report.register.records) {
    const links=r.evidence.slice(0,3).map(e=>'[source]('+e.publicArticleUrl+')').join(', ');
    lines.push('| '+r.id+' | '+escapeCell(r.title)+' | '+
      (r.knownModelIds.join(', ')||'UNKNOWN')+' | '+links+' |');
  }
  lines.push('','## Review gates','',
    '1. Verify each original source, title, publication date, navy/operator and candidate identity.',
    '2. Obtain independent corroboration, preferably a dated official source.',
    '3. Verify every technical field with units and source-specific provenance; leave unknowns as UNKNOWN.',
    '4. Obtain independent engineering and human review before a separate controlled change to the trusted fleet catalogue.',
    '');
  return lines.join('\n');
}
export function toObsidianCandidate(r) {
  const lines=['---','title: "'+r.id+'"','tags: [usv-research-lead, unverified, a26]',
    'status: DISCOVERED_UNVERIFIED','engineering_release: false','---','',
    '# '+escapeCell(r.title),'',
    '> PUBLIC RESEARCH LEAD ONLY. This is not a verified operational model.','',
    'Known catalogue mentions: '+(r.knownModelIds.join(', ')||'UNKNOWN'),
    '','Operator, operational status, dimensions and performance: UNKNOWN.','',
    '## Source metadata',''];
  for(const e of r.evidence){
    lines.push('- '+e.publicArticleUrl+' ('+e.sourceId+', '+(e.publishedAt||'date UNKNOWN')+
      ', entry '+e.entrySha256+')');
  }
  lines.push('','## Review','- [ ] Source verified','- [ ] Model/operator verified',
    '- [ ] Operational status verified','- [ ] Independent specialist approval','');
  return lines.join('\n');
}
function parseArgs(argv) {
  const out={};const fields=new Set(['--config','--previous','--out-dir','--fixture','--max-sources']);
  for(let i=0;i<argv.length;i++){
    const k=argv[i];
    if(k==='--validate-only'){out.validateOnly=true;continue;}
    if(!fields.has(k)||!argv[i+1]||argv[i+1].startsWith('--'))throw Error('INVALID_OPTION: '+k);
    out[k.slice(2)]=argv[++i];
  }
  return out;
}
export async function main(argv=process.argv.slice(2)) {
  const a=parseArgs(argv);
  const config=validateConfig(JSON.parse(await readFile(a.config||CONFIG_PATH,'utf8')));
  let baseline=emptyRegister();
  try {baseline=validateRegister(JSON.parse(await readFile(a.previous||REGISTER_PATH,'utf8')));}
  catch(err){if(err?.code!=='ENOENT')throw err;}
  if(a.validateOnly) {
    console.log(JSON.stringify({valid:true,feeds:sourcePlan(config).length,
      candidates:baseline.records.length,paidModelCalls:0}));return;
  }
  const fixture=a.fixture?JSON.parse(await readFile(a.fixture,'utf8')):null;
  const outDir=a['out-dir']||path.join(os.tmpdir(),'usv01-fleet-scout');
  const report=await runScout({config,baseline,fixture,
    maxSources:a['max-sources']===undefined?MAX_SOURCES:Number(a['max-sources'])});
  try {report.sourceRevision=execFileSync('git',['rev-parse','HEAD'],
    {encoding:'utf8',timeout:5000}).trim();}catch{}
  await mkdir(outDir,{recursive:true,mode:0o700});
  await writeFile(path.join(outDir,'latest.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
  await writeFile(path.join(outDir,'proposal-register.json'),
    JSON.stringify(report.register,null,2)+'\n',{mode:0o600});
  await writeFile(path.join(outDir,'review-queue.md'),toReviewMarkdown(report),{mode:0o600});
  const notes=path.join(outDir,'candidate-notes');
  await mkdir(notes,{recursive:true,mode:0o700});
  for(const r of report.register.records.slice(0,80)){
    await writeFile(path.join(notes,r.id+'.md'),toObsidianCandidate(r),{mode:0o600});
  }
  console.log(JSON.stringify({status:report.sourcesSucceeded?'PUBLIC_METADATA_RETRIEVED_UNVERIFIED':'NO_SOURCES_RETRIEVED',
    sourcesSucceeded:report.sourcesSucceeded,newResearchLeads:report.newResearchLeads,
    addedEvidence:report.additionalArticleEvidence,verifiedNewModels:0,
    needsIndependentReview:true,outDir},null,2));
  if(!report.sourcesSucceeded)process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(e=>{console.error('A26_FLEET_SCOUT_FAILED_CLOSED:',String(e?.message||e));
    process.exitCode=1;});
}
