import React from 'react';
import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {MODULE_REGISTRY} from '../src/moduleRegistry';
import EngineeringSessionsApp from '../src/sessions/App';
import {Worktable,Design,Experiment,Decide,Notebook} from '../src/sessions/ModeScreens';
import {ConceptVessel} from '../src/sessions/ConceptVessel';
import {DEFAULT_SESSION,ENTITIES,INVESTIGATION,MODES,STUDIES,currentEntity,currentStudy,hashForMode,legacyLink,searchItems,validMode,isComparisonReady,type SessionView,type Mode,type StudyId,type Perspective,type EntityId} from '../src/sessions/model';

const source=(name:string)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const props={
 session:DEFAULT_SESSION,
 changeMode:(_mode:Mode)=>{},
 select:(_id:EntityId)=>{},
 chooseStudy:(_id:StudyId)=>{},
 setPerspective:(_p:Perspective,_candidate?:boolean)=>{},
 toggleSync:()=>{},
 toggleIsolate:()=>{},
 addNote:(_s:string)=>{},
 prepareTask:()=>{}
};
describe('Engineering Sessions — connected high fidelity investigation prototype',()=>{
 it('isolates new interface from all older dashboards, preserves default & governed runtime',()=>{
  expect(source('sessions.html')).toContain('/src/sessions/main.tsx');
  expect(source('src/sessions/main.tsx')).toContain("import './styles.css'");
  expect(source('vite.config.ts')).toContain("engineeringSessions: path.resolve(import.meta.dirname, 'sessions.html')");
  expect(source('package.json')).toContain('dev:engineering-sessions');
  expect(source('index.html')).toContain('/src/dockyard2/main.tsx');
  expect(source('legacy.html')).toContain('/src/main.tsx');
  const app=source('src/sessions/App.tsx');
  expect(app).not.toContain("from '../atlas/");
  expect(app).not.toContain("from '../lab3/");
  expect(app).not.toContain("from '../dockyard2/App'");
 });
 it('models one investigation and five context preserving activity modes, not 24 global sidebar tabs',()=>{
  expect(INVESTIGATION.id).toBe('DEMO-INV-01');
  expect(INVESTIGATION.status).toBe('INTERACTIVE DEMONSTRATION');
  expect(MODES.map(m=>m.id)).toEqual(['worktable','design','experiment','decide','notebook']);
  expect(validMode('experiment')).toBe('experiment');
  expect(validMode('unknown')).toBe('worktable');
  expect(hashForMode('decide')).toBe('#decide');
  expect(DEFAULT_SESSION.study).toBe('mass-study');
  expect(DEFAULT_SESSION.perspective).toBe('iso');
  expect(DEFAULT_SESSION.selected).toBeNull();
  const app=renderToStaticMarkup(<EngineeringSessionsApp/>);
  expect(app).toContain('Persistent engineering investigation context');
  expect(app).toContain('INTERACTIVE UX PROTOTYPE');
  expect(app).toContain('All engineering objects are synthetic examples');
  expect(app).toContain('Naval AI Lab');
  expect(app).toContain('Session objects');
  for(const m of MODES)expect(app).toContain(m.name);
 });
 it('renders five structurally different workspaces instead of the same dashboard layout',()=>{
  const worktable=renderToStaticMarkup(<Worktable {...props}/>);
  const design=renderToStaticMarkup(<Design {...props}/>);
  const experiment=renderToStaticMarkup(<Experiment {...props}/>);
  const decide=renderToStaticMarkup(<Decide {...props}/>);
  const notebook=renderToStaticMarkup(<Notebook {...props}/>);
  expect(worktable).toContain('es-spatial-layer');
  expect(worktable).toContain('Linked objects');
  expect(design).toContain('es-pair');
  expect(design).toContain('Synchronized views');
  expect(design).toContain('Numerical comparison unavailable');
  expect(experiment).toContain('es-result-canvas');
  expect(experiment).toContain('Source-backed result required');
  expect(experiment).toContain('No reviewed solver output');
  expect(decide).toContain('es-argument-stream');
  expect(decide).toContain('No authorized recommendation');
  expect(notebook).toContain('es-notebook-paper');
  expect(notebook).toContain('local observation');
  expect(notebook).toContain('Session only');
 });
 it('never invents performance, source CAD, plot data or human approval',()=>{
  expect(ENTITIES.length).toBeGreaterThan(8);
  expect(ENTITIES.every(x=>x.status!=='Example'||x.description.length>0)).toBe(true);
  expect(STUDIES.every(s=>s.resultState==='NO_REVIEWABLE_RESULT'&&s.validation==='NOT_REVIEWED')).toBe(true);
  expect(STUDIES.every(s=>s.source==='No result file')).toBe(true);
  expect(isComparisonReady('A','B','condition').ready).toBe(false);
  expect(currentStudy('mass-study').id).toBe('mass-study');
  expect(currentEntity('review')?.description).toContain('not been performed');
  const candidate=renderToStaticMarkup(<ConceptVessel variant="candidate" perspective="plan"/>);
  expect(candidate).toContain('not real CAD');
  expect(candidate).toContain('CONCEPT ART');
  expect(source('src/sessions/ModeScreens.tsx')).not.toContain('Math.random');
  expect(source('src/sessions/ModeScreens.tsx')).not.toContain('setApproved');
 });
 it('retains direct access to all 24 registered modules and correctly searches demo objects',()=>{
  expect(MODULE_REGISTRY).toHaveLength(24);
  for(const m of MODULE_REGISTRY)expect(legacyLink(m.id)).toBe('/legacy.html?module='+encodeURIComponent(m.id));
  const hits=searchItems('stability');
  expect(hits.length).toBeGreaterThan(0);
  expect(searchItems('').filter(i=>i.id.startsWith('module:'))).toHaveLength(24);
 });
 it('includes responsive layouts, reduced motion, dark legible status and visible keyboard focus',()=>{
  const css=source('src/sessions/styles.css');
  for(const sel of ['.es-workspace','.es-pair','.es-theatre','.es-decision-layout','.es-notebook-layout','.es-session-spine','.es-inspector','.es-search-dialog','.es-skip:focus'])expect(css).toContain(sel);
  for(const width of ['1320px','1060px','760px','470px'])expect(css).toContain('max-width:'+width);
  expect(css).toContain(':focus-visible');
  expect(css).toContain('prefers-reduced-motion:reduce');
  expect(css).toContain('#102a43');
  expect(css).toContain('#1554c0');
 });
});
