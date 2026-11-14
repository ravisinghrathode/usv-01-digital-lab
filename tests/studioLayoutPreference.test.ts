import { describe, expect, it } from 'vitest';
import { resolveInitialStudioLayout } from '../src/studioLayoutPreference';

describe('Naval Studio X default layout', () => {
  it('opens Studio X on first visit', () => {
    expect(resolveInitialStudioLayout(null, null)).toBe(true);
  });

  it('opens Studio X when saved preference is Studio', () => {
    expect(resolveInitialStudioLayout(null, 'studio')).toBe(true);
  });

  it('does not let obsolete or unknown stored preferences force Classic', () => {
    expect(resolveInitialStudioLayout(null, 'legacy')).toBe(true);
  });

  it('preserves an explicit Classic preference', () => {
    expect(resolveInitialStudioLayout(null, 'classic')).toBe(false);
  });

  it('lets a Classic URL override a Studio preference', () => {
    expect(resolveInitialStudioLayout('classic', 'studio')).toBe(false);
  });

  it('lets a Studio URL override a Classic preference', () => {
    expect(resolveInitialStudioLayout('studio', 'classic')).toBe(true);
  });

  it('does not treat unknown URL values as Classic', () => {
    expect(resolveInitialStudioLayout('other', null)).toBe(true);
  });
});
