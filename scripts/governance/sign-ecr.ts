/**
 * Authenticated Human Sign-Off Tool (Engineering Director only).
 *
 *   npx tsx scripts/governance/sign-ecr.ts ECR-20261111-001
 *
 * Human-attribution guarantees:
 * - Requires an interactive terminal. No passphrase is ever read from argv, environment
 *   variables, files, or piped stdin — there is no automatic substitute for the human.
 * - The passphrase decrypts the Director's Ed25519 private key held outside the repository.
 *   Without both the key file and the passphrase, no valid approval can be produced.
 * - The Director must re-type the Change ID to confirm the exact digest being approved.
 *
 * Commit-binding guarantees:
 * - Signs the baseline content digest of the committed HEAD tree (all files except
 *   governance/approvals/). Refuses to sign with uncommitted changes.
 * - The resulting governance/approvals/<ECR>.approval.json is the ONLY file that may be
 *   committed afterwards; any other change invalidates the approval in Stage D.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { assertInteractiveTerminal, promptHidden, promptVisible, rejectSecretArguments } from './tty-prompt.ts';
import {
  APPROVALS_DIR, APPROVAL_SCHEMA, computeBaselineDigest, publicKeyFingerprint, signApproval, verifyApproval
} from './ecr-approval.ts';
import { DEFAULT_PRIVATE_KEY_PATH } from './director-keygen.ts';

const DIRECTOR = { authorityId: 'usr-eng-dir-8841', authorityName: 'Ravi Singh Rathode', authorityRole: 'ENGINEERING_DIRECTOR' as const };

async function main() {
  const args = process.argv.slice(2);
  rejectSecretArguments(args);
  assertInteractiveTerminal('ECR sign-off');

  const changeId = args[0];
  const decisionArg = (args[1] || 'APPROVED').toUpperCase();
  if (!changeId || !/^ECR-\d{8}-\d{3}$/.test(changeId)) throw new Error('Usage: sign-ecr.ts <ECR-YYYYMMDD-NNN> [APPROVED|REJECTED]');
  if (decisionArg !== 'APPROVED' && decisionArg !== 'REJECTED') throw new Error('Decision must be APPROVED or REJECTED.');

  const ecrDir = path.join(process.cwd(), 'governance', 'ecr');
  const ecrFile = fs.readdirSync(ecrDir).find(f => f.startsWith(changeId) && f.endsWith('.md'));
  if (!ecrFile) throw new Error(`No ECR document for ${changeId} in governance/ecr/.`);

  const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf-8' })
    .split('\n').filter(Boolean).filter(l => !l.slice(3).startsWith(APPROVALS_DIR + '/'));
  if (dirty.length) throw new Error(`Refusing to sign: uncommitted changes present:\n${dirty.join('\n')}`);

  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).trim();
  const digest = computeBaselineDigest('HEAD');

  const keyPath = process.env.DIRECTOR_PRIVATE_KEY_FILE || DEFAULT_PRIVATE_KEY_PATH;
  if (!fs.existsSync(keyPath)) throw new Error(`Director private key not found at ${keyPath}. Run director-keygen.ts first.`);

  console.log('\n🖋️  ENGINEERING DIRECTOR SIGN-OFF');
  console.log(`   Change ID:        ${changeId} (${ecrFile})`);
  console.log(`   Decision:         ${decisionArg}`);
  console.log(`   HEAD commit:      ${head}`);
  console.log(`   Baseline digest:  ${digest}\n`);

  const confirm = await promptVisible(`Type the Change ID to confirm you have reviewed this exact baseline: `);
  if (confirm !== changeId) throw new Error('Confirmation mismatch. Sign-off aborted.');

  const passphrase = await promptHidden('Director key passphrase: ');
  let privateKey: crypto.KeyObject;
  try {
    privateKey = crypto.createPrivateKey({ key: fs.readFileSync(keyPath, 'utf-8'), format: 'pem', passphrase });
  } catch {
    throw new Error('Unable to decrypt Director private key: incorrect passphrase. Sign-off rejected.');
  }
  const publicKeyPem = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString();

  const record = signApproval({
    schema: APPROVAL_SCHEMA,
    changeId,
    decision: decisionArg,
    ...DIRECTOR,
    baselineDigest: digest,
    headCommitAtSigning: head,
    signedAt: new Date().toISOString(),
    publicKeyFingerprint: publicKeyFingerprint(publicKeyPem)
  }, privateKey);

  const self = verifyApproval(record, { publicKeyPem, expectedDigest: digest });
  if (decisionArg === 'APPROVED' && !self.verified) throw new Error(`Self-verification failed: ${self.error}`);

  const outDir = path.join(process.cwd(), APPROVALS_DIR);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${changeId}.approval.json`);
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2) + '\n', 'utf-8');

  console.log(`\n✅ ${decisionArg} record written: ${path.relative(process.cwd(), outFile)}`);
  console.log(`   Fingerprint: ${record.publicKeyFingerprint}`);
  console.log('   Commit ONLY this file; any other change will invalidate the approval:');
  console.log(`   git add ${path.relative(process.cwd(), outFile)} && git commit -m "governance: Director sign-off ${changeId}"\n`);
}

if (process.argv[1] && process.argv[1].endsWith('sign-ecr.ts')) {
  main().catch(err => {
    console.error(`❌ Sign-off failed: ${err.message}`);
    process.exit(1);
  });
}
