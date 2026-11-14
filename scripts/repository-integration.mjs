/**
 * USV-01 Repository Integration Pipeline — supplementary service, NOT an engineering agent.
 * Public GitHub sources only. All outputs are unverified research/review artifacts.
 * Node >=20, no npm dependencies. No auto-registration or vessel release.
 */
import { readFile, writeFile, mkdir, lstat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHA = /^[0-9a-f]{40}$/;
const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const ID = /^[a-z][a-z0-9-]{2,60}$/;
const TOOL = /^TOOL-EXT-[A-Z0-9-]{3,50}$/;
// Accept registry manifest digest OR measured local Docker image config ID.
const IMAGE = /^(?:[a-zA-Z0-9_.:/-]+@)?sha256:[0-9a-f]{64}$/;
const MAX_TREE_FILES = 3500;
const MAX_TREE_BYTES = 150 * 1024 * 1024;
const MAX_STDOUT_BYTES = 256 * 1024;
const VALID_COMMANDS = new Set(['intake', 'stage', 'verify', 'propose']);

export function validateSpec(raw, {requireRunner = true} = {}) {
  if (!raw || raw.schemaVersion !== 1 || !ID.test(raw.id ?? '') ||
      !REPO.test(raw.repository ?? '') || !SHA.test(raw.commit ?? '') || !TOOL.test(raw.toolId ?? '')) {
    throw Error('Spec requires schemaVersion=1, safe id, public owner/repo, exact 40-hex commit, TOOL-EXT-* toolId');
  }
  const agents = raw.agents;
  if (!Array.isArray(agents) || !agents.length || agents.length > 26 ||
      !agents.every(a => /^A(0[1-9]|1\d|2[0-6])$/.test(a))) throw Error('Invalid assigned engineering reviewers');
  if (typeof raw.purpose !== 'string' || raw.purpose.length < 12 || raw.purpose.length > 500) throw Error('Purpose must be explicit');
  if ((requireRunner || raw.runner !== undefined) && (!raw.runner || !IMAGE.test(raw.runner.image ?? '') || !Array.isArray(raw.runner.argv) ||
      raw.runner.argv.length < 1 || raw.runner.argv.length > 16 ||
      !raw.runner.argv.every(x => typeof x === 'string' && x.length >= 1 && x.length <= 300 && !/[\r\n\0]/.test(x)))) {
    throw Error('Runner requires a digest-pinned image and bounded argv array; no shell expansion');
  }
  if ((requireRunner || raw.cases !== undefined) && (!Array.isArray(raw.cases) || raw.cases.length < 1 || raw.cases.length > 20)) throw Error('At least one reference case required (max 20)');
  for (const c of (raw.cases || [])) {
    if (!c || !ID.test(c.id ?? '') || !c.input || typeof c.input !== 'object' || Array.isArray(c.input) ||
        !c.expected || typeof c.expected !== 'object' || Array.isArray(c.expected) ||
        !Object.keys(c.expected).length || !Object.values(c.expected).every(v => Number.isFinite(v) || typeof v === 'string' || typeof v === 'boolean') ||
        (c.absoluteTolerance !== undefined && (!c.absoluteTolerance || typeof c.absoluteTolerance !== 'object' || Object.values(c.absoluteTolerance).some(v => !Number.isFinite(v) || v < 0)))) {
      throw Error('Invalid reference case. Expected flat finite numeric/string/boolean outputs with optional nonnegative tolerances');
    }
    const unknown = Object.keys(c.absoluteTolerance || {}).filter(k => !Object.keys(c.expected).includes(k));
    if (unknown.length) throw Error('Tolerance must correspond to expected value');
  }
  if (raw.cases && new Set(raw.cases.map(c => c.id)).size !== raw.cases.length) throw Error('Duplicate reference-case IDs');
  return raw;
}

export function parseArgs(argv) {
  const command = argv[0];
  if (!VALID_COMMANDS.has(command)) throw Error('Command must be intake | stage | verify | propose');
  const opts = {command};
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--execute') { opts.execute = true; continue; }
    if (arg === '--acknowledge-third-party-risk') { opts.acknowledge = true; continue; }
    if (!['--spec', '--out-dir'].includes(arg) || !argv[i + 1] || argv[i + 1].startsWith('--')) throw Error(`Invalid argument ${arg}`);
    opts[arg.slice(2).replace('out-dir', 'outDir')] = argv[++i];
  }
  if (!opts.spec) throw Error('--spec is required');
  if (command === 'verify' && !opts.execute) throw Error('verify requires --execute and explicit risk acknowledgement');
  if (opts.execute && (command !== 'verify' || !opts.acknowledge)) throw Error('--execute requires verify and explicit risk acknowledgement');
  if (opts.acknowledge && !opts.execute) throw Error('Risk acknowledgement only belongs to --execute');
  return opts;
}

