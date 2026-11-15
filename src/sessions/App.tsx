import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowLeft,ArrowRight,ArrowUpRight,BookOpen,Bot,Box,CalendarRange,ChevronDown,Command,Compass,FileSearch,FlaskConical,GitCompareArrows,HelpCircle,Layers,LockKeyhole,Menu,Network,Search,ShieldCheck,SlidersHorizontal,X} from 'lucide-react';
import {Design,Decide,Experiment,Notebook,Worktable} from './v2/Modes';
import NavalMark from './NavalMark';
import LiveWorkspace from './LiveWorkspace';
import {SessionDesk,type LocalSessionDraft} from './SessionDesk';
import {useSnapshot} from '../dockyard2/useSnapshot';
import {searchSourceRegister} from './sourceSearch';
import {DEFAULT_SESSION,ENTITIES,INVESTIGATION,MODES,STUDIES,currentEntity,hashForMode,legacyLink,searchItems,validMode,type EntityId,type Mode,type Note,type Perspective,type SessionView,type StudyId} from './model';

declare const __USV_SOURCE_REVISION__:string;

const sourceHash=__USV_SOURCE_REVISION__;
const verifiedSourceHash=/^[0-9a-f]{40}$/.test(sourceHash);
const sourceUrl=verifiedSourceHash
 ? 'https://github.com/ravisinghrathode/usv-01-digital-lab/commit/'+sourceHash
 : 'https://github.com/ravisinghrathode/usv-01-digital-lab/tree/main';

