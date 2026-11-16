/**
 * USV-01 A26 read-only all-repository source screen. Never clones, installs,
 * runs third-party code, or upgrades software/engineering authority.
 * Node >=22; no external packages or paid AI calls.
 */
import {readFile, writeFile, mkdir, appendFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateRegister, REGISTER_FILE} from './external-software-register.mjs';

export const QUEUE_FILE=fileURLToPath(new URL('../references/third-party-static-audits/A26_ALL_97_REVIEW_QUEUE_2026-11-17.json',import.meta.url));
const SHA=/^[a-f0-9]{40}$/;
const REPO=/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const LICENSE=/^(?:LICEN[CS]E(?:[-._].*)?|COPYING(?:[-._].*)?)$/i;
const MANIFEST=/^(?:pyproject\.toml|uv\.lock|poetry\.lock|Pipfile(?:\.lock)?|requirements[^/]*\.txt|package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lock|Cargo\.(?:toml|lock)|go\.(?:mod|sum)|pom\.xml|gradle\.properties|build\.gradle(?:\.kts)?|Gemfile(?:\.lock)?|environment\.ya?ml|setup\.(?:py|cfg)|Dockerfile(?:\..*)?|docker-compose.*|CMakeLists\.txt|Makefile|platformio\.ini|.*\.sln)$/i;
const P1=new Set(['cybergalactic/MSS','cybergalactic/PythonVehicleSimulator','SINTEF/FEEMS','ntnu-itk-autonomous-ship-lab/colav-simulator','ktuukkan/marine-api','janibert1/ship-hull-generator','CaptanG/striptheory','Neumi/open_echo'].map(x=>x.toLowerCase()));

