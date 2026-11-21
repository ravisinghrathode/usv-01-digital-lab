import crypto from 'node:crypto';
import { CryptographicAuditTrail, type AuditTrailEntry } from './CryptographicAuditTrail.ts';

/**
 * A verifier for externally witnessed audit checkpoints.
 *
 * IMPORTANT: This module NEVER self-signs, creates, publishes, or accepts a
 * local hash as independent evidence. The caller must obtain the signed
 * checkpoint from a separate trusted witness and pin its public key through
 * a separately governed trust root.
 */
export const AUDIT_ANCHOR_SCHEMA = 'USV01-INDEPENDENT-AUDIT-ANCHOR-1' as const;
export const AUDIT_ANCHOR_GENESIS =
  'GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000000000000000';

export interface AuditAnchorStatement {
  schemaVersion: typeof AUDIT_ANCHOR_SCHEMA;
  journalId: string;
  entryCount: number;
  tipHash: string;
  issuedAtUtc: string;
}

export interface SignedAuditAnchor {
  statement: AuditAnchorStatement;
  signatureBase64: string;
}

export type AnchorVerification = {
  valid: boolean;
  reason:
    | 'VERIFIED'
    | 'MISSING_EXTERNAL_ATTESTATION'
    | 'UNTRUSTED_WITNESS_KEY'
    | 'INVALID_ATTESTATION'
    | 'AUDIT_CHAIN_INVALID'
    | 'JOURNAL_MISMATCH'
    | 'CHAIN_TIP_MISMATCH'
    | 'INVALID_WITNESS_SIGNATURE';
};

/** Canonical protocol bytes. Do not sign arbitrary caller-supplied JSON. */
export function canonicalAuditAnchorBytes(s: AuditAnchorStatement): Buffer {
  return Buffer.from([
    AUDIT_ANCHOR_SCHEMA,
    s.journalId,
    String(s.entryCount),
    s.tipHash,
    s.issuedAtUtc
  ].map(v => String(Buffer.byteLength(v, 'utf8')) + ':' + v).join('|'), 'utf8');
}

/** Require the canonical millisecond-precision UTC representation, including a real calendar date. */
function isCanonicalUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

/** A local proposal for a future external witness; it is NOT an anchor. */
export function proposeAuditAnchorStatement(
  journalId: string,
  entries: AuditTrailEntry[],
  issuedAtUtc = new Date().toISOString()
): AuditAnchorStatement {
  if (typeof journalId !== 'string' || !journalId || journalId.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(journalId))
    throw new Error('Invalid audit journal identity');
  if (!isCanonicalUtcTimestamp(issuedAtUtc)) throw new Error('Invalid UTC checkpoint timestamp');
  // Persisted journals are untrusted even when proposing a checkpoint. Reject
  // malformed entries deterministically rather than leaking runtime exceptions.
  let validChain = false;
  try {
    if (Array.isArray(entries) && isPlainDenseJournal(entries)) {
      if (entries.some(entry => !hasOnlyOwnDataFields(entry) || !hasOnlyPlainDataTree(entry))) throw new Error('accessor-backed journal');
      const snapshot = structuredClone(entries) as AuditTrailEntry[];
      validChain = CryptographicAuditTrail.verifyChain(snapshot).valid;
      if (validChain) {
        const entryCount = snapshot.length;
        const tipHash = entryCount ? snapshot[entryCount - 1].hash : AUDIT_ANCHOR_GENESIS;
        if (!Number.isSafeInteger(entryCount) || typeof tipHash !== 'string') validChain = false;
        else {
          return { schemaVersion: AUDIT_ANCHOR_SCHEMA, journalId, entryCount, tipHash, issuedAtUtc };
        }
      }
    }
  } catch {
    validChain = false;
  }
  // Every successful validation path returns above; never fall through with undefined.
  throw new Error('Cannot propose a checkpoint for an invalid audit journal');
}

/** Never invoke accessor-backed audit fields while cloning untrusted journal records. */
function hasOnlyOwnDataFields(entry: unknown): boolean {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
      Object.getPrototypeOf(entry) !== Object.prototype) return false;
  return Reflect.ownKeys(entry).every(key => {
    if (typeof key !== 'string') return false;
    const descriptor = Object.getOwnPropertyDescriptor(entry, key);
    return !!descriptor && 'value' in descriptor && descriptor.enumerable;
  });
}

