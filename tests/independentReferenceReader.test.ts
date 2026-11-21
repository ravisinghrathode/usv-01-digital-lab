import { afterEach, describe, expect, it } from 'vitest';
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

  it('refuses relative traversal, absolute paths and malformed evidence names', () => {
    const { root } = setup();
    for (const name of [
      '/etc/passwd', 'evidence/independent/../outside.txt',
      'evidence/independent/../../README.md',
      'evidence/independent/./reference.txt',
      'evidence/independent//reference.txt',
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
