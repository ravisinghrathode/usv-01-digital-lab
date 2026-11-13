/**
 * Project-wide paid AI API policy.
 *
 * Default is DENY. Paid/provider-key API access must be explicitly enabled by
 * USV_ALLOW_PAID_AI_API=true. Mission Control never enables this flag.
 */
export function isPaidAiApiAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.USV_ALLOW_PAID_AI_API === 'true';
}

export function assertPaidAiApiAllowed(provider: string, env: NodeJS.ProcessEnv = process.env): void {
  if (!isPaidAiApiAllowed(env)) {
    throw new Error(
      `Paid AI API access is disabled by USV-01 policy. Provider '${provider}' may only be used after explicit USV_ALLOW_PAID_AI_API=true authorization.`
    );
  }
}
