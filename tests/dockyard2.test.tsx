import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MODULE_REGISTRY } from '../src/moduleRegistry';
import { DOCKYARD_AREAS } from '../src/studio/dockyardAreas';
import { contrastRatio } from '../src/studio/readability';
import {
  areaForModule, domainForPart, illustrativeSnapshot,
  legacyModuleUrl, legacyRootRedirect, linkedEvidence, parseServerSnapshot,
  requestedLegacyModule, searchLoaded
} from '../src/dockyard2/domain';
import { MAX_OBJ_BYTES, meshBounds, parseObj } from '../src/dockyard2/mesh';
import DockyardApp from '../src/dockyard2/App';
import { DesignScreen } from '../src/dockyard2/DesignScreen';
import { AnalysisScreen, AgentsScreen, DirectorScreen, EvidenceScreen } from '../src/dockyard2/Screens';
const source=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

describe('Naval Design Studio standard interface',()=>{
  it('has an independent HTML entry and does not reuse the old UI shell',()=>{
    expect(source('index.html')).toContain('<title>Naval Design Studio | USV-01</title>');
    expect(source('index.html')).toContain('src/dockyard2/main.tsx');
    expect(source('legacy.html')).toContain('src/main.tsx');
    expect(source('dockyard2.html')).toContain('src/dockyard2/main.tsx');
    expect(source('vite.config.ts')).toContain("navalDesignStudio: path.resolve(import.meta.dirname, 'index.html')");
    expect(source('vite.config.ts')).toContain("legacyEngineering: path.resolve(import.meta.dirname, 'legacy.html')");
    expect(source('vite.config.ts')).toContain('dockyard2.html');
    expect(source('package.json')).toContain('dev:naval-design-studio');
    expect(source('package.json')).toContain('dev:dockyard2');
    const app=source('src/dockyard2/App.tsx');
    expect(app).not.toContain("from '../components/StudioNavigation'");
    expect(app).not.toContain("from '../components/CadStudioView'");
    expect(app).toContain('NavalDesignStudioApp');
    expect(app).toContain('<DesignScreen');
    expect(app).toContain('<AgentsScreen');
    expect(app).toContain('<EvidenceScreen');
    expect(source('src/dockyard2/main.tsx')).toContain("import './dockyard.css'");
  });
  it('retains all 24 governed modules and deep-links safely',()=>{
    expect(MODULE_REGISTRY).toHaveLength(24);
    const ids=DOCKYARD_AREAS.flatMap(a=>a.modules);
    expect(new Set(ids).size).toBe(24);
    expect([...ids].sort()).toEqual(MODULE_REGISTRY.map(x=>x.id).sort());
    for(const id of ids){
      expect(legacyModuleUrl(id)).toBe('/legacy.html?module='+encodeURIComponent(id));
      expect(legacyRootRedirect('?module='+encodeURIComponent(id))).toBe(legacyModuleUrl(id));
      expect(requestedLegacyModule('?module='+encodeURIComponent(id))).toBe(id);
      expect(['design','analysis','agents','director','evidence']).toContain(areaForModule(id));
    }
    expect(legacyRootRedirect('?module=unknown')).toBeNull();
    expect(legacyRootRedirect('?x=y')).toBeNull();
    expect(requestedLegacyModule('?module=undefined')).toBe('cad-studio');
    expect(requestedLegacyModule('?module=invalid%3Cscript%3E')).toBe('cad-studio');
    expect(source('src/App.tsx')).toContain('new URLSearchParams(window.location.search)');
    expect(source('src/App.tsx')).toContain('MODULE_REGISTRY.find');
  });
  it('correctly parses complete authenticated server data, including empty datasets',()=>{
    const body={success:true,data:{
      requirements:[],design_decisions:[],engineering_risks:[],simulation_jobs:[],
      verification_plans:[],test_records:[],components:[],knowledge_notes:[]
    }};
    expect(parseServerSnapshot(body)).toEqual({
      requirements:[],decisions:[],risks:[],simulations:[],
      plans:[],tests:[],components:[],notes:[]
    });
    expect(()=>parseServerSnapshot({success:false,data:{}})).toThrow();
    expect(()=>parseServerSnapshot({success:true,data:{requirements:[]}})).toThrow();
  });
  it('does not fabricate relationships between selected parts, requirements and tests',()=>{
    expect(domainForPart('imported')).toBeNull();
    expect(domainForPart('hull')).toBe('NAV');
    expect(domainForPart('payload')).toBe('SYS');
    const r=illustrativeSnapshot.requirements[0];
    const rel=linkedEvidence(illustrativeSnapshot,r);
    expect(rel.plans.every(p=>p.targetReqIds.includes(r.id)||r.relatedVerifications.includes(p.id))).toBe(true);
    expect(rel.tests.every(t=>rel.plans.some(p=>p.id===t.planId))).toBe(true);
    expect(rel.simulations.every(s=>r.relatedSimulations.includes(s.id))).toBe(true);
    const hits=searchLoaded('propulsion',illustrativeSnapshot);
    expect(hits.some(h=>h.title.toLowerCase().includes('propulsion'))).toBe(true);
    expect(searchLoaded('',illustrativeSnapshot).filter(h=>h.kind==='Module')).toHaveLength(24);
  });
  it('parses bounded local OBJ geometry and rejects malformed or unsupported files',()=>{
    const triangular=parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3','a.obj');
    expect(triangular.vertices).toHaveLength(3);
    expect(triangular.faces).toHaveLength(1);
    expect(meshBounds(triangular).size).toBe(1);
    const quad=parseObj('v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf -4 -3 -2 -1');
    expect(quad.faces).toHaveLength(2);
    expect(()=>parseObj('v 0 0 0\nf 1 2 3')).toThrow();
    expect(()=>parseObj('v x y z\nv 1 0 0\nv 0 1 0\nf 1 2 3')).toThrow();
    expect(()=>parseObj('x'.repeat(MAX_OBJ_BYTES+1))).toThrow();
  });
  it('renders the five original read-only work surfaces with real register data',()=>{
    const props={snapshot:illustrativeSnapshot,sourceLabel:'Illustrative records'};
    const app=renderToStaticMarkup(<DockyardApp/>);
    expect(app).toContain('Naval Design Studio');
    expect(app).toContain('href="/legacy.html"');
    expect(app).toContain('All 24 modules');
    expect(app).toContain('Illustrative local registers');
    expect(app).toContain('Main engineering workspaces');
    expect(app).toContain('Engineering staff sign-in');
    const design=renderToStaticMarkup(<DesignScreen {...props}/>);
    expect(design).toContain('Import OBJ A');
    expect(design).toContain('Import OBJ B');
    expect(design).toContain('Engineering context');
    expect(design).toContain('NOT VERIFIED CAD');
    expect(design).toContain('Unverified');
    const analysis=renderToStaticMarkup(<AnalysisScreen {...props}/>);
    expect(analysis).toContain('Engineering analysis');
    expect(analysis).toContain('Solver register');
    const agents=renderToStaticMarkup(<AgentsScreen {...props}/>);
    expect(agents).toContain('Open live orchestrator');
    expect(agents).toContain('Human');
    const director=renderToStaticMarkup(<DirectorScreen {...props}/>);
    expect(director).toContain('Decision queue');
    const assurance=renderToStaticMarkup(<EvidenceScreen {...props}/>);
    expect(assurance).toContain('Requirement');
    expect(assurance).toContain('Open full traceability');
    expect(assurance).toContain('protected action');
  });
  it('uses WCAG AA light/dark colour pairs in independent tokens and responsive structures',()=>{
    for(const fg of ['#162f3b','#45606d','#526b77','#05566d']){
      expect(contrastRatio(fg,'#ffffff')).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio('#e9f5fa','#0b1c2a')).toBeGreaterThanOrEqual(4.5);
    const css=source('src/dockyard2/dockyard.css');
    expect(css).toContain('--ink:#162f3b');
    expect(css).toContain('.d2-viewport');
    expect(css).toContain('@media(max-width:767px)');
    expect(css).toContain('@media(max-width:500px)');
    expect(css).toContain('.d2-mobilebar');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion');
  });
});
