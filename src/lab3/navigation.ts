import { MODULE_REGISTRY, type NavigationModule } from '../moduleRegistry';
import type { Snapshot } from '../dockyard2/domain';

export const LAB_SECTIONS = [
  {id:'lab',label:'Lab',description:'Product + simulation command surface'},
  {id:'products',label:'Products',description:'Concept, parts and CAD provenance'},
  {id:'simulations',label:'Simulations',description:'Runs, methods and verification'},
  {id:'agents',label:'Agents',description:'Research and governed execution'},
  {id:'evidence',label:'Evidence',description:'Requirements, tests and release'}
] as const;
export type LabSection = (typeof LAB_SECTIONS)[number]['id'];

export const PRODUCT_FACETS=[
  {id:'vessel',name:'Vessel assembly',domain:'NAV',module:'workstream-NAV'},
  {id:'hull',name:'Hull & structure',domain:'MEC',module:'workstream-MEC'},
  {id:'propulsion',name:'Propulsion train',domain:'PRP',module:'workstream-PRP'},
  {id:'payload',name:'Mission payload',domain:'SYS',module:'workstream-SYS'},
  {id:'autonomy',name:'Autonomy & control',domain:'AUT',module:'workstream-AUT'}
] as const satisfies ReadonlyArray<{
  id:string;name:string;domain:string;module:NavigationModule
}>;
export type ProductFacetId = (typeof PRODUCT_FACETS)[number]['id'];

export function parseLabSection(hash:string):LabSection {
  const value=hash.replace(/^#/, '').split('?')[0];
  return LAB_SECTIONS.find(section=>section.id===value)?.id ?? 'lab';
}
export function moduleLink(module:NavigationModule) {
  return '/legacy.html?module='+encodeURIComponent(module);
}
export function moduleLabel(module:NavigationModule) {
  return MODULE_REGISTRY.find(m=>m.id===module)?.label??module;
}
export function engineeringSignals(snapshot:Snapshot){
  return {
    requirements:snapshot.requirements.length,
    simulations:snapshot.simulations.length,
    openRisks:snapshot.risks.filter(r=>r.status==='Open').length,
    pendingDecisions:snapshot.decisions.filter(d=>d.approvalState!=='Approved').length,
    plans:snapshot.plans.length
  };
}
export function searchLab(query:string,snapshot:Snapshot) {
  const needle=query.trim().toLocaleLowerCase();
  const modules=MODULE_REGISTRY.map(m=>({id:'module:'+m.id,title:m.label,meta:'Module · '+m.group,module:m.id,illustrative:false}));
  const simulations=snapshot.simulations.map(s=>({
    id:'simulation:'+s.id,title:s.name,meta:'Simulation · '+s.id+' · '+s.runStatus,
    module:'simulations' as NavigationModule,illustrative:s.isIllustrative
  }));
  const requirements=snapshot.requirements.map(r=>({
    id:'requirement:'+r.id,title:r.title,meta:'Requirement · '+r.id,
    module:('workstream-'+r.subsystemCode) as NavigationModule,
    illustrative:r.isIllustrative
  }));
  const risks=snapshot.risks.map(r=>({
    id:'risk:'+r.id,title:r.description,meta:'Technical risk · '+r.id,
    module:'risks-decisions' as NavigationModule,illustrative:r.isIllustrative
  }));
  const results=[...modules,...simulations,...requirements,...risks];
  return (needle?results.filter(entry=>(entry.title+' '+entry.meta).toLocaleLowerCase().includes(needle)):modules).slice(0,60);
}
