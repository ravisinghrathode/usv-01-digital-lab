import React, { useMemo, useState } from 'react';
import { Anchor, ChevronDown, ChevronLeft, ChevronRight, Command, LayoutGrid, Menu, PanelLeftOpen, Search, Star, X } from 'lucide-react';
import { MODULE_GROUPS, MODULE_REGISTRY, NavigationModule, searchModules } from '../moduleRegistry';
import { useEngineeringContext } from '../studio/engineeringContext';

const PIN_KEY='naval-studio-x-pins';
const RAIL_KEY='naval-studio-x-rail-collapsed';
const DEFAULT_PINS:NavigationModule[]=['cad-studio','overview','agent-orchestrator'];
function readPins():NavigationModule[]{
  try {
    const parsed=JSON.parse(localStorage.getItem(PIN_KEY)||'null');
    if(Array.isArray(parsed))return parsed.filter((id):id is NavigationModule=>MODULE_REGISTRY.some(m=>m.id===id));
  } catch {/* Preferences must not block navigation. */}
  return DEFAULT_PINS;
}
function readRail():boolean{
  try{return localStorage.getItem(RAIL_KEY)==='true';}catch{return false;}
}
interface Props {
  currentModule:NavigationModule;
  onSelectModule:(module:NavigationModule)=>void;
  onOpenCommand?:()=>void;
}
export const StudioNavigation:React.FC<Props>=({currentModule,onSelectModule,onOpenCommand})=>{
  const {selection}=useEngineeringContext();
  const [collapsed,setCollapsed]=useState(readRail);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [pins,setPins]=useState<NavigationModule[]>(readPins);
  const [groups,setGroups]=useState<string[]>([MODULE_REGISTRY.find(m=>m.id===currentModule)?.group||'Product']);
  const results=useMemo(()=>searchModules(query),[query]);
  const select=(module:NavigationModule)=>{
    onSelectModule(module);setMobileOpen(false);
    setGroups(current=>[...new Set([...current,MODULE_REGISTRY.find(m=>m.id===module)!.group])]);
  };
  const toggleRail=()=>{
    const next=!collapsed;setCollapsed(next);
    try{localStorage.setItem(RAIL_KEY,String(next));}catch{/* preference only */}
  };
  const togglePin=(id:NavigationModule)=>{
    const next=pins.includes(id)?pins.filter(p=>p!==id):[...pins,id];
    setPins(next);try{localStorage.setItem(PIN_KEY,JSON.stringify(next));}catch{/* preference only */}
  };
  const moduleRow=(m:(typeof MODULE_REGISTRY)[number])=><div key={m.id} className={`group flex items-center rounded-md ${m.id===currentModule?'bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-400/20':'text-slate-300 hover:bg-white/5'}`}>
    <button type="button" onClick={()=>select(m.id)} aria-current={m.id===currentModule?'page':undefined} className="min-w-0 flex-1 truncate px-3 py-2 text-left text-xs">{m.label}</button>
    <button type="button" onClick={()=>togglePin(m.id)} aria-label={`${pins.includes(m.id)?'Unpin':'Pin'} ${m.label}`} className={`p-2 ${pins.includes(m.id)?'text-amber-300':'text-slate-500'}`}><Star size={13} fill={pins.includes(m.id)?'currentColor':'none'}/></button>
  </div>;

  return <>
    {!mobileOpen&&<button type="button" onClick={()=>setMobileOpen(true)} aria-label="Open modules" className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-[#18344b] px-4 py-3 text-sm text-white lg:hidden"><Menu size={16}/> Modules</button>}
    <aside aria-label="Studio modules" className={`${mobileOpen?'flex':'hidden lg:flex'} ${collapsed&&!mobileOpen?'lg:w-[64px] lg:min-w-[64px]':'w-72 min-w-72'} fixed inset-y-0 left-0 z-50 h-screen flex-col border-r border-white/10 bg-[#101b2a] shadow-xl transition-[width] duration-200 lg:static lg:shadow-none`}>
      <div className={`flex items-center gap-2 border-b border-white/10 ${collapsed?'p-3':'p-4'}`}>
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-2 text-cyan-300"><Anchor size={17}/></div>
        {!collapsed&&<div className="min-w-0 flex-1"><div className="truncate text-sm font-bold tracking-[0.12em] text-white">NAVAL STUDIO X.2</div><div className="text-[10px] text-slate-400">Engineering workbench</div></div>}
        <button type="button" onClick={()=>setMobileOpen(false)} aria-label="Close modules" className="ml-auto text-slate-300 lg:hidden"><X size={18}/></button>
        <button type="button" onClick={toggleRail} aria-label={collapsed?'Expand navigation':'Collapse navigation'} title={collapsed?'Expand navigation':'Collapse navigation'} className="hidden rounded p-1.5 text-slate-300 hover:bg-white/10 lg:block">{collapsed?<PanelLeftOpen size={17}/>:<ChevronLeft size={17}/>}</button>
      </div>
      {collapsed&&!mobileOpen ? <div className="flex flex-1 flex-col items-center gap-2 px-1 py-3">
        <button type="button" title="Find any module" aria-label="Find any module" onClick={()=>{setCollapsed(false);try{localStorage.setItem(RAIL_KEY,'false');}catch{/* preference only */}}} className="rounded-lg p-3 text-slate-300 hover:bg-white/10"><Search size={18}/></button>
        {pins.map(id=><button key={id} type="button" title={MODULE_REGISTRY.find(m=>m.id===id)?.label} aria-label={MODULE_REGISTRY.find(m=>m.id===id)?.label} onClick={()=>select(id)} className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold ${currentModule===id?'bg-cyan-400/20 text-cyan-200':'text-slate-400 hover:bg-white/10'}`}>{MODULE_REGISTRY.findIndex(m=>m.id===id)+1}</button>)}
        <button type="button" title="All modules" aria-label="Show all modules" onClick={()=>setCollapsed(false)} className="mt-2 rounded-lg p-3 text-slate-300 hover:bg-white/10"><LayoutGrid size={17}/></button>
        {onOpenCommand&&<button type="button" title="Command search" aria-label="Command search" onClick={onOpenCommand} className="rounded-lg p-3 text-slate-300 hover:bg-white/10"><Command size={17}/></button>}
      </div> : <>
        <div className="border-b border-white/10 p-3">
          <div className="rounded-lg bg-[#1b2d40] p-3"><div className="text-[10px] uppercase tracking-wider text-cyan-300">Active product</div><div className="mt-1 text-sm font-semibold text-white">USV-01 / Primary Vessel</div><div className="mt-1 text-[11px] text-slate-400">Configuration: {selection.configurationRevision??'Unassigned · TBD'}</div></div>
          <label className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b1421] px-3 py-2 text-slate-400"><Search size={15}/><span className="sr-only">Search all modules</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find any module…" className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"/></label>
          {onOpenCommand&&<button type="button" onClick={onOpenCommand} className="mt-2 flex w-full items-center gap-2 rounded border border-white/10 p-2 text-left text-xs text-slate-300 hover:bg-white/10"><Command size={13}/> Global command search <span className="ml-auto text-slate-500">⌘K</span></button>}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {!query&&<><div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500"><Star size={12}/> Pinned</div>{pins.map(id=>MODULE_REGISTRY.find(m=>m.id===id)).filter((m):m is (typeof MODULE_REGISTRY)[number]=>Boolean(m)).map(moduleRow)}<div className="mb-2 mt-5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500"><LayoutGrid size={12}/> All modules · {MODULE_REGISTRY.length}</div></>}
          {query?results.map(moduleRow):MODULE_GROUPS.map(group=>{
            const items=MODULE_REGISTRY.filter(m=>m.group===group);
            const opened=groups.includes(group);
            return <div key={group} className="mb-1">
              <button type="button" aria-expanded={opened} onClick={()=>setGroups(current=>opened?current.filter(g=>g!==group):[...current,group])} className="flex w-full items-center justify-between rounded p-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:bg-white/5"><span>{group} <span className="text-slate-600">({items.length})</span></span>{opened?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</button>
              {opened&&<div className="ml-1 border-l border-white/10 pl-2">{items.map(moduleRow)}</div>}
            </div>;
          })}
          {query&&results.length===0&&<p className="p-3 text-sm text-slate-400">No matching modules</p>}
        </div>
      </>}
    </aside>
  </>;
};
