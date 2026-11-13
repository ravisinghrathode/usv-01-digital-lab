import { AgentRegistry } from '../registry/AgentRegistry.ts';

/**
 * Gate 0: agent-generated concepts are hypotheses until sources are authenticated,
 * independent calculations are reviewed and the Project Lead selects a concept.
 * This module intentionally CANNOT approve a vessel, even if JSON claims approval.
 */
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const ROLE = /^A(0[1-9]|1[0-9]|2[0-6])$/;

export type ParameterBasis = 'SOURCE_OBSERVATION' | 'DERIVED_SCREEN' | 'ASSUMPTION' | 'TBD';
export interface ProposedParameter {
  id: string;
  value: number | null;
  unit: string;
  basis: ParameterBasis;
  authoredBy: string;
  sourceUri?: string;
  sourceDigest?: string;
  calculationReference?: string;
  /** For conflicting or alternative concepts, every parameter MUST be scoped. */
  candidateId: string;
}
export interface ProposedConcept {
  id: string;
  hullType: string;
  parameters: readonly ProposedParameter[];
}
export interface ResearchRun {
  canonicalId: string;
  runtimeId: string;
  sourceCommit: string;
  status: string;
  provider?: string;
  providerExecutionMode?: string;
  outputDigestSha256?: string;
}
export interface ConceptDiscoverySubmission {
  sourceCommit: string;
  missionRequirements: readonly { id: string; statement: string; source: string }[];
  agentRuns: readonly ResearchRun[];
  concepts: readonly ProposedConcept[];
  /** A recorded user statement alone does not authenticate a project decision. */
  projectLeadSelection?: { candidateId: string; statedBy: string; decisionReference: string };
}

export type ConceptDiscoveryStatus =
  | 'INVALID_INPUT'
  | 'RESEARCH_REQUIRED'
  | 'EVIDENCE_INCOMPLETE'
  | 'TRADE_STUDY_READY_UNVERIFIED';

const nonblank = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const urlSafe = (v: unknown) => {
  if (!nonblank(v)) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password;
  } catch { return false; }
};
const obj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * The output is a decision-readiness screen, not source attestation. Imported
 * agent records and citations are untrusted; accepting their shape is not proof.
 */
