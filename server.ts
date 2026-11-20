import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateBoundApproverSignature, verifyBoundApproverSignature, setDirectorSigningKey } from './src/core/safety/ApproverSigner.ts';
import { AUTHORIZED_MEMBERS, type StaffMember } from './src/core/auth/staffDirectory.ts';
import { authorizeLabRoute } from './src/core/auth/routeAuthorization.ts';
import { guardEngineeringDraftWrite, EngineeringWritePolicyError } from './src/core/auth/engineeringDraftPolicy.ts';
import {
  verifyStaffCredential,
  isLockedOut,
  recordFailure,
  recordSuccess,
  loadCredentialStore,
  hashCredential,
  saveCredential,
  resolveCredentialStorePath
} from './src/core/auth/credentialStore.ts';
import {
  APPROVALS_DIR,
  APPROVAL_SCHEMA,
  computeBaselineDigest,
  publicKeyFingerprint,
  signApproval,
  verifyApproval,
  loadApprovalRecords,
  resolveDirectorPublicKey
} from './scripts/governance/ecr-approval.ts';
import { DEFAULT_PRIVATE_KEY_PATH } from './scripts/governance/director-keygen.ts';
import { validateECRFile } from './scripts/governance/ecr-tool.ts';
import { ResilientAgentQueue } from './src/core/mission-control/ResilientAgentQueue.ts';
import { GlobalUsvIntelligenceAgent } from './src/core/agents/GlobalUsvIntelligenceAgent.ts';
import { GlobalIntelligenceLearningBridge } from './src/core/intelligence/GlobalIntelligenceLearningBridge.ts';
import { loadA26ResearchFeed } from './src/server/a26ResearchFeed.ts';
import http from 'http';
import { VerifyUsv01Engine } from './src/core/verification/VerifyUsv01Engine.ts';
import { getLabReadinessSnapshot } from './src/core/verification/LabReadiness.ts';
import { loadProjectStore, saveProjectStore, commitProjectStoreMutation } from './src/core/storage/ProjectStorePersistence.ts';
import { AgentRegistry } from './src/core/registry/AgentRegistry.ts';
import { BaseAgent } from './src/core/engine/BaseAgent.ts';
import { CentralOrchestrator } from './src/core/orchestrator/CentralOrchestrator.ts';
import { ApprovalGateManager } from './src/core/safety/HumanApprovalGate.ts';
import type { EngineeringTask } from './src/core/types/orchestrator.ts';
import { AuditLogger } from './src/core/safety/AuditLogger.ts';
import {
  generateCodexAssistantText,
  isCodexAssistantEnabled,
  isLoopbackPeer
} from './src/server/codexAssistantService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '25mb' }));

// Read baseline context file
let projectContext = '';
try {
  projectContext = fs.readFileSync(path.join(__dirname, 'USV01_PROJECT_CONTEXT.md'), 'utf-8');
} catch {
  projectContext = 'USV-01 Digital Engineering Baseline Context.';
}

// File-backed persistent database store path
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'project_store.json');

// Persistent database store (loaded from disk or initial dataset on start)
let dbStore: Record<string, any[]> = {
  requirements: [],
  design_decisions: [],
  engineering_risks: [],
  simulation_jobs: [],
  verification_plans: [],
  test_records: [],
  components: [],
  activity_log: [],
  knowledge_notes: [],
  power_loads: [],
  interfaces: [],
  materials: [],
  load_cases: [],
  resistance_estimates: [],
  weight_cg: [],
  cad_revisions: []
};

const APPROVED_DATA_COLLECTIONS = new Set([
  'requirements', 'design_decisions', 'engineering_risks', 'simulation_jobs',
  'verification_plans', 'test_records', 'components', 'activity_log',
  'knowledge_notes', 'power_loads', 'interfaces', 'materials', 'load_cases',
  'resistance_estimates', 'weight_cg', 'cad_revisions'
]);

const validateDataCollection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!APPROVED_DATA_COLLECTIONS.has(req.params.collection)) {
    return res.status(400).json({ success: false, error: 'Unknown engineering data collection.' });
  }
  if (req.params.collection === 'cad_revisions' && req.method !== 'GET') {
    return res.status(403).json({ success: false, error: 'CAD source registration requires the bounded governed session endpoint.' });
  }
  if (req.params.collection === 'activity_log' && req.method !== 'GET') {
    return res.status(403).json({ success: false, error: 'Audit history cannot be edited through the general CRUD API.' });
  }
  next();
};

const saveStoreToFile = () => {
  // Never acknowledge a persisted change if atomic writing failed.
  saveProjectStore(dbStore, STORE_PATH);
};

/** Only publish speculative engineering CRUD state after disk persistence succeeds. */
const commitEngineeringStoreMutation = (mutate: (nextStore: Record<string, any[]>) => void) => {
  const committed = commitProjectStoreMutation(dbStore, STORE_PATH, mutate);
  dbStore = committed.store;
};

const loadStoreFromFile = (): boolean => {
  // An existing corrupt store is a critical blocker, NOT a reason to silently
  // seed demonstration data and overwrite an engineering baseline.
  const stored = loadProjectStore(STORE_PATH);
  if (!stored) return false;
  dbStore = stored;
  console.log('Loaded validated persisted USV-01 project store');
  return true;
};

// Helper to seed store if empty
const seedStoreIfEmpty = async () => {
  if (loadStoreFromFile()) {
    return;
  }
  if (!dbStore.requirements || dbStore.requirements.length === 0) {
    try {
      const initial = await import('./src/data/initialProjectData.ts');
      dbStore.requirements = [...initial.INITIAL_REQUIREMENTS];
      dbStore.design_decisions = [...initial.INITIAL_DECISIONS];
      dbStore.engineering_risks = [...initial.INITIAL_RISKS];
      dbStore.simulation_jobs = [...initial.INITIAL_SIMULATIONS];
      dbStore.verification_plans = [...initial.INITIAL_VERIFICATION_PLANS];
      dbStore.test_records = [...initial.INITIAL_TEST_RECORDS];
      dbStore.components = [...initial.INITIAL_COMPONENTS_BOM];
      dbStore.activity_log = [...initial.INITIAL_ACTIVITY_LOG];
      dbStore.knowledge_notes = [...initial.INITIAL_KNOWLEDGE_NOTES];
      dbStore.power_loads = [...initial.INITIAL_POWER_LOADS];
      dbStore.interfaces = [...initial.INITIAL_INTERFACES];
      dbStore.materials = [...initial.INITIAL_MATERIALS];
      dbStore.load_cases = [...initial.INITIAL_LOAD_CASES];
      dbStore.resistance_estimates = [...initial.INITIAL_RESISTANCE];
      dbStore.weight_cg = [...initial.INITIAL_WEIGHT_CG];
      dbStore.cad_revisions = [];
      saveStoreToFile();
    } catch (err) {
      console.warn('Could not auto-seed dbStore:', err);
    }
  }
};
seedStoreIfEmpty();

// --- CRYPTOGRAPHIC AUTHENTICATION & SESSION MANAGEMENT ---
// Dynamic cryptographic session secret (uses env var if provided, or generated random bytes)
const SESSION_SECRET = process.env.LAB_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
setDirectorSigningKey(SESSION_SECRET);

export interface AuthenticatedUser {
  userId: string;
  userName: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
}

export { AUTHORIZED_MEMBERS };
export type { StaffMember };

