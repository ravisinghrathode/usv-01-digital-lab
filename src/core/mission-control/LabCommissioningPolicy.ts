/**
 * USV-01 research commissioning authority boundary.
 *
 * Permission to run signed-in ChatGPT/Codex agents for non-operational research
 * is NOT approval of the vessel design, any numerical conclusion, an engineering
 * baseline, a GitHub merge, or a release to physical hardware.
 *
 * The existing USV_SUBSCRIPTION_PILOT opt-in authorizes *only* this bounded
 * research scope. No new Director engineering-baseline signature is required
 * to attempt research tasks, but source-code merges continue to obey their
 * separate, exact-commit repository governance checks.
 */
export const LAB_COMMISSIONING_SCOPE = 'LAB_COMMISSIONING_RESEARCH' as const;

export interface LabCommissioningDecision {
  scope: typeof LAB_COMMISSIONING_SCOPE;
  permitted: boolean;
  blockers: string[];
  provider: 'codex_cli';
  operatorOptIn: boolean;
  nonOperational: true;
  engineeringBaselineApproved: false;
  engineeringReleaseApproved: false;
  hardwareControlAuthorized: false;
  independentEngineeringReviewSatisfied: false;
}

export function evaluateLabCommissioningPolicy(
  env: Record<string, string | undefined>
): LabCommissioningDecision {
  const blockers: string[] = [];
  const operatorOptIn = env.USV_SUBSCRIPTION_PILOT === 'enabled';
  if (!operatorOptIn) blockers.push('Subscription-based lab research requires USV_SUBSCRIPTION_PILOT=enabled.');
  if (env.AI_REVIEW_PROVIDER !== 'codex_cli') {
    blockers.push('Research commissioning requires ChatGPT Codex CLI, not Gemini, deterministic-only, or paid API execution.');
  }
  // Optional explicit declaration may reinforce, but never expand, the default.
  if (env.USV_LAB_SCOPE !== undefined && env.USV_LAB_SCOPE !== 'RESEARCH_ONLY') {
    blockers.push('USV_LAB_SCOPE must be RESEARCH_ONLY; design release is forbidden in a commissioning session.');
  }
  if (env.USV_ALLOW_PAID_AI_API === 'true') {
    blockers.push('Paid AI API use is prohibited in subscription-only commissioning.');
  }
  if (env.USV_ENABLE_ACTUATOR_CONTROL === 'true' ||
      env.USV_ALLOW_ACTUATOR_CONTROL === 'true') {
    blockers.push('Physical vessel actuator control is prohibited in laboratory commissioning.');
  }
  if (env.USV_ENGINEERING_RELEASE_AUTHORIZED === 'true' ||
      env.USV_VESSEL_BASELINE_APPROVED === 'true') {
    blockers.push('A commissioning session cannot claim approval of an engineering baseline or vessel release.');
  }

  return {
    scope: LAB_COMMISSIONING_SCOPE,
    permitted: blockers.length === 0,
    blockers,
    provider: 'codex_cli',
    operatorOptIn,
    nonOperational: true,
    engineeringBaselineApproved: false,
    engineeringReleaseApproved: false,
    hardwareControlAuthorized: false,
    independentEngineeringReviewSatisfied: false
  };
}

export function requireLabCommissioningPolicy(
  env: Record<string, string | undefined>
): LabCommissioningDecision {
  const decision = evaluateLabCommissioningPolicy(env);
  if (!decision.permitted) {
    throw new Error(`USV-01 restricted lab commissioning refused: ${decision.blockers.join(' ')}`);
  }
  return decision;
}
