/**
 * Research-led iterative concept screening. Actual A01 systems proposer and A15 critic
 * are invoked through ExecutionEngine; deterministic tools screen explicit
 * hypotheses. It NEVER promotes a model's numbers to the engineering baseline.
 *
 * Server-side only: provider credentials / independent evidence stay out of UI.
 */
import { createHash } from 'node:crypto';
import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ExecutionEngine } from '../engine/ExecutionEngine.ts';
import { ToolRegistry } from '../tools/ToolRegistry.ts';
import { GenerativeDesignOptimizer } from './GenerativeDesignOptimizer.ts';
import type { AgentExecutionInput, AgentExecutionOutput } from '../types/agent.ts';
import type { ToolExecutionResult } from '../types/tools.ts';

const SHA = /^[0-9a-f]{40}$/;
const PRNG_MAX = 0xffffffff;
const REQUIRED_HYDRO = ['lwlMeters', 'beamMeters', 'draftMeters'];
const REQUIRED_RESISTANCE = [
  'lwlMeters', 'beamMeters', 'draftMeters', 'displacementTonnes',
  'speedKnots', 'propulsiveEfficiencyEtaD', 'waterTempCelsius'
];

export interface PreliminaryObjective {
  id: string;
  toolId: string;
  outputMetric: string;
  direction: 'MINIMIZE' | 'MAXIMIZE';
  weight: number;
  unit: string;
  sourceReference: string;
  /** Conditions held identical across candidates for fair comparison. */
  fixedInputParameters: Record<string, number>;
}

export interface DesignLoopRequirements {
  runId: string;
  sourceCommit: string;
  seed: number;
  maxRevisions: number;
  missionStatement: string;
  requirements: readonly { id: string; statement: string; source: string }[];
  sourceReferences: readonly { reference: string; description: string }[];
  objectives?: readonly PreliminaryObjective[];
}

export interface ScreenedProposal {
  /** These are raw untrusted suggestions, NEVER released particulars. */
  parameters: Record<string, number>;
  missingEngineeringInputs: string[];
  screenResults: { toolId: string; success: boolean; outputDigest: string; result?: Record<string, unknown>; error?: string }[];
  sourceKind: 'MODEL_PROPOSAL_UNVERIFIED';
  inputDigest: string;
}

export interface DesignRevision {
  index: number;
  proposalAgent: string;
  critiqueAgent: string;
  proposalTrace: { status: string; provider: string | null; executionMode: string | null; outputDigest: string };
  screened: ScreenedProposal;
  critiqueTrace: { status: string; provider: string | null; executionMode: string | null; outputDigest: string };
  critique: { findings: string[]; unverifiedRecommendations: string[]; openTbdItems: string[] };
}

export interface DesignLoopReport {
  runId: string;
  sourceCommit: string;
  seed: number;
  legacyScenarioRevision: string;
  heuristicStartingPoint: {
    hullType: string; lwlMeters: number; beamMeters: number; draftMeters: number;
    batteryKwh: number; motorKwTotal: number; hypothetical: true
  };
  revisions: DesignRevision[];
  stopReason: 'MAX_REVISIONS_REACHED' | 'AGENT_EXECUTION_FAILED' | 'NON_LIVE_PROVIDER' | 'INVALID_PROPOSAL' | 'NO_CHANGE';
  completedAgentCalls: number;
  completedToolScreens: number;
  comparison: {
    status: 'UNRANKED_NO_OBJECTIVES' | 'UNRANKED_INCOMPARABLE' | 'COMPARISON_READY_UNVERIFIED';
    rankings: { revisionIndex: number; relativeScore: number; objectiveValues: Record<string, number> }[];
    excluded: { revisionIndex: number; reason: string }[];
    referenceConditionsFromMission: string[];
    externallyValidated: false;
    approvedDesignSelected: false;
  };
  independentEngineeringValidated: false;
  detailedDesignAuthorized: false;
  engineeringReleaseAuthorized: false;
}

export type AgentExecutor = (agentId: string, input: AgentExecutionInput) => Promise<AgentExecutionOutput>;
export type ScreeningToolExecutor = (toolId: string, input: Record<string, number>, permissions: string[]) => Promise<ToolExecutionResult>;

const hash = (v: unknown) => 'sha256:' + createHash('sha256').update(JSON.stringify(v)).digest('hex');
const supported = new Set([
  'lwlMeters', 'beamMeters', 'draftMeters', 'blockCoefficientCb',
  'waterplaneCoefficientCwp', 'kgMeters', 'displacementTonnes',
  'speedKnots', 'propulsiveEfficiencyEtaD', 'waterTempCelsius'
]);

