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
  it('fails closed for malformed runtime trust roots and journal identities', () => {
    for (const malformedKey of [42, {}, [], true]) {
      expect(() => verifyIndependentAuditAnchor(journalId, entries, signed, malformedKey as never))
        .not.toThrow();
      expect(verifyIndependentAuditAnchor(journalId, entries, signed, malformedKey as never))
        .toEqual({ valid: false, reason: 'UNTRUSTED_WITNESS_KEY' });
    }
    for (const malformedId of [42, {}, [], null, 'invalid journal', 'x'.repeat(129)]) {
      expect(() => verifyIndependentAuditAnchor(malformedId as never, entries, signed, key))
        .not.toThrow();
      expect(verifyIndependentAuditAnchor(malformedId as never, entries, signed, key))
        .toEqual({ valid: false, reason: 'JOURNAL_MISMATCH' });
    }
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
  it('rejects receipts with throwing getters without crashing verification', () => {
    const throwingStatement = {
      get statement(): never { throw new Error('untrusted getter'); },
      signatureBase64: signed.signatureBase64
    };
    const throwingSignature = {
      statement: s,
      get signatureBase64(): never { throw new Error('untrusted getter'); }
    };
    const throwingField = {
      ...s,
      get issuedAtUtc(): never { throw new Error('untrusted getter'); }
    };
    for (const receipt of [throwingStatement, throwingSignature, {
      statement: throwingField,
      signatureBase64: signed.signatureBase64
    }]) {
      expect(() => verifyIndependentAuditAnchor(journalId, entries, receipt as never, key))
        .not.toThrow();
      expect(verifyIndependentAuditAnchor(journalId, entries, receipt as never, key))
        .toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
    }
  });
  it('rejects hostile receipt proxies whose shape traps throw without crashing', () => {
    const throwingOwnKeys = new Proxy(signed, {
      ownKeys(): never { throw new Error('untrusted ownKeys trap'); }
    });
    const throwingDescriptor = new Proxy(signed, {
      getOwnPropertyDescriptor(): never { throw new Error('untrusted descriptor trap'); }
    });
    const revoked = Proxy.revocable(signed, {});
    revoked.revoke();
    for (const receipt of [throwingOwnKeys, throwingDescriptor, revoked.proxy]) {
      expect(() => verifyIndependentAuditAnchor(journalId, entries, receipt, key))
        .not.toThrow();
      expect(verifyIndependentAuditAnchor(journalId, entries, receipt, key))
        .toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
    }
  });
  it('rejects unsigned extension fields on receipts and signed statements', () => {
    // Extension fields are not included in the canonical signed bytes and must
    // not be allowed to masquerade as witness assertions or approval metadata.
    expect(verifyIndependentAuditAnchor(journalId, entries, {
      ...signed,
      approval: 'STAGE_E_ACCEPTED'
    } as never, key)).toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
    expect(verifyIndependentAuditAnchor(journalId, entries, {
      ...signed,
      statement: { ...signed.statement, witnessApproved: true }
    } as never, key)).toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
  });
  it('fails closed for malformed persisted journal entries without propagating exceptions', () => {
    for (const corrupted of [[null], [undefined], [42], [{ hash: null }]]) {
      expect(() => verifyIndependentAuditAnchor(journalId, corrupted as never, signed, key))
        .not.toThrow();
      expect(verifyIndependentAuditAnchor(journalId, corrupted as never, signed, key))
        .toEqual({ valid: false, reason: 'AUDIT_CHAIN_INVALID' });
    }
  });
  it('fails closed when proposing checkpoints from corrupt persisted journal shapes', () => {
    for (const malformed of [null, undefined, {}, 'journal', [null], [undefined], [42], [{ hash: null }]]) {
      expect(() => proposeAuditAnchorStatement(journalId, malformed as never, timestamp))
        .toThrow('Cannot propose a checkpoint for an invalid audit journal');
    }
  });
  it('fails closed on hostile persisted journal array proxy traps', () => {
    const hostile = new Proxy(entries, {
      get(target, property, receiver) {
        if (property === 'length') throw new Error('corrupt journal length');
        return Reflect.get(target, property, receiver);
      }
    });
    expect(() => verifyIndependentAuditAnchor(journalId, hostile, signed, key)).not.toThrow();
    expect(verifyIndependentAuditAnchor(journalId, hostile, signed, key))
      .toEqual({ valid: false, reason: 'AUDIT_CHAIN_INVALID' });
    expect(() => proposeAuditAnchorStatement(journalId, hostile, timestamp))
      .toThrow('Cannot propose a checkpoint for an invalid audit journal');
  });
  it('rejects mutable accessor-backed journals rather than validating one state and attesting another', () => {
    const hostile = [{ ...entries[0] }];
    let reads = 0;
    Object.defineProperty(hostile[0], 'hash', {
      enumerable: true,
      get() {
        reads += 1;
        return reads === 1 ? entries[0].hash : '0'.repeat(64);
      }
    });
    expect(verifyIndependentAuditAnchor(journalId, hostile, signed, key))
      .toEqual({ valid: false, reason: 'AUDIT_CHAIN_INVALID' });
    expect(() => proposeAuditAnchorStatement(journalId, hostile, timestamp))
      .toThrow('Cannot propose a checkpoint for an invalid audit journal');
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key))
      .toEqual({ valid: true, reason: 'VERIFIED' });
  });
  it('rejects accessor-backed signed statements even if their first read looks valid', () => {
    let reads = 0;
    const statement = { ...s };
    Object.defineProperty(statement, 'tipHash', {
      enumerable: true,
      get() {
        reads += 1;
        return reads === 1 ? s.tipHash : '0'.repeat(64);
      }
    });
    expect(() => verifyIndependentAuditAnchor(journalId, entries, {
      statement,
      signatureBase64: signed.signatureBase64
    }, key)).not.toThrow();
    expect(verifyIndependentAuditAnchor(journalId, entries, {
      statement,
      signatureBase64: signed.signatureBase64
    }, key)).toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key))
      .toEqual({ valid: true, reason: 'VERIFIED' });
  });
  it('refuses to propose a checkpoint for a tampered chain', () => {
    expect(() => proposeAuditAnchorStatement(journalId, [{ ...entries[0], details: { allowed: true } }]))
      .toThrow(/invalid audit journal/);
  });
});
