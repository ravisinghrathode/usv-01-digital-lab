/**
 * Reproducible acceptance campaign.
 *
 * npm run acceptance:campaign
 * npm run acceptance:campaign -- --baseline-sha <40-hex> --evidence-file references/evidence.json --benchmark-file references/measurements.json
 * npm run acceptance:campaign -- --resistance-propulsion-file references/res01-evidence.json
 * npm run acceptance:campaign -- --require-approved
 *
 * Parsing evidence is not authenticating attestations or certifying naval physics.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runAcceptanceCampaign, acceptanceCampaignMarkdown } from '../src/core/verification/AcceptanceCampaign.ts';
import { parseAcceptanceEvidence, parseReferenceMeasurements } from '../src/core/verification/AcceptanceInputParser.ts';
import { parseEvidenceDecisionInput } from '../src/core/verification/EvidenceDecisionGate.ts';

const args = process.argv.slice(2);
const argument = (name: string): string | undefined => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing value for ' + name);
  return args[i + 1];
};
const readJson = (filePath: string): unknown => {
  const resolved = path.resolve(filePath);
  const metadata = fs.statSync(resolved);
  if (metadata.size > 2 * 1024 * 1024) throw new Error('Evidence file exceeds 2 MiB: ' + resolved);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
};

try {
  const outDir = path.resolve(argument('--out-dir') || 'governance/reports');
  const baselineSha = argument('--baseline-sha') || process.env.GITHUB_SHA || process.env.RELEASE_COMMIT_SHA || '';
  const evidencePath = argument('--evidence-file');
  const benchmarkPath = argument('--benchmark-file');
  const configurationPath = argument('--configuration-evidence') || 'governance/evidence/USV01_GATE0_SEED.json';
  const resistancePropulsionPath = argument('--resistance-propulsion-file');
  const evidence = evidencePath ? parseAcceptanceEvidence(readJson(evidencePath)) : [];
  const benchmarkMeasurements = benchmarkPath ? parseReferenceMeasurements(readJson(benchmarkPath)) : [];
  const evidenceDecisionInput = parseEvidenceDecisionInput(readJson(configurationPath));
  const resistancePropulsionEvidence = resistancePropulsionPath ? readJson(resistancePropulsionPath) : undefined;
  const report = runAcceptanceCampaign({
    baselineSha,
    evidence,
    benchmarkMeasurements,
    evidenceDecisionInput,
    resistancePropulsionEvidence,
  });
  const markdown = acceptanceCampaignMarkdown(report);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'acceptance-campaign.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'acceptance-campaign.md'), markdown);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n' + markdown + '\n');
  }
  console.log(markdown);
  if (!report.structurallyValid || report.missingCriteria.length || !report.baselineValid ||
    (args.includes('--require-approved') && !report.releaseApproved)) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Acceptance campaign input rejected:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