export function createSessionToken(user: { userId: string; userName: string; role: string }, expiresInMs = 24 * 60 * 60 * 1000): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + expiresInMs;
  const payload: AuthenticatedUser = {
    ...user,
    issuedAt,
    expiresAt
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('hex');
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string): AuthenticatedUser | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, providedSig] = parts;

  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('hex');
  try {
    const bufProvided = Buffer.from(providedSig, 'hex');
    const bufExpected = Buffer.from(expectedSig, 'hex');
    if (bufProvided.length !== bufExpected.length || !crypto.timingSafeEqual(bufProvided, bufExpected)) {
      return null;
    }

    const payload: AuthenticatedUser = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    // An HMAC authenticates the bytes of a session, not the continuing authority
    // of the role embedded in it. Reconcile against the server-owned staff allowlist.
    const canonical = payload && typeof payload.userId === 'string'
      ? AUTHORIZED_MEMBERS[payload.userId] : undefined;
    if (!canonical ||
        typeof payload.issuedAt !== 'number' || !Number.isFinite(payload.issuedAt) ||
        typeof payload.expiresAt !== 'number' || !Number.isFinite(payload.expiresAt) ||
        payload.issuedAt > Date.now() + 60_000 ||
        payload.expiresAt <= Date.now() ||
        payload.expiresAt <= payload.issuedAt ||
        payload.expiresAt - payload.issuedAt > 24 * 60 * 60 * 1000 ||
        payload.role !== canonical.role ||
        payload.userName !== canonical.userName) {
      return null;
    }
    return { ...payload, role: canonical.role, userName: canonical.userName };
  } catch {
    return null;
  }
}

// --- AUTHENTICATION MIDDLEWARE ---
export const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Access to USV-01 digital lab requires a cryptographically verified Bearer session token.'
    });
  }

  const user = verifySessionToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Session token is invalid, expired, or failed cryptographic verification.'
    });
  }

  (req as any).user = user;
  next();
};

// Default-deny all API routes. Only login, setup status, and token-gated bootstrap
// may be called without an existing session. Never expose project data or execution
// endpoints merely because a route was omitted from a manual protection list.
app.use('/api', (req, res, next) => {
  const publiclyAccessible =
    (req.method === 'POST' && req.path === '/auth/login') ||
    (req.method === 'GET' && req.path === '/auth/setup-status') ||
    (req.method === 'POST' && req.path === '/auth/provision-initial');
  if (publiclyAccessible) return next();
  return authMiddleware(req, res, () => {
    const user = (req as any).user as AuthenticatedUser;
    if (!authorizeLabRoute(req.method, req.path, user.role)) {
      AuditLogger.getInstance().log({
        severity: 'SAFETY_CRITICAL',
        action: 'UNAUTHORIZED_ROLE_OPERATION',
        details: { userId: user.userId, role: user.role, method: req.method, route: req.path }
      });
      return res.status(403).json({ success: false, error: 'Forbidden: insufficient role authority for this operation.' });
    }
    next();
  });
});

export function authenticateLoginRequest(body: { userId?: string; role?: string; passphrase?: string }): {
  statusCode: number;
  body: { success: boolean; user?: StaffMember; token?: string; error?: string };
} {
  const { userId, role, passphrase } = body || {};

  if (!userId || typeof userId !== 'string') {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: "Authentication failed: Missing required 'userId'."
      }
    };
  }

  // Reject any identity not in the authoritative allowlist
  const authorizedMember = AUTHORIZED_MEMBERS[userId];
  if (!authorizedMember) {
    return {
      statusCode: 403,
      body: {
        success: false,
        error: `Access Denied: Identity '${userId}' is not recognized in the authoritative staff member allowlist.`
      }
    };
  }

  // Reject unauthorized role spoofing: client cannot claim a different role than the authoritative assignment
  if (role && role !== authorizedMember.role) {
    return {
      statusCode: 403,
      body: {
        success: false,
        error: `Access Denied: User '${userId}' is strictly authorized only for role '${authorizedMember.role}'. Unauthorized role claim '${role}' rejected.`
      }
    };
  }

  // Mandatory credential verification for every identity, including the Engineering Director
  if (!passphrase || typeof passphrase !== 'string') {
    return {
      statusCode: 401,
      body: {
        success: false,
        error: `Authentication failed: Passphrase is required for staff member '${userId}'. Anonymous identity assertion is prohibited.`
      }
    };
  }

  if (isLockedOut(userId)) {
    return {
      statusCode: 429,
      body: { success: false, error: `Authentication temporarily locked for '${userId}' after repeated failures. Try again later.` }
    };
  }

  const check = verifyStaffCredential(userId, passphrase);
  if (check === 'STORE_UNAVAILABLE' || check === 'NOT_PROVISIONED') {
    return {
      statusCode: 503,
      body: {
        success: false,
        error: check === 'STORE_UNAVAILABLE'
          ? 'Authentication service unavailable: staff credential store is not provisioned (STAFF_CREDENTIAL_STORE). Logins are disabled.'
          : `Authentication unavailable: no credential has been provisioned for '${userId}'. Logins for this identity are disabled.`
      }
    };
  }
  if (check !== 'VALID') {
    recordFailure(userId);
    return {
      statusCode: 401,
      body: {
        success: false,
        error: `Authentication failed: Invalid credentials for staff member '${userId}'. Access denied.`
      }
    };
  }
  recordSuccess(userId);

  const token = createSessionToken(authorizedMember);
  return {
    statusCode: 200,
    body: {
      success: true,
      token,
      user: authorizedMember
    }
  };
}

// --- AUTHENTICATION & GOVERNANCE SIGNING ENDPOINTS ---
app.post('/api/auth/login', (req, res) => {
  const result = authenticateLoginRequest(req.body || {});
  res.status(result.statusCode).json(result.body);
});

// One-click Project Lead merge request: authenticated Director session triggers a
// GitHub Actions workflow. This endpoint does NOT approve GitHub reviews, sign
// engineering evidence or merge a PR directly; GitHub gates remain authoritative.
app.post('/api/project-lead/merge-eligible', async (req, res) => {
  const user = (req as any).user as AuthenticatedUser | undefined;
  if (user?.role !== 'ENGINEERING_DIRECTOR' || user.userId !== 'usr-eng-dir-8841') {
    return res.status(403).json({ success: false, error: 'Engineering Director session required.' });
  }
  const token = process.env.USV01_GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return res.status(503).json({ success: false, error: 'Server is not configured with a GitHub Actions dispatch credential.' });
  }
  try {
    const result = await fetch('https://api.github.com/repos/ravisinghrathode/usv-01-digital-lab/actions/workflows/project-lead-bulk-merge.yml/dispatches', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'USV-01-Mission-Control'
      },
      body: JSON.stringify({ ref: 'main' }),
      signal: AbortSignal.timeout(15000)
    });
    if (result.status !== 204) {
      console.error('GitHub workflow dispatch rejected:', result.status);
      return res.status(502).json({ success: false, error: 'GitHub did not accept the merge request. Check workflow availability and dispatch token permissions.' });
    }
    console.info('Project Lead merge workflow dispatched', { userId: user.userId, at: new Date().toISOString() });
    return res.status(202).json({
      success: true,
      status: 'DISPATCHED_NOT_MERGED',
      message: 'Eligibility checks started. Only GitHub-approved, gate-cleared PRs can merge.',
      url: 'https://github.com/ravisinghrathode/usv-01-digital-lab/actions/workflows/project-lead-bulk-merge.yml'
    });
  } catch (error) {
    console.error('Project Lead merge dispatch unavailable:', error instanceof Error ? error.message : 'unknown');
    return res.status(502).json({ success: false, error: 'Unable to contact GitHub.' });
  }
});

app.get('/api/auth/session', (req, res) => {
  const user = (req as any).user;
  res.json({ success: true, user });
});

app.post('/api/auth/sign-gate', authMiddleware, (req, res) => {
  const user = (req as any).user as AuthenticatedUser;
  if (user.role !== 'ENGINEERING_DIRECTOR') {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Only authenticated 'ENGINEERING_DIRECTOR' has signing authority for safety-critical gates."
    });
  }

  const { gateId, decision } = req.body || {};
  if (!gateId || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
    return res.status(400).json({
      success: false,
      error: "Invalid request: Must provide gateId and decision ('APPROVED' | 'REJECTED')."
    });
  }

  const gate = ApprovalGateManager.getInstance().getGate(gateId);
  if (!gate || gate.state !== 'PENDING') {
    return res.status(409).json({ success: false, error: 'Gate is missing or already finalized.' });
  }
  const timestamp = new Date().toISOString();
  const signature = generateBoundApproverSignature(
    gate, decision, user.userId, user.role, timestamp, SESSION_SECRET
  );

  res.json({
    success: true,
    identity: {
      userId: user.userId,
      userName: user.userName,
      role: user.role,
      authenticatedAt: timestamp,
      tokenSignature: signature,
      serverVerifiedSignature: signature
    }
  });
});

