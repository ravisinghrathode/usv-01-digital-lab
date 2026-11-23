import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

export const STORE_COLLECTIONS = [
  'requirements','design_decisions','engineering_risks','simulation_jobs','verification_plans',
  'test_records','components','activity_log','knowledge_notes','power_loads','interfaces',
  'materials','load_cases','resistance_estimates','weight_cg','cad_revisions'
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

/**
 * Flush the parent directory after a successful atomic rename. Some local
 * filesystems cannot fsync directory handles; callers still have the durable
 * temp-file sync, and production acceptance must document that limitation.
 */
function syncStoreDirectory(dir: string): void {
  let fd: number | undefined;
  try {
    fd = fs.openSync(dir, 'r');
    fs.fsyncSync(fd);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (!['EINVAL', 'ENOTSUP', 'EISDIR', 'EBADF'].includes(String(code))) throw error;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
export function saveProjectStore(store: unknown, filename: string): void {
  validateProjectStore(store);
  const dir = path.dirname(filename);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = filename + '.' + randomBytes(8).toString('hex') + '.tmp';
  try {
    // The temporary file must be on stable storage BEFORE exposing the rename.
    // A failed write or file fsync leaves the previous snapshot untouched.
    const fd = fs.openSync(tmp, 'wx', 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(store, null, 2) + '\n', 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    // Rename on same filesystem is atomic; target is never partially replaced.
    fs.renameSync(tmp, filename);
    syncStoreDirectory(dir);
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
  // Only the new empty CAD-reference register is optional in older stores.
  // Verify the complete pre-migration schema first; never reseed or drop records.
  if(decoded && !Array.isArray(decoded) && typeof decoded==='object' &&
     !Object.hasOwn(decoded,'cad_revisions')) {
    const legacy=decoded as Record<string,unknown>;
    const expected=new Set<string>(STORE_COLLECTIONS);
    for(const name of STORE_COLLECTIONS.filter(name=>name!=='cad_revisions')) {
      if(!Array.isArray(legacy[name]))throw Error('Project store missing array collection: '+name);
    }
    for(const name of Object.keys(legacy)) {
      if(!expected.has(name))throw Error('Unexpected project store collection: '+name);
    }
    decoded={...legacy,cad_revisions:[]};
  }
  validateProjectStore(decoded);
  return decoded;
}

/**
 * Commit a related record mutation and activity-log mutation as ONE snapshot.
 * Never publish the speculative in-memory copy before the atomic file write
 * succeeds. This is a single-process rollback boundary, NOT a multi-process
 * serializable database and NOT a replacement for a durable audit outbox.
 */
export function commitProjectStoreMutation<T>(
  current: Record<string, any[]>,
  filename: string,
  mutate: (draft: Record<string, any[]>) => T
): { store: Record<string, any[]>; result: T } {
  validateProjectStore(current);
  const draft = structuredClone(current);
  const result = mutate(draft);
  saveProjectStore(draft, filename);
  return { store: draft, result };
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
