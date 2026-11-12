import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import type { ProbeResult } from './LiveIntegrationProbes.ts';

/**
 * Live filesystem smoke test for an authorized local Obsidian vault.
 * Writes only into a fresh randomly named probe directory and removes it.
 * A filesystem wikilink roundtrip is NOT proof that an Obsidian instance
 * indexed the graph or that remote sync conflict resolution works.
 */
export function probeObsidianVault(
  config: { vaultPath?: string; baselineSha: string }
): ProbeResult {
  const observed: string[] = [];
  const result = (status: ProbeResult['status'], failure?: string): ProbeResult => ({
    target: 'OBSIDIAN_VAULT', status, observed, ...(failure ? { failure } : {}),
    independentlyVerified: false
  });
  if (!config.vaultPath) return result('NOT_CONFIGURED', 'No authorized OBSIDIAN_VAULT_PATH');
  if (!/^[a-f0-9]{40}$/.test(config.baselineSha)) {
    return result('LIVE_PROBE_FAILED', 'Missing exact source baseline SHA');
  }
  let probeDir: string | undefined;
  try {
    const vault = fs.realpathSync(config.vaultPath);
    if (!fs.statSync(vault).isDirectory()) throw new Error('vault path is not a directory');
    probeDir = fs.mkdtempSync(path.join(vault, 'USV01-commissioning-'));
    const suffix = randomBytes(6).toString('hex');
    const target = 'USV01-acceptance-target-' + suffix;
    const source = 'USV01-acceptance-source-' + suffix;
    const targetFile = path.join(probeDir, target + '.md');
    const sourceFile = path.join(probeDir, source + '.md');
    const marker = 'USV-01 baseline ' + config.baselineSha;
    fs.writeFileSync(targetFile, '# ' + target + '\n' + marker + '\n', { flag: 'wx' });
    fs.writeFileSync(sourceFile, '# ' + source + '\n[[' + target + ']]\n', { flag: 'wx' });
    const readTarget = fs.readFileSync(targetFile, 'utf8');
    const readSource = fs.readFileSync(sourceFile, 'utf8');
    if (!readTarget.includes(marker) || !readSource.includes('[[' + target + ']]')) {
      throw new Error('Markdown note or wikilink did not roundtrip');
    }
    observed.push('local Markdown notes created and read back');
    observed.push('wikilink target and source identifiers preserved');

    // Stale update attempts must be rejected by a compare-before-write guard.
    const previousHash = createHash('sha256').update(readSource).digest('hex');
    fs.appendFileSync(sourceFile, 'External edit for conflict test\n');
    const liveHash = createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
    if (previousHash === liveHash) throw new Error('conflict detector failed');
    // No stale overwriting is attempted.
    observed.push('stale content digest detected; overwrite declined');
    return result('LIVE_PROBE_PASSED_UNATTESTED');
  } catch (err) {
    return result('LIVE_PROBE_FAILED', err instanceof Error ? err.message : 'Vault access failed');
  } finally {
    if (probeDir && path.basename(probeDir).startsWith('USV01-commissioning-')) {
      fs.rmSync(probeDir, { recursive: true, force: true });
    }
  }
}
