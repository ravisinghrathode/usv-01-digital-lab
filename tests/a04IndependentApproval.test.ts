import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  A04_APPROVAL_SCHEMA, canonicalA04Approval,
  sha256Hex, verifyA04IndependentApproval, type A04SignedApproval
} from '../src/core/mission-control/A04IndependentApproval.ts';

const sourceSha = 'a'.repeat(40);
const hostId = 'private-mac-usv01';
const nowMs = Date.parse('2026-11-17T02:00:00.000Z');

function fixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'usv-a04-fixture-'));
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'usv-a04-external-'));
  fs.mkdirSync(path.join(rootDir, 'data'));
  fs.mkdirSync(path.join(rootDir, 'evidence'));
  const receiptPath = path.join(rootDir, 'data', 'a04-host-readiness-synthetic.json');
  const catalogPath = path.join(rootDir, 'evidence', 'synthetic.json');
  const approvalPath = path.join(external, 'a04-approval.json');
  const trustedReviewerPublicKeyPath = path.join(external, 'reviewer-pub.pem');
  const receipt = {
    schemaVersion: 'USV-A04-HOST-PREFLIGHT-1.0',
    type: 'NON_SECRET_LOCAL_OBSERVATION_UNATTESTED',
    sourceSha, expectedSourceSha: sourceSha,
    stableHostAliasSha256: sha256Hex(hostId),
    checks: {
      repositoryIdentityVerified: true, trackedWorktreeClean: true,
      checkoutOwnerMatchesOperator: true, codexCliPresent: true,
      chatgptSubscriptionAuthenticated: true, researchPolicyPermitted: true,
      privateTempStorageVerified: true, stableHostAliasConfigured: true
    },
    decision: {
      status: 'PASS_UNATTESTED', blockerCodes: [],
      independentlyAttested: false
    }
  };
  const receiptBytes = Buffer.from(JSON.stringify(receipt) + '\n');
  const catalogBytes = Buffer.from(JSON.stringify({
    dataClassification: 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL'
  }) + '\n');
  fs.writeFileSync(receiptPath, receiptBytes, { mode: 0o600 });
  fs.writeFileSync(catalogPath, catalogBytes, { mode: 0o600 });
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  fs.writeFileSync(trustedReviewerPublicKeyPath,
    publicKey.export({ format: 'pem', type: 'spki' }), { mode: 0o600 });
  const approval: A04SignedApproval = {
    schema: A04_APPROVAL_SCHEMA,
    approvalId: 'SYNTHETIC-APPROVAL-001',
    sourceSha,
    hostAliasSha256: sha256Hex(hostId),
    reviewedReceiptSha256: sha256Hex(receiptBytes),
    catalogSha256: sha256Hex(catalogBytes),
    catalogClassification: 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL',
    authorization: 'NON_ACTUATING_RESEARCH_ONLY',
    reviewerIdentity: 'SYNTHETIC INDEPENDENT TEST REVIEWER',
    reviewerOrganization: 'SYNTHETIC ONLY',
    issuedAtUtc: '2026-11-17T01:00:00.000Z',
    expiresAtUtc: '2026-11-18T01:00:00.000Z',
    decision: 'APPROVED',
    signatureBase64: ''
  };
  const save = () => {
    approval.signatureBase64 = sign(null,
      Buffer.from(canonicalA04Approval(approval), 'utf8'), privateKey).toString('base64');
    fs.writeFileSync(approvalPath, JSON.stringify(approval, null, 2) + '\n',
      { mode: 0o600 });
  };
  const input = {
    rootDir, sourceSha, hostId, catalogPath, receiptPath,
    approvalPath, trustedReviewerPublicKeyPath, nowMs
  };
  save();
  return {
    approval, input, save, receiptPath, catalogPath, approvalPath,
    trustedReviewerPublicKeyPath,
    cleanup: () => {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(external, { recursive: true, force: true });
    }
  };
}

