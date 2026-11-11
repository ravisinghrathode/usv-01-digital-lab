import crypto from 'crypto';
import { ApproverIdentity } from '../types/safety.ts';

// Dynamic runtime signing key; can be configured via environment variable or initialized securely
let runtimeSigningKey = process.env.DIRECTOR_SIGNING_KEY || process.env.LAB_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export const getDirectorSigningKey = (): string => runtimeSigningKey;

export const setDirectorSigningKey = (key: string): void => {
  runtimeSigningKey = key;
};

/**
 * Generates a cryptographically valid HMAC-SHA256 signature for an approval decision.
 * Binds gateId, decision, userId, role, and timestamp into an immutable tamper-evident token.
 */
export function generateApproverSignature(
  gateId: string,
  decision: 'APPROVED' | 'REJECTED',
  userId: string,
  role: string,
  timestamp: string,
  signingKey: string = getDirectorSigningKey()
): string {
  const payload = `${gateId}:${decision}:${userId}:${role}:${timestamp}`;
  return crypto.createHmac('sha256', signingKey).update(payload).digest('hex');
}

/**
 * Cryptographically verifies that the provided signature matches the gate decision payload.
 * Uses timingSafeEqual to protect against side-channel timing attacks.
 */
export function verifyApproverSignature(
  gateId: string,
  decision: 'APPROVED' | 'REJECTED',
  identity: ApproverIdentity,
  signingKey: string = getDirectorSigningKey()
): boolean {
  const signature = identity.tokenSignature || identity.tokenOrSignature;
  if (!signature || typeof signature !== 'string') {
    return false;
  }

  const expectedSignature = generateApproverSignature(
    gateId,
    decision,
    identity.userId,
    identity.role,
    identity.authenticatedAt,
    signingKey
  );

  try {
    const bufProvided = Buffer.from(signature, 'hex');
    const bufExpected = Buffer.from(expectedSignature, 'hex');

    if (bufProvided.length !== bufExpected.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufProvided, bufExpected);
  } catch {
    return false;
  }
}