app.post('/api/auth/verify-gate', (req, res) => {
  const { gateId, decision, identity } = req.body || {};
  if (!gateId || !decision || !identity) {
    return res.status(400).json({ success: false, valid: false, error: 'Missing required parameters' });
  }
  const gate = ApprovalGateManager.getInstance().getGate(gateId);
  const valid = !!gate && gate.state === 'PENDING' &&
    (decision === 'APPROVED' || decision === 'REJECTED') &&
    verifyBoundApproverSignature(gate, decision, identity, SESSION_SECRET);
  res.json({ success: true, valid });
});

// Check credential store status for browser-based first-time setup
app.get('/api/auth/setup-status', (req, res) => {
  const store = loadCredentialStore();
  const provisionedUsers = store ? Object.keys(store.credentials) : [];
  res.json({
    success: true,
    storeAvailable: !!store && provisionedUsers.length > 0,
    initialized: provisionedUsers.length > 0
  });
});

const INITIAL_PROVISION_SECRET = process.env.INITIAL_PROVISION_SECRET || process.env.ADMIN_SETUP_TOKEN;

// Secure staff credential provisioning:
// Requires administrative authorization (Engineering Director session) or verified setupToken.
// An unauthenticated external request cannot arbitrarily claim or provision privileged accounts.
app.post('/api/auth/provision-initial', (req, res) => {
  try {
    const { userId, passphrase, setupToken } = req.body || {};
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing userId.' });
    }
    const member = AUTHORIZED_MEMBERS[userId];
    if (!member) {
      return res.status(403).json({ success: false, error: `Unknown identity '${userId}'.` });
    }
    if (!passphrase || typeof passphrase !== 'string' || passphrase.length < 12) {
      return res.status(400).json({ success: false, error: 'Passphrase must be at least 12 characters.' });
    }

    const store = loadCredentialStore();
    if (store?.credentials?.[userId]) {
      return res.status(409).json({
        success: false,
        error: `Credential already provisioned for '${userId}'. Sign in with your existing passphrase.`
      });
    }

    // Security Authorization Gate:
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);
    const sessionUser = token ? verifySessionToken(token) : null;
    const isDirectorSession = sessionUser?.role === 'ENGINEERING_DIRECTOR';

    const hasValidSetupToken = typeof INITIAL_PROVISION_SECRET === 'string' && INITIAL_PROVISION_SECRET.length >= 32 && typeof setupToken === 'string' && setupToken.length === INITIAL_PROVISION_SECRET.length && crypto.timingSafeEqual(Buffer.from(setupToken), Buffer.from(INITIAL_PROVISION_SECRET));
    const hasProvisionedUsers = !!store && Object.keys(store.credentials).length > 0;

    // Bootstrap tokens are one-time setup credentials, not standing administrator privileges.
    // Once any staff account exists, only an authenticated Engineering Director may add users.
    if (hasProvisionedUsers && !isDirectorSession) {
      AuditLogger.getInstance().log({
        severity: 'SAFETY_CRITICAL',
        action: 'UNAUTHORIZED_PROVISION_ATTEMPT',
        details: { attemptedUserId: userId, ip: req.ip }
      });
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Once initialized, provisioning requires an authenticated Engineering Director session.'
      });
    }

    // First-time bootstrap requires an explicitly configured setup token.
    if (!hasProvisionedUsers && !isDirectorSession && !hasValidSetupToken) {
      AuditLogger.getInstance().log({
        severity: 'SAFETY_CRITICAL',
        action: 'UNAUTHORIZED_INITIAL_PROVISION_ATTEMPT',
        details: { attemptedUserId: userId, ip: req.ip }
      });
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Initial account provisioning requires an explicitly configured setup secret or an authenticated Engineering Director.'
      });
    }

    const cred = hashCredential(passphrase);
    saveCredential(userId, cred, resolveCredentialStorePath());
    const sessionToken = createSessionToken(member);

    AuditLogger.getInstance().log({
      severity: 'SAFETY_CRITICAL',
      action: 'STAFF_CREDENTIAL_PROVISIONED',
      details: { userId, role: member.role, provisionedBy: sessionUser?.userId || 'INITIAL_SETUP' }
    });

    res.json({
      success: true,
      message: `Passphrase provisioned for ${member.userName} (${member.role}).`,
      token: sessionToken,
      user: member
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SECURE SERVER-SIDE AGENT EXECUTION INTERFACE ---
app.post('/api/agents/execute', async (req, res) => {
  const correlationId = req.body?.correlationId || `corr-srv-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);
    const user = token ? verifySessionToken(token) : null;

    const { agentId, taskId, parameters, context, priorAgentOutputs, userNotes } = req.body || {};

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ success: false, error: "Missing required parameter 'agentId'." });
    }

    const registry = AgentRegistry.getInstance();
    const spec = registry.getAgent(agentId);
    if (!spec) {
      return res.status(404).json({ success: false, error: `Agent '${agentId}' not found in authoritative AgentRegistry.` });
    }

    // Every agent runs exclusively with a verified server session.
    if (!user) {
      AuditLogger.getInstance().log({
        severity: 'SAFETY_CRITICAL',
        agentId,
        action: 'UNAUTHORIZED_AGENT_EXECUTION_ATTEMPT',
        details: { reason: 'Safety-critical agent execution requires verified session token', correlationId }
      });
      return res.status(401).json({
        success: false,
        error: `Unauthorized: Execution of agent '${agentId}' requires an authenticated session.`
      });
    }

    // Input size limit check (prevent buffer overflow / DoS)
    if (JSON.stringify(req.body).length > 2_000_000) {
      return res.status(413).json({ success: false, error: 'Payload too large: Max input size is 2MB.' });
    }

    // Server-controlled execution with timeout and correlation ID
    const agent = new BaseAgent(spec);
    const executionInput = {
      taskId: taskId || `TASK-${Date.now()}`,
      parameters: parameters || {},
      context: { ...(context || {}), isExploratoryStudy: undefined, safetyCritical: undefined, authenticatedUserId: user.userId, authenticatedUserRole: user.role },
      priorAgentOutputs: priorAgentOutputs || {},
      userNotes,
      correlationId
    };

    const output = await Promise.race([
      agent.execute(executionInput),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Agent execution timeout exceeded (30000ms) for '${agentId}'`)), 30000)
      )
    ]);

    res.json({
      success: output.status !== 'FAILED',
      correlationId,
      output
    });
  } catch (err: any) {
    AuditLogger.getInstance().log({
      severity: 'SAFETY_CRITICAL',
      agentId: req.body?.agentId || 'UNKNOWN',
      action: 'SERVER_AGENT_EXECUTION_ERROR',
      details: { error: err.message || String(err), correlationId }
    });
    res.status(500).json({ success: false, correlationId, error: err.message || String(err) });
  }
});

function pinnedSourceSha(): string {
  const sha = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
    cwd: process.cwd(), encoding: 'utf-8', timeout: 4000
  }).trim();
  if (!/^[a-f0-9]{40}$/i.test(sha)) throw new Error('Pinned source revision unavailable');
  return sha;
}

let workflowInProgress = false;

