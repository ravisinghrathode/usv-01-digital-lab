/**
 * A26 scholarly/document intelligence catalogue.
 * Public OpenAlex metadata, bounded and deduplicated. File byte downloads are
 * explicit opt-in, restricted to trustworthy hosts with explicit open licenses.
 * Binary/source content is never executed and never promoted to engineering
 * evidence without independent review. OpenAlex may throttle unauthenticated
 * users; no paid key or bypass is used.
 */
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
const CONFIG=fileURLToPath(new URL('../config/a26-document-research.json',import.meta.url));
const MAX_JSON_BYTES=3_000_000,MAX_PDF_BYTES=14_000_000;
const PDF_HOSTS=new Set(['arxiv.org','www.arxiv.org','zenodo.org']);
const OPEN_LICENSES=new Set(['cc-by','cc-by-sa','cc0','public-domain','cc0-1.0','cc-by-4.0','cc-by-sa-4.0']);
const hash=b=>createHash('sha256').update(b).digest('hex');
const txt=(s,n=260)=>String(s||'').replace(/<[^>]+>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
function safePublicUrl(value){
  try{
    const u=new URL(String(value));
    if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||
      /^(\d+\.){3}\d+$/.test(u.hostname)||u.hostname==='localhost'||
      /(?:\.local|\.internal|\.localhost)$/.test(u.hostname))return null;
    u.hash='';
    return u.toString().slice(0,1300);
  }catch{return null;}
}
function openLicense(str){return OPEN_LICENSES.has(String(str||'').toLowerCase());}
function archiveApproved(value,license){
  const url=safePublicUrl(value);
  if(!url || !openLicense(license)) return null;
  const u=new URL(url);
  if(!PDF_HOSTS.has(u.hostname))return null;
  if(u.hostname.includes('arxiv.org') && !/^\/pdf\/[0-9]{4}\.[0-9]{4,5}(?:v\d+)?(?:\.pdf)?$/.test(u.pathname))return null;
  if(u.hostname==='zenodo.org' && !/^\/(?:records|record)\/\d+\/files\/[^/]+\.pdf$/i.test(u.pathname))return null;
  return url;
}
export function validateDocumentConfig(c){
  if(!c||c.schemaVersion!==1||c.agentId!=='INTEL-USV-26'||
    !Array.isArray(c.queries)||c.queries.length<5||c.queries.length>25||
    !Number.isSafeInteger(c.perQuery)||c.perQuery<1||c.perQuery>50||
    !Number.isSafeInteger(c.maxDownloads)||c.maxDownloads<0||c.maxDownloads>10||
    !c.queries.every(q=>typeof q==='string'&&q.length>=12&&q.length<=160))throw Error('INVALID_DOCUMENT_RESEARCH_CONFIG');
  return c;
}
export function openAlexUrl(query,perQuery){
  const u=new URL('https://api.openalex.org/works');
  u.searchParams.set('search',query);
  u.searchParams.set('per_page',String(perQuery));
  u.searchParams.set('page','1');
  u.searchParams.set('sort','relevance_score:desc');
  return u.toString();
}
export function mapScholarlyWork(work,query,retrievedAt){
  if(!work||typeof work!=='object')return null;
  const id=String(work.id||'');
  if(!/^https:\/\/openalex\.org\/W\d+$/.test(id))return null;
  const title=txt(work.title||work.display_name,350);
  if(title.length<8)return null;
  const doi=safePublicUrl(work.doi);
  const location=work.best_oa_location||{};
  const pdfUrl=safePublicUrl(location.pdf_url);
  const landingPage=safePublicUrl(location.landing_page_url);
  const license=txt(location.license,70)||'UNKNOWN';
  const authors=Array.isArray(work.authorships)?
    work.authorships.slice(0,12).map(a=>txt(a.author?.display_name,80)).filter(Boolean):[];
  const paper={
    id:'A26-PAPER-'+id.split('/').at(-1),
    openAlexId:id,
    title,
    publishedAt:typeof work.publication_date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(work.publication_date)
      ?work.publication_date:null,
    type:txt(work.type,70)||'UNKNOWN',
    doi,authors,
    sourceUrl:landingPage||doi||id,
    openAccessStatus:work.open_access?.is_oa===true?'INDEXED_OPEN_ACCESS':'UNKNOWN_OR_NOT_OA',
    openLicenseMetadata:license,
    fullTextPdfLink:pdfUrl,
    archiveEligible:!!archiveApproved(pdfUrl,license),
    documentStatus:'PUBLIC_METADATA_UNVERIFIED',
    researchTerms:[query],
    retrievedAt,
    evidenceHash:'sha256:'+hash(JSON.stringify({id,title,doi,license,pdfUrl,authors,
      retrievedAt}))
  };
  return paper;
}
async function jsonSource(url,fetchImpl){
  const u=new URL(url);
  if(u.protocol!=='https:'||u.hostname!=='api.openalex.org'||u.pathname!=='/works')throw Error('UNAUTHORIZED_SCHOLAR_API');
  const response=await fetchImpl(url,{method:'GET',redirect:'error',
    signal:AbortSignal.timeout(15000),headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('HTTP_'+response.status);
  if(!/json/i.test(response.headers.get('content-type')||''))throw Error('NOT_JSON');
  const size=Number(response.headers.get('content-length')||0);
  if(size>MAX_JSON_BYTES)throw Error('JSON_OVER_LIMIT');
  const buf=await boundedBytes(response,MAX_JSON_BYTES);
  return {sha256:'sha256:'+hash(buf),data:JSON.parse(buf.toString('utf8'))};
}
async function boundedBytes(response,limit){
  if(!response.body)throw Error('BODY_MISSING');
  const reader=response.body.getReader();let size=0;const chunks=[];
  try{
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>limit)throw Error('DOWNLOAD_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
  }finally{await reader.cancel().catch(()=>{});}
  return Buffer.concat(chunks);
}
export async function collectDocuments({config,fixture=null,fetchImpl=fetch,now=new Date().toISOString()}){
  validateDocumentConfig(config);
  const index=new Map(),receipts=[];
  for(const query of config.queries){
    const endpoint=openAlexUrl(query,config.perQuery);
    try{
      const received=fixture?{sha256:'sha256:'+hash(JSON.stringify(fixture[query]||{})),
        data:fixture[query]}:await jsonSource(endpoint,fetchImpl);
      if(!received.data || !Array.isArray(received.data.results))throw Error('MALFORMED_SCHOLAR_RESPONSE');
      let rows=0;
      for(const work of received.data.results.slice(0,config.perQuery)){
        const rec=mapScholarlyWork(work,query,now);
        if(!rec)continue;
        const prev=index.get(rec.id);
        if(prev){
          prev.researchTerms=[...new Set([...prev.researchTerms,query])].sort();
        }else{
          index.set(rec.id,rec);rows++;
        }
      }
      receipts.push({query,endpoint,status:'SUCCESS',metadataSha256:received.sha256,
        newRecords:rows,at:now});
    }catch(e){
      receipts.push({query,endpoint,status:'FAILED',
        reason:String(e?.message||e).slice(0,90),newRecords:0,at:now});
    }
  }
  const records=[...index.values()].sort((a,b)=>a.id.localeCompare(b.id));
  return {
    schemaVersion:1,agentId:'INTEL-USV-26',status:'DOCUMENT_METADATA_UNVERIFIED',
    retrievedAt:now,scope:'PUBLIC_ACADEMIC_AND_ENGINEERING_REFERENCES_ONLY',
    records,receipts,results:records.length,
    queriesAttempted:receipts.length,
    queriesSucceeded:receipts.filter(r=>r.status==='SUCCESS').length,
    fileLinks:records.filter(r=>r.fullTextPdfLink).length,
    eligibleOpenLicenseLinks:records.filter(r=>r.archiveEligible).length,
    filesDownloaded:0,filesVerifiedForEngineering:0,
    humanReviewRequired:true,engineeringReleaseApproved:false
  };
}
export async function archiveOpenLicensePdfs(report,{dir,fetchImpl=fetch,limit=8}){
  if(!Number.isInteger(limit)||limit<0||limit>10)throw Error('INVALID_ARCHIVE_BUDGET');
  await mkdir(dir,{recursive:true,mode:0o700});
  const receipts=[];const seen=new Set();let downloaded=0;
  for(const paper of report.records){
    if(downloaded>=limit)break;
    const url=archiveApproved(paper.fullTextPdfLink,paper.openLicenseMetadata);
    if(!url||seen.has(url))continue;
    seen.add(url);
    try{
      const response=await fetchImpl(url,{method:'GET',redirect:'error',
        signal:AbortSignal.timeout(20000),headers:{Accept:'application/pdf'}});
      if(!response.ok)throw Error('HTTP_'+response.status);
      if(!/pdf|octet-stream/i.test(response.headers.get('content-type')||''))
        throw Error('UNEXPECTED_DOCUMENT_TYPE');
      const bytes=await boundedBytes(response,MAX_PDF_BYTES);
      if(bytes.subarray(0,5).toString('ascii')!=='%PDF-')throw Error('INVALID_PDF_HEADER');
      const digest=hash(bytes);
      await writeFile(path.join(dir,digest+'.pdf'),bytes,{flag:'wx',mode:0o600});
      downloaded++;
      receipts.push({paperId:paper.id,publicUrl:url,
        licenseMetadata:paper.openLicenseMetadata,
        sha256:'sha256:'+digest,bytes:bytes.length,
        status:'BYTES_RETRIEVED_UNVERIFIED_LICENSE_AND_CONTENT',at:new Date().toISOString()});
    }catch(e){receipts.push({paperId:paper.id,publicUrl:url,status:'FAILED',
      reason:String(e?.message||e).slice(0,100)});}
  }
  return receipts;
}
function parseArgs(argv){
  const obj={};const fields=new Set(['--out-dir','--fixture','--max-downloads']);
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--validate-only'||argv[i]==='--download-open-licensed'){
      obj[argv[i].slice(2)]=true;continue;
    }
    if(!fields.has(argv[i])||!argv[i+1]||argv[i+1].startsWith('--'))
      throw Error('INVALID_ARG: '+argv[i]);
    obj[argv[i].slice(2)]=argv[++i];
  }
  return obj;
}
async function main(){
  const args=parseArgs(process.argv.slice(2));
  const config=validateDocumentConfig(JSON.parse(await readFile(CONFIG,'utf8')));
  if(args['validate-only']){console.log(JSON.stringify({valid:true,
    plannedQueries:config.queries.length,modelCalls:0}));return;}
  const fixture=args.fixture?JSON.parse(await readFile(args.fixture,'utf8')):null;
  const outDir=args['out-dir']||path.join(os.tmpdir(),'usv01-a26-scholarly');
  const result=await collectDocuments({config,fixture});
  await mkdir(outDir,{recursive:true,mode:0o700});
  let archived=[];
  if(args['download-open-licensed']){
    archived=await archiveOpenLicensePdfs(result,{dir:path.join(outDir,'licensed-pdfs'),
      limit:args['max-downloads']===undefined?config.maxDownloads:Number(args['max-downloads'])});
  }
  result.filesDownloaded=archived.filter(r=>r.sha256).length;
  await writeFile(path.join(outDir,'papers-and-references.json'),
    JSON.stringify(result,null,2)+'\n',{mode:0o600});
  await writeFile(path.join(outDir,'file-receipts.json'),
    JSON.stringify(archived,null,2)+'\n',{mode:0o600});
  const md=['# A26 public technical document discovery','',
    '**UNVERIFIED METADATA: NOT an engineering publication acceptance.**','',
    'Found '+result.records.length+' distinct scholarly identifiers; '+result.fileLinks+
    ' open-access PDF URLs, '+result.filesDownloaded+' explicitly licensed archived PDFs.','',
    '| Title | DOI / Source | OA license metadata | PDF link |',
    '| --- | --- | --- | --- |'];
  for(const r of result.records.slice(0,300)){
    const name=r.title.replace(/[|[\]]/g,' ').slice(0,100);
    md.push('| '+name+' | '+(r.doi||r.openAlexId)+' | '+r.openLicenseMetadata+
      ' | '+(r.fullTextPdfLink||'UNKNOWN')+' |');
  }
  await writeFile(path.join(outDir,'research-index.md'),md.join('\n')+'\n',{mode:0o600});
  console.log(JSON.stringify({status:result.status,works:result.results,
    successfulQueries:result.queriesSucceeded,oaLinks:result.fileLinks,
    eligibleDownloads:result.eligibleOpenLicenseLinks,
    downloaded:result.filesDownloaded,verifiedEngineeringPapers:0,
    outDir},null,2));
  if(!result.queriesSucceeded)process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(e=>{console.error('A26_DOCUMENTS_FAIL_CLOSED:',String(e?.message||e));
    process.exitCode=1;});
}
