import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 PROFILE_FILE,EXTERNAL_POLICY_FILE,UNIFIED_CHARTER_FILE,BINDING_ANNEX_FILE,
 CANONICAL_AGENTS_FILE,LAB_CHARTER_FILE,validateUnifiedProfile,
 routeA26ResearchRequest,readAndValidateA26Charter
} from '../scripts/a26-unified-governance.mjs';
import {validatePolicy,authorizeAction} from '../scripts/external-integration-agent.mjs';
const files=await Promise.all([
 PROFILE_FILE,EXTERNAL_POLICY_FILE,UNIFIED_CHARTER_FILE,BINDING_ANNEX_FILE,
 CANONICAL_AGENTS_FILE,LAB_CHARTER_FILE
].map(x=>readFile(x,'utf8')));
const [profileText,externalText,unified,annex,definitions,labText]=files;
const profile=JSON.parse(profileText),external=JSON.parse(externalText);
const clone=x=>structuredClone(x);
const check=(p=profile,e=external,c=unified,a=annex,d=definitions,l=labText)=>
 validateUnifiedProfile(p,e,c,a,d,l);
const request={agentId:'INTEL-USV-26',taskId:'A26-TEST-001',
 dataClassification:'PUBLIC_SOURCE_SAFE_ONLY',sourceVisibility:'PUBLIC_ONLY'};
