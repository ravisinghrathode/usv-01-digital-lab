import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, mkdir, writeFile, stat, symlink, link } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { mutateDurableState, readDurableState } from '../src/core/mission-control/DurableJsonState.ts';

const directories: string[] = [];
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'usv01-durable-'));
  directories.push(dir);
  return { dir, file: path.join(dir, 'state.json') };
}
afterEach(async () => {
  for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true });
});

describe('durable state transaction boundary', () => {
  it('rejects a symlinked durable state file without reading or overwriting its target', async () => {
    const { dir, file } = await fixture();
    const target = path.join(dir, 'external.json');
    await writeFile(target, JSON.stringify({ count: 17 }));
    await symlink(target, file);
    await expect(readDurableState(file, () => ({ count: 0 }))).rejects.toThrow();
    await expect(mutateDurableState(file, () => ({ count: 0 }), state => { state.count++; })).rejects.toThrow();
    expect(JSON.parse(await readFile(target, 'utf8'))).toEqual({ count: 17 });
  });

  it('rejects hardlinked durable state before a mutation', async () => {
    const { dir, file } = await fixture();
    const target = path.join(dir, 'external.json');
    await writeFile(target, JSON.stringify({ count: 21 }));
    await link(target, file);
    await expect(readDurableState(file, () => ({ count: 0 }))).rejects.toThrow('DURABLE_STATE_UNSAFE_FILE');
    await expect(mutateDurableState(file, () => ({ count: 0 }), state => { state.count++; })).rejects.toThrow('DURABLE_STATE_UNSAFE_FILE');
    expect(JSON.parse(await readFile(target, 'utf8'))).toEqual({ count: 21 });
  });

  it('commits an atomic, readable snapshot with restrictive file permissions', async () => {
    const { file } = await fixture();
    const result = await mutateDurableState(file, () => ({ count: 0 }), state => {
      state.count += 1;
      return state.count;
    });
    expect(result).toBe(1);
    expect(await readDurableState(file, () => ({ count: 0 }))).toEqual({ count: 1 });
    if (process.platform !== 'win32') {
      expect((await stat(file)).mode & 0o777).toBe(0o600);
    }
  });

  it('does not persist state or leave a lock if the mutation fails', async () => {
    const { file } = await fixture();
    await writeFile(file, JSON.stringify({ count: 5 }));
    await expect(mutateDurableState(file, () => ({ count: 0 }), state => {
      state.count = 99;
      throw new Error('INTENTIONAL_ABORT');
    })).rejects.toThrow('INTENTIONAL_ABORT');
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ count: 5 });
    await expect(stat(file + '.lock')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses to steal an old lock even if its timestamp suggests it is stale', async () => {
    const { file } = await fixture();
    await mkdir(file + '.lock');
    await expect(mutateDurableState(file, () => ({ count: 0 }), state => {
      state.count++;
    })).rejects.toThrow('DURABLE_STATE_LOCK_UNAVAILABLE');
    await expect(stat(file + '.lock')).resolves.toBeDefined();
    await expect(stat(file)).rejects.toMatchObject({ code: 'ENOENT' });
  }, 15000);

  it('rejects Promise-returning callbacks without persisting speculative state', async () => {
    const { file } = await fixture();
    await writeFile(file, JSON.stringify({ count: 5 }));
    const original = await readFile(file, 'utf8');
    await expect(mutateDurableState(file, () => ({ count: 0 }), async state => {
      state.count = 99;
      return state.count;
    })).rejects.toThrow('DURABLE_STATE_ASYNC_MUTATION_UNSUPPORTED');
    expect(await readFile(file, 'utf8')).toBe(original);
    await expect(stat(file + '.lock')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects custom thenables before writing a new snapshot', async () => {
    const { file } = await fixture();
    await expect(mutateDurableState(file, () => ({ count: 0 }), state => {
      state.count = 7;
      return { then: (_resolve: unknown) => undefined };
    })).rejects.toThrow('DURABLE_STATE_ASYNC_MUTATION_UNSUPPORTED');
    await expect(stat(file)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(stat(file + '.lock')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('serializes overlapping transactions without dropping an update', async () => {
    const { file } = await fixture();
    await Promise.all(Array.from({ length: 8 }, () =>
      mutateDurableState(file, () => ({ count: 0 }), state => {
        state.count++;
      })
    ));
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ count: 8 });
  });
});
