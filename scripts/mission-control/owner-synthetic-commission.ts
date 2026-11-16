/**
 * Operator-local synthetic-only Codex research. Not A04 independent review,
 * engineering validation, signed host acceptance or physical deployment.
 *
 * The stricter private commissioning supervisor remains unchanged. This
 * narrowly bounded route calls the existing 26-agent campaign with the
 * protected repository's one synthetic catalog and explicit TTY consent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { assertPinnedCleanGitRevision } from '../../src/core/mission-control/GitRevisionGuard.ts';
import {
  assertUsvRepositoryWorkingDirectory, sanitizedSubscriptionEnvironment
} from '../../src/core/mission-control/SubscriptionCliAdapter.ts';
import { requireLabCommissioningPolicy } from '../../src/core/mission-control/LabCommissioningPolicy.ts';
import {
  OWNER_SYNTHETIC_CATALOG, OWNER_RESEARCH_CONFIRMATION,
  assessOwnerSyntheticResearch
} from '../../src/core/mission-control/OwnerSyntheticResearchGate.ts';

const APPROVED_REMOTES = new Set([
  'https://github.com/ravisinghrathode/usv-01-digital-lab',
  'https://github.com/ravisinghrathode/usv-01-digital-lab.git',
  'git@github.com:ravisinghrathode/usv-01-digital-lab.git',
  'ssh://git@github.com/ravisinghrathode/usv-01-digital-lab.git'
]);
const command = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', timeout: 8000 }).trim();

function readPrivateReceipt(root: string): Buffer {
  const folder = path.join(root, 'data');
  const st = fs.lstatSync(folder);
  if (!st.isDirectory() || st.isSymbolicLink()) {
    throw new Error('OWNER_RESEARCH_PRIVATE_DATA_DIR_INVALID');
  }
  const receipts = fs.readdirSync(folder)
    .filter(name => /^a04-host-readiness-[0-9]+-[a-f0-9]{8}\.json$/.test(name))
    .map(name => ({ name, full: path.join(folder, name) }))
    .sort((a, b) => fs.statSync(b.full).mtimeMs - fs.statSync(a.full).mtimeMs);
  if (!receipts.length) throw new Error('OWNER_RESEARCH_RUN_FRESH_A04_CHECK_FIRST');
  const file = receipts[0].full;
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 128 * 1024 ||
      (info.mode & 0o077) !== 0) {
    throw new Error('OWNER_RESEARCH_PRIVATE_RECEIPT_PERMISSIONS_INVALID');
  }
  return fs.readFileSync(file);
}

function readFixedCatalog(root: string): Buffer {
  const name = path.join(root, OWNER_SYNTHETIC_CATALOG);
  const st = fs.lstatSync(name);
  if (!st.isFile() || st.isSymbolicLink() || st.size > 2 * 1024 * 1024 ||
      (st.mode & 0o022) !== 0) {
    throw new Error('OWNER_RESEARCH_CATALOG_INVALID');
  }
  return fs.readFileSync(name);
}

function runResearchStep(root: string, env: NodeJS.ProcessEnv,
  name: string, args: string[], timeout: number): void {
  console.log('USV SINGLE-OPERATOR RESEARCH: ' + name);
  const status = spawnSync('npm', ['run', ...args], {
    cwd: root, env, stdio: 'inherit', shell: false, timeout
  });
  if (status.error || status.status !== 0) {
    throw new Error('OWNER_RESEARCH_STEP_FAILED: ' + name);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || (args.length === 1 && args[0] === '--plan')) {
    console.log(JSON.stringify({
      status: 'OWNER_SYNTHETIC_RESEARCH_PLAN_ONLY',
      executeCommand: 'npm run mission-control:owner-research -- --execute',
      recoverCommand: 'npm run mission-control:owner-research -- --resume --ack-uncertain',
      previousShaTracesRetainedAsHistorical: true,
      uncertainInFlightRetryNeedsExplicitAcknowledgment: true,
      exactCatalog: OWNER_SYNTHETIC_CATALOG,
      requiresLocalMac: true,
      requiresFreshA04PreflightOnExactMain: true,
      requiresInteractiveOwnerConsent: true,
      geminiSyntheticFallbackAuthorized: allowGemini,
    codexLocalResearchMaxAttemptsPerWindow: 1000,
    independentA04Approved: false,
      postCampaignCertificationAttempted: false,
      engineeringReleaseApproved: false,
      externalReviewOrPurchaseRequired: false,
      modelCalls: 0,
      geminiAutomaticFallback: 'OPERATOR_AUTHORIZED_SYNTHETIC_ONLY',
      codexLocalResearchMaxAttemptsPerWindow: 1000,
      fallbackRequiresGeminiCliOAuth: true,
      stage: 'RUN_26_CODEX_SYNTHETIC_RESEARCH_UNCERTIFIED'
    }, null, 2));
    return;
  }
  const resume = args.includes('--resume');
  const acknowledge = args.includes('--ack-uncertain');
  if ((args.length === 1 && args[0] === '--execute') ||
      (args.length === 2 && resume && acknowledge)) {
    // Explicit interactive research invocation.
  } else {
    throw new Error('OWNER_RESEARCH_USE_EXPLICIT_EXECUTE_OR_RESUME_WITH_ACK_UNCERTAIN');
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY ||
      typeof process.getuid !== 'function' || process.getuid() === 0) {
    throw new Error('OWNER_RESEARCH_PRIVATE_NONROOT_INTERACTIVE_TERMINAL_REQUIRED');
  }
  const root = fs.realpathSync(process.cwd());
  await assertUsvRepositoryWorkingDirectory(root);
  const sourceSha = command(['rev-parse', 'HEAD']);
  const originMainSha = command(['rev-parse', 'refs/remotes/origin/main']);
  const approvedRemote = APPROVED_REMOTES.has(command(['remote', 'get-url', 'origin']));
  await assertPinnedCleanGitRevision(root, sourceSha);
  const hostId = process.env.USV01_HOST_ID || '';
  const uid = process.getuid();
  const locallyOwnedCheckout = fs.statSync(root).uid === uid;
  const receiptBytes = readPrivateReceipt(root);
  const catalogBytes = readFixedCatalog(root);

  // No Gemini approval or external data-transfer route in this research mode.
  // The operator's direct interactive decision is expressly *not*
  // represented as an independent signer or engineering acceptance.
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  let reply = '';
  let geminiReply = '';
  try {
    if (resume) console.log('RESUME: old successful runs are preserved under their' +
      ' ORIGINAL commit, not represented as new-source executions. The next' +
      ' unjournaled agent may have been attempted before interruption.' +
      ' This can repeat that one uncertain call, but will not replay A01/A02.' +
      ' No same-SHA 26/26 operational claim is made from mixed-source runs.');
    console.log('The fixed SYNTHETIC catalog uses signed-in Codex first.' +
      ' If Codex quota or transport is unavailable, an OPTIONAL operator-approved' +
      ' Gemini CLI session may receive the same synthetic research prompt.' +
      ' No restricted naval/client data, paid APIs, independent approval,' +
      ' certified engineering or vessel hardware execution is authorized.');
    reply = await prompt.question(
      'As the local owner, type ' + OWNER_RESEARCH_CONFIRMATION +
      ' to authorize this synthetic research run: '
    );
    if (reply.trim() === OWNER_RESEARCH_CONFIRMATION) {
      geminiReply = await prompt.question(
        'If you have reviewed that your Gemini CLI is signed in using your Google' +
        ' account (not an API key), type AUTHORIZE GEMINI SYNTHETIC TRANSFER to' +
        ' permit automatic Gemini fallback for this synthetic catalog.' +
        ' Otherwise press Enter for Codex-only: '
      );
    }
  } finally {
    prompt.close();
  }

  const decision = assessOwnerSyntheticResearch({
    sourceSha, actualSha: sourceSha, originMainSha, approvedRemote,
    trackedWorktreeClean: true, locallyOwnedCheckout,
    interactiveTerminal: true,
    isolatedPrivateHost: reply.trim() === OWNER_RESEARCH_CONFIRMATION,
    hostId, receiptBytes, catalogBytes, env: process.env
  });
  if (!decision.allowed) {
    throw new Error('OWNER_RESEARCH_BLOCKED: ' + decision.blockers.join(','));
  }
  // Owner consent may authorize transferring ONLY the pinned synthetic catalog.
  // The Gemini authentication statement is operator attestation, not an
  // independently verified identity or engineering release.
  const allowGemini = geminiReply.trim() === 'AUTHORIZE GEMINI SYNTHETIC TRANSFER';
  // This campaign needs up to 26 specialist attempts. The shared default
  // 12-call limiter was stopping it despite remaining provider subscription
  // capacity. A bounded 1000-call local research ceiling preserves anti-runaway
  // protection across the host without mistaking 12 requests for provider quota.
  // Real Codex and Gemini 429/usage failures still activate independent breakers.
  const safeInput: NodeJS.ProcessEnv = { ...process.env };
  delete safeInput.USV_GEMINI_FALLBACK_APPROVED;
  delete safeInput.USV_GEMINI_OAUTH_REVIEWED;
  delete safeInput.USV_GEMINI_DATA_CLASSIFICATION;
  safeInput.USV_MODEL_REQUESTS_PER_WINDOW = '1000';
  if (allowGemini) {
    safeInput.USV_GEMINI_FALLBACK_APPROVED = 'true';
    safeInput.USV_GEMINI_OAUTH_REVIEWED = 'true';
    safeInput.USV_GEMINI_DATA_CLASSIFICATION = 'PUBLIC_NON_SENSITIVE';
  }
  safeInput.AI_REVIEW_PROVIDER = 'codex_cli';
  safeInput.USV_SUBSCRIPTION_PILOT = 'enabled';
  safeInput.USV_LAB_SCOPE = 'RESEARCH_ONLY';
  safeInput.USV_ALLOW_PAID_AI_API = 'false';
  safeInput.USV_DUAL_PROVIDER_ROUTING = 'enabled';
  const env = sanitizedSubscriptionEnvironment(safeInput);
  env.AI_REVIEW_PROVIDER = 'codex_cli';
  env.USV_SUBSCRIPTION_PILOT = 'enabled';
  env.USV_LAB_SCOPE = 'RESEARCH_ONLY';
  env.USV_DUAL_PROVIDER_ROUTING = 'enabled';
  env.USV_MODEL_REQUESTS_PER_WINDOW = '1000';
  requireLabCommissioningPolicy(env);
  if (allowGemini) {
    const { geminiCatalogTransferPermitted } =
      await import('../../src/core/models/DualSubscriptionRoutingPolicy.ts');
    const { OWNER_SYNTHETIC_CLASSIFICATION } =
      await import('../../src/core/mission-control/OwnerSyntheticResearchGate.ts');
    if (!geminiCatalogTransferPermitted(OWNER_SYNTHETIC_CLASSIFICATION, env)) {
      throw new Error('OWNER_GEMINI_SYNTHETIC_TRANSFER_NOT_AUTHORIZED');
    }
  }

  console.log(JSON.stringify({
    authorization: decision.authorization, sourceSha,
    receiptDigestSha256: decision.receiptDigestSha256,
    catalogDigestSha256: decision.catalogDigestSha256,
    independentA04Approved: false,
    independentlyEngineeringValidated: false,
    engineeringReleaseApproved: false
  }, null, 2));
  runResearchStep(root, env, 'Codex subscription status (zero-model)',
    ['mission-control:preflight'], 10 * 60_000);
  runResearchStep(root, env, '26-agent mandatory input and tool preflight',
    ['acceptance:codex-agents', '--', '--catalog',
      OWNER_SYNTHETIC_CATALOG, '--require-ready'], 30 * 60_000);
  runResearchStep(root, env, '26 real Codex synthetic research attempts',
    ['acceptance:codex-agents', '--', '--catalog',
      OWNER_SYNTHETIC_CATALOG, '--execute',
      ...(resume ? ['--resume', '--carry-historical', '--ack-uncertain'] : [])], 12 * 60 * 60_000);
  await assertPinnedCleanGitRevision(root, sourceSha);
  console.log('OWNER_SYNTHETIC_26_CODEX_RESEARCH_ATTEMPTED_UNCERTIFIED: ' +
    'read the private data/codex-26-agent-matrix.json and ' +
    'data/codex-26-agent-resume-progress.json results; ' +
    'independent A04 and engineering release remain unapproved.');
}
main().catch(error => {
  console.error(error instanceof Error ? error.message :
    'OWNER_RESEARCH_UNKNOWN_ERROR');
  process.exitCode = 1;
});
