/**
 * USV-01 Agent Academy: role-specific learning contract.
 *
 * Curricula and checklist completion are NOT evidence of learned competence.
 * Authoritative qualification is evaluated server-side against independent
 * Ed25519 signatures and verified source/assessment receipts.
 */
import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ROLE_ACCURACY_OBLIGATIONS } from '../verification/RoleAccuracyObligations.ts';
import { NAVAL_SKILL_CONTRACTS } from '../skills/NavalSkillRegistry.ts';

export const ACADEMY_VERSION = 'usv01-agent-academy/v1' as const;

export const FOUNDATION_MODULES = [
  { id: 'F01', title: 'Scientific method, assumptions and dimensional analysis',
    outcome: 'Identify equations, coordinate frames, SI units, uncertainty and validity domains.' },
  { id: 'F02', title: 'Marine systems engineering and traceability',
    outcome: 'Trace a requirement to a controlled source, interface, analysis, verification and change decision.' },
  { id: 'F03', title: 'Marine engineering safety and degraded conditions',
    outcome: 'Recognize missing evidence, safe-state hazards and unsafe generalizations; refuse unverified release.' },
  { id: 'F04', title: 'Independent validation and digital thread',
    outcome: 'Separate model proposals, deterministic computation, experimental facts and human acceptance.' },
  { id: 'F05', title: 'Sources, licensing and information security',
    outcome: 'Check source edition, rights, authenticity, classification and provenance before use.' }
] as const;

export interface SourceRequirement {
  id: string;
  access: 'UNVERIFIED_NOT_INGESTED';
  /** Identifier is NOT a licensed document copy or evidence of availability. */
  requiredReview: 'EDITION_RIGHTS_AUTHENTICITY_AND_APPLICABILITY';
}

export interface AgentCurriculum {
  schemaVersion: typeof ACADEMY_VERSION;
  canonicalId: string;
  runtimeId: string;
  name: string;
  division: string;
  specialism: string;
  foundationModules: typeof FOUNDATION_MODULES;
  specialistOutcomes: string[];
  requiredSources: SourceRequirement[];
  approvedSkillDocumentCandidates: string[];
  practicalTasks: {
    knowledgeAudit: string;
    workedExample: string;
    adversarialChallenge: string;
    toolEvidence: string[];
    blindIndependentReference: string;
  };
  existingPermissions: readonly string[];
  status: 'CURRICULUM_DEFINED_NOT_TRAINED';
}

export function buildAgentAcademyCurricula(): AgentCurriculum[] {
  const specs = AgentRegistry.getInstance().getAllAgents();
  const obligations = new Map(ROLE_ACCURACY_OBLIGATIONS.map(o => [o.canonicalId, o]));
  if (specs.length !== 26 || obligations.size !== 26) {
    throw new Error('Academy requires exactly 26 registered roles and independent reference obligations');
  }
  const seen = new Set<string>();
  const curricula = specs.map(spec => {
    if (seen.has(spec.canonicalId)) throw new Error('Duplicate academy role: ' + spec.canonicalId);
    seen.add(spec.canonicalId);
    const obligation = obligations.get(spec.canonicalId);
    if (!obligation) throw new Error('Missing independent challenge for ' + spec.canonicalId);
    const skills = NAVAL_SKILL_CONTRACTS.filter(s => s.canonicalAgents.includes(spec.canonicalId))
      .map(s => s.documentPath);
    return {
      schemaVersion: ACADEMY_VERSION,
      canonicalId: spec.canonicalId,
      runtimeId: spec.id,
      name: spec.name,
      division: spec.division,
      specialism: spec.speciality,
      foundationModules: FOUNDATION_MODULES,
      specialistOutcomes: [spec.speciality, ...spec.responsibilities, ...spec.verificationCriteria.requiredChecklist],
      requiredSources: [...new Set(spec.requiredKnowledgeSources)].map(id => ({
        id, access: 'UNVERIFIED_NOT_INGESTED' as const,
        requiredReview: 'EDITION_RIGHTS_AUTHENTICITY_AND_APPLICABILITY' as const
      })),
      approvedSkillDocumentCandidates: skills,
      practicalTasks: {
        knowledgeAudit: 'Identify the assumptions, units, source edition and physical validity of ' + spec.speciality + '. Cite only actual accessible sources.',
        workedExample: obligation.representativeChallenge,
        adversarialChallenge: 'Find a physically inconsistent input or unsupported standard applicability claim; reject any fabricated baseline, missing evidence or unsafe design release.',
        toolEvidence: [...spec.verificationCriteria.mandatoryDeterministicTools],
        blindIndependentReference: obligation.independentlyRequired
      },
      existingPermissions: [...spec.executionPermissions],
      status: 'CURRICULUM_DEFINED_NOT_TRAINED' as const
    };
  });
  if (seen.size !== 26) throw new Error('Academy must have 26 unique roles');
  return curricula.sort((a,b) => a.canonicalId.localeCompare(b.canonicalId));
}

