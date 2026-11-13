/**
 * USV-01 evidence decision CLI: no source measurements or approval are fabricated.
 * Usage: npm run evidence:gate0 -- --baseline-sha <40-character Git SHA>
 * Optional: --input PRIVATE_JSON --require-review-ready
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  parseEvidenceDecisionInput, evaluateEvidenceDecision, evidenceDecisionMarkdown
} from '../src/core/verification/EvidenceDecisionGate.ts';

const args=process.argv.slice(2);
function argument(flag: string): string | undefined {
  const i=args.indexOf(flag);
  if(i<0) return undefined;
  if(!args[i+1] || args[i+1].startsWith('--')) throw new Error('Missing value: '+flag);
  return args[i+1];
}
function readJson(location:string):unknown {
  const file=path.resolve(location);
  if(fs.statSync(file).size>2*1024*1024) throw new Error('Evidence manifest exceeds 2 MiB');
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
try {
  const source=argument('--input') || 'governance/evidence/USV01_GATE0_SEED.json';
  const current=argument('--baseline-sha') ||
    process.env.PR_HEAD_SHA || process.env.GITHUB_SHA || process.env.RELEASE_COMMIT_SHA || '';
  const outDir=path.resolve(argument('--out-dir') || 'governance/reports');
  const input=parseEvidenceDecisionInput(readJson(source));
  const result=evaluateEvidenceDecision(input,current);
  const markdown=evidenceDecisionMarkdown(result);
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(path.join(outDir,'evidence-gate0.json'),JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'evidence-gate0.md'),markdown);
  if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n'+markdown+'\n');
  console.log(markdown);
  if(result.problems.includes('INVALID_EVALUATED_COMMIT') ||
     (args.includes('--require-review-ready') && !result.gate0ReadyForExternalReview) ||
     (args.includes('--require-approved') && !result.releaseApproved)) process.exitCode=1;
} catch(e) {
  console.error('Evidence decision input rejected:',e instanceof Error?e.message:String(e));
  process.exitCode=1;
}
