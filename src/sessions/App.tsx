import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,BookOpen,Box,ChevronDown,Command,Compass,FileSearch,FlaskConical,GitCompareArrows,HelpCircle,Layers,LockKeyhole,Menu,Network,Search,ShieldCheck,X} from 'lucide-react';
import {Design,Decide,Experiment,Notebook,Worktable} from './v2/Modes';
import NavalMark from './NavalMark';
import {useSnapshot} from '../dockyard2/useSnapshot';
import {searchSourceRegister} from './sourceSearch';
import {DEFAULT_SESSION,ENTITIES,INVESTIGATION,MODES,STUDIES,currentEntity,hashForMode,legacyLink,searchItems,validMode,type EntityId,type Mode,type Note,type Perspective,type SessionView,type StudyId} from './model';

const ICONS:Record<Mode,React.ComponentType<{size?:number}>>={
 worktable:Network,design:Box,experiment:FlaskConical,decide:ShieldCheck,notebook:BookOpen
};
export default function EngineeringSessionsApp(){
 const {snapshot,status}=useSnapshot();
 const [session,setSession]=useState<SessionView>(()=>({...DEFAULT_SESSION,mode:typeof window==='undefined'?'worktable':validMode(window.location.hash.slice(1))}));
 const [trayOpen,setTrayOpen]=useState(false);
 const [search,setSearch]=useState('');
 const [helpOpen,setHelpOpen]=useState(false);
 const searchDialog=useRef<HTMLDialogElement>(null);
 const inspectorDialog=useRef<HTMLDialogElement>(null);
 const searchTrigger=useRef<HTMLButtonElement>(null);
 const searchField=useRef<HTMLInputElement>(null);
 const main=useRef<HTMLElement>(null);
 const results=useMemo(()=>[...searchItems(search),...searchSourceRegister(snapshot,search,status==='connected')].slice(0,75),[search,snapshot,status]);
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
 return <div className="es-app">
  <a href="#es-main" className="es-skip">Skip to investigation canvas</a>
  <header className="es-commandbar">
   <a className="es-brand" href="/sessions.html#worktable" onClick={e=>{e.preventDefault();setMode('worktable')}}><span className="es-logo"><NavalMark/></span><span><strong>NAVAL AI LAB <span className="es-brand-programme">/ USV-01</span></strong><small>Engineering session</small></span></a>
   <nav className="es-modes" aria-label="Engineering session modes">
    {MODES.map(m=>{const Icon=ICONS[m.id];return <button type="button" key={m.id} aria-current={session.mode===m.id?'page':undefined}
      onClick={()=>setMode(m.id)} title={m.name+' · Alt+'+m.key}><Icon size={17}/><span>{m.name}</span></button>})}
   </nav>
   <div className="es-global-actions">
    <button type="button" className="es-search-trigger" ref={searchTrigger} onClick={()=>{setSearch('');searchDialog.current?.showModal();}} aria-label="Search engineering records and modules"><Search size={19}/><span>Find anything</span><kbd>⌘ K</kbd></button>
    <button type="button" className="es-help-button" onClick={()=>setHelpOpen(v=>!v)} aria-expanded={helpOpen} aria-label="Toggle prototype help"><HelpCircle size={20}/></button>
    <a className="es-governed" href="/legacy.html" aria-label="Open original governed engineering lab" title="Open original governed engineering lab"><span>Original lab</span> <ArrowUpRight size={14}/></a>
   </div>
  </header>
  {helpOpen&&<aside className="es-help-popover"><strong>About this concept</strong><p>Use the five modes above or Alt+1–5. Choose an object to inspect it. Press Ctrl/Cmd+K to search. This is an interactive design demonstration with synthetic records—not a live, verified engineering session.</p><button type="button" onClick={()=>setHelpOpen(false)}>Close</button></aside>}
  <section className="es-session-spine" aria-label="Persistent engineering investigation context">
   <div className="es-question">
    <span className="es-context-id">{INVESTIGATION.id} / {INVESTIGATION.project}</span>
    <strong>{INVESTIGATION.title}</strong>
   </div>
   <div className="es-spine-context">
    <span><Box size={15}/> Placeholder revisions A + B</span>
    <span><FlaskConical size={15}/> {STUDIES.length} proposed studies</span>
    <span><LockKeyhole size={15}/> Not reviewed</span>
   </div>
  </section>
  <div className="es-truth-banner" role="note"><span className="es-truth-dot"/> <strong>INTERACTIVE UX PROTOTYPE</strong><span className="es-truth-long">All engineering objects are synthetic examples. No real USV-01 geometry, results or approvals are represented.</span><span className="es-truth-short">No approved CAD, results or decisions.</span><span className="es-library-status">Source register: {status==='connected'?'Authenticated records':status==='loading'?'Loading…':'Illustrative fallback'}</span></div>
  <main className="es-main" id="es-main" ref={main} tabIndex={-1}>
   {session.mode==='worktable'&&<Worktable {...props}/>}
   {session.mode==='design'&&<Design {...props}/>}
   {session.mode==='experiment'&&<Experiment {...props}/>}
   {session.mode==='decide'&&<Decide {...props}/>}
   {session.mode==='notebook'&&<Notebook {...props}/>}
  </main>
  <div className="es-session-tray">
   <button type="button" className="es-tray-toggle" aria-expanded={trayOpen} onClick={()=>setTrayOpen(v=>!v)}><Layers size={17}/> Session objects <span>{ENTITIES.length}</span><ChevronDown size={16}/></button>
   <div className="es-tray-preview"><button type="button" onClick={()=>select('reference')}>Reference</button><button type="button" onClick={()=>select('candidate')}>Candidate</button><button type="button" onClick={()=>{chooseStudy(session.study);setMode('experiment')}}>Study</button><button type="button" onClick={()=>setMode('decide')}>Review blockers</button></div>
   <span className="es-tray-safe">Session state only · no project writes</span>
  </div>
  {trayOpen&&<section className="es-tray-expanded" aria-label="All investigation objects">
    {ENTITIES.map(e=><button type="button" key={e.id} onClick={()=>{select(e.id);setTrayOpen(false);}}><strong>{e.title}</strong><span>{e.status}</span></button>)}
   </section>}
  <dialog ref={inspectorDialog} className="es-inspector" aria-label="Selected object context inspector"
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
   <div className="es-inspector-caveat">A demo object is not a linked source record. The button above opens the existing protected module, not a matching certified artifact.</div>
  </>}
  </dialog>
  <dialog ref={searchDialog} className="es-search-dialog" aria-label="Search the engineering lab" onClose={()=>searchTrigger.current?.focus()} onToggle={e=>{if((e.currentTarget as HTMLDialogElement).open)requestAnimationFrame(()=>searchField.current?.focus());}}>
   <header><h2>Find anything</h2><button type="button" aria-label="Close search" onClick={()=>searchDialog.current?.close()}><X size={20}/></button></header>
   <label className="es-search-field"><Search size={20}/><input type="search" ref={searchField} value={search} onChange={e=>setSearch(e.target.value)}
     onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();searchDialog.current?.close();}}} placeholder="Search a concept object or a protected engineering module" aria-label="Search demonstration objects and engineering modules"/></label>
   <p>Demonstration objects open the contextual inspector. Matching engineering register records are labelled by source state and open their protected register, not a certified case.</p>
   <div className="es-search-results">{results.length===0?<p>No matching example object or module.</p>:
     results.map(r=>r.id.startsWith('entity:')?
      <button type="button" key={r.id} onClick={()=>{select(r.id.slice(7) as EntityId);searchDialog.current?.close();}}><FileSearch size={17}/><span><strong>{r.title}</strong><small>{r.meta} · example</small></span><ArrowRight size={14}/></button>:
      <a key={r.id} href={legacyLink(r.module)}><FileSearch size={17}/><span><strong>{r.title}</strong><small>{r.meta}</small></span><ArrowUpRight size={14}/></a>)}
   </div>
  </dialog>
 </div>;
}