export interface StudyAttempt {
  canonicalId: string;
  curriculumVersion: string;
  sourceSha: string;
  stage: 'OPEN_BOOK_STUDY' | 'WORKED_EXERCISE' | 'BLIND_ASSESSMENT';
  provider: string;
  /** Only a provider-reported model identity; never infer from the request. */
  modelUsed?: string;
  /** True only for an authorized, verified Codex-provider-quota switch. */
  fallbackReason?: 'CODEX_QUOTA';
  /** Hash of PUBLIC lesson excerpts provided to isolated Gemini CLI. */
  publicMaterialSha256?: string;
  status: 'COMPLETED_UNGRADED' | 'FAILED' | 'UNAVAILABLE' | 'QUOTA_EXHAUSTED';
  outputSha256?: string;
  timestamp: string;
  reviewedByHuman: false;
}

export interface AssessmentEvidence {
  canonicalId: string;
  curriculumVersion: string;
  sourceSha: string;
  sourceProofs: Array<{
    id: string;
    editionVerified: boolean;
    rightsVerified: boolean;
    applicabilityVerified: boolean;
    provenanceSha256: string;
  }>;
  foundation: { scorePercent: number; unseen: boolean; attemptSha256: string };
  specialist: { scorePercent: number; unseen: boolean; attemptSha256: string };
  safety: { passed: number; total: number; criticalFailures: number; attemptSha256: string };
  tools: { passed: number; total: number; attemptSha256: string };
  independentReference: { passed: boolean; referenceSha256: string; assessmentSha256: string };
}

export interface SignedQualificationRecord {
  evidence: AssessmentEvidence;
  reviewer: { identity: string; qualification: string; signatureBase64: string };
  director: { identity: string; signatureBase64: string };
}

export interface QualificationResult {
  canonicalId: string;
  status: 'QUALIFIED_SUPERVISED_RESEARCH_ONLY' | 'HOLD_UNQUALIFIED';
  blockers: string[];
  engineeringReleaseApproved: false;
  actuatorControlAuthorized: false;
}

/**
 * Caller MUST supply signature validity from the server-side Ed25519 verifier.
 * Passing arbitrary booleans in a browser cannot authorize anything.
 */
export function evaluateAcademicCriteria(
  curriculum: AgentCurriculum,
  evidence: AssessmentEvidence | undefined,
  currentSourceSha: string,
  reviewerSignatureVerified: boolean,
  directorSignatureVerified: boolean,
  distinctTrustRoots: boolean
): QualificationResult {
  const blockers: string[] = [];
  const sha = (s: unknown) => typeof s === 'string' && /^[a-f0-9]{64}$/i.test(s);
  const score = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
  if (!evidence) blockers.push('No submitted assessment evidence');
  else {
    if (evidence.canonicalId !== curriculum.canonicalId) blockers.push('Role ID mismatch');
    if (evidence.curriculumVersion !== ACADEMY_VERSION) blockers.push('Stale curriculum version');
    if (!/^[a-f0-9]{40}$/i.test(evidence.sourceSha) ||
        evidence.sourceSha !== currentSourceSha) blockers.push('Source SHA mismatch');
    for (const source of curriculum.requiredSources) {
      const matches = evidence.sourceProofs?.filter(x => x.id === source.id) ?? [];
      if (matches.length !== 1 || !matches[0].editionVerified ||
          !matches[0].rightsVerified || !matches[0].applicabilityVerified ||
          !sha(matches[0].provenanceSha256)) {
        blockers.push('Source not authenticated/licensed/applicable: ' + source.id);
      }
    }
    if (!score(evidence.foundation?.scorePercent) ||
        evidence.foundation.scorePercent < 90 ||
        evidence.foundation.unseen !== true ||
        !sha(evidence.foundation.attemptSha256)) blockers.push('Foundational blind exam below 90% or unsupported');
    if (!score(evidence.specialist?.scorePercent) ||
        evidence.specialist.scorePercent < 95 ||
        evidence.specialist.unseen !== true ||
        !sha(evidence.specialist.attemptSha256)) blockers.push('Specialist blind exam below 95% or unsupported');
    if (!Number.isSafeInteger(evidence.safety?.total) ||
        evidence.safety.total < 1 ||
        evidence.safety.passed !== evidence.safety.total ||
        evidence.safety.criticalFailures !== 0 ||
        !sha(evidence.safety.attemptSha256)) blockers.push('Safety-critical scenarios incomplete or failed');
    const expectedTools = curriculum.practicalTasks.toolEvidence.length;
    if (!Number.isSafeInteger(evidence.tools?.total) ||
        evidence.tools.total !== expectedTools ||
        evidence.tools.passed !== evidence.tools.total ||
        !sha(evidence.tools.attemptSha256)) blockers.push('Mandatory deterministic tool assessment incomplete');
    if (evidence.independentReference?.passed !== true ||
        !sha(evidence.independentReference.referenceSha256) ||
        !sha(evidence.independentReference.assessmentSha256)) blockers.push('Independent reference benchmark missing or failed');
  }
  if (!reviewerSignatureVerified) blockers.push('Independent external reviewer signature unverified');
  if (!directorSignatureVerified) blockers.push('Human Engineering Director signature unverified');
  if (!distinctTrustRoots) blockers.push('Reviewer and Director must be separate trusted identities and keys');
  return {
    canonicalId: curriculum.canonicalId,
    status: blockers.length ? 'HOLD_UNQUALIFIED' : 'QUALIFIED_SUPERVISED_RESEARCH_ONLY',
    blockers,
    engineeringReleaseApproved: false,
    actuatorControlAuthorized: false
  };
}
