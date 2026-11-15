/**
 * Project-approved, research-only dual-provider transport contract.
 * A ChatGPT sign-in is not an OpenAI API key; a Google OAuth sign-in is not
 * authorization to transfer restricted naval/client information to Gemini.
 * No automatic fallback on model refusal, bad math, invalid JSON, or approvals.
 */
export const CHATGPT_SOL_MODEL = 'gpt-6.1-sol' as const;
export const GEMINI_HYDROGEN_MODEL = 'gemini-4-hydrogen' as const;
export type SafeFallbackReason = 'CODEX_QUOTA' | 'CODEX_AUTH_UNAVAILABLE' |
  'CODEX_TRANSPORT_UNAVAILABLE' | 'CODEX_MODEL_UNAVAILABLE';

export function dualProviderEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.USV_DUAL_PROVIDER_ROUTING === 'enabled' &&
    env.AI_REVIEW_PROVIDER === 'codex_cli' &&
    env.USV_SUBSCRIPTION_PILOT === 'enabled' &&
    env.USV_ALLOW_PAID_AI_API !== 'true' &&
    env.USV_NO_PAID_API !== '0' &&
    env.USV_LAB_SCOPE === 'RESEARCH_ONLY' &&
    env.USV_ENABLE_ACTUATOR_CONTROL !== 'true' &&
    env.USV_ALLOW_ACTUATOR_CONTROL !== 'true' &&
    env.USV_ENGINEERING_RELEASE_AUTHORIZED !== 'true' &&
    env.USV_VESSEL_BASELINE_APPROVED !== 'true';
}

/** Operator attests that EVERY input in this campaign is transferable. */
export function geminiTransferAuthorized(env: NodeJS.ProcessEnv = process.env): boolean {
  return dualProviderEnabled(env) &&
    env.USV_GEMINI_FALLBACK_APPROVED === 'true' &&
    env.USV_GEMINI_OAUTH_REVIEWED === 'true' &&
    env.USV_GEMINI_DATA_CLASSIFICATION === 'PUBLIC_NON_SENSITIVE';
}

/** Only a small, explicit transport-failure vocabulary is retryable. */
export function codexFallbackReason(error: unknown): SafeFallbackReason | null {
  const message = error instanceof Error ? error.message : String(error);
  // The operator's own maximum call budget is a HARD STOP; never use a
  // different vendor to evade a local research budget or broken ledger.
  if (/LOCAL_REQUEST_BUDGET_EXHAUSTED|QUOTA_LEDGER_UNAVAILABLE|QUOTA_LEDGER_CORRUPT/.test(message))
    return null;
  if (/^(?:USV_QUOTA_WAIT\b|QUOTA_EXHAUSTED\b)/.test(message))
    return 'CODEX_QUOTA';
  if (/^(?:USV_CODEX_AUTH_UNAVAILABLE\b|Codex must be signed in with a ChatGPT subscription)/.test(message))
    return 'CODEX_AUTH_UNAVAILABLE';
  if (/^USV_CODEX_TRANSPORT_UNAVAILABLE\b/.test(message))
    return 'CODEX_TRANSPORT_UNAVAILABLE';
  if (/^USV_CODEX_MODEL_UNAVAILABLE\b/.test(message))
    return 'CODEX_MODEL_UNAVAILABLE';
  return null;
}