// The dashboard submits task definitions; execution and safety policy remain on the server.
app.post('/api/orchestrator/execute-workflow', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);
    const user = token ? verifySessionToken(token) : null;

    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Workflow execution requires an authenticated session.' });
    }

    if (workflowInProgress) {
      return res.status(409).json({ success: false, error: 'A server workflow is already executing.' });
    }

    const submitted = req.body?.tasks;
    if (!Array.isArray(submitted) || submitted.length < 1 || submitted.length > 25) {
      return res.status(400).json({ success: false, error: 'Provide between 1 and 25 workflow tasks.' });
    }
    const registry = AgentRegistry.getInstance();
    const prepared: EngineeringTask[] = [];
    for (const item of submitted) {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) ||
          typeof item.assignedAgentId !== 'string' || !Array.isArray(item.dependencies) ||
          item.dependencies.length > 25 || item.dependencies.some((d: unknown) => typeof d !== 'string') ||
          !item.input || typeof item.input.parameters !== 'object' || Array.isArray(item.input.parameters)) {
        return res.status(400).json({ success: false, error: 'Invalid workflow task definition.' });
      }
      const spec = registry.getAgent(item.assignedAgentId);
      if (!spec) return res.status(400).json({ success: false, error: 'Unknown workflow agent.' });
      const context = item.input.context && typeof item.input.context === 'object' ? item.input.context : {};
      const { isExploratoryStudy: _flag, safetyCritical: _clientSafety, ...safeContext } = context;
      const { isExploratoryStudy: _parameterFlag, ...safeParameters } = item.input.parameters;
      prepared.push({
        id: item.id,
        title: String(item.title || item.id).slice(0, 150),
        description: String(item.description || '').slice(0, 500),
        assignedAgentId: spec.id,
        discipline: spec.division,
        priority: spec.auditRequirement.logLevel === 'SAFETY_CRITICAL' ? 'CRITICAL' : 'HIGH',
        dependencies: item.dependencies,
        input: {
          taskId: item.id,
          context: { ...safeContext, authenticatedUserId: user.userId },
          parameters: safeParameters
        },
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        safetyCritical: spec.auditRequirement.logLevel === 'SAFETY_CRITICAL' ||
          spec.verificationCriteria.independentReviewRequired
      });
    }

    workflowInProgress = true;
    try {
      const orchestrator = CentralOrchestrator.getInstance();
      // A single workflow owns the in-memory state during execution.
      orchestrator.clearTasks();
      for (const task of prepared) orchestrator.registerTask(task);
      orchestrator.getExecutionPlan(); // Reject missing or cyclic dependencies before execution.
      const result = await orchestrator.executeWorkflow(pinnedSourceSha());
      return res.json({
        success: result.failed === 0,
        results: result,
        tasks: orchestrator.getAllTasks(),
        pendingGates: ApprovalGateManager.getInstance().getPendingGates()
      });
    } finally {
      workflowInProgress = false;
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Approval decisions execute against the server-owned gate and workflow states.
app.post('/api/orchestrator/decide-gate', authMiddleware, (req, res) => {
  const user = (req as any).user as AuthenticatedUser;
  if (user.role !== 'ENGINEERING_DIRECTOR') {
    return res.status(403).json({ success: false, error: 'Engineering Director authority required.' });
  }
  const { gateId, decision, directorNotes } = req.body || {};
  if (typeof gateId !== 'string' || !['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ success: false, error: 'Invalid gate decision.' });
  }
  try {
    const pending = ApprovalGateManager.getInstance().getGate(gateId);
    if (!pending || pending.state !== 'PENDING' || pending.approvalBinding.sourceSha !== pinnedSourceSha()) {
      return res.status(409).json({ success: false, error: 'Gate is stale, unpinned or already decided.' });
    }
    const timestamp = new Date().toISOString();
    const signature = generateBoundApproverSignature(pending, decision, user.userId, user.role, timestamp, SESSION_SECRET);
    const gate = ApprovalGateManager.getInstance().evaluateDecision(gateId, decision, String(directorNotes || ''), {
      userId: user.userId, userName: user.userName, role: user.role,
      authenticatedAt: timestamp, tokenSignature: signature
    });
    const orchestrator = CentralOrchestrator.getInstance();
    // The gate listener normally resolves the task. Avoid a second transition.
    const task = orchestrator.getTask(gate.taskId);
    const result = task?.approvalGateId === gateId && (task.status === 'COMPLETED' || task.status === 'FAILED')
      ? { taskId: task.id, newStatus: task.status }
      : orchestrator.resolveGateDecision(gateId, decision);
    return res.json({ success: true, gate, result, tasks: orchestrator.getAllTasks(),
      pendingGates: ApprovalGateManager.getInstance().getPendingGates() });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || String(err) });
  }
});

