/**
 * A04 operator-local, no-model-call trusted-host preflight.
 * Writes a redacted and gitignored local receipt. This is NOT A04 independent attestation.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  mkdirSync, lstatSync, statSync, mkdtempSync, writeFileSync, rmSync, statfsSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertPinnedCleanGitRevision } from '../../src/core/mission-control/GitRevisionGuard.ts';
import {
  assertUsvRepositoryWorkingDirectory,
  sanitizedSubscriptionEnvironment
} from '../../src/core/mission-control/SubscriptionCliAdapter.ts';
import { evaluateLabCommissioningPolicy } from '../../src/core/mission-control/LabCommissioningPolicy.ts';
import {
  assessA04HostProbe, isChatgptSubscriptionLogin
} from '../../src/core/mission-control/A04HostPreflight.ts';

const expectedIndex = process.argv.indexOf('--source-sha');
const expectedSha = expectedIndex >= 0 ? (process.argv[expectedIndex + 1] || '') : '';
const cwd = process.cwd();
const safeCommand = (executable: string, args: string[]) => {
  try {
    const result = spawnSync(executable, args, {
      cwd, env: sanitizedSubscriptionEnvironment(), encoding: 'utf8',
      timeout: 8000, maxBuffer: 32_000, shell: false
    });
    return { code: result.status, output: ((result.stdout || '') + ' ' + (result.stderr || '')).slice(0, 8000) };
  } catch {
    return { code: null, output: '' };
  }
};

const sha256 = (input: string) => createHash('sha256').update(input).digest('hex');
const codex = safeCommand('codex', ['--version']);
const login = safeCommand('codex', ['login', 'status']); // no model tokens
const versionMatch = codex.code === 0 ? codex.output.match(/\b\d+\.\d+\.\d+(?:[-.][a-z0-9.]+)?\b/i) : null;
const codexVersion = versionMatch?.[0] || null;

let actualSha = '';
try {
  actualSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd, encoding: 'utf8', stdio: ['ignore','pipe','ignore'], timeout: 8000
  }).trim();
} catch { /* no source baseline */ }

let repositoryIdentityVerified = false;
try {
  await assertUsvRepositoryWorkingDirectory(cwd);
  repositoryIdentityVerified = true;
} catch { /* do not record sensitive diagnostic or local path */ }

let trackedWorktreeClean = false;
if (/^[a-f0-9]{40}$/.test(expectedSha)) {
  try {
    await assertPinnedCleanGitRevision(cwd, expectedSha);
    trackedWorktreeClean = true;
  } catch { /* revision mismatch or dirty checkout */ }
}

let checkoutOwnerMatchesOperator = false;
try {
  const uid = typeof process.getuid === 'function' ? process.getuid() : undefined;
  checkoutOwnerMatchesOperator = uid !== undefined && statSync(cwd).uid === uid;
} catch { /* unsupported or owner differs */ }

let tempStorageWritable = false;
try {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'usv-a04-probe-'));
  try {
    const dest = path.join(directory, 'test');
    writeFileSync(dest, 'A04', { mode: 0o600, flag: 'wx' });
    const info = statSync(dest);
    tempStorageWritable = (info.mode & 0o077) === 0;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
} catch { /* failed private scratch check */ }

const hostAlias = process.env.USV01_HOST_ID || '';
const stableHostAliasConfigured = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,79}$/.test(hostAlias);
const policy = evaluateLabCommissioningPolicy(process.env);
const probe = {
  expectedSha, actualSha, repositoryIdentityVerified, trackedWorktreeClean,
  checkoutOwnerMatchesOperator, codexCliPresent: !!codexVersion,
  chatgptSubscriptionAuthenticated: isChatgptSubscriptionLogin(login.output, login.code),
  researchPolicyPermitted: policy.permitted, tempStorageWritable,
  stableHostAliasConfigured,
  hostPlatformObserved: !!os.platform() && !!os.arch()
};
const decision = assessA04HostProbe(probe);

let freeDiskMiB: number | null = null;
try {
  const fsinfo = statfsSync(cwd);
  freeDiskMiB = Math.floor((fsinfo.bavail * fsinfo.bsize) / (1024 ** 2));
} catch { /* optional telemetry, not attestation */ }

const receipt = {
  schemaVersion: 'USV-A04-HOST-PREFLIGHT-1.0',
  observedAtUtc: new Date().toISOString(),
  type: 'NON_SECRET_LOCAL_OBSERVATION_UNATTESTED',
  sourceSha: actualSha,
  expectedSourceSha: expectedSha,
  stableHostAliasSha256: stableHostAliasConfigured ? sha256(hostAlias) : null,
  platform: os.platform(), architecture: os.arch(),
  cpuLogicalCount: os.cpus().length,
  memoryMiB: Math.floor(os.totalmem() / (1024 ** 2)),
  freeDiskMiB,
  nodeVersion: process.versions.node,
  codexVersion,
  checks: {
    repositoryIdentityVerified, trackedWorktreeClean, checkoutOwnerMatchesOperator,
    codexCliPresent: probe.codexCliPresent,
    chatgptSubscriptionAuthenticated: probe.chatgptSubscriptionAuthenticated,
    researchPolicyPermitted: policy.permitted,
    privateTempStorageVerified: tempStorageWritable,
    stableHostAliasConfigured
  },
  sandboxReview: {
    localSandboxAndNetworkRestrictionsIndependentlyReviewed: false,
    resourceAdequacyIndependentlyReviewed: false,
    sourceRevisionReviewedByOperator: false
  },
  decision,
  independentSoftwareOperationsSignoff: null,
  receiptIndependentlyVerified: false
} as const;

// Never output raw login text, raw env values, local usernames, hostname or keys.
const dataDir = path.join(cwd, 'data');
try {
  mkdirSync(dataDir, { mode: 0o700, recursive: true });
  if (!lstatSync(dataDir).isDirectory() || lstatSync(dataDir).isSymbolicLink()) {
    throw new Error('Unsafe local evidence directory');
  }
  const dest = path.join(dataDir, 'a04-host-readiness-' + Date.now() + '-' +
    randomBytes(4).toString('hex') + '.json');
  const serialized = JSON.stringify(receipt, null, 2) + '\n';
  writeFileSync(dest, serialized, { flag: 'wx', mode: 0o600 });
  console.log('A04 preflight: ' + decision.status);
  console.log('Evidence: private data/*.json receipt; SHA256=' + sha256(serialized));
  console.log('Pending: independent software operations review; no A04 release is authorized.');
  if (decision.blockerCodes.length) console.log('Blockers: ' + decision.blockerCodes.join(', '));
  process.exitCode = decision.status === 'BLOCKED' ? 1 : 0;
} catch {
  console.error('A04 preflight BLOCKED: cannot safely write private, gitignored receipt');
  process.exitCode = 1;
}