/** Reject nested accessors and non-JSON structures before structuredClone can execute getters. */
function hasOnlyPlainDataTree(
  value: unknown,
  seen = new WeakSet<object>(),
  budget = { remaining: 10000 },
  depth = 0
): boolean {
  // Bound hostile persisted input before cloning or hashing. The shared budget
  // covers the whole tree, not merely each recursive branch.
  if (depth > 64 || --budget.remaining < 0) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  try {
    const array = Array.isArray(value);
    if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) return false;
    const keys = Reflect.ownKeys(value);
    if (array && (keys.length !== value.length + 1 || !keys.includes('length'))) return false;
    for (const key of keys) {
      if (array && key === 'length') continue;
      if (typeof key !== 'string') return false;
      if (array && (!/^(0|[1-9]\\d*)$/.test(key) || Number(key) >= value.length)) return false;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable ||
          !hasOnlyPlainDataTree(descriptor.value, seen, budget, depth + 1)) return false;
    }
    return true;
  } catch {
    return false;
  } finally {
    seen.delete(value);
  }
}

/** Persisted journal arrays must have only dense own data indices and the native Array prototype. */
function isPlainDenseJournal(entries: AuditTrailEntry[]): boolean {
  if (Object.getPrototypeOf(entries) !== Array.prototype) return false;
  const keys = Reflect.ownKeys(entries);
  if (keys.length !== entries.length + 1 || !keys.includes('length')) return false;
  for (let i = 0; i < entries.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(entries, String(i));
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) return false;
  }
  return true;
}

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  // Witness receipts are JSON records, not class instances or inherited claims.
  // Reject custom prototypes before examining their signed own fields.
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  // Object.keys silently ignores non-enumerable and symbol properties. A
  // signed witness receipt must not carry unsigned side-channel metadata,
  // including hidden approval claims, alongside its canonical statement.
  const keys = Reflect.ownKeys(value);
  return keys.length === expected.length && keys.every(key => {
    if (typeof key !== 'string' || !expected.includes(key)) return false;
    // JSON-decoded records expose every signed field as an enumerable own
    // data property. Hidden fields are not a valid wire-format attestation.
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return !!descriptor && 'value' in descriptor && descriptor.enumerable;
  });
}

function isValidStatement(s: AuditAnchorStatement): boolean {
  return hasExactKeys(s, ['schemaVersion', 'journalId', 'entryCount', 'tipHash', 'issuedAtUtc']) &&
    s.schemaVersion === AUDIT_ANCHOR_SCHEMA &&
    typeof s.journalId === 'string' &&
    s.journalId.length > 0 && s.journalId.length <= 128 &&
    /^[A-Za-z0-9._:-]+$/.test(s.journalId) &&
    Number.isSafeInteger(s.entryCount) && s.entryCount >= 0 &&
    typeof s.tipHash === 'string' &&
    (s.tipHash === AUDIT_ANCHOR_GENESIS || /^[a-f0-9]{64}$/.test(s.tipHash)) &&
    isCanonicalUtcTimestamp(s.issuedAtUtc);
}

/**
 * Fail-closed check against a trusted external Ed25519 witness.
 *
 * A matching hash alone never passes. The caller must separately obtain an
 * attestation and a pre-provisioned, independently controlled public key.
 * This checks the ENTIRE current journal, not just an old checkpoint prefix.
 */
