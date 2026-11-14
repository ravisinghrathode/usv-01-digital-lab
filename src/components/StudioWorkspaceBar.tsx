import React from 'react';
import { Command, Type, X } from 'lucide-react';
import type { StudioTextSize } from '../studio/readability';
import { NavigationModule, StudioWorkspace, MODULE_REGISTRY } from '../moduleRegistry';

const workspaces:{id:StudioWorkspace;label:string;defaultModule:NavigationModule}[]=[
  {id:'cad',label:'CAD Studio',defaultModule:'cad-studio'},
  {id:'programme',label:'Programme',defaultModule:'overview'},
  {id:'analysis',label:'Analysis',defaultModule:'simulations'},
  {id:'verification',label:'Verification',defaultModule:'workstream-VNV'}
];
interface Props {
  currentModule:NavigationModule;
  onSelectModule:(module:NavigationModule)=>void;
  openTabs?:NavigationModule[];
  onCloseTab?:(module:NavigationModule)=>void;
  onOpenCommand?:()=>void;
  textSize?:StudioTextSize;
  onChangeTextSize?:(value:StudioTextSize)=>void;
}
export const StudioWorkspaceBar:React.FC<Props>=({currentModule,onSelectModule,openTabs=[currentModule],onCloseTab,onOpenCommand,textSize='comfortable',onChangeTextSize})=>{
  const workspace=MODULE_REGISTRY.find(m=>m.id===currentModule)!.workspace;
  return <div className="studio-dark border-b border-white/10 bg-[#132236]">
    <nav aria-label="Workspaces" className="flex items-center gap-1.5 overflow-x-auto px-3 py-1.5">
      {workspaces.map(item=><button key={item.id} type="button" onClick={()=>onSelectModule(item.defaultModule)} aria-current={workspace===item.id?'page':undefined}
        className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${workspace===item.id?'bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-400/30':'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{item.label}</button>)}
      {onChangeTextSize&&<button type="button" onClick={()=>onChangeTextSize(textSize==='comfortable'?'large':'comfortable')}
        aria-label={textSize==='comfortable'?'Enable larger text':'Use comfortable text size'}
        aria-pressed={textSize==='large'} title="Change text size throughout the lab"
        className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/20">
        <Type size={16}/> Text: {textSize==='large'?'Large':'Comfortable'}
      </button>}
      {onOpenCommand&&<button type="button" title="Command search (Ctrl/⌘+K)" aria-label="Open command palette" onClick={onOpenCommand} className={`flex shrink-0 items-center gap-1 rounded border border-white/20 px-2.5 py-1.5 text-xs text-slate-200 ${onChangeTextSize?'':'ml-auto'}`}><Command size={15}/> Find <kbd className="text-slate-400">⌘K</kbd></button>}
    </nav>
    <div role="tablist" aria-label="Open engineering work tabs" className="flex min-h-[35px] items-center gap-1 overflow-x-auto border-t border-white/5 px-3">
      {openTabs.map(id=>{const module=MODULE_REGISTRY.find(m=>m.id===id)!;const active=id===currentModule;
        return <div key={id} className={`flex shrink-0 items-center rounded-t border-x border-t text-[11px] ${active?'border-cyan-400/30 bg-[#192d43] text-cyan-100':'border-white/5 bg-[#101d2e] text-slate-400'}`}>
          <button role="tab" type="button" aria-selected={active} onClick={()=>onSelectModule(id)} className="max-w-[170px] truncate px-2.5 py-2" title={module.label}>{module.label}</button>
          {onCloseTab&&<button type="button" aria-label={`Close ${module.label} tab`} title="Close this tab (confirm unsaved edits)" onClick={()=>onCloseTab(id)} className="rounded p-1 hover:bg-white/10"><X size={12}/></button>}
        </div>;
      })}
    </div>
  </div>;
};