// --- 1-CLICK WEB GOVERNANCE & ECR SIGN-OFF ENDPOINTS ---
app.get('/api/governance/status', (req, res) => {
  try {
    const keyPath = process.env.DIRECTOR_PRIVATE_KEY_FILE || DEFAULT_PRIVATE_KEY_PATH;
    const pubPath = keyPath.replace(/\.pem$/, '') + '.pub.pem';
    const hasPrivateKey = fs.existsSync(keyPath);
    let publicKeyPem = resolveDirectorPublicKey();
    if (!publicKeyPem && fs.existsSync(pubPath)) {
      publicKeyPem = fs.readFileSync(pubPath, 'utf-8').trim();
    }

    let headCommit = 'unknown';
    let baselineDigest = 'unknown';
    try {
      headCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).trim();
      baselineDigest = computeBaselineDigest('HEAD');
    } catch {}

    // Load ECR records
    const ecrDir = path.join(__dirname, 'governance', 'ecr');
    const ecrRecords: any[] = [];
    if (fs.existsSync(ecrDir)) {
      const files = fs.readdirSync(ecrDir).filter(f => f.startsWith('ECR-') && f.endsWith('.md'));
      for (const file of files) {
        const validation = validateECRFile(path.join(ecrDir, file));
        ecrRecords.push({
          file,
          valid: validation.valid,
          errors: validation.errors,
          record: validation.record
        });
      }
    }

    // Load approval records and verify against current baseline
    const approvals = loadApprovalRecords(__dirname).map(a => {
      if (!a.record) return { file: a.file, record: null, verified: false, stale: false, error: a.parseError };
      const v = verifyApproval(a.record, { publicKeyPem, expectedDigest: baselineDigest });
      return {
        file: a.file,
        record: a.record,
        verified: v.verified,
        stale: v.stale,
        error: v.error
      };
    });

    // Load Stage A, C, D reports if present
    const reportsDir = path.join(__dirname, 'governance', 'reports');
    const readReport = (name: string) => {
      const p = path.join(reportsDir, name);
      if (fs.existsSync(p)) {
        try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch {}
      }
      return null;
    };

    res.json({
      success: true,
      headCommit,
      baselineDigest,
      directorKey: {
        hasPrivateKey,
        keyPath,
        publicKeyPem: publicKeyPem || null,
        fingerprint: publicKeyPem ? publicKeyFingerprint(publicKeyPem) : null
      },
      ecrRecords,
      approvals,
      reports: {
        stageA: readReport('pr-classification.json'),
        stageC: readReport('stage-c-review.json'),
        stageD: readReport('stage-d-approval.json')
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1-Click Web Ed25519 Keypair Generator for Engineering Director
app.post('/api/governance/keygen', (req, res) => {
  try {
    const user = (req as any).user as AuthenticatedUser;
    if (user.role !== 'ENGINEERING_DIRECTOR') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the Engineering Director may generate the Ed25519 signing keypair.'
      });
    }

    const { passphrase, overwrite } = req.body || {};
    if (!passphrase || typeof passphrase !== 'string' || passphrase.length < 16) {
      return res.status(400).json({
        success: false,
        error: 'Director signing passphrase must be at least 16 characters.'
      });
    }

    const keyPath = process.env.DIRECTOR_PRIVATE_KEY_FILE || DEFAULT_PRIVATE_KEY_PATH;
    if (fs.existsSync(keyPath) && !overwrite) {
      const pubPath = keyPath.replace(/\.pem$/, '') + '.pub.pem';
      const pubPem = fs.existsSync(pubPath) ? fs.readFileSync(pubPath, 'utf-8').trim() : '';
      return res.json({
        success: true,
        alreadyExists: true,
        message: 'Director Ed25519 keypair already exists on this workstation.',
        publicKeyPem: pubPem,
        fingerprint: pubPem ? publicKeyFingerprint(pubPem) : null
      });
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase }
    });

    fs.mkdirSync(path.dirname(keyPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(keyPath, privateKey, { mode: 0o600 });
    const pubPath = keyPath.replace(/\.pem$/, '') + '.pub.pem';
    fs.writeFileSync(pubPath, publicKey, { mode: 0o644 });

    // Also set in current runtime environment so local verification immediately works
    process.env.DIRECTOR_PUBLIC_KEY = publicKey.trim();

    res.json({
      success: true,
      message: 'Director Ed25519 keypair generated and encrypted successfully.',
      keyPath,
      publicKeyPem: publicKey.trim(),
      fingerprint: publicKeyFingerprint(publicKey)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1-Click Web ECR Ed25519 Sign-Off for Engineering Director
app.post('/api/governance/sign-ecr', (req, res) => {
  try {
    const user = (req as any).user as AuthenticatedUser;
    if (user.role !== 'ENGINEERING_DIRECTOR') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the Engineering Director may sign Engineering Change Requests.'
      });
    }

    const { changeId, decision = 'APPROVED', passphrase } = req.body || {};
    if (!changeId || !/^ECR-\d{8}-\d{3}$/.test(changeId)) {
      return res.status(400).json({ success: false, error: 'Valid Change ID (e.g. ECR-20261111-001) is required.' });
    }
    const decisionNorm = String(decision).toUpperCase();
    if (decisionNorm !== 'APPROVED' && decisionNorm !== 'REJECTED') {
      return res.status(400).json({ success: false, error: 'Decision must be APPROVED or REJECTED.' });
    }
    if (!passphrase || typeof passphrase !== 'string') {
      return res.status(400).json({ success: false, error: 'Director key passphrase is required to unlock signing key.' });
    }

    const keyPath = process.env.DIRECTOR_PRIVATE_KEY_FILE || DEFAULT_PRIVATE_KEY_PATH;
    if (!fs.existsSync(keyPath)) {
      return res.status(400).json({
        success: false,
        error: 'Director Ed25519 private key not found. Click "1-Click Setup Signing Key" first.'
      });
    }

    let privateKey: crypto.KeyObject;
    try {
      privateKey = crypto.createPrivateKey({
        key: fs.readFileSync(keyPath, 'utf-8'),
        format: 'pem',
        passphrase
      });
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Unable to decrypt Director private key: incorrect passphrase.'
      });
    }

    const publicKeyPem = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString();
    process.env.DIRECTOR_PUBLIC_KEY = publicKeyPem.trim();

    const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).trim();
    const digest = computeBaselineDigest('HEAD');

    const record = signApproval(
      {
        schema: APPROVAL_SCHEMA,
        changeId,
        decision: decisionNorm as 'APPROVED' | 'REJECTED',
        authorityId: 'usr-eng-dir-8841',
        authorityName: 'Ravi Singh Rathode',
        authorityRole: 'ENGINEERING_DIRECTOR',
        baselineDigest: digest,
        headCommitAtSigning: head,
        signedAt: new Date().toISOString(),
        publicKeyFingerprint: publicKeyFingerprint(publicKeyPem)
      },
      privateKey
    );

    const self = verifyApproval(record, { publicKeyPem, expectedDigest: digest });
    if (decisionNorm === 'APPROVED' && !self.verified) {
      return res.status(500).json({ success: false, error: `Self-verification failed: ${self.error}` });
    }

    const outDir = path.join(__dirname, APPROVALS_DIR);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${changeId}.approval.json`);
    fs.writeFileSync(outFile, JSON.stringify(record, null, 2) + '\n', 'utf-8');

    dbStore.activity_log.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      userId: user.userId,
      userName: 'Ravi Singh Rathode',
      action: 'APPROVE',
      recordType: 'ECR',
      recordId: changeId,
      details: `Director Ed25519 cryptographic sign-off (${decisionNorm}) over baseline digest ${digest.substring(0, 22)}...`
    });
    saveStoreToFile();

    res.json({
      success: true,
      message: `ECR ${changeId} cryptographically signed (${decisionNorm}) with Ed25519.`,
      record,
      filePath: `${APPROVALS_DIR}/${changeId}.approval.json`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});



// --- VERIFY USV-01 SINGLE-PRESS VERIFICATION ROUTES ---

// 1. Run genuine verification
app.post('/api/verify/execute', async (req, res) => {
  try {
    const engine = VerifyUsv01Engine.getInstance(process.cwd());
    const report = await engine.executeVerification();
    
    // Save report to governance/reports
    const outDir = path.join(process.cwd(), 'governance', 'reports');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'verify-usv01-report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(outDir, 'verify-usv01-report.md'), report.reportMarkdown);

    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Authenticated submission to the SAME HOST's durable research queue. This
// endpoint does not start models, change source, bypass quota or approve output.
app.post('/api/mission-control/quota-enqueue', async (req, res) => {
  try {
    const { taskId, agentId, objective, priority = 5, lane = 'MODEL_AGENT' } = req.body || {};
    if (typeof taskId !== 'string' || typeof agentId !== 'string' ||
      typeof objective !== 'string' || !objective.trim() ||
      objective.length > 4000 || !Number.isSafeInteger(priority) ||
      !['MODEL_AGENT', 'OFFLINE_SCHEMA_CHECK'].includes(lane)) {
      return res.status(400).json({ success: false, error: 'Invalid bounded public research request.' });
    }
    const commitSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    const row = await new ResilientAgentQueue().enqueue({
      taskId, agentId, lane, priority, commitSha,
      input: {
        taskId, parameters: {},
        context: {
          objective, dataClassification: 'PUBLIC_SOURCE_SAFE_ONLY',
          researchOnly: true, engineeringReleaseApproved: false,
          baselineWritesPermitted: false
        }
      }
    });
    AuditLogger.getInstance().log({
      severity: 'INFO', agentId: row.agentId, taskId: row.taskId,
      action: 'BOUNDED_PUBLIC_RESEARCH_QUEUED',
      details: { commitSha: row.commitSha, state: row.state, lane: row.lane }
    });
    res.status(202).json({
      success: true, taskId: row.taskId, state: row.state,
      pinnedCommit: row.commitSha, engineeringReleaseApproved: false
    });
  } catch (error: any) {
    res.status(409).json({ success: false,
      error: (error instanceof Error ? error.message : 'Queue submission rejected').slice(0, 300) });
  }
});

// Authenticated, read-only quota and queue telemetry. The snapshot exposes no
// prompts, access tokens or engineering release authority.
app.get('/api/mission-control/quota-status', async (_req, res) => {
  try {
    const status = await new ResilientAgentQueue().status();
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: 'Quota/queue state unavailable; automatic model dispatch must remain on hold.'
    });
  }
});

// 2. Get latest verification report
// Evidence-limited live snapshot. This never claims external integrations are healthy
// without authenticated service-specific verification.
app.get('/api/verify/readiness', (_req, res) => {
  res.json({ success: true, report: getLabReadinessSnapshot() });
});

app.get('/api/verify/latest', async (req, res) => {
  try {
    const reportPath = path.join(process.cwd(), 'governance', 'reports', 'verify-usv01-report.json');
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      return res.json({ success: true, report });
    }
    const engine = VerifyUsv01Engine.getInstance(process.cwd());
    const report = await engine.executeVerification();
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Download verification report in JSON or Markdown format
app.get('/api/verify/download/:format', (req, res) => {
  try {
    const format = req.params.format === 'md' ? 'md' : 'json';
    const filename = `verify-usv01-report.${format}`;
    const reportPath = path.join(process.cwd(), 'governance', 'reports', filename);
    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({ success: false, error: 'Verification report not yet generated. Run verification first.' });
    }
    const timestamp = new Date().toISOString().split('T')[0];
    const downloadName = `USV01_Verification_Report_${timestamp}.${format}`;
    res.download(reportPath, downloadName);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- API ROUTES ---

// 1. Get raw context
app.get('/api/context', (req, res) => {
  res.json({ context: projectContext });
});

// 2. Snapshot of all collections
app.get('/api/data/snapshot', async (req, res) => {
  await seedStoreIfEmpty();
  res.json({ success: true, data: dbStore });
});

// 3. Reset demo data
app.post('/api/data/reset-demo', async (req, res) => {
  try {
    const initial = await import('./src/data/initialProjectData.ts');
    dbStore.requirements = [...initial.INITIAL_REQUIREMENTS];
    dbStore.design_decisions = [...initial.INITIAL_DECISIONS];
    dbStore.engineering_risks = [...initial.INITIAL_RISKS];
    dbStore.simulation_jobs = [...initial.INITIAL_SIMULATIONS];
    dbStore.verification_plans = [...initial.INITIAL_VERIFICATION_PLANS];
    dbStore.test_records = [...initial.INITIAL_TEST_RECORDS];
    dbStore.components = [...initial.INITIAL_COMPONENTS_BOM];
    dbStore.activity_log = [
      {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userId: (req as any).user.userId,
        userName: (req as any).user.userName,
        action: 'UPDATE',
        recordType: 'DATABASE',
        recordId: 'RESET',
        details: 'Project database reset to certified illustrative baseline.'
      },
      ...initial.INITIAL_ACTIVITY_LOG
    ];
    // Reset only illustrative notes; protect authenticated session research drafts.
    const sessionDrafts = (dbStore.knowledge_notes||[]).filter(
      (note:any)=>typeof note?.id==='string' && note.id.startsWith('SES-NOTE-')
    );
    dbStore.knowledge_notes = [...sessionDrafts, ...initial.INITIAL_KNOWLEDGE_NOTES];
    dbStore.power_loads = [...initial.INITIAL_POWER_LOADS];
    dbStore.interfaces = [...initial.INITIAL_INTERFACES];
    dbStore.materials = [...initial.INITIAL_MATERIALS];
    dbStore.load_cases = [...initial.INITIAL_LOAD_CASES];
    dbStore.resistance_estimates = [...initial.INITIAL_RESISTANCE];
    dbStore.weight_cg = [...initial.INITIAL_WEIGHT_CG];
    // CAD source pointers are real project records and never reset as demo data.
    saveStoreToFile();

    res.json({ success: true, message: 'Database reset to default illustrative baseline.', data: dbStore });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Engineering Sessions writes are bounded unapproved drafts. No UI-provided
// role, author, state, approval, data collection, or record ID is trusted.
function persistSessionDraft(collection: 'cad_revisions'|'knowledge_notes', item:Record<string,unknown>, user:AuthenticatedUser) {
  const previousRows=dbStore[collection];
  const previousLog=dbStore.activity_log;
  dbStore[collection]=[item,...(previousRows||[])];
  dbStore.activity_log=[{
    id:'LOG-'+crypto.randomUUID(),
    timestamp:new Date().toISOString(),
    userId:user.userId,userName:user.userName,action:'CREATE',
    recordType:collection.toUpperCase(),recordId:String(item.id),
    details:'Registered unverified Engineering Sessions draft'
  },...(previousLog||[])];
  try { saveStoreToFile(); }
  catch(error) {
    dbStore[collection]=previousRows;
    dbStore.activity_log=previousLog;
    throw error;
  }
}

// Only a source reference and digest are registered. CAD bytes are not hosted
// or transformed here; this is not a proof of geometry validity.
app.post('/api/session/cad-revisions', (req,res)=>{
  const {title,revision,fileLabel,sourceUrl,sourceSha256,notes}=req.body||{};
  if(typeof title!=='string'||!title.trim()||title.length>140||
     typeof revision!=='string'||!revision.trim()||revision.length>60||
     typeof fileLabel!=='string'||!fileLabel.trim()||fileLabel.length>180||
     typeof sourceUrl!=='string'||sourceUrl.length>1200||
     typeof sourceSha256!=='string'||!/^[a-fA-F0-9]{64}$/.test(sourceSha256)||
     (notes!==undefined&&(typeof notes!=='string'||notes.length>1200))) {
    return res.status(400).json({success:false,error:'A title, revision, file name, HTTPS source URL and exact SHA-256 digest are required.'});
  }
  let parsed:URL;
  try{parsed=new URL(sourceUrl)}catch{return res.status(400).json({success:false,error:'Invalid CAD source URL'});}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password)
    return res.status(400).json({success:false,error:'CAD reference must be an HTTPS URL without embedded credentials.'});
  const user=(req as any).user as AuthenticatedUser;
  const now=new Date().toISOString();
  const item={
    id:'CAD-'+crypto.randomUUID(),projectId:'PRJ-USV-01',
    title:title.trim(),revision:revision.trim(),fileLabel:fileLabel.trim(),
    sourceUrl:parsed.href,sourceSha256:sourceSha256.toLowerCase(),
    notes:typeof notes==='string'?notes.trim():'',
    recordStatus:'SOURCE_REGISTERED_UNVERIFIED',createdBy:user.userId,
    createdAt:now,updatedAt:now,isIllustrative:false
  };
  try{persistSessionDraft('cad_revisions',item,user);return res.status(201).json({success:true,item});}
  catch{return res.status(500).json({success:false,error:'CAD source pointer could not be persisted.'});}
});

// Store project notes, not ephemeral React text; preserve human authority.
// The server assigns identity and fixed unverified state, never approval.
app.post('/api/session/notes', (req,res)=>{
  const {title,content}=req.body||{};
  if(typeof title!=='string'||!title.trim()||title.length>140||
     typeof content!=='string'||!content.trim()||content.length>5000)
    return res.status(400).json({success:false,error:'Draft title (max 140) and content (max 5000) are required.'});
  const user=(req as any).user as AuthenticatedUser;
  const now=new Date().toISOString();
  const item={
    id:'SES-NOTE-'+crypto.randomUUID(),title:title.trim(),
    category:'Research Note',subsystems:[],
    contentMarkdown:content.trim(),lastUpdated:now,createdDate:now,
    author:user.userName,lastRevision:'DRAFT-01',
    verificationStatus:'DRAFT_UNVERIFIED'
  };
  try{persistSessionDraft('knowledge_notes',item,user);return res.status(201).json({success:true,item});}
  catch{return res.status(500).json({success:false,error:'Research draft could not be persisted.'});}
});

// 4. Collection CRUD
app.get('/api/data/:collection', validateDataCollection, (req, res) => {
  const coll = req.params.collection;
  const items = dbStore[coll] || [];
  res.json({ success: true, collection: coll, count: items.length, data: items });
});

app.post('/api/data/:collection', validateDataCollection, (req, res) => {
  const coll = req.params.collection;
  let draft: Record<string, unknown>;
  try { draft = guardEngineeringDraftWrite(coll, req.body); }
  catch (err) {
    return res.status(err instanceof EngineeringWritePolicyError ? 409 : 400).json({
      success: false, error: err instanceof Error ? err.message : 'Invalid engineering draft.'
    });
  }
  const now = new Date().toISOString();
  const newItem = {
    ...draft,
    id: coll.substring(0, 3).toUpperCase() + '-' + crypto.randomUUID(),
    projectId: 'PRJ-USV-01',
    createdBy: (req as any).user.userId,
    createdAt: now,
    updatedAt: now
  };

  try {
    commitEngineeringStoreMutation(nextStore => {
      nextStore[coll].unshift(newItem);
      nextStore.activity_log.unshift({
        id: 'LOG-' + crypto.randomUUID(),
        timestamp: now,
        userId: (req as any).user.userId,
        userName: (req as any).user.userName,
        action: 'CREATE',
        recordType: coll.toUpperCase(),
        recordId: newItem.id,
        details: `Created new ${coll} record: ${String(draft.title ?? draft.name ?? draft.partNumber ?? newItem.id)}`
      });
    });
  } catch {
    return res.status(503).json({ success: false, error: 'Engineering record was not committed; persistent storage unavailable.' });
  }
  return res.json({ success: true, item: newItem });
});

app.put('/api/data/:collection/:id', validateDataCollection, (req, res) => {
  const coll = req.params.collection;
  const id = req.params.id;
  const items = dbStore[coll] || [];
  const idx = items.findIndex((i: any) => i.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }

  let draftChanges: Record<string, unknown>;
  try { draftChanges = guardEngineeringDraftWrite(coll, req.body, items[idx]); }
  catch (err) {
    return res.status(err instanceof EngineeringWritePolicyError ? 409 : 400).json({
      success: false, error: err instanceof Error ? err.message : 'Invalid engineering draft.'
    });
  }
  const updatedItem = { ...items[idx], ...draftChanges, updatedAt: new Date().toISOString() };
  try {
    commitEngineeringStoreMutation(nextStore => {
      nextStore[coll][idx] = updatedItem;
      nextStore.activity_log.unshift({
        id: 'LOG-' + crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: (req as any).user.userId,
        userName: (req as any).user.userName,
        action: req.body.status === 'Archived' ? 'ARCHIVE' : 'UPDATE',
        recordType: coll.toUpperCase(),
        recordId: id,
        details: `Updated ${coll} record ${id}: status=${updatedItem.status || 'nominal'}`
      });
    });
  } catch {
    return res.status(503).json({ success: false, error: 'Engineering record was not committed; persistent storage unavailable.' });
  }
  return res.json({ success: true, item: updatedItem });
});

app.delete('/api/data/:collection/:id', validateDataCollection, (req, res) => {
  const coll = req.params.collection;
  const id = req.params.id;
  const items = dbStore[coll] || [];
  const idx = items.findIndex((i: any) => i.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }
  try { guardEngineeringDraftWrite(coll, {}, items[idx]); }
  catch {
    return res.status(409).json({ success: false, error: 'Controlled engineering records require governed supersession.' });
  }

  const removed = items[idx];
  try {
    commitEngineeringStoreMutation(nextStore => {
      nextStore[coll].splice(idx, 1);
      nextStore.activity_log.unshift({
        id: 'LOG-' + crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: (req as any).user.userId,
        userName: (req as any).user.userName,
        action: 'ARCHIVE',
        recordType: coll.toUpperCase(),
        recordId: id,
        details: `Archived ${coll} record ${id}`
      });
    });
  } catch {
    return res.status(503).json({ success: false, error: 'Engineering record was not committed; persistent storage unavailable.' });
  }
  return res.json({ success: true, removed });
});

// 5. Export and Import
app.get('/api/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=USV01_Engineering_Backup_${new Date().toISOString().split('T')[0]}.json`);
  res.send(JSON.stringify(dbStore, null, 2));
});

// Raw JSON import could fabricate approvals or overwrite controlled baselines.
// Fail closed until an authenticated, signed and revision-bound restore exists.
app.post('/api/import', (_req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Ungoverned JSON imports are disabled; use verified restoration.'
  });
});

