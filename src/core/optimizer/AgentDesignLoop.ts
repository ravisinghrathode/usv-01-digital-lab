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
  sourceReferences: readonly { reference: string; description: string; sha256?:string; url?:string }[];
  objectives?: readonly PreliminaryObjective[];
  specialistReviews?: 'AUTO' | 'OFF';
  comparisonMode?: 'STRICT' | 'FIXED_CONDITIONS_RESCREEN';
}

export interface ScreenedProposal {
  /** These are raw untrusted suggestions, NEVER released particulars. */
  parameters: Record<string, number>;
  conceptTopology: 'MONOHULL'|'CATAMARAN'|'TRIMARAN'|'OTHER'|'UNSPECIFIED';
  unverifiedMetricProvenance: Record<string, {sourceKind: string; sourceReference: string; justification: string}>;
  missingEngineeringInputs: string[];
  screenResults: { toolId: string; success: boolean; outputDigest: string; result?: Record<string, unknown>; error?: string }[];
  sourceKind: 'MODEL_PROPOSAL_UNVERIFIED';
  inputDigest: string;
}

export interface DesignRevision {
  index: number;
  specialistReviews: Array<{
    canonicalId: string;
    agentId: string;
    status: 'LIVE_REVIEW_UNVERIFIED' | 'FAILED_OR_NONLIVE';
    trace: {status: string; provider: string | null; executionMode: string | null; outputDigest: string};
    findings: string[];
    openTbdItems: string[];
  }>;
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
  specialistReviewCount: number;
  fixedConditionScreens: Array<{revisionIndex:number;objectiveId:string;toolId:string;inputDigest:string;outputDigest:string;success:boolean;reason?:string}>;
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

function extractUnverifiedNumbers(output: AgentExecutionOutput, sourceReferences: readonly { reference: string; description: string; sha256?:string; url?:string }[]) {
  const raw: unknown = output.data?.modelSuggestedKeyMetrics;
  const rawClaims: unknown = output.data?.metricProvenance;
  const numbers: Record<string, number> = {};
  const claims: ScreenedProposal['unverifiedMetricProvenance'] = {};
  const unsubstantiated: string[] = [];
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return {numbers, claims, unsubstantiated};
  const ledger = rawClaims && !Array.isArray(rawClaims) && typeof rawClaims === 'object'
    ? rawClaims as Record<string, unknown> : {};
  for (const [key,value] of Object.entries(raw)) {
    if (!supported.has(key) || typeof value !== 'number' || !Number.isFinite(value)) continue;
    const claim = ledger[key];
    if (!claim || typeof claim !== 'object' || Array.isArray(claim)) {
      unsubstantiated.push(key+': missing provenance for model-suggested number'); continue;
    }
    const c = claim as Record<string,unknown>;
    const sourceKind = c.sourceKind, sourceReference = c.sourceReference, justification = c.justification;
    const authenticShape = (sourceKind === 'SOURCE_DOCUMENT' || sourceKind === 'HYPOTHESIS') &&
      typeof sourceReference === 'string' && sourceReference.trim().length >= 3 &&
      typeof justification === 'string' && justification.trim().length >= 5;
    if (!authenticShape || (sourceKind === 'SOURCE_DOCUMENT' &&
      !sourceReferences.some(src => src.reference === sourceReference &&
        typeof src.sha256 === 'string' && /^sha256:[0-9a-f]{64}$/.test(src.sha256) &&
        typeof src.url === 'string' && /^https:\/\//.test(src.url)))) {
      unsubstantiated.push(key+': malformed/undisclosed source, not eligible even for screening'); continue;
    }
    // Metadata is never proof: source claims require independent authentication.
    numbers[key] = value;
    claims[key] = {sourceKind,sourceReference,justification};
  }
  return {numbers, claims, unsubstantiated};
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
  if (x.specialistReviews !== undefined && !['AUTO','OFF'].includes(x.specialistReviews)) throw new Error('Unrecognized specialist review mode');
  if (x.comparisonMode !== undefined && !['STRICT','FIXED_CONDITIONS_RESCREEN'].includes(x.comparisonMode)) throw new Error('Unrecognized comparison mode');
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
          Object.entries(o.fixedInputParameters).some(([k,v]) => !['speedKnots','propulsiveEfficiencyEtaD','waterTempCelsius'].includes(k) || !Number.isFinite(v))) {
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

/**
 * Recalculate preliminary designs at identical declared mission conditions.
 * Changes only the comparison input, NEVER the original proposal/baseline.
 * Restricted to the documented monohull resistance screening calculator.
 */
async function fixedConditionCompare(
 revisions: readonly DesignRevision[],
 objectives: readonly PreliminaryObjective[] | undefined,
 executeTool: ScreeningToolExecutor
):Promise<{comparison:DesignLoopReport['comparison'];screens:DesignLoopReport['fixedConditionScreens']}> {
  const comparison:DesignLoopReport['comparison'] = {
    status:'UNRANKED_NO_OBJECTIVES',rankings:[],excluded:[],
    referenceConditionsFromMission:[],externallyValidated:false,approvedDesignSelected:false
  };
  const screens:DesignLoopReport['fixedConditionScreens'] = [];
  if(!objectives?.length) return {comparison,screens};
  comparison.referenceConditionsFromMission = objectives.map(o=>
    o.id + ': fixed condition '+JSON.stringify(o.fixedInputParameters)+' source: '+o.sourceReference);
  const valid:Array<{revisionIndex:number;values:Record<string,number>}> = [];
  for(const rev of revisions) {
    const values:Record<string,number>={};
    let reason='';
    for(const o of objectives) {
      if(rev.screened.conceptTopology!=='MONOHULL' || o.toolId!=='TOOL-RESISTANCE-01') {
        reason='Unvalidated topology or unsupported objective tool';break;
      }
      const fixed = {...rev.screened.parameters,...o.fixedInputParameters};
      const result=await executeTool(o.toolId,fixed,['CALCULATION_EXEC']);
      const metric=result.success?result.output[o.outputMetric]:undefined;
      const good=typeof metric==='number'&&Number.isFinite(metric);
      screens.push({revisionIndex:rev.index,objectiveId:o.id,toolId:o.toolId,
        inputDigest:hash(fixed),outputDigest:hash(result),success:good,
        reason:good?undefined:result.error||'Metric missing from actual deterministic screen'});
      if(!good){reason='Fixed-condition tool screening failed: '+o.id;break;}
      values[o.id]=metric;
    }
    if(reason)comparison.excluded.push({revisionIndex:rev.index,reason});
    else valid.push({revisionIndex:rev.index,values});
  }
  if(valid.length<2) {
    comparison.status='UNRANKED_INCOMPARABLE';
    return {comparison,screens};
  }
  const weightSum=objectives.reduce((a,o)=>a+o.weight,0);
  comparison.rankings=valid.map(c=>{
    let weighted=0;
    for(const objective of objectives) {
      const vals=valid.map(x=>x.values[objective.id]);
      const low=Math.min(...vals),high=Math.max(...vals);
      const score=high===low?0.5:objective.direction==='MAXIMIZE'?
        (c.values[objective.id]-low)/(high-low):(high-c.values[objective.id])/(high-low);
      weighted+=objective.weight*score/weightSum;
    }
    return {revisionIndex:c.revisionIndex,relativeScore:Number((100*weighted).toFixed(3)),
      objectiveValues:c.values};
  }).sort((a,b)=>b.relativeScore-a.relativeScore||a.revisionIndex-b.revisionIndex);
  comparison.status='COMPARISON_READY_UNVERIFIED';
  return {comparison,screens};
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
    completedAgentCalls: 0, completedToolScreens: 0, specialistReviewCount: 0,
    fixedConditionScreens: [],
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
        numericKeysIfSourcedOrExplicitlyAssumed: [...supported],
        requiredConceptTopology: 'MONOHULL or CATAMARAN or TRIMARAN or OTHER; must disclose topology, do not assume hull type from dimensions',
        requiredNumericEvidenceFormat: {metricProvenance:{'<metricName>':{sourceKind:'SOURCE_DOCUMENT or HYPOTHESIS',sourceReference:'exact registered source ID or explicit assumption ID',justification:'why this numerical claim is proposed'}}}
      },
      priorAgentOutputs: feedback ? { criticA15: feedback } : undefined,
      userNotes: 'Declare conceptTopology as MONOHULL, CATAMARAN, TRIMARAN or OTHER. For EACH numeric keyMetrics value provide metricProvenance with sourceKind SOURCE_DOCUMENT (exact sourceReference from mission list) or HYPOTHESIS (explicit assumption identifier), sourceReference, justification. Missing or mismatched provenance prevents screening. You must not invent source inspection or authority. Use only named supported keys; missing info is TBD, not guessed baseline. Treat legacy heuristic as an unverified brainstorm; do not claim compliance, CFD/FEA or approval.'
    };
    const proposal = await executeAgent(proposer.id, proposalInput);
    report.completedAgentCalls++;
    if (failureOutput(proposal)) { report.stopReason = 'AGENT_EXECUTION_FAILED'; break; }
    if (!live(proposal, proposer.id)) { report.stopReason = 'NON_LIVE_PROVIDER'; break; }

    const {numbers, claims, unsubstantiated} = extractUnverifiedNumbers(proposal, input.sourceReferences);
    const rawTopology: unknown = proposal.data?.conceptTopology;
    const topology: ScreenedProposal['conceptTopology'] =
      ['MONOHULL','CATAMARAN','TRIMARAN','OTHER'].includes(String(rawTopology))
        ? rawTopology as ScreenedProposal['conceptTopology'] : 'UNSPECIFIED';
    if (!Object.keys(numbers).length) { report.stopReason = 'INVALID_PROPOSAL'; break; }
    if (previousProposal && hash(previousProposal) === hash(numbers)) {
      report.stopReason = 'NO_CHANGE'; break;
    }

    const missingEngineeringInputs: string[] = [...unsubstantiated];
    const supportedTopology = topology === 'MONOHULL';
    if (!supportedTopology) {
      missingEngineeringInputs.push('Topology '+topology+': single-hull empirical calculators are NOT applicable; independently approved multihull model or actual CFD/FEA required');
    }
    for (const [key,claim] of Object.entries(claims)) if (claim.sourceKind === 'HYPOTHESIS') {
      missingEngineeringInputs.push(key+': unverified assumption ('+claim.sourceReference+')');
    }
    const screenResults: ScreenedProposal['screenResults'] = [];
    const has = (names: string[]) => names.every(key => numbers[key] !== undefined);
    const toolCases: Array<[string, string[], Record<string, number>]> = [];
    if (supportedTopology && has(REQUIRED_HYDRO) && (numbers.blockCoefficientCb !== undefined || numbers.displacementTonnes !== undefined)) {
      toolCases.push(['TOOL-HYDROSTATICS-01', ['CALCULATION_EXEC'], numbers]);
    } else {
      missingEngineeringInputs.push('Hydrostatics: LWL/beam/draft and Cb or displacement not all source-identified');
    }
    if (supportedTopology && has(REQUIRED_RESISTANCE)) {
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
      parameters: numbers, conceptTopology: topology, unverifiedMetricProvenance: claims, missingEngineeringInputs, screenResults,
      sourceKind: 'MODEL_PROPOSAL_UNVERIFIED', inputDigest: hash(numbers)
    };

    // Discipline-specific challenges are actual provider calls, not synthetic
    // votes. Only invoke specialists when the exact mandatory numerical
    // tool has already succeeded. A05/A06 require hydrostatics; A07 requires
    // resistance; A23 requires both. A09/A10/A14 remain TBD until component,
    // structure and electrical input packages exist.
    const successful = new Set(screenResults.filter(r => r.success).map(r => r.toolId));
    const specialistPlan = input.specialistReviews === 'OFF' ? [] : [
      { role: 'A05', required: ['TOOL-HYDROSTATICS-01'] },
      { role: 'A06', required: ['TOOL-HYDROSTATICS-01'] },
      { role: 'A07', required: ['TOOL-RESISTANCE-01'] },
      { role: 'A23', required: ['TOOL-HYDROSTATICS-01','TOOL-RESISTANCE-01'] }
    ].filter(entry => entry.required.every(toolId => successful.has(toolId)));
    const specialistReviews: DesignRevision['specialistReviews'] = [];
    for (const plan of specialistPlan) {
      const specialist = registry.requireAgent(plan.role);
      const reviewInput: AgentExecutionInput = {
        taskId: input.runId+'-'+plan.role+'-REVIEW-'+index,
        correlationId: input.runId+'-'+plan.role+'-REVIEW-'+index,
        parameters: { ...numbers },
        context: { mission: input.missionStatement, sourceCommit: input.sourceCommit,
          question: 'Review the unverified proposal and explicitly challenge gaps in your discipline',
          requirements: input.requirements, sourceReferences: input.sourceReferences,
          hypothesisUnverified: screened, solverValidationStatus: 'NOT_ESTABLISHED',
          physicalVerificationStatus: 'NOT_EXECUTED' },
        priorAgentOutputs: {systemsProposalA01: screened},
        userNotes: 'Never certify. Re-execute mandatory registered calculation and identify numerical inconsistencies, sources missing and design improvements. Report TBD for unsourced claims.'
      };
      const review = await executeAgent(specialist.id, reviewInput);
      report.completedAgentCalls++;
      const actualLive = live(review,specialist.id) && !failureOutput(review);
      report.specialistReviewCount++;
      specialistReviews.push({
        canonicalId: plan.role, agentId: specialist.id,
        status: actualLive ? 'LIVE_REVIEW_UNVERIFIED' : 'FAILED_OR_NONLIVE',
        trace: trace(review),
        findings: Array.isArray(review.data?.designDecisions) ?
          review.data.designDecisions.filter((x: unknown): x is string => typeof x==='string') : [],
        openTbdItems: review.openTbdItems || []
      });
      if (!actualLive) missingEngineeringInputs.push('Specialist '+plan.role+' review failed or lacked actual live provider evidence');
    }

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
        specialistReviews,
        noPhysicalOrReferenceValidation: true
      },
      priorAgentOutputs: { proposerA01: { ...screened, openTbdItems: proposal.openTbdItems }, specialists: specialistReviews },
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
      index, proposalAgent: proposer.id, critiqueAgent: critic.id, specialistReviews,
      proposalTrace: trace(proposal), screened, critiqueTrace: trace(challenge), critique
    });
    previousProposal = numbers;
    feedback = critique;
  }
  if(input.comparisonMode==='FIXED_CONDITIONS_RESCREEN') {
    const result=await fixedConditionCompare(report.revisions,input.objectives,executeTool);
    report.comparison=result.comparison;
    report.fixedConditionScreens=result.screens;
    report.completedToolScreens+=result.screens.length;
  } else {
    report.comparison = compareRevisions(report.revisions, input.objectives);
  }
  return report;
}
