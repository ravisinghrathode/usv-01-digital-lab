import React,{useState} from 'react';
import {Activity,ArrowRight,ArrowUpRight,BookOpen,Box,CalendarRange,CheckCircle2,ChevronRight,ClipboardList,FileCheck2,FileText,FlaskConical,GitBranch,Layers3,LockKeyhole,Network,Plus,RefreshCw,Search,ShieldAlert,ShieldCheck,SlidersHorizontal,Workflow,X} from 'lucide-react';
import type {Snapshot} from '../dockyard2/domain';
import {legacyModuleUrl} from '../dockyard2/domain';
import {VesselVisual} from './VesselVisual';
import {INVESTIGATION,type Mode} from './model';

/**
 * Session-first coordination UI. This is a presentation of the authenticated
 * engineering registers, not a new authority, source of truth or session API.
 * Local investigation drafts are never represented as server records.
 */
type Dock='tasks'|'parameters'|'evidence'|'issues'|'history';
interface Props{
 demoMode:boolean;
 snapshot:Snapshot;
 changeMode:(mode:Mode)=>void;
 onRefresh:()=>void;
}
const stages:{label:string;mode:Mode;detail:string}[]=[
 {label:'Define',mode:'worktable',detail:'Scope the investigation'},
 {label:'Design',mode:'design',detail:'Inspect design alternatives'},
 {label:'Analyze',mode:'experiment',detail:'Review scientific evidence'},
 {label:'Review',mode:'decide',detail:'Check evidence and uncertainty'},
 {label:'Decide',mode:'decide',detail:'Record a governed decision'},
 {label:'Notebook',mode:'notebook',detail:'Capture working notes'}
];
const dockLabels:{id:Dock;label:string;Icon:typeof ClipboardList}[]=[
 {id:'tasks',label:'Tasks',Icon:ClipboardList},
 {id:'parameters',label:'Parameters',Icon:SlidersHorizontal},
 {id:'evidence',label:'Evidence',Icon:FileCheck2},
 {id:'issues',label:'Issues',Icon:ShieldAlert},
 {id:'history',label:'Change history',Icon:GitBranch}
];
const proposedTasks=[
 'Establish source-owned principal dimensions and operating conditions',
 'Assess hydrostatics, stability and seakeeping requirements',
 'Define launch and recovery interface loads',
 'Confirm acoustic payload, thermal and condensation constraints'
];
const sourceOnly=<T extends {isIllustrative:boolean}>(items:T[])=>items.filter(row=>row.isIllustrative===false);

