/**
 * ECR Human Approval Records — Ed25519 signatures bound to an exact baseline content digest.
 *
 * Trust model
 * -----------
 * - The Engineering Director holds an Ed25519 private key, encrypted with a passphrase,
 *   stored OUTSIDE the repository. Only the Director can produce a valid signature.
 * - CI holds only the PUBLIC key (GitHub Actions variable DIRECTOR_PUBLIC_KEY). CI and any
 *   AI agent therefore cannot forge approvals. There is no shared HMAC secret and no fallback key.
 * - An approval signs a `baselineDigest`: a SHA-256 over every tracked file (path + git blob id)
 *   in the PR head tree EXCEPT the approval records themselves (governance/approvals/).
 *   Any change to any other file after signing — code, tests, workflows, ECR text,
 *   RELEASE_MANIFEST.json — changes the digest and invalidates the approval.
 *   This removes the "approve commit N, then commit N+1" window entirely.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

export const APPROVALS_DIR = 'governance/approvals';
export const APPROVAL_SCHEMA = 'usv01-ecr-approval/v2-ed25519';

export interface ECRApprovalPayload {
  schema: string;
  changeId: string;
  decision: 'APPROVED' | 'REJECTED';
  authorityId: string;
  authorityName: string;
  authorityRole: 'ENGINEERING_DIRECTOR';
  baselineDigest: string;
  headCommitAtSigning: string;
  signedAt: string;
  publicKeyFingerprint: string;
}

export interface ECRApprovalRecord extends ECRApprovalPayload {
  signature: string; // base64 Ed25519 signature over canonicalApprovalPayload()
}

export interface ApprovalVerification {
  verified: boolean;
  stale: boolean;
  error?: string;
}

/** Deterministic serialisation: fixed key order, no whitespace. */
export function canonicalApprovalPayload(p: ECRApprovalPayload): string {
  return JSON.stringify({
    schema: p.schema,
    changeId: p.changeId,
    decision: p.decision,
    authorityId: p.authorityId,
    authorityName: p.authorityName,
    authorityRole: p.authorityRole,
    baselineDigest: p.baselineDigest,
    headCommitAtSigning: p.headCommitAtSigning,
    signedAt: p.signedAt,
    publicKeyFingerprint: p.publicKeyFingerprint
  });
}

export function publicKeyFingerprint(publicKeyPem: string): string {
  const der = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
  return 'SHA256:' + crypto.createHash('sha256').update(der).digest('hex');
}

/**
 * Content digest of a git tree, excluding only the approval-record directory.
 * Uses committed blobs (not the working tree) so the result is reproducible in CI.
 */
export function computeBaselineDigest(ref = 'HEAD', cwd = process.cwd()): string {
  const listing = execFileSync('git', ['ls-tree', '-r', '--full-tree', ref], { cwd, encoding: 'utf-8' });
  const entries = listing
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [meta, filePath] = line.split('\t');
      const [mode, type, sha] = meta.split(' ');
      return { mode, type, sha, filePath };
    })
    .filter(e => !e.filePath.startsWith(APPROVALS_DIR + '/'))
    .sort((a, b) => (a.filePath < b.filePath ? -1 : a.filePath > b.filePath ? 1 : 0));

  const h = crypto.createHash('sha256');
  for (const e of entries) h.update(`${e.mode} ${e.type} ${e.sha}\t${e.filePath}\n`);
  return 'sha256:' + h.digest('hex');
}

export function signApproval(payload: ECRApprovalPayload, privateKey: crypto.KeyObject): ECRApprovalRecord {
  const signature = crypto.sign(null, Buffer.from(canonicalApprovalPayload(payload)), privateKey).toString('base64');
  return { ...payload, signature };
}

/**
 * Verify an approval record against the pinned Director public key and the expected digest.
 * Fails closed on every missing or mismatching element.
 */
