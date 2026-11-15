import React, { useEffect, useRef } from 'react';
import {
  ArrowLeft, BrainCircuit, Download, HelpCircle, Layers3, LogIn, LogOut, MoreHorizontal,
  Plus, RotateCcw, Search, ShieldCheck, UserRound
} from 'lucide-react';
import { ApproverIdentity } from '../core/types/safety.ts';

interface TopBarProps {
  currentModuleName: string;
  onOpenSearch: () => void;
  onOpenNewRecord: () => void;
  onOpenExportImport: () => void;
  onResetDemo: () => void;
  onToggleAiAssistant: () => void;
  isAiAssistantOpen: boolean;
  onOpenContextGuide: () => void;
  currentUser?: ApproverIdentity | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenVerify?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentModuleName, onOpenSearch, onOpenNewRecord, onOpenExportImport,
  onResetDemo, onToggleAiAssistant, isAiAssistantOpen, onOpenContextGuide,
  currentUser, onOpenLogin, onLogout, onOpenVerify
}) => {
  const menu = useRef<HTMLDetailsElement>(null);
  const action = (fn: () => void) => { menu.current?.removeAttribute('open'); fn(); };

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.removeAttribute('open');
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.removeAttribute('open');
        menu.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeEscape);
    };
  }, []);

  return <header className="ns3-topbar" aria-label="Naval Studio application command bar">
    <div className="ns3-topbar-left">
      <div aria-hidden="true" style={{width: 38,height:38,display:'grid',placeItems:'center',background:'#e4f1f4',borderRadius:9,color:'#096b7e'}}>
        <Layers3 size={20}/>
      </div>
      <div className="ns3-topbar-path">
        <span className="ns3-topbar-project">USV-01 / Engineering workbench</span>
        <h1 className="ns3-topbar-title" title={currentModuleName}>{currentModuleName}</h1>
      </div>
    </div>
    <div className="ns3-topbar-actions">
      <a href="/" className="ns3-action" aria-label="Return to Engineering Sessions"
        title="Return to Engineering Sessions">
        <ArrowLeft size={18} aria-hidden="true"/><span className="ns3-action-label">Engineering Sessions</span>
      </a>
      <button type="button" className="ns3-action" onClick={onOpenSearch}
        aria-label="Search loaded engineering records and modules"
        title="Search loaded records and modules (Ctrl/Command + K)">
        <Search size={18} aria-hidden="true"/><span className="ns3-action-label">Find records</span><kbd className="ns3-shortcut">⌘K</kbd>
      </button>
      <button type="button" className="ns3-action ns3-action--primary" onClick={onOpenNewRecord}
        title={currentUser ? 'Create engineering record' : 'Sign in before creating records'}>
        <Plus size={18} aria-hidden="true"/><span className="ns3-action-label">New record</span>
      </button>
      <button type="button" className="ns3-action ns3-action--verify" onClick={onOpenVerify}
        title="Run the repository and engineering verification workflow"
        disabled={!onOpenVerify}>
        <ShieldCheck size={18} aria-hidden="true"/><span>VERIFY USV-01</span>
      </button>
      <button type="button" className={`ns3-action ${isAiAssistantOpen?'ns3-action--active':''}`}
        onClick={onToggleAiAssistant} aria-pressed={isAiAssistantOpen}
        title="Toggle Gemini Engineering Assistant panel">
        <BrainCircuit size={18} aria-hidden="true"/><span className="ns3-action-label">Engineering AI</span>
      </button>
      <details className="ns3-menu" ref={menu}
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); menu.current?.removeAttribute('open'); menu.current?.querySelector('summary')?.focus(); } }}>
        <summary className="ns3-action" aria-label="More application actions" title="More application actions">
          <MoreHorizontal size={20} aria-hidden="true"/><span className="ns3-action-label">More</span>
        </summary>
        <div className="ns3-menu-items">
          <button type="button" onClick={() => action(onOpenNewRecord)}><Plus size={17}/>New engineering record</button>
          <button type="button" onClick={() => action(onOpenExportImport)}><Download size={17}/>Backup / Import JSON</button>
          <button type="button" onClick={() => action(onOpenContextGuide)}><HelpCircle size={17}/>Project context guide</button>
          <button type="button" className="ns3-danger" onClick={() => action(onResetDemo)}><RotateCcw size={17}/>Reset illustrative demo</button>
        </div>
      </details>
      {currentUser ? <div className="ns3-account" title={`${currentUser.userName} · ${currentUser.role}`}>
        <UserRound size={17} aria-hidden="true"/><span>{currentUser.userName}</span>
        <button type="button" className="ns3-icon-button" onClick={onLogout}
          aria-label="Sign out" title="Sign out"><LogOut size={17}/></button>
      </div> : <>
        <span className="ns3-status-pill" title="Read-only without staff authentication">Read-only</span>
        <button type="button" className="ns3-action" onClick={onOpenLogin}><LogIn size={17}/>Sign in</button>
      </>}
    </div>
  </header>;
};
