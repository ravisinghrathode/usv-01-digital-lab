/**
 * Full bounded A26 Fleet Scout campaign. Every configured worldwide search is
 * attempted in shards, preserving the same unverified research register.
 * No GPT/paid provider, scraper credentials or engineering baseline writes.
 */
import {execFileSync} from 'node:child_process';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {validateConfig, validateRegister, emptyRegister, sourcePlan, runScout,
  toReviewMarkdown, toObsidianCandidate} from './a26-fleet-discovery.mjs';

const DEFAULT_CONFIG=fileURLToPath(new URL('../config/a26-fleet-discovery.json',import.meta.url));
const DEFAULT_REGISTER=fileURLToPath(new URL('../references/fleet-intelligence/discovery-register.json',import.meta.url));

export async function campaign({config,baseline=emptyRegister(),fetchImpl=fetch,
  fixtures=null,now=new Date().toISOString(),batchSize=24,maxBatches=4}) {
  validateConfig(config);validateRegister(baseline);
  if(!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>24||
    !Number.isSafeInteger(maxBatches)||maxBatches<1||maxBatches>8){
    throw Error('INVALID_CAMPAIGN_BOUNDS');
  }
  const plan=sourcePlan(config);
  const receipts=[];const batches=[];
  let register=structuredClone(baseline),newLeads=0,additionalEvidence=0;
  for(let offset=0;offset<plan.length && batches.length<maxBatches;offset+=batchSize){
    const run=await runScout({config,baseline:register,fixture:fixtures,
      fetchImpl,now,maxSources:batchSize,sourceOffset:offset});
    register=run.register;
    receipts.push(...run.sourceReceipts);
    newLeads+=run.newResearchLeads;
    additionalEvidence+=run.additionalArticleEvidence;
    batches.push({offset,attempted:run.sourcesAttempted,succeeded:run.sourcesSucceeded,
      failed:run.sourcesFailed,newResearchLeads:run.newResearchLeads,
      newEvidence:run.additionalArticleEvidence});
  }
  const successes=receipts.filter(x=>x.status==='SUCCESS').length;
  const attempted=receipts.length;
  return {
    schemaVersion:1,agentId:'INTEL-USV-26',scope:'PUBLIC_SOURCE_SAFE_ONLY',
    collectedAt:now,sourceRevision:'UNKNOWN',
    executionMode:fixtures?'OFFLINE_FIXTURE':'PUBLIC_RSS_METADATA',
    evidenceType:'PUBLIC_NEWS_METADATA_UNVERIFIED',
    campaignBatches:batches,
    totalPlannedSources:plan.length,sourcesAttempted:attempted,
    sourcesSucceeded:successes,sourcesFailed:attempted-successes,
    sourceReceipts:receipts,newResearchLeads:newLeads,
    additionalArticleEvidence:additionalEvidence,
    totalUnverifiedLeads:register.records.length,
    fleetModelsIndependentlyVerified:0,
    engineeringCalculationsVerified:0,
    globalCoverageComplete:false,
    coverageLimited:attempted<plan.length||register.records.length>=config.maxCandidates,
    needsIndependentReview:true,engineeringReleaseApproved:false,register
  };
}
export async function writeCampaign(report,outDir){
  await mkdir(outDir,{recursive:true,mode:0o700});
  await writeFile(path.join(outDir,'latest.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
  await writeFile(path.join(outDir,'proposal-register.json'),
    JSON.stringify(report.register,null,2)+'\n',{mode:0o600});
  await writeFile(path.join(outDir,'review-queue.md'),toReviewMarkdown(report),{mode:0o600});
  const notes=path.join(outDir,'candidate-notes');
  await mkdir(notes,{recursive:true,mode:0o700});
  for(const candidate of report.register.records.slice(0,200)){
    await writeFile(path.join(notes,candidate.id+'.md'),
      toObsidianCandidate(candidate),{mode:0o600});
  }
}
function parseArgs(args){
  const p={};
  for(let i=0;i<args.length;i++){
    const key=args[i];
    if(key==='--validate-only'){p.validateOnly=true;continue;}
    if(!['--out-dir','--fixture','--batch-size','--max-batches'].includes(key) ||
      !args[i+1] || args[i+1].startsWith('--'))throw Error('INVALID_ARGUMENT: '+key);
    p[key.slice(2)]=args[++i];
  }
  return p;
}
async function main(){
  const args=parseArgs(process.argv.slice(2));
  const config=validateConfig(JSON.parse(await readFile(DEFAULT_CONFIG,'utf8')));
  const baseline=validateRegister(JSON.parse(await readFile(DEFAULT_REGISTER,'utf8')));
  if(args.validateOnly){console.log(JSON.stringify({valid:true,
    configuredPublicQueries:sourcePlan(config).length,storedLeads:baseline.records.length,
    modelTokens:0}));return;}
  const fixture=args.fixture?JSON.parse(await readFile(args.fixture,'utf8')):null;
  const result=await campaign({config,baseline,fixtures:fixture,
    batchSize:args['batch-size']===undefined?24:Number(args['batch-size']),
    maxBatches:args['max-batches']===undefined?4:Number(args['max-batches'])});
  try{result.sourceRevision=execFileSync('git',['rev-parse','HEAD'],
    {encoding:'utf8',timeout:5000}).trim();}catch{}
  const out=args['out-dir']||path.join(os.tmpdir(),'usv01-a26-worldwide');
  await writeCampaign(result,out);
  console.log(JSON.stringify({
    status:result.sourcesSucceeded?'RESEARCH_LEADS_UNVERIFIED':'NETWORK_UNAVAILABLE',
    queriesAttempted:result.sourcesAttempted,queriesPlanned:result.totalPlannedSources,
    successful:result.sourcesSucceeded,failed:result.sourcesFailed,
    newResearchLeads:result.newResearchLeads,
    totalUnverifiedLeads:result.totalUnverifiedLeads,
    globalCoverageComplete:false,independentlyVerifiedVessels:0,
    noPaidModelCalls:true,outDir:out
  },null,2));
  if(result.sourcesSucceeded===0)process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{console.error('A26_GLOBAL_CAMPAIGN_FAILED_CLOSED:',
    String(error?.message||error));process.exitCode=1;});
}
