/**
 * A26 unified role router (offline, metadata only, no agent execution).
 * Preserves the existing canonical role and external integration policy;
 * never imports third-party code, runs a model, grants privileges or calls APIs.
 */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const PROFILE_FILE=fileURLToPath(new URL('../config/a26-unified-operating-profile.json',import.meta.url));
export const EXTERNAL_POLICY_FILE=fileURLToPath(new URL('../config/external-integration-policy.json',import.meta.url));
export const UNIFIED_CHARTER_FILE=fileURLToPath(new URL('../docs/governance/A26_UNIFIED_AGENT_OPERATING_CHARTER.md',import.meta.url));
export const BINDING_ANNEX_FILE=fileURLToPath(new URL('../docs/EXTERNAL_INTEGRATION_AGENT_CHARTER.md',import.meta.url));
export const CANONICAL_AGENTS_FILE=fileURLToPath(new URL('../src/core/agents/definitions.ts',import.meta.url));
export const LAB_CHARTER_FILE=fileURLToPath(new URL('../docs/governance/USV01_26_AGENT_OPERATING_CHARTER_V1.md',import.meta.url));

const AUTHORIZED_MODES=['FLEET_INTELLIGENCE','EXTERNAL_SOFTWARE','CORRELATED_RESEARCH'];
const FLEET_ACTIONS=[
 'CATALOG_PUBLIC_USV_EVIDENCE','RESEARCH_PUBLIC_ACADEMIC_PAPERS',
 'DRAFT_SOURCE_LINKED_NAVAL_COMPARISON','DRAFT_PUBLIC_OBSIDIAN_KNOWLEDGE_NOTE'
];
const JOINT_ACTIONS=[
 'CROSS_REFERENCE_PUBLIC_RESEARCH','DRAFT_ENGINEERING_CAPABILITY_GAP',
 'PROPOSE_INDEPENDENT_REVIEW_HANDOFF'
];
const MANDATORY=['A26','A15','A23','A20','A21','A18','A24'];
const R2=Array.from({length:10},(_,i)=>'R2.'+String(i+1).padStart(2,'0'));
const FLAGS=[
 'publicSafeOnly','noAdditionalAgent','noNewToolPermission',
 'noModelPermissionChange','noThirdPartyExecution','noAutoSoftwareApproval',
 'noAutonomousPaidCompute','noPhysicalActuation','noEngineeringBaselineWrites',
 'noProtectedPrMerge','requireExactSourceProvenance',
 'requireIndependentEngineeringReview','originalIntegrationPolicyUnchanged',
 'unknownActionHold'
];
function hold(message){throw Error('A26 unified governance HOLD: '+message);}
function exactList(actual,expected,name){
 if(!Array.isArray(actual)||actual.length!==expected.length||
    actual.some((x,i)=>x!==expected[i]))hold(name+' not equal to sealed source-derived profile');
}
function exactObjectKeys(actual,keys,name){
 if(!actual||typeof actual!=='object'||Array.isArray(actual)||
    Object.keys(actual).sort().join(',')!==[...keys].sort().join(','))
  hold(name+' has extra/missing fields');
}
export function validateUnifiedProfile(profile,externalPolicy,unifiedText,annexText,definitionsText,labText){
 if(!profile||profile.schemaVersion!==1||profile.revision!==1||
  profile.charterId!=='USV01-A26-UNIFIED-OPERATING-001'||
  profile.canonicalId!=='A26'||profile.registryAgentId!=='INTEL-USV-26'||
  profile.registrySize!==26||profile.roleSource!=='src/core/agents/definitions.ts'||
  profile.unifiedCharter!=='docs/governance/A26_UNIFIED_AGENT_OPERATING_CHARTER.md'||
  profile.bindingAnnex!=='docs/EXTERNAL_INTEGRATION_AGENT_CHARTER.md'||
  profile.bindingExternalPolicy!=='config/external-integration-policy.json'||
  profile.labGovernance!=='docs/SAFETY_AND_GOVERNANCE.md'||
  profile.labOperatingCharter!=='docs/governance/USV01_26_AGENT_OPERATING_CHARTER_V1.md'||
  profile.labOperatingCharterAdoption!=='NOT_ADOPTED_BY_THIS_PROFILE'||
  profile.modelPolicy!=='INHERIT_REGISTERED_CODEX_CLI_AND_SEPARATELY_REVIEWED_ROUTING')
  hold('canonical identity, charter source or model routing redefined');

 if(!externalPolicy||externalPolicy.schemaVersion!==1||externalPolicy.revision!==2||
    externalPolicy.coordinator!=='A26'||externalPolicy.policyId!=='USV01-EXT-INTEGRATION-A26-001'||
    externalPolicy.agentType!=='SUPPORTING_SERVICE_NOT_ADDITIONAL_ENGINEERING_AGENT'||
    externalPolicy.enforcement?.failClosed!==true||
    externalPolicy.enforcement?.autoRegistryWrites!==false||
    externalPolicy.enforcement?.autoMerge!==false||
    externalPolicy.enforcement?.autoVesselRelease!==false||
    externalPolicy.enforcement?.qualificationClaimAllowed!==false||
    externalPolicy.sandboxHardening?.network!=='none'||
    externalPolicy.sandboxHardening?.minIndependentReferenceCases<3)
   hold('binding R2 external integration authority modified');

 if(typeof unifiedText!=='string'||!unifiedText.startsWith('# A26 — Unified Naval Intelligence')||
   !unifiedText.includes('incorporated **in full**')||
   !unifiedText.includes('NOT_ADOPTED_BY_THIS_PROFILE'.replaceAll('_',' '))&&
   !unifiedText.includes('*PROPOSED — NOT ADOPTED*')||
   !unifiedText.includes('R2.01')||!unifiedText.includes('R2.10'))
   hold('unified charter text/inherited obligations missing');
 if(typeof annexText!=='string'||!annexText.startsWith('# USV-01 A26 External Software Integration Charter')||
    !annexText.includes('Amendment R2')||
    R2.some(x=>!annexText.includes('**'+x+' —'))||
    !annexText.includes('No secrets, confidential Navy/client'))
   hold('original external-integration charter or one of ten rules removed');
 if(typeof labText!=='string'||!labText.includes('PROPOSED — NOT ADOPTED'))
   hold('lab-level charter adoption status cannot be inferred');

 if(typeof definitionsText!=='string')hold('canonical registry definitions missing');
 const canonicalNames=[...definitionsText.matchAll(/\bcanonicalId:\s*'A(0[1-9]|1[0-9]|2[0-6])'/g)].map(x=>x[1]);
 if(canonicalNames.length!==26||new Set(canonicalNames).size!==26)
   hold('canonical registry count or unique A01-A26 IDs changed');
 const marker="id: 'INTEL-USV-26'";
 const pos=definitionsText.indexOf(marker);
 if(pos<0)hold('missing source-defined A26 identity');
 const canonical=definitionsText.slice(pos,pos+4000);
 for(const required of [
   "canonicalId: 'A26'","name: 'Global Navy USV Fleet Intelligence & Benchmark Analyst'",
   "preferredProvider: 'codex_cli'","executionPermissions: ['READ_ONLY', 'BASELINE_DRAFT']",
   "reportingTo: 'LEAD-SYS-01'",
   "permittedTools: ['TOOL-BASELINE-QUERY', 'TOOL-OBSIDIAN-EXPORT', 'TOOL-HYDROSTATICS', 'TOOL-RESISTANCE']"
 ])if(!canonical.includes(required))hold('canonical A26 role/permissions drift: '+required);

 exactObjectKeys(profile.modes,AUTHORIZED_MODES,'operating modes');
 const fleet=profile.modes.FLEET_INTELLIGENCE,ext=profile.modes.EXTERNAL_SOFTWARE,joint=profile.modes.CORRELATED_RESEARCH;
 if(fleet?.existingImplementation!=='src/core/agents/GlobalUsvIntelligenceAgent.ts'||
    fleet.output!=='UNVERIFIED_PUBLIC_INTELLIGENCE_DOSSIER')hold('fleet research profile altered');
 exactList(fleet.allowedPlanningActions,FLEET_ACTIONS,'fleet planning allowlist');
 if(ext?.existingImplementation!=='scripts/external-integration-agent.mjs'||
    ext.allowedPlanningActionsSource!=='EXTERNAL_INTEGRATION_POLICY_ALLOWED_AUTONOMOUS_ACTIONS'||
    ext.output!=='UNAPPROVED_SOURCE_PINNED_SOFTWARE_REVIEW')
    hold('external software authority may not be copied or expanded');
 if(joint?.existingImplementation!=='READ_ONLY_CROSS_REFERENCE_NOT_A_RUNTIME_AGENT'||
    joint.output!=='DRAFT_INTELLIGENCE_TO_SOFTWARE_HANDOFF')hold('joint research cannot become new runtime');
 exactList(joint.allowedPlanningActions,JOINT_ACTIONS,'correlated research planning allowlist');
 exactObjectKeys(profile.enforcement,FLAGS,'enforcement');
 for(const k of FLAGS)if(profile.enforcement[k]!==true)hold('invariant removed: '+k);
 const v=profile.verification||{};
 exactList(v.requiredExternalAnnexRules,R2,'R2 requirements');
 exactList(v.mandatoryExternalReviewRoles,MANDATORY,'independent roles');
 exactList(v.expectedPermissions,['READ_ONLY','BASELINE_DRAFT'],'canonical role privileges');
 if(v.requiredCanonicalProvider!=='codex_cli'||v.noClaimOfLiveCrawlOrModelCommissioning!==true)
  hold('model or live-intelligence evidence incorrectly promoted');
 const fromPolicy=[
  ...externalPolicy.mandatoryRoles.coordinator,
  ...externalPolicy.mandatoryRoles.independentChallenge,
  ...externalPolicy.mandatoryRoles.cyber,
  ...externalPolicy.mandatoryRoles.interfaces,
  ...externalPolicy.mandatoryRoles.verification
 ];
 exactList(fromPolicy,MANDATORY,'external policy review roles');
 if(!Array.isArray(externalPolicy.allowedAutonomousActions)||!externalPolicy.allowedAutonomousActions.length||
    externalPolicy.allowedAutonomousActions.some(x=>
      externalPolicy.alwaysForbidden?.includes(x)||
      externalPolicy.blockedWithoutExplicitHumanAuthorization?.includes(x)))
  hold('conflicting external autonomy');
 return {charterId:profile.charterId,canonicalAgent:'A26',
  operatingModes:AUTHORIZED_MODES,sourcePolicyRevision:externalPolicy.revision,
  externalR2RulesPreserved:R2.length,agentCount:26,
  noNewPermissions:true,engineeringRelease:false};
}
/** Determine what kind of existing research workflow a request can use.
 * This function never performs research, calls providers or modifies sources.
 */
