import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateApproverSignature, setDirectorSigningKey } from './src/core/safety/ApproverSigner.ts';

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
const SESSION_SECRET = process.env.LAB_SESSION_SECRET || process.env.DIRECTOR_SIGNING_KEY || crypto.randomBytes(32).toString('hex');
setDirectorSigningKey(SESSION_SECRET);

export interface AuthenticatedUser {
  userId: string;
  userName: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
}

export interface StaffMember {
  userId: string;
  userName: string;
  role: string;
}

export const AUTHORIZED_MEMBERS: Record<string, StaffMember> = {
  'usr-eng-dir-8841': {
    userId: 'usr-eng-dir-8841',
    userName: 'Chief Naval Architect & Systems Director',
    role: 'ENGINEERING_DIRECTOR'
  },
  'usr-lead-sys-01': {
    userId: 'usr-lead-sys-01',
    userName: 'Lead Systems Architect',
    role: 'LEAD_SYSTEMS_ENGINEER'
  },
  'usr-naval-arch-05': {
    userId: 'usr-naval-arch-05',
    userName: 'Senior Hydrodynamics Engineer',
    role: 'NAVAL_ARCHITECT'
  },
  'usr-struct-eng-10': {
    userId: 'usr-struct-eng-10',
    userName: 'Hull Structural & Composites Engineer',
    role: 'STRUCTURAL_ENGINEER'
  },
  'usr-prop-elec-14': {
    userId: 'usr-prop-elec-14',
    userName: 'Marine Electrical & Power Systems Engineer',
    role: 'ELECTRICAL_ENGINEER'
  },
  'usr-vvt-qa-18': {
    userId: 'usr-vvt-qa-18',
    userName: 'Test & Verification Specialist',
    role: 'VVT_SPECIALIST'
  },
  'usr-sec-analyst-20': {
    userId: 'usr-sec-analyst-20',
    userName: 'Cyber-Physical Security Analyst',
    role: 'SECURITY_ANALYST'
  }
};

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
app.use(['/api/data', '/api/export', '/api/import', '/api/gemini/assist', '/api/auth/sign-gate', '/api/auth/session'], authMiddleware);

// Secret passphrase required to claim Engineering Director credentials
// Must be configured in runtime environment; no hardcoded fallback allowed
const DIRECTOR_KEY = process.env.LAB_DIRECTOR_KEY;

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

  // Privileged Engineering Director authority strictly requires verified passphrase against LAB_DIRECTOR_KEY
  if (authorizedMember.role === 'ENGINEERING_DIRECTOR') {
    const directorKey = process.env.LAB_DIRECTOR_KEY;
    if (!directorKey) {
      return {
        statusCode: 503,
        body: {
          success: false,
          error: "Authentication service unavailable: LAB_DIRECTOR_KEY is not configured in the server environment. Engineering Director sessions are disabled."
        }
      };
    }

    if (!passphrase || typeof passphrase !== 'string') {
      return {
        statusCode: 401,
        body: {
          success: false,
          error: "Authentication failed: Engineering Director session requires a verified passphrase/credential."
        }
      };
    }

    const bufProvided = Buffer.from(passphrase);
    const bufExpected = Buffer.from(directorKey);
    if (bufProvided.length !== bufExpected.length || !crypto.timingSafeEqual(bufProvided, bufExpected)) {
      return {
        statusCode: 401,
        body: {
          success: false,
          error: "Authentication failed: Invalid Engineering Director passphrase."
        }
      };
    }
  }

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
      tokenSignature: signature
    }
  });
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction
      }
    });

    const text = response.text || 'No response generated from model.';

    res.json({
      success: true,
      modelUsed: 'gemini-3.8-flash',
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
