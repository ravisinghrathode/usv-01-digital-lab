import { describe, expect, it } from 'vitest';
import {
  evaluateLabCommissioningPolicy,
  requireLabCommissioningPolicy,
  LAB_COMMISSIONING_SCOPE
} from '../src/core/mission-control/LabCommissioningPolicy.ts';

const valid = {
  AI_REVIEW_PROVIDER: 'codex_cli',
  USV_SUBSCRIPTION_PILOT: 'enabled',
  USV_ALLOW_PAID_AI_API: 'false'
};

describe('USV-01 two-stage authority boundary', () => {
  it('permits explicitly opted-in ChatGPT research without falsely approving a vessel baseline', () => {
    const decision = requireLabCommissioningPolicy(valid);
    expect(decision).toMatchObject({
      permitted: true,
      scope: LAB_COMMISSIONING_SCOPE,
      provider: 'codex_cli',
      operatorOptIn: true,
      nonOperational: true,
      engineeringBaselineApproved: false,
      engineeringReleaseApproved: false,
      hardwareControlAuthorized: false,
      independentEngineeringReviewSatisfied: false
    });
  });

  it('does not require an engineering design signature before gathering research evidence', () => {
    const decision = evaluateLabCommissioningPolicy({
      ...valid,
      DIRECTOR_PUBLIC_KEY: undefined,
      USV_ENGINEERING_RELEASE_AUTHORIZED: undefined,
      USV_VESSEL_BASELINE_APPROVED: undefined
    });
    expect(decision.permitted).toBe(true);
    expect(decision.engineeringBaselineApproved).toBe(false);
  });

  const rejectedConfigurations: Array<{ env: Record<string, string>; reason: string }> = [
    { env: { ...valid, USV_SUBSCRIPTION_PILOT: 'disabled' }, reason: 'subscription opt-in' },
    { env: { ...valid, AI_REVIEW_PROVIDER: 'gemini' }, reason: 'Gemini provider' },
    { env: { ...valid, AI_REVIEW_PROVIDER: 'openai' }, reason: 'paid API provider' },
    { env: { ...valid, USV_ALLOW_PAID_AI_API: 'true' }, reason: 'paid API enabled' },
    { env: { ...valid, USV_LAB_SCOPE: 'ENGINEERING_RELEASE' }, reason: 'scope escalation' },
    { env: { ...valid, USV_ENABLE_ACTUATOR_CONTROL: 'true' }, reason: 'actuator access' },
    { env: { ...valid, USV_ALLOW_ACTUATOR_CONTROL: 'true' }, reason: 'actuator override' },
    { env: { ...valid, USV_ENGINEERING_RELEASE_AUTHORIZED: 'true' }, reason: 'false release claim' },
    { env: { ...valid, USV_VESSEL_BASELINE_APPROVED: 'true' }, reason: 'false design approval claim' }
  ];
  for (const { env, reason } of rejectedConfigurations) {
    it(`blocks unsafe commissioning configuration: ${reason}`, () => {
      const decision = evaluateLabCommissioningPolicy(env);
      expect(decision.permitted).toBe(false);
      expect(decision.blockers.length).toBeGreaterThan(0);
      expect(decision.engineeringReleaseApproved).toBe(false);
      expect(decision.hardwareControlAuthorized).toBe(false);
      expect(() => requireLabCommissioningPolicy(env)).toThrow(/restricted lab commissioning refused/);
    });
  }

  it('allows only the optional explicitly narrower RESEARCH_ONLY declaration', () => {
    expect(evaluateLabCommissioningPolicy({ ...valid, USV_LAB_SCOPE: 'RESEARCH_ONLY' }).permitted).toBe(true);
  });
});