async function writeJson(filename, data) {
  await mkdir(path.dirname(filename), {recursive: true, mode: 0o700});
  await writeFile(filename, JSON.stringify(data, null, 2) + '\n', {mode: 0o600});
}

async function loadJson(filename) { return JSON.parse(await readFile(filename, 'utf8')); }

export async function githubIntake(spec, fetchImpl = fetch, token = '') {
  validateSpec(spec, {requireRunner: false});
  const base = `https://api.github.com/repos/${spec.repository}`;
  const headers = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'USV-01-Repository-Integration'};
  if (token) headers.Authorization = `Bearer ${token}`;
  const get = async (url) => {
    const r = await fetchImpl(url, {headers, signal: AbortSignal.timeout(20000)});
    if (!r.ok) throw Error(`GitHub intake HTTP ${r.status}`);
    return r.json();
  };
  const repo = await get(base);
  if (repo.private || repo.archived || repo.disabled || repo.full_name?.toLowerCase() !== spec.repository.toLowerCase()) throw Error('Repo must be public, live and match requested identity');
  const commit = await get(`${base}/commits/${spec.commit}`);
  if (commit.sha !== spec.commit || !SHA.test(commit.commit?.tree?.sha ?? '')) throw Error('Commit pin/tree mismatch');
  return {
    schemaVersion: 1,
    phase: 'INTAKE_ONLY',
    at: new Date().toISOString(),
    repository: spec.repository,
    sourceUrl: `https://github.com/${spec.repository}/tree/${spec.commit}`,
    commit: spec.commit,
    tree: commit.commit.tree.sha,
    defaultBranch: repo.default_branch ?? null,
    metadataLicenseSpdx: repo.license?.spdx_id ?? 'UNKNOWN',
    metadataLicenseIsLegalApproval: false,
    upstreamLastPush: repo.pushed_at ?? null,
    authorDate: commit.commit.author?.date ?? null,
    securityReview: 'NOT_PERFORMED',
    adoption: 'HOLD_FOR_REVIEW'
  };
}

/** Limited subprocess runner with no shell, capped output, timeout and an injected test seam. */
export async function execBounded(program, args, {cwd, stdin = '', timeoutMs = 30000, env = process.env, maxBytes = MAX_STDOUT_BYTES} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, {cwd, env, stdio: ['pipe', 'pipe', 'pipe'], shell: false});
    let stdout = '', stderr = '', total = 0, capped = false, timedOut = false;
    const timer = setTimeout(() => {timedOut = true; child.kill('SIGKILL');}, timeoutMs);
    const collect = (which) => (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {capped = true; child.kill('SIGKILL'); return;}
      if (which === 'out') stdout += chunk.toString('utf8');
      else stderr += chunk.toString('utf8');
    };
    child.stdout.on('data', collect('out'));
    child.stderr.on('data', collect('err'));
    child.on('error', error => {clearTimeout(timer); reject(error);});
    child.on('close', code => {
      clearTimeout(timer);
      if (timedOut) reject(Error(`${program} timed out`));
      else if (capped) reject(Error(`${program} output limit exceeded`));
      else if (code !== 0) reject(Error(`${program} exited ${code}: ${stderr.slice(0, 1200)}`));
      else resolve({stdout, stderr, code});
    });
    child.stdin.on('error', () => {});
    child.stdin.end(stdin);
  });
}

