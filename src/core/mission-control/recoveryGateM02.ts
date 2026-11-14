import type { A04HostProbe } from './A04HostPreflight.ts';
import { assessA04HostProbe } from './A04HostPreflight.ts';
import type { CodexCampaignPreflight } from '../verification/CodexCampaignPreflight.ts';

export interface RedactedHostReceipt {
  schema: 'usv01-a04-redacted-receipt/v1';
  hostAlias: string;
  reviewedMainSha: string;
  receiptSha256: string;
  privateStorageRef: string;
  attestingOperator: string;
  independentOpsReviewer: string;
  independentOpsDisposition: 'VERIFIED' | 'REJECTED' | 'PENDING';
  capturedAtUtc: string;
  probe: A04HostProbe;
  // Raw secrets/tokens/cookies must NEVER appear in public receipts.
  rawAuthTextRedacted: boolean;
}

export interface RecoveryM02Decision {
  a04State: 'VERIFIED' | 'ACTIVE_BLOCKED';
  a05State: 'READY_TO_RUN' | 'PREFLIGHT_VERIFIED' | 'BLOCKED_ON_A04';
  a05AuthorizedToExecute: boolean;
  liveA06Planned: boolean;
  postCampaignA07Planned: boolean;
  blockers: string[];
  // M02 host readiness never approves engineering baselines or vessel release.
  vesselBaselineApproved: false;
  engineeringReleaseApproved: false;
}

const GIT_SHA = /^[a-f0-9]{40}$/;
const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
const SECRET_LEAK_RE = /sk-[a-z0-9]{16,}|bearer\s+[a-z0-9._-]+|session[-_]?cookie|refresh[-_]?token|oauth[-_]?secret/i;

/**
 * Enforce strict Recovery Plan ordering: A04 host verification (plus independent ops review)
 * MUST pass before A05 deterministic preflight can advance. A07 signed post-campaign host
 * health is explicitly scheduled AFTER A06 and is never a prerequisite to A04.
 */
export function evaluateRecoveryM02Gate(input: {
  reviewedMainSha: string;
  receipt?: RedactedHostReceipt;
  a05Preflight?: CodexCampaignPreflight;
  a05PreflightSourceCommit?: string;
  requireA07BeforeA04?: boolean;
}): RecoveryM02Decision {
  const blockers: string[] = [];

  if (input.requireA07BeforeA04 === true) {
    blockers.push('Invalid circular gate: post-campaign A07 cannot be required before A04');
  }
  if (!GIT_SHA.test(input.reviewedMainSha)) {
    blockers.push('Reviewed main commit SHA must be a 40-hex commit ID');
  }

  let a04Verified = false;
  const r = input.receipt;
  if (!r) {
    blockers.push('A04 redacted trusted-host receipt is missing');
  } else {
    const serialized = JSON.stringify(r);
    if (SECRET_LEAK_RE.test(serialized)) {
      blockers.push('A04 receipt contains potential raw token/secret pattern; redaction violated');
    }
    if (!r.rawAuthTextRedacted) blockers.push('A04 receipt must explicitly confirm auth text redaction');
    if (r.reviewedMainSha !== input.reviewedMainSha) {
      blockers.push('A04 receipt SHA does not match reviewed main SHA');
    }
    if (!SHA256_RE.test(r.receiptSha256)) blockers.push('A04 private receipt SHA-256 digest invalid');
    if (!r.privateStorageRef.trim() || !r.hostAlias.trim()) {
      blockers.push('A04 receipt lacks non-sensitive hostAlias or privateStorageRef');
    }
    if (!r.attestingOperator.trim() || !r.independentOpsReviewer.trim()) {
      blockers.push('A04 receipt lacks operator or independent ops reviewer');
    }
    if (r.attestingOperator.trim() === r.independentOpsReviewer.trim()) {
      blockers.push('Independent ops reviewer must differ from attesting operator');
    }
    if (r.independentOpsDisposition !== 'VERIFIED') {
      blockers.push(`A04 independent ops review disposition is ${r.independentOpsDisposition}`);
    }
    const probeDecision = assessA04HostProbe(r.probe);
    if (probeDecision.status !== 'PASS_UNATTESTED') {
      blockers.push(...probeDecision.blockerCodes.map(c => `A04 host probe failed: ${c}`));
    }
    if (r.probe.expectedSha !== input.reviewedMainSha || r.probe.actualSha !== input.reviewedMainSha) {
      blockers.push('A04 probe SHAs must match reviewedMainSha');
    }
    a04Verified = blockers.length === 0;
  }

  let a05State: RecoveryM02Decision['a05State'] = 'BLOCKED_ON_A04';
  if (a04Verified) {
    if (!input.a05Preflight) {
      a05State = 'READY_TO_RUN';
    } else if (
      input.a05Preflight.status === 'PREFLIGHT_READY_NO_AI_CALLS' &&
      input.a05PreflightSourceCommit === input.reviewedMainSha &&
      input.a05Preflight.totalAgents === 26 &&
      input.a05Preflight.deterministicToolsFailed === 0 &&
      input.a05Preflight.deterministicToolsExpectedRejections === 0
    ) {
      a05State = 'PREFLIGHT_VERIFIED';
    } else {
      a05State = 'READY_TO_RUN';
      blockers.push('A05 deterministic preflight did not pass clean 26/26 same-SHA checks');
    }
  }

  return {
    a04State: a04Verified ? 'VERIFIED' : 'ACTIVE_BLOCKED',
    a05State,
    a05AuthorizedToExecute: a04Verified,
    liveA06Planned: a04Verified,
    postCampaignA07Planned: true,
    blockers,
    vesselBaselineApproved: false,
    engineeringReleaseApproved: false
  };
}
