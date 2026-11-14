import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { DOCKYARD_AREAS, dockyardAreaFor } from '../src/studio/dockyardAreas';
import { MODULE_REGISTRY } from '../src/moduleRegistry';
import { contrastRatio } from '../src/studio/readability';
import { StudioNavigation } from '../src/components/StudioNavigation';
import { StudioWorkspaceBar } from '../src/components/StudioWorkspaceBar';
import { DockyardContextDock } from '../src/components/DockyardContextDock';
import { DockyardAgentDesk } from '../src/components/DockyardAgentDesk';
import { DockyardAssuranceDesk } from '../src/components/DockyardAssuranceDesk';
import { CadStudioView } from '../src/components/CadStudioView';
import {
  INITIAL_REQUIREMENTS, INITIAL_SIMULATIONS, INITIAL_VERIFICATION_PLANS,
  INITIAL_DECISIONS, INITIAL_RISKS, INITIAL_TEST_RECORDS, INITIAL_NAVAL_PARTICULARS
} from '../src/data/initialProjectData';

const source=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

describe('Dockyard Design A — task-centred engineering UI',()=>{
  it('maps each existing module to exactly one of the five operating areas',()=>{
    expect(DOCKYARD_AREAS.map(a=>a.id)).toEqual(['product','engineering','programme','agents','assurance']);
    const assigned=DOCKYARD_AREAS.flatMap(a=>a.modules);
    expect(assigned).toHaveLength(24);
    expect(new Set(assigned).size).toBe(24);
    expect([...assigned].sort()).toEqual(MODULE_REGISTRY.map(m=>m.id).sort());
    for(const area of DOCKYARD_AREAS){
      expect(area.modules).toContain(area.defaultModule);
      for(const module of area.modules)expect(dockyardAreaFor(module)).toBe(area.id);
    }
  });

  it('preserves full catalogue and makes work areas findable in navigation',()=>{
    const html=renderToStaticMarkup(<StudioNavigation currentModule="cad-studio" onSelectModule={()=>{}}/>);
    for(const name of DOCKYARD_AREAS.map(x=>x.label))expect(html).toContain(name.replace('&','&amp;'));
    expect(html).toContain('All work areas');
    expect(html).toContain('Search all modules');
    const tabs=renderToStaticMarkup(<StudioWorkspaceBar currentModule="traceability" onSelectModule={()=>{}}/>);
    for(const item of DOCKYARD_AREAS)expect(tabs).toContain(item.shortLabel);
    expect(tabs).toContain('aria-current="page"');
  });

  it('links selected conceptual discipline to loaded registers, not to a fabricated CAD relationship',()=>{
    const html=renderToStaticMarkup(<DockyardContextDock domain="NAV" selectedLabel="Hull form"
      requirements={INITIAL_REQUIREMENTS} simulations={INITIAL_SIMULATIONS}
      verificationPlans={INITIAL_VERIFICATION_PLANS} onNavigate={()=>{}} onAskAi={()=>{}}/>);
    expect(html).toContain('Engineering context');
    expect(html).toContain('Hull form');
    expect(html).toContain('discipline-level');
    expect(html).toContain('not verified component relationships');
    expect(html).toContain('UNVERIFIED');
    const unassigned=renderToStaticMarkup(<DockyardContextDock domain={null} selectedLabel="Imported object"
      requirements={INITIAL_REQUIREMENTS} simulations={INITIAL_SIMULATIONS}
      verificationPlans={INITIAL_VERIFICATION_PLANS} onNavigate={()=>{}}/>);
    expect(unassigned).toContain('Not mapped');
    expect(unassigned).toContain('no declared engineering allocation');
  });

  it('retains a dominant preview stage and the original CAD controls',()=>{
    const html=renderToStaticMarkup(<CadStudioView particulars={INITIAL_NAVAL_PARTICULARS}
      requirements={INITIAL_REQUIREMENTS} simulations={INITIAL_SIMULATIONS}
      verificationPlans={INITIAL_VERIFICATION_PLANS} onNavigate={()=>{}}/>);
    expect(html).toContain('dy-cad-canvas');
    expect(html).toContain('dy-cad-header');
    expect(html).toContain('dy-cad-inspector');
    expect(html).toContain('Engineering context');
    expect(html).toContain('Unverified preview');
    expect(html).toContain('Study Parametric CAD');
    expect(html).toContain('Import local OBJ A');
    expect(html).toContain('Import local OBJ B');
  });

  it('adds agent and assurance desks while keeping original orchestration and matrix workflows',()=>{
    const agent=renderToStaticMarkup(<DockyardAgentDesk
      decisions={INITIAL_DECISIONS} risks={INITIAL_RISKS}
      onNavigate={()=>{}} onOpenFull={()=>{}} onAskAi={()=>{}}/>);
    expect(agent).toContain('Agent engineering workbench');
    expect(agent).toContain('Open existing orchestrator');
    expect(agent).toContain('Independent review');
    expect(agent).toContain('Human authority');
    expect(agent).toContain('not agent-run status');
    const assurance=renderToStaticMarkup(<DockyardAssuranceDesk
      requirements={INITIAL_REQUIREMENTS} simulations={INITIAL_SIMULATIONS}
      verificationPlans={INITIAL_VERIFICATION_PLANS} testRecords={INITIAL_TEST_RECORDS}
      onNavigate={()=>{}} onOpenFull={()=>{}}/>);
    expect(assurance).toContain('Evidence &amp; assurance');
    expect(assurance).toContain('Open full traceability matrix');
    expect(assurance).toContain('Only existing explicit record links');
    expect(assurance).toContain('Engineering release is not granted');
    const app=source('src/App.tsx');
    expect(app).toContain('<DockyardAgentDesk');
    expect(app).toContain('<DockyardAssuranceDesk');
    expect(app).toContain('<AgentOrchestratorView');
    expect(app).toContain('<TraceabilityMatrixView');
    expect(app).toContain('data-direction="dockyard"');
  });

  it('has WCAG AA contrast in shell and inspector tokens, plus responsive layout rules',()=>{
    const bg='#ffffff', ink='#142d39', secondary='#465f6b', accent='#075f73';
    for(const fg of [ink,secondary,accent])expect(contrastRatio(fg,bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#e2edf4','#0b1c2a')).toBeGreaterThanOrEqual(4.5);
    const css=source('src/studio/dockyard.css');
    for(const selector of ['.dy-cad-header','.dy-cad-canvas','.dy-cad-tree',
      '.dy-context-dock','.dy-agent-stages','.dy-matrix-scroll','.dy-desk-columns'])
      expect(css,selector).toContain(selector);
    expect(css).toContain('max-width:1230px');
    expect(css).toContain('max-width:830px');
    expect(css).toContain('max-width:550px');
    expect(source('src/main.tsx')).toContain("import './studio/dockyard.css'");
  });
});
