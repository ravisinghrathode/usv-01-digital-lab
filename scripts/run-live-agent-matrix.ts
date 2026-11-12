import fs from 'node:fs';
import path from 'node:path';
import { runLiveAgentMatrix } from '../src/core/verification/LiveAgentMatrix.ts';

async function main() {
  const fileFlag = process.argv.indexOf('--cases');
  if (fileFlag < 0 || !process.argv[fileFlag + 1]) {
    throw new Error('Supply --cases PATH to a controlled JSON object containing A01..A26 engineering test cases');
  }
  const file = path.resolve(process.argv[fileFlag + 1]);
  if (fs.statSync(file).size > 2 * 1024 * 1024) throw new Error('Case file exceeds 2 MiB');
  const cases: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!cases || Array.isArray(cases) || typeof cases !== 'object') {
    throw new Error('Case file must be a JSON object keyed by canonical A01..A26 IDs');
  }
  const report = await runLiveAgentMatrix(cases as Record<string, any>);
  const outDir = path.resolve('governance/reports');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'agent-live-matrix.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    agents: report.totalAgents, liveProviderRuns: report.liveProviderRuns,
    complete: report.providerOperationalMatrixComplete, independentlyEngineeringValidated: false
  }, null, 2));
  if (!report.providerOperationalMatrixComplete) process.exitCode = 1;
}

main().catch(error => {
  console.error('Agent operational matrix failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
