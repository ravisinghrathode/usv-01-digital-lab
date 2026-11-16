/**
 * Fail-closed verifier for an independently signed, short-lived A04 approval.
 *
 * A shell variable or passing preflight is NOT a review signature. Reviewer
 * identity and the public-key trust root must be verified independently,
 * outside the public Git checkout. This verifies cryptographic binding only;
 * it never grants engineering baseline, actuator, or vessel-release authority.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, createPublicKey, verify } from 'node:crypto';

export const A04_APPROVAL_SCHEMA = 'USV-A04-INDEPENDENT-REVIEW-1' as const;

const SHA = /^[0-9a-f]{40}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,79}$/;

export interface A04SignedApproval {
  schema: typeof A04_APPROVAL_SCHEMA;
  approvalId: string;
  sourceSha: string;
  hostAliasSha256: string;
  reviewedReceiptSha256: string;
  catalogSha256: string;
  catalogClassification: string;
  authorization: 'NON_ACTUATING_RESEARCH_ONLY';
  reviewerIdentity: string;
  reviewerOrganization: string;
  issuedAtUtc: string;
  expiresAtUtc: string;
  decision: 'APPROVED' | 'HOLD';
  signatureBase64: string;
}

export function sha256Hex(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Deterministic complete payload, never includes the signature. */
export function canonicalA04Approval(record: A04SignedApproval): string {
  return JSON.stringify({
    schema: record.schema,
    approvalId: record.approvalId,
    sourceSha: record.sourceSha,
    hostAliasSha256: record.hostAliasSha256,
    reviewedReceiptSha256: record.reviewedReceiptSha256,
    catalogSha256: record.catalogSha256,
    catalogClassification: record.catalogClassification,
    authorization: record.authorization,
    reviewerIdentity: record.reviewerIdentity,
    reviewerOrganization: record.reviewerOrganization,
    issuedAtUtc: record.issuedAtUtc,
    expiresAtUtc: record.expiresAtUtc,
    decision: record.decision
  });
}

function readFileChecked(filename: string, limit: number): Buffer {
  const stat = fs.statSync(filename);
  if (!stat.isFile() || stat.size <= 0 || stat.size > limit ||
      (stat.mode & 0o022) !== 0 || fs.lstatSync(filename).isSymbolicLink()) {
    throw new Error('A04_REVIEW_FILE_UNSAFE');
  }
  return fs.readFileSync(filename);
}

function externalFile(rootDir: string, filename: string | undefined, label: string): string {
  if (!filename) throw new Error(label + '_MISSING');
  const root = fs.realpathSync(rootDir);
  const result = fs.realpathSync(path.resolve(filename));
  if (result === root || result.startsWith(root + path.sep)) {
    throw new Error(label + '_MUST_BE_OUTSIDE_REPO');
  }
  if (fs.lstatSync(path.resolve(filename)).isSymbolicLink()) {
    throw new Error(label + '_SYMLINK_DENIED');
  }
  return result;
}

