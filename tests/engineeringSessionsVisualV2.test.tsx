import React from 'react';
import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,statSync} from 'node:fs';
import {VesselVisual} from '../src/sessions/v2/VesselVisual';
import {Worktable,Design,Experiment,Decide,Notebook} from '../src/sessions/v2/Modes';
import {DEFAULT_SESSION,ENTITIES,STUDIES,type Mode,type EntityId,type StudyId,type Perspective} from '../src/sessions/model';
const src=(name:string)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const props={
 session:DEFAULT_SESSION,
 changeMode:(_mode:Mode)=>{},select:(_id:EntityId)=>{},chooseStudy:(_id:StudyId)=>{},
 setPerspective:(_projection:Perspective,_candidate?:boolean)=>{},toggleSync:()=>{},toggleIsolate:()=>{},
 addNote:(_note:string)=>{},prepareTask:()=>{}
};
describe('Engineering Sessions V2 — visual baseline fidelity and trust boundaries',()=>{
 it('ships four original high-resolution Blender assets and reproducible source',()=>{
  for(const filename of ['usv-reference.png','usv-reference-plan.png','usv-candidate.png','usv-candidate-plan.png']){
   const file=new URL('../public/sessions/media/'+filename,import.meta.url);
   expect(statSync(file).size).toBeGreaterThan(100_000);
  }
  expect(src('scripts/ui/render_sessions_vessels.py')).toContain('bpy');
  const visual=renderToStaticMarkup(<VesselVisual variant="candidate" perspective="plan"/>);
  expect(visual).toContain('/sessions/media/usv-candidate-plan.png');
  expect(visual).toContain('not source CAD');
  expect(src('src/sessions/v2/VesselVisual.tsx')).toContain('onError');
 });
 it('replaces flattened dashboard screens with five distinct, source-aware spatial grammars',()=>{
  const views=[
   renderToStaticMarkup(<Worktable {...props}/>),
   renderToStaticMarkup(<Design {...props}/>),
   renderToStaticMarkup(<Experiment {...props}/>),
   renderToStaticMarkup(<Decide {...props}/>),
   renderToStaticMarkup(<Notebook {...props}/>)
  ];
  expect(views[0]).toContain('v2-vessel-lightstage');
  expect(views[0]).toContain('v2-research-rail');
  expect(views[1]).toContain('v2-design-split');
  expect(views[1]).toContain('usv-candidate.png');
  expect(views[2]).toContain('v2-physics-theatre');
  expect(views[2]).toContain('v2-physics-plot');
  expect(views[3]).toContain('v2-proof-map');
  expect(views[3]).toContain('v2-review-pane');
  expect(views[4]).toContain('v2-journal-page');
  expect(new Set(views.map(s=>s.slice(0,200))).size).toBe(5);
 });
 it('does not turn artistic concept images into measurements or simulation evidence',()=>{
  const design=renderToStaticMarkup(<Design {...props}/>);
  const experiment=renderToStaticMarkup(<Experiment {...props}/>);
  const decision=renderToStaticMarkup(<Decide {...props}/>);
  expect(design).toContain('Physical comparison is not yet defensible.');
  expect(design).toContain('ILLUSTRATIVE GEOMETRY');
  expect(experiment).toContain('No reviewable result attached');
  expect(experiment).toContain('Not a solver visualization');
  expect(decision).toContain('Recommendation withheld');
  expect(decision).toContain('Not requested / not approved');
  expect(STUDIES.every(x=>x.validation==='NOT_REVIEWED'&&x.resultState==='NO_REVIEWABLE_RESULT')).toBe(true);
  expect(ENTITIES.every(e=>['Example','Source required','Review pending','Unestablished'].includes(e.status))).toBe(true);
 });
 it('preserves the existing React investigation context and exact original route/permissions',()=>{
  const app=src('src/sessions/App.tsx');
  expect(app).toContain("from './v2/Modes'");
  expect(app).toContain('aria-label="Find anything ⌘ K"');
  expect(app).toContain('setSession(old=>({...old,mode})');
  expect(app).toContain('legacyLink(selected.module)');
  expect(src('src/sessions/main.tsx')).toContain("import './v2/design.css'");
  expect(src('index.html')).toContain('/src/sessions/main.tsx');
  expect(src('legacy.html')).toContain('/src/main.tsx');
 });
 it('respects responsive, typography, reduced-motion and actual image art direction',()=>{
  const css=src('src/sessions/v2/design.css');
  for(const selector of ['.v2-worktable-board','.v2-design-split','.v2-physics-theatre','.v2-decision-grid','.v2-journal-grid','.ses-render-image'])
   expect(css).toContain(selector);
  for(const width of ['1400px','1080px','760px','470px'])expect(css).toContain('max-width:'+width);
  expect(css).toContain('prefers-reduced-motion:reduce');
  expect(css).toContain('#102b46');
  expect(css).not.toContain('display:none!important}.es-truth-banner');
 });
});