function extractUnverifiedNumbers(output: AgentExecutionOutput): Record<string, number> {
  const raw: unknown = output.data?.modelSuggestedKeyMetrics;
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (supported.has(key) && typeof value === 'number' && Number.isFinite(value)) result[key] = value;
  }
  return result;
}

const live = (x: AgentExecutionOutput, expectedId: string) =>
  x.agentId === expectedId &&
  ['SUCCESS', 'NEEDS_HUMAN_APPROVAL'].includes(x.status) &&
  x.providerExecutionMode === 'LIVE_AI_GENERATION' &&
  ['gemini', 'openai', 'ollama'].includes(x.provider || '') &&
  x.evidenceValid !== true; // Independent engineering proof is not produced by a model.

const trace = (x: AgentExecutionOutput) => ({
  status: x.status,
  provider: x.provider || null,
  executionMode: x.providerExecutionMode || null,
  outputDigest: hash({ data: x.data, assumptions: x.assumptions, openTbdItems: x.openTbdItems })
});

function validateInput(x: DesignLoopRequirements) {
  if (!x || !SHA.test(x.sourceCommit || '') || typeof x.runId !== 'string' || !x.runId.trim()) {
    throw new Error('A named run and exact 40-hex source commit are required');
  }
  if (!Number.isInteger(x.seed) || x.seed < 0 || x.seed > PRNG_MAX) {
    throw new Error('Design loop seed must be an unsigned 32-bit integer');
  }
  if (!Number.isInteger(x.maxRevisions) || x.maxRevisions < 1 || x.maxRevisions > 5) {
    throw new Error('Design loop revision budget must be 1..5');
  }
  if (typeof x.missionStatement !== 'string' || !x.missionStatement.trim() ||
      !Array.isArray(x.requirements) || !x.requirements.length ||
      x.requirements.some(r => !r || !r.id?.trim() || !r.statement?.trim() || !r.source?.trim()) ||
      !Array.isArray(x.sourceReferences)) {
    throw new Error('Source-identified mission requirements and sourceReferences array required');
  }
  for (const ref of x.sourceReferences) {
    if (!ref || typeof ref.reference !== 'string' || typeof ref.description !== 'string') {
      throw new Error('Malformed source reference');
    }
  }
  if (x.objectives !== undefined) {
    if (!Array.isArray(x.objectives) || x.objectives.length > 8) {
      throw new Error('Objectives must contain at most eight source-identified metrics');
    }
    const ids = new Set<string>();
    for (const o of x.objectives) {
      if (!o || typeof o.id !== 'string' || !o.id.trim() || ids.has(o.id) ||
          typeof o.toolId !== 'string' || !o.toolId.trim() ||
          typeof o.outputMetric !== 'string' ||
          !/^[a-zA-Z][a-zA-Z0-9]*$/.test(o.outputMetric) ||
          !['MINIMIZE', 'MAXIMIZE'].includes(o.direction) ||
          !Number.isFinite(o.weight) || o.weight <= 0 || o.weight > 100 ||
          typeof o.unit !== 'string' || !o.unit.trim() ||
          typeof o.sourceReference !== 'string' || !o.sourceReference.trim() ||
          !o.fixedInputParameters || typeof o.fixedInputParameters !== 'object' ||
          Array.isArray(o.fixedInputParameters) ||
          Object.entries(o.fixedInputParameters).length === 0 ||
          Object.entries(o.fixedInputParameters).some(([k,v]) => !supported.has(k) || !Number.isFinite(v))) {
        throw new Error('Invalid, duplicate or unsourced comparison objective');
      }
      ids.add(o.id);
    }
  }
}

