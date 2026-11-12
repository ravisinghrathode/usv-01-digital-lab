/**
 * Live commissioning is opt-in and never enabled by PR workflows.
 * Environment:
 * RELEASE_COMMIT_SHA / GITHUB_SHA, USV_DEPLOYMENT_ORIGIN,
 * LAB_SESSION_TOKEN, GOOGLE_DRIVE_ACCESS_TOKEN,
 * GOOGLE_DRIVE_FOLDER_ID, OBSIDIAN_VAULT_PATH.
 */
import fs from 'node:fs';
import path from 'node:path';
import { probeDeployedLab, probeGoogleDrive } from '../src/core/verification/LiveIntegrationProbes.ts';
import { probeObsidianVault } from '../src/core/verification/VaultProbe.ts';

async function main() {
  const baselineSha = process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || '';
  if (!/^[a-f0-9]{40}$/.test(baselineSha)) {
    throw new Error('Set RELEASE_COMMIT_SHA to the exact approved 40-character source revision');
  }
  const deployment = await probeDeployedLab({
    origin: process.env.USV_DEPLOYMENT_ORIGIN,
    baselineSha,
    sessionToken: process.env.LAB_SESSION_TOKEN
  });
  const drive = await probeGoogleDrive({
    accessToken: process.env.GOOGLE_DRIVE_ACCESS_TOKEN,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    baselineSha
  });
  const vault = probeObsidianVault({
    vaultPath: process.env.OBSIDIAN_VAULT_PATH,
    baselineSha
  });
  const report = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    baselineSha,
    scope: 'Authenticated smoke observations, not independent certification',
    probes: [deployment, drive, vault],
    fullyIndependentlyVerified: false,
    engineeringReleaseApproved: false
  };
  const out = path.resolve('governance/reports/live-commissioning.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  // A missing optional integration is not a software build failure.
  const failed = report.probes.some(p => p.status === 'LIVE_PROBE_FAILED');
  const required = process.argv.includes('--require-all');
  if (failed || (required && report.probes.some(p => p.status !== 'LIVE_PROBE_PASSED_UNATTESTED'))) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('Commissioning preflight failed:', error instanceof Error ? error.message : 'unknown failure');
  process.exitCode = 1;
});
