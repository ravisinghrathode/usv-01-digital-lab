import { execFileSync } from 'node:child_process';

export interface GitRevisionEvidence {
  requestedCommit: string;
  resolvedCommit: string;
  headCommit: string;
  clean: true;
}

/**
 * Fail closed unless Mission Control is operating on the exact requested commit
 * with no tracked working-tree modifications. Uses fixed git argv and no shell.
 */
export async function assertPinnedCleanGitRevision(
  workingDirectory: string,
  requestedCommit: string
): Promise<GitRevisionEvidence> {
  if (!/^[0-9a-f]{7,64}$/i.test(requestedCommit)) {
    throw new Error('Invalid commit SHA');
  }

  try {
    const run = (args: string[]): string =>
      execFileSync('git', args, {
        cwd: workingDirectory,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }).trim();

    const headCommit = run(['rev-parse', 'HEAD']);
    const resolvedCommit = run(['rev-parse', `${requestedCommit}^{commit}`]);
    const trackedChanges = run(['status', '--porcelain', '--untracked-files=no']);

    if (headCommit !== resolvedCommit) {
      throw new Error(
        `Working tree HEAD ${headCommit} does not match requested evidence commit ${resolvedCommit}`
      );
    }
    if (trackedChanges.length > 0) {
      throw new Error('Working tree has tracked modifications; evidence would not match the pinned commit');
    }

    return { requestedCommit, resolvedCommit, headCommit, clean: true };
  } catch (err: any) {
    const message = err?.message || String(err);
    if (
      message.includes('does not match requested evidence commit') ||
      message.includes('tracked modifications')
    ) {
      throw err;
    }
    throw new Error(`Unable to verify pinned Git revision: ${message}`);
  }
}
