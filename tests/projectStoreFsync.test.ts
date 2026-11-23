import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { STORE_COLLECTIONS, loadProjectStore, saveProjectStore } from '../src/core/storage/ProjectStorePersistence.ts';

const folders: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const folder of folders.splice(0)) fs.rmSync(folder, { force: true, recursive: true });
});
const blank = () => Object.fromEntries(STORE_COLLECTIONS.map(name => [name, []]));

describe('durable project-store snapshot rename', () => {
  it('calls file fsync before rename and preserves exact structured records', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-store-fsync-'));
    folders.push(dir);
    const file = path.join(dir, 'project_store.json');
    const order: string[] = [];
    const realFsync = fs.fsyncSync.bind(fs);
    const realRename = fs.renameSync.bind(fs);
    vi.spyOn(fs, 'fsyncSync').mockImplementation(fd => {
      order.push('sync');
      realFsync(fd);
    });
    vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      order.push('rename');
      realRename(from, to);
    });
    const store = blank() as Record<string, any[]>;
    store.requirements.push({ id: 'REQ-FSYNC', recordStatus: 'DRAFT_UNVERIFIED' });
    saveProjectStore(store, file);
    expect(order[0]).toBe('sync');
    expect(order.indexOf('rename')).toBeGreaterThan(0);
    expect(loadProjectStore(file)).toEqual(store);
    expect(fs.readdirSync(dir)).toEqual(['project_store.json']);
  });

  it('fails before replacing the previous snapshot when file fsync fails', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-store-fsync-'));
    folders.push(dir);
    const file = path.join(dir, 'project_store.json');
    const original = blank() as Record<string, any[]>;
    saveProjectStore(original, file);
    const previousBytes = fs.readFileSync(file);
    const next = structuredClone(original);
    next.requirements.push({ id: 'REQ-NOT-COMMITTED' });
    vi.spyOn(fs, 'fsyncSync').mockImplementation(() => {
      throw new Error('test simulated file fsync failure');
    });
    expect(() => saveProjectStore(next, file)).toThrow(/simulated file fsync failure/);
    expect(fs.readFileSync(file)).toEqual(previousBytes);
    expect(fs.readdirSync(dir)).toEqual(['project_store.json']);
  });
});
