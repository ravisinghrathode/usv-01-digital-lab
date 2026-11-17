import fs from 'node:fs';
import path from 'node:path';
import { summarizeUnverifiedRemediationLedger } from '../../src/core/remediation/RemediationStatus.ts';

function main(): void {
  const file = path.resolve('docs/remediation/status.json');
  const current = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  const report = summarizeUnverifiedRemediationLedger(current);
  console.log(JSON.stringify(report, null, 2));
}
try {
  main();
} catch (error) {
  console.error('REMEDIATION_STATUS_FAIL_CLOSED:',
    error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
