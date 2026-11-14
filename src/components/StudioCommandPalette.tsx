import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Command, Search, X } from 'lucide-react';
import { NavigationModule, searchModules } from '../moduleRegistry';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (module: NavigationModule) => void;
}
export const StudioCommandPalette: React.FC<Props> = ({open,onClose,onSelect}) => {
  const [query,setQuery]=useState('');
  const [cursor,setCursor]=useState(0);
  const input=useRef<HTMLInputElement>(null);
  const found=useMemo(()=>searchModules(query),[query]);
  useEffect(()=>{if(open){setQuery('');setCursor(0);input.current?.focus();}},[open]);
  useEffect(()=>{if(!open)return;const onKey=(event:KeyboardEvent)=>{
    if(event.key==='Escape'){event.preventDefault();onClose();}
  };document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[open,onClose]);
  if(!open)return null;
  const select=(module:NavigationModule)=>{onSelect(module);onClose();};
  return <div className="fixed inset-0 z-[90] flex justify-center bg-[#020617]/85 px-4 pt-[10vh]" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div role="dialog" aria-modal="true" aria-label="Find engineering module" className="studio-dark h-fit w-full max-w-xl overflow-hidden rounded-xl border border-cyan-400/30 bg-[#111f30] shadow-2xl">
      <div className="flex items-center gap-3 border-b border-white/10 p-4"><Command size={16} className="text-cyan-300"/><Search size={16} className="text-slate-400"/>
        <input ref={input} value={query} onChange={e=>{setQuery(e.target.value);setCursor(0);}}
          onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setCursor(i=>Math.min(found.length-1,i+1));}else if(e.key==='ArrowUp'){e.preventDefault();setCursor(i=>Math.max(0,i-1));}else if(e.key==='Enter'&&found[cursor]){e.preventDefault();select(found[cursor].id);}}}
          placeholder="Search every engineering module…" className="w-full bg-transparent text-sm text-white outline-none" aria-label="Search engineering modules"/>
        <button type="button" aria-label="Close search" onClick={onClose} className="text-slate-400"><X size={17}/></button>
      </div>
      <div className="max-h-[48vh] overflow-y-auto p-2">
        {found.map((module,index)=><button type="button" key={module.id} onMouseEnter={()=>setCursor(index)} onClick={()=>select(module.id)} className={`flex w-full justify-between rounded-lg px-3 py-3 text-left text-sm ${index===cursor?'bg-cyan-400/15 text-cyan-100':'text-slate-300 hover:bg-white/10'}`}>
          <span>{module.label}</span><span className="ml-3 text-xs text-slate-500">{module.group}</span>
        </button>)}
        {!found.length&&<div className="p-4 text-sm text-slate-400">No matching engineering modules</div>}
      </div>
      <div className="border-t border-white/10 px-4 py-2 text-[11px] text-slate-500">↑↓ Select · Enter Open · Esc Close · Includes all 24 registered modules</div>
    </div>
  </div>;
};
