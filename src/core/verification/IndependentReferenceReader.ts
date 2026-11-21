import fs from 'node:fs';
import path from 'node:path';

const MAX_REFERENCE_BYTES = 5 * 1024 * 1024;

/**
 * Only read small, source-controlled ordinary files rooted under the vetted
 * independent-evidence directory. Reject all symlinks in every component,
 * traversal, hardlinked final files and swapped/unreadable content.
 *
 * A successful read is NOT reviewer authorization or engineering acceptance.
 */
export function readIndependentReferenceBytes(
  referenceRootDir: string | undefined, relativePath: string
): Buffer | null {
  if (!referenceRootDir || typeof relativePath !== 'string' ||
      relativePath.length > 4096 ||
      !relativePath.startsWith('evidence/independent/') ||
      relativePath.includes('\\') || relativePath.includes('\0') || /[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(relativePath)) {
    return null;
  }
  const components = relativePath.split('/');
  // Bound untrusted path complexity before synchronous filesystem traversal.
  if (components.length > 128 ||
      components.some(segment => !segment || segment === '.' || segment === '..' ||
        segment !== segment.normalize('NFC') || /[. ]$/u.test(segment))) return null;
  const root = path.resolve(referenceRootDir);
  const acceptedBase = path.resolve(root, 'evidence', 'independent');
  const candidate = path.resolve(root, relativePath);
  if (!candidate.startsWith(acceptedBase + path.sep)) return null;

  try {
    // A separately trusted checkout root must not redirect its accepted
    // evidence directory outside the checkout through a symbolic link.
    // The checkout root itself must not be a symlink: otherwise a caller
    // can redirect the entire trust root before evidence validation.
    const rootBefore = fs.lstatSync(root);
    if (!rootBefore.isDirectory()) return null;
    const realRoot = fs.realpathSync(root);
    const realBase = fs.realpathSync(acceptedBase);
    const baseBefore = fs.lstatSync(acceptedBase);
    if (!baseBefore.isDirectory()) return null;
    if (realBase !== path.join(realRoot, 'evidence', 'independent')) return null;
    let entry = root;
    for (const component of components) {
      entry = path.join(entry, component);
      const componentStat = fs.lstatSync(entry);
      if (componentStat.isSymbolicLink()) return null;
      if (entry !== candidate && !componentStat.isDirectory()) return null;
    }
    const realFile = fs.realpathSync(candidate);
    if (!realFile.startsWith(realBase + path.sep)) return null;
    // Refuse special files before opening; O_NONBLOCK also prevents a FIFO
    // swapped into place after lstat from hanging the verifier on open.
    const beforeOpen = fs.lstatSync(candidate);
    if (!beforeOpen.isFile() || beforeOpen.nlink !== 1) return null;
    const fd = fs.openSync(candidate, fs.constants.O_RDONLY |
      (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
    try {
      const st = fs.fstatSync(fd);
      // Bind the opened descriptor to the validated pathname: O_NOFOLLOW
      // protects only the final component, not swapped parent directories.
      const named = fs.lstatSync(candidate);
      if (named.isSymbolicLink() || named.dev !== st.dev || named.ino !== st.ino) return null;
      if (!st.isFile() || st.nlink !== 1 ||
          st.size < 1 || st.size > MAX_REFERENCE_BYTES) return null;
      const bytes = Buffer.alloc(st.size);
      let read = 0;
      while (read < bytes.length) {
        const consumed = fs.readSync(fd, bytes, read, bytes.length - read, read);
        if (consumed < 1) return null;
        read += consumed;
      }
      const after = fs.fstatSync(fd);
      // Revalidate the pathname after reading to catch parent replacement
      // during the read. This narrows, but cannot eliminate, TOCTOU races.
      // A renamed checkout or swapped evidence parent must not be accepted
      // merely because the final file descriptor still names the old inode.
      const rootAfter = fs.lstatSync(root);
      if (!rootAfter.isDirectory() || rootAfter.dev !== rootBefore.dev ||
          rootAfter.ino !== rootBefore.ino || fs.realpathSync(root) !== realRoot ||
          fs.realpathSync(acceptedBase) !== realBase) return null;
      const baseAfter = fs.lstatSync(acceptedBase);
      if (!baseAfter.isDirectory() || baseAfter.dev !== baseBefore.dev ||
          baseAfter.ino !== baseBefore.ino) return null;
      if (fs.realpathSync(candidate) !== realFile) return null;
      const namedAfter = fs.lstatSync(candidate);
      if (namedAfter.isSymbolicLink() || namedAfter.dev !== st.dev || namedAfter.ino !== st.ino) return null;
      if (after.dev !== st.dev || after.ino !== st.ino ||
          after.size !== st.size || after.mtimeMs !== st.mtimeMs ||
          after.ctimeMs !== st.ctimeMs) return null;
      return bytes;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
}
