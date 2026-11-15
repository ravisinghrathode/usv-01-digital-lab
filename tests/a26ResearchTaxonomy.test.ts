import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
describe('A26: exactly two independent research modules',()=>{
 it('keeps the governed 24-module shell and declares only USV Models and Code Repositories for A26',()=>{
  const registry=read('src/moduleRegistry.ts');
  expect(registry).toContain("id: 'global-usv-fleet', label: 'USV Models'");
  expect(registry).toContain("id: 'external-software', label: 'Code Repositories'");
  expect(registry).not.toContain("id: 'scientific-knowledge'");
 });
 it('routes each A26 module directly to its separate domain component',()=>{
  const app=read('src/App.tsx');
  expect(app).toContain("<GlobalUsvFleetView onAskAi={triggerAiQuery} />");
  expect(app).toContain("<ExternalSoftwareRegisterView />");
  expect(app).not.toContain('<A26ResearchWorkspace initialTab=');
  expect(app).not.toContain('import { A26ResearchWorkspace }');
 });
 it('keeps full seeded vessel profiles and source-linked public prototypes',()=>{
  const models=read('src/components/GlobalUsvFleetView.tsx');
  expect(models).toContain('GLOBAL_NAVY_USVS');
  expect(models).toContain('Deep Model Specs');
  expect(models).toContain('selectedVessel.dimensions.lengthOverallM');
  expect(models).toContain('selectedVessel.country');
  expect(models).toContain('Newly discovered USV models and public evidence');
  expect(models).toContain('publicResearch.vessels.length');
  expect(models).toContain('publicResearch.leads.length');
  expect(models).toContain('r.claims.map');
  expect(models).not.toContain("researchKind==='publications'");
  expect(models.indexOf('Vessel Model Grid')).toBeLessThan(models.indexOf('Newly discovered USV models and public evidence'));
  expect(models).toContain('Unverified seeded intelligence');
  expect(models).not.toContain('✅ Verified Open-Source Naval Baseline');
 });
 it('keeps Code Repositories on its own protected software catalogue',()=>{
  const repos=read('src/components/ExternalSoftwareRegisterView.tsx');
  expect(repos).toContain("import rawRegister from '../data/externalSoftwareRegister.json'");
  expect(repos).toContain('Code Repositories</h2>');
  expect(repos).not.toContain('getPublicA26ReviewFeed');
  const catalogue=JSON.parse(read('src/data/externalSoftwareRegister.json'));
  expect(catalogue.records).toHaveLength(90);
  expect(catalogue.records.every((r:any)=>r.repositoryUrl.startsWith('https://'))).toBe(true);
 });
});
