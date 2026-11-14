/** UI-only preferences. Do not use these values for engineering data or evidence. */
export type StudioTextSize = 'comfortable' | 'large';
export const STUDIO_TEXT_PREFERENCE_KEY = 'naval-studio-text-size';

export function parseStudioTextSize(input: string | null | undefined): StudioTextSize {
  return input === 'large' ? 'large' : 'comfortable';
}

/** Contrast targets for dark studio UI are verified in tests against WCAG AA. */
export const STUDIO_TEXT_COLORS = {
  surface: '#101b2a',
  primary: '#f1f5f9',
  secondary: '#cbd5e1',
  muted: '#a8b9cf',
  accent: '#67e8f9'
} as const;

function relativeLuminance(hex: string): number {
  const rgb = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(rgb)) throw new Error('Expected a six-digit hex colour');
  const channels = [0, 2, 4].map(i => {
    const channel = parseInt(rgb.slice(i, i + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
