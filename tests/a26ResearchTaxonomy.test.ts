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
 it('routes the existing two nav entries into the new three-tab workspace',()=>{
  const app=read('src/App.tsx');
  expect(app).toContain("currentModule === 'external-software'");
  expect(app).toContain('<A26ResearchWorkspace initialTab={currentModule}');
  expect(read('src/studio/dockyardAreas.ts')).not.toContain("'scientific-knowledge'");
 });
 it('does not classify scholarly papers as software repositories or new fleet models',()=>{
  const workspace=read('src/components/A26ResearchWorkspace.tsx');
  expect(workspace).toContain("tab==='scientific-knowledge'?feed?.publications:null");
  expect(workspace).toContain("tab==='external-software'?<div");
  expect(workspace).toContain('<ExternalSoftwareRegisterView/>');
  expect(workspace).toContain('Fresh code-repository discovery has not been verified');
  expect(workspace).toContain('Engineering approval: no');
 });
 it('keeps original fleet comparison as an optional view',()=>{
  const fleet=read('src/components/GlobalUsvFleetView.tsx');
  expect(fleet).toContain('hideA26Research?: boolean');
  expect(fleet).toContain('!hideA26Research && <section');
 });
});
