import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateApproverSignature, verifyApproverSignature, setDirectorSigningKey } from './src/core/safety/ApproverSigner.ts';
import { AUTHORIZED_MEMBERS, type StaffMember } from './src/core/auth/staffDirectory.ts';
import { authorizeLabRoute } from './src/core/auth/routeAuthorization.ts';
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
import { GlobalUsvIntelligenceAgent } from './src/core/agents/GlobalUsvIntelligenceAgent.ts';
import { GlobalIntelligenceLearningBridge } from './src/core/intelligence/GlobalIntelligenceLearningBridge.ts';
import http from 'http';
import { WebSocketServer } from 'ws';
import { VerifyUsv01Engine } from './src/core/verification/VerifyUsv01Engine.ts';
import { AgentRegistry } from './src/core/registry/AgentRegistry.ts';
import { BaseAgent } from './src/core/engine/BaseAgent.ts';
import { CentralOrchestrator } from './src/core/orchestrator/CentralOrchestrator.ts';
import { ApprovalGateManager } from './src/core/safety/HumanApprovalGate.ts';
import type { EngineeringTask } from './src/core/types/orchestrator.ts';
import { AuditLogger } from './src/core/safety/AuditLogger.ts';
import {
  getGeminiClient,
  isGeminiAvailable,
  generateGeminiContent,
  streamGeminiContent,
  setupLiveApiWebSocket,
  resolveServerGeminiModel
} from './src/server/geminiService.ts';

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
  weight_cg: []
};

const saveStoreToFile = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(dbStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store to disk:', err);
  }
};

const loadStoreFromFile = (): boolean => {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const content = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        dbStore = parsed;
        console.log(`Loaded persisted project store from ${STORE_PATH}`);
        return true;
      }
    }
  } catch (err) {
    console.warn('Could not load persisted project store from disk:', err);
  }
  return false;
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
    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }
    return payload;
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

app.get('/api/auth/session', (req, res) => {
  const user = (req as any).user;
  res.json({ success: true, user });
});

