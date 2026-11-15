/**
 * Ed25519 verification of a versioned academy assessment.
 * Trusted public keys come from the operator's controlled host, never the
 * submission and never a model-generated self-attestation.
 */
import { createHash, createPublicKey, verify } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import {
  evaluateAcademicCriteria, type AgentCurriculum,
  type QualificationResult, type SignedQualificationRecord
} from './AgentAcademy.ts';

export const ACADEMY_SIGNATURE_DOMAIN = 'USV01_AGENT_ACADEMY_V1\n';

export function academyEvidenceBytes(record: SignedQualificationRecord): Buffer {
  // Bind reviewer and Director identities as well as assessment content.
  // Otherwise an actor could relabel a signed record without invalidating it.
  return Buffer.from(ACADEMY_SIGNATURE_DOMAIN + JSON.stringify({
    evidence: record.evidence,
    reviewer: { identity: record.reviewer.identity, qualification: record.reviewer.qualification },
    director: { identity: record.director.identity }
  }), 'utf8');
}

function parseEd25519PublicKey(pem: string): KeyObject {
  const key = createPublicKey(pem);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('Academy trust root must be Ed25519');
  return key;
}

function isValidSignature(signature: string, payload: Buffer, key: KeyObject): boolean {
  if (typeof signature !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(signature)) return false;
  const bytes = Buffer.from(signature, 'base64');
  if (bytes.length !== 64 || bytes.toString('base64') !== signature) return false;
  return verify(null, payload, key, bytes);
}

/**
 * A verified signature binds reviewed evidence to an identity and exact source;
 * it is not proof that a human really performed the inspection. Custody, test
 * witnesses and independent technical judgment remain external prerequisites.
 */
export function verifyAcademyQualification(
  curriculum: AgentCurriculum,
  record: SignedQualificationRecord | undefined,
  currentSourceSha: string,
  reviewerPublicKeyPem?: string,
  directorPublicKeyPem?: string
): QualificationResult {
  let reviewerOk = false;
  let directorOk = false;
  let distinct = false;
  if (record && reviewerPublicKeyPem && directorPublicKeyPem) {
    try {
      const reviewerKey = parseEd25519PublicKey(reviewerPublicKeyPem);
      const directorKey = parseEd25519PublicKey(directorPublicKeyPem);
      const reviewerFingerprint = createHash('sha256')
        .update(reviewerKey.export({ type: 'spki', format: 'der' })).digest('hex');
      const directorFingerprint = createHash('sha256')
        .update(directorKey.export({ type: 'spki', format: 'der' })).digest('hex');
      distinct = reviewerFingerprint !== directorFingerprint &&
        Boolean(record.reviewer?.identity?.trim()) &&
        Boolean(record.reviewer?.qualification?.trim()) &&
        Boolean(record.director?.identity?.trim()) &&
        record.reviewer.identity.trim() !== record.director.identity.trim();
      const payload = academyEvidenceBytes(record);
      reviewerOk = distinct && isValidSignature(record.reviewer.signatureBase64, payload, reviewerKey);
      directorOk = distinct && isValidSignature(record.director.signatureBase64, payload, directorKey);
    } catch {
      reviewerOk = false;
      directorOk = false;
      distinct = false;
    }
  }
  return evaluateAcademicCriteria(
    curriculum, record?.evidence, currentSourceSha,
    reviewerOk, directorOk, distinct
  );
}
