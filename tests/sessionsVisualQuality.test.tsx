import React from 'react';
import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {Worktable,Design} from '../src/sessions/FidelityWorktable';
import {Experiment,Decide,Notebook} from '../src/sessions/FidelityPhysicsReview';
import {VesselVisual} from '../src/sessions/VesselVisual';
import {DEFAULT_SESSION,type EntityId,type Mode,type StudyId,type Perspective} from '../src/sessions/model';
import {contrastRatio} from '../src/studio/readability';

const read=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf-8');
const props={
 session:DEFAULT_SESSION,
 changeMode:(_x:Mode)=>{},
 select:(_x:EntityId)=>{},
 chooseStudy:(_x:StudyId)=>{},
 setPerspective:(_x:Perspective,_candidate?:boolean)=>{},
 toggleSync:()=>{},
 toggleIsolate:()=>{},
 addNote:(_note:string)=>{},
 prepareTask:()=>{}
};
describe('Engineering Sessions V2 — visual and interaction fidelity',()=>{
 it('renders the new screen components in the actual application, not the old simplified wireframes',()=>{
   const app=read('src/sessions/App.tsx');
   const main=read('src/sessions/main.tsx');
   expect(app).toContain("from './FidelityWorktable'");
   expect(app).toContain("from './FidelityPhysicsReview'");
   expect(app).not.toContain("from './ModeScreens'");
   expect(main).toContain("import './fidelity.css'");
   expect(read('index.html')).toContain('/src/dockyard2/main.tsx');
   expect(read('legacy.html')).toContain('/src/main.tsx');
 });
 it('gives the Worktable a dramatic product stage, component controls, connected graph and contextual inspector',()=>{
  const html=renderToStaticMarkup(<Worktable {...props}/>);
  for(const x of ['vf-product-hero','vf-part-selector','vf-hero-render','vf-relationship-flow','vf-investigation-inspector','vf-inspector-tabs'])expect(html).toContain(x);
  expect(html).toContain('USV-01');
  expect(html).toContain('Hull &amp; buoyancy');
  expect(html).toContain('VISUAL FOCUS');
  expect(html).toContain('Reduce mass while preserving stability');
  expect(html).toContain('No approved CAD');
 });
 it('creates original 3D vessel renders from a checked-in Blender source, including true independent plan views',()=>{
  const source=read('scripts/ui/render_sessions_vessels.py');
  expect(source).toContain('bpy');
  expect(source).toContain('Orthographic');
  expect(source).toContain('usv-"+variant+"-plan.png');
  const iso=renderToStaticMarkup(<VesselVisual variant="reference" perspective="iso"/>);
  const plan=renderToStaticMarkup(<VesselVisual variant="candidate" perspective="plan"/>);
  expect(iso).toContain('/sessions/media/usv-reference.png');
  expect(plan).toContain('/sessions/media/usv-candidate-plan.png');
  expect(plan).toContain('not an approved CAD model');
  expect(iso).toContain('ARTISTIC CONCEPT');
 });
 it('places models front and centre in side-by-side Design, keeping fake numerical comparisons blocked',()=>{
  const h=renderToStaticMarkup(<Design {...props}/>);
  expect((h.match(/vf-design-scene vf-design-scene-/g)||[])).toHaveLength(2);
  expect(h).toContain('vf-design-grid');
  expect(h).toContain('vf-design-image');
  expect(h).toContain('Performance difference cannot be calculated yet.');
  expect(h).toContain('Visual controls only');
 });
 it('treats the Experiment as a scientific visual theatre, with creative environmental art clearly not CFD',()=>{
  const h=renderToStaticMarkup(<Experiment {...props}/>);
  expect(h).toContain('vf-immersive-stage');
  expect(h).toContain('vf-scene-product');
  expect(h).toContain('Ocean background is decorative');
  expect(h).toContain('Source-backed result required');
  expect(h).toContain('Playback and field overlays disabled');
  expect((h.match(/vf-plot-slot/g)||[])).toHaveLength(3);
  expect(h).not.toContain('verified resistance reduction');
 });
 it('exposes a genuine argument graph and protected authority in Decide, and local-only drafts in Notebook',()=>{
  const decision=renderToStaticMarkup(<Decide {...props}/>);
  expect(decision).toContain('vf-decision-graph');
  expect(decision).toContain('vf-graph-candidate');
  expect(decision).toContain('NOT APPROVED');
  expect(decision).toContain('Comparable mass, loading and stability data missing');
  const notebook=renderToStaticMarkup(<Notebook {...props} session={{...DEFAULT_SESSION,notes:[{id:5,content:'Example test note',kind:'local',created:'10:20'}]}}/>);
  expect(notebook).toContain('vf-notebook-paper');
  expect(notebook).toContain('Example test note');
  expect(notebook).toContain('Not saved to project');
 });
 it('uses baseline-consistent typography, larger stage, restrained colour and responsive accessibility',()=>{
  const css=read('src/sessions/fidelity.css');
  for(const q of ['.vf-worktable-grid','.vf-product-hero','.vf-design-grid','.vf-immersive-stage','.vf-decision-graph','.vf-notebook-paper'])expect(css).toContain(q);
  for(const w of ['1500px','1200px','920px','700px','470px'])expect(css).toContain('max-width:'+w);
  expect(css).toContain('prefers-reduced-motion:reduce');
  expect(css).toContain('font-size:clamp(');
  expect(css).toContain('grid-template-columns:minmax(0,1fr) minmax(285px,338px)');
  expect(contrastRatio('#102846','#ffffff')).toBeGreaterThan(7);
  expect(contrastRatio('#1655bb','#ffffff')).toBeGreaterThan(4.5);
 });
});
