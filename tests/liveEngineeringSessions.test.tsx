import React from 'react';
import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {illustrativeSnapshot,type Snapshot} from '../src/dockyard2/domain';
import LiveWorkspace from '../src/sessions/LiveWorkspace';
import {MODULE_REGISTRY} from '../src/moduleRegistry';
import {authorizeLabRoute} from '../src/core/auth/routeAuthorization';

const empty:Snapshot={
 requirements:[],decisions:[],risks:[],simulations:[],plans:[],tests:[],components:[],notes:[]
};
const staff={
 userId:'usr-test',userName:'Test Engineer',role:'LEAD_SYSTEMS_ENGINEER' as const,
 authenticatedAt:'2026-11-15T00:00:00.000Z'
};
const props={
 snapshot:empty,status:'connected' as const,error:'',user:staff,
 onRefresh:()=>{},changeMode:()=>{}
};
describe('Live Engineering Sessions source and authority boundaries',()=>{
 it('requires staff login instead of a synthetic study on the default entry',()=>{
  const html=renderToStaticMarkup(<LiveWorkspace {...props} user={null} status="illustrative" mode="worktable"/>);
  expect(html).toContain('Open the real engineering workspace.');
  expect(html).toContain('Staff sign in');
  expect(html).not.toContain('EXAMPLE INVESTIGATION');
  expect(html).not.toContain('Design begins with a question.');
 });
 it('treats absent or unavailable sources as missing rather than demonstration data',()=>{
  const missing=renderToStaticMarkup(<LiveWorkspace {...props} mode="design"/>);
  expect(missing).toContain('No CAD revision pointers registered');
  expect(missing).toContain('SHA-256 of source file');
  expect(missing).toContain('SOURCE');
  expect(missing).not.toContain('ILLUSTRATIVE GEOMETRY');
  const unavailable=renderToStaticMarkup(<LiveWorkspace {...props} mode="worktable" status="unavailable" error="API offline"/>);
  expect(unavailable).toContain('API offline');
  expect(unavailable).not.toContain('Design begins with a question.');
 });
 it('uses only non-illustrative engineering rows and never emits synthetic result plots',()=>{
  const req={...illustrativeSnapshot.requirements[0],id:'REQ-LIVE-001',title:'Controlled draft requirement',isIllustrative:false};
  const sim={...illustrativeSnapshot.simulations[0],id:'SIM-LIVE-001',name:'Source-backed test case',isIllustrative:false,
   geometryRevision:'REV-C',runStatus:'Under Review' as const,validationStatus:'NOT REVIEWED'};
  const data:Snapshot={...empty,requirements:[req,illustrativeSnapshot.requirements[0]],simulations:[sim,illustrativeSnapshot.simulations[0]]};
  const worktable=renderToStaticMarkup(<LiveWorkspace {...props} snapshot={data} mode="worktable"/>);
  expect(worktable).toContain('Controlled draft requirement');
  expect(worktable).toContain('Source-backed test case');
  expect(worktable).not.toContain('EXAMPLE INVESTIGATION');
  const experiments=renderToStaticMarkup(<LiveWorkspace {...props} snapshot={data} mode="experiment"/>);
  expect(experiments).toContain('REV-C');
  expect(experiments).toContain('NOT REVIEWED');
  expect(experiments).toContain('No invented result curves');
  expect(experiments).not.toContain('<canvas');
 });
 it('saves only non-authoritative drafts and keeps source authority on the server',()=>{
  const note=renderToStaticMarkup(<LiveWorkspace {...props} mode="notebook"/>);
  expect(note).toContain('Save unverified project draft');
  expect(note).toContain('DRAFT_UNVERIFIED');
  const cad=renderToStaticMarkup(<LiveWorkspace {...props} mode="design" user={{...staff,role:'VVT_SPECIALIST'}}/>);
  expect(cad).toContain('does not permit registering design records');
  for(const path of ['/session/cad-revisions','/session/notes']){
   expect(authorizeLabRoute('POST',path,'LEAD_SYSTEMS_ENGINEER')).toBe(true);
   expect(authorizeLabRoute('POST',path,'NAVAL_ARCHITECT')).toBe(true);
   expect(authorizeLabRoute('POST',path,'VVT_SPECIALIST')).toBe(false);
   expect(authorizeLabRoute('POST',path,'SECURITY_ANALYST')).toBe(false);
   expect(authorizeLabRoute('POST',path,'UNRECOGNIZED')).toBe(false);
  }
  expect(authorizeLabRoute('POST','/data/cad_revisions','VVT_SPECIALIST')).toBe(false);
  expect(MODULE_REGISTRY).toHaveLength(24);
 });
});
