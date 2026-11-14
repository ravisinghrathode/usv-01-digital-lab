import type { NavigationModule } from '../moduleRegistry';

/** Stable HTML ids for the one-source-of-truth module registry. */
export const studioTabId = (module: NavigationModule): string => 'studio-tab-' + module;
export const studioPanelId = (module: NavigationModule): string => 'studio-panel-' + module;

export function nextWorkTab(
  openTabs: readonly NavigationModule[],
  currentIndex: number,
  key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'
): NavigationModule | null {
  if (!openTabs.length) return null;
  const index = Math.max(0, openTabs.length > currentIndex ? currentIndex : 0);
  if (key === 'Home') return openTabs[0];
  if (key === 'End') return openTabs[openTabs.length - 1];
  if (key === 'ArrowLeft') return openTabs[(index - 1 + openTabs.length) % openTabs.length];
  return openTabs[(index + 1) % openTabs.length];
}
