/**
 * Subscription-only, local CLI adapter pilot.
 * Deliberately separate from ModelProviderRouter and the existing server Gemini API integration.
 * Never passes AI API credentials into subprocesses.
 * This is NOT a GitHub approval, engineering verification, or autonomous merge mechanism.
 */
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';

export type PilotRole = 'orchestrator' | 'worker' | 'reviewer';
export interface PilotRequest {
  role: PilotRole;
  taskId: string;
  agentId: string;
  prompt: string;
  workingDirectory: string;
  timeoutMs?: number;
}
export interface PilotResult {
  role: PilotRole;
  taskId: string;
  agentId: string;
  status: 'COMPLETED' | 'FAILED' | 'UNAVAILABLE';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executable: string;
  verifiedByHuman: false;
}
export class SubscriptionCliUnavailable extends Error {}

const SAFE_ROLES: Record<PilotRole, { executable: string; args: (prompt: string) => string[] }> = {
  orchestrator: { executable: 'claude', args: prompt => ['-p', prompt] },
  worker: { executable: 'agy', args: prompt => ['-p', prompt] },
  reviewer: { executable: 'codex', args: prompt => ['exec', '--', prompt] }
};

/** Explicit opt-in; prevents accidental use from the existing application. */
export function validatePilotRequest(input: PilotRequest): void {
  if (process.env.USV_SUBSCRIPTION_PILOT !== 'enabled') {
    throw new SubscriptionCliUnavailable('Subscription CLI pilot disabled (set USV_SUBSCRIPTION_PILOT=enabled).');
  }
  if (!SAFE_ROLES[input.role]) throw new Error('Unknown role');
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(input.taskId)) throw new Error('Invalid taskId');
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(input.agentId)) throw new Error('Invalid agentId');
  if (!input.prompt.trim() || input.prompt.length > 16000) throw new Error('Invalid prompt');
  if (!input.workingDirectory.startsWith('/')) throw new Error('Absolute workingDirectory required');
}

/** Exclude every API-related environment credential and disable provider switches. */
export function sanitizedSubscriptionEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const filtered: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (/API.?KEY|API.?TOKEN|ACCESS.?TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH.?TOKEN|OPENAI_|ANTHROPIC_|GEMINI_|GOOGLE_GENAI_|VERTEX_|AWS_|AZURE_/i.test(key)) continue;
    if (key === 'USV_SUBSCRIPTION_PILOT') continue;
    filtered[key] = value;
  }
  // Discourage automatic upgrades to provider billing. A CLI that needs an API key must fail.
  filtered.USV_NO_PAID_API = '1';
  return filtered;
}

/**
 * Runs only one allowlisted CLI with fixed argument structure and no shell.
 * Local subscription login and non-interactive CLI support must be validated on the user's Mac.
 * Output is advisory data only, never approval evidence on its own.
 */
export async function runSubscriptionCli(input: PilotRequest): Promise<PilotResult> {
  validatePilotRequest(input);
  const directory = await stat(input.workingDirectory);
  if (!directory.isDirectory()) throw new Error('workingDirectory must be a directory');
  const spec = SAFE_ROLES[input.role];
  const timeoutMs = Math.min(Math.max(input.timeoutMs ?? 120_000, 1000), 300_000);
  return await new Promise<PilotResult>((resolve) => {
    let stdout = '', stderr = '', done = false;
    let timedOut = false;
    const finish = (status: PilotResult['status'], exitCode: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({
        role: input.role, taskId: input.taskId, agentId: input.agentId,
        status, stdout, stderr, exitCode, executable: spec.executable, verifiedByHuman: false
      });
    };
    const child = spawn(spec.executable, spec.args(input.prompt), {
      cwd: input.workingDirectory, env: sanitizedSubscriptionEnvironment(),
      shell: false, stdio: ['ignore', 'pipe', 'pipe']
    });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout = (stdout + chunk.toString('utf8')).slice(0, 200_000);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString('utf8')).slice(0, 50_000);
    });
    child.on('error', err => {
      stderr = err.message;
      finish('UNAVAILABLE', null);
    });
    child.on('close', code => finish(timedOut ? 'FAILED' : code === 0 ? 'COMPLETED' : 'FAILED', code));
  });
}
