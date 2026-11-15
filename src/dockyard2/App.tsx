import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowUpRight, Bot, Box, ChevronRight, ClipboardList,
  Compass, FileSearch, LayoutDashboard, LockKeyhole, LogIn, LogOut,
  Menu, Search, ShieldCheck, X
} from 'lucide-react';
import { DOCKYARD_AREAS } from '../studio/dockyardAreas';
import { MODULE_REGISTRY } from '../moduleRegistry';
import { login, logout } from '../core/auth/authClient';
import { DesignScreen } from './DesignScreen';
import { AnalysisScreen, AgentsScreen, DirectorScreen, EvidenceScreen } from './Screens';
import { legacyModuleUrl, searchLoaded, type WorkArea } from './domain';
import { useSnapshot } from './useSnapshot';

const areas:{id:WorkArea;label:string;icon:React.ComponentType<{size?:number}>}[]=[
  {id:'design',label:'Design',icon:Box},
  {id:'analysis',label:'Analysis',icon:Activity},
  {id:'agents',label:'Agents',icon:Bot},
  {id:'director',label:'Director',icon:LayoutDashboard},
  {id:'evidence',label:'Evidence',icon:ShieldCheck}
];
function areaFromHash():WorkArea {
  if(typeof window==='undefined')return 'design';
  const key=window.location.hash.replace(/^#/,'');
  return areas.some(a=>a.id===key)?key as WorkArea:'design';
}
const statusText={
  illustrative:'Illustrative local registers',
  loading:'Loading authenticated records',
  connected:'Server records loaded · signed-in session',
  unavailable:'Server records unavailable · sample shown'
} as const;

export default function DockyardApp() {
  const {snapshot,status,user,error}=useSnapshot();
  const [area,setArea]=useState<WorkArea>(areaFromHash);
  const [large,setLarge]=useState(false);
  const [query,setQuery]=useState('');
  const [userId,setUserId]=useState('');
  const [passphrase,setPassphrase]=useState('');
  const [authError,setAuthError]=useState('');
  const [authBusy,setAuthBusy]=useState(false);
  const searchDialog=useRef<HTMLDialogElement>(null);
  const moduleDialog=useRef<HTMLDialogElement>(null);
  const loginDialog=useRef<HTMLDialogElement>(null);
  const searchTrigger=useRef<HTMLButtonElement>(null);
  const main=useRef<HTMLElement>(null);
  const hits=useMemo(()=>searchLoaded(query,snapshot),[query,snapshot]);

  const navigate=(next:WorkArea)=>{
    setArea(next);
    if(typeof window!=='undefined')window.history.replaceState(null,'','#'+next);
    requestAnimationFrame(()=>main.current?.focus());
  };
  useEffect(()=>{
    const onHash=()=>setArea(areaFromHash());
    const key=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();setQuery('');searchDialog.current?.showModal();
      }
    };
    window.addEventListener('hashchange',onHash);
    window.addEventListener('keydown',key);
    return()=>{window.removeEventListener('hashchange',onHash);window.removeEventListener('keydown',key);};
  },[]);
  const openSearch=()=>{setQuery('');searchDialog.current?.showModal();};
  const signIn=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(authBusy)return;
    setAuthBusy(true);setAuthError('');
    try{
      await login(userId.trim(),passphrase);
      setPassphrase('');loginDialog.current?.close();
    }catch(e){setAuthError(e instanceof Error?e.message:'Login unsuccessful. Check your credentials.');}
    finally{setAuthBusy(false);}
  };
  const sourceLabel=status==='connected'?'Server records':'Illustrative records';
  const areaLabel=areas.find(a=>a.id===area)?.label||'Design';
  return <div className={'d2-app'+(large?' d2-large':'')}>
    <header className="d2-topbar">
      <a className="d2-brand" href="/dockyard2.html#design" onClick={e=>{e.preventDefault();navigate('design');}}>
        <span className="d2-brandmark" aria-hidden="true"><Compass size={22}/></span>
        <span><strong>DOCKYARD <em>2.0</em></strong><small>NAVAL STUDIO · USV-01</small></span>
      </a>
      <div className="d2-top-actions">
        <button ref={searchTrigger} className="d2-top-button" type="button" onClick={openSearch}
          aria-keyshortcuts="Control+K Meta+K"><Search size={18}/> <span>Find anything</span> <kbd>⌘K</kbd></button>
        <button className="d2-top-button" type="button" onClick={()=>moduleDialog.current?.showModal()}>
          <Menu size={18}/> <span>All 24 modules</span>
        </button>
        <button className="d2-top-button" type="button" aria-pressed={large}
          onClick={()=>setLarge(x=>!x)} title="Toggle enlarged interface text">Text {large?'Large':'Normal'}</button>
        {user?<div className="d2-user">
          <span title={user.role}>{user.userName}</span>
          <button type="button" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={18}/></button>
        </div>:<button className="d2-top-button d2-signin" type="button" onClick={()=>loginDialog.current?.showModal()}>
          <LogIn size={18}/> Sign in
        </button>}
      </div>
    </header>
    <div className="d2-layout">
      <nav className="d2-rail" aria-label="Main engineering workspaces">
        <span className="d2-rail-header">WORK</span>
        {areas.map(a=>{const Icon=a.icon;return <button key={a.id} type="button"
          className="d2-rail-item" onClick={()=>navigate(a.id)}
          aria-current={area===a.id?'page':undefined} title={a.label}>
          <Icon size={22} aria-hidden="true"/><span>{a.label}</span>
        </button>;})}
        <span className="d2-rail-footer">24 modules<br/>1 engineering thread</span>
      </nav>
      <div className="d2-work">
        <div className="d2-context" role="status">
          <div><span>PROJECT</span><strong>USV-01</strong></div>
          <div><span>WORKSPACE</span><strong>{areaLabel}</strong></div>
          <div><span>CONFIGURATION</span><strong>Unassigned</strong></div>
          <div className={'d2-source'+(status==='connected'?' d2-source-live':'')}>
            {status==='connected'?<ShieldCheck size={17}/>:<LockKeyhole size={17}/>}
            <span>{statusText[status]}</span>
          </div>
        </div>
        {status==='unavailable'&&<div role="alert" className="d2-error" style={{margin:'13px 20px 0'}}>
          {error} The interface has reverted to visibly marked illustrative records; no engineering release should rely on them.
        </div>}
        <main ref={main} className="d2-workspace" tabIndex={-1} id="d2-main">
          {area==='design'&&<DesignScreen snapshot={snapshot} sourceLabel={sourceLabel}/>}
          {area==='analysis'&&<AnalysisScreen snapshot={snapshot} sourceLabel={sourceLabel}/>}
          {area==='agents'&&<AgentsScreen snapshot={snapshot} sourceLabel={sourceLabel}/>}
          {area==='director'&&<DirectorScreen snapshot={snapshot} sourceLabel={sourceLabel}/>}
          {area==='evidence'&&<EvidenceScreen snapshot={snapshot} sourceLabel={sourceLabel}/>}
        </main>
      </div>
    </div>
    <nav className="d2-mobilebar" aria-label="Mobile workspaces">
      {areas.map(a=>{const Icon=a.icon;return <button type="button" key={a.id}
        aria-current={area===a.id?'page':undefined} onClick={()=>navigate(a.id)}>
        <Icon size={21}/><span>{a.label}</span></button>;})}
    </nav>
    <dialog ref={searchDialog} className="d2-dialog" aria-label="Find loaded engineering records and modules"
      onClose={()=>searchTrigger.current?.focus()}>
      <div className="d2-dialog-head"><h2>Find records & modules</h2>
        <button type="button" aria-label="Close search" onClick={()=>searchDialog.current?.close()}><X size={20}/></button></div>
      <div className="d2-search-input"><Search size={20}/><input type="search" autoFocus
        aria-label="Search loaded engineering records and modules"
        value={query} onChange={e=>setQuery(e.target.value)}
        placeholder="Try hydrodynamics, risks, propulsion, REQ…"/></div>
      <p className="d2-dialog-hint">Searches this session's loaded records and the 24 registered modules. Results open their original governed workspace, not a particular row.</p>
      <div className="d2-search-results">
        {hits.length===0&&<p className="d2-empty">No matching records or modules. Try another engineering term.</p>}
        {hits.map(hit=><a key={hit.key} className="d2-search-hit" href={legacyModuleUrl(hit.module)}>
          <span className="d2-hit-icon">{hit.kind==='Module'?<Box size={19}/>:<FileSearch size={19}/>}</span>
          <span><strong>{hit.title}</strong><small>{hit.kind} · {hit.subtitle}{hit.illustrative||status!=='connected'?' · Illustrative/sample source':''}</small></span>
          <ArrowUpRight size={18} aria-hidden="true"/>
        </a>)}
      </div>
    </dialog>
    <dialog ref={moduleDialog} className="d2-dialog d2-catalog" aria-label="Full engineering module catalogue">
      <div className="d2-dialog-head"><h2>Engineering module catalogue</h2>
        <button type="button" aria-label="Close module catalogue" onClick={()=>moduleDialog.current?.close()}><X size={20}/></button></div>
      <p className="d2-dialog-hint">All 24 original modules remain accessible with their existing data, tools and approval controls. Open a module in the original workbench.</p>
      <div className="d2-catalog-areas">
        {DOCKYARD_AREAS.map(a=><section key={a.id}>
          <h3>{a.label}</h3>
          {a.modules.map(id=>{const module=MODULE_REGISTRY.find(m=>m.id===id)!;
            return <a href={legacyModuleUrl(id)} key={id}>
              {module.label}<ChevronRight size={16} aria-hidden="true"/>
            </a>;
          })}
        </section>)}
      </div>
      <a href="/" className="d2-button d2-original-link">Open original Naval Studio <ArrowUpRight size={17}/></a>
    </dialog>
    <dialog ref={loginDialog} className="d2-dialog d2-login" aria-label="Staff sign-in">
      <div className="d2-dialog-head"><h2>Engineering staff sign-in</h2>
        <button type="button" aria-label="Close sign-in" onClick={()=>loginDialog.current?.close()}><X size={20}/></button></div>
      <form onSubmit={e=>{void signIn(e);}} className="d2-authform">
        <p>Uses the existing Naval Studio identity service. Read-only Dockyard pages never authorize engineering release.</p>
        <label htmlFor="d2-userid">Staff user ID</label>
        <input id="d2-userid" autoComplete="username" required value={userId}
          onChange={e=>setUserId(e.target.value)}/>
        <label htmlFor="d2-passphrase">Passphrase</label>
        <input id="d2-passphrase" type="password" autoComplete="current-password" required
          value={passphrase} onChange={e=>setPassphrase(e.target.value)}/>
        {authError&&<p role="alert" className="d2-error">{authError}</p>}
        <button type="submit" className="d2-button d2-button-primary" disabled={authBusy}>
          {authBusy?'Authenticating…':'Authenticate'}
        </button>
      </form>
    </dialog>
  </div>;
}
