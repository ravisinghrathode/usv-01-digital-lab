import React from 'react';
import { NavigationModule, StudioWorkspace, MODULE_REGISTRY } from '../moduleRegistry';

const workspaces: { id: StudioWorkspace; label: string; defaultModule: NavigationModule }[] = [
  { id: 'cad', label: 'CAD Studio', defaultModule: 'cad-studio' },
  { id: 'programme', label: 'Programme', defaultModule: 'overview' },
  { id: 'analysis', label: 'Analysis', defaultModule: 'simulations' },
  { id: 'verification', label: 'Verification', defaultModule: 'workstream-VNV' }
];

export const StudioWorkspaceBar: React.FC<{ currentModule: NavigationModule; onSelectModule: (module: NavigationModule) => void }> = ({ currentModule, onSelectModule }) => {
  const workspace = MODULE_REGISTRY.find((module) => module.id === currentModule)!.workspace;
  return <nav aria-label="Workspaces" className="flex items-center gap-2 overflow-x-auto border-b border-white/10 bg-[#132236] px-5 py-2">
    <span className="mr-3 shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#64748b]">Workspace</span>
    {workspaces.map((item) => <button key={item.id} type="button" onClick={() => onSelectModule(item.defaultModule)} aria-current={workspace === item.id ? 'page' : undefined} className={`shrink-0 rounded-lg px-4 py-2 text-xs font-semibold ${workspace === item.id ? 'bg-cyan-400/15 text-[#a5f3fc] ring-1 ring-cyan-400/30' : 'text-[#94a3b8] hover:bg-white/5 hover:text-white'}`}>{item.label}</button>)}
    <span className="ml-auto shrink-0 text-[11px] text-[#64748b]">{MODULE_REGISTRY.find((module) => module.id === currentModule)!.label}</span>
  </nav>;
};
