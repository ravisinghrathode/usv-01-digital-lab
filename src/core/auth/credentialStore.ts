/**
 * Staff Credential Store — scrypt password hashing, stored OUTSIDE source control.
 *
 * - Identity → role assignments remain in the reviewed, CODEOWNERS-protected allowlist (server.ts).
 * - Secrets (salt + scrypt hash) live only in a JSON store whose path is given by
 *   STAFF_CREDENTIAL_STORE (default: <repo>/.secrets/staff-credentials.json, git-ignored, mode 0600).
 * - No plaintext, no unsalted or fast hashes, no environment-variable passphrase overrides.
 * - Missing store or missing entry ⇒ login disabled for that identity (fail closed).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface ScryptParams { N: number; r: number; p: number; keyLen: number }
export const DEFAULT_SCRYPT: ScryptParams = { N: 2 ** 15, r: 8, p: 1, keyLen: 64 };
export const MIN_STAFF_PASSPHRASE_LENGTH = 12;

export interface StoredCredential {
  algorithm: 'scrypt';
  N: number;
  r: number;
  p: number;
  keyLen: number;
  salt: string; // base64
  hash: string; // base64
  provisionedAt: string;
}

export interface CredentialStoreFile {
  version: 1;
  credentials: Record<string, StoredCredential>;
}

export type CredentialCheck = 'VALID' | 'INVALID' | 'NOT_PROVISIONED' | 'STORE_UNAVAILABLE';

export function resolveCredentialStorePath(): string {
  return process.env.STAFF_CREDENTIAL_STORE || path.join(process.cwd(), '.secrets', 'staff-credentials.json');
}

function scrypt(passphrase: string, salt: Buffer, prm: ScryptParams): Buffer {
  return crypto.scryptSync(passphrase.normalize('NFKC'), salt, prm.keyLen, {
    N: prm.N, r: prm.r, p: prm.p, maxmem: 256 * prm.N * prm.r + 16 * 1024 * 1024
  });
}

export function hashCredential(passphrase: string, prm: ScryptParams = DEFAULT_SCRYPT): StoredCredential {
  if (passphrase.length < MIN_STAFF_PASSPHRASE_LENGTH) {
    throw new Error(`Passphrase must be at least ${MIN_STAFF_PASSPHRASE_LENGTH} characters.`);
  }
  const salt = crypto.randomBytes(16);
  return {
    algorithm: 'scrypt', N: prm.N, r: prm.r, p: prm.p, keyLen: prm.keyLen,
    salt: salt.toString('base64'),
    hash: scrypt(passphrase, salt, prm).toString('base64'),
    provisionedAt: new Date().toISOString()
  };
}

export function loadCredentialStore(storePath = resolveCredentialStorePath()): CredentialStoreFile | null {
  try {
    if (!fs.existsSync(storePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    if (parsed?.version !== 1 || typeof parsed.credentials !== 'object') return null;
    return parsed as CredentialStoreFile;
  } catch {
    return null;
  }
}

export function saveCredential(userId: string, cred: StoredCredential, storePath = resolveCredentialStorePath()): void {
  const store = loadCredentialStore(storePath) || { version: 1 as const, credentials: {} };
  store.credentials[userId] = cred;
  fs.mkdirSync(path.dirname(storePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
}

// Dummy record used to equalise timing when an identity has no credential.
const DUMMY: StoredCredential = { ...hashCredentialUnchecked('timing-equaliser-not-a-credential', DEFAULT_SCRYPT) };
function hashCredentialUnchecked(pw: string, prm: ScryptParams): StoredCredential {
  const salt = crypto.randomBytes(16);
  return { algorithm: 'scrypt', ...prm, salt: salt.toString('base64'), hash: scrypt(pw, salt, prm).toString('base64'), provisionedAt: '' };
}

export function verifyStaffCredential(userId: string, passphrase: string, storePath = resolveCredentialStorePath()): CredentialCheck {
  const store = loadCredentialStore(storePath);
  if (!store) return 'STORE_UNAVAILABLE';
  const cred = store.credentials[userId];
  const target = cred && cred.algorithm === 'scrypt' ? cred : DUMMY;
  const expected = Buffer.from(target.hash, 'base64');
  const actual = scrypt(passphrase, Buffer.from(target.salt, 'base64'), target);
  const match = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  if (!cred) return 'NOT_PROVISIONED';
  return match ? 'VALID' : 'INVALID';
}

// --- Brute-force throttling (per identity, in-memory) ---
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; lockedUntil: number }>();

export function isLockedOut(userId: string, now = Date.now()): boolean {
  const f = failures.get(userId);
  return !!f && f.lockedUntil > now;
}
export function recordFailure(userId: string, now = Date.now()): void {
  const f = failures.get(userId) || { count: 0, lockedUntil: 0 };
  f.count += 1;
  if (f.count >= MAX_FAILURES) {
    f.lockedUntil = now + LOCKOUT_MS;
    f.count = 0;
  }
  failures.set(userId, f);
}
export function recordSuccess(userId: string): void {
  failures.delete(userId);
}
export function resetLockouts(): void {
  failures.clear();
}
