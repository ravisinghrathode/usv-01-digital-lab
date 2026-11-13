import { describe, expect, it } from 'vitest';
import { assertPaidAiApiAllowed, isPaidAiApiAllowed } from '../src/core/models/AiBillingPolicy.ts';

describe('AI billing policy', () => {
  it('denies paid AI APIs by default', () => {
    expect(isPaidAiApiAllowed({})).toBe(false);
    expect(() => assertPaidAiApiAllowed('gemini', {})).toThrow(/disabled/);
  });

  it('requires explicit true opt-in', () => {
    expect(isPaidAiApiAllowed({ USV_ALLOW_PAID_AI_API: 'false' })).toBe(false);
    expect(isPaidAiApiAllowed({ USV_ALLOW_PAID_AI_API: '1' })).toBe(false);
    expect(isPaidAiApiAllowed({ USV_ALLOW_PAID_AI_API: 'true' })).toBe(true);
  });
});
