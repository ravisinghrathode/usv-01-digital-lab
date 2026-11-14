import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  contrastRatio, parseStudioTextSize, STUDIO_TEXT_COLORS, STUDIO_TEXT_PREFERENCE_KEY
} from '../src/studio/readability';
import { StudioWorkspaceBar } from '../src/components/StudioWorkspaceBar';
import { MODULE_REGISTRY } from '../src/moduleRegistry';

const fromRepo = (path: string) =>
  readFileSync(new URL('../' + path, import.meta.url), 'utf8');

describe('Naval Studio X.2 readable interface', () => {
  it('meets WCAG AA 4.5:1 for primary, secondary, muted and accent text on the dark shell', () => {
    const { surface, primary, secondary, muted, accent } = STUDIO_TEXT_COLORS;
    for (const [label, color] of Object.entries({primary, secondary, muted, accent})) {
      expect(contrastRatio(color, surface), label).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('defaults to comfortable text but permits persistent larger text', () => {
    expect(parseStudioTextSize(null)).toBe('comfortable');
    expect(parseStudioTextSize('old')).toBe('comfortable');
    expect(parseStudioTextSize('comfortable')).toBe('comfortable');
    expect(parseStudioTextSize('large')).toBe('large');
    expect(STUDIO_TEXT_PREFERENCE_KEY).toBe('naval-studio-text-size');
    const app = fromRepo('src/App.tsx');
    expect(app).toContain('data-text-size={textSize}');
    expect(app).toContain('onChangeTextSize={changeTextSize}');
    expect(app).toContain('localStorage.setItem(STUDIO_TEXT_PREFERENCE_KEY, next)');
  });

  it('renders an accessible active text-size control', () => {
    const ui = renderToStaticMarkup(
      <StudioWorkspaceBar currentModule="cad-studio" onSelectModule={() => {}}
        textSize="comfortable" onChangeTextSize={() => {}} />
    );
    expect(ui).toContain('Text: Comfortable');
    expect(ui).toContain('Enable larger text');
    expect(ui).toContain('aria-pressed="false"');
    const large = renderToStaticMarkup(
      <StudioWorkspaceBar currentModule="cad-studio" onSelectModule={() => {}}
        textSize="large" onChangeTextSize={() => {}} />
    );
    expect(large).toContain('Text: Large');
    expect(large).toContain('aria-pressed="true"');
  });

  it('isolates dark text corrections to new workbench surfaces, leaving legacy modules untouched', () => {
    const css = fromRepo('src/index.css');
    expect(css).toContain('.studio-x .studio-dark .text-slate-300');
    expect(css).toContain('.studio-x .studio-dark .text-slate-400');
    expect(css).toContain('.studio-x .studio-dark .text-cyan-300');
    expect(css).toContain('.studio-x[data-text-size="large"]');
    expect(css).toContain('[class~="text-xs"]');
    expect(css).toContain('font-size: var(--studio-xs-font)');
    expect(css).toContain('.studio-x :focus-visible');

    const components = [
      'StudioNavigation', 'StudioWorkspaceBar', 'StudioContextStrip',
      'TopBar', 'CadStudioView', 'DirectorBriefing', 'StudioCommandPalette'
    ];
    for (const component of components) {
      expect(fromRepo('src/components/' + component + '.tsx'), component)
        .toContain('studio-dark');
    }
  });

  it('preserves all 24 engineering modules and single Studio X shell', () => {
    expect(MODULE_REGISTRY).toHaveLength(24);
    const app = fromRepo('src/App.tsx');
    for (const module of MODULE_REGISTRY) {
      expect(app, module.id).toContain(`currentModule === '${module.id}'`);
    }
    expect(app).not.toContain('NavigationSidebar');
  });
});
