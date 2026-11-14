/**
 * Private, crash-safe, cross-process JSON state. One short-lived mkdir lock
 * serializes read-modify-write. An interrupted write never replaces prior data.
 * Corrupt state fails closed; it is never silently reset or overwritten.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function readDurableState<T>(file: string, empty: () => T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return empty();
    throw new Error('Durable state unreadable at ' + file + ': ' + (error?.message || String(error)));
  }
}

export async function mutateDurableState<T, R>(
  file: string,
  empty: () => T,
  apply: (state: T) => R
): Promise<R> {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const lock = file + '.lock';
  let acquired = false;
  for (let i = 0; i < 80; i++) {
    try {
      await mkdir(lock, { mode: 0o700 });
      acquired = true;
      break;
    } catch (error: any) {
      if (error?.code !== 'EEXIST') throw error;
      // Lock acquisition is a short disk-only critical section. If a process
      // dies before removing its lock, a later worker can recover it.
      try {
        const metadata = await stat(lock);
        if (Date.now() - metadata.mtimeMs > 120_000) {
          await rm(lock, { recursive: true, force: true });
        }
      } catch (statError: any) {
        if (statError?.code !== 'ENOENT') throw statError;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  if (!acquired) throw new Error('DURABLE_STATE_LOCK_UNAVAILABLE: ' + file);
  try {
    const current = await readDurableState(file, empty);
    const outcome = apply(current);
    const tmp = file + '.tmp-' + randomUUID();
    try {
      await writeFile(tmp, JSON.stringify(current, null, 2) + '\n', {
        encoding: 'utf8', mode: 0o600, flag: 'wx'
      });
      await rename(tmp, file);
    } finally {
      await rm(tmp, { force: true });
    }
    return outcome;
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}
