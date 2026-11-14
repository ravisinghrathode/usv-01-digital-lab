/**
 * USV-01 external software register. No installation or engineering authority.
 * Node >=20, no third-party dependencies.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const REGISTER_FILE=fileURLToPath(new URL('../src/data/externalSoftwareRegister.json',import.meta.url));
export const OVERVIEW_FILE=fileURLToPath(new URL('../docs/EXTERNAL_SOFTWARE_OVERVIEW.md',import.meta.url));
const REPO=/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const AGENT=/^A(0[1-9]|1\d|2[0-6])$/;
const SHA=/^[a-f0-9]{40}$/;
const STATUSES=new Set(['DISCOVERED','EVALUATING','QUALIFIED','INTEGRATED','RETIRED','REJECTED']);
const ADOPTION=new Set(['NOT_APPROVED','APPROVED','REVOKED']);
const INSTALLATION=new Set(['NOT_INSTALLED','SANDBOX_ONLY','LAB_INSTALLED','REMOVED']);
const USAGE=new Set(['SANDBOX_EVALUATION','AGENT_TOOL_INVOCATION','ENGINEERING_BASELINE']);
const HTTPS=/^https:\/\/(?:github\.com|api\.github\.com)\/[A-Za-z0-9_.\/-]+(?:\?[A-Za-z0-9_.=&-]+)?$/;
function fail(message){throw Error('External software register: '+message);}
export function validateRegister(db){
 if(!db||db.schemaVersion!==1||db.registerId!=='USV01-EXT-SOFTWARE-001'||!Array.isArray(db.records)||db.records.length>1000)fail('unsupported schema');
 const ids=new Set(),repos=new Set();
 for(const r of db.records){
  if(!r||!/^EXT-(?:[0-9]{3}|DISC-[a-f0-9]{12})$/.test(r.id||'')||ids.has(r.id))fail('invalid or duplicate ID');
  ids.add(r.id);
  if(!REPO.test(r.repository||'')||r.repositoryUrl!=='https://github.com/'+r.repository)fail(r.id+' invalid upstream identity');
  if(repos.has(r.repository.toLowerCase()))fail('duplicate upstream '+r.repository);
  repos.add(r.repository.toLowerCase());
  if(typeof r.name!=='string'||!r.name.trim()||r.name.length>180||typeof r.domain!=='string'||!r.domain.trim())fail(r.id+' missing name/domain');
  if(!STATUSES.has(r.lifecycle)||!ADOPTION.has(r.adoption)||!INSTALLATION.has(r.installation))fail(r.id+' invalid lifecycle');
  if(!AGENT.test(r.ownerAgent||'')||!Array.isArray(r.reviewAgents)||!r.reviewAgents.every(x=>AGENT.test(x)))fail(r.id+' invalid agents');
  if(!r.source||!(r.source.commit===null||SHA.test(r.source.commit||''))||!(r.source.tree===null||SHA.test(r.source.tree||'')))fail(r.id+' invalid source pin');
  if(!r.license||typeof r.license.spdxMetadata!=='string'||!['PENDING','APPROVED','REJECTED'].includes(r.license.review))fail(r.id+' invalid license decision');
  if(!Array.isArray(r.evidence)||!Array.isArray(r.plannedUsage)||!Array.isArray(r.actualUsage))fail(r.id+' usage/evidence arrays missing');
  for(const e of r.evidence)if(typeof e.type!=='string'||!e.type||typeof e.status!=='string'||!HTTPS.test(e.url||''))fail(r.id+' invalid evidence');
  for(const p of r.plannedUsage)if(!p.project||!Array.isArray(p.agents)||!p.agents.every(x=>AGENT.test(x))||!p.purpose||!HTTPS.test(p.sourceEvidence||''))fail(r.id+' invalid planned usage');
  for(const u of r.actualUsage){
   if(!USAGE.has(u.kind)||!u.project||!AGENT.test(u.agent||'')||!HTTPS.test(u.executionEvidence||'')||!SHA.test(u.sourceCommit||''))fail(r.id+' actual usage lacks exact source/evidence');
   if(u.sourceCommit!==r.source.commit)fail(r.id+' actual usage source revision differs from pinned registry');
   if(u.kind==='SANDBOX_EVALUATION'&&(!SHA.test(u.labSourceCommit||'')||!/^sha256:[0-9a-f]{64}$/.test(u.verificationSha256||'')||u.outcome!=='ELEMENTARY_GNC_SMOKE_ONLY_UNCERTIFIED'||u.executor!=='GITHUB_ACTIONS_DISPOSABLE_RUNNER'))fail(r.id+' unverified sandbox evidence provenance');
   if(u.kind==='AGENT_TOOL_INVOCATION'&&(r.lifecycle!=='INTEGRATED'||r.adoption!=='APPROVED'||!r.registeredToolId||!u.invocationId||!HTTPS.test(u.runtimeEvidence||'')))fail(r.id+' agent invocation needs approved runtime evidence');
   if(u.kind==='ENGINEERING_BASELINE'&&(r.adoption!=='APPROVED'||r.lifecycle!=='INTEGRATED'||!HTTPS.test(u.directorAcceptanceEvidence||'')))fail(r.id+' baseline usage not approved');
  }
  if(r.adoption==='APPROVED'&&(!['QUALIFIED','INTEGRATED'].includes(r.lifecycle)||r.license.review!=='APPROVED'||r.securityReview!=='APPROVED'||r.engineeringValidation!=='VALIDATED'||!HTTPS.test(r.approvalEvidence||'')))fail(r.id+' claimed approval without complete evidence');
  if(r.lifecycle==='INTEGRATED'&&(r.adoption!=='APPROVED'||r.installation!=='LAB_INSTALLED'||!r.registeredToolId||!HTTPS.test(r.runtimeEvidence||'')))fail(r.id+' integrated without approved runtime');
  if(r.registeredToolId!==null&&(r.adoption!=='APPROVED'||r.installation!=='LAB_INSTALLED'))fail(r.id+' executable registry ID but no approval');
 }
 return db;
}
function safe(s){return String(s??'').replace(/[<>\r\n|\\]/g,' ').replace(/\]/g,' ').trim();}
export function renderOverview(db){
 validateRegister(db);
 const counts=Object.fromEntries([...STATUSES].map(x=>[x,db.records.filter(r=>r.lifecycle===x).length]));
 const uses=db.records.reduce((n,r)=>n+r.actualUsage.length,0);
 const sandbox=db.records.reduce((n,r)=>n+r.actualUsage.filter(u=>u.kind==='SANDBOX_EVALUATION').length,0);
 const agentCalls=db.records.reduce((n,r)=>n+r.actualUsage.filter(u=>u.kind==='AGENT_TOOL_INVOCATION').length,0);
 const baseline=db.records.reduce((n,r)=>n+r.actualUsage.filter(u=>u.kind==='ENGINEERING_BASELINE').length,0);
 const lines=['# USV-01 External Software and Repository Register','',
 '> This is a read-only snapshot generated from src/data/externalSoftwareRegister.json. No repository is approved or installed merely because it appears in this list. Actual use must have evidence.','',
 'Register: '+db.registerId+' | Custodian: '+db.custodian+' | Controlled change via GitHub PR','',
 'Overview: '+db.records.length+' tracked | '+counts.DISCOVERED+' discovered | '+counts.EVALUATING+' evaluating | '+counts.QUALIFIED+' qualified | '+counts.INTEGRATED+' integrated | '+counts.RETIRED+' retired | '+counts.REJECTED+' rejected | '+uses+' evidenced usage events ('+sandbox+' research sandbox, '+agentCalls+' agent invocations, '+baseline+' accepted engineering uses).','',
 '| ID | Repository | Domain | Lifecycle | Adoption | Installation | Review agents | Planned projects | Evidenced uses | Source evidence |',
 '| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |'];
 for(const r of [...db.records].sort((a,b)=>a.id.localeCompare(b.id))){
  const projects=[...new Set(r.plannedUsage.map(p=>p.project))].join(', ')||'None';
  const source=r.evidence[0]?.url?'[Evidence]('+r.evidence[0].url+')':'Pending';
  lines.push('| '+safe(r.id)+' | ['+safe(r.name)+']('+r.repositoryUrl+') | '+safe(r.domain)+' | '+r.lifecycle+' | '+r.adoption+' | '+r.installation+' | '+safe(r.reviewAgents.join(', '))+' | '+safe(projects)+' | '+r.actualUsage.length+' | '+source+' |');
 }
 lines.push('','## Use and maintenance rules','',
 '- A26 curates discoveries; an automated Scout report produces an unapproved reconciliation proposal, never auto-acceptance.',
 '- Curated register edits require protected PR review; Git history preserves earlier revisions.',
 '- Planned project allocations are not actual project use. Each real usage record needs a project, agent, exact source commit, type and evidence link.',
 '- A software approval is separate from independent vessel engineering release and from physical actuator permission.',
 '- A15/A23 review engineering fitness, A20 security, A21 interfaces, A18/A24 numerical evidence; the Engineering Director controls vessel engineering release.',
 '- Do not publish credentials, restricted reports or controlled design information in this public source repository.',
 '- The application overview is a source-revision snapshot, refreshed on lab rebuild/deploy, not live usage telemetry.','',
 '## Tracked investigations','');
 for(const r of db.records)if(r.plannedUsage.length&&!r.actualUsage.length)lines.push('- '+safe(r.id)+' '+safe(r.name)+': planned for '+safe(r.plannedUsage.map(p=>p.project).join(', '))+'; zero evidenced uses.');
 lines.push('');
 return lines.join('\n');
}
export function reconcileScout(db,report,{allowFixture=false}={}){
 validateRegister(db);
 const providers=['GITHUB_PUBLIC_REPOSITORY_SEARCH',...(allowFixture?['OFFLINE_TEST_FIXTURE']:[])];
 if(!report||!Array.isArray(report.candidates)||!providers.includes(report.provider))fail('refusing invalid/fixture discovery');
 const existing=new Set(db.records.map(r=>r.repository.toLowerCase())),entries=[...db.records];
 let newCount=0;
 for(const c of report.candidates.slice(0,300)){
  if(!c||!REPO.test(c.name||'')||c.url!=='https://github.com/'+c.name||existing.has(c.name.toLowerCase()))continue;
  existing.add(c.name.toLowerCase());
  const id='EXT-DISC-'+createHash('sha256').update(c.name.toLowerCase()).digest('hex').slice(0,12);
  if(entries.some(x=>x.id===id))fail('discovery identity collision');
  const agents=Array.isArray(c.agentReviewers)?[...new Set(c.agentReviewers.filter(a=>AGENT.test(a)))]:[];
  entries.push({id,name:c.name,repository:c.name,repositoryUrl:c.url,domain:Array.isArray(c.categories)?String(c.categories[0]||'UNCLASSIFIED').slice(0,60):'UNCLASSIFIED',
   description:String(c.description||'').slice(0,500),firstRecordedOn:String(report.generatedAt||'').slice(0,10)||'UNKNOWN',
   ownerAgent:'A26',reviewAgents:agents,lifecycle:'DISCOVERED',source:{commit:null,tree:null,verifiedEvidence:null},
   license:{spdxMetadata:typeof c.licenseSpdx==='string'?c.licenseSpdx:'UNKNOWN',review:'PENDING'},
   securityReview:'NOT_PERFORMED',engineeringValidation:'NOT_VALIDATED',adoption:'NOT_APPROVED',
   installation:'NOT_INSTALLED',registeredToolId:null,proposedToolId:null,
   plannedUsage:[],actualUsage:[],evidence:[],nextAction:'Pin source, review license/security, assign disciplinary assessment.'});
  newCount++;
 }
 if(entries.length>1000)fail('too many candidate entries');
 const proposed={...db,records:entries.sort((a,b)=>a.id.localeCompare(b.id))};
 validateRegister(proposed);
 return {proposed,newCount,previousCount:db.records.length};
}
export async function main(args=process.argv.slice(2)){
 const db=validateRegister(JSON.parse(await readFile(REGISTER_FILE,'utf8')));
 if(args.length===1&&args[0]==='--check'){
  if(await readFile(OVERVIEW_FILE,'utf8')!==renderOverview(db))fail('overview stale; use --refresh and commit');
  console.log(JSON.stringify({status:'REGISTER_VALID',records:db.records.length,actualUses:db.records.reduce((n,r)=>n+r.actualUsage.length,0)}));return;
 }
 if(args.length===1&&args[0]==='--refresh'){
  await mkdir(path.dirname(OVERVIEW_FILE),{recursive:true});
  await writeFile(OVERVIEW_FILE,renderOverview(db));
  console.log(JSON.stringify({status:'OVERVIEW_REFRESHED',records:db.records.length}));return;
 }
 if(args.length===4&&args[0]==='--scout-report'&&args[2]==='--proposal-out'){
  const report=JSON.parse(await readFile(args[1],'utf8'));
  const {proposed,newCount,previousCount}=reconcileScout(db,report);
  await mkdir(path.dirname(path.resolve(args[3])),{recursive:true,mode:0o700});
  await writeFile(args[3],JSON.stringify(proposed,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({status:'REVIEW_ONLY_RECONCILIATION',newCount,previousCount,automaticApproval:false,automaticMerge:false}));return;
 }
 fail('Use --check | --refresh | --scout-report <latest.json> --proposal-out <path>');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
