import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

export const STORE_COLLECTIONS = [
  'requirements','design_decisions','engineering_risks','simulation_jobs','verification_plans',
  'test_records','components','activity_log','knowledge_notes','power_loads','interfaces',
  'materials','load_cases','resistance_estimates','weight_cg'
] as const;

/** Reject truncated or contaminated stores rather than silently reseeding demo data. */
export function validateProjectStore(value: unknown): asserts value is Record<string, any[]> {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('Project store is not an object');
  }
  const store = value as Record<string, unknown>;
  const expected = new Set<string>(STORE_COLLECTIONS);
  for (const name of STORE_COLLECTIONS) {
    if (!Array.isArray(store[name])) throw new Error('Project store missing array collection: ' + name);
  }
  for (const name of Object.keys(store)) {
    if (!expected.has(name)) throw new Error('Unexpected project store collection: ' + name);
  }
}

export function saveProjectStore(store: unknown, filename: string): void {
  validateProjectStore(store);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const tmp = filename + '.' + randomBytes(8).toString('hex') + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    // Rename on same filesystem is atomic; existing target is never partially overwritten.
    fs.renameSync(tmp, filename);
  } finally {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
  }
}

export function loadProjectStore(filename: string): Record<string, any[]> | null {
  if (!fs.existsSync(filename)) return null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch {
    throw new Error('Existing persisted project store is corrupt/unreadable; refusing demo-data reset');
  }
  validateProjectStore(decoded);
  return decoded;
}

export function runIsolatedRestoreDrill(store: unknown) {
  validateProjectStore(store);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-restore-drill-'));
  try {
    const snap = path.join(dir, 'project_store.backup.json');
    saveProjectStore(store, snap);
    const checksum = createHash('sha256').update(fs.readFileSync(snap)).digest('hex');
    const restored = loadProjectStore(snap);
    if (!restored || JSON.stringify(restored) !== JSON.stringify(store)) {
      throw new Error('Isolated backup roundtrip content mismatch');
    }
    return {
      status: 'ISOLATED_RESTORE_DRILL_PASS_UNCERTIFIED' as const,
      backupDigestSha256: 'sha256:' + checksum,
      collectionCount: Object.keys(restored).length,
      productionRestoreVerified: false as const
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