test('one canonical A26 charter incorporates the original annex without weakening its policy',async()=>{
 const summary=check();
 assert.equal(summary.canonicalAgent,'A26');
 assert.equal(summary.agentCount,26);
 assert.equal(summary.externalR2RulesPreserved,10);
 assert.equal(summary.sourcePolicyRevision,2);
 assert.equal(summary.noNewPermissions,true);
 assert.equal(summary.engineeringRelease,false);
 assert.deepEqual((await readAndValidateA26Charter()).summary,summary);
 assert.equal(validatePolicy(external),external);
 assert.match(annex,/Amendment R2/);
});
test('source-of-authority references original canonical A26 and its historic permissions',()=>{
 const a=definitions.slice(definitions.indexOf("id: 'INTEL-USV-26'"));
 assert.ok(a.includes("executionPermissions: ['READ_ONLY', 'BASELINE_DRAFT']"));
 assert.ok(a.includes("preferredProvider: 'codex_cli'"));
 assert.ok(a.includes("name: 'Global Navy USV Fleet Intelligence & Benchmark Analyst'"));
 assert.equal(profile.labOperatingCharterAdoption,'NOT_ADOPTED_BY_THIS_PROFILE');
});
test('A26 fleet intelligence research routes to existing source-only work, not a new runtime agent',()=>{
 const x=routeA26ResearchRequest({...request,mode:'FLEET_INTELLIGENCE',action:'RESEARCH_PUBLIC_ACADEMIC_PAPERS'},profile,external);
 assert.equal(x.disposition,'RESEARCH_ROUTING_PROPOSAL_ONLY');
 assert.equal(x.canonicalAgent,'A26');assert.equal(x.executed,false);
 assert.equal(x.engineeringEvidence,false);
 assert.equal(x.outputContract,'UNVERIFIED_PUBLIC_INTELLIGENCE_DOSSIER');
});
test('A26 existing software integration actions remain subordinate to external policy revision 2',()=>{
 const allowed='DRAFT_ADAPTER_CONTRACT';
 assert.equal(authorizeAction(external,allowed).permitted,true);
 const x=routeA26ResearchRequest({...request,mode:'EXTERNAL_SOFTWARE',action:allowed},profile,external);
 assert.equal(x.disposition,'RESEARCH_ROUTING_PROPOSAL_ONLY');
 assert.equal(x.sourceOfPermission,external.policyId);
 for(const action of [...external.alwaysForbidden,
   ...external.blockedWithoutExplicitHumanAuthorization,'UNKNOWN_ROOT_SHELL']){
  assert.equal(routeA26ResearchRequest({...request,mode:'EXTERNAL_SOFTWARE',action},profile,external).disposition,'HOLD_UNAUTHORIZED_ACTION');
 }
});
test('combined intelligence/software requests only produce a non-executing gap handoff',()=>{
 const result=routeA26ResearchRequest({...request,mode:'CORRELATED_RESEARCH',action:'DRAFT_ENGINEERING_CAPABILITY_GAP'},profile,external);
 assert.equal(result.disposition,'RESEARCH_ROUTING_PROPOSAL_ONLY');
 assert.equal(result.outputContract,'DRAFT_INTELLIGENCE_TO_SOFTWARE_HANDOFF');
 assert.equal(result.thirdPartyCodeExecuted,false);
 assert.equal(result.engineeringBaselineChanged,false);
});
test('out-of-scope agent, unsafe sources, missing identifiers or unimplemented routing fail closed',()=>{
 for(const bad of [
  {...request,agentId:'A25',mode:'FLEET_INTELLIGENCE',action:'RESEARCH_PUBLIC_ACADEMIC_PAPERS'},
  {...request,dataClassification:'RESTRICTED_NAVY',mode:'FLEET_INTELLIGENCE',action:'CATALOG_PUBLIC_USV_EVIDENCE'},
  {...request,sourceVisibility:'PRIVATE',mode:'EXTERNAL_SOFTWARE',action:'RANK_DISCOVERIES'},
  {...request,taskId:'../unsafe',mode:'CORRELATED_RESEARCH',action:'CROSS_REFERENCE_PUBLIC_RESEARCH'},
  {...request,mode:'UNDECLARED',action:'CROSS_REFERENCE_PUBLIC_RESEARCH'},
  {...request,mode:'FLEET_INTELLIGENCE',action:'RUN_UNTRUSTED_EXECUTABLE'},
  {...request,mode:'CORRELATED_RESEARCH',action:'MERGE_PROTECTED_PR'},
  {...request,mode:'EXTERNAL_SOFTWARE',action:'DRAFT_PUBLIC_OBSIDIAN_KNOWLEDGE_NOTE'}
 ]){
  const result=routeA26ResearchRequest(bad,profile,external);
  assert.ok(result.disposition.startsWith('HOLD'),result.disposition);
  assert.equal(result.executed,false);
 }
});
test('unified profile cannot create A27, change authority or expand modes',()=>{
 for(const edit of [
  p=>{p.registrySize=27},
  p=>{p.canonicalId='A27'},
  p=>{p.registryAgentId='INTEL-USV-27'},
  p=>{p.modelPolicy='GPT_MODEL_SELF_APPROVED'},
  p=>{p.labOperatingCharterAdoption='ADOPTED'},
  p=>{p.bindingExternalPolicy='config/new-unreviewed-permissions.json'},
  p=>{p.modes.NEW_MODE={allowedPlanningActions:['RUN_SHELL']}},
  p=>{p.modes.EXTERNAL_SOFTWARE.allowedPlanningActions=['RUN_UNTRUSTED_EXECUTABLE']},
  p=>{p.modes.FLEET_INTELLIGENCE.allowedPlanningActions.push('ACTUATE_VESSEL')},
  p=>{p.modes.CORRELATED_RESEARCH.existingImplementation='AUTONOMOUS_RUNTIME_AGENT'},
  p=>{p.enforcement.noThirdPartyExecution=false},
  p=>{p.enforcement.noModelPermissionChange=false},
  p=>{p.enforcement.noNewToolPermission=false},
  p=>{p.enforcement.newPermission='APPROVE'},
  p=>{p.verification.mandatoryExternalReviewRoles=[]},
  p=>{p.verification.requiredExternalAnnexRules.pop()},
  p=>{p.verification.expectedPermissions.push('CALCULATION_EXEC')},
  p=>{p.verification.noClaimOfLiveCrawlOrModelCommissioning=false}
 ]){
  const altered=clone(profile);edit(altered);
  assert.throws(()=>check(altered),/HOLD/);
 }
});
test('source-code and original annex are checked rather than trusting a second agent declaration',()=>{
 assert.throws(()=>check(profile,external,unified,annex.replace('**R2.05 —','**R2.XX —')),/HOLD/);
 assert.throws(()=>check(profile,external,unified,annex.replace('Amendment R2','AMENDED PERMISSION')), /HOLD/);
 assert.throws(()=>check(profile,external,unified,annex,definitions.replace("id: 'INTEL-USV-26'","id: 'INTEL-USV-27'")),/HOLD/);
 assert.throws(()=>check(profile,external,unified,annex,definitions.replace("executionPermissions: ['READ_ONLY', 'BASELINE_DRAFT']","executionPermissions: ['READ_ONLY', 'CALCULATION_EXEC']")),/HOLD/);
 assert.throws(()=>check(profile,external,unified,annex,definitions,labText.replace('PROPOSED — NOT ADOPTED','ADOPTED')),/HOLD/);
});
test('changes to protected external-policy sandbox/roles/status are detected',()=>{
 for(const edit of [
 e=>{e.revision=3},
 e=>{e.enforcement.autoMerge=true},
 e=>{e.enforcement.autoRegistryWrites=true},
 e=>{e.enforcement.autoVesselRelease=true},
 e=>{e.sandboxHardening.network='host'},
 e=>{e.sandboxHardening.minIndependentReferenceCases=1},
 e=>{e.mandatoryRoles.independentChallenge=[]},
 e=>{e.allowedAutonomousActions.push('MERGE_PROTECTED_PR')}
 ]){
  const altered=clone(external);edit(altered);assert.throws(()=>check(profile,altered),/HOLD/);
 }
});
