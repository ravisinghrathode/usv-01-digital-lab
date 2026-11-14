/**
 * A26 P1 static source evidence guard. No network, untrusted execution,
 * package-manager installation, model calls, registry modification or approval.
 */
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSpec} from './repository-integration.mjs';
import {validateRegister,REGISTER_FILE} from './external-software-register.mjs';
import {validatePolicy,POLICY_FILE,CANDIDATE_DIR} from './external-integration-agent.mjs';

export const AUDIT_FILE=fileURLToPath(new URL('../references/third-party-static-audits/A26_P1_STATIC_AUDIT_2026-11-15.json',import.meta.url));
const SHA=/^[0-9a-f]{40}$/;
const SAFE_ID=/^[a-z][a-z0-9-]{2,60}$/;
const fail=x=>{throw Error('A26 static audit HOLD: '+x);};
const hasText=x=>typeof x==='string'&&x.trim().length>8;
const EXPECTED='TBD_INDEPENDENT_SOURCE_NOT_CANDIDATE_OUTPUT';
const FIELDS=['licenseApproved','securityQualified','benchmarkPassed','acceptedForEngineering','agentRuntimeRegistered','actualUse'];
export const STATIC_REQUIREMENTS={
  requireActualLicenseFileOrHold:true,
  rejectMetadataAsLicenseApproval:true,
  requireTransitiveDependencyAndSbomReview:true,
  requireSourcePinAndGitBlobEvidence:true,
  requireIndependentReferenceAndApplicabilityReview:true,
  requireUnitsFramesAndUncertainty:true,
  separateResearchAndRuntimeUse:true,
  rejectUnlicensedHardwareFirmwareUse:true,
  prohibitForeignCodeExecutionDuringStaticAudit:true
};
export function validateAudit(data,register,policy,manifests){
 validatePolicy(policy);
 validateRegister(register);
 for(const [k,v] of Object.entries(STATIC_REQUIREMENTS))
  if(policy.staticSourceAudit?.[k]!==v)fail('missing immutable static-audit rule '+k);
 if(!data||data.schemaVersion!==1||data.recordId!=='USV01-A26-STATIC-P1-20261115-001'||
   data.execution!=='NO_UNTRUSTED_CODE_EXECUTED'||data.allLicenseReviews!=='PENDING_HUMAN'||
   data.allSecurityReviews!=='PENDING_A20'||data.allEngineeringValidations!=='NOT_VALIDATED'||
   data.allToolPermissions!=='NONE'||data.classification!=='PUBLIC_SOURCE_METADATA_ONLY')fail('research-only scope changed');
 if(!Array.isArray(data.records)||data.records.length!==8)fail('expected exactly eight reviewed dossiers');
 const seen=new Set();
 for(const item of data.records){
  if(!item||!SAFE_ID.test(item.id||'')||!SHA.test(item.pinnedCommit||'')||
    !SHA.test(item.pinnedTree||'')||typeof item.repository!=='string'||
    seen.has(item.repository.toLowerCase()))fail('duplicate, invalid identifier or missing pin');
  seen.add(item.repository.toLowerCase());
  const record=register.records.find(x=>x.repository.toLowerCase()===item.repository.toLowerCase());
  if(!record||record.source?.commit!==item.pinnedCommit||record.source?.tree!==item.pinnedTree)
    fail(item.id+' does not match source-controlled register source/tree');
  const m=manifests.find(x=>x.repository===item.repository);
  if(!m)fail(item.id+' controlled candidate manifest missing');
  validateSpec(m,{requireRunner:false});
  if(m.id!==item.id||m.commit!==item.pinnedCommit||m.sourceTree!==item.pinnedTree||
    m.runner||m.cases||m.execution!=='NOT_AUTHORIZED'||m.approval!=='NOT_APPROVED')
    fail(item.id+' executable or mismatched source manifest');
  if(item.sourceUrl!=='https://github.com/'+item.repository+'/tree/'+item.pinnedCommit)
    fail(item.id+' source URL revision mismatch');
  if(item.status!=='STATIC_INSPECTED_HOLD_FOR_REVIEW'||FIELDS.some(x=>item[x]!==false))
    fail(item.id+' unapproved stage incorrectly promoted');
  if(!hasText(item.licenseFinding)||!hasText(item.dependencyFinding)||!hasText(item.interfaceFinding)||
     !hasText(item.immediateBlocker))fail(item.id+' technical/legal limitations missing');
  if(!Array.isArray(item.inspectedFiles)||!item.inspectedFiles.length||
     !Array.isArray(item.staticObservations)||!item.staticObservations.length)
    fail(item.id+' missing inspectable source evidence');
  const files=new Set();
  for(const f of item.inspectedFiles){
   if(!f||!f.path||f.path.startsWith('/')||f.path.includes('..')||f.path.includes('\\')||
     !SHA.test(f.gitBlobSha||'')||f.sourceUrl!=='https://github.com/'+item.repository+'/blob/'+item.pinnedCommit+'/'+f.path||
     files.has(f.path))fail(item.id+' Git blob provenance invalid');
   files.add(f.path);
  }
  if(!files.has('LICENSE')&&!/NO_ROOT_LICENSE_FILE.*HOLD/.test(item.licenseFinding))
    fail(item.id+' absent root license must remain on HOLD');
  if(!Array.isArray(item.independentBenchmarkPlan)||
    item.independentBenchmarkPlan.length<policy.sandboxHardening.minIndependentReferenceCases)
    fail(item.id+' independent reference-case coverage missing');
  for(const id of ['analytic-limits','representative-domain-case','negative-and-uncertainty'])
    if(!item.independentBenchmarkPlan.some(c=>c.id===id))fail(item.id+' three test families required');
  for(const c of item.independentBenchmarkPlan){
   if(!hasText(c.goal)||c.expected!==EXPECTED||!String(c.units||'').startsWith('TBD')||
    !String(c.coordinateFrame||'').startsWith('TBD')||!String(c.tolerance||'').startsWith('TBD')||
    c.source!=='TBD_INDEPENDENT_REFERENCE'||c.completed!==false)
    fail(item.id+' unsupported numerical reference/approval');
  }
 }
 if(new Set(manifests.map(x=>x.repository)).size!==manifests.length)fail('duplicate controlled manifest');
 return {schemaVersion:1,disposition:'EIGHT_STATIC_AUDITS_VALIDATED_RESEARCH_ONLY',
  audited:data.records.length,licenseApproved:0,securityApproved:0,
  engineeringQualified:0,agentToolsActivated:0,actualRuns:0,
  outstandingReviewGates:['LEGAL_LICENSE','A20_SUPPLY_CHAIN_SBOM_CVE','A21_INTERFACE_AND_MODEL_DOMAIN','A18_A24_BENCHMARKS','A15_A23_INDEPENDENT_CHALLENGE','AUTHENTICATED_SOURCE_APPROVAL'],
  anyThirdPartyCodeExecuted:false};
}
export async function main(argv=process.argv.slice(2)){
 if(!((argv.length===1&&argv[0]==='--check')||
      (argv.length===3&&argv[0]==='--summary-out'&&argv[2]==='--check')))
   fail('usage: --check or --summary-out <file> --check');
 const [register,policy,data]=await Promise.all([
  readFile(REGISTER_FILE,'utf8').then(JSON.parse),readFile(POLICY_FILE,'utf8').then(JSON.parse),
  readFile(AUDIT_FILE,'utf8').then(JSON.parse)
 ]);
 const manifests=await Promise.all(data.records.map(x=>readFile(path.join(CANDIDATE_DIR,x.id+'.json'),'utf8').then(JSON.parse)));
 const summary=validateAudit(data,register,policy,manifests);
 if(argv.length===3)await writeFile(argv[1],JSON.stringify(summary,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(summary));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
