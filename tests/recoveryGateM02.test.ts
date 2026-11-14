import { describe, expect, it } from 'vitest';
import {
  evaluateRecoveryM02Gate,
  type RedactedHostReceipt
} from '../src/core/mission-control/recoveryGateM02.ts';

const MAIN_SHA = '1'.repeat(40);

function validReceipt(overrides: Partial<RedactedHostReceipt> = {}): RedactedHostReceipt {
  return {
    schema: 'usv01-a04-redacted-receipt/v1',
    hostAlias: 'usv-lab-mac-host-01',
    reviewedMainSha: MAIN_SHA,
    receiptSha256: 'sha256:' + '2'.repeat(64),
    privateStorageRef: 'drive://controlled/usv01/a04/receipt-20261115.json',
    attestingOperator: 'Platform Operator',
    independentOpsReviewer: 'Ops Security Reviewer',
    independentOpsDisposition: 'VERIFIED',
    capturedAtUtc: '2026-11-15T02:00:00Z',
    rawAuthTextRedacted: true,
    probe: {
      expectedSha: MAIN_SHA,
      actualSha: MAIN_SHA,
      repositoryIdentityVerified: true,
      trackedWorktreeClean: true,
      checkoutOwnerMatchesOperator: true,
      codexCliPresent: true,
      chatgptSubscriptionAuthenticated: true,
      researchPolicyPermitted: true,
      tempStorageWritable: true,
      stableHostAliasConfigured: true,
      hostPlatformObserved: true
    },
    ...overrides
  };
}

describe('M02 — Recovery A04 trusted host and conditional A05 sequential gate', () => {
  it('blocks A05 preflight when A04 receipt is absent, unredacted, self-reviewed, or fails secret-pattern scan', () => {
    const missing = evaluateRecoveryM02Gate({ reviewedMainSha: MAIN_SHA });
    expect(missing.a04State).toBe('ACTIVE_BLOCKED');
    expect(missing.a05State).toBe('BLOCKED_ON_A04');
    expect(missing.a05AuthorizedToExecute).toBe(false);

    const leaked = evaluateRecoveryM02Gate({
      reviewedMainSha: MAIN_SHA,
      receipt: validReceipt({ privateStorageRef: 'token=bearer abcdef1234567890' })
    });
    expect(leaked.a04State).toBe('ACTIVE_BLOCKED');
    expect(leaked.blockers.some(b => b.includes('redaction'))).toBe(true);

    const selfReviewed = evaluateRecoveryM02Gate({
      reviewedMainSha: MAIN_SHA,
      receipt: validReceipt({ independentOpsReviewer: 'Platform Operator' })
    });
    expect(selfReviewed.a04State).toBe('ACTIVE_BLOCKED');
  });

  it('rejects circular gate requiring post-campaign A07 before A04', () => {
    const circular = evaluateRecoveryM02Gate({
      reviewedMainSha: MAIN_SHA,
      receipt: validReceipt(),
      requireA07BeforeA04: true
    });
    expect(circular.a04State).toBe('ACTIVE_BLOCKED');
    expect(circular.blockers.some(b => b.includes('circular'))).toBe(true);
  });

  it('authorizes A05 and advances to PREFLIGHT_VERIFIED only after verified A04 receipt and clean 26/26 same-SHA preflight', () => {
    const ready = evaluateRecoveryM02Gate({
      reviewedMainSha: MAIN_SHA,
      receipt: validReceipt(),
      a05PreflightSourceCommit: MAIN_SHA,
      a05Preflight: {
        status: 'PREFLIGHT_READY_NO_AI_CALLS',
        totalAgents: 26,
        agentInputsValid: 26,
        deterministicToolsPassed: 12,
        deterministicToolsFailed: 0,
        deterministicToolsExpectedRejections: 0,
        liveCodexCalls: 0,
        independentlyEngineeringValidated: false
      } as never
    });
    expect(ready.a04State).toBe('VERIFIED');
    expect(ready.a05State).toBe('PREFLIGHT_VERIFIED');
    expect(ready.a05AuthorizedToExecute).toBe(true);
    expect(ready.postCampaignA07Planned).toBe(true);
    expect(ready.vesselBaselineApproved).toBe(false);
    expect(ready.engineeringReleaseApproved).toBe(false);
  });
});
