/**
 * Engineering Director key generation (run ONCE, by the Director, on their own workstation).
 *
 *   npx tsx scripts/governance/director-keygen.ts
 *
 * - Prompts (TTY only) for a passphrase chosen by the Director; it is never stored or echoed.
 * - Writes the passphrase-encrypted Ed25519 private key to ~/.usv01/director_ed25519.pem (mode 0600),
 *   outside the repository.
 * - Prints the PUBLIC key, which the repository administrator pins as the GitHub Actions
 *   variable DIRECTOR_PUBLIC_KEY. CI only ever sees the public key.
 */
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { assertInteractiveTerminal, promptHidden, rejectSecretArguments } from './tty-prompt.ts';
import { publicKeyFingerprint } from './ecr-approval.ts';

export const DEFAULT_PRIVATE_KEY_PATH = path.join(os.homedir(), '.usv01', 'director_ed25519.pem');
const MIN_PASSPHRASE_LENGTH = 16;

async function main() {
  rejectSecretArguments(process.argv.slice(2));
  assertInteractiveTerminal('Director key generation');

  const keyPath = process.env.DIRECTOR_PRIVATE_KEY_FILE || DEFAULT_PRIVATE_KEY_PATH;
  if (path.resolve(keyPath).startsWith(path.resolve(process.cwd()) + path.sep)) {
    throw new Error('Refusing to write the Director private key inside the repository working tree.');
  }
  if (fs.existsSync(keyPath)) {
    throw new Error(`A key already exists at ${keyPath}. Move it aside deliberately before generating a new one.`);
  }

  const p1 = await promptHidden(`Choose Director signing passphrase (min ${MIN_PASSPHRASE_LENGTH} chars): `);
  if (p1.length < MIN_PASSPHRASE_LENGTH) throw new Error('Passphrase too short.');
  const p2 = await promptHidden('Confirm passphrase: ');
  if (p1 !== p2) throw new Error('Passphrases do not match.');

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: p1 }
  });

  fs.mkdirSync(path.dirname(keyPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(keyPath, privateKey, { mode: 0o600 });
  const pubPath = keyPath.replace(/\.pem$/, '') + '.pub.pem';
  fs.writeFileSync(pubPath, publicKey, { mode: 0o644 });

  console.log(`\n✅ Encrypted private key written to ${keyPath} (keep it off shared machines; back it up offline).`);
  console.log(`   Public key written to ${pubPath}`);
  console.log(`   Fingerprint: ${publicKeyFingerprint(publicKey)}\n`);
  console.log('Pin the public key as the CI trust anchor (repository admin):');
  console.log(`   gh variable set DIRECTOR_PUBLIC_KEY < ${pubPath}\n`);
}

if (process.argv[1] && process.argv[1].endsWith('director-keygen.ts')) {
  main().catch(err => {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  });
}
