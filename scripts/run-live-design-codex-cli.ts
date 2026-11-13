/**
 * Source-controlled design campaign through the operator's signed-in Codex CLI.
 * No Gemini SDK, OpenAI API key, cached token extraction, or API billing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const revisionArg = process.argv.includes('--revisions')
  ? process.argv[process.argv.indexOf('--revisions') + 1] : '3';
const seedArg = process.argv.includes('--seed')
  ? process.argv[process.argv.indexOf('--seed') + 1] : '1337';
if (!/^[1-5]$/.test(revisionArg || '')) throw new Error('--revisions must be 1..5');
if (!/^\d+$/.test(seedArg || '') || Number(seedArg) > 0xffffffff) {
  throw new Error('--seed must be unsigned 32-bit integer');
}
try {
  const version = execFileSync('codex', ['--version'], {
    encoding: 'utf8', timeout: 15_000
  }).trim();
  if (!version) throw new Error('Empty version');
  console.log('Codex CLI found:', version);
} catch {
  throw new Error('Codex CLI is unavailable. Authenticate via the officially supported ChatGPT sign-in; no API key fallback.');
}

const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8', timeout: 5000
}).trim();
if (!/^[0-9a-f]{40}$/.test(sourceSha)) throw new Error('Exact source SHA unavailable');

// Never pass billable API credentials to the data-collection and design subprocesses.
const env: NodeJS.ProcessEnv = { ...process.env,
  AI_REVIEW_PROVIDER: 'codex_cli',
  USV_SUBSCRIPTION_PILOT: 'enabled',
  USV_ALLOW_PAID_AI_API: 'false',
  USV_NO_PAID_API: '1'
};
for (const key of Object.keys(env)) {
  if (/^(GEMINI|OPENAI|ANTHROPIC|GOOGLE_GENAI|AZURE)_/i.test(key) ||
      /API.?KEY|ACCESS.?TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(key)) delete env[key];
}

const research = spawnSync('npm', ['run', 'research:collect-public'], {
  cwd: root, stdio: 'inherit', env
});
if (research.status !== 0) throw new Error('Public engineering source collection failed closed');

const mission = path.resolve('.local-concept-research/publications/mission-with-fetched-publications.json');
if (!fs.existsSync(mission)) throw new Error('Fetched-source mission bundle missing');

const run = spawnSync('npm', ['run', 'design:iterate', '--',
  '--mission-file', mission,
  '--source-sha', sourceSha,
  '--seed', seedArg,
  '--revisions', revisionArg
], { cwd: root, stdio: 'inherit', env });
if (run.status !== 0) {
  throw new Error('Codex CLI design iteration failed closed: check official ChatGPT sign-in and qualified source inputs.');
}
console.log(JSON.stringify({
  status: 'LIVE_CODEX_CLI_DESIGN_CAMPAIGN_COMPLETED_UNVERIFIED',
  sourceSha, seed: Number(seedArg), revisions: Number(revisionArg),
  transport: 'OPERATOR_AUTHENTICATED_CODEX_CLI_NO_API_KEY',
  independentEngineeringValidated: false,
  engineeringReleaseAuthorized: false
}, null, 2));
