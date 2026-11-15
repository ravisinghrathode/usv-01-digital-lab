/**
 * Zero-model host check for preferred Sol + controlled Gemini fallback.
 * A version check never proves Google OAuth or actual model entitlement.
 */
import { spawnSync } from 'node:child_process';
import { sanitizedSubscriptionEnvironment } from '../../src/core/mission-control/SubscriptionCliAdapter.ts';
import { CHATGPT_SOL_MODEL, GEMINI_HYDROGEN_MODEL, dualProviderEnabled,
  geminiTransferAuthorized } from '../../src/core/models/DualSubscriptionRoutingPolicy.ts';

const env=sanitizedSubscriptionEnvironment();
const codex=spawnSync('codex',['login','status'],{env,timeout:8000,encoding:'utf8'});
const authText=((codex.stdout||'')+' '+(codex.stderr||'')).toLowerCase();
const codexOAuth=codex.status===0 && /logged in using chatgpt/.test(authText) &&
  !/api[- ]?key|access token/.test(authText);
const gemini=spawnSync('gemini',['--version'],{env,timeout:8000,encoding:'utf8'});
const geminiCliPresent=gemini.status===0 && Boolean((gemini.stdout||'').trim());
const report={
  schema:'usv01-dual-provider-zero-model-health/v1',
  noModelCalls:true,
  preferredProvider:'codex_cli',
  preferredModelRequested:CHATGPT_SOL_MODEL,
  secondaryProvider:'gemini_cli',
  secondaryModelRequested:GEMINI_HYDROGEN_MODEL,
  codexOAuthObserved:codexOAuth,
  geminiCliPresent,
  geminiOAuthVerifiedByThisCheck:false,
  geminiModelEntitlementVerifiedByThisCheck:false,
  researchRoutingEnabled:dualProviderEnabled(),
  publicDataTransferOperatorAttested:geminiTransferAuthorized(),
  authenticated26AgentCampaignCompleted:false,
  independentlyEngineeringValidated:false,
  engineeringReleaseApproved:false
};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--require-ready')&&
  (!codexOAuth||!geminiCliPresent||!report.researchRoutingEnabled||
    !report.publicDataTransferOperatorAttested)){
  process.exitCode=1;
}
