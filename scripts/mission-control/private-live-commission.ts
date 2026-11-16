/**
 * Standalone, no-GitHub-runner A04 research commissioning supervisor.
 *
 * GitHub's official security guidance prohibits putting cached OAuth and
 * signing-key credentials on self-hosted runners in a public repository.
 * This local command runs only in the operator's isolated checkout, never
 * on GitHub Actions or a remote CI environment.
 *
 * This script does NOT itself prove an independent A04 review, perform model
 * qualification, authorize physical operations, or promote a vessel baseline.
 */
import { spawnSync, execFileSync } from 'node:child_process';
import { statSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { sanitizedSubscriptionEnvironment, assertUsvRepositoryWorkingDirectory }
  from '../../src/core/mission-control/SubscriptionCliAdapter.ts';
import { requireLabCommissioningPolicy }
  from '../../src/core/mission-control/LabCommissioningPolicy.ts';
import { dualProviderEnabled }
  from '../../src/core/models/DualSubscriptionRoutingPolicy.ts';
import { assertPinnedCleanGitRevision }
  from '../../src/core/mission-control/GitRevisionGuard.ts';

const FULL_SHA=/^[a-f0-9]{40}$/;
const HOST_ID=/^[A-Za-z0-9][A-Za-z0-9_.-]{2,79}$/;
const APPROVED_REMOTES = new Set([
  'https://github.com/ravisinghrathode/usv-01-digital-lab',
  'https://github.com/ravisinghrathode/usv-01-digital-lab.git',
  'git@github.com:ravisinghrathode/usv-01-digital-lab.git',
  'ssh://git@github.com/ravisinghrathode/usv-01-digital-lab.git'
]);

export interface PrivateCommissionGate {
  approved:boolean; blockers:string[]; researchOnly:true;
  engineeringReleaseApproved:false; usesGitHubActionsRunner:false;
}
export function inspectPrivateCommissionGate(
  sourceSha:string,env:NodeJS.ProcessEnv
):PrivateCommissionGate{
  const blockers:string[]=[];
  if (env.GITHUB_ACTIONS==='true' || env.GITHUB_RUN_ID || env.RUNNER_TRACKING_ID ||
      env.CI==='true' || env.CI==='1') {
    blockers.push('MUST_RUN_ON_PRIVATE_OPERATOR_HOST_NOT_CI');
  }
  if(!FULL_SHA.test(sourceSha))blockers.push('INVALID_EXACT_SOURCE_SHA');
  if(env.USV_A04_AUTHORIZED_SHA!==sourceSha)blockers.push('REVIEWED_A04_SOURCE_AUTHORIZATION_MISSING');
  if(!HOST_ID.test(env.USV01_HOST_ID||''))blockers.push('STABLE_PRIVATE_HOST_ID_MISSING');
  if(!dualProviderEnabled(env))blockers.push('SOL_FIRST_RESEARCH_POLICY_DISABLED');
  const lab=requireLabDecision(env);
  if(!lab)blockers.push('RESEARCH_ONLY_COMMISSIONING_POLICY_DENIED');
  return {approved:blockers.length===0,blockers,researchOnly:true,
    engineeringReleaseApproved:false,usesGitHubActionsRunner:false};
}
function requireLabDecision(env:NodeJS.ProcessEnv):boolean{
  try {requireLabCommissioningPolicy(env);return true;}catch{return false;}
}
/** Resolve symlinks before enforcing the approved research catalog roots. */
export function resolveControlledCatalog(cwd:string,catalogArg:string):string{
  if(path.isAbsolute(catalogArg))
    throw new Error('USV_PRIVATE_COMMISSION_CATALOG_MUST_BE_REPO_RELATIVE');
  const requested=path.resolve(cwd,catalogArg);
  const root=realpathSync(cwd);
  const catalog=realpathSync(requested);
  const allowed=[path.join(root,'evidence'),path.join(root,'references')]
    .some(dir=>catalog.startsWith(dir+path.sep));
  if(!allowed || !catalog.endsWith('.json'))
    throw new Error('USV_PRIVATE_COMMISSION_UNCONTROLLED_CATALOG_PATH');
  if(lstatSync(requested).isSymbolicLink())
    throw new Error('USV_PRIVATE_COMMISSION_CATALOG_SYMLINK_DENIED');
  const info=statSync(catalog);
  if(!info.isFile() || info.size>2*1024*1024)
    throw new Error('USV_PRIVATE_COMMISSION_CATALOG_INVALID_OR_TOO_LARGE');
  return path.relative(root,catalog);
}
function flag(args:string[],key:string):string{
  const at=args.indexOf(key);
  if(at<0||!args[at+1]||args[at+1].startsWith('--'))
    throw new Error('USV_PRIVATE_COMMISSION_MISSING_FLAG: '+key);
  return args[at+1];
}
function runStep(cwd:string,env:NodeJS.ProcessEnv,label:string,args:string[]):void{
  console.log('USV PRIVATE COMMISSION: '+label);
  const result=spawnSync('npm',['run',...args],{
    cwd,env,shell:false,stdio:'inherit',
    timeout:label.startsWith('Authenticated research-only 26-agent')
      ? 180*60*1000 : 60*60*1000
  });
  if(result.error || result.status!==0)
    throw new Error('USV_PRIVATE_COMMISSION_FAILED_CLOSED: '+label);
}
async function main():Promise<void>{
  const args=process.argv.slice(2);
  if(args.includes('--plan') && !args.includes('--execute')){
    console.log(JSON.stringify({
      mode:'ZERO_MODEL_PLAN_ONLY',
      publicRepositoryLiveJobsBlocked:true,privateHostRequired:true,
      sourceBindingRequired:true,a04IndependentOperatorReviewRequired:true,
      primaryRequestedModel:'gpt-6.1-sol',
      secondaryRequestedModel:'gemini-4-hydrogen',
      geminiDataTransferDefault:'DENY',
      engineeringReleaseApproved:false,
      steps:['verify clean reviewed source','A04 local host probe',
        'approved-public-data Gemini catalog gate','dual-provider no-model inventory',
        'Codex ChatGPT subscription preflight','26-agent zero-model input preflight',
        '26 actual agent model attempts','fresh signed host receipt',
        'independent operational assessment without vessel release']
    },null,2));
    return;
  }
  if(!args.includes('--execute'))
    throw new Error('USV_PRIVATE_COMMISSION_EXPLICIT_EXECUTE_REQUIRED');
  const cwd=process.cwd();
  const sourceSha=flag(args,'--source-sha');
  const catalogArg=flag(args,'--catalog');
  const gate=inspectPrivateCommissionGate(sourceSha,process.env);
  if(!gate.approved)
    throw new Error('USV_PRIVATE_COMMISSION_BLOCKED: '+gate.blockers.join(','));
  const remote=execFileSync('git',['remote','get-url','origin'],{
    cwd,encoding:'utf8',timeout:8000
  }).trim();
  if(!APPROVED_REMOTES.has(remote))
    throw new Error('USV_PRIVATE_COMMISSION_UNAPPROVED_GIT_REMOTE');
  await assertUsvRepositoryWorkingDirectory(cwd);
  await assertPinnedCleanGitRevision(cwd,sourceSha);
  const reviewedMain=execFileSync('git',['rev-parse','refs/remotes/origin/main'],{
    cwd,encoding:'utf8',timeout:8000
  }).trim();
  if(reviewedMain!==sourceSha)
    throw new Error('USV_PRIVATE_COMMISSION_SOURCE_NOT_PINNED_TO_ORIGIN_MAIN');
  const catalog=resolveControlledCatalog(cwd,catalogArg);

  // Preserve only the approved subscription and research flags. Billing/API
  // tokens never enter child processes through environment variables.
  const env=sanitizedSubscriptionEnvironment(process.env);
  env.AI_REVIEW_PROVIDER='codex_cli';
  env.USV_SUBSCRIPTION_PILOT='enabled';
  env.USV_LAB_SCOPE='RESEARCH_ONLY';
  env.USV_ALLOW_PAID_AI_API='false';
  env.USV_DUAL_PROVIDER_ROUTING='enabled';

  runStep(cwd,env,'Independent A04 host probe (unattested only)',
    ['mission-control:a04-check','--','--source-sha',sourceSha]);
  // A04 probe is not a human signature. USV_A04_AUTHORIZED_SHA must have
  // been recorded externally by a qualified operator before this command.
  runStep(cwd,env,'Public-only Gemini transfer authorization gate',
    ['mission-control:gemini-catalog','--','--catalog',catalog]);
  runStep(cwd,env,'Zero-model provider inventory',
    ['mission-control:model-health']);
  runStep(cwd,env,'Authenticated ChatGPT subscription preflight',
    ['mission-control:preflight']);
  runStep(cwd,env,'26-agent controlled deterministic preflight',
    ['acceptance:codex-agents','--','--catalog',catalog,'--require-ready']);
  runStep(cwd,env,'Authenticated research-only 26-agent campaign',
    ['acceptance:codex-agents','--','--catalog',catalog,'--execute']);
  await assertPinnedCleanGitRevision(cwd,sourceSha);
  runStep(cwd,env,'Sign private current-host execution receipt',
    ['mission-control:attest-host']);
  runStep(cwd,env,'Require signed exact-source operational gate',
    ['acceptance:full-26','--',
      '--report','data/codex-26-agent-matrix.json',
      '--preflight','data/codex-26-agent-preflight.json',
      '--host','data/codex-host-health.json',
      '--reviews','data/independent-reviews.json',
      '--source-sha',sourceSha,'--require-operational']);
  console.log('USV_PRIVATE_COMMISSION_COMPLETE_UNCERTIFIED: '+
    'operational model evidence only; independent review and vessel release remain blocked.');
}
if(process.argv[1]?.endsWith('private-live-commission.ts')) {
  main().catch(err=>{
    console.error(err instanceof Error?err.message:'USV_PRIVATE_COMMISSION_UNKNOWN_FAILURE');
    process.exitCode=1;
  });
}
