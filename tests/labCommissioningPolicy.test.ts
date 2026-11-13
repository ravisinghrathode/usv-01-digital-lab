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

  it.each([
    [{ ...valid, USV_SUBSCRIPTION_PILOT: 'disabled' }, 'subscription opt-in'],
    [{ ...valid, AI_REVIEW_PROVIDER: 'gemini' }, 'Gemini provider'],
    [{ ...valid, AI_REVIEW_PROVIDER: 'openai' }, 'paid API provider'],
    [{ ...valid, USV_ALLOW_PAID_AI_API: 'true' }, 'paid API enabled'],
    [{ ...valid, USV_LAB_SCOPE: 'ENGINEERING_RELEASE' }, 'scope escalation'],
    [{ ...valid, USV_ENABLE_ACTUATOR_CONTROL: 'true' }, 'actuator access'],
    [{ ...valid, USV_ALLOW_ACTUATOR_CONTROL: 'true' }, 'actuator override'],
    [{ ...valid, USV_ENGINEERING_RELEASE_AUTHORIZED: 'true' }, 'false release claim'],
    [{ ...valid, USV_VESSEL_BASELINE_APPROVED: 'true' }, 'false design approval claim']
  ])('blocks unsafe commissioning configuration: %s (%s)', env => {
    const decision = evaluateLabCommissioningPolicy(env);
    expect(decision.permitted).toBe(false);
    expect(decision.blockers.length).toBeGreaterThan(0);
    expect(decision.engineeringReleaseApproved).toBe(false);
    expect(decision.hardwareControlAuthorized).toBe(false);
    expect(() => requireLabCommissioningPolicy(env)).toThrow(/restricted lab commissioning refused/);
  });

  it('allows only the optional explicitly narrower RESEARCH_ONLY declaration', () => {
    expect(evaluateLabCommissioningPolicy({ ...valid, USV_LAB_SCOPE: 'RESEARCH_ONLY' }).permitted).toBe(true);
  });
});