app.post('/api/auth/sign-gate', (req, res) => {
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

  const timestamp = new Date().toISOString();
  const signature = generateApproverSignature(
    gateId,
    decision,
    user.userId,
    user.role,
    timestamp,
    SESSION_SECRET
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
  const valid = verifyApproverSignature(gateId, decision, identity, SESSION_SECRET);
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
      const result = await orchestrator.executeWorkflow();
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
    const timestamp = new Date().toISOString();
    const signature = generateApproverSignature(gateId, decision, user.userId, user.role, timestamp, SESSION_SECRET);
    const gate = ApprovalGateManager.getInstance().evaluateDecision(gateId, decision, String(directorNotes || ''), {
      userId: user.userId, userName: user.userName, role: user.role,
      authenticatedAt: timestamp, tokenSignature: signature, serverVerifiedSignature: signature
    });
    const orchestrator = CentralOrchestrator.getInstance();
    const result = orchestrator.resolveGateDecision(gateId, decision);
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

// 2. Get latest verification report
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
        userId: 'usr-admin',
        userName: 'Systems Administrator',
        action: 'UPDATE',
        recordType: 'DATABASE',
        recordId: 'RESET',
        details: 'Project database reset to certified illustrative baseline.'
      },
      ...initial.INITIAL_ACTIVITY_LOG
    ];
    dbStore.knowledge_notes = [...initial.INITIAL_KNOWLEDGE_NOTES];
    dbStore.power_loads = [...initial.INITIAL_POWER_LOADS];
    dbStore.interfaces = [...initial.INITIAL_INTERFACES];
    dbStore.materials = [...initial.INITIAL_MATERIALS];
    dbStore.load_cases = [...initial.INITIAL_LOAD_CASES];
    dbStore.resistance_estimates = [...initial.INITIAL_RESISTANCE];
    dbStore.weight_cg = [...initial.INITIAL_WEIGHT_CG];
    saveStoreToFile();

    res.json({ success: true, message: 'Database reset to default illustrative baseline.', data: dbStore });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Collection CRUD
app.get('/api/data/:collection', (req, res) => {
  const coll = req.params.collection;
  const items = dbStore[coll] || [];
  res.json({ success: true, collection: coll, count: items.length, data: items });
});

app.post('/api/data/:collection', (req, res) => {
  const coll = req.params.collection;
  if (!dbStore[coll]) {
    dbStore[coll] = [];
  }
  const newItem = {
    ...req.body,
    id: req.body.id || `${coll.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
    createdAt: req.body.createdAt || new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0]
  };

  dbStore[coll].unshift(newItem);

  // Auto-log activity
  if (coll !== 'activity_log') {
    dbStore.activity_log.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      userId: req.body.owner || 'Lead Engineer',
      userName: req.body.owner || 'Lead Engineer',
      action: 'CREATE',
      recordType: coll.toUpperCase(),
      recordId: newItem.id,
      details: `Created new ${coll} record: ${newItem.title || newItem.name || newItem.partNumber || newItem.id}`
    });
  }

  saveStoreToFile();
  res.json({ success: true, item: newItem });
});

app.put('/api/data/:collection/:id', (req, res) => {
  const coll = req.params.collection;
  const id = req.params.id;
  const items = dbStore[coll] || [];
  const idx = items.findIndex((i: any) => i.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }

  items[idx] = {
    ...items[idx],
    ...req.body,
    updatedAt: new Date().toISOString().split('T')[0]
  };

  if (coll !== 'activity_log') {
    dbStore.activity_log.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      userId: req.body.reviewer || req.body.owner || 'Lead Engineer',
      userName: req.body.reviewer || req.body.owner || 'Lead Engineer',
      action: req.body.status === 'Approved' ? 'APPROVE' : req.body.status === 'Archived' ? 'ARCHIVE' : 'UPDATE',
      recordType: coll.toUpperCase(),
      recordId: id,
      details: `Updated ${coll} record ${id}: status=${items[idx].status || 'nominal'}`
    });
  }

  saveStoreToFile();
  res.json({ success: true, item: items[idx] });
});

app.delete('/api/data/:collection/:id', (req, res) => {
  const coll = req.params.collection;
  const id = req.params.id;
  const items = dbStore[coll] || [];
  const idx = items.findIndex((i: any) => i.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }

  const removed = items.splice(idx, 1)[0];

  dbStore.activity_log.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    userId: 'Lead Engineer',
    userName: 'Lead Engineer',
    action: 'ARCHIVE',
    recordType: coll.toUpperCase(),
    recordId: id,
    details: `Archived ${coll} record ${id}`
  });

  saveStoreToFile();
  res.json({ success: true, removed });
});

// 5. Export and Import
app.get('/api/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=USV01_Engineering_Backup_${new Date().toISOString().split('T')[0]}.json`);
  res.send(JSON.stringify(dbStore, null, 2));
});

app.post('/api/import', (req, res) => {
  try {
    const importedData = req.body;
    if (!importedData || typeof importedData !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
    }
    // Update collections present
    for (const key of Object.keys(importedData)) {
      if (Array.isArray(importedData[key])) {
        dbStore[key] = importedData[key];
      }
    }
    dbStore.activity_log.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      userId: 'Admin',
      userName: 'Administrator',
      action: 'IMPORT',
      recordType: 'DATABASE',
      recordId: 'RESTORE',
      details: 'Restored engineering registers from imported JSON snapshot.'
    });
    saveStoreToFile();
    res.json({ success: true, message: 'Database imported successfully', collections: Object.keys(dbStore) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
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

    if (isGeminiAvailable()) {
      try {
        const sources = learningBridge.getNotebookSources();
        const activeSources =
          selectedSourceIds && selectedSourceIds.length > 0
            ? sources.filter((s: any) => selectedSourceIds.includes(s.id))
            : sources;

        const clues = learningBridge.getClues();
        const systemInstruction = `You are the Naval NotebookLM Grounded Research Assistant for the USV-01 project.
Answer the user's research query strictly using the provided Naval Research Sources and Transferred Technical Clues.
Cite source titles and evidence directly in your answer.`;

        const context = {
          sources: activeSources.map((s: any) => ({
            id: s.id,
            title: s.title,
            summary: s.summary,
            excerpt: s.fullTextExcerpt
          })),
          clues: clues.slice(0, 8).map((c: any) => ({
            id: c.id,
            title: c.clueTitle,
            principle: c.technicalPrinciple
          }))
        };

        const result = await generateGeminiContent({
          prompt,
          systemInstruction,
          context
        });

        return res.json({
          success: true,
          message: {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            text: result.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isGrounded: true,
            modelUsed: result.modelUsed
          }
        });
      } catch (geminiErr: any) {
        console.warn('NotebookLM Gemini generation error, using local grounded synthesizer:', geminiErr.message);
      }
    }

    const message = learningBridge.answerGroundedQuery(prompt, selectedSourceIds);
    res.json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SERVER-SIDE GEMINI API SUITE ---

// 1. Gemini Runtime Status Endpoint
app.get('/api/gemini/status', (req, res) => {
  res.json({
    success: true,
    available: isGeminiAvailable(),
    model: resolveServerGeminiModel(),
    majorCapability: 'MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API'
  });
});

// 2. Server-side General Gemini Generation Endpoint (used by ModelProvider and agent matrix)
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { request, config } = req.body || {};
    const prompt = request?.userPrompt || req.body.prompt;
    const systemInstruction = request?.systemInstructions || req.body.systemInstruction;
    const context = request?.context || req.body.context;
    const model = config?.modelName || req.body.model;

    if (!isGeminiAvailable()) {
      return res.status(503).json({ success: false, error: 'Gemini provider unavailable. No AI analysis was performed.' });
    }

    try {
      const result = await generateGeminiContent({
        prompt: prompt || 'Provide engineering analysis',
        systemInstruction,
        context,
        model,
        responseMimeType: 'application/json'
      });

      let parsedJson: any;
      try {
        parsedJson = JSON.parse(result.text);
      } catch {}

      return res.json({
        content: result.text,
        parsedJson,
        providerUsed: 'gemini',
        modelUsed: result.modelUsed,
        isAiReview: true,
        isMock: false,
        evidenceValid: false, // AI narrative is not independently verified engineering evidence.
        tokenUsage: {
          promptTokens: result.usageMetadata?.promptTokenCount || 0,
          completionTokens: result.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: result.usageMetadata?.totalTokenCount || 0
        }
      });
    } catch (providerErr: any) {
      return res.status(502).json({
        success: false,
        evidenceValid: false,
        error: 'Gemini generation failed; no independent engineering analysis was completed.'
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Server-side Gemini Streaming Endpoint (Server-Sent Events)
app.post('/api/gemini/stream', async (req, res) => {
  const { prompt, systemInstruction, context, model } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Missing prompt' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (!isGeminiAvailable()) {
    // Return single SSE chunk with offline baseline text
    res.write(
      `data: ${JSON.stringify({ text: 'Offline mode: GEMINI_API_KEY is not configured on the server runtime.' })}\n\n`
    );
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  try {
    for await (const chunk of streamGeminiContent({ prompt, systemInstruction, context, model })) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (_err: any) {
    res.write(`data: ${JSON.stringify({ error: 'Gemini streaming failed. No AI output was generated.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// 4. Server-side Gemini AI Engineering Assistant Endpoint
app.post('/api/gemini/assist', async (req, res) => {
  const { prompt, currentWorkstream, activeRecord, actionType, selectedAgent, stream } = req.body;

  if (!prompt && !actionType) {
    return res.status(400).json({ success: false, error: 'Missing prompt' });
  }

  const isStreaming = stream === true || req.query.stream === 'true';

  // System instruction enforcing engineering discipline
  const systemInstruction = `
You are the AI Engineering Assistant embedded inside the USV-01 Digital Engineering Lab.
Operating persona: ${selectedAgent && selectedAgent !== 'AUTO' ? `Specialist Agent ${selectedAgent}` : 'Lead Systems Architect (LEAD-SYS-01)'}.
The USV-01 is an autonomous Unmanned Surface Vessel engineering project.

CRITICAL MANDATES:
1. All vessel-specific technical dimensions, performance limits, exact displacement, speed, power ratings, and stability parameters must remain "TBD" (To Be Determined) unless explicitly supplied in verified project context. DO NOT invent vessel dimensions or fake stability claims.
2. In every response, you MUST clearly categorize statements into:
   - [VERIFIED FACTS]: Items already established in the USV-01 project baseline.
   - [USER INPUTS / DRAFTS]: Items entered as drafts or proposals.
   - [ASSUMPTIONS & ESTIMATES]: Numerical or physical models undergoing evaluation.
   - [AI PROPOSALS]: Suggestions generated by you that REQUIRE QUALIFIED HUMAN SIGN-OFF before adoption.
   - [MISSING INFORMATION & TBD UNCERTAINTIES]: Explicit gaps that must be resolved prior to design freeze.
3. This is an engineering design and analysis environment, NOT an operational vessel controller. Live vessel control or weapon systems are strictly out of scope.
4. When reviewing requirements, check for quantitative acceptance criteria, clear verification methods (Analysis, Test, Demonstration, Inspection, Simulation), and bi-directional traceability.
5. Refer to relevant engineering standards: IMO MSC.267(85), DNV-RU-HSLC, ISO 12217, IEEE 45, and COLREGs rules.

COMMON BASELINE CONTEXT:
${projectContext.substring(0, 3000)}

ACTIVE WORKSTREAM FOCUS: ${currentWorkstream || 'General Systems Engineering'}
ACTIVE SPECIALIST AGENT: ${selectedAgent || 'LEAD-SYS-01'}
ACTIVE RECORD UNDER REVIEW: ${activeRecord ? JSON.stringify(activeRecord) : 'None'}
ACTION REQUESTED: ${actionType || 'General Engineering Query'}
`;

  const userPrompt =
    prompt ||
    `Perform an engineering review for the active workstream ${currentWorkstream} and active record. Highlight missing inputs, traceability gaps, and standard compliance.`;

  const fallbackBaselineText = `### [AI Engineering Assistant — Baseline Response]

> **Note on Environment:** Server-side Gemini API key is not currently detected in environment variables. Providing rule-based engineering analysis derived from \`USV01_PROJECT_CONTEXT.md\`.

---

#### 1. [VERIFIED FACTS]
- Subsystem workstream active: **${currentWorkstream || 'Systems Engineering'}**.
- Authoritative baseline standard: **IMO Resolution MSC.267(85)** for stability, **DNV-RU-HSLC** for slamming structural design, and **IEEE 45** for electrical distribution.
- Traceability mandate: All requirements must trace to a Design Decision (\`DEC-xxx\`), Simulation (\`SIM-xxx\`), and Verification Procedure (\`VER-xxx\`).

#### 2. [ASSUMPTIONS & ESTIMATES]
- High-current propulsion bus is galvanically isolated from 24V avionics/sensors to mitigate ground loops and electromagnetic interference.
- Calm-water resistance is being analyzed via OpenFOAM VOF free-surface simulations (\`SIM-HYD-001\`) and will be validated against physical scale towing tank data (\`VER-TOW-003\`).

#### 3. [MISSING INFORMATION & TBD UNCERTAINTIES]
- Hull principal dimensions (LOA, Beam, Draft) remain **TBD** pending final payload volume envelope and hydrodynamic trade study (\`DEC-NAV-001\`).
- Propulsion motor continuous rating remains **TBD** awaiting certified resistance curves at operating Froude numbers.
- Metacentric height ($GM$) and full-load displacement remain **TBD** pending weighing and inclining experiment.

#### 4. [AI PROPOSALS — HUMAN SIGN-OFF REQUIRED]
- When defining new requirements, specify verifiable acceptance thresholds (e.g. *"Positive GZ area under curve >= 0.055 m-rad between 0° and 30°"* instead of *"Adequate stability"*).
- For safety-critical autonomy encounters, enforce strict adherence to COLREGs Rules 14 and 15 with deterministic fallback to loiter when telemetry is lost.
`;

  if (!isGeminiAvailable()) {
    if (isStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ text: fallbackBaselineText })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    return res.json({
      success: true,
      modelUsed: 'local-engineering-rules-engine',
      isHeuristic: true,
      text: fallbackBaselineText
    });
  }

  const geminiModel = resolveServerGeminiModel();

  if (isStreaming) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of streamGeminiContent({
        prompt: userPrompt,
        systemInstruction,
        model: geminiModel
      })) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (_streamErr: any) {
      res.write(`data: ${JSON.stringify({ text: fallbackBaselineText })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
  }

  try {
    const result = await generateGeminiContent({
      prompt: userPrompt,
      systemInstruction,
      model: geminiModel
    });

    res.json({
      success: true,
      modelUsed: result.modelUsed,
      text: result.text || 'No response generated from model.'
    });
  } catch (_err: any) {
    res.json({
      success: true,
      modelUsed: 'usv01-engineering-baseline-engine',
      isHeuristic: true,
      text: fallbackBaselineText
    });
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

  // Mount Gemini Live API WebSocket Server
  const wss = new WebSocketServer({ noServer: true });
  setupLiveApiWebSocket(wss);

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const host = request.headers.host || 'localhost';
      const pathname = request.url ? new URL(request.url, `http://${host}`).pathname : '';
      if (pathname === '/api/gemini/live' || pathname === '/live') {
        // WebSockets bypass Express middleware. Verify the session before allocating
        // an upstream paid Live API connection. Browsers send token in the second
        // subprotocol after the fixed public protocol, which is the only protocol echoed.
        const header = request.headers.authorization;
        const bearer = typeof header === 'string' && header.startsWith('Bearer ')
          ? header.slice(7) : '';
        const protocols = String(request.headers['sec-websocket-protocol'] || '').split(',').map(s => s.trim());
        const boundToken = protocols[0] === 'usv01-v1'
          ? protocols.find(s => s.startsWith('auth.'))?.slice(5) : undefined;
        if (!verifySessionToken(bearer || boundToken || '')) {
          socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
          socket.destroy();
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws: any) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (upgradeErr: any) {
      console.warn('[HTTP Upgrade Error]', upgradeErr.message);
      socket.destroy();
    }
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(
      `[USV-01 Digital Engineering Lab] Server running on port ${port} (${isProd ? 'production' : 'development'})`
    );
    console.log(
      `[Gemini Server-Side] Status: ${isGeminiAvailable() ? 'ONLINE' : 'OFFLINE_HEURISTIC'} (Model: ${resolveServerGeminiModel()})`
    );
  });
}

if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  startServer();
}
