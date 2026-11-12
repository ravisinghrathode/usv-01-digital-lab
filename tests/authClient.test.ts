import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  login,
  logout,
  getSessionToken,
  getCurrentUser,
  setSession,
  clearSession,
  ensureAuthenticatedSession,
  subscribeAuthState,
  signApprovalGate
} from '../src/core/auth/authClient.ts';
import type { ApproverIdentity } from '../src/core/types/safety.ts';

describe('Client-Side Staff Authentication & Access Control (authClient)', () => {
  beforeEach(() => {
    clearSession();
    vi.restoreAllMocks();
  });

  it('should initially be unauthenticated with null token and user', () => {
    expect(getSessionToken()).toBeNull();
    expect(getCurrentUser()).toBeNull();
  });

  it('should reject login without userId or passphrase', async () => {
    await expect(login('', 'some-passphrase')).rejects.toThrow(
      'Authentication failed: User ID and passphrase are required.'
    );
    await expect(login('usr-lead-sys-01', '')).rejects.toThrow(
      'Authentication failed: User ID and passphrase are required.'
    );
  });

  it('should fail closed in ensureAuthenticatedSession when no session exists', async () => {
    await expect(ensureAuthenticatedSession()).rejects.toThrow(
      'Authentication required: No active session.'
    );
  });

  it('should notify subscribers when session is set or cleared', () => {
    const states: (ApproverIdentity | null)[] = [];
    const unsubscribe = subscribeAuthState((u) => {
      states.push(u);
    });

    const mockUser: ApproverIdentity = {
      userId: 'usr-lead-sys-01',
      userName: 'Lead Systems Architect',
      role: 'LEAD_SYSTEMS_ENGINEER',
      authenticatedAt: new Date().toISOString()
    };

    setSession('mock.token.123', mockUser);
    expect(getSessionToken()).toBe('mock.token.123');
    expect(getCurrentUser()?.userId).toBe('usr-lead-sys-01');

    logout();
    expect(getSessionToken()).toBeNull();
    expect(getCurrentUser()).toBeNull();

    unsubscribe();
    expect(states.length).toBeGreaterThanOrEqual(3);
  });

  it('should prevent non-director staff from signing approval gates', async () => {
    const staffUser: ApproverIdentity = {
      userId: 'usr-lead-sys-01',
      userName: 'Lead Systems Architect',
      role: 'LEAD_SYSTEMS_ENGINEER',
      authenticatedAt: new Date().toISOString()
    };
    setSession('mock.token.staff', staffUser);

    await expect(
      signApprovalGate('GATE-001', 'APPROVED', 'Staff notes')
    ).rejects.toThrow(
      "Authorization Violation: Only an authenticated 'ENGINEERING_DIRECTOR' can sign"
    );
  });
});
