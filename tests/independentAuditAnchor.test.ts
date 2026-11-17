import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import {
  AUDIT_ANCHOR_SCHEMA,
  canonicalAuditAnchorBytes,
  proposeAuditAnchorStatement,
  verifyIndependentAuditAnchor
} from '../src/core/safety/IndependentAuditAnchor.ts';
import { CryptographicAuditTrail, type AuditTrailEntry } from '../src/core/safety/CryptographicAuditTrail.ts';

const event = {
  id: 'AUDIT-EXAMPLE',
  timestamp: '2026-11-17T00:00:00.000Z',
  actor: 'test-actor',
  role: 'SECURITY_ANALYST',
  action: 'SECURITY_GATE_EVALUATED' as const,
  details: { allowed: false },
  previousHash: 'GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000000000000000'
};
const entries: AuditTrailEntry[] = [{ ...event, hash: CryptographicAuditTrail.computeEntryHash(event) }];
const journalId = 'usv01-production-audit';
const timestamp = '2026-11-17T01:00:00.000Z';
const pair = crypto.generateKeyPairSync('ed25519');
const key = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const s = proposeAuditAnchorStatement(journalId, entries, timestamp);
const signed = {
  statement: s,
  signatureBase64: crypto.sign(null, canonicalAuditAnchorBytes(s), pair.privateKey).toString('base64')
};

describe('independent cryptographic audit witness acceptance', () => {
  it('requires a separately supplied Ed25519 signature over the exact current journal tip', () => {
    expect(s.schemaVersion).toBe(AUDIT_ANCHOR_SCHEMA);
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key))
      .toEqual({ valid: true, reason: 'VERIFIED' });
    expect(verifyIndependentAuditAnchor(journalId, entries, null, key).valid).toBe(false);
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, null).valid).toBe(false);
  });
  it('rejects replays, mismatched journals, and forged attestations', () => {
    expect(verifyIndependentAuditAnchor('different-journal', entries, signed, key).valid).toBe(false);
    expect(verifyIndependentAuditAnchor(journalId, [], signed, key).valid).toBe(false);
    expect(verifyIndependentAuditAnchor(journalId, entries, {
      ...signed,
      statement: { ...signed.statement, entryCount: 0 }
    }, key).valid).toBe(false);
    expect(verifyIndependentAuditAnchor(journalId, entries, {
      ...signed,
      signatureBase64: Buffer.alloc(64).toString('base64')
    }, key).valid).toBe(false);
  });
  it('rejects a tampered on-disk chain even if an old signed receipt exists', () => {
    const corrupted = [{ ...entries[0], details: { allowed: true } }];
    expect(verifyIndependentAuditAnchor(journalId, corrupted, signed, key))
      .toEqual({ valid: false, reason: 'AUDIT_CHAIN_INVALID' });
  });
  it('refuses attacker-controlled keys and non-Ed25519 signature types', () => {
    const attacker = crypto.generateKeyPairSync('ed25519').publicKey
      .export({ type: 'spki', format: 'pem' }).toString();
    const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey
      .export({ type: 'spki', format: 'pem' }).toString();
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, attacker).valid).toBe(false);
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, rsa).valid).toBe(false);
  });
  it('rejects noncanonical and impossible UTC witness timestamps even when signed', () => {
    const invalid = [
      '2026-02-30T01:00:00.000Z',
      '2026-11-17T25:00:00.000Z',
      '2026-11-17T01:00:00Z',
      '2026-11-17T01:00:00.000+00:00',
      '2026-11-17T01:00:00.000Zextra'
    ];
    for (const issuedAtUtc of invalid) {
      expect(() => proposeAuditAnchorStatement(journalId, entries, issuedAtUtc))
        .toThrow(/Invalid UTC checkpoint timestamp/);
      const statement = { ...s, issuedAtUtc };
      const receipt = {
        statement,
        signatureBase64: crypto.sign(null, canonicalAuditAnchorBytes(statement), pair.privateKey)
          .toString('base64')
      };
      expect(verifyIndependentAuditAnchor(journalId, entries, receipt, key))
        .toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
    }
  });
  it('rejects malformed runtime receipts and noncanonical signature encodings without throwing', () => {
    for (const receipt of [42, 'signed', [], { statement: 7, signatureBase64: signed.signatureBase64 }]) {
      expect(verifyIndependentAuditAnchor(journalId, entries, receipt as never, key))
        .toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
    }
    const malformed = [
      signed.signatureBase64.replace(/==$/, ''),
      signed.signatureBase64 + '==',
      signed.signatureBase64.slice(0, -2) + 'AA',
      signed.signatureBase64.slice(0, -3) + 'B=='
    ];
    for (const signatureBase64 of malformed) {
      expect(verifyIndependentAuditAnchor(journalId, entries, { ...signed, signatureBase64 }, key))
        .toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
    }
  });
  it('refuses to propose a checkpoint for a tampered chain', () => {
    expect(() => proposeAuditAnchorStatement(journalId, [{ ...entries[0], details: { allowed: true } }]))
      .toThrow(/invalid audit journal/);
  });
});