// 5b. Global Naval USV Intelligence & Scraper Endpoints
const usvIntelAgent = new GlobalUsvIntelligenceAgent();

// Automated background intelligence update scheduler (Default: Every 24 hours / Daily)
let intelLastUpdated = new Date().toISOString();
const updateIntervalHours = parseInt(process.env.USV_INTEL_AUTO_UPDATE_HOURS || '24', 10);
let nextScheduledUpdate = new Date(Date.now() + updateIntervalHours * 3600 * 1000).toISOString();

const runPeriodicIntelUpdate = async () => {
  try {
    const report = await usvIntelAgent.scrapeAndEnrich();
    intelLastUpdated = new Date().toISOString();
    nextScheduledUpdate = new Date(Date.now() + updateIntervalHours * 3600 * 1000).toISOString();
    console.log(`[INTEL-USV-26] Auto-update completed at ${intelLastUpdated}. Next scheduled cycle: ${nextScheduledUpdate}`);
  } catch (err: any) {
    console.warn(`[INTEL-USV-26] Auto-update warning:`, err.message);
  }
};

const intelIntervalTimer = setInterval(runPeriodicIntelUpdate, updateIntervalHours * 3600 * 1000);
if (intelIntervalTimer.unref) intelIntervalTimer.unref();

// A26 research review feed is deliberately separate from the engineering
// baseline and accepted fleet catalogue. Authenticated GET only. The source
// is the newest bounded, review-only GitHub Actions proposal branch.
app.get('/api/usv-intel/research-feed', async (_req, res) => {
  try {
    const feed = await loadA26ResearchFeed();
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.json(feed);
  } catch (error) {
    // A failed upstream read must not be presented as an empty success.
    res.status(503).json({success:false,agentId:'INTEL-USV-26',
      source:'GITHUB_UNVERIFIED_REVIEW_BRANCH',researchStatus:'SOURCE_UNAVAILABLE',
      error:'A26 review data unavailable; see the GitHub Actions research evidence and latest review PR',
      engineeringReleaseApproved:false});
  }
});

