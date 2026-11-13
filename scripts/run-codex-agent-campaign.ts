/**
 * Run all 26 canonical specialists against a historical non-operational input
 * catalog. Subscription-authenticated live Codex runs are explicit opt-in.
 * No output from this script is certified vessel evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { compileCodexAgentCases } from '../src/core/verification/CodexMatrixInput.ts';
import { runLiveAgentMatrix } from '../src/core/verification/LiveAgentMatrix.ts';

async function main() {
  const sourcePath = path.resolve(
    process.argv.includes('--catalog')
      ? process.argv[process.argv.indexOf('--catalog') + 1]
      : 'evidence/live-agents/representative-cases.json'
  );
  if (fs.statSync(sourcePath).size > 2 * 1024 * 1024) throw new Error('Catalog too large');
  const catalog = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const cases = compileCodexAgentCases(catalog);
  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({
      status: 'CASES_COMPILED_NO_LIVE_CALLS',
      count: Object.keys(cases).length,
      dataClassification: catalog.dataClassification,
      independentlyEngineeringValidated: false,
      engineeringReleaseApproved: false,
      nextStep: 'Run with --execute only after an official signed-in Codex CLI session is available.'
    }, null, 2));
    return;
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
