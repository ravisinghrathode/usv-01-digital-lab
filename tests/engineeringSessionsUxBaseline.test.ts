import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const contract=JSON.parse(read('config/engineering-sessions-ux-baseline.json'));

describe('Engineering Sessions — approved UX direction, not an engineering release',()=>{
 it('names and versions one explicitly design-only baseline',()=>{
  expect(contract.baseline_id).toBe('NAL-UX-BL-001');
  expect(contract.baseline_status).toBe('DESIGN_DIRECTION_SELECTED');
  expect(contract.scope).toBe('UX_DESIGN_ONLY_NOT_ENGINEERING_RELEASE');
  expect(contract.implementation_status).toBe('IMPLEMENTED');
  expect(contract.deployment_status).toBe('NOT_CLAIMED');
  expect(contract.governance.human_release_required).toBe(true);
  expect(contract.governance.engineering_authority_unchanged).toBe(true);
  expect(contract.governance.frozen_engineering_agent_count).toBe(26);
 });
 it('replaces the prior page/dashboard mental model with five investigation modes and context continuity',()=>{
  expect(contract.primary_object).toBe('investigation');
  expect(contract.modes.map((m:{id:string})=>m.id)).toEqual([
   'worktable','design','experiment','decide','notebook'
  ]);
  expect(contract.persistent_context).toEqual(expect.arrayContaining([
   'investigation_id','selected_configuration_revisions','selected_study_id',
   'operating_conditions_id','evidence_selection','active_mode'
  ]));
  expect(contract.accepted_constraints).toEqual(expect.arrayContaining([
   'NO_DARK_CAD_PLUS_SIMULATION_DASHBOARD_CARDS',
   'NO_FAKE_PHYSICS_IMAGES_AS_RESULTS',
   'AGENTS_CONTEXTUAL_NOT_GLOBAL_MODULE_TABS',
   'APPROVAL_REQUIRES_EXISTING_PROTECTED_HUMAN_RECORD'
  ]));
 });
 it('preserves engineering authority and points the standard interface at its selected UX baseline',()=>{
  const base=read('docs/design/ENGINEERING_SESSIONS_UX_BASELINE_V1.md');
  const refinement=read('docs/design/ENGINEERING_SESSIONS_INTERACTION_REFINEMENT.md');
  expect(base).toContain('W1 — Investigation Worktable');
  expect(base).toContain('E1 — Experiment Theatre');
  expect(base).toContain('R1 — Engineering Decision Room');
  expect(refinement).toContain('S2 — Design: synchronized A/B analysis');
  expect(refinement).toContain('No comparable mass properties');
  expect(read('DESIGN.md')).toContain('NAL-UX-BL-001');
  expect(read('index.html')).toContain('/src/sessions/main.tsx');
  expect(read('AGENTS.md')).toContain('Selected future UX design baseline');
  expect(read('index.html')).toContain('/src/sessions/main.tsx');
  expect(read('legacy.html')).toContain('/src/main.tsx');
 });
});
