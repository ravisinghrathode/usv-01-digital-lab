/**
 * Research-first concept phase. No CAD, mass, propulsion or speed values are
 * assumed here. "Plan" produces actual 26-agent ExecutionEngine case inputs;
 * --run-live requires an authenticated, explicitly enabled ChatGPT/Codex CLI and never uses mock fallback
 * as engineering evidence. All outputs remain UNVERIFIED.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { ExecutionEngine } from '../src/core/engine/ExecutionEngine.ts';
import { runLiveAgentMatrix } from '../src/core/verification/LiveAgentMatrix.ts';
import { assessConceptDiscovery } from '../src/core/verification/ConceptDiscoveryGate.ts';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const readJson = (p: string): unknown => {
  const file = path.resolve(p);
  if (fs.statSync(file).size > 2 * 1024 * 1024) throw Error('Input file exceeds 2 MiB');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const shaPattern = /^[0-9a-f]{40}$/;

async function main() {
  const missionFile = flag('--mission-file');
  const commit = flag('--source-sha') || process.env.GITHUB_SHA || '';
  if (!missionFile) throw Error('Supply --mission-file with source-identified mission requirements');
  if (!shaPattern.test(commit)) throw Error('Supply --source-sha as exact 40-hex repository source revision');
  const raw = readJson(missionFile);
  if (!object(raw) || typeof raw.missionStatement !== 'string' || !raw.missionStatement.trim() ||
      !Array.isArray(raw.requirements) || !raw.requirements.length) {
    throw Error('Mission file requires missionStatement and non-empty requirements[]');
  }
  const requirements = raw.requirements;
  for (const item of requirements) {
    if (!object(item) || !['id', 'statement', 'source'].every(k =>
      typeof item[k] === 'string' && (item[k] as string).trim())) {
      throw Error('Each mission requirement must identify id, statement and source');
    }
  }
  const researchSources = Array.isArray(raw.researchSources) ? raw.researchSources : [];
  if (!researchSources.every(x => object(x) && typeof x.reference === 'string' &&
       typeof x.description === 'string')) {
    throw Error('researchSources must identify description and reference');
  }
  const registry = AgentRegistry.getInstance();
  const check = registry.validateRegistry();
  if (!check.valid) throw Error('26-agent registry invalid: ' + check.errors.join('; '));
  const cases: Record<string, {
    taskId: string;
    parameters: Record<string, unknown>;
    context: Record<string, unknown>;
    userNotes: string;
  }> = {};
  for (const spec of registry.getAllAgents()) {
    cases[spec.canonicalId] = {
      taskId: 'USV01-CONCEPT-RESEARCH-' + spec.canonicalId,
      parameters: { stage: 'RESEARCH_ONLY', baselineApproved: false },
      context: {
        sourceCommit: commit,
        missionStatement: raw.missionStatement,
        missionRequirements: requirements,
        researchSources,
        discipline: spec.speciality,
        researchResponsibilities: spec.responsibilities,
        dependencies: spec.dependencies,
        conceptAlternatives: ['MONOHULL', 'CATAMARAN', 'OTHER_SUPPORTED_OPTION'],
        projectLeadAuthority: 'PROJECT_SCOPE_AND_CONCEPT_SELECTION_ONLY',
        approvedVesselParticulars: null
      },
      userNotes: 'Propose evidence-backed research paths, candidate parameter RANGES, constraints, alternatives and uncertainties for your discipline. Give source URLs and traceable calculations when available; never claim an unprovided external source was inspected. Label every unsupported numeric input TBD. Do not infer client requirements, grant ship safety approval, claim CFD/FEA or claim actual supplier tests. This is Stage 1 research, NOT final design.'
    };
  }
  const dir = path.resolve(flag('--out-dir') || '.local-concept-research');
  const ignoredRoot = path.resolve('.local-concept-research');
  const insideCheckout = dir === process.cwd() || dir.startsWith(process.cwd() + path.sep);
  const insideIgnoredRoot = dir === ignoredRoot || dir.startsWith(ignoredRoot + path.sep);
  if (args.includes('--run-live') && insideCheckout && !insideIgnoredRoot) {
    throw Error('Live agent research may contain controlled data; write only to ignored .local-concept-research/ or a path outside the checkout');
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'agent-cases.json'), JSON.stringify(cases, null, 2) + '\n');
  let findings: any[] = [];
  let operationalRuns = 0;
  if (args.includes('--run-live')) {
    if (process.env.AI_REVIEW_PROVIDER !== 'codex_cli' ||
        process.env.USV_SUBSCRIPTION_PILOT !== 'enabled' ||
        process.env.USV_ALLOW_PAID_AI_API === 'true') {
      throw Error('Live agent research requires AI_REVIEW_PROVIDER=codex_cli, USV_SUBSCRIPTION_PILOT=enabled, paid API disabled and an authenticated ChatGPT Codex CLI. No Gemini or mock fallback.');
    }
    const actualOutputs: Record<string, unknown> = {};
    const researchRecords: Array<Record<string, unknown>> = [];
    const result = await runLiveAgentMatrix(cases, async (id, input) => {
      const output = await ExecutionEngine.getInstance().executeAgent(id, {
        ...input,
        priorAgentOutputs: actualOutputs
      }, 0);
      // These are REVIEW INPUTS, not independent source verification.
      // Retain actual model proposals and TBDs locally so reviewers can compare
      // alternatives; never mutate SharedMemory or promote numbers automatically.
      researchRecords.push({
        sourceCommit: commit,
        agentRuntimeId: id,
        taskId: output.taskId,
        provider: output.provider || null,
        providerExecutionMode: output.providerExecutionMode || null,
        executionStatus: output.status,
        evidenceClass: 'UNVERIFIED_AGENT_RESEARCH',
        data: output.data,
        assumptions: output.assumptions,
        openTbdItems: output.openTbdItems,
        warnings: output.warnings,
        recommendations: output.recommendations
      });
      if (output.status !== 'FAILED') {
        actualOutputs[id] = {
          disciplineSummary: String(output.data?.disciplineSummary || '').slice(0, 1000),
          numericProposalsUnverified: output.data?.keyMetrics ?? {},
          openTbdItems: output.openTbdItems.slice(0, 20),
          verificationStatus: 'UNVERIFIED_RESEARCH'
        };
      }
      return output;
    });
    operationalRuns = result.liveProviderRuns;
    findings = result.findings.map(f => ({ ...f, sourceCommit: commit }));
    fs.writeFileSync(path.join(dir, 'live-research-matrix.json'), JSON.stringify(result, null, 2) + '\n');
    fs.writeFileSync(path.join(dir, 'agent-research-for-review.json'), JSON.stringify({
      classification: 'UNVERIFIED_NOT_FOR_BASELINE',
      sourceCommit: commit,
      records: researchRecords
    }, null, 2) + '\n', { mode: 0o600 });
  }
  const proposalFile = flag('--concept-file');
  const proposed = proposalFile ? readJson(proposalFile) : [];
  if (!Array.isArray(proposed)) throw Error('Concept file must contain an array of alternatives');
  const gate = assessConceptDiscovery({
    sourceCommit: commit,
    missionRequirements: requirements,
    agentRuns: findings,
    concepts: proposed
  });
  fs.writeFileSync(path.join(dir, 'concept-discovery-gate.json'), JSON.stringify(gate, null, 2) + '\n');
  console.log(JSON.stringify({
    researchCasesPrepared: Object.keys(cases).length,
    realProviderResearchRunsObserved: operationalRuns,
    conceptReviewStatus: gate.status,
    detailedDesignAuthorized: false,
    engineeringReleaseAuthorized: false,
    outDir: dir
  }, null, 2));
  if (args.includes('--require-review-ready') && gate.status !== 'TRADE_STUDY_READY_UNVERIFIED') {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Concept research stopped safely:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