/** Relative within-run ranking only; never cross-vessel or safety acceptance. */
function compareRevisions(revisions: readonly DesignRevision[], objectives: readonly PreliminaryObjective[] | undefined): DesignLoopReport['comparison'] {
  const comparison: DesignLoopReport['comparison'] = {
    status: 'UNRANKED_NO_OBJECTIVES', rankings: [], excluded: [],
    referenceConditionsFromMission: [], externallyValidated: false, approvedDesignSelected: false
  };
  if (!objectives?.length) return comparison;
  comparison.referenceConditionsFromMission = objectives.map(o =>
    o.id + ': ' + JSON.stringify(o.fixedInputParameters) + ' (' + o.sourceReference + ')');
  const candidates: Array<{ revisionIndex: number; values: Record<string,number> }> = [];
  for (const r of revisions) {
    const values: Record<string,number> = {};
    let missing = '';
    for (const objective of objectives) {
      // Compare only identical declared test conditions. A 14-knot resistance
      // cannot be ranked against another hull's 8-knot resistance.
      if (Object.entries(objective.fixedInputParameters).some(([key,value]) => r.screened.parameters[key] !== value)) {
        missing = 'Different source-declared benchmark conditions for ' + objective.id; break;
      }
      const actual = r.screened.screenResults.find(x => x.toolId === objective.toolId && x.success);
      const v = actual?.result?.[objective.outputMetric];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        missing = 'No valid deterministic screening output for ' + objective.id; break;
      }
      values[objective.id] = v;
    }
    if (missing) comparison.excluded.push({ revisionIndex: r.index, reason: missing });
    else candidates.push({ revisionIndex: r.index, values });
  }
  if (candidates.length < 2) {
    comparison.status = 'UNRANKED_INCOMPARABLE';
    return comparison;
  }
  const weightSum = objectives.reduce((s,o)=>s+o.weight,0);
  comparison.rankings = candidates.map(c => {
    let relativeScore = 0;
    for (const o of objectives) {
      const vals = candidates.map(x=>x.values[o.id]);
      const min = Math.min(...vals), max = Math.max(...vals);
      // Equal values do not give an unjustified winner.
      const score = max === min ? 0.5 :
        o.direction === 'MAXIMIZE' ? (c.values[o.id] - min)/(max-min) :
        (max - c.values[o.id])/(max-min);
      relativeScore += (o.weight/weightSum)*score;
    }
    return {
      revisionIndex: c.revisionIndex,
      relativeScore: Number((relativeScore*100).toFixed(3)),
      objectiveValues: c.values
    };
  }).sort((a,b)=> b.relativeScore-a.relativeScore || a.revisionIndex-b.revisionIndex);
  comparison.status = 'COMPARISON_READY_UNVERIFIED';
  return comparison;
}

const failureOutput = (x: AgentExecutionOutput) => x.status === 'FAILED' || x.status === 'PARTIAL';

/**
 * Dependency injection supports isolated tests; production defaults invoke
 * actual ExecutionEngine and ToolRegistry, never fabricated agent votes.
 */
