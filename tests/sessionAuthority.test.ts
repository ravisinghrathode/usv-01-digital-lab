import { describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken } from '../server.ts';

describe('Session identity and authority binding', () => {
  const allowed = { userId: 'usr-lead-sys-01', userName: 'Lead Systems Architect', role: 'LEAD_SYSTEMS_ENGINEER' };
  it('accepts a well-formed token for a registered staff identity', () => {
    expect(verifySessionToken(createSessionToken(allowed))?.userId).toBe(allowed.userId);
  });
  it('rejects signed tokens with role elevation or forged identity', () => {
    expect(verifySessionToken(createSessionToken({ ...allowed, role: 'ENGINEERING_DIRECTOR' }))).toBeNull();
    expect(verifySessionToken(createSessionToken({ ...allowed, userId: 'unregistered-user' }))).toBeNull();
    expect(verifySessionToken(createSessionToken({ ...allowed, userName: 'Impersonator' }))).toBeNull();
  });
  it('rejects expired and excessive-duration tokens', () => {
    expect(verifySessionToken(createSessionToken(allowed, -1000))).toBeNull();
    expect(verifySessionToken(createSessionToken(allowed, 3 * 24 * 60 * 60 * 1000))).toBeNull();
  });
});