export function verifyApproval(
  record: Partial<ECRApprovalRecord> | null | undefined,
  opts: { publicKeyPem?: string; expectedDigest: string }
): ApprovalVerification {
  if (!opts.publicKeyPem || !opts.publicKeyPem.includes('BEGIN PUBLIC KEY')) {
    return { verified: false, stale: false, error: 'DIRECTOR_PUBLIC_KEY is not provisioned. No fallback trust anchor exists; approval cannot be verified.' };
  }
  if (!record || typeof record !== 'object') {
    return { verified: false, stale: false, error: 'No approval record supplied.' };
  }
  const required: (keyof ECRApprovalRecord)[] = [
    'schema', 'changeId', 'decision', 'authorityId', 'authorityName', 'authorityRole',
    'baselineDigest', 'headCommitAtSigning', 'signedAt', 'publicKeyFingerprint', 'signature'
  ];
  for (const k of required) {
    if (typeof record[k] !== 'string' || !(record[k] as string).length) {
      return { verified: false, stale: false, error: `Approval record missing field '${k}'.` };
    }
  }
  const r = record as ECRApprovalRecord;
  if (r.schema !== APPROVAL_SCHEMA) return { verified: false, stale: false, error: `Unsupported approval schema '${r.schema}'.` };
  if (r.authorityRole !== 'ENGINEERING_DIRECTOR') return { verified: false, stale: false, error: `Role '${r.authorityRole}' has no approval authority.` };

  let fingerprint: string;
  try {
    fingerprint = publicKeyFingerprint(opts.publicKeyPem);
  } catch (err: any) {
    return { verified: false, stale: false, error: `Invalid DIRECTOR_PUBLIC_KEY: ${err?.message || err}` };
  }
  if (r.publicKeyFingerprint !== fingerprint) {
    return { verified: false, stale: false, error: `Approval was signed by key ${r.publicKeyFingerprint}, which is not the pinned Director key ${fingerprint}.` };
  }

  let sigOk = false;
  try {
    sigOk = crypto.verify(null, Buffer.from(canonicalApprovalPayload(r)), crypto.createPublicKey(opts.publicKeyPem), Buffer.from(r.signature, 'base64'));
  } catch (err: any) {
    return { verified: false, stale: false, error: `Signature verification error: ${err?.message || err}` };
  }
  if (!sigOk) return { verified: false, stale: false, error: 'Ed25519 signature verification failed: record was altered or not signed by the Director key.' };

  if (r.baselineDigest !== opts.expectedDigest) {
    return {
      verified: false,
      stale: true,
      error: `STALE APPROVAL REJECTED: approval covers baseline ${r.baselineDigest} (signed at commit ${r.headCommitAtSigning.substring(0, 7)}), but the PR head content is ${opts.expectedDigest}. Files changed after sign-off; the Director must re-sign.`
    };
  }
  if (r.decision !== 'APPROVED') return { verified: false, stale: false, error: `Director decision is '${r.decision}'.` };
  return { verified: true, stale: false };
}

export function loadApprovalRecords(rootDir = process.cwd()): { file: string; record: Partial<ECRApprovalRecord> | null; parseError?: string }[] {
  const dir = path.join(rootDir, APPROVALS_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.approval.json'))
    .map(f => {
      try {
        return { file: f, record: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) };
      } catch (err: any) {
        return { file: f, record: null, parseError: err?.message || String(err) };
      }
    });
}

export function resolveDirectorPublicKey(): string | undefined {
  if (process.env.DIRECTOR_PUBLIC_KEY && process.env.DIRECTOR_PUBLIC_KEY.trim()) {
    return process.env.DIRECTOR_PUBLIC_KEY.replace(/\\n/g, '\n').trim();
  }
  const file = process.env.DIRECTOR_PUBLIC_KEY_FILE;
  if (file && fs.existsSync(file)) return fs.readFileSync(file, 'utf-8').trim();
  return undefined;
}
