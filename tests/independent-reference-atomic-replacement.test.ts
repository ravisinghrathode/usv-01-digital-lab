import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readIndependentReferenceBytes } from '../src/core/verification/IndependentReferenceReader.ts';

const cleanup: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of cleanup.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('independent reference file identity during reads', () => {
  it('fails closed if the named reference is atomically replaced while its original descriptor remains readable', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-reference-swap-'));
    cleanup.push(root);
    const base = path.join(root, 'evidence', 'independent');
    fs.mkdirSync(base, { recursive: true });
    const named = path.join(base, 'reference.txt');
    const moved = path.join(base, 'original.txt');
    fs.writeFileSync(named, 'original independent reference');
    const originalRead = fs.readSync.bind(fs) as (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ) => number;
    let injected = false;
    vi.spyOn(fs, 'readSync').mockImplementation(((
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ): number => {
      const count = originalRead(fd, buffer, offset, length, position);
      if (!injected) {
        injected = true;
        fs.renameSync(named, moved);
        fs.writeFileSync(named, 'replacement independent reference');
      }
      return count;
    }) as typeof fs.readSync);
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')).toBe(null);
    expect(injected).toBe(true);
    vi.restoreAllMocks();
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')?.toString())
      .toBe('replacement independent reference');
  });
});
