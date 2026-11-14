import React, { useMemo, useState } from 'react';
import { Anchor, ChevronDown, ChevronRight, LayoutGrid, Menu, Search, Star, X } from 'lucide-react';
import { MODULE_GROUPS, MODULE_REGISTRY, NavigationModule, searchModules } from '../moduleRegistry';

const PIN_KEY = 'naval-studio-x-pins';
const DEFAULT_PINS: NavigationModule[] = ['cad-studio', 'overview', 'agent-orchestrator'];

function readPins(): NavigationModule[] {
  try {
    const saved = JSON.parse(localStorage.getItem(PIN_KEY) || 'null');
    if (Array.isArray(saved)) {
      return saved.filter((id): id is NavigationModule => MODULE_REGISTRY.some((module) => module.id === id));
    }
  } catch { /* A bad preference must never block engineering navigation. */ }
  return DEFAULT_PINS;
}

interface Props {
  currentModule: NavigationModule;
  onSelectModule: (module: NavigationModule) => void;
}

export const StudioNavigation: React.FC<Props> = ({ currentModule, onSelectModule }) => {
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pins, setPins] = useState<NavigationModule[]>(readPins);
  const [openGroups, setOpenGroups] = useState<string[]>([MODULE_REGISTRY.find((m) => m.id === currentModule)?.group || 'Product']);
  const matches = useMemo(() => searchModules(query), [query]);

  const togglePin = (id: NavigationModule) => {
    const next = pins.includes(id) ? pins.filter((pin) => pin !== id) : [...pins, id];
    setPins(next);
    try { localStorage.setItem(PIN_KEY, JSON.stringify(next)); } catch { /* Preference only. */ }
  };
  const select = (id: NavigationModule) => {
    onSelectModule(id);
    setMobileOpen(false);
    setOpenGroups((groups) => [...new Set([...groups, MODULE_REGISTRY.find((m) => m.id === id)!.group])]);
  };
  const row = (id: NavigationModule, label: string) => (
    <div key={id} className={`group flex items-center rounded-lg border ${currentModule === id ? 'border-cyan-500/40 bg-cyan-500/10 text-[#cffafe]' : 'border-transparent text-[#cbd5e1] hover:bg-white/5'}`}>
      <button type="button" onClick={() => select(id)} aria-current={currentModule === id ? 'page' : undefined} className="flex-1 min-w-0 px-3 py-2 text-left text-sm truncate">
        {label}
      </button>
      <button type="button" onClick={() => togglePin(id)} aria-label={`${pins.includes(id) ? 'Unpin' : 'Pin'} ${label}`} title={`${pins.includes(id) ? 'Unpin' : 'Pin'} ${label}`} className={`px-2 py-2 ${pins.includes(id) ? 'text-[#fcd34d]' : 'text-[#64748b] group-hover:text-[#cbd5e1]'}`}>
        <Star size={13} fill={pins.includes(id) ? 'currentColor' : 'none'} />
      </button>
    </div>
  );

  return <>
    {!mobileOpen && <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open modules" className="lg:hidden fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-[#18344b] border border-cyan-400/30 px-4 py-3 text-sm text-white shadow-lg"><Menu size={17} /> Modules</button>}
    <aside aria-label="Studio modules" className={`${mobileOpen ? 'flex' : 'hidden lg:flex'} fixed lg:static inset-y-0 left-0 z-50 w-72 min-w-72 h-screen flex-col bg-[#101b2a] border-r border-white/10 shadow-xl lg:shadow-none`}>
    <div className="p-5 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-cyan-400/10 border border-cyan-300/25 p-2 text-[#67e8f9]"><Anchor size={19} /></div>
        <div><div className="font-bold tracking-[0.15em] text-sm text-white">NAVAL STUDIO X</div><div className="text-[11px] text-[#94a3b8]">Product engineering desktop</div></div>
        <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close modules" className="lg:hidden ml-auto text-[#94a3b8]"><X size={18} /></button>
      </div>
      <div className="mt-5 rounded-xl bg-[#19283b] border border-white/10 p-3">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#67e8f9]">Active product</div>
        <div className="mt-1 font-semibold text-white">USV-01 <span className="text-[#94a3b8] font-normal">/ Primary Vessel</span></div>
        <div className="text-xs text-[#94a3b8] mt-1">Configuration and baseline remain governed by existing records.</div>
      </div>
    </div>
    <div className="px-4 pt-4">
      <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b1421] px-3 py-2 text-[#94a3b8]">
        <Search size={15} /><span className="sr-only">Search all modules</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find any module…" className="w-full bg-transparent text-sm text-white placeholder:text-[#64748b] outline-none" />
      </label>
      <div className="flex items-center gap-1.5 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748b]"><Star size={12} /> Pinned</div>
      {pins.map((id) => MODULE_REGISTRY.find((m) => m.id === id)).filter((m): m is (typeof MODULE_REGISTRY)[number] => Boolean(m)).map((m) => row(m.id, m.label))}
    </div>
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-5">
      <div className="flex items-center gap-1.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748b]"><LayoutGrid size={12} /> All modules · {MODULE_REGISTRY.length}</div>
      {query ? (matches.length ? matches.map((m) => row(m.id, m.label)) : <p className="text-sm text-[#94a3b8] px-3 py-2">No matching modules</p>) : MODULE_GROUPS.map((group) => {
        const modules = MODULE_REGISTRY.filter((m) => m.group === group);
        const expanded = openGroups.includes(group);
        return <div key={group} className="mb-1">
          <button type="button" aria-expanded={expanded} onClick={() => setOpenGroups((groups) => expanded ? groups.filter((item) => item !== group) : [...groups, group])} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-[#94a3b8] hover:bg-white/5 hover:text-white">
            <span>{group} <span className="text-[#64748b] ml-1">{modules.length}</span></span>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {expanded && <div className="ml-2 border-l border-white/10 pl-2">{modules.map((m) => row(m.id, m.label))}</div>}
        </div>;
      })}
    </div>
    </aside>
  </>;
};
