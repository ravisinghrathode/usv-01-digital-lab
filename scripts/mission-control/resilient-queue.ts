/**
 * Local operator command, not a GitHub Actions model runner.
 * Enqueue read-only research jobs for any canonical specialist, then dispatch
 * bounded attempts using the local ChatGPT-signed-in Codex subscription.
 */
import { execFileSync } from 'node:child_process';
import { ResilientAgentQueue, type QueueRequest } from '../../src/core/mission-control/ResilientAgentQueue.ts';
import { requireLabCommissioningPolicy } from '../../src/core/mission-control/LabCommissioningPolicy.ts';

const args = process.argv.slice(2);
const command = args[0] || 'status';
function arg(flag: string, fallback = ''): string {
  const i = args.indexOf(flag);
  return i < 0 ? fallback : (args[i + 1] || '');
}
function revision(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}
async function main(): Promise<void> {
  const queue = new ResilientAgentQueue();
  if (command === 'status') {
    console.log(JSON.stringify(await queue.status(), null, 2));
    return;
  }
  if (command === 'enqueue') {
    const taskId = arg('--id');
    const objective = arg('--objective');
    const agentId = arg('--agent');
    const lane = arg('--lane', 'MODEL_AGENT');
    const priority = Number(arg('--priority', '5'));
    if (!taskId || !objective || !agentId || objective.length > 4000) {
      throw new Error('enqueue requires --id TASK --agent A01..A26 --objective TEXT');
    }
    if (lane !== 'MODEL_AGENT' && lane !== 'OFFLINE_SCHEMA_CHECK') {
      throw new Error('Invalid lane: MODEL_AGENT or OFFLINE_SCHEMA_CHECK');
    }
    // Explicit public/synthetic classification is mandatory, never inferred.
    const dataClassification = arg('--classification', 'PUBLIC_SOURCE_SAFE_ONLY');
    const request: QueueRequest = {
      taskId, agentId, commitSha: revision(), priority, lane,
      input: {
        taskId,
        context: { objective, dataClassification, researchOnly: true,
          engineeringReleaseApproved: false, baselineWritesPermitted: false },
        parameters: {}
      }
    };
    const record = await queue.enqueue(request);
    console.log(JSON.stringify({
      taskId: record.taskId, agentId: record.agentId,
      state: record.state, lane: record.lane, pinnedCommit: record.commitSha,
      engineeringReleaseApproved: false
    }, null, 2));
    return;
  }
  if (command === 'run') {
    // Dispatch only operator-authorized research. The subscription adapter
    // independently authenticates ChatGPT and denies paid API credentials.
    requireLabCommissioningPolicy(process.env);
    const count = Number(arg('--max', '1'));
    if (!Number.isSafeInteger(count) || count < 1 || count > 10) {
      throw new Error('run --max must be from 1 to 10');
    }
    const results = [];
    for (let i = 0; i < count; i++) {
      const step = await queue.runOne(process.cwd());
      if (!step.taskId) break;
      results.push(step);
    }
    console.log(JSON.stringify({
      results, status: await queue.status(),
      engineeringReleaseApproved: false
    }, null, 2));
    return;
  }
  throw new Error('Commands: status | enqueue --id ... --agent ... --objective ... | run --max 1');
}
main().catch(error => {
  console.error('Quota-resilient Mission Control stopped:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
