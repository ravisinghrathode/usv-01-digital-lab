import fs from 'node:fs';
import path from 'node:path';
import { runToolBenchmarkCampaign } from '../src/core/verification/ToolBenchmarkCampaign.ts';
import type { ToolReferenceCase } from '../src/core/verification/ToolBenchmarkCampaign.ts';

/** Reads externally supplied reference measurements; cannot authenticate their origin. */
async function main() {
  const i = process.argv.indexOf('--reference-file');
  if (i < 0 || !process.argv[i + 1]) throw new Error('Supply --reference-file controlled JSON array');
  const file = path.resolve(process.argv[i + 1]);
  if (fs.statSync(file).size > 2 * 1024 * 1024) throw new Error('Reference input >2 MiB');
  const cases: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(cases)) throw new Error('Reference bundle must be array');
  const result = await runToolBenchmarkCampaign(cases as ToolReferenceCase[]);
  const outDir = path.resolve('.local-concept-research/benchmarks');
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(outDir, 'tool-reference-screen-UNVERIFIED.json'), JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ status: result.status, comparisons: result.comparisons.comparisons.length,
    independentEngineeringValidated: false, engineeringReleaseAuthorized: false }, null, 2));
  if (result.status !== 'NUMERIC_SCREEN_PASS_UNCERTIFIED') process.exitCode = 1;
}
main().catch(e => { console.error('Benchmark input rejected:', e instanceof Error ? e.message : String(e)); process.exitCode = 1; });
