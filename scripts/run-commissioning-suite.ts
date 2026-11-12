/**
 * USV-01 comprehensive commissioning runner.
 *
 * npm run acceptance:commission -- --baseline-sha <40-hex>
 * Optional evidence sources:
 *   --agent-cases path.json --benchmark-file path.json
 *   --safety-cases path.json --marine-cases path.json --evidence-file path.json
 * Optional authenticated smoke checks: --run-integrations (requires credentials)
 *
 * Automated software checks are distinct from human engineering certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runAcceptanceCampaign } from '../src/core/verification/AcceptanceCampaign.ts';
import { parseAcceptanceEvidence, parseReferenceMeasurements } from '../src/core/verification/AcceptanceInputParser.ts';
import { parseSafetyCases, parseMarineCases } from '../src/core/verification/CommissioningCaseParser.ts';
import { evaluateSafetyScenarios } from '../src/core/verification/SafetyScenarioSuite.ts';
import { evaluateMarineEnvelope } from '../src/core/verification/MarineSystemsSuite.ts';
import { runLiveAgentMatrix } from '../src/core/verification/LiveAgentMatrix.ts';
import { probeDeployedLab, probeGoogleDrive, type ProbeResult } from '../src/core/verification/LiveIntegrationProbes.ts';
import { probeObsidianVault } from '../src/core/verification/VaultProbe.ts';
import type { AgentExecutionInput } from '../src/core/types/agent.ts';

const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error('Missing value for ' + name);
  return value;
}
function loadJson(name: string): unknown | undefined {
  const arg = flag(name);
  if (!arg) return undefined;
  const file = path.resolve(arg);
  if (fs.statSync(file).size > 2 * 1024 * 1024) throw new Error('Evidence file exceeds 2 MiB: ' + name);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
async function main() {
  const sha = flag('--baseline-sha') || process.env.GITHUB_SHA || process.env.RELEASE_COMMIT_SHA || '';
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Exact 40-hex baseline SHA required');
  const evidenceRaw = loadJson('--evidence-file');
  const benchmarkRaw = loadJson('--benchmark-file');
  const safetyRaw = loadJson('--safety-cases');
  const marineRaw = loadJson('--marine-cases');
  const agentRaw = loadJson('--agent-cases');

  const mainReport = runAcceptanceCampaign({
    baselineSha: sha,
    ...(evidenceRaw === undefined ? {} : { evidence: parseAcceptanceEvidence(evidenceRaw) }),
    ...(benchmarkRaw === undefined ? {} : { benchmarkMeasurements: parseReferenceMeasurements(benchmarkRaw) })
  });
  const safety = safetyRaw === undefined ? null : evaluateSafetyScenarios(parseSafetyCases(safetyRaw));
  const marine = marineRaw === undefined ? null : evaluateMarineEnvelope(parseMarineCases(marineRaw));
  const agents = agentRaw === undefined ? null : await runLiveAgentMatrix(agentRaw as Record<string, AgentExecutionInput>);
  let integrations: ProbeResult[] = [];
  if (args.includes('--run-integrations')) {
    integrations = [
      await probeDeployedLab({
        origin: process.env.USV_DEPLOYMENT_ORIGIN,
        sessionToken: process.env.LAB_SESSION_TOKEN, baselineSha: sha
      }),
      await probeGoogleDrive({
        accessToken: process.env.GOOGLE_DRIVE_ACCESS_TOKEN,
        folderId: process.env.GOOGLE_DRIVE_FOLDER_ID, baselineSha: sha
      }),
      probeObsidianVault({ vaultPath: process.env.OBSIDIAN_VAULT_PATH, baselineSha: sha })
    ];
  }
  const report = {
    schemaVersion: '2.0',
    generatedAt: new Date().toISOString(),
    baselineSha: sha,
    campaign: mainReport,
    agentMatrix: agents,
    safetyScenarioSuite: safety,
    marineEnvelopeSuite: marine,
    integrationProbes: integrations,
    independentlyValidated: false,
    productionApproved: false,
    missingInputs: [
      ...(!agentRaw ? ['26-agent live case file'] : []),
      ...(!benchmarkRaw ? ['validated numerical benchmark dataset'] : []),
      ...(!safetyRaw ? ['safety scenario dataset'] : []),
      ...(!marineRaw ? ['marine system measurements'] : []),
      ...(!args.includes('--run-integrations') ? ['authenticated live integration probe authorization'] : [])
    ],
    releaseReason: 'Human approval, physical data provenance, independent review, security assessment and production restore tests cannot be self-attested.'
  };
  const outDir = path.resolve('governance/reports');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'commissioning-suite.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = [
    '# USV-01 Commissioning Suite',
    '',
    'Baseline: ' + sha,
    'Software registry: ' + (mainReport.structurallyValid ? 'PASS' : 'FAIL'),
    'Agents with live provider runs: ' + (agents?.liveProviderRuns ?? 'NOT RUN') + '/26',
    'Safety simulation: ' + (safety?.simulatedSuitePass ?? 'NOT RUN'),
    'Marine envelope: ' + (marine?.numericEnvelopePass ?? 'NOT RUN'),
    'Engineering benchmarks: ' + mainReport.benchmark.status,
    'Live integration probes: ' + (integrations.length ? integrations.map(p => p.target + '=' + p.status).join(', ') : 'NOT RUN'),
    '**Release: NOT APPROVED; independent evidence required.**',
    ''
  ];
  fs.writeFileSync(path.join(outDir, 'commissioning-suite.md'), lines.join('\n'));
  console.log(lines.join('\n'));
  if (!mainReport.structurallyValid || mainReport.missingCriteria.length ||
      (safety && !safety.simulatedSuitePass) || (marine && !marine.numericEnvelopePass) ||
      (agents && !agents.providerOperationalMatrixComplete) ||
      integrations.some(p => p.status === 'LIVE_PROBE_FAILED') ||
      mainReport.benchmark.status === 'NUMERIC_FAIL' ||
      mainReport.benchmark.status === 'INVALID_REFERENCE_DATA' ||
      args.includes('--require-certified')) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('USV-01 commissioning failed:', err instanceof Error ? err.message : 'unknown');
  process.exitCode = 1;
});
