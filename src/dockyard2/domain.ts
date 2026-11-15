/**
 * Naval Design Studio uses the existing engineering schema and the same authenticated
 * snapshot endpoint as Naval Studio. No new engineering data store or authority.
 */
import type {
  Requirement, DesignDecision, EngineeringRisk, SimulationJob,
  VerificationPlan, TestRecord, ComponentBOM, KnowledgeNote,
  WorkstreamCode
} from '../types/engineering';
import {
  INITIAL_REQUIREMENTS, INITIAL_DECISIONS, INITIAL_RISKS,
  INITIAL_SIMULATIONS, INITIAL_VERIFICATION_PLANS, INITIAL_TEST_RECORDS,
  INITIAL_COMPONENTS_BOM, INITIAL_KNOWLEDGE_NOTES
} from '../data/initialProjectData';
import { MODULE_REGISTRY, type NavigationModule } from '../moduleRegistry';
import { DOCKYARD_AREAS } from '../studio/dockyardAreas';

export type WorkArea = 'design'|'analysis'|'agents'|'director'|'evidence';
export interface Snapshot {
  requirements: Requirement[];
  decisions: DesignDecision[];
  risks: EngineeringRisk[];
  simulations: SimulationJob[];
  plans: VerificationPlan[];
  tests: TestRecord[];
  components: ComponentBOM[];
  notes: KnowledgeNote[];
}
export const illustrativeSnapshot: Snapshot = {
  requirements: INITIAL_REQUIREMENTS,
  decisions: INITIAL_DECISIONS,
  risks: INITIAL_RISKS,
  simulations: INITIAL_SIMULATIONS,
  plans: INITIAL_VERIFICATION_PLANS,
  tests: INITIAL_TEST_RECORDS,
  components: INITIAL_COMPONENTS_BOM,
  notes: INITIAL_KNOWLEDGE_NOTES
};

/** No partial overwrite: a successful server snapshot owns even empty arrays. */
export function parseServerSnapshot(input: unknown): Snapshot {
  if (!input || typeof input !== 'object') throw Error('Snapshot body missing');
  const response = input as { success?:unknown; data?:unknown };
  if (response.success !== true || !response.data || typeof response.data !== 'object')
    throw Error('Server did not return an authenticated engineering snapshot');
  const d = response.data as Record<string,unknown>;
  const read = <T,>(key:string):T[] => {
    if (!Array.isArray(d[key])) throw Error('Snapshot is missing the '+key+' register');
    return d[key] as T[];
  };
  return {
    requirements:read<Requirement>('requirements'),
    decisions:read<DesignDecision>('design_decisions'),
    risks:read<EngineeringRisk>('engineering_risks'),
    simulations:read<SimulationJob>('simulation_jobs'),
    plans:read<VerificationPlan>('verification_plans'),
    tests:read<TestRecord>('test_records'),
    components:read<ComponentBOM>('components'),
    notes:read<KnowledgeNote>('knowledge_notes')
  };
}
export function legacyModuleUrl(id:NavigationModule):string {
  return '/legacy.html?module='+encodeURIComponent(id);
}
/** Recognize a registered pre-cutover /?module= link and preserve it at the legacy editor. */
export function legacyRootRedirect(search:string):string|null {
  const requested = new URLSearchParams(search).get('module');
  const known = MODULE_REGISTRY.find(m=>m.id===requested);
  return known ? legacyModuleUrl(known.id) : null;
}
export function requestedLegacyModule(search:string):NavigationModule {
  const requested = new URLSearchParams(search).get('module');
  return MODULE_REGISTRY.find(m => m.id === requested)?.id ?? 'cad-studio';
}
export function domainForPart(part:string):WorkstreamCode|null {
  const entries:Record<string,WorkstreamCode> = {
    vessel:'NAV',hull:'NAV',deck:'MEC',propulsion:'PRP',
    power:'ELE',payload:'SYS',autonomy:'AUT'
  };
  return entries[part]??null;
}
export function areaForModule(id:NavigationModule):WorkArea {
  const group=DOCKYARD_AREAS.find(a=>(a.modules as readonly string[]).includes(id))?.id;
  return group==='product'?'design':group==='engineering'?'analysis':
    group==='programme'?'director':group==='assurance'?'evidence':'agents';
}
export interface SearchHit {
  key:string; title:string; subtitle:string;
  area:WorkArea; module:NavigationModule; kind:'Module'|'Record';
  illustrative:boolean;
}
export function searchLoaded(query:string,snapshot:Snapshot):SearchHit[] {
  const rows:SearchHit[]=[
    ...MODULE_REGISTRY.map(m=>({key:'module:'+m.id,title:m.label,subtitle:m.group,area:areaForModule(m.id),module:m.id,kind:'Module' as const,illustrative:false})),
    ...snapshot.requirements.map(r=>({key:'requirement:'+r.id,title:r.title,subtitle:r.id+' · '+r.status,area:'analysis' as const,module:('workstream-'+r.subsystemCode) as NavigationModule,kind:'Record' as const,illustrative:r.isIllustrative})),
    ...snapshot.decisions.map(r=>({key:'decision:'+r.id,title:r.title,subtitle:r.id+' · '+r.approvalState,area:'director' as const,module:'risks-decisions' as const,kind:'Record' as const,illustrative:r.isIllustrative})),
    ...snapshot.risks.map(r=>({key:'risk:'+r.id,title:r.description,subtitle:r.id+' · '+r.status,area:'director' as const,module:'risks-decisions' as const,kind:'Record' as const,illustrative:r.isIllustrative})),
    ...snapshot.simulations.map(r=>({key:'simulation:'+r.id,title:r.name,subtitle:r.id+' · '+r.runStatus,area:'analysis' as const,module:'simulations' as const,kind:'Record' as const,illustrative:r.isIllustrative})),
    ...snapshot.plans.map(r=>({key:'plan:'+r.id,title:r.title,subtitle:r.id+' · '+r.status,area:'evidence' as const,module:'workstream-VNV' as const,kind:'Record' as const,illustrative:r.isIllustrative})),
    ...snapshot.tests.map(r=>({key:'test:'+r.id,title:r.id,subtitle:'Test for '+r.planId+' · '+r.resultStatus,area:'evidence' as const,module:'workstream-VNV' as const,kind:'Record' as const,illustrative:r.isIllustrative})),
    ...snapshot.components.map(r=>({key:'bom:'+r.id,title:r.partNumber,subtitle:r.description,area:'design' as const,module:'procurement-bom' as const,kind:'Record' as const,illustrative:r.isIllustrative})),
    ...snapshot.notes.map(r=>({key:'note:'+r.id,title:r.title,subtitle:r.category,area:'director' as const,module:'knowledge-centre' as const,kind:'Record' as const,illustrative:false}))
  ];
  const term=query.trim().toLocaleLowerCase();
  if (!term) return rows.filter(x=>x.kind==='Module');
  return rows.filter(x=>(x.title+' '+x.subtitle+' '+x.module).toLocaleLowerCase().includes(term)).slice(0,90);
}
export function linkedEvidence(snapshot:Snapshot,r:Requirement) {
  const plans=snapshot.plans.filter(p=>
    p.targetReqIds.includes(r.id)||r.relatedVerifications.includes(p.id));
  const tests=snapshot.tests.filter(t=>plans.some(p=>p.id===t.planId));
  const simulations=snapshot.simulations.filter(s=>r.relatedSimulations.includes(s.id));
  return {plans,tests,simulations};
}
