/**
 * Single-operator synthetic research authorization checks.
 *
 * A passing local A04 probe is an operator-observed input, NOT independent
 * host certification. This path cannot release engineering or operate hardware.
 * It is intentionally restricted to the repository's exact synthetic catalog
 * and never accepts controlled naval or client content.
 */
import { createHash } from 'node:crypto';

export const OWNER_SYNTHETIC_CATALOG =
  'evidence/live-agents/representative-cases.json' as const;
export const OWNER_SYNTHETIC_CLASSIFICATION =
  'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL' as const;
export const OWNER_RESEARCH_CONFIRMATION = 'RUN 26 SYNTHETIC AGENTS' as const;

const SHA = /^[0-9a-f]{40}$/;
const HOST = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,79}$/;
const MAX_RECEIPT_AGE_MS = 24 * 60 * 60 * 1000;
const REQUIRED_CHECKS = [
  'repositoryIdentityVerified',
  'trackedWorktreeClean',
  'checkoutOwnerMatchesOperator',
  'codexCliPresent',
  'chatgptSubscriptionAuthenticated',
  'researchPolicyPermitted',
  'privateTempStorageVerified',
  'stableHostAliasConfigured'
] as const;

export interface OwnerResearchEvidence {
  sourceSha: string;
  actualSha: string;
  originMainSha: string;
  approvedRemote: boolean;
  trackedWorktreeClean: boolean;
  locallyOwnedCheckout: boolean;
  interactiveTerminal: boolean;
  isolatedPrivateHost: boolean;
  hostId: string;
  receiptBytes: Buffer;
  catalogBytes: Buffer;
  nowMs?: number;
  env: NodeJS.ProcessEnv;
}

export interface OwnerResearchDecision {
  allowed: boolean;
  blockers: string[];
  authorization: 'OWNER_INTERACTIVE_SYNTHETIC_RESEARCH_ONLY';
  independentA04Approved: false;
  independentEngineeringValidated: false;
  engineeringReleaseApproved: false;
  actuatorControlAuthorized: false;
  catalogDigestSha256: string;
  receiptDigestSha256: string;
  sourceSha: string;
}

function hash(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}
export function assessOwnerSyntheticResearch(e: OwnerResearchEvidence): OwnerResearchDecision {
  const blockers: string[] = [];
  const env = e.env;
  if (!SHA.test(e.sourceSha) || e.actualSha !== e.sourceSha ||
      e.originMainSha !== e.sourceSha || !e.approvedRemote ||
      !e.trackedWorktreeClean) {
    blockers.push('OWNER_RESEARCH_UNREVIEWED_OR_DIRTY_MAIN');
  }
  if (!e.locallyOwnedCheckout || !e.isolatedPrivateHost ||
      !e.interactiveTerminal || !HOST.test(e.hostId)) {
    blockers.push('OWNER_RESEARCH_REQUIRES_PRIVATE_INTERACTIVE_OWNER_MAC');
  }
  if (env.GITHUB_ACTIONS === 'true' || Boolean(env.GITHUB_RUN_ID) ||
      Boolean(env.RUNNER_TRACKING_ID) ||
      env.CI === 'true' || env.CI === '1') {
    blockers.push('OWNER_RESEARCH_PUBLIC_CI_PROHIBITED');
  }
  if (env.USV_ALLOW_PAID_AI_API === 'true' ||
      env.USV_ENABLE_ACTUATOR_CONTROL === 'true' ||
      env.USV_ALLOW_ACTUATOR_CONTROL === 'true' ||
      env.USV_ENGINEERING_RELEASE_AUTHORIZED === 'true' ||
      env.USV_VESSEL_BASELINE_APPROVED === 'true') {
    blockers.push('OWNER_RESEARCH_UNSAFE_AUTHORITY_FLAGS');
  }
  if (env.USV_GEMINI_FALLBACK_APPROVED === 'true' ||
      env.USV_GEMINI_OAUTH_REVIEWED === 'true' ||
      Boolean(env.USV_GEMINI_DATA_CLASSIFICATION)) {
    blockers.push('OWNER_RESEARCH_CROSS_PROVIDER_TRANSFER_DENIED');
  }

  let catalog: any;
  try { catalog = JSON.parse(e.catalogBytes.toString('utf8')); }
  catch { blockers.push('OWNER_RESEARCH_INVALID_CATALOG'); }
  if (!catalog || Array.isArray(catalog) ||
      catalog.dataClassification !== OWNER_SYNTHETIC_CLASSIFICATION) {
    blockers.push('OWNER_RESEARCH_SYNTHETIC_CATALOG_ONLY');
  }

  let receipt: any;
  try { receipt = JSON.parse(e.receiptBytes.toString('utf8')); }
  catch { blockers.push('OWNER_RESEARCH_INVALID_A04_RECEIPT'); }
  const age = (e.nowMs ?? Date.now()) - Date.parse(receipt?.observedAtUtc);
  if (!receipt || Array.isArray(receipt) ||
      receipt.schemaVersion !== 'USV-A04-HOST-PREFLIGHT-1.0' ||
      receipt.type !== 'NON_SECRET_LOCAL_OBSERVATION_UNATTESTED' ||
      receipt.sourceSha !== e.sourceSha ||
      receipt.expectedSourceSha !== e.sourceSha ||
      receipt.stableHostAliasSha256 !== hash(e.hostId) ||
      receipt.decision?.status !== 'PASS_UNATTESTED' ||
      receipt.decision?.independentlyAttested !== false ||
      receipt.decision?.authenticatedModelExecution !== false ||
      receipt.decision?.a04Complete !== false ||
      receipt.decision?.a05Authorized !== false ||
      receipt.decision?.vesselEngineeringReleaseAuthorized !== false ||
      !Array.isArray(receipt.decision?.blockerCodes) ||
      receipt.decision.blockerCodes.length !== 0 ||
      !receipt.checks || typeof receipt.checks !== 'object' ||
      Array.isArray(receipt.checks) ||
      Object.keys(receipt.checks).length !== REQUIRED_CHECKS.length ||
      REQUIRED_CHECKS.some(k => receipt.checks[k] !== true) ||
      !Number.isFinite(age) || age < -60_000 ||
      age > MAX_RECEIPT_AGE_MS) {
    blockers.push('OWNER_RESEARCH_A04_PREFLIGHT_NOT_FRESH_AND_COMPLETE');
  }
  return {
    allowed: blockers.length === 0,
    blockers,
    authorization: 'OWNER_INTERACTIVE_SYNTHETIC_RESEARCH_ONLY',
    independentA04Approved: false,
    independentEngineeringValidated: false,
    engineeringReleaseApproved: false,
    actuatorControlAuthorized: false,
    catalogDigestSha256: hash(e.catalogBytes),
    receiptDigestSha256: hash(e.receiptBytes),
    sourceSha: e.sourceSha
  };
}
