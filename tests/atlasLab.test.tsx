import React from 'react';
import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {MODULE_REGISTRY} from '../src/moduleRegistry';
import {illustrativeSnapshot} from '../src/dockyard2/domain';
import {contrastRatio} from '../src/studio/readability';
import AtlasLab from '../src/atlas/App';
import {Studio} from '../src/atlas/Studio';
import {PhysicsRoom,EvidenceRoom,AgentsRoom,LibraryRoom} from '../src/atlas/Rooms';
import {VesselBlueprint} from '../src/atlas/VesselBlueprint';
import {GeometrySheet} from '../src/atlas/GeometrySheet';
import {ASSEMBLIES,ROOMS,legacyRoute,roomFromHash,selectedRecords,simulationMatches,evidenceFor,labSearch} from '../src/atlas/model';
import {parseObj} from '../src/dockyard2/mesh';
const source=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
describe('Atlas — a genuinely new naval engineering interface',()=>{
 const p={snapshot:illustrativeSnapshot,sourceLabel:'Illustrative records'};
 it('ships as a separate entry and never imports Dockyard or Lab3 UI components or style sheets',()=>{
   expect(source('atlas.html')).toContain('/src/atlas/main.tsx');
   expect(source('src/atlas/main.tsx')).toContain("import './styles.css'");
   expect(source('vite.config.ts')).toContain("navalAtlas: path.resolve(import.meta.dirname, 'atlas.html')");
   expect(source('package.json')).toContain('dev:naval-atlas');
   for(const file of ['App.tsx','Studio.tsx','Rooms.tsx','VesselBlueprint.tsx','GeometrySheet.tsx']){
     const text=source('src/atlas/'+file);
     expect(text).not.toContain("from '../dockyard2/App'");
     expect(text).not.toContain("from '../lab3/");
     expect(text).not.toContain("import '../dockyard2/dockyard.css'");
   }
   expect(source('index.html')).toContain('/src/sessions/main.tsx');
   expect(source('legacy.html')).toContain('/src/main.tsx');
 });
 it('changes the actual layout topology, not only colours, from dual card dashboard to one drawing board and full-width simulation runway',()=>{
   const html=renderToStaticMarkup(<Studio {...p} onNavigate={()=>{}}/>);
   expect(html).toContain('at-canvas-assembly');
   expect(html).toContain('at-product-rail');
   expect(html).toContain('at-sheet');
   expect(html).toContain('at-product-inspector');
   expect(html).toContain('at-runway');
   expect(html.indexOf('at-runway')).toBeGreaterThan(html.indexOf('at-canvas-assembly'));
   expect(html).toContain('Product library');
   expect(html).toContain('Simulation runway');
   expect(html).toContain('baseline unapproved');
   expect(html).toContain('Open local OBJ');
   expect(source('src/atlas/styles.css')).toContain('grid-template-columns:170px minmax(0,1fr) 282px');
   expect(source('src/atlas/styles.css')).toContain('.at-runway{background:#142e45');
   expect(source('src/atlas/App.tsx')).not.toContain('nl-sidebar');
   expect(source('src/atlas/App.tsx')).not.toContain('d2-rail');
 });
 it('preserves every module and makes records and simulation cases findable',()=>{
   expect(MODULE_REGISTRY).toHaveLength(24);
   expect(ROOMS.map(r=>r.id)).toEqual(['studio','physics','evidence','agents','library']);
   expect(roomFromHash('#physics')).toBe('physics');
   expect(roomFromHash('#bad')).toBe('studio');
   expect(ASSEMBLIES).toHaveLength(5);
   for(const module of MODULE_REGISTRY){
     expect(legacyRoute(module.id)).toBe('/legacy.html?module='+encodeURIComponent(module.id));
   }
   expect(labSearch(illustrativeSnapshot,'').filter(h=>h.id.startsWith('module:'))).toHaveLength(24);
   expect(labSearch(illustrativeSnapshot,'hydrodynamics').length).toBeGreaterThan(0);
   const html=renderToStaticMarkup(<AtlasLab/>);
   for(const room of ROOMS)expect(html).toContain(room.label);
   expect(html).toContain('24 modules');
   expect(html).toContain('Find anything');
   expect(html).toContain('Staff sign in');
 });
 it('keeps source truth and provenance rather than inferring a validated CAD or solver result',()=>{
   const related=selectedRecords(illustrativeSnapshot,'power');
   expect(related.requirements.every(r=>['ELE','PRP'].includes(r.subsystemCode))).toBe(true);
   expect(related.simulations.every(s=>['ELE','PRP','Multi-Physics'].includes(s.discipline))).toBe(true);
   const first=illustrativeSnapshot.requirements[0];
   const refs=evidenceFor(illustrativeSnapshot,first);
   expect(refs.tests.every(t=>refs.plans.some(p=>p.id===t.planId))).toBe(true);
   const html=renderToStaticMarkup(<PhysicsRoom {...p}/>);
   expect(html).toContain('Awaiting verified result files');
   expect(html).toContain('A run is not a result');
   expect(html).toContain('Open study record and outputs');
   expect(simulationMatches(illustrativeSnapshot.simulations[0],'','all')).toBe(true);
   expect(simulationMatches(illustrativeSnapshot.simulations[0],'no such case','all')).toBe(false);
 });
 it('renders unique plan, isometric and section vessel projections plus independent local geometry preview',()=>{
   for(const view of ['isometric','plan','section'] as const) {
     const h=renderToStaticMarkup(<VesselBlueprint view={view} assembly="hull"/>);
     expect(h).toContain('<svg');
     expect(h).toContain('REFERENCE DIAGRAM');
     expect(h).toContain('REFERENCE DIAGRAM');
   }
   const mesh=parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3','probe.obj');
   const preview=renderToStaticMarkup(<GeometrySheet mesh={mesh}/>);
   expect(preview).toContain('probe.obj');
   expect(preview).toContain('Rotate model left');
   expect(preview).toContain('Visual sample of');
 });
 it('exposes working physics, evidence, agent and library rooms from typed registers',()=>{
   expect(renderToStaticMarkup(<EvidenceRoom {...p}/>)).toContain('Source dossier');
   expect(renderToStaticMarkup(<EvidenceRoom {...p}/>)).toContain('Test records via plans');
   expect(renderToStaticMarkup(<AgentsRoom {...p}/>)).toContain('26 specialist agents have not been modified');
   expect(renderToStaticMarkup(<LibraryRoom {...p}/>)).toContain('Global USV reference fleet');
   expect(renderToStaticMarkup(<LibraryRoom {...p}/>)).toContain('Knowledge records');
 });
 it('uses a distinct technical palette, desktop-first drafting geometry, responsive widths and accessible controls',()=>{
   const css=source('src/atlas/styles.css');
   for(const rule of ['.at-global-nav','.at-canvas-assembly','.at-runway','.at-case-list','.at-evidence-grid','.at-search-dialog','.at-directory-dialog','.at-skip:focus'])expect(css).toContain(rule);
   for(const w of ['1380px','1110px','720px','460px'])expect(css).toContain('max-width:'+w);
   expect(css).toContain(':focus-visible');
   expect(css).toContain('prefers-reduced-motion:reduce');
   for(const fg of ['#192b3a','#536a79','#1e56a4'])expect(contrastRatio(fg,'#ffffff')).toBeGreaterThanOrEqual(4.5);
   expect(contrastRatio('#e8f2f7','#142e45')).toBeGreaterThanOrEqual(4.5);
 });
});
