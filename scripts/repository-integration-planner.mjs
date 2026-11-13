/** Bridges Scout output to a source-pinned engineering investigation queue.
 * Read-only: does not produce runnable specs, install, execute, approve or modify a registry.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const SHA = /^[0-9a-f]{40}$/;

export function parsePlanArgs(argv) {
  const x = {};
  for (let i=0; i<argv.length; i++) {
    if (!['--scout-report','--out-dir','--limit'].includes(argv[i]) || !argv[i+1] || argv[i+1].startsWith('--')) throw Error('Unknown or missing argument '+argv[i]);
    x[argv[i].slice(2)] = argv[++i];
  }
  if (!x['scout-report']) throw Error('--scout-report required');
  const limit = x.limit === undefined ? 5 : Number(x.limit);
  if (!Number.isSafeInteger(limit) || limit<1 || limit>10) throw Error('Limit must be 1..10');
  return {scoutReport:x['scout-report'], outDir:x['out-dir'] || path.join(os.tmpdir(),'usv01-integration-queue'), limit};
}

export async function planInvestigations(scout, {limit=5, fetchImpl=fetch, token='', now=new Date().toISOString()}={}) {
  if (!scout || !Array.isArray(scout.candidates) || !String(scout.provider || '').match(/^(OFFLINE_TEST_FIXTURE|GITHUB_PUBLIC_REPOSITORY_SEARCH)$/)) throw Error('Expected actual USV-01 Scout report');
  const selected = [];
  const seen = new Set();
  for (const c of scout.candidates) {
    if (selected.length >= limit) break;
    if (!c || !REPO.test(c.name || '') || seen.has(c.name.toLowerCase()) || c.url !== `https://github.com/${c.name}`) continue;
    seen.add(c.name.toLowerCase());
    selected.push(c);
  }
  if (!selected.length) throw Error('No valid candidates in scout report');
  const records=[];
  const problems=[];
  const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'USV-01-Integration-Planner'};
  if(token) headers.Authorization=`Bearer ${token}`;
  async function get(url) {
    const response=await fetchImpl(url,{headers,signal:AbortSignal.timeout(20000)});
    if(!response.ok) throw Error(`GitHub HTTP ${response.status}`);
    return response.json();
  }
  for(const c of selected) {
    try {
      const base=`https://api.github.com/repos/${c.name}`;
      const metadata=await get(base);
      if(metadata.private || metadata.archived || metadata.disabled || metadata.full_name?.toLowerCase()!==c.name.toLowerCase() || !metadata.default_branch) throw Error('Repository not public/live or default branch absent');
      const commit=await get(`${base}/commits/${encodeURIComponent(metadata.default_branch)}`);
      if(!SHA.test(commit.sha || '') || !SHA.test(commit.commit?.tree?.sha || '')) throw Error('Missing exact commit/tree identifiers');
      records.push({
        repository:c.name,
        scoreFromScout:c.score,
        softwareEngineeringEvidence:'UNVERIFIED_METADATA',
        sourceUrl:`https://github.com/${c.name}/tree/${commit.sha}`,
        pinnedCommit:commit.sha, pinnedTree:commit.commit.tree.sha,
        sourcePinRetrievedAt:now,
        licenseSpdx:metadata.license?.spdx_id || 'UNKNOWN',
        assignedAgents:[...new Set([...(c.agentReviewers || []).filter(x=>/^A(0[1-9]|1\d|2[0-6])$/.test(x)), 'A15','A23','A20','A21','A18','A24'])].sort(),
        nextStep:'WRITE_AND_REVIEW_INTEGRATION_SPEC',
        missing:{adapter:'TBD',runnerImageDigest:'TBD',independentReferenceCases:'TBD',licenseApproval:'TBD',securityAudit:'TBD'},
        automaticallyInstalled:false,
        approved:false
      });
    } catch(error) {
      problems.push({repository:c.name,reason:String(error.message || error).slice(0,250)});
    }
  }
  if(!records.length) throw Error('No candidate revision resolved: '+problems.map(x=>x.reason).join('; '));
  return {schemaVersion:1,phase:'SCOUT_TO_INTEGRATION_INVESTIGATION_QUEUE',generatedAt:now,sourceScoutGeneratedAt:scout.generatedAt || null,sourceRevision:scout.sourceCommit || null,records,errors:problems,scope:'READ_ONLY_REVIEW_QUEUE',toolRegistered:false,vesselReleased:false};
}

export async function main(argv=process.argv.slice(2)) {
  const opts=parsePlanArgs(argv);
  const scout=JSON.parse(await readFile(opts.scoutReport,'utf8'));
  const queue=await planInvestigations(scout,{limit:opts.limit,token:process.env.GITHUB_TOKEN || ''});
  await mkdir(opts.outDir,{recursive:true,mode:0o700});
  await writeFile(path.join(opts.outDir,'investigation-queue.json'),JSON.stringify(queue,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({status:queue.phase,pinned:queue.records.length,errors:queue.errors.length,approved:false},null,2));
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(err=>{console.error('Investigation planner failed closed:',err.message || String(err));process.exitCode=1;});
}