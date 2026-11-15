import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,BookOpen,ChevronDown,Command,Compass,FileSearch,FlaskConical,LayoutGrid,LockKeyhole,LogIn,LogOut,Search,ShieldCheck,X} from 'lucide-react';
import {MODULE_GROUPS,MODULE_REGISTRY} from '../moduleRegistry';
import {login,logout} from '../core/auth/authClient';
import {useSnapshot} from '../dockyard2/useSnapshot';
import {Studio} from './Studio';
import {AgentsRoom,EvidenceRoom,LibraryRoom,PhysicsRoom} from './Rooms';
import {labSearch,legacyRoute,ROOMS,roomFromHash,type Room} from './model';

export default function AtlasLab(){
 const {snapshot,status,user,error}=useSnapshot();
 const [room,setRoom]=useState<Room>(()=>typeof window==='undefined'?'studio':roomFromHash(window.location.hash));
 const [query,setQuery]=useState('');
 const [staffId,setStaffId]=useState('');
 const [passphrase,setPassphrase]=useState('');
 const [loginError,setLoginError]=useState('');
 const [loginBusy,setLoginBusy]=useState(false);
 const searchRef=useRef<HTMLDialogElement>(null);
 const directoryRef=useRef<HTMLDialogElement>(null);
 const loginRef=useRef<HTMLDialogElement>(null);
 const searchInput=useRef<HTMLInputElement>(null);
 const searchTrigger=useRef<HTMLButtonElement>(null);
 const directoryTrigger=useRef<HTMLButtonElement>(null);
 const main=useRef<HTMLElement>(null);
 const hits=useMemo(()=>labSearch(snapshot,query),[snapshot,query]);
 const sourceLabel=status==='connected'?'Server records':'Illustrative records';
 const changeRoom=(next:Room)=>{
   if(typeof window!=='undefined')window.history.pushState(null,'','#'+next);
   setRoom(next);
   requestAnimationFrame(()=>main.current?.focus());
 };
 useEffect(()=>{
  const update=()=>setRoom(roomFromHash(window.location.hash));
  const hotkey=(e:KeyboardEvent)=>{
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
    e.preventDefault();setQuery('');searchRef.current?.showModal();
   }
  };
  window.addEventListener('popstate',update);
  window.addEventListener('hashchange',update);
  window.addEventListener('keydown',hotkey);
  return()=>{
   window.removeEventListener('popstate',update);
   window.removeEventListener('hashchange',update);
   window.removeEventListener('keydown',hotkey);
  };
 },[]);
 const onLogin=async(e:React.FormEvent)=>{
  e.preventDefault();if(loginBusy)return;
  setLoginBusy(true);setLoginError('');
  try{await login(staffId.trim(),passphrase);setPassphrase('');loginRef.current?.close();}
  catch(err){setLoginError(err instanceof Error?err.message:'Sign-in could not be completed.');}
  finally{setLoginBusy(false);}
 };
 return <div className="at-app">
   <a className="at-skip" href="#at-main">Skip to workspace</a>
   <header className="at-global-header">
    <a href="/atlas.html#studio" className="at-brand" onClick={e=>{if(window.location.pathname.endsWith('atlas.html')){e.preventDefault();changeRoom('studio')}}}>
     <span className="at-logo" aria-hidden="true"><Compass size={23}/></span>
     <span><strong>Naval AI Lab</strong><small>ATLAS / ENGINEERING WORKSPACE</small></span>
    </a>
    <nav className="at-global-nav" aria-label="Lab workspaces">
      {ROOMS.map(r=><button type="button" key={r.id} aria-current={room===r.id?'page':undefined}
       onClick={()=>changeRoom(r.id)}><span className="at-nav-wide">{r.label}</span><span className="at-nav-narrow">{r.id==='studio'?'Vessel':r.id==='agents'?'Agents':r.label}</span></button>)}
    </nav>
    <div className="at-header-tools">
      <button type="button" className="at-search-button" ref={searchTrigger}
       aria-label="Search engineering records and workspaces" aria-keyshortcuts="Control+K Meta+K"
       onClick={()=>{setQuery('');searchRef.current?.showModal();}}><Search size={17}/><span>Find anything</span><kbd>⌘K</kbd></button>
      <button type="button" ref={directoryTrigger} className="at-directory-button"
       onClick={()=>directoryRef.current?.showModal()}><LayoutGrid size={17}/><span>24 modules</span></button>
      {user?<div className="at-auth"><span title={user.role}>{user.userName}</span><button type="button" aria-label="Sign out" onClick={logout}><LogOut size={17}/></button></div>:
      <button type="button" className="at-login-button" onClick={()=>loginRef.current?.showModal()}><LogIn size={16}/> Sign in</button>}
    </div>
   </header>
   <div className="at-contextbar">
    <div className="at-project-identity"><span>Project</span><strong>USV-01</strong><span className="at-context-divider"/>
      <span>{ROOMS.find(r=>r.id===room)?.hint}</span></div>
    <div className="at-project-state"><span className="at-not-authorized"><LockKeyhole size={14}/> No approved vessel baseline</span>
      <span className="at-source-indicator">{status==='connected'?'Authenticated engineering snapshot':
       status==='loading'?'Loading authenticated records':
       status==='unavailable'?'Server unavailable — sample data shown':'Sample register · not live'}</span></div>
   </div>
   {status==='unavailable'&&<p role="alert" className="at-data-alert">{error} Illustrative data is displayed instead; no loaded data is certified.</p>}
   <main id="at-main" className="at-main" ref={main} tabIndex={-1}>
    {room==='studio'&&<Studio snapshot={snapshot} sourceLabel={sourceLabel} onNavigate={changeRoom}/>}
    {room==='physics'&&<PhysicsRoom snapshot={snapshot} sourceLabel={sourceLabel}/>}
    {room==='evidence'&&<EvidenceRoom snapshot={snapshot} sourceLabel={sourceLabel}/>}
    {room==='agents'&&<AgentsRoom snapshot={snapshot} sourceLabel={sourceLabel}/>}
    {room==='library'&&<LibraryRoom snapshot={snapshot} sourceLabel={sourceLabel}/>}
   </main>
   <footer className="at-footer"><span>Naval AI Lab / Atlas — working UI, not engineering authority</span>
     <a href="/legacy.html">Protected engineering workbench <ArrowUpRight size={13}/></a></footer>
   <dialog ref={searchRef} className="at-search-dialog" aria-label="Global engineering search"
     onClose={()=>searchTrigger.current?.focus()}
     onToggle={e=>{if((e.target as HTMLDialogElement).open)requestAnimationFrame(()=>searchInput.current?.focus());}}>
     <header><h2>Find anything</h2><button type="button" aria-label="Close search" onClick={()=>searchRef.current?.close()}><X size={20}/></button></header>
     <label className="at-search-field"><Search size={19}/><input type="search" value={query} ref={searchInput}
      onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();searchRef.current?.close();}}}
      placeholder="Requirement, simulation or engineering module"
      aria-label="Search the loaded engineering records"/></label>
     <p>Searches current records and every existing governed module. Results open the protected editor.</p>
     <div className="at-results">
      {hits.length===0?<p>No matching records in this session.</p>:
       hits.map(hit=><a key={hit.id} href={legacyRoute(hit.module)}>
        <FileSearch size={18}/><span><strong>{hit.title}</strong><small>{hit.detail}{status!=='connected'?' · illustrative context':''}</small></span><ArrowUpRight size={15}/>
       </a>)}
     </div>
   </dialog>
   <dialog ref={directoryRef} className="at-directory-dialog" aria-label="All engineering modules" onClose={()=>directoryTrigger.current?.focus()}>
    <header><div><h2>Engineering directory</h2><p>All 24 preserved workspaces</p></div><button type="button" onClick={()=>directoryRef.current?.close()} aria-label="Close engineering directory"><X size={20}/></button></header>
    <div className="at-directory-groups">
     {MODULE_GROUPS.map(group=><section key={group}><h3>{group}</h3>
      {MODULE_REGISTRY.filter(module=>module.group===group).map(module=>
       <a href={legacyRoute(module.id)} key={module.id}>{module.label}<ArrowUpRight size={14}/></a>)}
     </section>)}
    </div>
   </dialog>
   <dialog ref={loginRef} className="at-login-dialog" aria-label="Naval AI Lab staff authentication">
    <header><h2>Staff sign in</h2><button type="button" aria-label="Close sign in" onClick={()=>loginRef.current?.close()}><X size={20}/></button></header>
    <form onSubmit={e=>{void onLogin(e)}}>
      <p>Authenticate with the existing USV-01 identity service to inspect server records. This Atlas interface is read-only.</p>
      <label htmlFor="at-staff">Staff user ID</label><input id="at-staff" required autoComplete="username" value={staffId} onChange={e=>setStaffId(e.target.value)}/>
      <label htmlFor="at-passphrase">Passphrase</label><input id="at-passphrase" type="password" required autoComplete="current-password" value={passphrase} onChange={e=>setPassphrase(e.target.value)}/>
      {loginError&&<p className="at-login-error" role="alert">{loginError}</p>}
      <button type="submit" disabled={loginBusy}>{loginBusy?'Authenticating…':'Sign in securely'}</button>
    </form>
   </dialog>
 </div>;
}