export function verifyIndependentAuditAnchor(
  journalId: string,
  entries: AuditTrailEntry[],
  receipt: SignedAuditAnchor | null | undefined,
  trustedWitnessPublicKeyPem: string | null | undefined
): AnchorVerification {
  if (!receipt) return { valid: false, reason: 'MISSING_EXTERNAL_ATTESTATION' };
  if (typeof trustedWitnessPublicKeyPem !== 'string' || !trustedWitnessPublicKeyPem.trim()) {
    return { valid: false, reason: 'UNTRUSTED_WITNESS_KEY' };
  }
  // Receipts cross a trust boundary: reject malformed runtime objects before dereferencing.
  // Even Object.keys/Array.isArray can trigger hostile Proxy traps. Keep all
  // receipt shape inspection within the same fail-closed boundary as field reads.
  try {
    if (typeof receipt !== 'object' || Array.isArray(receipt) ||
        (!hasExactKeys(receipt, ['statement', 'signatureBase64']) ||
         Reflect.ownKeys(receipt).some(field => {
           const descriptor = Object.getOwnPropertyDescriptor(receipt, field);
           return !descriptor || !('value' in descriptor);
         }))) {
      return { valid: false, reason: 'INVALID_ATTESTATION' };
    }
  } catch {
    return { valid: false, reason: 'INVALID_ATTESTATION' };
  }
  // Untrusted in-process values may contain throwing getters or proxies. Do not
  // let property access escape the verifier's fail-closed result contract.
  let s: AuditAnchorStatement;
  let signatureBase64: string;
  try {
    // Snapshot signed fields once; accessor-backed statements can mutate between
    // journal comparison and signature verification, defeating the binding.
    const statementDescriptor = Object.getOwnPropertyDescriptor(receipt, 'statement');
    const signatureDescriptor = Object.getOwnPropertyDescriptor(receipt, 'signatureBase64');
    if (!statementDescriptor || !('value' in statementDescriptor) ||
        !signatureDescriptor || !('value' in signatureDescriptor)) {
      return { valid: false, reason: 'INVALID_ATTESTATION' };
    }
    const rawStatement = statementDescriptor.value as AuditAnchorStatement;
    signatureBase64 = signatureDescriptor.value as string;
    if (!rawStatement || typeof rawStatement !== 'object' || Array.isArray(rawStatement) ||
        !hasExactKeys(rawStatement, ['schemaVersion', 'journalId', 'entryCount', 'tipHash', 'issuedAtUtc']) ||
        Reflect.ownKeys(rawStatement).some(field => {
          const descriptor = Object.getOwnPropertyDescriptor(rawStatement, field);
          return !descriptor || !('value' in descriptor);
        })) return { valid: false, reason: 'INVALID_ATTESTATION' };
    s = structuredClone(rawStatement);
    if (!isValidStatement(s) ||
        typeof signatureBase64 !== 'string' ||
        !/^[A-Za-z0-9+/]{86}==$/.test(signatureBase64)) {
      return { valid: false, reason: 'INVALID_ATTESTATION' };
    }
  } catch {
    return { valid: false, reason: 'INVALID_ATTESTATION' };
  }
  if (typeof journalId !== 'string' || !journalId || journalId.length > 128 ||
      !/^[A-Za-z0-9._:-]+$/.test(journalId)) {
    return { valid: false, reason: 'JOURNAL_MISMATCH' };
  }
  if (s.journalId !== journalId) return { valid: false, reason: 'JOURNAL_MISMATCH' };
  // Verify and compare one detached snapshot: do not re-read mutable caller
  // state after chain validation (a time-of-check/time-of-use vulnerability).
  try {
    if (!Array.isArray(entries) || !isPlainDenseJournal(entries)) return { valid: false, reason: 'AUDIT_CHAIN_INVALID' };
    if (entries.some(entry => !hasOnlyOwnDataFields(entry) || !hasOnlyPlainDataTree(entry))) {
      return { valid: false, reason: 'AUDIT_CHAIN_INVALID' };
    }
    const snapshot = structuredClone(entries) as AuditTrailEntry[];
    if (!CryptographicAuditTrail.verifyChain(snapshot).valid) {
      return { valid: false, reason: 'AUDIT_CHAIN_INVALID' };
    }
    const count = snapshot.length;
    const liveTip = count ? snapshot[count - 1].hash : AUDIT_ANCHOR_GENESIS;
    if (s.entryCount !== count || s.tipHash !== liveTip) {
      return { valid: false, reason: 'CHAIN_TIP_MISMATCH' };
    }
  } catch {
    return { valid: false, reason: 'AUDIT_CHAIN_INVALID' };
  }
  // A malformed or wrong-algorithm trust root is a provisioning failure,
  // not evidence that an otherwise trusted witness signed invalid bytes.
  let publicKey: crypto.KeyObject;
  try {
    // A trust-root file must contain exactly one PEM public key. Node's PEM
    // parser may accept a valid first block while ignoring trailing material;
    // ambiguous bundles must never silently select a witness identity.
    const pem = trustedWitnessPublicKeyPem.trim();
    if (!/^-----BEGIN PUBLIC KEY-----\r?\n(?:[A-Za-z0-9+/=]+\r?\n)+-----END PUBLIC KEY-----$/.test(pem)) {
      return { valid: false, reason: 'UNTRUSTED_WITNESS_KEY' };
    }
    publicKey = crypto.createPublicKey(pem);
    if (publicKey.asymmetricKeyType !== 'ed25519') {
      return { valid: false, reason: 'UNTRUSTED_WITNESS_KEY' };
    }
  } catch {
    return { valid: false, reason: 'UNTRUSTED_WITNESS_KEY' };
  }
  try {
    const signature = Buffer.from(signatureBase64, 'base64');
    if (signature.length !== 64 ||
        signature.toString('base64') !== signatureBase64 ||
        !crypto.verify(null, canonicalAuditAnchorBytes(s), publicKey, signature)) {
      return { valid: false, reason: 'INVALID_WITNESS_SIGNATURE' };
    }
  } catch {
    return { valid: false, reason: 'INVALID_WITNESS_SIGNATURE' };
  }
  return { valid: true, reason: 'VERIFIED' };
}
