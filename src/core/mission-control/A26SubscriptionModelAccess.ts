/**
 * A26's standard GPT-6 Sol model over the operator's signed-in ChatGPT
 * subscription. No OpenAI API access, no additional standalone paid model.
 * The existing subscription research pilot remains the required authorization.
 */
export const A26_CODEX_AGENT_ID = 'INTEL-USV-26';
export const A26_GPT6_MODEL = 'gpt-6-sol' as const;

export function selectA26SubscriptionModel(
  agentId: unknown,
  env: NodeJS.ProcessEnv = process.env
): typeof A26_GPT6_MODEL | undefined {
  if (agentId !== A26_CODEX_AGENT_ID) return undefined;

  if (env.USV_ALLOW_PAID_AI_API === 'true' || env.USV_NO_PAID_API === '0') {
    throw new Error('A26 GPT-6 Sol subscription HOLD: paid API authorization conflicts with subscription-only mode.');
  }
  if (env.AI_REVIEW_PROVIDER !== 'codex_cli' || env.USV_SUBSCRIPTION_PILOT !== 'enabled') {
    throw new Error('A26 GPT-6 Sol subscription HOLD: signed-in Codex subscription research pilot required.');
  }
  // Standard GPT-6 is the A26 model for an authorized subscription session.
  // No Astra entitlement, auxiliary flag or separately billed API is needed.
  return A26_GPT6_MODEL;
}