export function SessionDesk({demoMode,snapshot,changeMode,onRefresh}:Props){
 const [dock,setDock]=useState<Dock>('tasks');
 const [draftOpen,setDraftOpen]=useState(false);
 const [draftTitle,setDraftTitle]=useState('');
 const [draftObjective,setDraftObjective]=useState('');
 const [localDraft,setLocalDraft]=useState<{title:string;objective:string}|null>(null);
 const [query,setQuery]=useState('');
 const [variant,setVariant]=useState<'reference'|'candidate'>('reference');
 const reqs=demoMode?[]:sourceOnly(snapshot.requirements);
 const risks=demoMode?[]:sourceOnly(snapshot.risks);
 const decisions=demoMode?[]:sourceOnly(snapshot.decisions);
 const simulations=demoMode?[]:sourceOnly(snapshot.simulations);
 const plans=demoMode?[]:sourceOnly(snapshot.plans);
 const tests=demoMode?[]:sourceOnly(snapshot.tests);
 const activeTitle=localDraft?localDraft.title:demoMode?INVESTIGATION.title:'USV-01 · Engineering investigation';
 const objective=localDraft?localDraft.objective:demoMode?
  'Explore hull alternatives and identify the engineering evidence needed for a defensible design decision.':
  'Review source-backed engineering records, identify gaps, and initiate controlled design and verification work.';
 const list=(
  dock==='evidence'?simulations.map(r=>({id:r.id,title:r.name,detail:r.runStatus,href:legacyModuleUrl('simulations')})).concat(
   tests.map(r=>({id:r.id,title:'Verification test '+r.id,detail:r.resultStatus,href:legacyModuleUrl('workstream-VNV')}))):
  dock==='issues'?risks.map(r=>({id:r.id,title:r.description,detail:r.status,href:legacyModuleUrl('risks-decisions')})):
  dock==='history'?decisions.map(r=>({id:r.id,title:r.title,detail:r.approvalState,href:legacyModuleUrl('risks-decisions')})):[]);
 const matched=list.filter(item=>(item.id+' '+item.title+' '+item.detail).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <section className="ux-session-desk" aria-label="Engineering Sessions command centre">
  <header className="ux-desk-heading">
   <div className="ux-desk-heading-title"><span className="ux-square-icon"><Network size={22}/></span><div>
    <p>USV-01 / ENGINEERING WORKBENCH</p><h1>{activeTitle}</h1>
    <span>{localDraft?'Unsaved local investigation draft':demoMode?'Illustrative engineering session':'Authenticated project register view · not a certified baseline'}</span>
   </div></div>
   <span className="ux-state-warning"><ShieldAlert size={15}/> UNVERIFIED {localDraft?'DRAFT':'WORKSPACE'}</span>
  </header>
  <div className="ux-process" aria-label="Engineering workflow stages">
   {stages.map((stage,index)=><button type="button" key={stage.label} onClick={()=>changeMode(stage.mode)}
     title={stage.detail} aria-label={stage.label+': '+stage.detail} className={index===0?'ux-stage-current':''}>
     <span className="ux-stage-node">{index===0?<span/>:null}</span><strong>{stage.label}</strong>
   </button>)}
  </div>
  <div className="ux-work-grid">
   <aside className="ux-card ux-session-list" aria-label="Session navigator">
    <div className="ux-card-title"><h2><CalendarRange size={17}/> Engineering Sessions</h2><span>PROJECT</span></div>
    <button className="ux-primary ux-new-session" type="button" onClick={()=>setDraftOpen(true)}><Plus size={17}/> New session draft</button>
    <p className="ux-sidebar-note">Drafts here are local and unsaved until a governed session service is connected.</p>
    <div className="ux-list-group">Active workspace</div>
    <div className="ux-session-entry ux-selected-entry" aria-current="true"><Box size={19}/>
     <div><strong>{activeTitle}</strong><small>{demoMode?'EXAMPLE · No approved model':localDraft?'LOCAL DRAFT · Not saved':'PROJECT SOURCE VIEW'}</small></div>
     <ChevronRight size={15}/></div>
    <div className="ux-list-group">Navigate current investigation</div>
    {([
     {mode:'worktable' as Mode,label:'Session worktable',Icon:Network},
     {mode:'design' as Mode,label:'Design comparison',Icon:Box},
     {mode:'experiment' as Mode,label:'Experiments',Icon:FlaskConical},
     {mode:'decide' as Mode,label:'Evidence & decisions',Icon:ShieldCheck},
     {mode:'notebook' as Mode,label:'Notebook',Icon:BookOpen}
    ]).map(item=><button className="ux-sidebar-link" type="button" key={item.mode} onClick={()=>changeMode(item.mode)}><item.Icon size={16}/>{item.label}<ArrowRight size={14}/></button>)}
    <div className="ux-list-group">Engineering source</div>
    <a className="ux-sidebar-link" href={legacyModuleUrl('overview')}><LockKeyhole size={16}/> Governed project store <ArrowUpRight size={14}/></a>
   </aside>
   <div className="ux-main-column">
    <div className="ux-overview-pair">
     <article className="ux-card ux-objective">
      <div className="ux-card-title"><h2><Layers3 size={17}/> Engineering objective</h2></div>
      <p>{objective}</p>
      <span className="ux-eyebrow">CONFIGURATION CONTEXT</span>
      <dl>
       <div><dt>Project</dt><dd>PRJ-USV-01</dd></div>
       <div><dt>Candidate</dt><dd>{demoMode?'A / B (example)':'Not established'}</dd></div>
       <div><dt>Revision</dt><dd>{demoMode?'Placeholder only':'Not established'}</dd></div>
       <div><dt>Authority</dt><dd>Human review required</dd></div>
      </dl>
      <button type="button" className="ux-inline-action" onClick={()=>changeMode('design')}>Inspect configurations <ArrowRight size={15}/></button>
     </article>
     <article className="ux-card ux-model-panel">
      <div className="ux-card-title"><h2><Box size={17}/> Linked vessel study</h2><span>CONCEPT ONLY</span></div>
      <div className="ux-model-stage"><div className="ux-model-topline"><span>ILLUSTRATIVE ART / NOT CAD OR PHYSICS EVIDENCE</span></div>
       <VesselVisual variant={variant} caption={false}/>
       <div className="ux-model-options" role="group" aria-label="Concept image selection">
        <button type="button" aria-pressed={variant==='reference'} onClick={()=>setVariant('reference')}>Reference image</button>
        <button type="button" aria-pressed={variant==='candidate'} onClick={()=>setVariant('candidate')}>Alternative image</button>
       </div>
      </div>
      <footer><span>No verified geometry is linked to this preview.</span><a className="ux-primary" href="/legacy.html?module=cad-studio&amp;origin=engineering-sessions"><Box size={15}/> Open in CAD Studio <ArrowUpRight size={15}/></a></footer>
     </article>
    </div>
    <div className="ux-mini-grid">
     <article className="ux-card"><div className="ux-card-title"><h2><Workflow size={17}/> Assigned agents</h2></div>
      <p>Agent work and qualification must be obtained from the authoritative orchestration service.</p>
      <a className="ux-inline-action" href={legacyModuleUrl('agent-orchestrator')}>Open 26-agent directorate <ArrowUpRight size={14}/></a>
     </article>
     <article className="ux-card"><div className="ux-card-title"><h2><ShieldCheck size={17}/> Engineering decisions</h2><span>{decisions.length} source records</span></div>
      {decisions.length?<p>{decisions[0].title} · {decisions[0].approvalState}</p>:<p>{demoMode?'Illustrative discussion; no approval exists.':'No source-backed decisions available.'}</p>}
      <a className="ux-inline-action" href={legacyModuleUrl('risks-decisions')}>Open decision register <ArrowUpRight size={14}/></a>
     </article>
     <article className="ux-card"><div className="ux-card-title"><h2><Activity size={17}/> Studies & checks</h2><span>{simulations.length} source runs</span></div>
      <p>{simulations.length?'Source-backed studies are registered; validation remains a separate gate.':'No real solver result has been connected to this session view.'}</p>
      <button type="button" className="ux-inline-action" onClick={()=>changeMode('experiment')}>Review studies <ArrowRight size={14}/></button>
     </article>
    </div>
   </div>
   <aside className="ux-card ux-traceability" aria-label="Engineering traceability">
    <div className="ux-card-title"><h2><ShieldCheck size={17}/> Traceability</h2></div>
    <div className="ux-trace-section"><div><strong>Requirements</strong><a href={legacyModuleUrl('traceability')}>View register <ArrowUpRight size={13}/></a></div>
     {reqs.length?reqs.slice(0,5).map(r=><a key={r.id} href={legacyModuleUrl('traceability')} className="ux-trace-row"><span>{r.id}</span><strong>{r.title}</strong><em>{r.status}</em></a>):
      <p>{demoMode?'Example requirements are not evidence.':'No authenticated, non-illustrative requirements available.'}</p>}
    </div>
    <div className="ux-trace-section"><div><strong>Evidence coverage</strong><a href={legacyModuleUrl('workstream-VNV')}>View evidence <ArrowUpRight size={13}/></a></div>
     <p>{simulations.length} registered simulation runs · {plans.length} verification plans · {tests.length} tests.</p>
     <small>Record counts do not constitute verification or acceptance.</small>
    </div>
    <div className="ux-trace-section"><div><strong>Open risks</strong><a href={legacyModuleUrl('risks-decisions')}>View risks <ArrowUpRight size={13}/></a></div>
     {risks.length?risks.slice(0,3).map(r=><p key={r.id}><span>{r.id}</span> {r.description}</p>):<p>No source-backed risk records available in this view.</p>}
    </div>
    <div className="ux-trace-guard"><LockKeyhole size={16}/> Design, independent review, and human approval remain separate.</div>
    <button type="button" className="ux-refresh" onClick={onRefresh}><RefreshCw size={15}/> Refresh authenticated registers</button>
   </aside>
  </div>
  <section className="ux-card ux-dock" aria-label="Engineering activity dock">
   <div className="ux-dock-top"><h2><Activity size={17}/> Engineering activity dock</h2><div className="ux-dock-tabs" role="tablist" aria-label="Engineering dock view">
    {dockLabels.map(({id,label,Icon})=><button type="button" key={id} role="tab" aria-selected={dock===id} onClick={()=>{setDock(id);setQuery('')}}><Icon size={15}/>{label}</button>)}
   </div></div>
   {(dock==='evidence'||dock==='issues'||dock==='history')&&<label className="ux-dock-search"><Search size={15}/><input type="search" aria-label={'Filter '+dock} placeholder={'Filter '+dock+' records'} value={query} onChange={e=>setQuery(e.target.value)}/></label>}
   <div className="ux-dock-content" role="tabpanel">
    {dock==='tasks'?<>{proposedTasks.map((title,index)=><div className="ux-dock-record" key={title}><span className="ux-record-number">0{index+1}</span><strong>{title}</strong><span>PROPOSED · NOT DISPATCHED</span><button type="button" onClick={()=>changeMode(index===1?'experiment':index===2?'decide':'design')}>Investigate <ArrowRight size={13}/></button></div>)}</>:
    dock==='parameters'?<div className="ux-dock-empty"><SlidersHorizontal size={19}/><span>Authoritative parameter values are not provided by this snapshot. No TBD value is inferred from the concept image.</span><a href={legacyModuleUrl('workstream-NAV')}>Open naval architecture register <ArrowUpRight size={14}/></a></div>:
    matched.length?matched.slice(0,8).map(r=><div className="ux-dock-record" key={r.id}><span className="ux-record-number">{r.id}</span><strong>{r.title}</strong><span>{r.detail}</span><a href={r.href}>Open source <ArrowUpRight size={13}/></a></div>):
    <div className="ux-dock-empty"><FileText size={19}/> No matching, source-backed records in this view.</div>}
   </div>
  </section>
  {draftOpen&&<div className="ux-dialog-backdrop" role="presentation">
   <div className="ux-draft-dialog" role="dialog" aria-modal="true" aria-labelledby="ux-draft-title">
    <header><h2 id="ux-draft-title">Create a local session draft</h2><button type="button" aria-label="Close new session draft" onClick={()=>setDraftOpen(false)}><X size={19}/></button></header>
    <p>Until an authoritative session backend is connected, this draft exists only on this page. It is not saved, assigned, approved, or dispatched.</p>
    <form onSubmit={e=>{e.preventDefault();if(draftTitle.trim()&&draftObjective.trim()){setLocalDraft({title:draftTitle.trim(),objective:draftObjective.trim()});setDraftOpen(false);}}}>
     <label>Session title<input autoFocus required maxLength={120} value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder="Define the engineering question"/></label>
     <label>Engineering objective<textarea required rows={4} maxLength={1000} value={draftObjective} onChange={e=>setDraftObjective(e.target.value)} placeholder="Define scope, success criteria and required evidence"/></label>
     <div><button type="button" onClick={()=>setDraftOpen(false)}>Cancel</button><button type="submit" className="ux-primary">Use local draft <ArrowRight size={15}/></button></div>
    </form>
   </div></div>}
  </section>;
}
