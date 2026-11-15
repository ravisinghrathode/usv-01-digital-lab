import type { Snapshot } from '../dockyard2/domain';
import { MODULE_REGISTRY, type NavigationModule } from '../moduleRegistry';
import type { WorkstreamCode, Requirement, SimulationJob } from '../types/engineering';

export type Room='studio'|'physics'|'evidence'|'agents'|'library';
export const ROOMS=[
  {id:'studio',label:'Vessel studio',hint:'Working concept'},
  {id:'physics',label:'Simulations',hint:'Cases & solvers'},
  {id:'evidence',label:'Evidence',hint:'Requirements & V&V'},
  {id:'agents',label:'Agent directorate',hint:'Governed research'},
  {id:'library',label:'Library',hint:'References & tools'}
] as const satisfies ReadonlyArray<{id:Room;label:string;hint:string}>;

export const ASSEMBLIES=[
  {id:'vessel',name:'Complete vessel',short:'Vessel',domain:'NAV',module:'cad-studio',description:'Overall vessel architecture and envelope'},
  {id:'hull',name:'Hull structure',short:'Hull',domain:'MEC',module:'workstream-MEC',description:'Structure, flotation and lifting interfaces'},
  {id:'power',name:'Energy & propulsion',short:'Powertrain',domain:'PRP',module:'workstream-PRP',description:'Electrical propulsion and power delivery'},
  {id:'autonomy',name:'Autonomy suite',short:'Autonomy',domain:'AUT',module:'workstream-AUT',description:'Control, navigation and fail-operational logic'},
  {id:'payload',name:'Mission payload',short:'Payload',domain:'SYS',module:'workstream-SYS',description:'Mission equipment and service interfaces'}
] as const satisfies ReadonlyArray<{
  id:string;name:string;short:string;domain:WorkstreamCode;module:NavigationModule;description:string
}>;
export type AssemblyId=(typeof ASSEMBLIES)[number]['id'];
export type DrawingView='isometric'|'plan'|'section';

export function roomFromHash(hash:string):Room{
 const fragment=hash.replace(/^#/,'').split('?')[0];
 return ROOMS.find(r=>r.id===fragment)?.id??'studio';
}
export function legacyRoute(module:NavigationModule){
 return '/legacy.html?module='+encodeURIComponent(module);
}
export function moduleById(id:string){
 return MODULE_REGISTRY.find(module=>module.id===id);
}
export function selectedRecords(snapshot:Snapshot,assembly:AssemblyId){
 const selected=ASSEMBLIES.find(a=>a.id===assembly)??ASSEMBLIES[0];
 const codes:WorkstreamCode[]=assembly==='vessel'?['NAV','SYS']:selected.id==='power'?['PRP','ELE']:[selected.domain];
 return {
   requirements:snapshot.requirements.filter(r=>codes.includes(r.subsystemCode)),
   simulations:snapshot.simulations.filter(s=>s.discipline==='Multi-Physics'||codes.includes(s.discipline as WorkstreamCode)),
   risks:snapshot.risks.filter(r=>codes.includes(r.subsystemCode)),
   components:snapshot.components.filter(c=>codes.includes(c.subsystemCode))
 };
}
export function evidenceFor(snapshot:Snapshot,requirement:Requirement){
 const plans=snapshot.plans.filter(p=>p.targetReqIds.includes(requirement.id)||requirement.relatedVerifications.includes(p.id));
 const tests=snapshot.tests.filter(t=>plans.some(p=>p.id===t.planId));
 const simulations=snapshot.simulations.filter(s=>requirement.relatedSimulations.includes(s.id));
 return {plans,tests,simulations};
}
export function simulationMatches(s:SimulationJob,query:string,discipline:string){
 const normalized=query.trim().toLowerCase();
 const match=!normalized||[s.name,s.id,s.solver,s.discipline].join(' ').toLowerCase().includes(normalized);
 return match&&(discipline==='all'||s.discipline===discipline);
}
export function labSearch(snapshot:Snapshot,query:string){
 const modules=MODULE_REGISTRY.map(m=>({id:'module:'+m.id,title:m.label,detail:'Workspace · '+m.group,module:m.id}));
 const requirements=snapshot.requirements.map(r=>({id:'req:'+r.id,title:r.title,detail:r.id+' · Requirement',module:('workstream-'+r.subsystemCode) as NavigationModule}));
 const simulations=snapshot.simulations.map(s=>({id:'sim:'+s.id,title:s.name,detail:s.id+' · Simulation',module:'simulations' as NavigationModule}));
 const risks=snapshot.risks.map(r=>({id:'risk:'+r.id,title:r.description,detail:r.id+' · Technical risk',module:'risks-decisions' as NavigationModule}));
 const all=[...modules,...requirements,...simulations,...risks];
 const norm=query.trim().toLowerCase();
 return (norm?all.filter(x=>(x.title+' '+x.detail).toLowerCase().includes(norm)):modules).slice(0,60);
}