// Read-only, authenticated A26 PUBLIC research leads. These are metadata
// proposals from a separate protected GitHub workflow, never fleet acceptance.
app.get('/api/usv-intel/discoveries', (_req, res) => {
  try {
    const file = path.join(__dirname, 'references/fleet-intelligence/discovery-register.json');
    const register = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (register.schemaVersion !== 1 || register.agentId !== 'INTEL-USV-26' ||
      !Array.isArray(register.records) ||
      !register.records.every((r: any) => r.status === 'DISCOVERED_UNVERIFIED')) {
      return res.status(503).json({success: false, error: 'Public discovery register not trustworthy'});
    }
    res.json({
      success: true,
      agentId: 'INTEL-USV-26',
      researchStatus: 'DISCOVERED_UNVERIFIED',
      newlyIndependentlyVerifiedVessels: 0,
      engineeringReleaseApproved: false,
      researchLeads: register.records.length,
      source: 'COMMITTED_UNVERIFIED_REVIEW_QUEUE_NOT_LIVE_FETCH',
      workflowUrl: 'https://github.com/ravisinghrathode/usv-01-digital-lab/actions/workflows/a26-public-fleet-discovery.yml',
      records: register.records.slice(0, 80).map((r: any) => ({
        id: r.id, title: r.title,
        knownModelIds: r.knownModelIds,
        firstSeenAt: r.firstSeenAt,
        sourceLinks: Array.isArray(r.evidence)
          ? r.evidence.slice(0, 4).map((e: any) => e.publicArticleUrl)
          : [],
        status: 'DISCOVERED_UNVERIFIED'
      }))
    });
  } catch {
    res.status(503).json({ success: false,
      error: 'A26 public discovery register unavailable; no live evidence claim possible' });
  }
});

// Separate documentary research catalogue; records are unverified and
// may link to open-access publications, but are never certified papers.
app.get('/api/usv-intel/document-discoveries', (_req, res) => {
  try {
    const file = path.join(__dirname, 'references/fleet-intelligence/document-register.json');
    const register = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (register.schemaVersion !== 1 || register.agentId !== 'INTEL-USV-26' ||
      register.reviewStatus !== 'UNVERIFIED_PUBLIC_DOCUMENTS' ||
      !Array.isArray(register.records) ||
      !register.records.every((r: any) => r.reviewStatus === 'REVIEW_REQUIRED')) {
      return res.status(503).json({success: false, error: 'Document research index is invalid'});
    }
    res.json({success: true,agentId: 'INTEL-USV-26',
      researchStatus: 'UNVERIFIED_PUBLIC_DOCUMENTS',
      count: register.records.length, independentlyVerified: 0,
      releaseApproved: false,
      records: register.records.slice(0, 100).map((r: any) => ({
        id: r.id, title: r.title, publishedAt: r.publishedAt,
        doi: r.doi, sourceUrl: r.sourceUrl,
        fullTextPdfLink: r.fullTextPdfLink,
        openLicenseMetadata: r.openLicenseMetadata,
        metadataConflict: !!r.pendingMetadataChange,
        status: 'REVIEW_REQUIRED'
      }))});
  } catch {
    res.status(503).json({success: false,error:'A26 documentary research index unavailable'});
  }
});

app.get('/api/usv-intel/status', (req, res) => {
  res.json({
    success: true,
    agentId: 'INTEL-USV-26',
    canonicalId: 'A26',
    autoUpdateSchedule: {
      enabled: true,
      frequencyHours: updateIntervalHours,
      humanReadableFrequency: `Every ${updateIntervalHours} Hours (Daily Cycle)`,
      lastUpdated: intelLastUpdated,
      nextScheduledUpdate: nextScheduledUpdate
    },
    metrics: {
      operatingUsvsCataloged: usvIntelAgent.searchOperatingUsvs().length,
      peerReviewedPapers: usvIntelAgent.fetchAcademicPapers().length,
      activeNaviesCount: new Set(usvIntelAgent.searchOperatingUsvs().map((v) => v.country)).size,
      disciplineCluesHarvested: GlobalIntelligenceLearningBridge.getInstance().getClues().length
    }
  });
});

