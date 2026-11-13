/**
 * Live research concept cycle. No simulated success or default vessel values.
 * Requires authorized server-side Gemini credentials, a source-identified
 * mission and exact source SHA. Produces local UNVERIFIED trade-study evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runAgentDesignLoop } from '../src/core/optimizer/AgentDesignLoop.ts';

const args = process.argv.slice(2);
const value = (name: string) => {
  const i = args.indexOf(name);
  if (i < 0 || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing flag ' + name);
  return args[i + 1];
};
const requireObject = (raw: unknown): Record<string, unknown> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Mission file must be JSON object');
  return raw as Record<string, unknown>;
};
async function main() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new Error('Actual agent design iterations require GEMINI_API_KEY on the authorized server; no offline simulation is substituted.');
  }
  const missionPath = path.resolve(value('--mission-file'));
  if (fs.statSync(missionPath).size > 2 * 1024 * 1024) throw new Error('Mission brief exceeds 2 MiB');
  const mission = requireObject(JSON.parse(fs.readFileSync(missionPath, 'utf8')));
  const sourceCommit = value('--source-sha');
  const seed = Number(value('--seed'));
  const maxRevisions = Number(value('--revisions'));
  const outDir = path.resolve('.local-concept-research/design-loops');
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const runId = 'USV01-LIVE-CONCEPT-' + sourceCommit.slice(0, 12) + '-S' + seed;
  const report = await runAgentDesignLoop({
    runId, sourceCommit, seed, maxRevisions,
    missionStatement: mission.missionStatement as string,
    requirements: mission.requirements as { id: string; statement: string; source: string }[],
    sourceReferences: (mission.researchSources || []) as { reference: string; description: string }[]
  });
  const filename = path.join(outDir, runId + '-UNVERIFIED.json');
  fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({
    runId, sourceCommit, seed, revisionCount: report.revisions.length,
    completedAgentCalls: report.completedAgentCalls,
    preliminaryToolScreens: report.completedToolScreens,
    stopReason: report.stopReason,
    independentEngineeringValidated: report.independentEngineeringValidated,
    engineeringReleaseAuthorized: report.engineeringReleaseAuthorized,
    localReportPath: filename
  }, null, 2));
  if (report.revisions.length === 0) process.exitCode = 1;
}
main().catch(error => {
  console.error('Design loop failed closed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