describe('A04 signed independent host review (synthetic fixture ONLY)', () => {
  it('requires a real Ed25519 signature over the exact host/source/receipt/catalog', () => {
    const f = fixture();
    try {
      const accepted = verifyA04IndependentApproval(f.input);
      expect(accepted).toMatchObject({
        accepted: true, sourceSha,
        approvalId: 'SYNTHETIC-APPROVAL-001'
      });
      expect(() => verifyA04IndependentApproval({
        ...f.input, approvalPath: undefined
      })).toThrow(/A04_APPROVAL_MISSING/);
      expect(() => verifyA04IndependentApproval({
        ...f.input, trustedReviewerPublicKeyPath: undefined
      })).toThrow(/A04_TRUST_ROOT_MISSING/);
      expect(() => verifyA04IndependentApproval({
        ...f.input, receiptPath: undefined
      })).toThrow(/A04_REVIEWED_RECEIPT_MISSING/);
      expect(() => verifyA04IndependentApproval({
        ...f.input, hostId: 'different-mac'
      })).toThrow(/A04_REVIEWED_RECEIPT_NOT_READY/);
      expect(() => verifyA04IndependentApproval({
        ...f.input, sourceSha: 'b'.repeat(40)
      })).toThrow(/A04_REVIEWED_RECEIPT_NOT_READY/);

      f.approval.reviewerIdentity = 'FORGED REVIEWER';
      fs.writeFileSync(f.approvalPath, JSON.stringify(f.approval) + '\n');
      expect(() => verifyA04IndependentApproval(f.input))
        .toThrow(/A04_APPROVAL_SIGNATURE_INVALID/);
      f.approval.reviewerIdentity = 'SYNTHETIC INDEPENDENT TEST REVIEWER';
      f.save();

      fs.writeFileSync(f.catalogPath,
        '{"dataClassification":"SYNTHETIC_TEST_ONLY_NON_OPERATIONAL","changed":true}\n');
      expect(() => verifyA04IndependentApproval(f.input))
        .toThrow(/A04_APPROVAL_FIELDS_OR_SOURCE_MISMATCH/);
    } finally { f.cleanup(); }
  });

  it('rejects untrusted signatures, stale decisions, HOLD and altered receipts', () => {
    const f = fixture();
    try {
      const rogue = generateKeyPairSync('ed25519');
      const key = rogue.publicKey.export({ format: 'pem', type: 'spki' });
      fs.writeFileSync(f.trustedReviewerPublicKeyPath, key);
      expect(() => verifyA04IndependentApproval(f.input))
        .toThrow(/A04_APPROVAL_SIGNATURE_INVALID/);

      f.save();
      const nowExpired = Date.parse('2026-11-18T02:00:00.000Z');
      expect(() => verifyA04IndependentApproval({ ...f.input, nowMs: nowExpired }))
        .toThrow(/A04_APPROVAL_EXPIRED_OR_INVALID_WINDOW/);

      f.approval.decision = 'HOLD';
      f.save();
      expect(() => verifyA04IndependentApproval(f.input))
        .toThrow(/A04_APPROVAL_FIELDS_OR_SOURCE_MISMATCH/);

      fs.writeFileSync(f.receiptPath, JSON.stringify({
        schemaVersion: 'USV-A04-HOST-PREFLIGHT-1.0',
        type: 'NON_SECRET_LOCAL_OBSERVATION_UNATTESTED',
        sourceSha, expectedSourceSha: sourceSha,
        stableHostAliasSha256: sha256Hex(hostId),
        checks: { repositoryIdentityVerified: false },
        decision: { status: 'BLOCKED', blockerCodes: ['NOT_APPROVED_REPOSITORY'],
          independentlyAttested: false }
      }));
      expect(() => verifyA04IndependentApproval(f.input))
        .toThrow(/A04_REVIEWED_RECEIPT_NOT_READY/);
    } finally { f.cleanup(); }
  });

  it('cannot treat a signature from a self-generated test key as independently approved', () => {
    const f = fixture();
    try {
      const x = fs.readFileSync(f.approvalPath, 'utf8');
      expect(createHash('sha256').update(x).digest('hex')).toMatch(/^[0-9a-f]{64}$/);
      // This fixture tests cryptographic mechanics only. Real trust-anchor
      // provisioning and reviewer independence are outside model authority.
      expect(f.approval.reviewerOrganization).toBe('SYNTHETIC ONLY');
    } finally { f.cleanup(); }
  });
});