export function makeQueue(db) {
 validateRegister(db);
 if(db.records.length!==97)throw Error('Expected 97 original public-source records; update this controlled screen when the source baseline changes');
 return {
  schemaVersion:1, recordId:'USV01-A26-ALL97-REVIEW-20261117',
  sourceRegisterId:db.registerId, date:'2026-11-17',
  classification:'PUBLIC_SOURCE_SAFE_ONLY', execution:'NO_THIRD_PARTY_CODE_EXECUTED',
  authority:'RESEARCH_ONLY_NOT_APPROVED', expectedRecords:97,
  entries:db.records.map(r=>({
   id:r.id,repository:r.repository,domain:r.domain,
   sourceCommit:r.source.commit,sourceTree:r.source.tree,
   licenseMetadata:r.license.spdxMetadata,licenseReviewAtBaseline:r.license.review,
   lifecycleAtBaseline:r.lifecycle,adoptionAtBaseline:r.adoption,
   installationAtBaseline:r.installation,reviewAgents:r.reviewAgents,
   priorDetailedP1StaticAudit:P1.has(r.repository.toLowerCase()),
   gates:{
    A26:r.source.commit&&r.source.tree?'PENDING_UPSTREAM_IMMUTABLE_PIN_RECHECK':'HOLD_SOURCE_PIN_MISSING',
    A20:'PENDING_SBOM_CVE_SUPPLY_CHAIN_AND_SECURITY',
    A21:'PENDING_INTERFACE_IO_AUTHENTICATION_AND_DATA_BOUNDARY',
    A04_A23:'PENDING_ARCHITECTURE_FIT_AND_INDEPENDENT_REVIEW',
    domain:'PENDING_INDEPENDENT_MARINE_REFERENCE_UNITS_FRAMES_AND_LIMITS',
    humanLegal:'PENDING_LICENSE_COMPATIBILITY_REVIEW',
    softwareAuthority:'NO_APPROVAL_OR_RUNTIME_PERMISSION'
   },
   disposition:'HOLD_NOT_QUALIFIED',agentExecutionAuthorized:false,
   independentEngineeringValidated:false,vesselReleaseAuthorized:false
  }))
 };
}
export function validateQueue(queue,db) {
 const expected=makeQueue(db);
 if(JSON.stringify(queue)!==JSON.stringify(expected))
  throw Error('A26 all-97 queue differs from canonical immutable source and fail-closed review gates');
 if(new Set(queue.entries.map(x=>x.repository.toLowerCase())).size!==97)
  throw Error('Repeated repository in review queue');
 return {records:97,hold:97,pinsMissing:queue.entries.filter(x=>!x.sourceCommit||!x.sourceTree).length,
  metadataUnknown:queue.entries.filter(x=>['UNKNOWN','NOASSERTION'].includes(x.licenseMetadata)).length,
  priorDetailedAudits:queue.entries.filter(x=>x.priorDetailedP1StaticAudit).length};
}
async function getPublicGithub(url, fetchImpl, token, timeoutMs) {
 if(!url.startsWith('https://api.github.com/repos/'))throw Error('Non-GitHub host denied');
 const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),timeoutMs);
 try{
  const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
   'User-Agent':'USV01-A26-ReadOnly-Source-Screen'};
  if(token)headers.Authorization='Bearer '+token;
  const response=await fetchImpl(url,{method:'GET',headers,signal:ctl.signal,redirect:'error'});
  if(!response.ok)return {error:'HTTP_'+response.status};
  const data=await response.json();
  return {data};
 }catch{return {error:'TRANSPORT_OR_TIMEOUT'};}
 finally{clearTimeout(timer);}
}
export async function inspectPublicSource(entry,{fetchImpl=fetch,token='',timeoutMs=12000}={}) {
 if(!REPO.test(entry.repository))throw Error('Unsafe source identity');
 const base='https://api.github.com/repos/'+entry.repository;
 const pin=entry.sourceCommit, tree=entry.sourceTree;
 const pinned=SHA.test(pin||'')&&SHA.test(tree||'');
 let checkedCommit=null,checkedTree=null,proposedCommit=null,proposedTree=null,defaultBranch=null;
 let sourceStatus=pinned?'HOLD_UPSTREAM_COMMIT_UNAVAILABLE':'HOLD_MISSING_CANONICAL_PIN';
 const issues=[];
 const get=url=>getPublicGithub(url,fetchImpl,token,timeoutMs);
 if(pinned){
  const c=await get(base+'/git/commits/'+pin);
  if(c.error)issues.push('COMMIT_READ_'+c.error);
  else{
   checkedCommit=c.data?.sha||null;
   checkedTree=c.data?.tree?.sha||null;
   sourceStatus=checkedCommit===pin&&checkedTree===tree?'PIN_AND_TREE_VERIFIED_STATIC_ONLY':'HOLD_COMMIT_OR_TREE_MISMATCH';
  }
 }else{
  const m=await get(base);
  if(m.error)issues.push('METADATA_READ_'+m.error);
  else if(m.data?.private===true)issues.push('NONPUBLIC_REPOSITORY_HOLD');
  else if(typeof m.data?.default_branch!=='string'||m.data.default_branch.length>120)issues.push('DEFAULT_BRANCH_UNAVAILABLE');
  else{
   defaultBranch=m.data.default_branch;
   const c=await get(base+'/commits/'+encodeURIComponent(defaultBranch));
   if(c.error)issues.push('PROPOSAL_READ_'+c.error);
   else if(SHA.test(c.data?.sha||'')&&SHA.test(c.data?.commit?.tree?.sha||'')){
    proposedCommit=c.data.sha; proposedTree=c.data.commit.tree.sha;
   }else issues.push('PROPOSAL_NOT_VERIFIABLE');
  }
 }
 let rootState='ROOT_NOT_INSPECTED',rootLicenseFiles=[],rootManifests=[],rootFileCount=null;
 const rootTree=sourceStatus==='PIN_AND_TREE_VERIFIED_STATIC_ONLY'?tree:(!pinned?proposedTree:null);
 const treeCommit=sourceStatus==='PIN_AND_TREE_VERIFIED_STATIC_ONLY'?pin:proposedCommit;
 if(SHA.test(rootTree||'')){
  const t=await get(base+'/git/trees/'+rootTree);
  if(t.error)issues.push('ROOT_TREE_READ_'+t.error);
  else if(t.data?.sha!==rootTree||!Array.isArray(t.data?.tree))issues.push('ROOT_TREE_MISMATCH_OR_INVALID');
  else{
   const files=t.data.tree.filter(x=>x.type==='blob'&&typeof x.path==='string'&&SHA.test(x.sha||''));
   rootFileCount=files.length;
   rootLicenseFiles=files.filter(x=>LICENSE.test(x.path)).map(x=>({
    path:x.path,gitBlobSha:x.sha,sourceUrl:'https://github.com/'+entry.repository+'/blob/'+treeCommit+'/'+x.path
   }));
   rootManifests=files.filter(x=>MANIFEST.test(x.path)).map(x=>x.path);
   rootState=rootLicenseFiles.length?'ROOT_LICENSE_BLOBS_LISTED_NOT_LEGAL_REVIEWED':'HOLD_NO_ROOT_LICENSE_BLOB_DETECTED';
  }
 }
 return {
  id:entry.id,repository:entry.repository,
  source:{status:sourceStatus,registerCommit:pin,registerTree:tree,
   verifiedCommit:checkedCommit,verifiedTree:checkedTree,
   proposedCurrentCommit:proposedCommit,proposedCurrentTree:proposedTree,
   proposedDefaultBranch:defaultBranch,issues},
  root:{status:rootState,licenseBlobs:rootLicenseFiles,manifestPaths:rootManifests,rootBlobCount:rootFileCount},
  licenseMetadata:entry.licenseMetadata,
  reviews:{A26:sourceStatus==='PIN_AND_TREE_VERIFIED_STATIC_ONLY'?'SOURCE_PIN_CHECKED_ONLY':'HOLD_PROVENANCE',
   A20:'NOT_PERFORMED_SBOM_CVE',A21:'NOT_PERFORMED_INTERFACE_REVIEW',
   A04_A23:'NOT_PERFORMED_INDEPENDENT_FIT_REVIEW',
   domain:'NOT_PERFORMED_NUMERICAL_OR_MARINE_VALIDATION',
   humanLegal:'NOT_APPROVED'},
  qualification:'HOLD_NOT_QUALIFIED',softwareAdoptionApproved:false,
  externalSourceExecuted:false,agentToolRegistered:false,vesselEngineeringApproved:false
 };
}
export async function scanSources(entries,{fetchImpl=fetch,token='',concurrency=5,timeoutMs=12000}={}) {
 if(!Array.isArray(entries)||entries.length<1||entries.length>1000||!Number.isInteger(concurrency)||concurrency<1||concurrency>8)
  throw Error('Invalid bounded scan work queue');
 const out=new Array(entries.length); let cursor=0;
 await Promise.all(Array.from({length:Math.min(concurrency,entries.length)},async()=>{
  while(cursor<entries.length){
   const i=cursor++;
   out[i]=await inspectPublicSource(entries[i],{fetchImpl,token,timeoutMs});
  }
 }));
 return out;
}
export function summarizeScan(entries) {
 return {count:entries.length,
  pinnedVerified:entries.filter(x=>x.source.status==='PIN_AND_TREE_VERIFIED_STATIC_ONLY').length,
  pinMissing:entries.filter(x=>x.source.status==='HOLD_MISSING_CANONICAL_PIN').length,
  otherSourceHolds:entries.filter(x=>!['PIN_AND_TREE_VERIFIED_STATIC_ONLY','HOLD_MISSING_CANONICAL_PIN'].includes(x.source.status)).length,
  rootLicenseBlobListed:entries.filter(x=>x.root.status==='ROOT_LICENSE_BLOBS_LISTED_NOT_LEGAL_REVIEWED').length,
  noRootLicenseDetected:entries.filter(x=>x.root.status==='HOLD_NO_ROOT_LICENSE_BLOB_DETECTED').length,
  sourceInspectionsWithIssues:entries.filter(x=>x.source.issues.length>0).length,
  qualified:0,installed:0,approved:0,actualExecuted:0};
}
export function renderScanMarkdown(report) {
 const s=report.summary;
 const lines=['# A26 — All 97 repository source screen (research-only)','',
 '> Live GitHub commit/tree and ROOT directory metadata only. No external source code executed, no license approval, no SBOM/CVE or independent engineering review.','',
 'Source register: '+report.registerId+' | SHA256: '+report.registerSha256+' | Scanned: '+report.generatedAt,'',
 'Verified immutable registered commit and tree: **'+s.pinnedVerified+' / '+s.count+'** | canonical pins missing: **'+s.pinMissing+'** | other source holds: **'+s.otherSourceHolds+'**.','',
 'Root license blob references found: '+s.rootLicenseBlobListed+
 '; no root license detected: '+s.noRootLicenseDetected+
 '. A root file is not a legal determination; nested/component licenses not inspected.','',
 '## Per-repository hold queue','',
 '| ID | Repository | Immutable source check | Root license evidence | Root manifests | Disposition |',
 '| --- | --- | --- | --- | --- | --- |'];
 for(const e of report.entries)lines.push('| '+e.id+' | '+e.repository+
  ' | '+e.source.status+' | '+e.root.status+
  ' | '+(e.root.manifestPaths.join(', ')||'None observed')+' | '+e.qualification+' |');
 lines.push('','All A20 security, A21 interfaces, A04/A23 architectural review, marine-domain validation and human license decisions remain pending. No automatic lifecycle promotion or GitHub protected-main merge is authorized.','');
 return lines.join('\n');
}
async function main(args=process.argv.slice(2)) {
 const bytes=await readFile(REGISTER_FILE);
 const db=validateRegister(JSON.parse(bytes.toString('utf8')));
 const queue=JSON.parse(await readFile(QUEUE_FILE,'utf8'));
 const summary=validateQueue(queue,db);
 if(args.length===1&&args[0]==='--check'){
  console.log(JSON.stringify({status:'PASS_RESEARCH_QUEUE_ONLY',...summary,qualified:0,toolsEnabled:0}));
  return;
 }
 if(args.length===3&&args[0]==='--scan'&&args[1]==='--out-dir'){
  const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN;
  if(!token)throw Error('An ephemeral read-only GitHub Actions token is required for the public-source scan');
  const records=await scanSources(queue.entries,{token,concurrency:5,timeoutMs:12000});
  const report={schemaVersion:1,recordId:'USV01-A26-ALL97-LIVE-SCREEN-1',
   registerId:db.registerId,registerSha256:createHash('sha256').update(bytes).digest('hex'),
   generatedAt:new Date().toISOString(),classification:'PUBLIC_SOURCE_SAFE_ONLY',
   execution:'READ_ONLY_GITHUB_METADATA_NO_THIRD_PARTY_EXECUTION',
   authorization:'NONE_NO_SOFTWARE_OR_ENGINEERING_APPROVAL',
   entries:records,summary:summarizeScan(records)};
  if(records.length!==97||records.some(x=>x.qualification!=='HOLD_NOT_QUALIFIED'||x.externalSourceExecuted||x.agentToolRegistered||x.softwareAdoptionApproved))
   throw Error('All-97 coverage or non-activation safety violation');
  const output=path.resolve(args[2]);await mkdir(output,{recursive:true});
  await writeFile(path.join(output,'source-screen.json'),JSON.stringify(report,null,2)+'\n');
  const markdown=renderScanMarkdown(report);
  await writeFile(path.join(output,'source-screen.md'),markdown);
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,markdown);
  console.log(JSON.stringify(report.summary));
  return;
 }
 throw Error('Usage: --check | --scan --out-dir <artifacts-directory>');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
}
