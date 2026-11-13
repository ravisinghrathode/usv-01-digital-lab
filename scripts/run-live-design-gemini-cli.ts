/**
 * One-command, no-API-key live design commissioning using the operator's
 * existing Gemini CLI authentication. This does not automate login or harvest
 * OAuth credentials. It fails closed unless the CLI itself is available.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root=process.cwd();
const gemini=process.env.GEMINI_CLI_BINARY||'gemini';
const revisions=process.argv.includes('--revisions')
  ? process.argv[process.argv.indexOf('--revisions')+1] : '3';
const seed=process.argv.includes('--seed')
  ? process.argv[process.argv.indexOf('--seed')+1] : '1337';
if(!/^[1-5]$/.test(revisions||''))throw new Error('--revisions must be 1..5');
if(!/^\d+$/.test(seed||'')||Number(seed)>0xffffffff)throw new Error('--seed must be unsigned 32-bit integer');

try{
  const version=execFileSync(gemini,['--version'],{encoding:'utf8',timeout:15000}).trim();
  if(!version)throw new Error('empty version');
  console.log('Gemini CLI detected:',version);
}catch{
  throw new Error('Gemini CLI is not available. Install it and authenticate interactively once; this script never requests or stores an API key/OAuth token.');
}

const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',timeout:5000}).trim();
if(!/^[0-9a-f]{40}$/.test(sourceSha))throw new Error('Exact Git source SHA unavailable');

// Refresh controlled public-source bytes locally before a live research run.
const research=spawnSync('npm',['run','research:collect-public'],{
  cwd:root,stdio:'inherit',env:process.env
});
if(research.status!==0)throw new Error('Public engineering source collection failed closed');

const mission=path.resolve('.local-concept-research/publications/mission-with-fetched-publications.json');
if(!fs.existsSync(mission))throw new Error('Fetched-source mission bundle was not generated');

const env={...process.env,
  AI_REVIEW_PROVIDER:'gemini_cli',
  GEMINI_MODEL:process.env.GEMINI_MODEL?.trim()||'auto'
};
// Force the no-API transport even if a stale key exists in the shell.
delete env.GEMINI_API_KEY;

const run=spawnSync('npm',['run','design:iterate','--',
  '--mission-file',mission,
  '--source-sha',sourceSha,
  '--seed',seed,
  '--revisions',revisions
],{cwd:root,stdio:'inherit',env});
if(run.status!==0){
  throw new Error('Live Gemini CLI design campaign failed closed. If authentication is missing, run the Gemini CLI interactively and sign in; do not add an API key merely to bypass this gate.');
}
console.log(JSON.stringify({
  status:'LIVE_GEMINI_CLI_DESIGN_CAMPAIGN_COMPLETED_UNVERIFIED',
  sourceSha,seed:Number(seed),revisions:Number(revisions),
  transport:'OPERATOR_AUTHENTICATED_GEMINI_CLI_NO_API_KEY',
  engineeringReleaseAuthorized:false
},null,2));
