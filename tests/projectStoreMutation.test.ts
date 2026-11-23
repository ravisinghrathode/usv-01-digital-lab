import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  STORE_COLLECTIONS, commitProjectStoreMutation, loadProjectStore, saveProjectStore
} from '../src/core/storage/ProjectStorePersistence.ts';

const folders: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const folder of folders.splice(0)) fs.rmSync(folder, { recursive: true, force: true });
});

function setup() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-transaction-'));
  folders.push(folder);
  const filename = path.join(folder, 'project_store.json');
  const original = Object.fromEntries(STORE_COLLECTIONS.map(name => [name, []])) as Record<string, any[]>;
  saveProjectStore(original, filename);
  return { filename, original };
}

describe('copy-on-write engineering data mutations', () => {
  it('commits engineering draft and audit activity as one disk snapshot', () => {
    const { filename, original } = setup();
    const completed = commitProjectStoreMutation(original, filename, next => {
      next.requirements.push({ id: 'REQ-NEW', status: 'DRAFT_UNVERIFIED' });
      next.activity_log.push({ recordId: 'REQ-NEW', action: 'CREATE' });
      return 'created';
    });
    expect(completed.result).toBe('created');
    expect(completed.store.requirements).toHaveLength(1);
    expect(completed.store.activity_log).toHaveLength(1);
    expect(loadProjectStore(filename)).toEqual(completed.store);
    expect(original.requirements).toHaveLength(0);
    expect(original.activity_log).toHaveLength(0);
  });

  it('leaves all collections and disk unchanged when a mutate callback throws', () => {
    const { filename, original } = setup();
    const beforeDisk = fs.readFileSync(filename, 'utf8');
    expect(() => commitProjectStoreMutation(original, filename, next => {
      next.requirements.push({ id: 'ABORT' });
      next.activity_log.push({ recordId: 'ABORT' });
      throw new Error('validation failure');
    })).toThrow('validation failure');
    expect(original.requirements).toEqual([]);
    expect(original.activity_log).toEqual([]);
    expect(fs.readFileSync(filename, 'utf8')).toBe(beforeDisk);
  });

  it('never publishes the speculative state if the atomic rename fails', () => {
    const { filename, original } = setup();
    const beforeDisk = fs.readFileSync(filename, 'utf8');
    const spy = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('simulated disk failure');
    });
    expect(() => commitProjectStoreMutation(original, filename, next => {
      next.requirements.push({ id: 'NOT-COMMITTED' });
      next.activity_log.push({ recordId: 'NOT-COMMITTED' });
    })).toThrow('simulated disk failure');
    spy.mockRestore();
    expect(original.requirements).toHaveLength(0);
    expect(original.activity_log).toHaveLength(0);
    expect(fs.readFileSync(filename, 'utf8')).toBe(beforeDisk);
    expect(fs.readdirSync(path.dirname(filename))).toEqual(['project_store.json']);
  });

  it('isolates changes to nested fields in the speculative copy', () => {
    const { filename, original } = setup();
    original.requirements.push({ id: 'REQ-X', nested: { count: 1 } });
    saveProjectStore(original, filename);
    const updated = commitProjectStoreMutation(original, filename, next => {
      next.requirements[0].nested.count = 2;
    });
    expect(updated.store.requirements[0].nested.count).toBe(2);
    expect(original.requirements[0].nested.count).toBe(1);
  });
});

describe('public engineering CRUD transactional boundary', () => {
  it('uses copy-on-write commit for both mutations and activity logs', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    for (const marker of [
      "app.post('/api/data/:collection'",
      "app.put('/api/data/:collection/:id'",
      "app.delete('/api/data/:collection/:id'"
    ]) {
      const from = source.indexOf(marker);
      expect(from).toBeGreaterThan(-1);
      const until = source.indexOf('\n});', from);
      expect(until).toBeGreaterThan(from);
      const route = source.slice(from, until);
      expect(route).toContain('commitEngineeringStoreMutation(nextStore =>');
      expect(route).toContain('nextStore.activity_log.unshift(');
      expect(route).toContain('res.status(503)');
      expect(route).not.toContain('dbStore.activity_log.unshift(');
    }
  });
});
