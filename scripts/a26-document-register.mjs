/**
 * Persistent scholarly metadata register. Enriches the review queue only;
 * never turns OpenAlex records, URLs or downloaded PDFs into approved facts.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const REGISTER=fileURLToPath(new URL('../references/fleet-intelligence/document-register.json',import.meta.url));
export const emptyDocumentRegister=()=>({schemaVersion:1,
  agentId:'INTEL-USV-26',classification:'PUBLIC_SOURCE_SAFE_ONLY',
  reviewStatus:'UNVERIFIED_PUBLIC_DOCUMENTS',records:[]});
export function validateDocumentRegister(d){
  if(!d||d.schemaVersion!==1||d.agentId!=='INTEL-USV-26'||
    d.reviewStatus!=='UNVERIFIED_PUBLIC_DOCUMENTS'||
    !Array.isArray(d.records)||d.records.length>3000)throw Error('BAD_DOCUMENT_REGISTER');
  const ids=new Set();
  for(const rec of d.records){
    if(!rec||!/^A26-PAPER-W\d+$/.test(rec.id)||ids.has(rec.id)||
      rec.reviewStatus!=='REVIEW_REQUIRED'||
      !Array.isArray(rec.sourceVersions)||rec.sourceVersions.length>8||
      rec.sourceVersions.some(v=>!/^sha256:[0-9a-f]{64}$/.test(v.hash))){
      throw Error('BAD_DOCUMENT_EVIDENCE');
    }
    ids.add(rec.id);
  }
  return d;
}
export function mergeDocumentSources(register,harvest){
  validateDocumentRegister(register);
  if(!harvest||harvest.agentId!=='INTEL-USV-26'||harvest.status!=='DOCUMENT_METADATA_UNVERIFIED'||
    !Array.isArray(harvest.records)||harvest.records.length>3000){
    throw Error('UNTRUSTED_DOCUMENT_HARVEST');
  }
  const next=structuredClone(register);
  const index=new Map(next.records.map(r=>[r.id,r]));
  let discovered=0,changed=0;
  for(const entry of harvest.records){
    if(!/^A26-PAPER-W\d+$/.test(entry.id)||entry.documentStatus!=='PUBLIC_METADATA_UNVERIFIED'||
      !/^sha256:[a-f0-9]{64}$/.test(entry.evidenceHash))throw Error('UNSAFE_DOCUMENT_INPUT');
    const previous=index.get(entry.id);
    if(!previous){
      if(next.records.length>=3000)break;
      next.records.push({
        ...entry,reviewStatus:'REVIEW_REQUIRED',
        firstDiscoveredAt:harvest.retrievedAt,
        sourceVersions:[{hash:entry.evidenceHash,observedAt:harvest.retrievedAt}]
      });
      index.set(entry.id,next.records.at(-1));discovered++;
    }else{
      if(!previous.sourceVersions.some(v=>v.hash===entry.evidenceHash)){
        if(previous.sourceVersions.length>=8)throw Error('DOCUMENT_EVIDENCE_HISTORY_AT_CAPACITY');
        previous.sourceVersions.push({hash:entry.evidenceHash,observedAt:harvest.retrievedAt});
        previous.pendingMetadataChange={
          title:entry.title,doi:entry.doi,fullTextPdfLink:entry.fullTextPdfLink,
          openLicenseMetadata:entry.openLicenseMetadata,
          evidenceHash:entry.evidenceHash,
          reviewStatus:'CONFLICT_REVIEW_REQUIRED'
        };
        changed++;
      }
      previous.researchTerms=[...new Set([
        ...previous.researchTerms,...entry.researchTerms])].sort();
    }
  }
  next.records.sort((a,b)=>a.id.localeCompare(b.id));
  return {register:next,discovered,changed,total:next.records.length,
    approvedEngineeringPublications:0};
}
export function documentMarkdown(register){
  return ['# A26 public USV technical reference research queue','',
    '**All entries are UNVERIFIED source metadata pending independent review.**',
    'No paper, formula, dimension or file is approved as engineering evidence.','',
    'Discovered scholarly identifiers: '+register.records.length,'',
    '| Paper ID | Title | Primary link / DOI | OA license metadata | Review |',
    '| --- | --- | --- | --- | --- |',
    ...register.records.map(r=>'| '+r.id+' | '+
      r.title.replace(/[|\r\n]/g,' ').slice(0,110)+' | '+
      (r.doi||r.sourceUrl||r.openAlexId)+' | '+
      r.openLicenseMetadata+' | '+(r.pendingMetadataChange?'METADATA_CHANGE_PENDING':'REVIEW_REQUIRED')+' |'),
    '','## Release process','',
    '1. Check original paper identity, publisher, license and version.',
    '2. Inspect verified PDF bytes and citation claims; PDF retrieval alone is not valid technical evidence.',
    '3. Record applicability, assumptions and units; review separately against USV-01 source-controlled configuration.',
    '4. Promote only through independent engineering validation and the existing human review gate.',
    ''].join('\n');
}
function parse(argv){
  const args={};const opts=new Set(['--harvest','--out-dir']);
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--validate-only'){args.validateOnly=true;continue;}
    if(!opts.has(argv[i])||!argv[i+1]||argv[i+1].startsWith('--'))throw Error('INVALID_ARGUMENT');
    args[argv[i].slice(2)]=argv[++i];
  }
  return args;
}
async function main(){
  const a=parse(process.argv.slice(2));
  const old=validateDocumentRegister(JSON.parse(await readFile(REGISTER,'utf8')));
  if(a.validateOnly){console.log(JSON.stringify({valid:true,existing:old.records.length,modelCalls:0}));return;}
  if(!a.harvest||!a['out-dir'])throw Error('--harvest and --out-dir are required');
  const newHarvest=JSON.parse(await readFile(a.harvest,'utf8'));
  const delta=mergeDocumentSources(old,newHarvest);
  await mkdir(a['out-dir'],{recursive:true,mode:0o700});
  await writeFile(path.join(a['out-dir'],'document-register-proposal.json'),
    JSON.stringify(delta.register,null,2)+'\n',{mode:0o600});
  await writeFile(path.join(a['out-dir'],'document-review-queue.md'),
    documentMarkdown(delta.register),{mode:0o600});
  console.log(JSON.stringify({status:'UNVERIFIED_DOCUMENT_PROPOSAL',...delta,
    register:undefined},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(e=>{console.error('A26_DOCUMENT_REGISTER_HOLD:',String(e?.message||e));
    process.exitCode=1;});
}
