import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
describe('A26 source-backed research modules',()=>{
 it('routes exactly two research domains to separate current-data views',()=>{
  const app=read('src/App.tsx');
  expect(app).toContain('<UsvModelsLiveView onAskAi={triggerAiQuery} />');
  expect(app).toContain('<RepositoryResearchView />');
  expect(app).not.toContain("<GlobalUsvFleetView onAskAi={triggerAiQuery} />");
  expect(app).not.toContain('<ExternalSoftwareRegisterView />');
  const registry=read('src/moduleRegistry.ts');
  expect(registry).toContain("id: 'global-usv-fleet', label: 'USV Models'");
  expect(registry).toContain("id: 'external-software', label: 'Code Repositories'");
 });
 it('shows real curated and unselected repository scout snapshots ahead of the old register',()=>{
  const view=read('src/components/RepositoryResearchView.tsx');
  expect(view).toContain("2026-11-15-curated.json");
  expect(view).toContain("2026-11-15-all-search-hits.json");
  expect(view).toContain('<ExternalSoftwareRegisterView/>');
  const curated=JSON.parse(read('references/repository-scout/2026-11-15-curated.json'));
  const all=JSON.parse(read('references/repository-scout/2026-11-15-all-search-hits.json'));
  const legacy=JSON.parse(read('src/data/externalSoftwareRegister.json'));
  expect(curated.records).toHaveLength(88);
  expect(all.records).toHaveLength(380);
  expect(legacy.records.length).toBeGreaterThanOrEqual(90);
  expect(new Set(legacy.records.map((r:any)=>r.repository.toLowerCase())).size).toBe(legacy.records.length);
  expect(view).toContain('governedRegister.records.length');
  expect(curated.governance).toContain('no candidate approved');
  expect(all.records.every((r:any)=>r.url.startsWith('https://github.com/'))).toBe(true);
 });
 it('presents new model evidence first and keeps older detailed profiles separately',()=>{
  const newView=read('src/components/UsvModelsLiveView.tsx');
  expect(newView).toContain("getPublicA26ReviewFeed({force:true})");
  expect(newView).toContain("useState<Mode>('models')");
  expect(newView).toContain('<GlobalUsvFleetView onAskAi={onAskAi} hideA26Research/>');
  expect(newView).toContain('FIELDS.map');
  expect(newView).toContain('active.claims.map');
  expect(newView).toContain('Country:');
  expect(newView).toContain("No sourced engineering particulars yet");
 });
});
