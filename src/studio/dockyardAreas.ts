import type { NavigationModule } from '../moduleRegistry';

export const DOCKYARD_AREAS = [
  { id: 'product', label: 'Design & CAD', shortLabel: 'Design', defaultModule: 'cad-studio', modules: ['cad-studio','workstream-NAV','workstream-MEC','workstream-PRP','workstream-ELE','procurement-bom'] },
  { id: 'engineering', label: 'Engineering analysis', shortLabel: 'Analysis', defaultModule: 'simulations', modules: ['workstream-SYS','workstream-HYD','simulations','realtime-sim','generative-optimizer','workstream-AUT'] },
  { id: 'programme', label: 'Programme decisions', shortLabel: 'Programme', defaultModule: 'overview', modules: ['overview','risks-decisions','ship-building','global-usv-fleet','scientific-knowledge','external-software','knowledge-centre','notebook-lm'] },
  { id: 'agents', label: 'Agent workbench', shortLabel: 'Agents', defaultModule: 'agent-orchestrator', modules: ['agent-orchestrator','orchestrator-tools'] },
  { id: 'assurance', label: 'Assurance & evidence', shortLabel: 'Assurance', defaultModule: 'traceability', modules: ['traceability','workstream-VNV','orchestrator-approvals'] }
] as const satisfies ReadonlyArray<{
  id:string; label:string; shortLabel:string;
  defaultModule:NavigationModule; modules: readonly NavigationModule[];
}>;
export type DockyardAreaId = typeof DOCKYARD_AREAS[number]['id'];
export function dockyardAreaFor(module: NavigationModule): DockyardAreaId {
  return DOCKYARD_AREAS.find(area => (area.modules as readonly string[]).includes(module))?.id ?? 'product';
}
