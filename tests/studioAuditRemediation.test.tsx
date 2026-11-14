import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MODULE_REGISTRY } from '../src/moduleRegistry';
import { searchLoadedRecords, SearchableRecord } from '../src/studio/recordSearch';
import { nextWorkTab, studioPanelId, studioTabId } from '../src/studio/workTabs';
import { shouldAnimateViewport } from '../src/studio/viewportActivity';
import { StudioWorkspaceBar } from '../src/components/StudioWorkspaceBar';
import { StudioCommandPalette } from '../src/components/StudioCommandPalette';
import { TopBar } from '../src/components/TopBar';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const sample: SearchableRecord[] = [
  {id:'REQ-004',title:'Hull integrity',summary:'Wave impact and loads',kind:'Requirement',module:'workstream-SYS',status:'In Review'},
  {id:'SIM-011',title:'Resistance estimate',summary:'OpenFOAM geometry assumption',kind:'Simulation',module:'simulations',status:'Draft'},
  {id:'RISK-003',title:'Link-loss navigation',summary:'Uncontrolled drift',kind:'Risk',module:'risks-decisions',status:'Open'}
];

describe('Studio X.2 technical audit remediation', () => {
  it('searches locally loaded records by ID, title and explanatory terms', () => {
    expect(searchLoadedRecords(sample, 'REQ-004').map(r=>r.id)).toEqual(['REQ-004']);
    expect(searchLoadedRecords(sample, 'link-loss').map(r=>r.id)).toEqual(['RISK-003']);
    expect(searchLoadedRecords(sample, 'openfoam').map(r=>r.id)).toEqual(['SIM-011']);
    expect(searchLoadedRecords(sample, 'hull loads').map(r=>r.id)).toEqual(['REQ-004']);
    expect(searchLoadedRecords(sample, '')).toEqual([]);
    expect(searchLoadedRecords(sample, 'a')).toEqual([]);
    expect(searchLoadedRecords(sample, 'no-match')).toEqual([]);
    expect(searchLoadedRecords(sample, 'sim', 1)).toHaveLength(1);
  });

  it('uses a native modal, combobox, live results and honest local-search scope', () => {
    const html=renderToStaticMarkup(<StudioCommandPalette open={true} onClose={()=>{}} onSelect={()=>{}} records={sample}/>);
    expect(html).toContain('<dialog');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toContain('aria-controls=');
    expect(html).toContain('role="listbox"');
    expect(html).toContain('role="status"');
    expect(html).toContain('Search only records already loaded');
    expect(html).toContain('on a specific record');
  });

  it('provides real search and all secondary actions from a narrow-screen menu', () => {
    const html=renderToStaticMarkup(<TopBar currentModuleName="CAD Studio"
      onOpenSearch={()=>{}} onOpenNewRecord={()=>{}} onOpenExportImport={()=>{}}
      onResetDemo={()=>{}} onToggleAiAssistant={()=>{}} isAiAssistantOpen={false}
      onOpenContextGuide={()=>{}} onOpenLogin={()=>{}} onLogout={()=>{}}
      onOpenVerify={()=>{}}/>);
    expect(html).toContain('Search loaded engineering records and modules');
    expect(html).toContain('More application actions');
    expect(html).toContain('New engineering record');
    expect(html).toContain('Backup / Import JSON');
    expect(html).toContain('Reset illustrative demo');
    expect(html).toContain('VERIFY USV-01');
  });

  it('implements proper accessible work tabs and arrow/Home/End selection',()=>{
    const tabs = ['cad-studio', 'overview', 'simulations'] as const;
    expect(nextWorkTab(tabs, 0, 'ArrowLeft')).toBe('simulations');
    expect(nextWorkTab(tabs, 2, 'ArrowRight')).toBe('cad-studio');
    expect(nextWorkTab(tabs, 1, 'Home')).toBe('cad-studio');
    expect(nextWorkTab(tabs, 1, 'End')).toBe('simulations');
    const html=renderToStaticMarkup(<StudioWorkspaceBar currentModule="overview" onSelectModule={()=>{}}
      openTabs={[...tabs]} onCloseTab={()=>{}} textSize="comfortable" onChangeTextSize={()=>{}}/>);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-orientation="horizontal"');
    expect(html).toContain(`id="${studioTabId('overview')}"`);
    expect(html).toContain(`aria-controls="${studioPanelId('overview')}"`);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('tabindex="-1"');
    const app=read('src/App.tsx');
    expect(app).toContain('id={studioPanelId(tab)}');
    expect(app).toContain('aria-labelledby={studioTabId(tab)}');
  });

  it('pauses animation when the tab is hidden, the browser is hidden, or reduced motion is requested',()=>{
    expect(shouldAnimateViewport(true,false,false)).toBe(true);
    expect(shouldAnimateViewport(false,false,false)).toBe(false);
    expect(shouldAnimateViewport(true,true,false)).toBe(false);
    expect(shouldAnimateViewport(true,false,true)).toBe(false);
    const visualizer=read('src/components/Vessel3DVisualizer.tsx');
    expect(visualizer).toContain('IntersectionObserver');
    expect(visualizer).toContain('visibilitychange');
    expect(visualizer).toContain('prefers-reduced-motion');
    expect(visualizer).toContain('now - lastTick >= 66');
    const mesh=read('src/components/MeshViewport.tsx');
    expect(mesh).toContain('scheduledFrame.current = requestAnimationFrame');
    expect(mesh).toContain('renderFrame.current = draw');
    expect(mesh).toContain('onKeyDown={event =>');
    expect(mesh).not.toContain('setAngle(');
  });

  it('keeps accessible contrast rules scoped and avoids killing all motion feedback',()=>{
    const css=read('src/index.css');
    expect(css).toContain('.studio-x .studio-dark.text-slate-300');
    expect(css).toContain('.studio-x .studio-dark .text-slate-300');
    expect(css).toContain('button { min-height: 44px; }');
    expect(css).not.toContain('animation-duration: 0.01ms !important');
  });

  it('does not remove any of the 24 existing module routes or their permissions',()=>{
    expect(MODULE_REGISTRY).toHaveLength(24);
    const app=read('src/App.tsx');
    for(const module of MODULE_REGISTRY)expect(app).toContain(`currentModule === '${module.id}'`);
    expect(app).toContain('<StudioNavigation');
    expect(app).toContain('<StudioWorkspaceBar');
    expect(app).not.toContain('NavigationSidebar');
    expect(app).toContain('getCurrentUser()');
  });
});
