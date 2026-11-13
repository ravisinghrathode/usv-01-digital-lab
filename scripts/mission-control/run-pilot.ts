import path from 'node:path';
import { MissionControlCoordinator } from '../../src/core/mission-control/MissionControlCoordinator.ts';
import { MissionControlStore } from '../../src/core/mission-control/MissionControlStore.ts';
import { requireLabCommissioningPolicy } from '../../src/core/mission-control/LabCommissioningPolicy.ts';

const args = process.argv.slice(2);
const readArg = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const agentId = readArg('--agent') || 'REQ-TRC-02';
const objective = readArg('--objective') || 'Verify one bounded Mission Control handoff without changing an engineering baseline.';
const commitSha = readArg('--commit') || process.env.USV_PILOT_COMMIT_SHA || '';
const workingDirectory = path.resolve(readArg('--cwd') || process.cwd());

if (!commitSha) {
  console.error('Missing --commit <git-sha>. Mission Control refuses unpinned pilot evidence.');
  process.exit(2);
}

// Existing subscription pilot opt-in permits non-operational research only;
 // it cannot authorize baseline release, even if a reviewer approves a draft.
const commissioning = requireLabCommissioningPolicy(process.env);

const store = new MissionControlStore(path.join(workingDirectory, 'data', 'mission_control_state.json'));
const coordinator = new MissionControlCoordinator(store);
const result = await coordinator.execute({
  taskId: `PILOT-${Date.now()}`,
  specialistAgentId: agentId,
  objective,
  requirements: [
    'Preserve all existing USV specialist-agent authority boundaries.',
    'Do not use paid AI API credentials.',
    'Do not claim human approval.',
    'Unknown engineering values remain TBD.'
  ],
  parameters: {},
  context: { pilot: true, nonBaseline: true, commissioningScope: commissioning.scope, engineeringReleaseApproved: false },
  commitSha,
  workingDirectory,
  safetyCritical: false,
  maxReviewCycles: 2
});

console.log(JSON.stringify({ ...result, commissioning }, null, 2));
if (result.state === 'FAILED' || result.state === 'BLOCKED') process.exitCode = 1;