export async function runAgentDesignLoop(
  input: DesignLoopRequirements,
  executeAgent: AgentExecutor = (agentId, params) => ExecutionEngine.getInstance().executeAgent(agentId, params, 0),
  executeTool: ScreeningToolExecutor = (toolId, params, permissions) =>
    ToolRegistry.getInstance().executeTool(toolId, params, permissions)
): Promise<DesignLoopReport> {
  validateInput(input);
  const registry = AgentRegistry.getInstance();
  const proposer = registry.requireAgent('A01');
  const critic = registry.requireAgent('A15');
  const optimizer = GenerativeDesignOptimizer.createIsolated(input.seed);
  const initial = optimizer.runIteration('BALANCED_PATROL');
  const report: DesignLoopReport = {
    runId: input.runId, sourceCommit: input.sourceCommit,
    seed: input.seed, legacyScenarioRevision: initial.scenarioRevision,
    heuristicStartingPoint: {
      hullType: initial.hullType, lwlMeters: initial.lwlMeters,
      beamMeters: initial.beamMeters, draftMeters: initial.draftMeters,
      batteryKwh: initial.batteryKwh, motorKwTotal: initial.motorKwTotal,
      hypothetical: true
    },
    revisions: [],
    stopReason: 'MAX_REVISIONS_REACHED',
    completedAgentCalls: 0, completedToolScreens: 0,
    comparison: compareRevisions([], input.objectives),
    independentEngineeringValidated: false,
    detailedDesignAuthorized: false, engineeringReleaseAuthorized: false
  };
  let previousProposal: Record<string, number> | null = null;
  let feedback: unknown = null;
  for (let index = 0; index < input.maxRevisions; index++) {
    const proposalInput: AgentExecutionInput = {
      taskId: input.runId + '-PROPOSE-' + index,
      correlationId: input.runId + '-PROPOSE-' + index,
      parameters: { conceptStage: 'HYPOTHESIS_SCREENING_ONLY', candidateNumber: index + 1 },
      context: {
        mission: input.missionStatement,
        requirements: input.requirements,
        independentSourcesForAgentToCheck: input.sourceReferences,
        initialLegacyHeuristicOnly: report.heuristicStartingPoint,
        previousUnverifiedProposal: previousProposal,
        previousCritique: feedback,
        mustReviseWeaknesses: index > 0,
        numericKeysIfSourcedOrExplicitlyAssumed: [...supported]
      },
      priorAgentOutputs: feedback ? { criticA15: feedback } : undefined,
      userNotes: 'Research and propose explicit numeric hypotheses only with traceable provenance or label TBD. Use only the named keys when numerical parameters are defensible. Treat legacy heuristic as an unverified brainstorm, not a baseline. Never fabricate source inspection, compliance, CFD/FEA or approval.'
    };
    const proposal = await executeAgent(proposer.id, proposalInput);
    report.completedAgentCalls++;
    if (failureOutput(proposal)) { report.stopReason = 'AGENT_EXECUTION_FAILED'; break; }
    if (!live(proposal, proposer.id)) { report.stopReason = 'NON_LIVE_PROVIDER'; break; }

    const numbers = extractUnverifiedNumbers(proposal);
    if (!Object.keys(numbers).length) { report.stopReason = 'INVALID_PROPOSAL'; break; }
    if (previousProposal && hash(previousProposal) === hash(numbers)) {
      report.stopReason = 'NO_CHANGE'; break;
    }

    const missingEngineeringInputs: string[] = [];
    const screenResults: ScreenedProposal['screenResults'] = [];
    const has = (names: string[]) => names.every(key => numbers[key] !== undefined);
    const toolCases: Array<[string, string[], Record<string, number>]> = [];
    if (has(REQUIRED_HYDRO) && (numbers.blockCoefficientCb !== undefined || numbers.displacementTonnes !== undefined)) {
      toolCases.push(['TOOL-HYDROSTATICS-01', ['CALCULATION_EXEC'], numbers]);
    } else {
      missingEngineeringInputs.push('Hydrostatics: LWL/beam/draft and Cb or displacement not all source-identified');
    }
    if (has(REQUIRED_RESISTANCE)) {
      toolCases.push(['TOOL-RESISTANCE-01', ['CALCULATION_EXEC'], numbers]);
    } else {
      missingEngineeringInputs.push('Resistance: incomplete vessel/displacement/speed/efficiency/15C conditions');
    }
    for (const [toolId, permissions, values] of toolCases) {
      // Explicit screening service permission is NOT attributed to A05 or A15.
      const result = await executeTool(toolId, values, permissions);
      report.completedToolScreens++;
      screenResults.push({
        toolId, success: result.success, outputDigest: hash(result),
        result: result.success ? result.output : undefined, error: result.error
      });
      if (!result.success) missingEngineeringInputs.push(toolId + ': ' + (result.error || 'screen failed'));
    }
    const screened: ScreenedProposal = {
      parameters: numbers, missingEngineeringInputs, screenResults,
      sourceKind: 'MODEL_PROPOSAL_UNVERIFIED', inputDigest: hash(numbers)
    };

    const critiqueInput: AgentExecutionInput = {
      taskId: input.runId + '-CRITIQUE-' + index,
      correlationId: input.runId + '-CRITIQUE-' + index,
      parameters: { conceptStage: 'INDEPENDENT_CRITIQUE_ONLY', candidateNumber: index + 1 },
      context: {
        mission: input.missionStatement,
        requirements: input.requirements,
        sourceReferences: input.sourceReferences,
        hypothesisUnverified: screened,
        rawAgentAssumptions: proposal.assumptions,
        noPhysicalOrReferenceValidation: true
      },
      priorAgentOutputs: { proposerA01: { ...screened, openTbdItems: proposal.openTbdItems } },
      userNotes: 'Critically review uncertainty, unsupported data, hull assumptions, tool failure, alternative topology, hydrostatics and powering. Demand actual source verification and revised design; do not self-approve. All numbers are preliminary.'
    };
    const challenge = await executeAgent(critic.id, critiqueInput);
    report.completedAgentCalls++;
    if (failureOutput(challenge)) { report.stopReason = 'AGENT_EXECUTION_FAILED'; break; }
    if (!live(challenge, critic.id)) { report.stopReason = 'NON_LIVE_PROVIDER'; break; }

    const findings = Array.isArray(challenge.data?.designDecisions)
      ? challenge.data.designDecisions.filter((v: unknown): v is string => typeof v === 'string')
      : [];
    const critique = {
      findings,
      unverifiedRecommendations: challenge.recommendations.filter((v): v is string => typeof v === 'string'),
      openTbdItems: [...challenge.openTbdItems, ...screened.missingEngineeringInputs]
    };
    report.revisions.push({
      index, proposalAgent: proposer.id, critiqueAgent: critic.id,
      proposalTrace: trace(proposal), screened, critiqueTrace: trace(challenge), critique
    });
    previousProposal = numbers;
    feedback = critique;
  }
  report.comparison = compareRevisions(report.revisions, input.objectives);
  return report;
}
