import React from 'react';
import { Activity, Box, Bot, Command, LayoutDashboard, ShieldCheck, Type, X } from 'lucide-react';
import type { StudioTextSize } from '../studio/readability';
import { NavigationModule, MODULE_REGISTRY } from '../moduleRegistry';
import { dockyardAreaFor, DOCKYARD_AREAS } from '../studio/dockyardAreas';
import { nextWorkTab, studioTabId, studioPanelId } from '../studio/workTabs';

const areaIcons: Record<string, React.ReactNode> = {
  product:<Box size={17} aria-hidden="true"/>,
  engineering:<Activity size={17} aria-hidden="true"/>,
  programme:<LayoutDashboard size={17} aria-hidden="true"/>,
  agents:<Bot size={17} aria-hidden="true"/>,
  assurance:<ShieldCheck size={17} aria-hidden="true"/>
};
interface Props {
  currentModule: NavigationModule;
  onSelectModule: (module: NavigationModule) => void;
  openTabs?: NavigationModule[];
  onCloseTab?: (module: NavigationModule) => void;
  onOpenCommand?: () => void;
  textSize?: StudioTextSize;
  onChangeTextSize?: (value: StudioTextSize) => void;
}
export const StudioWorkspaceBar: React.FC<Props> = ({
  currentModule, onSelectModule, openTabs = [currentModule], onCloseTab,
  onOpenCommand, textSize = 'comfortable', onChangeTextSize
}) => {
  const activeArea = dockyardAreaFor(currentModule);
  const handleTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const key = event.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;
    event.preventDefault();
    const next = nextWorkTab(openTabs, index, key);
    if (!next) return;
    onSelectModule(next);
    requestAnimationFrame(() => document.getElementById(studioTabId(next))?.focus());
  };

  return <div className="ns3-workspace-shell">
    <nav aria-label="Workspaces" className="ns3-workspaces">
      {DOCKYARD_AREAS.map(item => <button type="button" key={item.id}
        className="ns3-workspace-tab" aria-current={activeArea === item.id ? 'page' : undefined}
        onClick={() => onSelectModule(item.defaultModule)}>
        {areaIcons[item.id]}<span>{item.shortLabel}</span>
      </button>)}
      <div className="ns3-workspace-tools">
        {onChangeTextSize && <button type="button" className="ns3-workspace-tool"
          onClick={() => onChangeTextSize(textSize === 'comfortable' ? 'large' : 'comfortable')}
          aria-label={textSize === 'comfortable' ? 'Enable larger text' : 'Use comfortable text size'}
          aria-pressed={textSize === 'large'} title="Change text size throughout the lab">
          <Type size={16} aria-hidden="true"/> Text: {textSize === 'large' ? 'Large' : 'Comfortable'}
        </button>}
        {onOpenCommand && <button type="button" className="ns3-workspace-tool"
          aria-label="Open command palette" title="Find loaded records and modules (Ctrl/⌘+K)"
          onClick={onOpenCommand}><Command size={16} aria-hidden="true"/> Find <kbd className="ns3-shortcut">⌘K</kbd></button>}
      </div>
    </nav>
    <div role="tablist" aria-label="Open engineering work tabs" className="ns3-tabstrip" aria-orientation="horizontal">
      {openTabs.map((id, index) => {
        const module = MODULE_REGISTRY.find(m => m.id === id)!;
        const active = id === currentModule;
        return <div key={id} className="ns3-worktab" role="presentation">
          <button role="tab" type="button" id={studioTabId(id)}
            aria-controls={studioPanelId(id)} aria-selected={active} tabIndex={active ? 0 : -1}
            onClick={() => onSelectModule(id)} onKeyDown={event => handleTabKey(event, index)}
            className="ns3-worktab-button" title={module.label}>{module.label}</button>
          {onCloseTab && <button type="button" className="ns3-worktab-close"
            aria-label={`Close ${module.label} tab`} title="Close tab (unsaved changes warning)"
            onClick={() => onCloseTab(id)}><X size={15} aria-hidden="true"/></button>}
        </div>;
      })}
    </div>
  </div>;
};
