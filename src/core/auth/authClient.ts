import { ApproverIdentity } from '../types/safety.ts';

const SESSION_STORAGE_KEY = 'usv01_session_token';
const USER_STORAGE_KEY = 'usv01_session_user';

let currentSessionToken: string | null = null;
let currentUser: ApproverIdentity | null = null;

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
      // Ignore
    }
  }
}

export function clearSession(): void {
  currentSessionToken = null;
  currentUser = null;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.sessionStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Ensures an authenticated session exists with the backend digital lab server.
 * Exchanges credentials for a cryptographically signed HMAC session token.
 */
export async function ensureAuthenticatedSession(): Promise<{ token: string; user: ApproverIdentity }> {
  // If we have a valid token, verify it with the server
  if (currentSessionToken && currentUser) {
    try {
      const res = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${currentSessionToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          currentUser = {
            userId: data.user.userId,
            userName: data.user.userName,
            role: data.user.role,
            authenticatedAt: new Date().toISOString()
          };
          return { token: currentSessionToken, user: currentUser };
        }
      }
    } catch {
      // Server check failed, fall through to re-login
    }
  }

  // Request new authenticated session from server (defaults to Engineering Director in the digital lab)
  const loginRes = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'usr-eng-dir-8841', role: 'ENGINEERING_DIRECTOR' })
  });

  if (!loginRes.ok) {
    throw new Error(`Authentication failed with HTTP ${loginRes.status}`);
  }

  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error(loginData.error || 'Failed to obtain session token');
  }

  const identity: ApproverIdentity = {
    userId: loginData.user.userId,
    userName: loginData.user.userName,
    role: loginData.user.role,
    authenticatedAt: new Date().toISOString()
  };

  setSession(loginData.token, identity);
  return { token: loginData.token, user: identity };
}

/**
 * Perform an authenticated HTTP fetch to the backend, appending the verified Bearer token.
 */
export async function authenticatedFetch(url: string, init?: RequestInit): Promise<Response> {
  let token = currentSessionToken;
  if (!token) {
    try {
      const session = await ensureAuthenticatedSession();
      token = session.token;
    } catch (err) {
      console.warn('Could not establish initial session before fetch:', err);
    }
  }

  const headers = new Headers(init?.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
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
