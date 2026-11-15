/**
 * A26 R3 policy consistency check. Supplemental; cannot replace protected
 * governance, Director/ECR signatures or binding R2 verifier.
 */
import {readFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const get=async file=>readFile(new URL(file,root),'utf8');
export async function checkR3(getFile=get){
 const [rules,charter,core,queue,collector,legacy]=await Promise.all([
  getFile('AGENTS.md'),getFile('docs/governance/A26_UNIFIED_AGENT_OPERATING_CHARTER.md'),
  getFile('scripts/a26/unified-evidence.mjs'),getFile('scripts/mission-control/resilient-queue.ts'),
  getFile('scripts/a26/global-research.mjs'),getFile('scripts/a26-unified-governance.mjs')]);
 const required=[
  [rules,/A26 unified public research ingestion policy/,'R3_AGENT_RULES_MISSING'],
  [rules,/R2\.01–R2\.10/,'BINDING_ANNEX_NOT_PRESERVED'],
  [charter,/## R3 — Unified evidence intake/,'R3_CHARTER_MISSING'],
  [charter,/engineering release/,'RELEASE_BOUNDARY_MISSING'],
  [core,/A26_UNIFIED_PUBLIC_RESEARCH_V1/,'SHARED_EVIDENCE_CONTRACT_MISSING'],
  [core,/FLEET_LEAD/,'FLEET_ADAPTER_MISSING'],
  [core,/KNOWLEDGE_DOCUMENT/,'DOCUMENT_ADAPTER_MISSING'],
  [core,/USV_SOURCE_SNAPSHOT/,'SNAPSHOT_ADAPTER_MISSING'],
  [core,/engineeringReleaseApproved:false/,'NO_RELEASE_GUARD_MISSING'],
  [queue,/--unified-index/,'A26_QUEUE_HANDOFF_MISSING'],
  [collector,/consolidate\(\{snapshots:index\}\)/,'SOURCE_COLLECTOR_NOT_UNIFIED'],
  [legacy,/R2\.01/,'LEGACY_R2_CHECK_MISSING']
 ];
 const missing=required.filter(([value,pattern])=>!pattern.test(value)).map(x=>x[2]);
 if(missing.length)throw Error('A26_R3_GOVERNANCE_HOLD:'+missing.join(','));
 return {policy:'A26_R3_PROPOSED',consistent:true,
   independentlyReviewed:false,engineeringReleaseApproved:false,
   priorR2VerifierStillRequired:true};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 try{console.log(JSON.stringify(await checkR3(),null,2));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
