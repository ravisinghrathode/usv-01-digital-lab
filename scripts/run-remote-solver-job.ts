import fs from 'node:fs';
import path from 'node:path';
import { createSolverJobManifest, submitRemoteSolverJob } from '../src/core/verification/RemoteSolverJobs.ts';
import type { SolverJobRequest } from '../src/core/verification/RemoteSolverJobs.ts';

/** Remote service must be separately provisioned; never execute arbitrary SSH or local shell. */
async function main() {
  const i = process.argv.indexOf('--job-file');
  if (i < 0 || !process.argv[i + 1]) throw new Error('Supply --job-file controlled JSON manifest');
  const file = path.resolve(process.argv[i + 1]);
  if (fs.statSync(file).size > 1024 * 1024) throw new Error('Solver manifest exceeds 1 MiB');
  const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  const manifest = createSolverJobManifest(raw as SolverJobRequest);
  const result = await submitRemoteSolverJob(manifest);
  const outDir = path.resolve('.local-concept-research/remote-solvers');
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const reportFile = path.join(outDir, manifest.jobRef + '.json');
  fs.writeFileSync(reportFile, JSON.stringify({ manifest, result }, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ jobRef: manifest.jobRef, status: result.status, qualityScreenPassed: result.qualityScreenPassed,
    engineeringReleaseAuthorized: false, reportFile }, null, 2));
  if (result.status === 'REJECTED') process.exitCode = 1;
}
main().catch(e => { console.error('Solver job submission blocked:', e instanceof Error ? e.message : String(e)); process.exitCode = 1; });
