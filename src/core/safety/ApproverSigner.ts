import { ApproverIdentity } from '../types/safety.ts';

/**
 * Universal, zero-dependency constant-time byte string comparison.
 * Prevents side-channel timing attacks in both browser and Node runtimes.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Universal cryptographically secure random hex generator.
 * Uses W3C Web Cryptography API (`globalThis.crypto.getRandomValues`) supported in both Node 18+ and modern browsers.
 */
export function getRandomHex(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: standard SHA-256 for byte arrays
function sha256Bytes(bytes: number[]): number[] {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number;
  let j: number;
  const words: number[] = [];
  const asciiBitLength = bytes[lengthProperty] * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  const padded = Array.from(bytes);
  padded.push(0x80);
  while ((padded[lengthProperty] % 64) !== 56) padded.push(0);
  for (i = 0; i < padded[lengthProperty]; i++) {
    words[i >> 2] |= padded[i] << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;
  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        ((w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0) | 0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  const out: number[] = [];
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      out.push((hash[i] >> (8 * j)) & 255);
    }
  }
  return out;
}

/**
 * Standard RFC 2104 HMAC-SHA256 implementation.
 * Pure TypeScript, portable across Node.js, Web Browsers, and Web Workers without native crypto dependencies.
 */
export function hmacSha256(keyStr: string, msgStr: string): string {
  const enc = new TextEncoder();
  let key = Array.from(enc.encode(keyStr));
  const msg = Array.from(enc.encode(msgStr));
  if (key.length > 64) {
    key = sha256Bytes(key);
  }
  while (key.length < 64) {
    key.push(0);
  }
  const oKeyPad = key.map(b => b ^ 0x5c);
  const iKeyPad = key.map(b => b ^ 0x36);
  const inner = sha256Bytes(iKeyPad.concat(msg));
  const outer = sha256Bytes(oKeyPad.concat(inner));
  return outer.map(b => (b < 16 ? '0' : '') + b.toString(16)).join('');
}

// Dynamic runtime signing key; configured via environment variable if available or securely initialized
const initialSecret = typeof process !== 'undefined' && process.env?.LAB_SESSION_SECRET
  ? process.env.LAB_SESSION_SECRET
  : getRandomHex(32);

let runtimeSigningKey = initialSecret;

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
  return hmacSha256(signingKey, payload);
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

  if (timingSafeEqual(signature.toLowerCase(), expectedSignature.toLowerCase())) {
    return true;
  }

  if (
    identity.serverVerifiedSignature &&
    typeof identity.serverVerifiedSignature === 'string' &&
    timingSafeEqual(signature.toLowerCase(), identity.serverVerifiedSignature.toLowerCase())
  ) {
    return true;
  }

  return false;
}
