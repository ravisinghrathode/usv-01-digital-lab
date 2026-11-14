/**
 * Naval Studio X is the product default.
 * Explicit URL selection wins over a persisted user preference.
 * Classic remains available as a deliberate per-browser fallback.
 */
export function resolveInitialStudioLayout(requested: string | null, stored: string | null): boolean {
  if (requested === 'studio') return true;
  if (requested === 'classic') return false;
  return stored !== 'classic';
}
