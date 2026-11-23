/**
 * Private, crash-safe, cross-process JSON state. One short-lived mkdir lock
 * serializes read-modify-write. An interrupted write never replaces prior data.
 * Corrupt state fails closed; it is never silently reset or overwritten.
 */
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import path from 'node:path';

export async function readDurableState<T>(file: string, empty: () => T): Promise<T> {
  try {
    // O_NOFOLLOW prevents a symlinked state file from redirecting reads to
    // unrelated secrets or attacker-controlled JSON. Check the opened inode.
    const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const metadata = await handle.stat();
      if (!metadata.isFile() || metadata.nlink !== 1) throw new Error('DURABLE_STATE_UNSAFE_FILE');
      return JSON.parse(await handle.readFile('utf8')) as T;
    } finally {
      await handle.close();
    }
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
      // A stale timestamp is NOT proof of owner death: a live worker may
      // legitimately hold this lock while its disk stalls. Never delete an
      // unowned lock and create overlapping read-modify-write transactions.
      // A crash requires operator-controlled lock recovery after process
      // identity and filesystem state have been independently inspected.
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  if (!acquired) throw new Error('DURABLE_STATE_LOCK_UNAVAILABLE: ' + file);
  try {
    const current = await readDurableState(file, empty);
    const outcome = apply(current);
    // A transaction callback must finish synchronously while this lock is held.
    // Otherwise late asynchronous writes could mutate state after persistence.
    if (outcome !== null && (typeof outcome === 'object' || typeof outcome === 'function') && typeof (outcome as { then?: unknown }).then === 'function') {
      throw new Error('DURABLE_STATE_ASYNC_MUTATION_UNSUPPORTED');
    }
    const tmp = file + '.tmp-' + randomUUID();
    try {
      const handle = await open(tmp, 'wx', 0o600);
      try {
        await handle.writeFile(JSON.stringify(current, null, 2) + '\n', 'utf8');
        // Atomic rename alone does not ensure the new contents survive power loss.
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(tmp, file);
      // Persist the directory entry update as well as the file contents.
      // If fsync is unsupported, fail rather than report a durable commit.
      const directory = await open(path.dirname(file), 'r');
      try {
        await directory.sync();
      } finally {
        await directory.close();
      }
    } finally {
      await rm(tmp, { force: true });
    }
    return outcome;
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}
