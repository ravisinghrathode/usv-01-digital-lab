import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowUpRight, Bot, Box, ChevronRight, Compass, FileSearch,
  LibraryBig, LockKeyhole, LogIn, LogOut, Menu, Search, ShieldCheck, X
} from 'lucide-react';
import { MODULE_REGISTRY } from '../moduleRegistry';
import { DOCKYARD_AREAS } from '../studio/dockyardAreas';
import { login, logout } from '../core/auth/authClient';
import { legacyRootRedirect } from '../dockyard2/domain';
import { useSnapshot } from '../dockyard2/useSnapshot';
import { AgentsPage, EvidencePage, LabOverview, ProductsPage, SimulationsPage } from './LabPages';
import { LAB_SECTIONS, moduleLink, parseLabSection, searchLab, type LabSection, type ProductFacetId } from './navigation';

const ICONS:Record<LabSection,React.ComponentType<{size?:number}>>={
  lab:Compass,products:Box,simulations:Activity,agents:Bot,evidence:ShieldCheck
};

export default function NavalAiLabApp(){
  const {snapshot,status,user,error}=useSnapshot();
  const [section,setSection]=useState<LabSection>(()=>typeof window==='undefined'?'lab':parseLabSection(window.location.hash));
  const [facet,setFacet]=useState<ProductFacetId>('vessel');
  const [large,setLarge]=useState(false);
  const [query,setQuery]=useState('');
  const [staffId,setStaffId]=useState('');
  const [passphrase,setPassphrase]=useState('');
  const [loginBusy,setLoginBusy]=useState(false);
  const [loginError,setLoginError]=useState('');
  const catalogDialog=useRef<HTMLDialogElement>(null);
  const catalogTrigger=useRef<HTMLButtonElement>(null);
  const searchDialog=useRef<HTMLDialogElement>(null);
  const loginDialog=useRef<HTMLDialogElement>(null);
  const firstSearch=useRef<HTMLInputElement>(null);
  const searchButton=useRef<HTMLButtonElement>(null);
  const mainRef=useRef<HTMLElement>(null);
  const hits=useMemo(()=>searchLab(query,snapshot),[query,snapshot]);
  const sourceLabel=status==='connected'?'Server records':'Illustrative records';
  const current=LAB_SECTIONS.find(s=>s.id===section)??LAB_SECTIONS[0];

  const navigate=(to:LabSection)=>{
    if(typeof window!=='undefined')window.history.pushState(null,'','#'+to);
    setSection(to);
    if(catalogDialog.current?.open)catalogDialog.current.close();
    requestAnimationFrame(()=>mainRef.current?.focus());
  };
  useEffect(()=>{
    const sync=()=>setSection(parseLabSection(window.location.hash));
    const keys=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();setQuery('');searchDialog.current?.showModal();
      }
    };
    window.addEventListener('hashchange',sync);
    window.addEventListener('popstate',sync);
    window.addEventListener('keydown',keys);
    return()=>{
      window.removeEventListener('hashchange',sync);
      window.removeEventListener('popstate',sync);
      window.removeEventListener('keydown',keys);
    };
  },[]);
  useEffect(()=>{
    if(window.location.pathname==='/'||window.location.pathname==='/index.html'){
      const legacy=legacyRootRedirect(window.location.search);
      if(legacy)window.location.replace(legacy);
    }
  },[]);
  const openSearch=()=>{setQuery('');searchDialog.current?.showModal();};
  const authenticate=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(loginBusy)return;
    setLoginBusy(true);setLoginError('');
    try{
      await login(staffId.trim(),passphrase);
      setPassphrase('');loginDialog.current?.close();
    }catch(err){setLoginError(err instanceof Error?err.message:'Could not sign in.');}
    finally{setLoginBusy(false);}
  };

  return <div className={'nl-app'+(large?' nl-large':'')}>
    <a className="nl-skip" href="#nl-main">Skip to lab work area</a>
    <header className="nl-topbar">
      <a className="nl-brand" href="/naval-lab.html#lab" onClick={e=>{
        if(window.location.pathname.endsWith('naval-lab.html')){e.preventDefault();navigate('lab');}
      }}>
        <span className="nl-brand-symbol" aria-hidden="true"><Compass size={24}/></span>
        <span className="nl-brand-type"><strong>Naval AI Lab</strong><small>USV-01 / DESIGN ENGINEERING</small></span>
      </a>
      <div className="nl-topbar-actions">
        <button type="button" ref={searchButton} className="nl-search-trigger" onClick={openSearch}
          aria-label="Search records and modules" aria-keyshortcuts="Control+K Meta+K">
          <Search size={17}/><span>Search the lab</span><kbd>⌘ K</kbd>
        </button>
        <button type="button" ref={catalogTrigger} className="nl-header-action" onClick={()=>catalogDialog.current?.showModal()}
          aria-haspopup="dialog" aria-controls="nl-module-catalog" title="Browse all engineering modules">
          <Menu size={19}/><span>All modules</span>
        </button>
        <button type="button" className="nl-header-action nl-type-toggle"
          onClick={()=>setLarge(v=>!v)} aria-pressed={large}
          title="Toggle larger interface text">Aa <span>{large?'Large':'Text'}</span></button>
        {user?<div className="nl-auth-indicator">
          <span title={user.role}>{user.userName}</span>
          <button type="button" aria-label="Sign out" onClick={()=>{void logout();}} title="Sign out"><LogOut size={18}/></button>
        </div>:<button type="button" className="nl-signin" onClick={()=>loginDialog.current?.showModal()}>
          <LogIn size={17}/><span>Staff sign in</span>
        </button>}
      </div>
    </header>
    <div className="nl-frame">
      <nav className="nl-sidebar" aria-label="Naval laboratory workspaces">
        <div className="nl-sidebar-section-label">WORKSPACES</div>
        {LAB_SECTIONS.map(item=>{const Icon=ICONS[item.id];return <button type="button" key={item.id}
          className="nl-side-link" onClick={()=>navigate(item.id)} aria-current={section===item.id?'page':undefined}>
          <Icon size={20} aria-hidden="true"/><span>{item.label}</span>{section===item.id&&<span className="nl-selected-marker" aria-hidden="true"/>}
        </button>;})}
        <div className="nl-sidebar-divider"/>
        <div className="nl-sidebar-section-label">DIRECT ACCESS</div>
        <a className="nl-side-utility" href={moduleLink('cad-studio')}><Box size={18}/> CAD studio <ArrowUpRight size={14}/></a>
        <a className="nl-side-utility" href={moduleLink('generative-optimizer')}><Activity size={18}/> Optimizer <ArrowUpRight size={14}/></a>
        <a className="nl-side-utility" href={moduleLink('global-usv-fleet')}><LibraryBig size={18}/> Reference fleet <ArrowUpRight size={14}/></a>
        <a className="nl-side-utility" href={moduleLink('risks-decisions')}><ShieldCheck size={18}/> Decision ledger <ArrowUpRight size={14}/></a>
        <div className="nl-sidebar-bottom">
          <strong>Working design environment</strong>
          <p>Controlled source, independent review and human approval remain separate.</p>
          <a href="/legacy.html">Open engineering editor <ArrowUpRight size={13}/></a>
        </div>
      </nav>
      <div className="nl-mainstack">
        <div className="nl-contextbar">
          <div className="nl-crumb"><span>USV-01</span><ChevronRight size={14}/><strong>{current.label}</strong>
            <span className="nl-crumb-caption">{current.description}</span></div>
          <div className="nl-source-meta"><LockKeyhole size={15}/>
            <span>{status==='connected'?'Signed-in server snapshot':status==='loading'?'Loading records':status==='unavailable'?'Unavailable · samples shown':'Illustrative records · not live'}</span></div>
        </div>
        {status==='unavailable'&&<div className="nl-data-error" role="alert">
          {error} The application is displaying labelled illustrative records, not verified project data.
        </div>}
        <main className="nl-main" id="nl-main" ref={mainRef} tabIndex={-1}>
          {section==='lab'&&<LabOverview snapshot={snapshot} sourceLabel={sourceLabel}
            facet={facet} onFacetChange={setFacet} onNavigate={navigate}/>}
          {section==='products'&&<ProductsPage snapshot={snapshot} sourceLabel={sourceLabel}
            facet={facet} onFacetChange={setFacet}/>}
          {section==='simulations'&&<SimulationsPage snapshot={snapshot} sourceLabel={sourceLabel}/>}
          {section==='agents'&&<AgentsPage snapshot={snapshot} sourceLabel={sourceLabel}/>}
          {section==='evidence'&&<EvidencePage snapshot={snapshot} sourceLabel={sourceLabel}/>}
        </main>
        <footer className="nl-footer"><span>Naval AI Lab · Working engineering environment</span>
          <span>Protected actions remain in the existing workbench</span></footer>
      </div>
    </div>
    <nav className="nl-mobile-nav" aria-label="Mobile workspaces">
      {LAB_SECTIONS.map(item=>{const Icon=ICONS[item.id];return <button type="button" key={item.id}
        onClick={()=>navigate(item.id)} aria-current={section===item.id?'page':undefined}>
        <Icon size={20}/><span>{item.label}</span></button>;})}
    </nav>

    <dialog ref={catalogDialog} id="nl-module-catalog" aria-label="Engineering module catalogue" className="nl-catalog" onClose={()=>catalogTrigger.current?.focus()}>
        <div className="nl-catalog-header"><div><h2>All engineering modules</h2><p>24 existing governed workspaces, grouped by task</p></div>
          <button type="button" aria-label="Close catalogue" onClick={()=>catalogDialog.current?.close()}><X size={21}/></button></div>
        <div className="nl-catalog-groups">{DOCKYARD_AREAS.map(group=><section key={group.id}>
          <h3>{group.label}</h3>
          {group.modules.map(m=><a href={moduleLink(m)} key={m}>{MODULE_REGISTRY.find(x=>x.id===m)?.label}<ArrowUpRight size={15}/></a>)}
        </section>)}</div>
    </dialog>
    <dialog className="nl-search-dialog" ref={searchDialog} aria-label="Search the naval engineering lab"
      onClose={()=>searchButton.current?.focus()} onToggle={e=>{
        if((e.target as HTMLDialogElement).open)requestAnimationFrame(()=>firstSearch.current?.focus());
      }}>
      <div className="nl-dialog-heading"><h2>Search the lab</h2>
        <button type="button" aria-label="Close search" onClick={()=>searchDialog.current?.close()}><X size={20}/></button></div>
      <label className="nl-search-field"><Search size={20}/><input ref={firstSearch} value={query}
        onChange={e=>setQuery(e.target.value)} type="search"
        placeholder="Find a simulation, requirement, agent tool or module"
        aria-label="Search simulation, requirement, risk and module records"/></label>
      <p className="nl-dialog-note">Searches this session's loaded records and all 24 module routes. Results open the original protected workflow.</p>
      <div className="nl-search-hits">
        {hits.length===0&&<p>No matching records. Try another technical term.</p>}
        {hits.map(h=><a key={h.id} href={moduleLink(h.module)}>
          <FileSearch size={19}/><span><strong>{h.title}</strong>
            <small>{h.meta}{h.illustrative||status!=='connected'?' · Sample context':''}</small></span>
          <ArrowUpRight size={17}/>
        </a>)}
      </div>
    </dialog>
    <dialog className="nl-login-dialog" ref={loginDialog} aria-label="Naval AI Lab staff login">
      <div className="nl-dialog-heading"><h2>Engineering staff sign in</h2>
        <button type="button" aria-label="Close sign in" onClick={()=>loginDialog.current?.close()}><X size={20}/></button></div>
      <form className="nl-login-form" onSubmit={e=>{void authenticate(e);}}>
        <p>Use the existing USV-01 staff identity service. This interface remains read-only.</p>
        <label htmlFor="nl-username">Staff user ID</label>
        <input id="nl-username" required value={staffId} autoComplete="username" onChange={e=>setStaffId(e.target.value)}/>
        <label htmlFor="nl-password">Passphrase</label>
        <input id="nl-password" required type="password" value={passphrase} autoComplete="current-password" onChange={e=>setPassphrase(e.target.value)}/>
        {loginError&&<p className="nl-form-error" role="alert">{loginError}</p>}
        <button type="submit" className="nl-button nl-button-primary" disabled={loginBusy}>
          {loginBusy?'Authenticating…':'Sign in'}</button>
      </form>
    </dialog>
  </div>;
}
