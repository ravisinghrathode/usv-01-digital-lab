/** Deterministic A04 *host preflight* assessment. No model calls and no release authority. */
export interface A04HostProbe {
  expectedSha: string;
  actualSha: string;
  repositoryIdentityVerified: boolean;
  trackedWorktreeClean: boolean;
  checkoutOwnerMatchesOperator: boolean;
  codexCliPresent: boolean;
  chatgptSubscriptionAuthenticated: boolean;
  researchPolicyPermitted: boolean;
  tempStorageWritable: boolean;
  stableHostAliasConfigured: boolean;
  hostPlatformObserved: boolean;
}

export interface A04PreflightDecision {
  status: 'PASS_UNATTESTED' | 'BLOCKED';
  blockerCodes: string[];
  authenticatedModelExecution: false;
  independentlyAttested: false;
  a04Complete: false;
  a05Authorized: false;
  vesselEngineeringReleaseAuthorized: false;
}

export function assessA04HostProbe(probe: A04HostProbe): A04PreflightDecision {
  const blockerCodes: string[] = [];
  if (!/^[a-f0-9]{40}$/.test(probe.expectedSha) ||
      !/^[a-f0-9]{40}$/.test(probe.actualSha) ||
      probe.expectedSha !== probe.actualSha) {
    blockerCodes.push('EXACT_REVIEWED_COMMIT_MISMATCH');
  }
  const checks: Array<[keyof A04HostProbe, string]> = [
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
  for (const [field, code] of checks) if (probe[field] !== true) blockerCodes.push(code);
  return {
    status: blockerCodes.length ? 'BLOCKED' : 'PASS_UNATTESTED',
    blockerCodes,
    authenticatedModelExecution: false,
    independentlyAttested: false,
    a04Complete: false,
    a05Authorized: false,
    vesselEngineeringReleaseAuthorized: false
  };
}

/** Parse the CLI's login status without ever preserving full auth text in receipts/logs. */
export function isChatgptSubscriptionLogin(output: string, exitCode: number | null): boolean {
  const normalized = output.toLowerCase();
  return exitCode === 0 && normalized.includes('chatgpt') &&
    !/api[- ]?key|access token/.test(normalized);
}
