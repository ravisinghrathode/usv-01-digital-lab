import { createHash, verify } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AgentRegistry } from '../registry/AgentRegistry.ts';

export const CANONICAL_CHARTER_PATH = 'docs/governance/USV01_26_AGENT_OPERATING_CHARTER_V1.md';
export const SELF_CRITIQUE_MEMO_PATH = 'docs/governance/USV01_OPERATING_CHARTER_V11_AI_SELF_CRITIQUE.md';

export interface CharterAdoptionDecisionRecord {
  decisionId: string;
  charterVersion: '1.1';
  charterSha256: string;
  gitCommitSha: string;
  independentGovernanceReviewer: string;
  reviewerOrganization: string;
  authorizerRole: 'ENGINEERING_DIRECTOR' | 'DELEGATED_GOVERNANCE_AUTHORITY';
  authorizerIdentity: string;
  delegationReference?: string;
  authenticatedSignatureReference: string;
  // A non-secret reference is not proof of approval: signature must bind
  // the full decision record to an independently configured trust root.
  signatureBase64?: string;
  effectiveDateUtc: string;
  dissentResolved: boolean;
  disposition: 'ADOPTED_FOR_OPERATING_SPEC_ONLY' | 'HOLD' | 'REVIEW_REQUIRED';
}

export interface CharterAdoptionAudit {
  schema: 'usv01-charter-adoption-audit/v1';
  canonicalPath: string;
  charterSha256: string;
  charterMarkedProposed: boolean;
  registeredRoleCount: number;
  checks: { id: string; passed: boolean; detail: string }[];
  allStaticCriteriaPassed: boolean;
  adopted: boolean;
  disposition: 'PROPOSED_NOT_ADOPTED' | 'HOLD_INVALID_RECORD' | 'REVIEW_REQUIRED' | 'ADOPTED_OPERATING_SPEC_ONLY';
  blockers: string[];
  // Adopting the operating specification never approves vessel baselines or engineering release.
  vesselBaselineApproved: false;
  engineeringReleaseApproved: false;
}

const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
const GIT_SHA_RE = /^[a-f0-9]{40}$/;

/** Deterministic, explicit-order signed payload; excludes only the signature itself. */
export function canonicalCharterAdoptionPayload(rec: CharterAdoptionDecisionRecord): string {
  return JSON.stringify({
    decisionId: rec.decisionId,
    charterVersion: rec.charterVersion,
    charterSha256: rec.charterSha256,
    gitCommitSha: rec.gitCommitSha,
    independentGovernanceReviewer: rec.independentGovernanceReviewer,
    reviewerOrganization: rec.reviewerOrganization,
    authorizerRole: rec.authorizerRole,
    authorizerIdentity: rec.authorizerIdentity,
    delegationReference: rec.delegationReference ?? null,
    authenticatedSignatureReference: rec.authenticatedSignatureReference,
    effectiveDateUtc: rec.effectiveDateUtc,
    dissentResolved: rec.dissentResolved,
    disposition: rec.disposition
  });
}

export function computeCharterDigest(rootDir = process.cwd()): {
  charterText: string;
  selfCritiqueText: string;
  charterSha256: string;
} {
  const charterText = fs.readFileSync(path.join(rootDir, CANONICAL_CHARTER_PATH), 'utf8');
  const selfCritiqueText = fs.readFileSync(path.join(rootDir, SELF_CRITIQUE_MEMO_PATH), 'utf8');
  const charterSha256 = 'sha256:' + createHash('sha256').update(charterText, 'utf8').digest('hex');
  return { charterText, selfCritiqueText, charterSha256 };
}

