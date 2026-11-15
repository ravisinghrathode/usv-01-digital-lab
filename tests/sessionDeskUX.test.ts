import {describe,expect,it} from 'vitest';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SessionDesk} from '../src/sessions/SessionDesk';
import {illustrativeSnapshot,type Snapshot} from '../src/dockyard2/domain';

const render=(demoMode:boolean,snapshot:Snapshot=illustrativeSnapshot,draft:null|{title:string;objective:string}=null)=>
 renderToStaticMarkup(React.createElement(SessionDesk,{
  demoMode,snapshot,draft,onDraftChange:()=>{},onRefresh:()=>{},onInspectConcept:()=>{},changeMode:()=>{}
 }));

describe('Engineering Sessions UX integrity',()=>{
 it('always identifies concept imagery as non-authoritative and links to the real CAD Studio',()=>{
  const html=render(true);
  expect(html).toContain('ILLUSTRATIVE ART / NOT CAD OR PHYSICS EVIDENCE');
  expect(html).toContain('No verified geometry is linked');
  expect(html).toContain('module=cad-studio');
  expect(html).toContain('New session draft');
  expect(html).toContain('PROPOSED · NOT DISPATCHED');
 });

 it('does not promote illustrative seed requirements into the authenticated source rail',()=>{
  const seed=illustrativeSnapshot.requirements[0];
  expect(seed).toBeDefined();
  const snapshot:Snapshot={
   ...illustrativeSnapshot,
   requirements:[seed,{...seed,id:'REQ-SOURCE-ONLY',title:'Source-owned requirement test case',isIllustrative:false}]
  };
  const html=render(false,snapshot);
  expect(html).toContain('Source-owned requirement test case');
  expect(html).not.toContain(seed.title);
 });

 it('preserves the local draft label without claiming it is persisted or approved',()=>{
  const html=render(false,illustrativeSnapshot,{title:'Local study workspace',objective:'Investigate source requirements'});
  expect(html).toContain('Local study workspace');
  expect(html).toContain('Unsaved local investigation draft');
  expect(html).toContain('Investigate source requirements');
  expect(html).not.toContain('Approved baseline');
 });

 it('does not display synthetic design comparisons as verified in the demo view',()=>{
  const html=render(true);
  expect(html).toContain('Placeholder only');
  expect(html).toContain('EXAMPLE');
  expect(html).toContain('Human review required');
 });
});
