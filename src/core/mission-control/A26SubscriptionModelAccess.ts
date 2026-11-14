/**
 * A26-only GPT-6 Astra request through the signed-in ChatGPT Codex CLI.
 * This is not OpenAI API access and does not authenticate a model identity.
 * Default OFF to preserve the user's finite subscription allowance.
 */
export const A26_CODEX_AGENT_ID = 'INTEL-USV-26';
export const A26_GPT6_MODEL = 'gpt-6-astra' as const;
export const A26_GPT6_OPT_IN = 'USV_A26_GPT6_SUBSCRIPTION';

export function selectA26SubscriptionModel(
  agentId: unknown,
  env: NodeJS.ProcessEnv = process.env
): typeof A26_GPT6_MODEL | undefined {
  if (agentId !== A26_CODEX_AGENT_ID) return undefined;
  if (env[A26_GPT6_OPT_IN] !== 'enabled') return undefined;

  if (env.USV_ALLOW_PAID_AI_API !== 'false') {
    throw new Error('A26 GPT-6 subscription HOLD: explicit USV_ALLOW_PAID_AI_API=false required.');
  }
  if (env.AI_REVIEW_PROVIDER !== 'codex_cli' || env.USV_SUBSCRIPTION_PILOT !== 'enabled') {
    throw new Error('A26 GPT-6 subscription HOLD: authenticated Codex CLI pilot required.');
  }
  if (env.USV_NO_PAID_API === '0') {
    throw new Error('A26 GPT-6 subscription HOLD: paid API flag conflict.');
  }
  return A26_GPT6_MODEL;
}
