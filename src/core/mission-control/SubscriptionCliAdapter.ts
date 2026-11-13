/**
 * Subscription-only local CLI adapter.
 *
 * Guardrails:
 * - disabled unless USV_SUBSCRIPTION_PILOT=enabled;
 * - strips API/billing credentials from child processes;
 * - fixed executable allowlist and no shell;
 * - read-only / plan execution modes for orchestration and review;
 * - never grants engineering approval or merge authority.
 */
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

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

export interface CliSpec {
  executable: string;
  args: (prompt: string) => string[];
}

export const SAFE_ROLES: Record<PilotRole, CliSpec> = {
  orchestrator: {
    executable: 'claude',
    args: prompt => [
      '-p', prompt,
      '--output-format', 'json',
      '--permission-mode', 'plan',
      '--max-turns', '4'
    ]
  },
  worker: {
    executable: 'agy',
    args: prompt => [
      '-p', prompt,
      '--output-format', 'json',
      '--mode', 'plan'
    ]
  },
  reviewer: {
    executable: 'codex',
    args: prompt => [
      'exec',
      '--sandbox', 'read-only',
      prompt
    ]
  }
};

/** Explicit opt-in prevents accidental live subscription use from the existing application. */
export function validatePilotRequest(input: PilotRequest): void {
  if (process.env.USV_SUBSCRIPTION_PILOT !== 'enabled') {
    throw new SubscriptionCliUnavailable(
      'Subscription CLI pilot disabled (set USV_SUBSCRIPTION_PILOT=enabled).'
    );
  }
  if (!SAFE_ROLES[input.role]) throw new Error('Unknown role');
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(input.taskId)) throw new Error('Invalid taskId');
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(input.agentId)) throw new Error('Invalid agentId');
  if (!input.prompt.trim() || input.prompt.length > 24_000) throw new Error('Invalid prompt');
  if (!input.workingDirectory.startsWith('/')) throw new Error('Absolute workingDirectory required');
}

/**
 * Remove credentials that could switch a signed-in desktop/CLI product onto billable API access.
 * The CLIs may still use their own cached account/session credentials stored outside environment variables.
 */
export function sanitizedSubscriptionEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const filtered: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (
      /API.?KEY|API.?TOKEN|ACCESS.?TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH.?TOKEN/i.test(key) ||
      /^(OPENAI|ANTHROPIC|GEMINI|GOOGLE_GENAI|VERTEX|AWS|AZURE)_/i.test(key)
    ) {
      continue;
    }
    if (key === 'USV_SUBSCRIPTION_PILOT' || key === 'USV_ALLOW_PAID_AI_API') continue;
    filtered[key] = value;
  }
  filtered.USV_NO_PAID_API = '1';
  filtered.USV_ALLOW_PAID_AI_API = 'false';
  return filtered;
}

/**
 * Prevent the subscription CLIs from being pointed at an arbitrary directory.
 * Git worktrees are supported because validation uses repository content, not .git directory shape.
 */
export async function assertUsvRepositoryWorkingDirectory(workingDirectory: string): Promise<void> {
  const packagePath = path.join(workingDirectory, 'package.json');
  const registryPath = path.join(workingDirectory, 'src', 'core', 'registry', 'AgentRegistry.ts');
  try {
    const [packageText, registryStat] = await Promise.all([
      readFile(packagePath, 'utf8'),
      stat(registryPath)
    ]);
    const packageJson = JSON.parse(packageText);
    if (packageJson?.name !== 'usv-01-digital-lab' || !registryStat.isFile()) {
      throw new Error('repository identity mismatch');
    }
  } catch {
    throw new Error('workingDirectory must be a USV-01 Digital Lab repository/worktree');
  }
}

/** Fixed command metadata for preflight checks without invoking a model. */
export function getSubscriptionCliSpecs(): Record<PilotRole, Pick<CliSpec, 'executable'>> {
  return {
    orchestrator: { executable: SAFE_ROLES.orchestrator.executable },
    worker: { executable: SAFE_ROLES.worker.executable },
    reviewer: { executable: SAFE_ROLES.reviewer.executable }
  };
}

/**
 * Run exactly one allowlisted local CLI. Any missing executable, missing cached login,
 * quota exhaustion, permission denial, or non-zero exit is surfaced; there is no API fallback.
 */
export async function runSubscriptionCli(input: PilotRequest): Promise<PilotResult> {
  validatePilotRequest(input);
  const directory = await stat(input.workingDirectory);
  if (!directory.isDirectory()) throw new Error('workingDirectory must be a directory');
  await assertUsvRepositoryWorkingDirectory(input.workingDirectory);

  const spec = SAFE_ROLES[input.role];
  const timeoutMs = Math.min(Math.max(input.timeoutMs ?? 180_000, 1000), 600_000);

  return await new Promise<PilotResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let done = false;
    let timedOut = false;

    const finish = (status: PilotResult['status'], exitCode: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({
        role: input.role,
        taskId: input.taskId,
        agentId: input.agentId,
        status,
        stdout,
        stderr,
        exitCode,
        executable: spec.executable,
        verifiedByHuman: false
      });
    };

    const child = spawn(spec.executable, spec.args(input.prompt), {
      cwd: input.workingDirectory,
      env: sanitizedSubscriptionEnvironment(),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout = (stdout + chunk.toString('utf8')).slice(0, 500_000);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString('utf8')).slice(0, 100_000);
    });
    child.on('error', err => {
      stderr = err.message;
      finish('UNAVAILABLE', null);
    });
    child.on('close', code => {
      finish(timedOut ? 'FAILED' : code === 0 ? 'COMPLETED' : 'FAILED', code);
    });
  });
}
