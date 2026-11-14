import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { MODULE_REGISTRY, searchModules } from '../src/moduleRegistry';
import { CadStudioView } from '../src/components/CadStudioView';
import { INITIAL_NAVAL_PARTICULARS } from '../src/data/initialProjectData';
import { readFileSync } from 'node:fs';

const LEGACY_MODULE_IDS = [
  'overview', 'agent-orchestrator', 'orchestrator-tools', 'orchestrator-approvals',
  'global-usv-fleet', 'external-software', 'workstream-SYS', 'workstream-NAV',
  'workstream-HYD', 'workstream-MEC', 'workstream-ELE', 'workstream-PRP',
  'workstream-AUT', 'workstream-VNV', 'traceability', 'simulations',
  'risks-decisions', 'procurement-bom', 'knowledge-centre', 'realtime-sim',
  'ship-building', 'generative-optimizer', 'notebook-lm'
];

describe('Naval Studio X preservation', () => {
  it('registers every pre-existing module exactly once and adds CAD Studio', () => {
    const ids = MODULE_REGISTRY.map((module) => module.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(24);
    for (const id of LEGACY_MODULE_IDS) expect(ids).toContain(id);
    expect(ids).toContain('cad-studio');
  });

  it('keeps every registered module routed to its existing view', () => {
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    for (const { id } of MODULE_REGISTRY) {
      expect(app, `${id} must have a view branch`).toContain(`currentModule === '${id}'`);
    }
    expect(app).toContain('<StudioNavigation');
    expect(app).toContain('<StudioWorkspaceBar');
    expect(app).toContain('<CadStudioView');
  });

  it('exposes only Naval Studio X, including for legacy Classic URLs and saved choices', () => {
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    const navigation = readFileSync(new URL('../src/components/StudioNavigation.tsx', import.meta.url), 'utf8');
    expect(app).toContain("useState<NavigationModule>('cad-studio')");
    expect(app).toContain('className="studio-x flex');
    expect(app).not.toContain('NavigationSidebar');
    expect(app).not.toContain('studioLayout');
    expect(app).not.toContain('initialStudioLayout');
    expect(app).not.toContain('naval-studio-x-layout');
    expect(app).not.toContain("searchParams.get('ui')");
    expect(app).not.toContain('Try Naval Studio X');
    expect(navigation).not.toContain('onUseClassic');
    expect(navigation).not.toContain('Switch to classic layout');
  });

  it('searches the full catalogue, including hidden groups', () => {
    expect(searchModules('hydrodynamics').map((module) => module.id)).toEqual(['workstream-HYD']);
    expect(searchModules('approval').map((module) => module.id)).toContain('orchestrator-approvals');
  });

  it('does not present preview geometry or seeded numbers as authoritative CAD', () => {
    const html = renderToStaticMarkup(<CadStudioView particulars={INITIAL_NAVAL_PARTICULARS} onNavigate={() => {}} />);
    expect(html).toContain('Preview only · no authoritative CAD loaded');
    expect(html).toContain('It is not the product geometry');
    expect(html).toContain('Unverified / TBD');
    expect(html).not.toContain('10.50 m');
    expect(html).not.toContain('6.20 tonnes');
  });
});
