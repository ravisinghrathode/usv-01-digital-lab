import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MODULE_REGISTRY } from '../src/moduleRegistry';
import { illustrativeSnapshot, linkedEvidence } from '../src/dockyard2/domain';
import { contrastRatio } from '../src/studio/readability';
import NavalAiLabApp from '../src/lab3/App';
import { LabOverview, ProductsPage, SimulationsPage, AgentsPage, EvidencePage } from '../src/lab3/LabPages';
import { VesselStage } from '../src/lab3/VesselStage';
import { SimulationBench } from '../src/lab3/SimulationBench';
import { LAB_SECTIONS, PRODUCT_FACETS, moduleLink, parseLabSection, searchLab, engineeringSignals } from '../src/lab3/navigation';

const source=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

describe('Naval AI Lab — clean-room visual workbench',()=>{
  const props={snapshot:illustrativeSnapshot,sourceLabel:'Illustrative records'};
  it('builds a separate application without replacing the standard or legacy interfaces',()=>{
    expect(source('naval-lab.html')).toContain('/src/lab3/main.tsx');
    expect(source('vite.config.ts')).toContain("navalAiLab: path.resolve(import.meta.dirname, 'naval-lab.html')");
    expect(source('package.json')).toContain('dev:naval-ai-lab');
    expect(source('index.html')).toContain('/src/sessions/main.tsx');
    expect(source('legacy.html')).toContain('/src/main.tsx');
    expect(source('src/lab3/main.tsx')).toContain("import './styles.css'");
    expect(source('src/lab3/App.tsx')).not.toContain("import '../dockyard2/dockyard.css'");
    expect(source('src/lab3/App.tsx')).not.toContain("from '../components/StudioNavigation'");
  });
  it('keeps hero product and simulation as adjacent primary workspaces above evidence',()=>{
    const html=renderToStaticMarkup(<LabOverview {...props} facet="vessel" onFacetChange={()=>{}} onNavigate={()=>{}}/>);
    expect(html).toContain('nl-hero-grid');
    expect(html).toContain('Product workstage');
    expect(html).toContain('Simulation workbench');
    expect(html).toContain('Engineering context');
    expect(html.indexOf('Product workstage')).toBeLessThan(html.indexOf('Simulation workbench'));
    expect(html.indexOf('Simulation workbench')).toBeLessThan(html.indexOf('Engineering context'));
    expect(html).toContain('Needs attention');
    expect(html).toContain('Global fleet');
  });
  it('preserves five reachable tasks, all 24 engineering modules and safe original handoffs',()=>{
    expect(LAB_SECTIONS.map(x=>x.id)).toEqual(['lab','products','simulations','agents','evidence']);
    expect(parseLabSection('#simulations')).toBe('simulations');
    expect(parseLabSection('#something-else')).toBe('lab');
    expect(PRODUCT_FACETS).toHaveLength(5);
    expect(MODULE_REGISTRY).toHaveLength(24);
    for(const m of MODULE_REGISTRY)expect(moduleLink(m.id)).toBe('/legacy.html?module='+encodeURIComponent(m.id));
    expect(searchLab('',illustrativeSnapshot).filter(x=>x.id.startsWith('module:'))).toHaveLength(24);
    const result=searchLab('Hydrodynamics',illustrativeSnapshot);
    expect(result.length).toBeGreaterThan(0);
    const app=renderToStaticMarkup(<NavalAiLabApp/>);
    for(const section of LAB_SECTIONS)expect(app).toContain(section.label);
    expect(app).toContain('All modules');
    expect(app).toContain('Search the lab');
    expect(app).toContain('Engineering staff sign in');
  });
  it('renders three conceptual product views and browser-only OBJ inspection action',()=>{
    const html=renderToStaticMarkup(<VesselStage facet="hull" onFacetChange={()=>{}}/>);
    expect(html).toContain('CONCEPT DRAWING');
    expect(html).toContain('NO APPROVED CAD BASELINE');
    expect(html).toContain('Perspective');
    expect(html).toContain('Section');
    expect(html).toContain('Inspect OBJ');
    expect(html).toContain('Vessel assembly');
    expect(html).toContain('/legacy.html?module=cad-studio');
    expect(source('src/lab3/VesselStage.tsx')).toContain('parseObj(');
    expect(source('src/lab3/VesselStage.tsx')).not.toContain('fetch(');
  });
  it('provides data-backed simulation selection and no fabricated solver visuals',()=>{
    const html=renderToStaticMarkup(<SimulationBench simulations={illustrativeSnapshot.simulations} sourceLabel="Illustrative records"/>);
    expect(html).toContain('Simulation workbench');
    expect(html).toContain('Selected simulation');
    expect(html).toContain('Validation');
    expect(html).toContain('No solver output is visualized');
    expect(html).toContain('No solver launched here');
    const empty=renderToStaticMarkup(<SimulationBench simulations={[]} sourceLabel="Server records"/>);
    expect(empty).toContain('No simulation records');
    expect(empty).toContain('No simulation or solver results can be inferred');
    expect(empty).not.toContain('Selected simulation');
  });
  it('renders all task-specific screens from current typed registers, and never marks samples as validated',()=>{
    expect(renderToStaticMarkup(<ProductsPage {...props} facet="vessel" onFacetChange={()=>{}}/>)).toContain('Vessel &amp; product engineering');
    expect(renderToStaticMarkup(<SimulationsPage {...props}/>)).toContain('Simulation register');
    const agents=renderToStaticMarkup(<AgentsPage {...props}/>);
    expect(agents).toContain('Human-controlled approval');
    expect(agents).toContain('26-agent roster is unchanged');
    const evidence=renderToStaticMarkup(<EvidencePage {...props}/>);
    expect(evidence).toContain('Evidence dossier');
    expect(evidence).toContain('No approval is inferred');
    const r=illustrativeSnapshot.requirements[0];
    const refs=linkedEvidence(illustrativeSnapshot,r);
    expect(refs.tests.every(t=>refs.plans.some(p=>p.id===t.planId))).toBe(true);
    expect(engineeringSignals(illustrativeSnapshot).requirements).toBe(illustrativeSnapshot.requirements.length);
  });
  it('supports responsive layout and visible keyboard focus with legible text tokens',()=>{
    const css=source('src/lab3/styles.css');
    for(const selector of ['.nl-hero-grid','.nl-viewport','.nl-simulation','.nl-evidence-lanes','.nl-sidebar','.nl-mobile-nav','.nl-catalog','.nl-search-dialog']){
      expect(css).toContain(selector);
    }
    for(const width of ['1330px','1120px','880px','570px','360px'])expect(css).toContain('max-width:'+width);
    expect(css).toContain(':focus-visible');
    expect(css).toContain('.nl-skip:focus');
    expect(css).toContain('prefers-reduced-motion');
    for(const fg of ['#173543','#526a75','#0b6577'])expect(contrastRatio(fg,'#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#e5f3f7','#091d29')).toBeGreaterThanOrEqual(4.5);
  });
});