const ICONS:Record<Mode,React.ComponentType<{size?:number}>>={
 worktable:Network,design:Box,experiment:FlaskConical,decide:ShieldCheck,notebook:BookOpen
};
export default function EngineeringSessionsApp(){
 const {snapshot,status,user,error,refresh}=useSnapshot();
 const [demoMode,setDemoMode]=useState(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('demo')==='1');
 const [session,setSession]=useState<SessionView>(()=>({...DEFAULT_SESSION,mode:typeof window==='undefined'?'worktable':validMode(window.location.hash.slice(1))}));
 const [trayOpen,setTrayOpen]=useState(false);
 const [localDraft,setLocalDraft]=useState<LocalSessionDraft|null>(null);
 const [search,setSearch]=useState('');
 const [helpOpen,setHelpOpen]=useState(false);
 const searchDialog=useRef<HTMLDialogElement>(null);
 const inspectorDialog=useRef<HTMLDialogElement>(null);
 const searchTrigger=useRef<HTMLButtonElement>(null);
 const searchField=useRef<HTMLInputElement>(null);
 const main=useRef<HTMLElement>(null);
 const results=useMemo(()=>[
  ...searchItems(search).filter(item=>demoMode||!item.id.startsWith('entity:')),
  ...(status==='connected'?searchSourceRegister(snapshot,search,true):[])
 ].slice(0,75),[search,snapshot,status,demoMode]);
 const selected=currentEntity(session.selected);
 useEffect(()=>{const dialog=inspectorDialog.current;if(!dialog)return;
  if(session.inspector&&selected){if(!dialog.open)dialog.showModal();}
  else if(dialog.open)dialog.close();
 },[session.inspector,session.selected]);
 const setMode=(mode:Mode)=>{
  setSession(old=>({...old,mode}));
  if(typeof window!=='undefined')window.history.pushState({mode},'',hashForMode(mode));
  requestAnimationFrame(()=>{main.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});});
 };
 useEffect(()=>{
  const sync=()=>setSession(old=>({...old,mode:validMode(window.location.hash.slice(1))}));
  const shortcuts=(e:KeyboardEvent)=>{
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){
    e.preventDefault();setSearch('');searchDialog.current?.showModal();
   }
   if(e.altKey&&!e.metaKey&&!e.ctrlKey&&/^[1-5]$/.test(e.key)&&!['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement)?.tagName||'')){
    e.preventDefault();const next=MODES[Number(e.key)-1];if(next){
      setSession(old=>({...old,mode:next.id}));
      window.history.pushState({mode:next.id},'',hashForMode(next.id));
      requestAnimationFrame(()=>{main.current?.focus({preventScroll:true});window.scrollTo(0,0);});
    }
   }
  };
  window.addEventListener('popstate',sync);
  window.addEventListener('hashchange',sync);
  window.addEventListener('keydown',shortcuts);
  return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync);window.removeEventListener('keydown',shortcuts)};
 },[]);
 const select=(id:EntityId)=>setSession(old=>({...old,selected:id,inspector:true}));
 const chooseStudy=(id:StudyId)=>setSession(old=>({...old,study:id,selected:id}));
 const setPerspective=(value:Perspective,forCandidate=false)=>setSession(old=>({...old,...(forCandidate?{candidatePerspective:value}:{perspective:value,candidatePerspective:old.cameraSync?value:old.candidatePerspective})}));
 const toggleSync=()=>setSession(old=>({...old,cameraSync:!old.cameraSync,candidatePerspective:old.cameraSync?old.candidatePerspective:old.perspective}));
 const toggleIsolate=()=>setSession(old=>({...old,isolate:!old.isolate}));
 const addNote=(content:string,kind:Note['kind']='local')=>setSession(old=>({...old,notes:[...old.notes,{id:Date.now()+old.notes.length,content,kind,created:new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}]}));
 const prepareTask=()=>{addNote('Establish reviewed geometry, explicit operating conditions and reproducible mass/stability calculations; request independent technical review before a recommendation.','task');setMode('notebook')};
 const props={session,changeMode:setMode,select,chooseStudy,setPerspective,toggleSync,toggleIsolate,addNote,prepareTask};
 return <div className={session.mode==='worktable'?'es-app ux-workbench-active':'es-app'}>
  <a href="#es-main" className="es-skip">Skip to investigation canvas</a>
  <header className="es-commandbar">
   <a className="es-brand" href="/#worktable" onClick={e=>{e.preventDefault();setMode('worktable')}}><span className="es-logo"><NavalMark/></span><span><strong>NAVAL AI LAB <span className="es-brand-programme">/ USV-01</span></strong><small>Engineering session</small></span></a>
   <nav className="es-modes" aria-label="Engineering session modes">
    {MODES.map(m=>{const Icon=ICONS[m.id];return <button type="button" key={m.id} aria-current={session.mode===m.id?'page':undefined}
      onClick={()=>setMode(m.id)} title={m.name+' · Alt+'+m.key}><Icon size={17}/><span>{m.name}</span></button>})}
   </nav>
   <div className="es-global-actions">
    <button type="button" className="es-demo-button" aria-pressed={demoMode} onClick={()=>{setDemoMode(v=>!v);setSession(old=>({...old,inspector:false}));}}>{demoMode?'Return to live project':'Example tour'}</button>
    <button type="button" className="es-search-trigger" ref={searchTrigger} onClick={()=>{setSearch('');searchDialog.current?.showModal();}} aria-label="Find anything ⌘ K"><Search size={19}/><span>Find anything</span><kbd>⌘ K</kbd></button>
    <button type="button" className="es-help-button" onClick={()=>setHelpOpen(v=>!v)} aria-expanded={helpOpen} aria-label="Toggle workspace help"><HelpCircle size={20}/></button>
    <a className="es-governed" href="/legacy.html" title="Open original governed engineering lab"><span>Original lab</span> <ArrowUpRight size={14}/></a>
   </div>
  </header>
  <nav className="ux-primary-nav" aria-label="Naval engineering workspaces">
   <button type="button" onClick={()=>setMode('worktable')} aria-current={session.mode==='worktable'?'page':undefined}><CalendarRange size={17}/> Engineering Sessions</button>
   <a href="/legacy.html?module=cad-studio&amp;origin=engineering-sessions"><Box size={17}/> CAD Studio</a>
   <a href={legacyLink('workstream-NAV')}><SlidersHorizontal size={17}/> Parameters</a>
   <button type="button" onClick={()=>setMode('experiment')} aria-current={session.mode==='experiment'?'page':undefined}><Activity size={17}/> Analysis</button>
   <a href={legacyLink('agent-orchestrator')}><Bot size={17}/> Agents</a>
   <button type="button" onClick={()=>setMode('decide')} aria-current={session.mode==='decide'?'page':undefined}><ShieldCheck size={17}/> Assurance</button>
  </nav>
  {helpOpen&&<aside className="es-help-popover"><strong>About this workspace</strong><p>Use five workspaces or Alt+1–5. The default uses the authenticated engineering store; records and permissions come from the server. Press Ctrl/Cmd+K to search the 24 governed modules. The optional example tour contains only synthetic data.</p><button type="button" onClick={()=>setHelpOpen(false)}>Close</button></aside>}
  <section className="es-session-spine" aria-label="Persistent engineering investigation context">
   <div className="es-question">
    <span className="es-context-id">{demoMode?INVESTIGATION.id:'PRJ-USV-01'} / USV-01</span>
    <strong>{localDraft?localDraft.title:demoMode?INVESTIGATION.title:'Authenticated engineering project · controlled source records'}</strong>
   </div>
   <div className="es-spine-context">
    {demoMode?<><span><Box size={15}/> Placeholder revisions A + B</span><span><FlaskConical size={15}/> {STUDIES.length} proposed studies</span><span><LockKeyhole size={15}/> Not reviewed</span></>:
     <><span><Box size={15}/> {status==='connected'?snapshot.simulations.filter(s=>!s.isIllustrative).length:'—'} registered studies</span><span><LockKeyhole size={15}/> Human approval required</span></>}
   </div>
  </section>
  {demoMode?<div className="es-truth-banner" role="note"><span className="es-truth-dot"/> <strong>EXAMPLE INVESTIGATION</strong><span className="es-truth-long">All investigation objects are synthetic. No real USV-01 geometry, results or approvals are represented.</span><span className="es-truth-short">No approved CAD, results or decisions.</span><span className="es-library-status">Explicit demonstration mode</span></div>:
   <div className="es-truth-banner es-truth-banner-live" role="note"><span className="es-truth-dot"/> <strong>{status==='connected'?'AUTHENTICATED PROJECT SOURCE':'PROJECT SIGN-IN REQUIRED'}</strong><span>Live register view · only non-illustrative engineering records are counted · no automatic certification or approval</span><span className="es-library-status">{user?'Staff: '+user.userName:'No signed-in staff session'}</span></div>}
  <main className="es-main" id="es-main" ref={main} tabIndex={-1}>
   {demoMode?<>
    {session.mode==='worktable'&&<SessionDesk demoMode draft={localDraft} onDraftChange={setLocalDraft} snapshot={snapshot} changeMode={setMode} onRefresh={refresh}/>}
    {session.mode==='design'&&<Design {...props}/>}
    {session.mode==='experiment'&&<Experiment {...props}/>}
    {session.mode==='decide'&&<Decide {...props}/>}
    {session.mode==='notebook'&&<Notebook {...props}/>}
   </>:session.mode==='worktable'&&user&&status==='connected'?<SessionDesk demoMode={false} draft={localDraft} onDraftChange={setLocalDraft} snapshot={snapshot} changeMode={setMode} onRefresh={refresh}/>:<LiveWorkspace mode={session.mode} snapshot={snapshot} status={status} error={error} user={user} onRefresh={refresh} changeMode={setMode}/>}
  </main>
  <div className="es-session-tray">
   {demoMode?<><button type="button" className="es-tray-toggle" aria-expanded={trayOpen} onClick={()=>setTrayOpen(v=>!v)}><Layers size={17}/> Session objects <span>{ENTITIES.length}</span><ChevronDown size={16}/></button>
   <div className="es-tray-preview"><button type="button" onClick={()=>select('reference')}>Reference</button><button type="button" onClick={()=>select('candidate')}>Candidate</button><button type="button" onClick={()=>{chooseStudy(session.study);setMode('experiment')}}>Study</button><button type="button" onClick={()=>setMode('decide')}>Review blockers</button></div></>:
   <div className="es-tray-preview"><span>Project source: {status==='connected'?'authenticated':'unavailable'} · edits are server-audited unverified drafts · no automatic approvals</span></div>}
   <span className="es-tray-safe"><a href={sourceUrl} target="_blank" rel="noreferrer" title="Source revision used to build this interface">GitHub source: {verifiedSourceHash?sourceHash.slice(0,8):'revision unverified'}</a></span>
  </div>
  {demoMode&&trayOpen&&<section className="es-tray-expanded" aria-label="All investigation objects">
    {ENTITIES.map(e=><button type="button" key={e.id} onClick={()=>{select(e.id);setTrayOpen(false);}}><strong>{e.title}</strong><span>{e.status}</span></button>)}
   </section>}
  {demoMode&&<dialog ref={inspectorDialog} className="es-inspector" aria-label="Selected object context inspector"
   onClose={()=>setSession(old=>({...old,inspector:false}))}>
  {selected&&<>
   <header><span>OBJECT CONTEXT / {selected.type.toUpperCase()}</span><button type="button" aria-label="Close context inspector" onClick={()=>inspectorDialog.current?.close()}><X size={20}/></button></header>
   <div className="es-inspector-subject"><span>SELECTED OBJECT</span><h2>{selected.title}</h2><p>{selected.subtitle}</p></div>
   <dl><div><dt>Source status</dt><dd>{selected.status}</dd></div><div><dt>Source identity</dt><dd>Demonstration-only</dd></div><div><dt>Review state</dt><dd>Not reviewed</dd></div><div><dt>Engineering authority</dt><dd>None</dd></div></dl>
   <h3>What this means</h3><p>{selected.description}</p>
   <div className="es-inspector-next"><a href={legacyLink(selected.module)} className="es-primary">Open governed register <ArrowUpRight size={16}/></a>
    {selected.type==='study'&&<button type="button" className="es-secondary" onClick={()=>{setSession(old=>({...old,study:selected.id as StudyId,inspector:false}));setMode('experiment')}}>Inspect proposed study <ArrowRight size={15}/></button>}
    {selected.type==='revision'&&<button type="button" className="es-secondary" onClick={()=>{setSession(old=>({...old,inspector:false}));setMode('design')}}>Open design comparison <ArrowRight size={15}/></button>}
   </div>
   <div className="es-inspector-caveat">An example object is not a linked source record. The button above opens the existing protected module, not a matching certified artifact.</div>
  </>}
  </dialog>}
  <dialog ref={searchDialog} className="es-search-dialog" aria-label="Search the engineering lab" onClose={()=>searchTrigger.current?.focus()} onToggle={e=>{if((e.currentTarget as HTMLDialogElement).open)requestAnimationFrame(()=>searchField.current?.focus());}}>
   <header><h2>Find anything</h2><button type="button" aria-label="Close search" onClick={()=>searchDialog.current?.close()}><X size={20}/></button></header>
   <label className="es-search-field"><Search size={20}/><input id="engineering-session-search" name="query" type="search" ref={searchField} value={search} onChange={e=>setSearch(e.target.value)}
     onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();searchDialog.current?.close();}}} placeholder="Search a concept object or a protected engineering module" aria-label="Search demonstration objects and engineering modules"/></label>
   <p>{demoMode?'Example objects open an inspector; project records open governed modules.':'Authenticated project records and all 24 governed modules are available here. Links do not approve or certify their target.'}</p>
   <div className="es-search-results">{results.length===0?<p>No matching example object or module.</p>:
     results.map(r=>r.id.startsWith('entity:')?
      <button type="button" key={r.id} onClick={()=>{select(r.id.slice(7) as EntityId);searchDialog.current?.close();}}><FileSearch size={17}/><span><strong>{r.title}</strong><small>{r.meta} · example</small></span><ArrowRight size={14}/></button>:
      <a key={r.id} href={legacyLink(r.module)}><FileSearch size={17}/><span><strong>{r.title}</strong><small>{r.meta}</small></span><ArrowUpRight size={14}/></a>)}
   </div>
  </dialog>
 </div>;
}