export function verifyA04IndependentApproval(input: {
  rootDir: string;
  sourceSha: string;
  hostId: string;
  catalogPath: string;
  receiptPath?: string;
  approvalPath?: string;
  trustedReviewerPublicKeyPath?: string;
  nowMs?: number;
}): { accepted: true; approvalId: string; sourceSha: string; reviewerIdentity: string } {
  const { rootDir, sourceSha, hostId } = input;
  if (!SHA.test(sourceSha) || !ID.test(hostId)) throw new Error('A04_SOURCE_OR_HOST_INVALID');
  const root = fs.realpathSync(rootDir);
  const dataRoot = path.join(root, 'data');
  if (!input.receiptPath) throw new Error('A04_REVIEWED_RECEIPT_MISSING');
  const receiptPath = fs.realpathSync(path.resolve(input.receiptPath));
  if (!receiptPath.startsWith(dataRoot + path.sep)) throw new Error('A04_RECEIPT_OUTSIDE_PRIVATE_DATA');
  const receiptBytes = readFileChecked(receiptPath, 128 * 1024);
  const receipt = JSON.parse(receiptBytes.toString('utf8'));
  if (receipt.schemaVersion !== 'USV-A04-HOST-PREFLIGHT-1.0' ||
      receipt.type !== 'NON_SECRET_LOCAL_OBSERVATION_UNATTESTED' ||
      receipt.sourceSha !== sourceSha || receipt.expectedSourceSha !== sourceSha ||
      receipt.stableHostAliasSha256 !== sha256Hex(hostId) ||
      receipt.decision?.status !== 'PASS_UNATTESTED' ||
      receipt.decision?.blockerCodes?.length !== 0 ||
      receipt.decision?.independentlyAttested !== false ||
      !receipt.checks || Object.values(receipt.checks).some(x => x !== true)) {
    throw new Error('A04_REVIEWED_RECEIPT_NOT_READY');
  }

  const catalogPath = fs.realpathSync(input.catalogPath);
  const catalogBytes = readFileChecked(catalogPath, 2 * 1024 * 1024);
  const catalog = JSON.parse(catalogBytes.toString('utf8'));
  const approvalFile = externalFile(rootDir, input.approvalPath, 'A04_APPROVAL');
  const keyFile = externalFile(rootDir, input.trustedReviewerPublicKeyPath, 'A04_TRUST_ROOT');
  const approval = JSON.parse(readFileChecked(approvalFile, 32 * 1024).toString('utf8')) as A04SignedApproval;
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) {
    throw new Error('A04_APPROVAL_MALFORMED');
  }
  const expectedFields = [
    'approvalId', 'authorization', 'catalogClassification', 'catalogSha256',
    'decision', 'expiresAtUtc', 'hostAliasSha256', 'issuedAtUtc',
    'reviewedReceiptSha256', 'reviewerIdentity', 'reviewerOrganization',
    'schema', 'signatureBase64', 'sourceSha'
  ].sort().join(',');
  if (Object.keys(approval).sort().join(',') !== expectedFields ||
      approval.schema !== A04_APPROVAL_SCHEMA || approval.decision !== 'APPROVED' ||
      approval.authorization !== 'NON_ACTUATING_RESEARCH_ONLY' ||
      !ID.test(approval.approvalId) || !approval.reviewerIdentity?.trim() ||
      !approval.reviewerOrganization?.trim() ||
      approval.sourceSha !== sourceSha ||
      approval.hostAliasSha256 !== sha256Hex(hostId) ||
      approval.reviewedReceiptSha256 !== sha256Hex(receiptBytes) ||
      approval.catalogSha256 !== sha256Hex(catalogBytes) ||
      approval.catalogClassification !== catalog.dataClassification ||
      !DIGEST.test(approval.hostAliasSha256) ||
      !DIGEST.test(approval.reviewedReceiptSha256) ||
      !DIGEST.test(approval.catalogSha256)) {
    throw new Error('A04_APPROVAL_FIELDS_OR_SOURCE_MISMATCH');
  }

  const issuedAt = Date.parse(approval.issuedAtUtc);
  const expiresAt = Date.parse(approval.expiresAtUtc);
  const now = input.nowMs ?? Date.now();
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) ||
      issuedAt > now + 60_000 || now >= expiresAt ||
      expiresAt <= issuedAt || expiresAt - issuedAt > 7 * 86_400_000) {
    throw new Error('A04_APPROVAL_EXPIRED_OR_INVALID_WINDOW');
  }

  const keyPem = readFileChecked(keyFile, 32 * 1024);
  const key = createPublicKey(keyPem);
  if (key.asymmetricKeyType !== 'ed25519' ||
      typeof approval.signatureBase64 !== 'string' ||
      !/^[A-Za-z0-9+/]{86}==$/.test(approval.signatureBase64)) {
    throw new Error('A04_APPROVAL_SIGNATURE_INVALID');
  }
  const signature = Buffer.from(approval.signatureBase64, 'base64');
  if (signature.length !== 64 ||
      !verify(null, Buffer.from(canonicalA04Approval(approval), 'utf8'), key, signature)) {
    throw new Error('A04_APPROVAL_SIGNATURE_INVALID');
  }
  return { accepted: true, approvalId: approval.approvalId, sourceSha, reviewerIdentity: approval.reviewerIdentity };
}
