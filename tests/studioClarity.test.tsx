import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { StudioNavigation } from '../src/components/StudioNavigation';
import { StudioWorkspaceBar } from '../src/components/StudioWorkspaceBar';
import { StudioContextStrip } from '../src/components/StudioContextStrip';
import { TopBar } from '../src/components/TopBar';
import { DirectorBriefing } from '../src/components/DirectorBriefing';
import { contrastRatio } from '../src/studio/readability';
import { MODULE_REGISTRY } from '../src/moduleRegistry';
import { INITIAL_REQUIREMENTS, INITIAL_DECISIONS, INITIAL_RISKS,
  INITIAL_SIMULATIONS, INITIAL_VERIFICATION_PLANS } from '../src/data/initialProjectData';

const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

describe('Naval Studio Clarity — new interface contract', () => {
  it('keeps the entire 24-module engineering application in one shell', () => {
    expect(MODULE_REGISTRY).toHaveLength(24);
    const app = source('src/App.tsx');
    expect(app).toContain('data-ui="clarity"');
    expect(app).toContain('className="studio-x flex');
    expect(app).toContain('openTabs.map(tab =>');
    expect(app).toContain('<StudioNavigation');
    expect(app).toContain('<StudioWorkspaceBar');
    expect(app).toContain('<CadStudioView');
    expect(app).not.toContain('NavigationSidebar');
    for (const module of MODULE_REGISTRY) {
      expect(app, module.id).toContain(`currentModule === '${module.id}'`);
    }
  });

  it('provides high contrast for all primary shell text roles', () => {
    const surfaces = {
      paper: '#ffffff',
      shell: '#f7f9fa',
      background: '#eef3f5'
    };
    const textRoles = { primary: '#152d39', secondary: '#45606b', muted: '#526b76' };
    for (const [surfaceName, surface] of Object.entries(surfaces)) {
      for (const [role, foreground] of Object.entries(textRoles)) {
        expect(contrastRatio(foreground, surface), `${role} on ${surfaceName}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    const css = source('src/studio/clarity.css');
    expect(css).toContain('--ns-ink: #152d39');
    expect(css).toContain('--ns-secondary: #45606b');
    expect(css).toContain('--ns-muted: #526b76');
    expect(css).toContain('--ns-accent: #096b7e');
    expect(css).toContain('.studio-dark .bg-slate-950');
    expect(css).toContain('.studio-dark .bg-white');
    expect(source('src/main.tsx')).toContain("import './studio/clarity.css'");
  });

  it('renders legible, accessible module navigation with project provenance', () => {
    const html = renderToStaticMarkup(
      <StudioNavigation currentModule="cad-studio" onSelectModule={()=>{}} onOpenCommand={()=>{}}/>
    );
    expect(html).toContain('NAVAL STUDIO');
    expect(html).toContain('USV-01 · Primary Vessel');
    expect(html).toContain('CAD Studio');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Search all modules');
    expect(html).toContain('24');
    const nav = source('src/components/StudioNavigation.tsx');
    expect(nav).toContain("event.key === 'Escape'");
    expect(nav).toContain("event.key !== 'Tab'");
    expect(nav).toContain('openButton.current?.focus()');
    expect(nav).toContain('closeButton.current?.focus()');
    expect(nav).toContain('role={mobileOpen');
  });

  it('preserves workspaces, tabs, font enlargement and engineering action controls', () => {
    const tabs = renderToStaticMarkup(<StudioWorkspaceBar currentModule="overview"
      onSelectModule={()=>{}} openTabs={['cad-studio','overview','workstream-HYD']}
      onCloseTab={()=>{}} textSize="large" onChangeTextSize={()=>{}}/>);
    expect(tabs).toContain('Product &amp; CAD');
    expect(tabs).toContain('Programme');
    expect(tabs).toContain('Engineering');
    expect(tabs).toContain('Assurance');
    expect(tabs).toContain('Text: Large');
    expect(tabs).toContain('aria-selected="true"');
    expect(tabs).toContain('role="tablist"');
    const bar = renderToStaticMarkup(<TopBar currentModuleName="CAD Studio"
      onOpenSearch={()=>{}} onOpenNewRecord={()=>{}} onOpenExportImport={()=>{}}
      onResetDemo={()=>{}} onToggleAiAssistant={()=>{}} isAiAssistantOpen={false}
      onOpenContextGuide={()=>{}} onOpenLogin={()=>{}} onLogout={()=>{}} onOpenVerify={()=>{}}/>);
    expect(bar).toContain('Find records');
    expect(bar).toContain('New record');
    expect(bar).toContain('VERIFY USV-01');
    expect(bar).toContain('Engineering AI');
    expect(bar).toContain('More application actions');
    expect(bar).toContain('Backup / Import JSON');
    expect(bar).toContain('Reset illustrative demo');
    expect(renderToStaticMarkup(<StudioContextStrip/>)).toContain('UI selection only');
  });

  it('renders the Director decision ledger using current engineering records, not fabricated figures', () => {
    const html = renderToStaticMarkup(<DirectorBriefing
      requirements={INITIAL_REQUIREMENTS} decisions={INITIAL_DECISIONS} risks={INITIAL_RISKS}
      simulations={INITIAL_SIMULATIONS} verificationPlans={INITIAL_VERIFICATION_PLANS}
      onNavigate={()=>{}} onDetailed={()=>{}}/>);
    expect(html).toContain('Director');
    expect(html).toContain('Decision queue');
    expect(html).toContain('Technical risks');
    expect(html).toContain('Authoritative CAD revision: TBD');
    expect(html).toContain('Recorded Approved status');
    expect(html).not.toContain('All risks resolved');
  });

  it('provides keyboard control, bounded image fallback and unverified vessel provenance', () => {
    const vessel = source('src/components/Vessel3DVisualizer.tsx');
    expect(vessel).toContain('onKeyDown={handleKeyboardView}');
    expect(vessel).toContain('tabIndex={0}');
    expect(vessel).toContain("e.key === 'Home'");
    expect(vessel).toContain("prev === 'primary' ? 'fallback' : 'unavailable'");
    expect(vessel).toContain('renderImageState === \'unavailable\'');
    expect(vessel).toContain('not approved CAD geometry');
    const cad = source('src/components/CadStudioView.tsx');
    expect(cad).toContain('ns3-cad-workstage');
    expect(cad).toContain('ns3-viewport-stage');
    expect(cad).toContain('Preview only · no authoritative CAD loaded');
  });
});