export function routeA26ResearchRequest(request,profile,externalPolicy){
 if(!request||request.agentId!=='INTEL-USV-26'||typeof request.taskId!=='string'||
    !/^[A-Za-z0-9][A-Za-z0-9_.-]{2,79}$/.test(request.taskId)||
    request.dataClassification!=='PUBLIC_SOURCE_SAFE_ONLY'||
    request.sourceVisibility!=='PUBLIC_ONLY')
    return {disposition:'HOLD_FOR_AUTHORITY_OR_DATA_CLASSIFICATION',executed:false};
 const mode=request.mode,action=request.action;
 const scope=profile?.modes?.[mode];
 if(!AUTHORIZED_MODES.includes(mode)||!scope||typeof action!=='string')
    return {disposition:'HOLD_UNKNOWN_WORKFLOW',executed:false};
 let actions;
 if(mode==='FLEET_INTELLIGENCE')actions=FLEET_ACTIONS;
 else if(mode==='CORRELATED_RESEARCH')actions=JOINT_ACTIONS;
 else actions=externalPolicy?.allowedAutonomousActions||[];
 if(!actions.includes(action)||
    externalPolicy?.alwaysForbidden?.includes(action)||
    externalPolicy?.blockedWithoutExplicitHumanAuthorization?.includes(action))
    return {disposition:'HOLD_UNAUTHORIZED_ACTION',executed:false};
 return {schemaVersion:1,taskId:request.taskId,canonicalAgent:'A26',mode,action,
  disposition:'RESEARCH_ROUTING_PROPOSAL_ONLY',outputContract:scope.output,
  sourceOfPermission:mode==='EXTERNAL_SOFTWARE'?externalPolicy.policyId:profile.charterId,
  executed:false,approved:false,engineeringEvidence:false,
  thirdPartyCodeExecuted:false,engineeringBaselineChanged:false};
}
export async function readAndValidateA26Charter(){
 const files=[PROFILE_FILE,EXTERNAL_POLICY_FILE,UNIFIED_CHARTER_FILE,BINDING_ANNEX_FILE,CANONICAL_AGENTS_FILE,LAB_CHARTER_FILE];
 const [p,ext,unified,annex,definitions,lab]=await Promise.all(files.map(x=>readFile(x,'utf8')));
 const profile=JSON.parse(p),externalPolicy=JSON.parse(ext);
 const summary=validateUnifiedProfile(profile,externalPolicy,unified,annex,definitions,lab);
 return {profile,externalPolicy,summary};
}
export async function main(args=process.argv.slice(2)){
 if(!(args.length===1&&args[0]==='--check')&&
    !(args.length===2&&args[0]==='--route-json'))
  hold('only --check or --route-json <trusted-json-path> supported');
 const {profile,externalPolicy,summary}=await readAndValidateA26Charter();
 if(args[0]==='--check'){console.log(JSON.stringify({...summary,status:'RESEARCH_ONLY_CHARTER_VALIDATED'}));return;}
 const request=JSON.parse(await readFile(path.resolve(args[1]),'utf8'));
 const result=routeA26ResearchRequest(request,profile,externalPolicy);
 console.log(JSON.stringify(result));
 if(result.disposition!=='RESEARCH_ROUTING_PROPOSAL_ONLY')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
