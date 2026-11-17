import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
      'evidence\\independent\\reference.txt'
    ]) expect(readIndependentReferenceBytes(root, name)).toBe(null);
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

  it('rejects hardlinked or zero-byte apparent reference evidence', () => {
    const { root, base, file } = setup();
    const alias = path.join(base, 'alias.txt');
    fs.linkSync(file, alias);
    expect(readIndependentReferenceBytes(root, 'evidence/independent/reference.txt')).toBe(null);
    expect(readIndependentReferenceBytes(root, 'evidence/independent/alias.txt')).toBe(null);
    fs.writeFileSync(path.join(base, 'empty.txt'), '');
    expect(readIndependentReferenceBytes(root, 'evidence/independent/empty.txt')).toBe(null);
  });

  it('routes signed engineering review artifact lookups through the safe reader', () => {
    const source = fs.readFileSync(path.join(process.cwd(),
      'src/core/verification/EngineeringCampaignAcceptance.ts'), 'utf8');
    expect(source).toContain('readIndependentReferenceBytes(');
    expect(source).not.toContain('hashBytes(fs.readFileSync(artifactPath))');
  });
});