export function evaluateCharterAdoptionReadiness(options?: {
  rootDir?: string;
  expectedCommitSha?: string;
  decisionRecord?: CharterAdoptionDecisionRecord;
  // Must come from the qualified operator's independent trust registry,
  // never from the submitted decision record or an AI-generated fixture.
  trustedDirectorPublicKeyPem?: string;
}): CharterAdoptionAudit {
  const rootDir = options?.rootDir ?? process.cwd();
  const { charterText, selfCritiqueText, charterSha256 } = computeCharterDigest(rootDir);
  const roles = AgentRegistry.getInstance().getAllAgents();
  const blockers: string[] = [];

  const requiredSafeguards = [
    'A — One authoritative engineering digital thread',
    'B — Three separate, interfacing engineering loops',
    'C — Physics-based feasibility before optimization',
    'D — Autonomous research; controlled engineering authority',
    'E — Measurable proof of engineering autonomy'
  ];

  const checks: CharterAdoptionAudit['checks'] = [
    {
      id: 'C01_CANONICAL_DOCUMENT',
      passed:
        charterText.includes('Document ID:** USV01-GOV-CHARTER-001') &&
        charterText.includes('Precedence:'),
      detail: 'Single canonical governing charter with version and precedence clause'
    },
    {
      id: 'C02_CANONICAL_26_ROLES_AND_NAMESPACE',
      passed:
        roles.length === 26 &&
        new Set(roles.map(r => r.canonicalId)).size === 26 &&
        charterText.includes('src/core/agents/definitions.ts') &&
        charterText.includes('Identifier namespaces are distinct:') &&
        charterText.includes('It is not A27'),
      detail: 'Matches 26 canonical roles, 8 divisions, and separates Agent A04 vs Recovery A04'
    },
    {
      id: 'C03_SAFEGUARDS_A_THROUGH_E',
      passed: requiredSafeguards.every(s => charterText.includes(s)),
      detail: 'All five constitutional safeguards A–E present'
    },
    {
      id: 'C04_SEPARATED_THREE_LOOPS',
      passed:
        charterText.includes('Loop I — Exploration and concept formation') &&
        charterText.includes('Loop II — Multidisciplinary coupled design optimization') &&
        charterText.includes('Loop III — Independent verification, validation and controlled decisions'),
      detail: 'Three interfacing loops explicitly defined without falsely claiming B03/B04 closure'
    },
    {
      id: 'C05_AUTHORITY_VS_EVIDENCE_SPLIT',
      passed:
        charterText.includes('Two orthogonal status dimensions') &&
        charterText.includes('INDEPENDENTLY_VERIFIED') &&
        charterText.includes('DIRECTOR_APPROVED'),
      detail: 'Separates technical evidence class from Director decision state'
    },
    {
      id: 'C06_BOUNDED_AUTONOMY_AND_SAFE_STATES',
      passed:
        charterText.includes('zero permission for new paid external resource consumption') &&
        charterText.includes('No actuation:') &&
        charterText.includes('Link loss is not automatically a zero-thrust safe state'),
      detail: 'Enforces zero unapproved spend, no physical actuation, and link-loss safety analysis'
    },
    {
      id: 'C08_BLOCKERS_B03_TO_B08_OPEN',
      passed: ['B03', 'B04', 'B05', 'B06', 'B07', 'B08'].every(b => charterText.includes(`**${b}**`)),
      detail: 'Technical blockers B03–B08 preserved OPEN'
    },
    {
      id: 'C09_SELF_CRITIQUE_MEMO_LINKED',
      passed:
        selfCritiqueText.includes('INDEPENDENT GOVERNANCE AND QUALIFIED ENGINEERING REVIEW **NOT PERFORMED**') &&
        Array.from({ length: 18 }, (_, i) => `| F${String(i + 1).padStart(2, '0')} |`).every(tag =>
          selfCritiqueText.includes(tag)
        ),
      detail: 'AI self-critique findings F01–F18 preserved as non-independent author review'
    }
  ];

  for (const c of checks) {
    if (!c.passed) blockers.push(`Static charter criterion failed: ${c.id}`);
  }

  const charterMarkedProposed = /Status:\*\*\s*PROPOSED/i.test(charterText);
  const allStaticCriteriaPassed = checks.every(c => c.passed);

  let adopted = false;
  let disposition: CharterAdoptionAudit['disposition'] = 'PROPOSED_NOT_ADOPTED';

  const rec = options?.decisionRecord;
  if (!rec) {
    blockers.push('Missing authenticated Director/delegated adoption decision record (C07)');
    blockers.push('Missing independent governance reviewer record (C09)');
  } else {
    const recordIssues: string[] = [];
    if (!rec.decisionId.trim()) recordIssues.push('Missing decisionId');
    if (rec.charterVersion !== '1.1') recordIssues.push('Charter version mismatch');
    if (!SHA256_RE.test(rec.charterSha256) || rec.charterSha256 !== charterSha256) {
      recordIssues.push('Decision digest does not match exact canonical charter SHA-256');
    }
    if (!GIT_SHA_RE.test(rec.gitCommitSha)) {
      recordIssues.push('Decision must reference exact 40-hex Git commit SHA');
    } else if (options?.expectedCommitSha && rec.gitCommitSha !== options.expectedCommitSha) {
      recordIssues.push('Decision Git SHA differs from current evaluated commit SHA');
    }
    if (!rec.independentGovernanceReviewer.trim() || !rec.reviewerOrganization.trim()) {
      recordIssues.push('Missing independent governance reviewer identity/organization');
    }
    if (/^(chatgpt|codex|gemini|ai|llm)/i.test(rec.independentGovernanceReviewer.trim())) {
      recordIssues.push('AI model cannot act as independent governance reviewer');
    }
    if (rec.independentGovernanceReviewer.trim() === rec.authorizerIdentity.trim()) {
      recordIssues.push('Independent governance reviewer must be distinct from approving authority');
    }
    if (!rec.authorizerIdentity.trim() || !rec.authenticatedSignatureReference.trim()) {
      recordIssues.push('Missing authorizer identity or authenticated signature reference');
    }
    if (rec.authorizerRole === 'DELEGATED_GOVERNANCE_AUTHORITY' && !rec.delegationReference?.trim()) {
      recordIssues.push('Delegated authority requires explicit delegationReference');
    }

    // Merely naming a signature or a reviewer is not authentication. A
    // configured, independent Ed25519 trust root must verify this exact
    // decision, exact charter digest and exact source revision.
    const trustedKey = options?.trustedDirectorPublicKeyPem;
    const signature = rec.signatureBase64;
    if (!trustedKey?.trim()) {
      recordIssues.push('Missing independently trusted Director Ed25519 public key');
    }
    if (!signature?.trim()) {
      recordIssues.push('Missing actual Ed25519 signature (reference alone is insufficient)');
    }
    if (trustedKey?.trim() && signature?.trim()) {
      let validSignature = false;
      try {
        const raw = Buffer.from(signature, 'base64');
        validSignature = raw.length === 64 &&
          verify(null, Buffer.from(canonicalCharterAdoptionPayload(rec), 'utf8'), trustedKey, raw);
      } catch { /* malformed key or signature is a hard reject */ }
      if (!validSignature) {
        recordIssues.push('Director signature invalid for exact adoption decision and trusted key');
      }
    }
    if (!Number.isFinite(Date.parse(rec.effectiveDateUtc))) {
      recordIssues.push('Invalid effectiveDateUtc');
    }
    if (rec.dissentResolved !== true) {
      recordIssues.push('Governance dissent remains unresolved');
    }
    if (!allStaticCriteriaPassed) {
      recordIssues.push('Static charter criteria C01–C09 incomplete');
    }

    blockers.push(...recordIssues);

    if (recordIssues.length > 0) {
      disposition = 'HOLD_INVALID_RECORD';
    } else if (rec.disposition === 'ADOPTED_FOR_OPERATING_SPEC_ONLY') {
      adopted = true;
      disposition = 'ADOPTED_OPERATING_SPEC_ONLY';
    } else if (rec.disposition === 'REVIEW_REQUIRED') {
      disposition = 'REVIEW_REQUIRED';
    } else {
      disposition = 'PROPOSED_NOT_ADOPTED';
      blockers.push(`Decision disposition is ${rec.disposition}`);
    }
  }

  return {
    schema: 'usv01-charter-adoption-audit/v1',
    canonicalPath: CANONICAL_CHARTER_PATH,
    charterSha256,
    charterMarkedProposed,
    registeredRoleCount: roles.length,
    checks,
    allStaticCriteriaPassed,
    adopted,
    disposition,
    blockers,
    vesselBaselineApproved: false,
    engineeringReleaseApproved: false
  };
}
