import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readIndependentReferenceBytes } from '../src/core/verification/IndependentReferenceReader.ts';

const folders: string[] = [];
afterEach(() => {
  for (const dir of folders.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-independent-review-'));
  folders.push(root);
  const base = path.join(root, 'evidence', 'independent');
  fs.mkdirSync(base, { recursive: true });
  const file = path.join(base, 'reference.txt');
  fs.writeFileSync(file, 'Verified reference fixture only\n');
  return { root, base, file };
}

describe('independent engineering reference evidence path isolation', () => {
  it('reads a bounded regular file under the trusted evidence directory', () => {
    const { root } = setup();
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')?.toString())
      .toBe('Verified reference fixture only\n');
  });

  it('fails closed for malformed runtime checkout roots instead of throwing', () => {
    const { root } = setup();
    const evidence = 'evidence/independent/reference.txt';
    for (const invalidRoot of [undefined, null, 0, 42, false, {}, [], ' ', '\t']) {
      expect(() => readIndependentReferenceBytes(invalidRoot as string, evidence)).not.toThrow();
      expect(readIndependentReferenceBytes(invalidRoot as string, evidence)).toBe(null);
    }
    expect(readIndependentReferenceBytes(root, evidence)?.toString())
      .toBe('Verified reference fixture only\\n');
  });

  it('refuses relative traversal, absolute paths and malformed evidence names', () => {
    const { root } = setup();
    for (const name of [
      '/etc/passwd', 'evidence/independent/../outside.txt',
      'evidence/independent/../../README.md',
      'evidence/independent/./reference.txt',
      'evidence/independent//reference.txt',
      'evidence/independent/reference.txt.',
      'evidence/independent/reference.txt ',
      'evidence/independent/re\u0301ference.txt',
      'evidence/independent/reference.txt\n',
      'evidence/independent/reference.txt\r',
      'evidence/independent/\u202ereference.txt',
      'evidence/independent/\u2066reference\u2069.txt',
      'evidence/independent/\tfixture.txt',
      'evidence\\independent\\reference.txt'
    ]) expect(readIndependentReferenceBytes(root, name)).toBe(null);
  });

  it('bounds untrusted evidence path length and component count before filesystem traversal', () => {
    const { root } = setup();
    const prefix = 'evidence/independent/';
    expect(readIndependentReferenceBytes(root, prefix + 'x'.repeat(4096))).toBe(null);
    expect(readIndependentReferenceBytes(root, prefix + 'a/'.repeat(129) + 'reference.txt'))
      .toBe(null);
    expect(readIndependentReferenceBytes(root, prefix + 'reference.txt')?.toString())
      .toBe('Verified reference fixture only\n');
  });

  it('refuses final symlinks and redirected evidence subfolders', () => {
    const { root, base, file } = setup();
    fs.symlinkSync(file, path.join(base, 'link.txt'));
    expect(readIndependentReferenceBytes(root, 'evidence/independent/link.txt')).toBe(null);
    const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-outside-evidence-'));
    folders.push(outer);
    fs.writeFileSync(path.join(outer, 'outside.txt'), 'Private file placeholder');
    fs.symlinkSync(outer, path.join(base, 'redirected'));
    expect(readIndependentReferenceBytes(root, 'evidence/independent/redirected/outside.txt'))
      .toBe(null);
  });

  it('rejects a symlinked checkout trust root even when its target has valid evidence', () => {
    const { root } = setup();
    const aliasParent = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-root-alias-'));
    folders.push(aliasParent);
    const alias = path.join(aliasParent, 'checkout');
    fs.symlinkSync(root, alias, 'dir');
    expect(readIndependentReferenceBytes(alias, 'evidence/independent/reference.txt'))
      .toBe(null);
    // A direct, non-symlink checkout continues to work.
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')?.toString())
      .toBe('Verified reference fixture only\n');
  });

  it('rejects a checkout nested beneath a symlinked ancestor', () => {
    const { root } = setup();
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'usv01-ancestor-alias-'));
    folders.push(parent);
    const alias = path.join(parent, 'redirect');
    fs.symlinkSync(path.dirname(root), alias, 'dir');
    const checkout = path.join(alias, path.basename(root));
    expect(fs.lstatSync(checkout).isDirectory()).toBe(true);
    expect(readIndependentReferenceBytes(checkout, 'evidence/independent/reference.txt'))
      .toBe(null);
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')?.toString())
      .toBe('Verified reference fixture only\n');
  });

  it('rejects an ancestor that becomes a symlink during the descriptor read', () => {
    const { root } = setup();
    const ancestor = path.dirname(root);
    const originalRead = fs.readSync.bind(fs);
    const originalLstat = fs.lstatSync.bind(fs);
    let readStarted = false;
    const readSpy = vi.spyOn(fs, 'readSync').mockImplementation(((...args: Parameters<typeof fs.readSync>) => {
      const count = (originalRead as (...args: Parameters<typeof fs.readSync>) => number)(...args);
      readStarted = true;
      return count;
    }) as typeof fs.readSync);
    const statSpy = vi.spyOn(fs, 'lstatSync').mockImplementation(((pathname: fs.PathLike, ...args: unknown[]) => {
      const stat = (originalLstat as (...args: unknown[]) => fs.Stats)(pathname, ...args);
      if (readStarted && String(pathname) === ancestor) {
        return Object.assign(Object.create(Object.getPrototypeOf(stat)), stat, {
          isSymbolicLink: () => true
        });
      }
      return stat;
    }) as typeof fs.lstatSync);
    try {
      expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')).toBe(null);
      expect(readStarted).toBe(true);
    } finally {
      statSpy.mockRestore();
      readSpy.mockRestore();
    }
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')?.toString())
      .toBe('Verified reference fixture only\n');
  });

  it('rejects evidence when the trusted checkout is replaced during a read', () => {
    const { root } = setup();
    const moved = root + '-moved';
    folders.push(moved);
    // Node's readSync overloads expose the options form to Vitest's mock typing,
    // while the verifier intentionally uses the five-argument positional form.
    // Preserve that runtime signature explicitly for the fault-injection test.
    const originalRead = fs.readSync.bind(fs) as (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ) => number;
    const injectedRead = (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ): number => {
      const count = originalRead(fd, buffer, offset, length, position);
      fs.renameSync(root, moved);
      fs.mkdirSync(root);
      return count;
    };
    const spy = vi.spyOn(fs, 'readSync').mockImplementation(injectedRead as typeof fs.readSync);
    try {
      expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt'))
        .toBe(null);
    } finally {
      spy.mockRestore();
    }
  });

  it('rejects evidence when the independent base directory is replaced during a read', () => {
    const { root, base } = setup();
    const moved = base + '-moved';
    const originalRead = fs.readSync.bind(fs) as (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ) => number;
    const injectedRead = (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ): number => {
      const count = originalRead(fd, buffer, offset, length, position);
      fs.renameSync(base, moved);
      fs.mkdirSync(base);
      fs.writeFileSync(path.join(base, 'reference.txt'), 'Replacement evidence fixture');
      return count;
    };
    const spy = vi.spyOn(fs, 'readSync').mockImplementation(injectedRead as typeof fs.readSync);
    try {
      expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt'))
        .toBe(null);
    } finally {
      spy.mockRestore();
    }
  });

  it('rejects evidence when a nested evidence directory is replaced during a read', () => {
    const { root, base } = setup();
    const nested = path.join(base, 'nested');
    fs.mkdirSync(nested);
    fs.writeFileSync(path.join(nested, 'reference.txt'), 'Nested reference fixture');
    const moved = nested + '-moved';
    const originalRead = fs.readSync.bind(fs) as (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ) => number;
    const injectedRead = (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ): number => {
      const count = originalRead(fd, buffer, offset, length, position);
      fs.renameSync(nested, moved);
      fs.mkdirSync(nested);
      fs.writeFileSync(path.join(nested, 'reference.txt'), 'Nested replacement fixture');
      return count;
    };
    const spy = vi.spyOn(fs, 'readSync').mockImplementation(injectedRead as typeof fs.readSync);
    try {
      expect(readIndependentReferenceBytes(root, 'evidence/independent/nested/reference.txt'))
        .toBe(null);
    } finally {
      spy.mockRestore();
    }
  });

  it('rejects a final evidence pathname swapped to a symlink during descriptor reading', () => {
    const { root, base, file } = setup();
    const replacement = path.join(base, 'replacement.txt');
    fs.writeFileSync(replacement, 'Untrusted replacement');
    const moved = file + '-original';
    const originalRead = fs.readSync.bind(fs) as (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ) => number;
    let injected = false;
    const spy = vi.spyOn(fs, 'readSync').mockImplementation(((
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ): number => {
      const count = originalRead(fd, buffer, offset, length, position);
      if (!injected) {
        injected = true;
        fs.renameSync(file, moved);
        fs.symlinkSync(replacement, file);
      }
      return count;
    }) as typeof fs.readSync);
    try {
      expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')).toBe(null);
      expect(injected).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it('rejects evidence modified in place while a descriptor is being read', () => {
    const { root, file } = setup();
    const originalRead = fs.readSync.bind(fs) as (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ) => number;
    let injected = false;
    const injectedRead = (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ): number => {
      const count = originalRead(fd, buffer, offset, length, position);
      if (!injected) {
        injected = true;
        fs.appendFileSync(file, 'Concurrent modification');
      }
      return count;
    };
    const spy = vi.spyOn(fs, 'readSync').mockImplementation(injectedRead as typeof fs.readSync);
    try {
      expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt'))
        .toBe(null);
    } finally {
      spy.mockRestore();
    }
    expect(injected).toBe(true);
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')?.toString())
      .toContain('Concurrent modification');
  });

  it('rejects a reference hardlinked concurrently during descriptor reading', () => {
    const { root, base, file } = setup();
    const alias = path.join(base, 'concurrent-hardlink.txt');
    const originalRead = fs.readSync.bind(fs) as (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ) => number;
    let injected = false;
    const injectedRead = (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ): number => {
      const count = originalRead(fd, buffer, offset, length, position);
      if (!injected) {
        injected = true;
        fs.linkSync(file, alias);
      }
      return count;
    };
    const spy = vi.spyOn(fs, 'readSync').mockImplementation(injectedRead as typeof fs.readSync);
    try {
      expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')).toBe(null);
    } finally {
      spy.mockRestore();
    }
    expect(injected).toBe(true);
    fs.unlinkSync(alias);
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')?.toString())
      .toBe('Verified reference fixture only\n');
  });

  it('fails closed on a truncated descriptor read without accepting partial evidence', () => {
    const { root } = setup();
    const originalRead = fs.readSync.bind(fs) as (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ) => number;
    let calls = 0;
    const injectedRead = (
      fd: number, buffer: Buffer, offset: number, length: number, position: number | null
    ): number => {
      calls += 1;
      if (calls === 1) return originalRead(fd, buffer, offset, Math.min(3, length), position);
      return 0; // Simulated premature EOF after a partial read.
    };
    const spy = vi.spyOn(fs, 'readSync').mockImplementation(injectedRead as typeof fs.readSync);
    try {
      expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')).toBe(null);
      expect(calls).toBe(2);
    } finally {
      spy.mockRestore();
    }
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')?.toString())
      .toBe('Verified reference fixture only\n');
  });

  it('rejects hardlinked or zero-byte apparent reference evidence', () => {
    const { root, base, file } = setup();
    const alias = path.join(base, 'alias.txt');
    fs.linkSync(file, alias);
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')).toBe(null);
    expect(readIndependentReferenceBytes(root, 'evidence/independent/alias.txt')).toBe(null);
    fs.writeFileSync(path.join(base, 'empty.txt'), '');
    expect(readIndependentReferenceBytes(root, 'evidence/independent/empty.txt')).toBe(null);
  });


  it('rejects a non-directory checkout root and non-directory evidence parent', () => {
    const { root, base } = setup();
    const ordinary = path.join(root, 'ordinary.txt');
    fs.writeFileSync(ordinary, 'not a checkout');
    expect(readIndependentReferenceBytes(ordinary, 'evidence/independent/reference.txt'))
      .toBe(null);
    fs.writeFileSync(path.join(base, 'not-a-directory'), 'file');
    expect(readIndependentReferenceBytes(root, 'evidence/independent/not-a-directory/child.txt'))
      .toBe(null);
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')?.toString())
      .toBe('Verified reference fixture only\n');
  });

  it('refuses oversized files and directory references', () => {
    const { root, base } = setup();
    const large = path.join(base, 'oversized.bin');
    fs.writeFileSync(large, 'x');
    fs.truncateSync(large, 5 * 1024 * 1024 + 1);
    expect(readIndependentReferenceBytes(root, 'evidence/independent/oversized.bin')).toBe(null);
    expect(readIndependentReferenceBytes(root, 'evidence/independent')).toBe(null);
    fs.mkdirSync(path.join(base, 'directory'));
    expect(readIndependentReferenceBytes(root, 'evidence/independent/directory')).toBe(null);
  });

  it('rejects a named pipe without opening it as blocking evidence', () => {
    if (process.platform === 'win32') return;
    const { root, base } = setup();
    const fifo = path.join(base, 'pipe');
    try {
      execFileSync('mkfifo', [fifo], { timeout: 2000 });
    } catch {
      // Some restricted CI hosts do not provide mkfifo.
      return;
    }
    expect(readIndependentReferenceBytes(root, 'evidence/independent/pipe')).toBe(null);
  });

  it('routes signed engineering review artifact lookups through the safe reader', () => {
    const source = fs.readFileSync(path.join(process.cwd(),
      'src/core/verification/EngineeringCampaignAcceptance.ts'), 'utf8');
    expect(source).toContain('readIndependentReferenceBytes(');
    expect(source).not.toContain('hashBytes(fs.readFileSync(artifactPath))');
  });
});
