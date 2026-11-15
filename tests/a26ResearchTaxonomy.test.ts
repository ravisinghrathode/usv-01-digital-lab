import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
describe('A26 three-tab research taxonomy',()=>{
 it('defines exactly three independent research tabs inside the existing 24-module registry',()=>{
  const registry=read('src/moduleRegistry.ts');
  const workspace=read('src/components/A26ResearchWorkspace.tsx');
  for(const name of ['global-usv-fleet','scientific-knowledge','external-software']){
   if(name!=='scientific-knowledge')expect(registry).toContain("id: '"+name+"'");
   expect(workspace).toContain("id:'"+name+"'");
  }
  expect(workspace.match(/id:'(?:global-usv-fleet|scientific-knowledge|external-software)'/g)).toHaveLength(3);
  expect(registry).not.toContain("id: 'scientific-knowledge'");
 });
 it('routes the USV module to the research workspace, but Code Repositories to its own catalogue',()=>{
  const app=read('src/App.tsx');
  expect(app).toContain("currentModule === 'external-software'");
  expect(app).toContain('<A26ResearchWorkspace initialTab="global-usv-fleet"');
  expect(app).toContain("currentModule === 'external-software' && (");
  expect(app).toContain('<ExternalSoftwareRegisterView />');
  expect(app).not.toContain("currentModule === 'global-usv-fleet' || currentModule === 'external-software'");
  expect(read('src/studio/dockyardAreas.ts')).not.toContain("'scientific-knowledge'");
 });
 it('does not classify scholarly papers as software repositories or new fleet models',()=>{
  const workspace=read('src/components/A26ResearchWorkspace.tsx');
  expect(workspace).toContain("tab==='scientific-knowledge'?feed?.publications:null");
  expect(workspace).toContain("tab==='external-software'?<div");
  expect(workspace).toContain('<ExternalSoftwareRegisterView/>');
  expect(workspace).toContain('Fresh code-repository discovery has not been verified');
  expect(workspace).toContain('Engineering approval: no');
  const catalogue=read('src/components/ExternalSoftwareRegisterView.tsx');
  expect(catalogue).toContain("import rawRegister from '../data/externalSoftwareRegister.json'");
  expect(catalogue).not.toContain('getPublicA26ReviewFeed');
 });
 it('keeps original fleet comparison as an optional view',()=>{
  const fleet=read('src/components/GlobalUsvFleetView.tsx');
  expect(fleet).toContain('hideA26Research?: boolean');
  expect(fleet).toContain('!hideA26Research && <section');
 });
});
