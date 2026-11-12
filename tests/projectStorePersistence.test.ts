import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  STORE_COLLECTIONS, loadProjectStore, saveProjectStore, runIsolatedRestoreDrill
} from '../src/core/storage/ProjectStorePersistence.ts';

const store = (): Record<string, any[]> => Object.fromEntries(STORE_COLLECTIONS.map(name => [name, []]));
describe('Safety-critical engineering store integrity and restore drills', () => {
  it('saves atomically, loads all required collections, and exercises isolated restore', () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-store-'));
    try {
      const filename = path.join(folder, 'project_store.json');
      const baseline = store();
      baseline.requirements = [{ id: 'REQ-001', title: 'test-only' }];
      saveProjectStore(baseline, filename);
      expect(loadProjectStore(filename)).toEqual(baseline);
      expect(fs.readdirSync(folder)).toEqual(['project_store.json']);
      const drill = runIsolatedRestoreDrill(baseline);
      expect(drill.status).toBe('ISOLATED_RESTORE_DRILL_PASS_UNCERTIFIED');
      expect(drill.collectionCount).toBe(15);
      expect(drill.productionRestoreVerified).toBe(false);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });

  it('fails closed instead of reseeding when an existing store is corrupt', () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-store-'));
    try {
      const filename = path.join(folder, 'project_store.json');
      fs.writeFileSync(filename, '{"requirements":');
      const before = fs.readFileSync(filename, 'utf8');
      expect(() => loadProjectStore(filename)).toThrow(/corrupt\/unreadable/);
      expect(fs.readFileSync(filename, 'utf8')).toBe(before);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });

  it('rejects missing or unexpected collections before touching storage', () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-store-'));
    try {
      const file = path.join(folder, 'project_store.json');
      expect(() => saveProjectStore({ requirements: [] }, file)).toThrow(/missing array/);
      expect(fs.existsSync(file)).toBe(false);
      expect(() => saveProjectStore({ ...store(), credentials: [{ password: 'x' }] }, file)).toThrow(/Unexpected/);
      expect(fs.existsSync(file)).toBe(false);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
});
