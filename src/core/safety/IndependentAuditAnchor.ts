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
  if (!journalId || journalId.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(journalId))
    throw new Error('Invalid audit journal identity');
  const checked = CryptographicAuditTrail.verifyChain(entries);
  if (!checked.valid) throw new Error('Cannot propose a checkpoint for an invalid audit journal');
  if (!isCanonicalUtcTimestamp(issuedAtUtc))
    throw new Error('Invalid UTC checkpoint timestamp');
  return {
    schemaVersion: AUDIT_ANCHOR_SCHEMA,
    journalId,
    entryCount: entries.length,
    tipHash: entries.length ? entries[entries.length - 1].hash : AUDIT_ANCHOR_GENESIS,
    issuedAtUtc
  };
}

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every(key => expected.includes(key));
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
  if (!trustedWitnessPublicKeyPem || !trustedWitnessPublicKeyPem.trim()) {
    return { valid: false, reason: 'UNTRUSTED_WITNESS_KEY' };
  }
  // Receipts cross a trust boundary: reject malformed runtime objects before dereferencing.
  if (typeof receipt !== 'object' || Array.isArray(receipt) ||
      !hasExactKeys(receipt, ['statement', 'signatureBase64'])) {
    return { valid: false, reason: 'INVALID_ATTESTATION' };
  }
  const s = receipt.statement;
  if (!s || typeof s !== 'object' || Array.isArray(s) || !isValidStatement(s) ||
      typeof receipt.signatureBase64 !== 'string' ||
      !/^[A-Za-z0-9+/]{86}==$/.test(receipt.signatureBase64)) {
    return { valid: false, reason: 'INVALID_ATTESTATION' };
  }
  if (s.journalId !== journalId) return { valid: false, reason: 'JOURNAL_MISMATCH' };
  // Persisted journals are untrusted at runtime; a malformed entry must not crash verification.
  try {
    if (!Array.isArray(entries) || !CryptographicAuditTrail.verifyChain(entries).valid) {
      return { valid: false, reason: 'AUDIT_CHAIN_INVALID' };
    }
  } catch {
    return { valid: false, reason: 'AUDIT_CHAIN_INVALID' };
  }
  const liveTip = entries.length ? entries[entries.length - 1].hash : AUDIT_ANCHOR_GENESIS;
  if (s.entryCount !== entries.length || s.tipHash !== liveTip) {
    return { valid: false, reason: 'CHAIN_TIP_MISMATCH' };
  }
  try {
    const publicKey = crypto.createPublicKey(trustedWitnessPublicKeyPem);
    if (publicKey.asymmetricKeyType !== 'ed25519') {
      return { valid: false, reason: 'UNTRUSTED_WITNESS_KEY' };
    }
    const signature = Buffer.from(receipt.signatureBase64, 'base64');
    if (signature.length !== 64 ||
        signature.toString('base64') !== receipt.signatureBase64 ||
        !crypto.verify(null, canonicalAuditAnchorBytes(s), publicKey, signature)) {
      return { valid: false, reason: 'INVALID_WITNESS_SIGNATURE' };
    }
  } catch {
    return { valid: false, reason: 'INVALID_WITNESS_SIGNATURE' };
  }
  return { valid: true, reason: 'VERIFIED' };
}