export function assessConceptDiscovery(raw: unknown) {
  const issues: string[] = [];
  if (!obj(raw)) {
    return {
      status: 'INVALID_INPUT' as ConceptDiscoveryStatus,
      issues: ['Submission must be an object'],
      totalAgentRuns: 0, genuineProviderClaims: 0,
      candidateCount: 0, sourceBackedParameterClaims: 0,
      projectLeadDecisionVerified: false as const,
      detailedDesignAuthorized: false as const,
      engineeringReleaseAuthorized: false as const
    };
  }
  const x = raw as unknown as Partial<ConceptDiscoverySubmission>;
  if (!nonblank(x.sourceCommit) || !SHA.test(x.sourceCommit)) {
    issues.push('Missing exact 40-hex source commit');
  }
  const requirements = Array.isArray(x.missionRequirements) ? x.missionRequirements : [];
  if (!requirements.length) issues.push('Project mission requirements absent; agents cannot invent customer needs');
  const requirementIds = new Set<string>();
  for (const r of requirements) {
    if (!obj(r) || !nonblank(r.id) || !nonblank(r.statement) || !nonblank(r.source) ||
        requirementIds.has(r.id)) {
      issues.push('Missing, malformed or duplicate mission requirement');
      continue;
    }
    requirementIds.add(r.id);
  }

  const registry = AgentRegistry.getInstance();
  const runs = Array.isArray(x.agentRuns) ? x.agentRuns : [];
  const byRole = new Map<string, ResearchRun>();
  let claimedLive = 0;
  for (const r of runs) {
    if (!obj(r) || !nonblank(r.canonicalId) || !ROLE.test(r.canonicalId) ||
        byRole.has(r.canonicalId)) {
      issues.push('Malformed, duplicate or unknown agent run');
      continue;
    }
    const spec = registry.getAgent(r.canonicalId);
    if (!spec || r.runtimeId !== spec.id) issues.push('Agent run has wrong runtime identity: ' + r.canonicalId);
    if (r.sourceCommit !== x.sourceCommit) issues.push('Agent run has stale or mismatched source SHA: ' + r.canonicalId);
    const liveClaim = r.status === 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED' &&
      r.providerExecutionMode === 'LIVE_AI_GENERATION' &&
      ['gemini', 'ollama', 'openai'].includes(r.provider || '') &&
      typeof r.outputDigestSha256 === 'string' && DIGEST.test(r.outputDigestSha256);
    if (!liveClaim) issues.push('No complete live-provider research trace for ' + r.canonicalId);
    else claimedLive++;
    byRole.set(r.canonicalId, r as ResearchRun);
  }
  for (const spec of registry.getAllAgents()) {
    if (!byRole.has(spec.canonicalId)) issues.push('Missing agent research role ' + spec.canonicalId);
  }

  const concepts = Array.isArray(x.concepts) ? x.concepts : [];
  const conceptIds = new Set<string>();
  let sourceClaims = 0;
  if (concepts.length < 2) issues.push('At least two separately identified design alternatives required for trade review');
  for (const c of concepts) {
    if (!obj(c) || !nonblank(c.id) || !nonblank(c.hullType) || conceptIds.has(c.id) ||
        !Array.isArray(c.parameters) || c.parameters.length === 0) {
      issues.push('Malformed, duplicate or empty design concept');
      continue;
    }
    conceptIds.add(c.id);
    const values = new Set<string>();
    for (const p of c.parameters) {
      if (!obj(p) || !nonblank(p.id) || !nonblank(p.unit) ||
          !nonblank(p.authoredBy) || !ROLE.test(p.authoredBy) ||
          p.candidateId !== c.id || values.has(p.id)) {
        issues.push('Parameter identity, author, unit, uniqueness or candidate scope invalid in ' + c.id);
        continue;
      }
      values.add(p.id);
      if (!['SOURCE_OBSERVATION', 'DERIVED_SCREEN', 'ASSUMPTION', 'TBD'].includes(p.basis as string)) {
        issues.push('Unknown parameter provenance class: ' + p.id);
        continue;
      }
      if (p.basis === 'TBD') {
        if (p.value !== null) issues.push('TBD must have null value: ' + p.id);
      } else if (typeof p.value !== 'number' || !Number.isFinite(p.value)) {
        issues.push('Numeric proposal must be finite: ' + p.id);
      } else if (p.basis === 'SOURCE_OBSERVATION') {
        if (!urlSafe(p.sourceUri) || typeof p.sourceDigest !== 'string' || !DIGEST.test(p.sourceDigest)) {
          issues.push('Source observation lacks HTTPS citation and checksum: ' + p.id);
        } else sourceClaims++;
      } else if (p.basis === 'DERIVED_SCREEN' && !nonblank(p.calculationReference)) {
        issues.push('Derived screening value lacks calculation reference: ' + p.id);
      }
    }
  }
  const decision = x.projectLeadSelection;
  if (decision !== undefined &&
      (!obj(decision) || !conceptIds.has(decision.candidateId) ||
       !nonblank(decision.statedBy) || !nonblank(decision.decisionReference))) {
    issues.push('Recorded Project Lead decision has no valid concept/reference');
  }

  const rolesComplete = claimedLive === 26 && runs.length === 26;
  const malformed = !SHA.test(x.sourceCommit || '') ||
    !Array.isArray(x.agentRuns) || !Array.isArray(x.concepts) || !Array.isArray(x.missionRequirements);
  const status: ConceptDiscoveryStatus = malformed ? 'INVALID_INPUT' :
    !rolesComplete ? 'RESEARCH_REQUIRED' :
    issues.length ? 'EVIDENCE_INCOMPLETE' : 'TRADE_STUDY_READY_UNVERIFIED';

  return {
    status,
    issues,
    totalAgentRuns: runs.length,
    genuineProviderClaims: claimedLive,
    candidateCount: concepts.length,
    sourceBackedParameterClaims: sourceClaims,
    projectLeadSelectionRecorded: !!decision,
    projectLeadDecisionVerified: false as const,
    detailedDesignAuthorized: false as const,
    engineeringReleaseAuthorized: false as const,
    note: 'Even a complete 26-agent trade study is not a source-authenticated design, a signed Project Lead selection or an engineering release. Independent reviews, physical verification and exact-revision human authority remain separate gates.'
  };
}
