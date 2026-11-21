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
  it('rejects non-string journal identifiers before proposing a signed checkpoint', () => {
    for (const invalid of [42, true, {}, [], null, undefined]) {
      expect(() => proposeAuditAnchorStatement(invalid as never, entries, timestamp))
        .toThrow('Invalid audit journal identity');
    }
  });
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
  it('accepts a single valid PEM with LF or CRLF line endings but rejects literal backslash escapes', () => {
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key.replace(/\n/g, '\r\n')))
      .toEqual({ valid: true, reason: 'VERIFIED' });
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key.replace(/\n/g, '\\n')))
      .toEqual({ valid: false, reason: 'UNTRUSTED_WITNESS_KEY' });
  });
  it('rejects ambiguous PEM bundles and trailing trust-root content', () => {
    const other = crypto.generateKeyPairSync('ed25519').publicKey
      .export({ type: 'spki', format: 'pem' }).toString();
    for (const ambiguous of [
      key + other,
      key + 'UNSIGNED-APPROVAL',
      'UNSIGNED-HEADER\\n' + key,
      key.replace('-----END PUBLIC KEY-----', '-----END PUBLIC KEY-----\\n-----BEGIN PUBLIC KEY-----')
    ]) {
      expect(verifyIndependentAuditAnchor(journalId, entries, signed, ambiguous))
        .toEqual({ valid: false, reason: 'UNTRUSTED_WITNESS_KEY' });
    }
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key))
      .toEqual({ valid: true, reason: 'VERIFIED' });
  });
  it('distinguishes invalid external trust-root provisioning from signature tampering', () => {
    for (const malformedKey of ['not a PEM key', '-----BEGIN PUBLIC KEY-----\\ninvalid\\n-----END PUBLIC KEY-----']) {
      expect(verifyIndependentAuditAnchor(journalId, entries, signed, malformedKey))
        .toEqual({ valid: false, reason: 'UNTRUSTED_WITNESS_KEY' });
    }
    const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey
      .export({ type: 'spki', format: 'pem' }).toString();
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, rsa))
      .toEqual({ valid: false, reason: 'UNTRUSTED_WITNESS_KEY' });
    const tampered = { ...signed, signatureBase64: Buffer.alloc(64).toString('base64') };
    expect(verifyIndependentAuditAnchor(journalId, entries, tampered, key))
      .toEqual({ valid: false, reason: 'INVALID_WITNESS_SIGNATURE' });
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key))
      .toEqual({ valid: true, reason: 'VERIFIED' });
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
      // Some mutated strings remain syntactically canonical 64-byte signatures.
      // Those must fail cryptographic verification, not necessarily parsing.
      const result = verifyIndependentAuditAnchor(journalId, entries, { ...signed, signatureBase64 }, key);
      expect(result.valid).toBe(false);
      expect(['INVALID_ATTESTATION', 'INVALID_WITNESS_SIGNATURE']).toContain(result.reason);
    }
    // Canonically encoded but cryptographically invalid bytes are a signature
    // failure, distinct from malformed base64 transport encodings.
    expect(verifyIndependentAuditAnchor(journalId, entries, {
      ...signed, signatureBase64: Buffer.alloc(64).toString('base64')
    }, key)).toEqual({ valid: false, reason: 'INVALID_WITNESS_SIGNATURE' });
  });
  it('rejects non-throwing accessor-backed outer receipt fields', () => {
    // Even a getter returning valid signed bytes is mutable and not a detached
    // wire-format receipt. Reject before accessing either property.
    const getterStatement = {
      get statement() { return signed.statement; },
      signatureBase64: signed.signatureBase64
    };
    const getterSignature = {
      statement: signed.statement,
      get signatureBase64() { return signed.signatureBase64; }
    };
    for (const receipt of [getterStatement, getterSignature]) {
      expect(verifyIndependentAuditAnchor(journalId, entries, receipt, key))
        .toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
    }
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key))
      .toEqual({ valid: true, reason: 'VERIFIED' });
  });
  it('does not invoke proxy get traps for validated signed receipt fields', () => {
    let fieldReads = 0;
    const trapped = new Proxy(signed, {
      get(target, property, receiver) {
        if (property === 'statement' || property === 'signatureBase64') {
          fieldReads += 1;
          throw new Error('unexpected mutable property read');
        }
        return Reflect.get(target, property, receiver);
      }
    });
    expect(verifyIndependentAuditAnchor(journalId, entries, trapped, key))
      .toEqual({ valid: true, reason: 'VERIFIED' });
    expect(fieldReads).toBe(0);
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
  it('rejects inherited approval claims and non-JSON receipt prototypes', () => {
    const inheritedReceipt = Object.assign(
      Object.create({ stageEApproval: 'APPROVED' }), signed
    );
    const inheritedStatement = Object.assign(
      Object.create({ stageDApproval: 'APPROVED' }), s
    );
    for (const receipt of [
      inheritedReceipt,
      { ...signed, statement: inheritedStatement },
      Object.assign(Object.create(null), signed),
      { ...signed, statement: Object.assign(Object.create(null), s) }
    ]) {
      expect(verifyIndependentAuditAnchor(journalId, entries, receipt, key))
        .toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
    }
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key))
      .toEqual({ valid: true, reason: 'VERIFIED' });
  });
  it('rejects non-enumerable required witness fields even when the signature is valid', () => {
    const hiddenSignature = { ...signed };
    Object.defineProperty(hiddenSignature, 'signatureBase64', {
      value: signed.signatureBase64, enumerable: false
    });
    const hiddenJournalId = { ...s };
    Object.defineProperty(hiddenJournalId, 'journalId', {
      value: s.journalId, enumerable: false
    });
    for (const receipt of [
      hiddenSignature,
      { ...signed, statement: hiddenJournalId }
    ]) {
      expect(verifyIndependentAuditAnchor(journalId, entries, receipt, key))
        .toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
    }
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key))
      .toEqual({ valid: true, reason: 'VERIFIED' });
  });
  it('rejects hidden unsigned metadata on receipts and witness statements', () => {
    const hiddenReceipt = { ...signed };
    Object.defineProperty(hiddenReceipt, 'stageEApproval', {
      value: 'APPROVED', enumerable: false
    });
    const symbolReceipt = { ...signed, [Symbol('independentApproval')]: true };
    const hiddenStatement = { ...s };
    Object.defineProperty(hiddenStatement, 'stageDApproval', {
      value: 'APPROVED', enumerable: false
    });
    const symbolStatement = { ...s, [Symbol('independentApproval')]: true };
    for (const receipt of [
      hiddenReceipt,
      symbolReceipt,
      { ...signed, statement: hiddenStatement },
      { ...signed, statement: symbolStatement }
    ]) {
      expect(verifyIndependentAuditAnchor(journalId, entries, receipt, key))
        .toEqual({ valid: false, reason: 'INVALID_ATTESTATION' });
    }
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key))
      .toEqual({ valid: true, reason: 'VERIFIED' });
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
  it('rejects sparse and accessor-indexed persisted journals without attesting partial evidence', () => {
    const sparse = new Array<AuditTrailEntry>(1);
    const accessor = [entries[0]];
    Object.defineProperty(accessor, '0', {
      enumerable: true,
      configurable: true,
      get(): AuditTrailEntry { throw new Error('untrusted journal index'); }
    });
    for (const journal of [sparse, accessor]) {
      expect(() => verifyIndependentAuditAnchor(journalId, journal, signed, key)).not.toThrow();
      expect(verifyIndependentAuditAnchor(journalId, journal, signed, key))
        .toEqual({ valid: false, reason: 'AUDIT_CHAIN_INVALID' });
      expect(() => proposeAuditAnchorStatement(journalId, journal, timestamp))
        .toThrow('Cannot propose a checkpoint for an invalid audit journal');
    }
  });
  it('rejects journal arrays carrying unsigned extra properties or altered prototypes', () => {
    const extra = [...entries] as AuditTrailEntry[] & { stageEApproval?: string };
    extra.stageEApproval = 'APPROVED';
    const symbol = [...entries];
    Object.defineProperty(symbol, Symbol('approval'), { value: true });
    const alteredPrototype = [...entries];
    Object.setPrototypeOf(alteredPrototype, Object.create(Array.prototype));
    for (const journal of [extra, symbol, alteredPrototype]) {
      expect(verifyIndependentAuditAnchor(journalId, journal, signed, key))
        .toEqual({ valid: false, reason: 'AUDIT_CHAIN_INVALID' });
      expect(() => proposeAuditAnchorStatement(journalId, journal, timestamp))
        .toThrow('Cannot propose a checkpoint for an invalid audit journal');
    }
    expect(verifyIndependentAuditAnchor(journalId, entries, signed, key))
      .toEqual({ valid: true, reason: 'VERIFIED' });
  });
  it('refuses to propose a checkpoint for a tampered chain', () => {
    expect(() => proposeAuditAnchorStatement(journalId, [{ ...entries[0], details: { allowed: true } }]))
      .toThrow(/invalid audit journal/);
  });
  it('returns canonical proposals for both genesis and populated journals after fail-closed validation', () => {
    const genesis = proposeAuditAnchorStatement(journalId, [], timestamp);
    expect(genesis).toEqual({
      schemaVersion: AUDIT_ANCHOR_SCHEMA,
      journalId,
      entryCount: 0,
      tipHash: 'GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000000000000000',
      issuedAtUtc: timestamp
    });
    expect(proposeAuditAnchorStatement(journalId, entries, timestamp)).toEqual(s);
    expect(() => proposeAuditAnchorStatement(journalId, [{ ...entries[0], hash: '0'.repeat(64) }], timestamp))
      .toThrow('Cannot propose a checkpoint for an invalid audit journal');
    expect(proposeAuditAnchorStatement(journalId, entries, timestamp)).toEqual(s);
  });

});
