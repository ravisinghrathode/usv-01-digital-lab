/** One navigation source of truth. IDs are stable because existing views use them. */
export const MODULE_REGISTRY = [
  { id: 'overview', label: 'Project Overview', group: 'Programme', workspace: 'programme' },
  { id: 'cad-studio', label: 'CAD Studio', group: 'Product', workspace: 'cad' },
  { id: 'agent-orchestrator', label: '26-Agent Directorate', group: 'Programme', workspace: 'programme' },
  { id: 'orchestrator-tools', label: 'Deterministic Tools', group: 'Programme', workspace: 'programme' },
  { id: 'orchestrator-approvals', label: 'Approval Gates', group: 'Programme', workspace: 'programme' },
  { id: 'global-usv-fleet', label: 'USV Intelligence', group: 'Research', workspace: 'programme' },
  { id: 'external-software', label: 'Code Repositories', group: 'Research', workspace: 'programme' },
  { id: 'workstream-SYS', label: 'Systems Engineering', group: 'Engineering', workspace: 'analysis' },
  { id: 'workstream-NAV', label: 'Naval Architecture', group: 'Engineering', workspace: 'analysis' },
  { id: 'workstream-HYD', label: 'Hydrodynamics & CFD', group: 'Engineering', workspace: 'analysis' },
  { id: 'workstream-MEC', label: 'Mechanical & Structural', group: 'Engineering', workspace: 'analysis' },
  { id: 'workstream-ELE', label: 'Electrical & Power', group: 'Engineering', workspace: 'analysis' },
  { id: 'workstream-PRP', label: 'Propulsion', group: 'Engineering', workspace: 'analysis' },
  { id: 'workstream-AUT', label: 'Software & Autonomy', group: 'Engineering', workspace: 'analysis' },
  { id: 'workstream-VNV', label: 'Verification & Validation', group: 'Verification', workspace: 'verification' },
  { id: 'traceability', label: 'Traceability Matrix', group: 'Verification', workspace: 'verification' },
  { id: 'simulations', label: 'Simulation Centre', group: 'Analysis', workspace: 'analysis' },
  { id: 'risks-decisions', label: 'Risks & Decisions', group: 'Registers', workspace: 'programme' },
  { id: 'procurement-bom', label: 'Procurement & BOM', group: 'Registers', workspace: 'programme' },
  { id: 'knowledge-centre', label: 'Knowledge Centre', group: 'Research', workspace: 'programme' },
  { id: 'realtime-sim', label: 'Real-Time Simulator', group: 'Analysis', workspace: 'analysis' },
  { id: 'ship-building', label: 'Shipbuilding Lifecycle', group: 'Programme', workspace: 'programme' },
  { id: 'generative-optimizer', label: 'Generative Optimizer', group: 'Analysis', workspace: 'analysis' },
  { id: 'notebook-lm', label: 'Naval Notebook', group: 'Research', workspace: 'programme' }
] as const;

export type NavigationModule = (typeof MODULE_REGISTRY)[number]['id'];
export type StudioWorkspace = (typeof MODULE_REGISTRY)[number]['workspace'];
export const MODULE_GROUPS = ['Product', 'Programme', 'Engineering', 'Analysis', 'Verification', 'Registers', 'Research'] as const;

export function findModule(id: NavigationModule) {
  return MODULE_REGISTRY.find((module) => module.id === id)!;
}

export function searchModules(query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return MODULE_REGISTRY.filter((module) =>
    `${module.label} ${module.group} ${module.id}`.toLocaleLowerCase().includes(normalized)
  );
}