app.get('/api/usv-intel/fleet', (req, res) => {
  try {
    const { keyword, country, operatorNavy, mission, hullForm, minSpeed, maxDisplacement, autonomyLevel } = req.query;
    const vessels = usvIntelAgent.searchOperatingUsvs({
      keyword: keyword as string,
      country: country as string,
      operatorNavy: operatorNavy as string,
      mission: mission as any,
      hullForm: hullForm as string,
      minSpeedKnots: minSpeed ? parseFloat(minSpeed as string) : undefined,
      maxDisplacementTonnes: maxDisplacement ? parseFloat(maxDisplacement as string) : undefined,
      autonomyLevel: autonomyLevel as string
    });
    res.json({ success: true, count: vessels.length, vessels });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/usv-intel/fleet/:id', (req, res) => {
  try {
    const vessel = usvIntelAgent.getUsvDetails(req.params.id);
    if (!vessel) return res.status(404).json({ success: false, error: 'USV model not found' });
    res.json({ success: true, vessel });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/usv-intel/papers', (req, res) => {
  try {
    const papers = usvIntelAgent.fetchAcademicPapers(req.query.q as string);
    res.json({ success: true, count: papers.length, papers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/usv-intel/benchmark/:id', (req, res) => {
  try {
    const benchmark = usvIntelAgent.benchmarkAgainstUsv01(req.params.id);
    res.json({ success: true, benchmark });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/usv-intel/scrape', async (req, res) => {
  try {
    const { sources, syncToKnowledgeNotes } = req.body || {};
    const report = await usvIntelAgent.scrapeAndEnrich(sources);

    if (syncToKnowledgeNotes !== false) {
      const newNotes = usvIntelAgent.generateKnowledgeNotes();
      let added = 0;
      if (!Array.isArray(dbStore.knowledge_notes)) dbStore.knowledge_notes = [];
      for (const note of newNotes) {
        const idx = dbStore.knowledge_notes.findIndex((n: any) => n.id === note.id);
        if (idx >= 0) {
          dbStore.knowledge_notes[idx] = note;
        } else {
          dbStore.knowledge_notes.push(note);
          added++;
        }
      }
      dbStore.activity_log.unshift({
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userId: 'INTEL-USV-26',
        userName: 'Global USV Intelligence Agent',
        action: 'SCRAPE_SYNC',
        recordType: 'KNOWLEDGE_NOTES',
        recordId: 'USV-FLEET-INTEL',
        details: `Scraped ${report.totalVesselsScraped} operating USVs globally across ${report.activeNaviesCount} navies; synced ${newNotes.length} Obsidian notes into Knowledge Centre.`
      });
      saveStoreToFile();
    }

    res.json({ success: true, report, totalVessels: usvIntelAgent.searchOperatingUsvs().length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/usv-intel/export-obsidian/:id?', (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId) {
      const v = usvIntelAgent.getUsvDetails(targetId);
      if (!v) return res.status(404).json({ success: false, error: 'USV model not found' });
      const md = usvIntelAgent.generateObsidianVaultExport(v);
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${v.modelName.replace(/[^a-zA-Z0-9_-]/g, '_')}.md"`);
      return res.send(md);
    }
    const allNotes = usvIntelAgent.generateKnowledgeNotes();
    res.json({ success: true, count: allNotes.length, notes: allNotes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5c. Naval NotebookLM & Agent Learning Bridge Endpoints
const learningBridge = GlobalIntelligenceLearningBridge.getInstance();

app.get('/api/notebook-lm/sources', (req, res) => {
  try {
    const sources = learningBridge.getNotebookSources();
    res.json({ success: true, count: sources.length, sources });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/notebook-lm/clues', (req, res) => {
  try {
    const discipline = req.query.discipline as any;
    const clues = learningBridge.getClues(discipline);
    const summaries = learningBridge.generateDisciplineLearningSummaries();
    res.json({ success: true, count: clues.length, clues, summaries });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notebook-lm/clues/:id/adopt', (req, res) => {
  try {
    const clueId = req.params.id;
    const updated = learningBridge.updateClueStatus(clueId, 'ADOPTED');
    dbStore.activity_log.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      userId: 'Lead Engineer',
      userName: 'Lead Engineer',
      action: 'CLUE_ADOPTED',
      recordType: 'TRIAL_PROPOSAL',
      recordId: clueId,
      details: `Adopted global USV clue [${updated.clueTitle}] into ${updated.targetDiscipline} discipline design trials.`
    });
    saveStoreToFile();
    res.json({ success: true, clue: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notebook-lm/chat', async (req, res) => {
  try {
    const { prompt, selectedSourceIds } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Missing prompt' });

    // Notebook grounding is deterministic; no external AI credentials or unverified model claims.
    const message = learningBridge.answerGroundedQuery(prompt, selectedSourceIds);
    res.json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- OPERATOR-LOCAL CODEX SUBSCRIPTION ASSISTANT ---
// Old Gemini endpoints are intentionally retired, not silently rerouted to a different provider.
for (const route of ['/api/gemini/generate', '/api/gemini/stream', '/api/gemini/assist']) {
  app.post(route, (_req, res) =>
    res.status(410).json({ success: false, evidenceValid: false,
      error: 'Legacy Gemini endpoint retired. Use the operator-local Codex assistant.' }));
}
app.get('/api/gemini/status', (_req, res) => res.status(410).json({
  success: false, available: false, error: 'Gemini API retired from this server.'
}));

app.get('/api/assistant/status', (req, res) => res.json({
  success: true, provider: 'codex_cli', configured: isCodexAssistantEnabled(),
  localOnly: true, authenticatedSessionVerified: false,
  modelIdentityVerified: false, engineeringEvidenceValid: false
}));

let assistantBusy = false;
app.post('/api/assistant/assist', async (req, res) => {
  // A ChatGPT/Codex personal CLI login is a LOCAL user session, not a shared API key.
  if (!isLoopbackPeer(req.socket.remoteAddress)) {
    return res.status(403).json({ success: false,
      error: 'Subscription Codex assistant is limited to the local operator workstation.' });
  }
  if (!isCodexAssistantEnabled()) {
    return res.status(503).json({ success: false,
      error: 'Codex CLI unavailable: sign in locally and enable the subscription pilot. No hosted API fallback.' });
  }
  if (assistantBusy) {
    return res.status(429).json({ success: false, error: 'A local Codex consultation is already in progress.' });
  }

  const { prompt, currentWorkstream, activeRecord, selectedAgent } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 10_000) {
    return res.status(400).json({ success: false, error: 'Invalid bounded engineering prompt.' });
  }

  const instruction = [
    'Operate as a non-authoritative USV-01 systems-engineering advisor.',
    'No physical or numerical claim without verified baseline inputs or real tool evidence.',
    'Keep missing particulars TBD. No vessel-control actions.',
    'Project context:', projectContext.slice(0, 3000)
  ].join('\n');
  assistantBusy = true;
  try {
    const text = await generateCodexAssistantText({
      prompt, instruction, context: {
        currentWorkstream: String(currentWorkstream || '').slice(0, 120),
        selectedAgent: String(selectedAgent || 'LEAD-SYS-01').slice(0, 80),
        activeRecord: activeRecord ? JSON.stringify(activeRecord).slice(0, 4000) : null
      }
    });
    if (req.query.stream === 'true' || req.body?.stream === true) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.write('data: ' + JSON.stringify({ text }) + '\n\n');
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    return res.json({ success: true, text, providerUsed: 'codex_cli',
      modelUsed: 'operator-authenticated-cli-model-unattested', evidenceValid: false,
      isHeuristic: false, independentlyReviewed: false });
  } catch {
    return res.status(503).json({ success: false, evidenceValid: false,
      error: 'Codex CLI could not complete an authenticated local consultation. No AI response or evidence was generated.' });
  } finally {
    assistantBusy = false;
  }
});

// Development vs Production serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);

  // Legacy paid Gemini Live WebSocket removed. No subscription voice transport is implied.

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(
      `[USV-01 Digital Engineering Lab] Server running on port ${port} (${isProd ? 'production' : 'development'})`
    );
    console.log('[Codex Advisory] Local subscription pilot configured:', isCodexAssistantEnabled());
  });
}

if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  startServer();
}
