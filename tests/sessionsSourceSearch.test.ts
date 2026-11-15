import {describe,expect,it} from 'vitest';
import {illustrativeSnapshot} from '../src/dockyard2/domain';
import {searchSourceRegister} from '../src/sessions/sourceSearch';
import {readFileSync} from 'node:fs';

describe('Engineering Sessions V2 — source register without fabricated investigation links',()=>{
 it('does not claim global record lists are part of a demo investigation until there is a search',()=>{
  expect(searchSourceRegister(illustrativeSnapshot,'',false)).toEqual([]);
  expect(searchSourceRegister(illustrativeSnapshot,'no-matching-engineering-artifact',false)).toEqual([]);
 });
 it('returns known loaded records and correctly distinguishes authenticated vs illustrative source context',()=>{
  const req=illustrativeSnapshot.requirements[0];
  const sim=illustrativeSnapshot.simulations[0];
  const requirements=searchSourceRegister(illustrativeSnapshot,req.id,false);
  expect(requirements.some(x=>x.id==='source:requirement:'+req.id)).toBe(true);
  expect(requirements.every(x=>x.meta.includes('Illustrative fallback'))).toBe(true);
  const server=searchSourceRegister(illustrativeSnapshot,sim.id,true);
  expect(server.some(x=>x.id==='source:simulation:'+sim.id)).toBe(true);
  expect(server.every(x=>x.meta.includes('Authenticated register'))).toBe(true);
  expect(server.every(x=>x.module==='simulations')).toBe(true);
 });
 it('does not invent a unique deep link to a private approved case',()=>{
  const r=searchSourceRegister(illustrativeSnapshot,illustrativeSnapshot.requirements[0].id,false);
  expect(r[0].module).toBe('traceability');
  expect(r[0].meta).not.toContain('Approved');
  const app=readFileSync(new URL('../src/sessions/App.tsx',import.meta.url),'utf8');
  expect(app).toContain('useSnapshot()');
  expect(app).toContain('searchSourceRegister');
  expect(app).toContain("status==='connected'");
 });
 it('keeps geometric renders reproducible and prohibits fake solver data',()=>{
  const generator=readFileSync(new URL('../scripts/ui/render_sessions_vessels.py',import.meta.url),'utf8');
  expect(generator).toContain('Continuous inclined forward windscreen');
  expect(generator).toContain('No third-party ship photographs');
  expect(generator).toContain('scene.cycles.use_denoising=False');
 });
});
