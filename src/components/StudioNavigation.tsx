import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor, Box, BrainCircuit, ChevronDown, ChevronLeft, ChevronRight, ClipboardList,
  Compass, LayoutDashboard, Menu, Search, ShieldCheck, Star, Wrench, X
} from 'lucide-react';
import { MODULE_GROUPS, MODULE_REGISTRY, NavigationModule, searchModules } from '../moduleRegistry';
import { useEngineeringContext } from '../studio/engineeringContext';

const PIN_KEY = 'naval-studio-x-pins';
const RAIL_KEY = 'naval-studio-x-rail-collapsed';
const DEFAULT_PINS: NavigationModule[] = ['cad-studio', 'overview', 'agent-orchestrator'];

function readPins(): NavigationModule[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PIN_KEY) || 'null');
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is NavigationModule =>
        typeof id === 'string' && MODULE_REGISTRY.some(module => module.id === id));
    }
  } catch { /* Preference data is optional. */ }
  return DEFAULT_PINS;
}
function readRail(): boolean {
  try { return localStorage.getItem(RAIL_KEY) === 'true'; }
  catch { return false; }
}
function iconFor(id: NavigationModule) {
  if (id === 'cad-studio') return <Box size={18}/>;
  if (id === 'overview') return <LayoutDashboard size={18}/>;
  if (id.startsWith('orchestrator') || id === 'agent-orchestrator') return <BrainCircuit size={18}/>;
  if (id === 'traceability' || id === 'workstream-VNV') return <ShieldCheck size={18}/>;
  if (id.startsWith('workstream-')) return <Compass size={18}/>;
  if (id === 'simulations' || id === 'realtime-sim') return <Wrench size={18}/>;
  return <ClipboardList size={18}/>;
}
interface Props {
  currentModule: NavigationModule;
  onSelectModule: (module: NavigationModule) => void;
  onOpenCommand?: () => void;
}
export const StudioNavigation: React.FC<Props> = ({ currentModule, onSelectModule, onOpenCommand }) => {
  const { selection } = useEngineeringContext();
  const [collapsed, setCollapsed] = useState(readRail);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pins, setPins] = useState<NavigationModule[]>(readPins);
  const [groups, setGroups] = useState<string[]>([
    'Product', MODULE_REGISTRY.find(module => module.id === currentModule)?.group ?? 'Product'
  ]);
  const results = useMemo(() => searchModules(query), [query]);
  const drawer = useRef<HTMLElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const wasMobileOpen = useRef(false);

  useEffect(() => {
    if (mobileOpen) closeButton.current?.focus();
    else if (wasMobileOpen.current) openButton.current?.focus();
    wasMobileOpen.current = mobileOpen;
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMobileOpen(false); return; }
      if (event.key !== 'Tab' || !drawer.current) return;
      const tabbable = [...drawer.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])')]
        .filter(node => node.getClientRects().length > 0);
      if (!tabbable.length) return;
      const first = tabbable[0], last = tabbable[tabbable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileOpen]);

  const select = (module: NavigationModule) => {
    onSelectModule(module);
    setMobileOpen(false);
    setGroups(current => [...new Set([...current, MODULE_REGISTRY.find(m => m.id === module)!.group])]);
  };
  const toggleRail = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(RAIL_KEY, String(next)); } catch { /* preference only */ }
      return next;
    });
  };
  const togglePin = (id: NavigationModule) => {
    setPins(previous => {
      const next = previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id];
      try { localStorage.setItem(PIN_KEY, JSON.stringify(next)); } catch { /* preference only */ }
      return next;
    });
  };
  const moduleRow = (module: (typeof MODULE_REGISTRY)[number]) =>
    <div key={module.id} className="flex min-w-0 items-center">
      <button type="button" onClick={() => select(module.id)} className="ns3-navitem"
        aria-current={module.id === currentModule ? 'page' : undefined} title={module.label}>
        <span className="ns3-item-icon" aria-hidden="true" style={{ flex: 'none' }}>{iconFor(module.id)}</span>
        <span>{module.label}</span>
      </button>
      <button type="button" className="ns3-navitem-close" onClick={() => togglePin(module.id)}
        aria-pressed={pins.includes(module.id)} aria-label={(pins.includes(module.id) ? 'Unpin ' : 'Pin ') + module.label}>
        <Star size={16} fill={pins.includes(module.id) ? 'currentColor' : 'none'} aria-hidden="true"/>
      </button>
    </div>;

  return <>
    {!mobileOpen && <button ref={openButton} type="button" className="ns3-mobile-open" aria-label="Open modules"
      aria-expanded={false} onClick={() => setMobileOpen(true)}><Menu size={19}/> Modules</button>}
    {mobileOpen && <button type="button" aria-label="Close module drawer"
      className="ns3-side-backdrop ns3-visible" onClick={() => setMobileOpen(false)}/>}
    <aside ref={drawer} aria-label="Studio modules"
      role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen ? true : undefined}
      className={`ns3-side ${collapsed ? 'ns3-side--collapsed' : ''} ${mobileOpen ? 'ns3-mobile-active' : 'ns3-mobile-closed'}`}>
      <div className="ns3-side-top">
        <div className="ns3-brandmark"><Anchor size={19} aria-hidden="true"/></div>
        <div className="ns3-brandwords ns3-expanded">
          <div className="ns3-brandname">NAVAL STUDIO</div>
          <div className="ns3-brandcaption">Engineering workstation</div>
        </div>
        <button ref={closeButton} type="button" className="ns3-icon-button ns3-expanded"
          aria-label="Close modules" onClick={() => setMobileOpen(false)} style={{ display: mobileOpen ? undefined : 'none' }}>
          <X size={19} aria-hidden="true"/>
        </button>
        <button type="button" className="ns3-icon-button ns3-expanded" aria-label="Collapse navigation"
          onClick={toggleRail} title="Collapse navigation" style={{ display: mobileOpen ? 'none' : undefined }}>
          <ChevronLeft size={19} aria-hidden="true"/>
        </button>
        <button type="button" className="ns3-icon-button ns3-compact"
          aria-label="Expand navigation" onClick={toggleRail} title="Expand navigation">
          <ChevronRight size={19} aria-hidden="true"/>
        </button>
      </div>
      <div className="ns3-expanded flex min-h-0 flex-1 flex-col">
        <div className="ns3-side-product">
          <div className="ns3-side-product-name">USV-01 · Primary Vessel</div>
          <div className="ns3-side-product-desc">Configuration: {selection.configurationRevision ?? 'Unassigned / TBD'}</div>
        </div>
        <label className="ns3-side-search">
          <Search size={18} aria-hidden="true"/>
          <span className="sr-only">Search all modules</span>
          <input type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Find a module…" aria-label="Search all modules"/>
        </label>
        <div className="ns3-side-scroll">
          {!query && <>
            <div className="ns3-side-label">Pinned workspaces</div>
            {pins.map(id => MODULE_REGISTRY.find(m => m.id === id)).filter(
              (module): module is (typeof MODULE_REGISTRY)[number] => Boolean(module)
            ).map(moduleRow)}
            <div className="ns3-side-label">Engineering modules · {MODULE_REGISTRY.length}</div>
          </>}
          {query ? results.map(moduleRow) : MODULE_GROUPS.map(group => {
            const items = MODULE_REGISTRY.filter(m => m.group === group);
            const opened = groups.includes(group);
            return <div key={group}>
              <button type="button" className="ns3-navgroup-toggle" aria-expanded={opened}
                onClick={() => setGroups(current => opened ? current.filter(g => g !== group) : [...current, group])}>
                {group} <span aria-hidden="true">{opened ? <ChevronDown size={17}/> : <ChevronRight size={17}/>}</span>
              </button>
              {opened && <div>{items.map(moduleRow)}</div>}
            </div>;
          })}
          {query && results.length === 0 && <p className="ns3-director-empty">No matching modules. Try a discipline or module name.</p>}
        </div>
        <div className="ns3-side-footer"><span className="ns3-side-dot" aria-hidden="true"/>Configuration not released · UI context only</div>
      </div>
      <div className="ns3-compact flex-1 flex-col items-center gap-1 py-3">
        <button type="button" className="ns3-railbtn" aria-label="Search modules"
          title="Search modules" onClick={onOpenCommand ?? toggleRail}><Search size={21}/></button>
        {DEFAULT_PINS.map(id => <button type="button" key={id}
          className="ns3-railbtn" aria-current={currentModule === id ? 'page' : undefined}
          aria-label={MODULE_REGISTRY.find(m => m.id === id)?.label}
          title={MODULE_REGISTRY.find(m => m.id === id)?.label} onClick={() => select(id)}>{iconFor(id)}</button>)}
        <button type="button" className="ns3-railbtn" aria-label="Show all modules" title="All modules"
          onClick={onOpenCommand ?? toggleRail}><ClipboardList size={20}/></button>
      </div>
    </aside>
  </>;
};
