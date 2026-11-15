/**
 * Single A26 evidence contract for worldwide fleet discoveries,
 * scholarly knowledge and retrieved manufacturer/source snapshots.
 * Input files are UNTRUSTED data; consolidation never certifies a claim.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';

const AGENT='INTEL-USV-26', CLASS='PUBLIC_SOURCE_SAFE_ONLY';
const hash=s=>'sha256:'+createHash('sha256').update(s).digest('hex');
const text=(x,n=600)=>String(x??'').replace(/[\u0000-\u001f\u007f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const normalized=s=>text(s).normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,'');
function safeUrl(input){
  if(!input)return null;
  try {
    const u=new URL(String(input));
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname==='localhost'||!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)||/(\.local|\.internal|\.invalid|\.test)$/i.test(u.hostname))return null;
    u.hash='';
    return u.toString().slice(0,1200);
  }catch{return null;}
}
function normalizedSource({kind,id,title,url,sourceHash,observedAt,rawStatus,sourceRecords=[],claims=[],country=null,model=null}){
  const href=safeUrl(url);
  const evidenceHash=/^sha256:[a-f0-9]{64}$/.test(String(sourceHash||''))?sourceHash:null;
  const originalId=text(id,150);
  if(!originalId||!['FLEET_LEAD','KNOWLEDGE_DOCUMENT','USV_SOURCE_SNAPSHOT'].includes(kind))throw Error('INVALID_A26_EVIDENCE_KIND_OR_ID');
  return {
    id:kind+':'+originalId,agentId:AGENT,classification:CLASS,
    kind,title:text(title,240),url:href,
    sourceHash:evidenceHash,observedAt:typeof observedAt==='string'?observedAt:null,
    collectionStatus:text(rawStatus,80),country:country?text(country,80):null,
    model:model?text(model,120):null,
    sourceRecords:sourceRecords.map(x=>({url:safeUrl(x.url),sha256:/^sha256:[a-f0-9]{64}$/.test(String(x.sha256||''))?x.sha256:null,sourceId:text(x.sourceId,120)})),
    claims:claims.map(c=>({field:text(c.field,80),value:text(c.value,180),quotation:text(c.quotation,320),sourceId:text(c.sourceId,120),
      status:'QUOTE_MATCHED_UNREVIEWED'})),
    status:'UNVERIFIED_REVIEW_REQUIRED',engineeringReleaseApproved:false
  };
}
function checked(input,kind){
  if(!input||input.schemaVersion!==1||input.agentId!==AGENT)throw Error('A26_'+kind+'_SCHEMA_INVALID');
  if(input.classification && input.classification!==CLASS)throw Error('A26_CLASSIFICATION_MISMATCH');
  return input;
}
export function fromFleetRegister(input) {
  const obj=checked(input,'FLEET');
  // PR123 writes a run report with register.records or a persistent register.
  const records=obj.register?.records||obj.records;
  if(!Array.isArray(records)||records.length>2000)throw Error('A26_FLEET_RECORDS_INVALID');
  return records.map(r=>{
    if(r.status!=='DISCOVERED_UNVERIFIED')throw Error('A26_FLEET_EVIDENCE_PROMOTION_FORBIDDEN');
    const refs=(r.evidence||[]).slice(0,24);
    return normalizedSource({kind:'FLEET_LEAD',id:r.id,title:r.title,url:refs[0]?.publicArticleUrl,
      observedAt:r.firstSeenAt,rawStatus:r.status,sourceHash:refs[0]?.entrySha256,
      sourceRecords:refs.map(e=>({url:e.publicArticleUrl,sha256:e.entrySha256,sourceId:e.sourceId}))});
  });
}
export function fromDocumentRegister(input){
  const obj=checked(input,'DOCUMENTS');
  if(obj.reviewStatus!=='UNVERIFIED_PUBLIC_DOCUMENTS'||!Array.isArray(obj.records)||obj.records.length>3000)
    throw Error('A26_DOCUMENT_RECORDS_INVALID');
  return obj.records.map(r=>{
    if(r.reviewStatus!=='REVIEW_REQUIRED')throw Error('A26_DOCUMENT_PROMOTION_FORBIDDEN');
    return normalizedSource({kind:'KNOWLEDGE_DOCUMENT',id:r.id,title:r.title,
      url:r.doi||r.sourceUrl||r.openAlexId,observedAt:r.firstDiscoveredAt,
      rawStatus:r.reviewStatus,sourceHash:r.evidenceHash||r.sourceVersions?.at(-1)?.hash,
      sourceRecords:(r.sourceVersions||[]).map(v=>({url:r.doi||r.sourceUrl,sha256:v.hash,sourceId:r.id}))});
  });
}
export function fromSnapshotIndex(input){
  if(!input||input.schemaVersion!==1||!Array.isArray(input.records)||input.records.length>10000||
    input.report?.engineeringReleaseApproved!==false)throw Error('A26_SNAPSHOT_INDEX_INVALID');
  return input.records.flatMap(r=>(r.sources||[]).filter(s=>s.identityConfirmed===true &&
     /^sha256:[a-f0-9]{64}$/.test(String(s.sha256||''))).map(s=>normalizedSource({
    kind:'USV_SOURCE_SNAPSHOT',id:r.key+'@'+s.id,title:r.model,url:s.url,
    model:r.model,country:r.country,observedAt:s.retrievedAt,sourceHash:s.sha256,
    rawStatus:s.evidenceStatus,sourceRecords:[{url:s.url,sha256:s.sha256,sourceId:s.id}],
    claims:(s.claims||[]).map(c=>({...c,sourceId:s.id}))
  })));
}
export function consolidate({fleet=null,documents=null,snapshots=null}={}){
  const inputs=[...(fleet?fromFleetRegister(fleet):[]),
    ...(documents?fromDocumentRegister(documents):[]),
    ...(snapshots?fromSnapshotIndex(snapshots):[])];
  const map=new Map(),conflicts=[];
  for(const row of inputs) {
    if(!row.url)continue;
    const key=row.kind+':'+normalized(row.id);
    const prev=map.get(key);
    if(prev&&prev.sourceHash!==row.sourceHash){
      conflicts.push({id:row.id,oldHash:prev.sourceHash,newHash:row.sourceHash,
        status:'SOURCE_REVISION_CONFLICT_REVIEW_REQUIRED'});
      continue;
    }
    map.set(key,row);
  }
  const records=[...map.values()].sort((a,b)=>a.id.localeCompare(b.id));
  const relations=[];
  // Typed cross-domain relationships are candidate associations only, never assertions.
  const vessel=records.filter(r=>r.kind==='USV_SOURCE_SNAPSHOT'&&r.model);
  for(const fleetRow of records.filter(r=>r.kind==='FLEET_LEAD')){
    for(const s of vessel){
      if(normalized(s.model).length>4&&normalized(fleetRow.title).includes(normalized(s.model)))
        relations.push({from:fleetRow.id,to:s.id,type:'MENTIONS_MODEL_UNVERIFIED',reviewStatus:'PENDING'});
    }
  }
  return {schemaVersion:1,agentId:AGENT,classification:CLASS,
    generatedAt:new Date().toISOString(),evidenceContract:'A26_UNIFIED_PUBLIC_RESEARCH_V1',
    records,relations,conflicts,statistics:{
      fleetLeads:records.filter(x=>x.kind==='FLEET_LEAD').length,
      knowledgeDocuments:records.filter(x=>x.kind==='KNOWLEDGE_DOCUMENT').length,
      usvSourceSnapshots:records.filter(x=>x.kind==='USV_SOURCE_SNAPSHOT').length,
      evidenceVersionConflicts:conflicts.length
    },sourcesIndependentlyReviewed:0,engineeringReleaseApproved:false,
    globalCompletenessClaimed:false,knowledgeGraphStatus:'UNVERIFIED_DRAFT_ONLY'};
}
export function obsidianDraft(record){
  const esc=x=>text(x,250).replace(/["\\]/g,'');
  return [
    '---','id: "'+esc(record.id)+'"','tags: [a26, public-research, unverified]',
    'review_status: UNVERIFIED_REVIEW_REQUIRED','engineering_release: false',
    '---','','# '+record.title,'',
    '> UNVERIFIED PUBLIC RESEARCH: not approved engineering evidence.','',
    'Type: '+record.kind,'','Primary source: '+(record.url||'NOT_AVAILABLE'),
    '','Source SHA-256: '+(record.sourceHash||'UNKNOWN'),
    '','## Claims for independent review','',
    ...(record.claims.length?record.claims.map(c=>'- '+c.field+': '+c.value+' — "'+c.quotation+'" (UNVERIFIED)'):['- No independently reviewed engineering claims']),
    '','## Verification gates','','- [ ] Original source reviewed',
    '- [ ] Publication/licensing and applicability checked',
    '- [ ] Independent engineering assessment recorded',''
  ].join('\n');
}
async function readLimited(file,max=20*1024*1024){
 const bytes=await readFile(file);if(bytes.byteLength>max)throw Error('A26_INPUT_TOO_LARGE');
 return JSON.parse(bytes.toString('utf8'));
}
async function safeWrite(file,data){
 await mkdir(path.dirname(file),{recursive:true,mode:0o700});
 const temp=file+'.'+process.pid+'.tmp';await writeFile(temp,data,{mode:0o600});await rename(temp,file);
}
async function main(){
 const args=process.argv.slice(2),flag=k=>{const i=args.indexOf(k);return i<0?null:args[i+1];};
 if(!flag('--out'))throw Error('Expected --out DIRECTORY and one or more of --fleet, --documents, --snapshots');
 const files={fleet:flag('--fleet'),documents:flag('--documents'),snapshots:flag('--snapshots')};
 if(!Object.values(files).some(Boolean))throw Error('NO_EVIDENCE_INPUTS');
 const data={};for(const [k,v] of Object.entries(files))if(v)data[k]=await readLimited(v);
 const result=consolidate(data),dir=path.resolve(flag('--out'));
 await safeWrite(path.join(dir,'unified-a26-evidence.json'),JSON.stringify(result,null,2)+'\n');
 await mkdir(path.join(dir,'obsidian-unverified'),{recursive:true,mode:0o700});
 for(const row of result.records.slice(0,200)){
   const file=hash(row.id).slice(7,23)+'.md';
   await safeWrite(path.join(dir,'obsidian-unverified',file),obsidianDraft(row));
 }
 console.log(JSON.stringify({status:'UNVERIFIED_CONSOLIDATED',...result.statistics,
   reviewRequired:true,engineeringReleaseApproved:false,outDir:dir},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 main().catch(e=>{console.error('A26_UNIFIED_INTAKE_HOLD:',e.message);process.exitCode=1;});
}
