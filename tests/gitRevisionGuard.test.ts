import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertPinnedCleanGitRevision } from '../src/core/mission-control/GitRevisionGuard.ts';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

describe('Mission Control Git revision guard', () => {
  it('accepts only a clean working tree at the exact requested commit', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'usv-revision-guard-'));
    try {
      git(dir, ['init']);
      git(dir, ['config', 'user.email', 'test@example.invalid']);
      git(dir, ['config', 'user.name', 'USV Test']);
      await writeFile(path.join(dir, 'tracked.txt'), 'baseline\n');
      git(dir, ['add', 'tracked.txt']);
      git(dir, ['commit', '-m', 'baseline']);
      const sha = git(dir, ['rev-parse', 'HEAD']);

      await expect(assertPinnedCleanGitRevision(dir, sha)).resolves.toMatchObject({
        resolvedCommit: sha,
        headCommit: sha,
        clean: true
      });

      await writeFile(path.join(dir, 'tracked.txt'), 'modified\n');
      await expect(assertPinnedCleanGitRevision(dir, sha)).rejects.toThrow(/tracked modifications/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects a requested commit that is not HEAD', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'usv-revision-guard-'));
    try {
      git(dir, ['init']);
      git(dir, ['config', 'user.email', 'test@example.invalid']);
      git(dir, ['config', 'user.name', 'USV Test']);
      await writeFile(path.join(dir, 'tracked.txt'), 'one\n');
      git(dir, ['add', 'tracked.txt']);
      git(dir, ['commit', '-m', 'one']);
      const first = git(dir, ['rev-parse', 'HEAD']);
      await writeFile(path.join(dir, 'tracked.txt'), 'two\n');
      git(dir, ['add', 'tracked.txt']);
      git(dir, ['commit', '-m', 'two']);

      await expect(assertPinnedCleanGitRevision(dir, first)).rejects.toThrow(/does not match/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
