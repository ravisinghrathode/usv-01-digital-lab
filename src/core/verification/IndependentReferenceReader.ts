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
      !relativePath.startsWith('evidence/independent/') ||
      relativePath.includes('\\') || relativePath.includes('\0')) {
    return null;
  }
  const components = relativePath.split('/');
  if (components.some(segment => !segment || segment === '.' || segment === '..')) return null;
  const root = path.resolve(referenceRootDir);
  const acceptedBase = path.resolve(root, 'evidence', 'independent');
  const candidate = path.resolve(root, relativePath);
  if (!candidate.startsWith(acceptedBase + path.sep)) return null;

  try {
    // A separately trusted checkout root must not redirect its accepted
    // evidence directory outside the checkout through a symbolic link.
    // The checkout root itself must not be a symlink: otherwise a caller
    // can redirect the entire trust root before evidence validation.
    if (!fs.lstatSync(root).isDirectory()) return null;
    const realRoot = fs.realpathSync(root);
    const realBase = fs.realpathSync(acceptedBase);
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
    // Refuse special files before opening; O_NONBLOCK also prevents a FIFO\n    // swapped into place after lstat from hanging the verifier on open.\n    const beforeOpen = fs.lstatSync(candidate);\n    if (!beforeOpen.isFile() || beforeOpen.nlink !== 1) return null;\n    const fd = fs.openSync(candidate, fs.constants.O_RDONLY |\n      (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
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
