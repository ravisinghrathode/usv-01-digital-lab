import { describe, expect, it } from 'vitest';
import { assessA04HostProbe, isChatgptSubscriptionLogin, type A04HostProbe } from '../src/core/mission-control/A04HostPreflight.ts';

const sha = '0123456789abcdef0123456789abcdef01234567';
const ready: A04HostProbe = {
  expectedSha: sha, actualSha: sha,
  repositoryIdentityVerified: true, trackedWorktreeClean: true,
  checkoutOwnerMatchesOperator: true, codexCliPresent: true,
  chatgptSubscriptionAuthenticated: true, researchPolicyPermitted: true,
  tempStorageWritable: true, stableHostAliasConfigured: true,
  hostPlatformObserved: true
};

describe('A04 trusted host evidence is fail-closed and never a release', () => {
  it('records passing local observations without independently accepting A04 or A05', () => {
    const r = assessA04HostProbe(ready);
    expect(r.status).toBe('PASS_UNATTESTED');
    expect(r.blockerCodes).toEqual([]);
    expect(r.independentlyAttested).toBe(false);
    expect(r.a04Complete).toBe(false);
    expect(r.a05Authorized).toBe(false);
    expect(r.vesselEngineeringReleaseAuthorized).toBe(false);
    expect(r.authenticatedModelExecution).toBe(false);
  });

  it('rejects wrong, abbreviated, missing or stale source revisions', () => {
    for (const actualSha of [sha.slice(0, 7), '', 'f'.repeat(40)]) {
      const r = assessA04HostProbe({ ...ready, actualSha });
      expect(r.status).toBe('BLOCKED');
      expect(r.blockerCodes).toContain('EXACT_REVIEWED_COMMIT_MISMATCH');
    }
  });

  it('rejects unsafe source, auth, expense, ownership or storage states', () => {
    const expected: Array<[keyof A04HostProbe, string]> = [
      ['repositoryIdentityVerified', 'NOT_APPROVED_REPOSITORY'],
      ['trackedWorktreeClean', 'TRACKED_WORKTREE_NOT_CLEAN'],
      ['checkoutOwnerMatchesOperator', 'CHECKOUT_OWNER_NOT_VERIFIED'],
      ['codexCliPresent', 'CODEX_CLI_NOT_FOUND'],
      ['chatgptSubscriptionAuthenticated', 'CHATGPT_SUBSCRIPTION_NOT_AUTHENTICATED'],
      ['researchPolicyPermitted', 'RESEARCH_ONLY_POLICY_NOT_SATISFIED'],
      ['tempStorageWritable', 'PRIVATE_TEMP_STORAGE_UNAVAILABLE'],
      ['stableHostAliasConfigured', 'NON_SECRET_HOST_ALIAS_NOT_CONFIGURED'],
      ['hostPlatformObserved', 'HOST_PLATFORM_NOT_OBSERVED']
    ];
    for (const [field, code] of expected) {
      const r = assessA04HostProbe({ ...ready, [field]: false });
      expect(r.status).toBe('BLOCKED');
      expect(r.blockerCodes).toContain(code);
      expect(r.a05Authorized).toBe(false);
    }
  });

  it('accepts only signed-in ChatGPT session status, never API-key or failed login', () => {
    expect(isChatgptSubscriptionLogin('Logged in using ChatGPT', 0)).toBe(true);
    expect(isChatgptSubscriptionLogin('Logged in using API key', 0)).toBe(false);
    expect(isChatgptSubscriptionLogin('ChatGPT but access token in use', 0)).toBe(false);
    expect(isChatgptSubscriptionLogin('not logged in using ChatGPT', 0)).toBe(false);
    expect(isChatgptSubscriptionLogin('ChatGPT account error', 0)).toBe(false);
    expect(isChatgptSubscriptionLogin('Logged in using ChatGPT', 1)).toBe(false);
    expect(isChatgptSubscriptionLogin('', null)).toBe(false);
  });
});
