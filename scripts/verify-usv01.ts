/**
 * CLI Entrypoint for VERIFY USV-01 Single-Press Systems Verification
 * 
 * Usage:
 *   npx tsx scripts/verify-usv01.ts [options]
 *   node --experimental-strip-types scripts/verify-usv01.ts [options]
 * 
 * Options:
 *   --json                 Output raw JSON to stdout
 *   --allow-conditional    Exit 0 on CONDITIONAL verdict (for local developer inspection)
 *   --out-dir <dir>        Directory to store verification report artifacts
 */

import fs from 'fs';
import path from 'path';
import { VerifyUsv01Engine } from '../src/core/verification/VerifyUsv01Engine.ts';

async function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes('--json');
  const allowConditional = args.includes('--allow-conditional');
  
  let outDir = path.join(process.cwd(), 'governance', 'reports');
  const outDirIdx = args.indexOf('--out-dir');
  if (outDirIdx !== -1 && args[outDirIdx + 1]) {
    outDir = path.resolve(args[outDirIdx + 1]);
  }

  const engine = VerifyUsv01Engine.getInstance(process.cwd());
  const report = await engine.executeVerification();

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const jsonReportPath = path.join(outDir, 'verify-usv01-report.json');
  const mdReportPath = path.join(outDir, 'verify-usv01-report.md');

  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdReportPath, report.reportMarkdown);

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n' + report.reportMarkdown + '\n');
    } catch {}
  }

  if (jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.reportMarkdown);
    console.log(`\n📄 Reports saved to:\n  - ${jsonReportPath}\n  - ${mdReportPath}\n`);
  }

  if (report.overallVerdict === 'FAIL') {
    console.error(`\n🚫 VERIFICATION FAILED: Mandatory checks or governance criteria unmet.\n`);
    process.exit(1);
  }

  if (report.overallVerdict === 'CONDITIONAL' && !allowConditional && (process.env.CI || process.env.GITHUB_ACTIONS)) {
    console.error(`\n🚫 VERIFICATION CONDITIONAL: Human authorization or Director signature pending.\n`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal VERIFY USV-01 error:', err);
  process.exit(1);
});
