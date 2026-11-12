import type { ApproverIdentity } from '../types/safety.ts';

const SESSION_STORAGE_KEY = 'usv01_session_token';
const USER_STORAGE_KEY = 'usv01_session_user';

let currentSessionToken: string | null = null;
let currentUser: ApproverIdentity | null = null;
const authSubscribers: Set<(user: ApproverIdentity | null) => void> = new Set();

// Initialize from sessionStorage if available
if (typeof window !== 'undefined') {
  try {
    currentSessionToken = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    const storedUser = window.sessionStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

function notifySubscribers(): void {
  for (const sub of authSubscribers) {
    try {
      sub(currentUser);
    } catch (e) {
      console.warn('Auth subscriber error:', e);
    }
  }
}

export function subscribeAuthState(callback: (user: ApproverIdentity | null) => void): () => void {
  authSubscribers.add(callback);
  callback(currentUser);
  return () => {
    authSubscribers.delete(callback);
  };
}

export function getSessionToken(): string | null {
  return currentSessionToken;
}

export function getCurrentUser(): ApproverIdentity | null {
  return currentUser;
}

export function setSession(token: string, user: ApproverIdentity): void {
  currentSessionToken = token;
  currentUser = user;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
      window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore storage errors
    }
  }
  notifySubscribers();
}

export function clearSession(): void {
  currentSessionToken = null;
  currentUser = null;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.sessionStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  notifySubscribers();
}

/**
 * Explicit login workflow requiring verified identity and passphrase.
 * Strictly rejects anonymous identity assertion or empty passphrases.
 */
export async function login(
  userId: string,
  passphrase: string,
  role?: string
): Promise<ApproverIdentity> {
  if (!userId || !passphrase) {
    throw new Error('Authentication failed: User ID and passphrase are required.');
  }

  const payload: Record<string, string> = { userId, passphrase };
  if (role) {
    payload.role = role;
  }

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success || !data.token) {
    throw new Error(data.error || `Authentication failed with status HTTP ${res.status}`);
  }

  const identity: ApproverIdentity = {
    userId: data.user.userId,
    userName: data.user.userName,
    role: data.user.role,
    authenticatedAt: new Date().toISOString()
  };

  setSession(data.token, identity);
  return identity;
}

/**
 * Terminate the active session and revoke stored credentials locally.
 */
export function logout(): void {
  clearSession();
}

/**
 * Validates the current session token against the server's cryptographic session verifier.
 * Returns the verified user identity or null if the token is absent, expired, or invalid.
 */
export async function validateSession(): Promise<ApproverIdentity | null> {
  if (!currentSessionToken) {
    return null;
  }

  try {
    const res = await fetch('/api/auth/session', {
      headers: {
        Authorization: `Bearer ${currentSessionToken}`
      }
    });

    if (!res.ok) {
      clearSession();
      return null;
    }

    const data = await res.json().catch(() => ({}));
    if (data.success && data.user) {
      const validated: ApproverIdentity = {
        userId: data.user.userId,
        userName: data.user.userName,
        role: data.user.role,
        authenticatedAt: new Date().toISOString()
      };
      currentUser = validated;
      notifySubscribers();
      return validated;
    }

    clearSession();
    return null;
  } catch {
    // Network or server error; do not clear unconditionally on transient disconnect
    return currentUser;
  }
}

/**
 * Authenticates specifically with Engineering Director authority using the required passphrase.
 */
export async function authenticateAsDirector(passphrase: string): Promise<ApproverIdentity> {
  return login('usr-eng-dir-8841', passphrase, 'ENGINEERING_DIRECTOR');
}

/**
 * Ensures an authenticated session exists with the digital lab server.
 * If a valid session is already established, returns it.
 * If a director passphrase is provided, attempts director login.
 * Otherwise, rejects: ANONYMOUS OR DEFAULT IDENTITY FALLBACKS ARE STRICTLY PROHIBITED.
 */
