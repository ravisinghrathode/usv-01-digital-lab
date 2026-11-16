/**
 * Project-approved, research-only dual-provider transport contract.
 * A ChatGPT sign-in is not an OpenAI API key; a Google OAuth sign-in is not
 * authorization to transfer restricted naval/client information to Gemini.
 * No automatic fallback on model refusal, bad math, invalid JSON, or approvals.
 */
/**
 * Bounded single Codex CLI argument for owner-authorized, source-pinned
 * research. Earlier 24k cap rejected A23's complete 25,836-character
 * synthetic review even after lossless prompt compaction. The Mac CLI argument
 * and model input are still capped; no truncation or paid API bypass.
 */
export const CODEX_CLI_MAX_PROMPT_CHARS = 48_000 as const;
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

/**
 * Source-reviewed auto routing is limited to the trusted owner's exact,
 * fixed synthetic catalog and personal OAuth-only Gemini CLI. The owner
 * research launcher derives these flags AFTER validating the signed source,
 * private host/A04 receipt and catalog digest. Environment declarations by
 * themselves do not approve a controlled naval/client transfer.
 */
export function sourcePinnedSyntheticGeminiAutoRoute(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return dualProviderEnabled(env) &&
    env.USV_GEMINI_AUTO_SYNTHETIC_ROUTE === 'SOURCE_PINNED_OWNER_RESEARCH' &&
    env.USV_GEMINI_DATA_CLASSIFICATION === 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL' &&
    env.USV_GEMINI_AUTH_METHOD === 'oauth-personal' &&
    /^[a-f0-9]{64}$/.test(env.USV_GEMINI_SYNTHETIC_CATALOG_SHA256 || '');
}

/** The user authorizes automatic routing for the fixed synthetic catalog. */
export function geminiTransferAuthorized(env: NodeJS.ProcessEnv = process.env): boolean {
  const explicitLegacy = dualProviderEnabled(env) &&
    env.USV_GEMINI_FALLBACK_APPROVED === 'true' &&
    env.USV_GEMINI_OAUTH_REVIEWED === 'true' &&
    env.USV_GEMINI_DATA_CLASSIFICATION === 'PUBLIC_NON_SENSITIVE';
  return explicitLegacy || sourcePinnedSyntheticGeminiAutoRoute(env);
}

/**
 * Machine-readable gate for a controlled, reviewed campaign catalog.
 * A file label alone does not authorize transfer: explicit operator and
 * independently reviewed external service permissions are also required.
 */
export function geminiCatalogTransferPermitted(
  classification: unknown, env: NodeJS.ProcessEnv = process.env
): boolean {
  if (sourcePinnedSyntheticGeminiAutoRoute(env)) {
    return classification === 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL';
  }
  return geminiTransferAuthorized(env) &&
    (classification === 'PUBLIC_NON_SENSITIVE' ||
     classification === 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL');
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