export async function checkSourceTree(dir) {
  let count = 0, total = 0;
  const manifestNames = new Set(['LICENSE','LICENSE.md','LICENSE.txt','COPYING','package.json','package-lock.json','pnpm-lock.yaml','requirements.txt','pyproject.toml','Cargo.lock','Cargo.toml','CMakeLists.txt','Dockerfile','go.mod','go.sum','README.md']);
  const findings = [];
  const manifests = [];
  async function walk(base, depth) {
    if (depth > 12) throw Error('Source depth exceeds limit');
    for (const entry of await readdir(base)) {
      if (entry === '.git') continue;
      const full = path.join(base, entry);
      const stats = await lstat(full);
      if (stats.isSymbolicLink() || !stats.isFile() && !stats.isDirectory()) throw Error('Symlink or special file in untrusted source — staging refused');
      if (stats.isDirectory()) { await walk(full, depth + 1); continue; }
      total += stats.size; count++;
      if (total > MAX_TREE_BYTES || count > MAX_TREE_FILES) throw Error('Untrusted source exceeds size/count budget');
      if (manifestNames.has(entry) && depth <= 2) {
        const b = await readFile(full);
        manifests.push({path: path.relative(dir, full), sha256: createHash('sha256').update(b).digest('hex'), bytes: b.length});
      }
      if (/\.github\/workflows\//.test(full.replaceAll('\\', '/'))) findings.push('Upstream workflows are present; never run them as part of staging');
    }
  }
  await walk(dir, 0);
  return {fileCount: count, bytes: total, manifests: manifests.sort((a,b)=>a.path.localeCompare(b.path)), observations: [...new Set(findings)], securityScan: 'NOT_PERFORMED', licenseCompatibility: 'REQUIRES_HUMAN_LEGAL_REVIEW', sbom: 'NOT_GENERATED'};
}

/** Public source staging does NOT execute project scripts or submodules. */
export async function stageSource(spec, outDir, exec = execBounded) {
  validateSpec(spec, {requireRunner: false});
  const base = path.resolve(outDir);
  const source = path.join(base, 'source', spec.id);
  await mkdir(source, {recursive: true, mode: 0o700});
  const safeGitEnv = {...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: os.devNull, GIT_TERMINAL_PROMPT: '0'};
  const git = (args) => exec('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'protocol.file.allow=never', '-c', 'protocol.ext.allow=never', '-c', 'fetch.recurseSubmodules=false', ...args], {cwd: source, timeoutMs: 120000, env: safeGitEnv});
  await git(['init', '--quiet']);
  await git(['fetch', '--quiet', '--no-tags', '--no-recurse-submodules', '--depth=1', `https://github.com/${spec.repository}.git`, spec.commit]);
  await git(['checkout', '--quiet', '--detach', '--force', 'FETCH_HEAD']);
  const head = (await git(['rev-parse', 'HEAD'])).stdout.trim();
  const tree = (await git(['rev-parse', 'HEAD^{tree}'])).stdout.trim();
  if (head !== spec.commit || !SHA.test(tree)) throw Error('Fail closed: fetched source does not match exact commit');
  const tracked = (await git(['ls-files', '--stage'])).stdout;
  if (tracked.split('\n').some(line => /^(120000|160000) /.test(line))) throw Error('Refusing symlink/submodule tracked entries');
  const inspected = await checkSourceTree(source);
  const receipt = {
    phase: 'SOURCE_STAGED_NO_EXECUTION', at: new Date().toISOString(), repo: spec.repository, commit: head, tree,
    source, inspected, dynamicExecution: false, approved: false
  };
  await writeJson(path.join(base, 'stage.json'), receipt);
  return receipt;
}

export function dockerArgs(spec, sourceDir) {
  validateSpec(spec);
  const dir = path.resolve(sourceDir);
  if (!path.isAbsolute(dir)) throw Error('Source must be absolute');
  return [
    'run', '--rm', '--pull=never', '--interactive', '--network=none', '--read-only',
    '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=64',
    '--memory=512m', '--cpus=1', '--user=65534:65534',
    '--tmpfs=/tmp:rw,nosuid,nodev,noexec,size=32m',
    '--workdir=/candidate', '--env=HOME=/tmp',
    `--mount=type=bind,src=${dir},dst=/candidate,readonly`,
    spec.runner.image, ...spec.runner.argv
  ];
}

export function assessCase(c, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {pass: false, details: ['Output must be a JSON object']};
  const details = [];
  for (const [key, target] of Object.entries(c.expected)) {
    const actual = raw[key];
    if (typeof target === 'number') {
      const tolerance = c.absoluteTolerance?.[key] ?? 0;
      if (!Number.isFinite(actual) || Math.abs(actual - target) > tolerance) details.push(`${key}: expected ${target} +/- ${tolerance}, got ${String(actual)}`);
    } else if (actual !== target) details.push(`${key}: value mismatch`);
  }
  return {pass: !details.length, details};
}

export async function verifyCandidate(spec, outDir, exec = execBounded) {
  validateSpec(spec);
  const base = path.resolve(outDir);
  const staged = await loadJson(path.join(base, 'stage.json'));
  if (staged.commit !== spec.commit || staged.repo !== spec.repository || !SHA.test(staged.tree ?? '')) throw Error('Stage receipt inconsistent with candidate');
  const source = path.join(base, 'source', spec.id);
  if (staged.source !== source) throw Error('Source path mismatch');
  const head = await exec('git', ['-C', source, 'rev-parse', 'HEAD'], {timeoutMs: 15000});
  const tree = await exec('git', ['-C', source, 'rev-parse', 'HEAD^{tree}'], {timeoutMs: 15000});
  const dirty = await exec('git', ['-C', source, 'status', '--porcelain', '--untracked-files=all'], {timeoutMs: 15000});
  if (head.stdout.trim() !== spec.commit || tree.stdout.trim() !== staged.tree || dirty.stdout.trim()) throw Error('Source mutated or source provenance mismatch');
  // Even a clean Git tree may contain newly malicious upstream code. The isolated host is still untrusted.
  const cases = [];
  for (const c of spec.cases) {
    try {
      const output = await exec('docker', dockerArgs(spec, source), {
        stdin: JSON.stringify(c.input) + '\n', timeoutMs: 45000, maxBytes: MAX_STDOUT_BYTES,
        env: {PATH: process.env.PATH || '/usr/bin:/bin', HOME: process.env.HOME || '/tmp'}
      });
      const got = JSON.parse(output.stdout.trim());
      const evaluation = assessCase(c, got);
      cases.push({caseId: c.id, passed: evaluation.pass, observations: evaluation.details});
    } catch (err) { cases.push({caseId: c.id, passed: false, observations: [String(err.message || err).slice(0, 300)]}); }
  }
  const passed = cases.every(c => c.passed);
  const report = {
    phase: 'CONTAINER_BENCHMARK', at: new Date().toISOString(), repository: spec.repository,
    commit: spec.commit, tree: staged.tree, image: spec.runner.image,
    sandboxPolicy: 'NO_NETWORK_READ_ONLY_NO_CAPS_NONROOT_RESOURCE_LIMITS',
    status: passed ? 'REFERENCE_CASES_PASSED_UNVERIFIED_ENGINEERING' : 'REFERENCE_CASES_FAILED',
    cases, securityReview: 'NOT_PERFORMED', engineeringValidation: false, vesselRelease: false
  };
  await writeJson(path.join(base, 'verification.json'), report);
  return report;
}

export function buildProposal(spec, stage, verification = null) {
  validateSpec(spec, {requireRunner: false});
  if (!stage || stage.commit !== spec.commit || stage.repo !== spec.repository) throw Error('Stage required for proposal');
  if (verification && (verification.commit !== spec.commit || verification.tree !== stage.tree)) throw Error('Verification source mismatch');
  return {
    schemaVersion: 1, phase: 'INTEGRATION_PROPOSAL_ONLY', toolId: spec.toolId,
    suggestedIntegration: {entrypoint: 'scripts/repository-integration.mjs', runtime: 'docker', isolated: true, pinnedImage: spec.runner?.image || 'NOT_YET_AVAILABLE', pinnedCommit: spec.commit, repository: spec.repository, interface: 'JSON_STDIN_JSON_STDOUT', agentReviewers: spec.agents},
    provenance: {commit: stage.commit, tree: stage.tree, manifests: stage.inspected.manifests},
    reproducibility: verification?.status ?? 'NO_EXECUTION_EVIDENCE',
    runnableSpecComplete: !!(spec.runner && spec.cases?.length),
    mandatoryReview: {
      technical: 'A15/A23 independent review and appropriate engineering specialists',
      security: 'A20 source/dependency/container/image and supply-chain assessment; CVEs and SBOM TBD',
      interfaces: 'A21 permissioned, unit-aware, read-only integration contract',
      legal: 'SPDX license AND actual LICENSE text / distribution constraints review',
      verification: 'A18/A24 physics reference benchmarks, failure cases and repeatable numerical results',
      authority: 'Protected software merge approval; Engineering Director for any vessel engineering baseline release'
    },
    status: 'HOLD_FOR_INDEPENDENT_AND_HUMAN_APPROVAL',
    toolAutomaticallyRegistered: false, vesselReleased: false, actuatorCommandsEnabled: false
  };
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  const spec = validateSpec(await loadJson(opts.spec), {requireRunner: opts.command === 'verify'});
  const outDir = path.resolve(opts.outDir || path.join(os.tmpdir(), 'usv01-repository-integration', spec.id));
  await mkdir(outDir, {recursive: true, mode: 0o700});
  let result;
  if (opts.command === 'intake') {
    result = await githubIntake(spec, fetch, process.env.GITHUB_TOKEN || '');
    await writeJson(path.join(outDir, 'intake.json'), result);
  } else if (opts.command === 'stage') {
    result = await stageSource(spec, outDir);
  } else if (opts.command === 'verify') {
    if (!opts.execute || !opts.acknowledge) throw Error('Explicit --execute --acknowledge-third-party-risk required; untrusted code only on a dedicated isolated host');
    result = await verifyCandidate(spec, outDir);
    if (!result.cases.every(c => c.passed)) process.exitCode = 1;
  } else {
    const stage = await loadJson(path.join(outDir, 'stage.json'));
    let verification = null;
    try { verification = await loadJson(path.join(outDir, 'verification.json')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    result = buildProposal(spec, stage, verification);
    await writeJson(path.join(outDir, 'proposal.json'), result);
    await writeFile(path.join(outDir, 'REVIEW.md'), `# Proposed external tool: ${spec.toolId}\n\nSource: https://github.com/${spec.repository}/tree/${spec.commit}\n\nStatus: **HOLD — NOT INTEGRATED**\n\n- [ ] License compatibility and actual source license reviewed\n- [ ] Security assessment including dependencies/SBOM completed\n- [ ] A15/A23 independent technical review recorded\n- [ ] A18/A24 representative physics / failure-mode benchmarks accepted\n- [ ] A20 cyber and A21 interface constraints approved\n- [ ] Human approval for protected-source integration recorded on exact PR head\n- [ ] Engineering Director approves any subsequent vessel baseline release separately\n\nThis is a PROPOSAL and cannot change the tool registry.\n`, {mode: 0o600});
  }
  console.log(JSON.stringify({command: opts.command, outDir, phase: result.phase, status: result.status || result.adoption || 'REVIEW_ONLY', toolRegistered: false, vesselReleased: false}, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {console.error('Integration pipeline failed closed:', error.message || String(error)); process.exitCode = 1;});
}