export async function ensureAuthenticatedSession(
  directorPassphrase?: string
): Promise<{ token: string; user: ApproverIdentity }> {
  // If we already have a session, validate it with the server
  if (currentSessionToken && currentUser) {
    const verified = await validateSession();
    if (verified && currentSessionToken) {
      return { token: currentSessionToken, user: verified };
    }
  }

  // If a director passphrase was passed explicitly, authenticate
  if (directorPassphrase) {
    const user = await authenticateAsDirector(directorPassphrase);
    if (currentSessionToken) {
      return { token: currentSessionToken, user };
    }
  }

  // Fail closed: anonymous or default identity fallbacks without passphrase are prohibited
  throw new Error(
    'Authentication required: No active session. Please authenticate via the digital lab login interface with valid staff credentials.'
  );
}

/**
 * Perform an authenticated HTTP fetch to the backend, appending the verified Bearer token if present.
 */
export async function authenticatedFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  if (currentSessionToken) {
    headers.set('Authorization', `Bearer ${currentSessionToken}`);
  }

  return fetch(url, {
    ...init,
    headers
  });
}

/**
 * Requests a cryptographic gate authorization signature from the server's signing authority.
 * Binds gateId, decision, and Engineering Director identity into a tamper-evident signature.
 */
export async function signApprovalGate(
  gateId: string,
  decision: 'APPROVED' | 'REJECTED',
  directorNotes: string
): Promise<ApproverIdentity> {
  if (!currentUser || currentUser.role !== 'ENGINEERING_DIRECTOR') {
    throw new Error(
      "Authorization Violation: Only an authenticated 'ENGINEERING_DIRECTOR' can sign safety-critical approval gates."
    );
  }

  const res = await authenticatedFetch('/api/auth/sign-gate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gateId, decision, directorNotes })
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errBody.error || `Gate authorization signing failed with HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data.success || !data.identity) {
    throw new Error(data.error || 'Server did not return verified gate signature.');
  }

  return data.identity;
}

/**
 * Checks whether staff credentials have been provisioned on the server.
 */
export async function fetchSetupStatus(): Promise<{ storeAvailable: boolean; provisionedUsers: string[] }> {
  try {
    const res = await fetch('/api/auth/setup-status');
    const data = await res.json();
    return {
      storeAvailable: !!data.storeAvailable,
      provisionedUsers: Array.isArray(data.provisionedUsers) ? data.provisionedUsers : []
    };
  } catch {
    return { storeAvailable: false, provisionedUsers: [] };
  }
}

/**
 * Provisions an initial staff credential directly from the browser UI (first-time setup).
 */
export async function provisionInitialCredential(userId: string, passphrase: string): Promise<ApproverIdentity> {
  const res = await fetch('/api/auth/provision-initial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, passphrase })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.token) {
    throw new Error(data.error || `Credential provisioning failed (HTTP ${res.status})`);
  }
  const identity: ApproverIdentity = {
    userId: data.user.userId,
    userName: data.user.userName,
    role: data.user.role,
    authenticatedAt: new Date().toISOString()
  };
  setSession(data.token, identity);
  return identity;
}

/**
 * Fetches the current EGS governance status, ECR records, Ed25519 key status, and approval records.
 */
export async function fetchGovernanceStatus(): Promise<any> {
  const res = await fetch('/api/governance/status');
  if (!res.ok) {
    throw new Error(`Failed to load governance status (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * 1-Click Web Ed25519 Keypair Generator for the Engineering Director.
 */
export async function generateDirectorKeypairWeb(passphrase: string, overwrite = false): Promise<any> {
  const res = await authenticatedFetch('/api/governance/keygen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase, overwrite })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Key generation failed (HTTP ${res.status})`);
  }
  return data;
}

/**
 * 1-Click Web ECR Ed25519 Sign-Off for the Engineering Director.
 */
export async function signEcrWeb(
  changeId: string,
  decision: 'APPROVED' | 'REJECTED',
  passphrase: string
): Promise<any> {
  const res = await authenticatedFetch('/api/governance/sign-ecr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changeId, decision, passphrase })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `ECR signing failed (HTTP ${res.status})`);
  }
  return data;
}
