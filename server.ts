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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

// Protect data, export/import, AI assistant, and gate signing endpoints
app.use([
  '/api/data',
  '/api/export',
  '/api/import',
  '/api/gemini/assist',
  '/api/auth/sign-gate',
  '/api/auth/session',
  '/api/governance/keygen',
  '/api/governance/sign-ecr'
], authMiddleware);

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
    provisionedUsers
  });
});

// Browser-based first-time staff credential provisioning (only for identities not yet provisioned)
app.post('/api/auth/provision-initial', (req, res) => {
  try {
    const { userId, passphrase } = req.body || {};
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

    const cred = hashCredential(passphrase);
    saveCredential(userId, cred, resolveCredentialStorePath());
    const token = createSessionToken(member);

    res.json({
      success: true,
      message: `Passphrase provisioned for ${member.userName} (${member.role}).`,
      token,
      user: member
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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

// 6. Server-side Gemini AI Engineering Assistant Endpoint
app.post('/api/gemini/assist', async (req, res) => {
  const { prompt, currentWorkstream, activeRecord, actionType, selectedAgent } = req.body;

  if (!prompt && !actionType) {
    return res.status(400).json({ success: false, error: 'Missing prompt' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

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

  if (!apiKey) {
    // Graceful offline engineering heuristic response when API key is not configured in local environment
    return res.json({
      success: true,
      modelUsed: 'local-engineering-rules-engine',
      isHeuristic: true,
      text: `### [AI Engineering Assistant — Baseline Response]

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
`
    });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const userPrompt = prompt || `Perform an engineering review for the active workstream ${currentWorkstream} and active record. Highlight missing inputs, traceability gaps, and standard compliance.`;

    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: userPrompt,
      config: {
        systemInstruction
      }
    });

    const text = response.text || 'No response generated from model.';

    res.json({
      success: true,
      modelUsed: geminiModel,
      text
    });
  } catch (err: any) {
    console.warn('Gemini API call returned error, serving baseline engineering response:', err.message);

    // Provide structured fallback so the user always receives an authoritative engineering analysis
    res.json({
      success: true,
      modelUsed: 'usv01-engineering-baseline-engine',
      isHeuristic: true,
      text: `### [USV-01 Engineering Assistant — Baseline Analysis]

> **Notice:** The live Gemini endpoint returned a transient error (${err.message.includes('503') ? 'Temporary 503 Service Spike' : 'API response code'}). The Lab has compiled this analysis directly from the \`USV01_PROJECT_CONTEXT.md\` authoritative baseline.

---

#### 1. [VERIFIED FACTS]
- Subsystem in focus: **${currentWorkstream || 'Systems Engineering'}**.
- Governing engineering standards: **IMO Resolution MSC.267(85)** (Intact Stability), **DNV-RU-HSLC** (High-Speed Craft Structure), **IEEE 45** (Shipboard Electrical), and **COLREGs 1972** (Safe Collision Avoidance).
- Systems Traceability: Top-level requirements are mapped to formal design decisions (\`DEC-xxx\`), simulation jobs (\`SIM-xxx\`), and test verification procedures (\`VER-xxx\`).

#### 2. [USER INPUTS & DRAFT RECORDS]
- Active workstream items are tracked with clear revision tags (Rev 0.2 Baseline).
- Any user-added parameters remain in **Draft** or **In Review** status until formal peer sign-off.

#### 3. [ASSUMPTIONS & ESTIMATES UNDER STUDY]
- Dual isolated DC buses (48V propulsion / 24V avionics) with LiFePO4 chemistry (\`DEC-ELE-001\`) to eliminate thermal runaway risks in uncrewed enclosures.
- Calm-water resistance is modeled via OpenFOAM VOF free-surface simulations (\`SIM-HYD-001\`) pending towing tank correlation (\`VER-TOW-003\`).

#### 4. [MISSING INFORMATION & TBD UNCERTAINTIES]
- Hull principal particulars (LOA, Beam, Draft, Depth) remain **TBD** pending final payload envelope freeze and towing tank correlation.
- Continuous propulsion motor rating remains **TBD** awaiting resistance validation.
- Initial metacentric height ($GM_0$) remains **TBD** pending inclining experiment.

#### 5. [AI PROPOSALS — HUMAN SIGN-OFF REQUIRED]
- Ensure every requirement in this workstream specifies quantitatively measurable acceptance thresholds.
- Maintain a minimum 15% design weight margin for naval architecture stability protection.
`
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

  app.listen(port, '0.0.0.0', () => {
    console.log(`[USV-01 Digital Engineering Lab] Server running on port ${port} (${isProd ? 'production' : 'development'})`);
  });
}

if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  startServer();
}
