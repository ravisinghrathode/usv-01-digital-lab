/**
 * One-command acceptance inventory:
 * npm run acceptance:campaign
 * npm run acceptance:campaign -- --require-approved   (strict exit status)
 *
 * No secrets, untrusted external URLs, or simulated human attestations.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runAcceptanceCampaign, acceptanceCampaignMarkdown } from '../src/core/verification/AcceptanceCampaign.ts';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out-dir');
const outDir = outIdx >= 0 && args[outIdx + 1] ? path.resolve(args[outIdx + 1]) :
  path.resolve('governance/reports');
const baselineSha = process.env.GITHUB_SHA || process.env.RELEASE_COMMIT_SHA || '';
const report = runAcceptanceCampaign({ baselineSha });
const markdown = acceptanceCampaignMarkdown(report);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'acceptance-campaign.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'acceptance-campaign.md'), markdown);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n' + markdown + '\n');
}
console.log(markdown);
if (!report.structurallyValid || report.missingCriteria.length || args.includes('--require-approved') && !report.releaseApproved) {
  process.exitCode = 1;
}
