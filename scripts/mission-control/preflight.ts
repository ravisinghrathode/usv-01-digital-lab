import { spawnSync } from 'node:child_process';
import { getSubscriptionCliSpecs, sanitizedSubscriptionEnvironment } from '../../src/core/mission-control/SubscriptionCliAdapter.ts';

const specs = getSubscriptionCliSpecs();
let failed = false;

console.log('USV-01 Mission Control local preflight');
console.log('Policy: signed-in subscription CLI only; paid AI API credentials are excluded from Mission Control child processes.\n');

for (const [role, spec] of Object.entries(specs)) {
  const check = spawnSync('/usr/bin/env', ['which', spec.executable], {
    encoding: 'utf8',
    env: sanitizedSubscriptionEnvironment()
  });
  if (check.status === 0) {
    console.log(`PASS ${role.padEnd(12)} ${spec.executable} -> ${check.stdout.trim()}`);
  } else {
    failed = true;
    console.error(`FAIL ${role.padEnd(12)} missing executable '${spec.executable}'`);
  }
}

const exposedBillingVars = Object.keys(process.env).filter(key =>
  /API.?KEY|API.?TOKEN/i.test(key) || /^(OPENAI|ANTHROPIC|GEMINI|GOOGLE_GENAI|VERTEX)_/i.test(key)
);
if (exposedBillingVars.length) {
  console.warn(`WARN shell contains ${exposedBillingVars.length} API/provider credential variable(s); Mission Control strips them before child execution.`);
}

// Official Codex CLI login status checks credentials without any model call.
const auth = spawnSync('codex', ['login', 'status'], {
  encoding: 'utf8', timeout: 8000, env: sanitizedSubscriptionEnvironment()
});
const authMode = ((auth.stdout || '') + ' ' + (auth.stderr || '')).toLowerCase();
if (auth.status === 0 && authMode.includes('chatgpt') &&
    !/api[- ]?key|access token/.test(authMode)) {
  console.log('PASS ChatGPT OAuth subscription session is active; no model tokens consumed.');
} else {
  failed = true;
  console.error('FAIL Codex is not authenticated with the intended ChatGPT account (API-key mode is refused).');
}
console.log('This preflight does not execute any of the 26 specialist agents.');
if (failed) process.exitCode = 1;
