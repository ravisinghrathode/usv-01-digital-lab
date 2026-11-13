/**
 * Run all 26 canonical specialists against a historical non-operational input
 * catalog. Subscription-authenticated live Codex runs are explicit opt-in.
 * No output from this script is certified vessel evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { compileCodexAgentCases } from '../src/core/verification/CodexMatrixInput.ts';
import { runLiveAgentMatrix } from '../src/core/verification/LiveAgentMatrix.ts';
import { preflightCodexAgentCases } from '../src/core/verification/CodexCampaignPreflight.ts';

async function main() {
  const sourcePath = path.resolve(
    process.argv.includes('--catalog')
      ? process.argv[process.argv.indexOf('--catalog') + 1]
      : 'evidence/live-agents/representative-cases.json'
  );
  if (fs.statSync(sourcePath).size > 2 * 1024 * 1024) throw new Error('Catalog too large');
  const catalog = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const cases = compileCodexAgentCases(catalog);
  const preflight = await preflightCodexAgentCases(cases);
  const preflightPath = path.resolve('governance/reports/codex-26-agent-preflight.json');
  fs.mkdirSync(path.dirname(preflightPath), { recursive: true });
  fs.writeFileSync(preflightPath, JSON.stringify({
    ...preflight, catalogClassification: catalog.dataClassification,
    illustrativeNonOperational: true, historicalCatalogBaseline: catalog.baselineSha
  }, null, 2) + '\n');

  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({
      status: preflight.status,
      agents: preflight.totalAgents,
      validInputs: preflight.agentInputsValid,
      mandatoryToolsPassed: preflight.deterministicToolsPassed,
      mandatoryToolsFailed: preflight.deterministicToolsFailed,
      mandatoryToolsExpectedRejections: preflight.deterministicToolsExpectedRejections,
      blockedAgents: preflight.findings
        .filter(finding => !finding.readyForModelAttempt)
        .map(finding => ({ agent: finding.canonicalId, blockers: finding.blockers })),
      report: preflightPath,
      liveCodexCalls: 0, independentlyEngineeringValidated: false,
      engineeringReleaseApproved: false
    }, null, 2));
    if (process.argv.includes('--require-ready') && preflight.status !== 'PREFLIGHT_READY_NO_AI_CALLS') {
      process.exitCode = 1;
    }
    return;
  }
  if (preflight.status !== 'PREFLIGHT_READY_NO_AI_CALLS') {
    throw new Error('26-agent preflight has failed mandatory engineering inputs/tools. Fix exact recorded blockers before spending Codex tokens.');
  }
  if (process.env.AI_REVIEW_PROVIDER !== 'codex_cli' ||
      process.env.USV_SUBSCRIPTION_PILOT !== 'enabled' ||
      process.env.USV_ALLOW_PAID_AI_API === 'true') {
    throw new Error('Codex campaign needs explicit subscription CLI mode; paid API fallback forbidden');
  }
  const report = await runLiveAgentMatrix(cases);
  const location = path.resolve('governance/reports/codex-26-agent-matrix.json');
  fs.mkdirSync(path.dirname(location), { recursive: true });
  fs.writeFileSync(location, JSON.stringify({
    ...report,
    dataClassification: catalog.dataClassification,
    illustrativeNonOperational: true,
    historicalCatalogBaseline: catalog.baselineSha,
    independentlyEngineeringValidated: false,
    engineeringReleaseApproved: false
  }, null, 2) + '\n');
  console.log(JSON.stringify({
    status: report.providerOperationalMatrixComplete
      ? 'CODEX_26_PROVIDER_RUNS_OBSERVED_UNCERTIFIED' : 'CODEX_CAMPAIGN_INCOMPLETE',
    agents: report.totalAgents,
    liveProviderRuns: report.liveProviderRuns,
    report: location,
    engineeringReleaseApproved: false
  }, null, 2));
  if (!report.providerOperationalMatrixComplete) process.exitCode = 1;
}

main().catch(error => {
  console.error('Codex campaign failed closed:', error instanceof Error ? error.message : 'unknown failure');
  process.exitCode = 1;
});
