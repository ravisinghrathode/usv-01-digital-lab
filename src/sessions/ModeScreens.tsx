import React, {useState} from 'react';
import {ArrowRight,ArrowUpRight,BookOpen,Box,Check,ChevronRight,ClipboardList,FileQuestion,FlaskConical,GitCompareArrows,Lightbulb,LockKeyhole,Network,PanelRightOpen,Play,Plus,Search,ShieldAlert,ShieldCheck,SlidersHorizontal,Sparkles} from 'lucide-react';
import {ConceptVessel} from './ConceptVessel';
import {ENTITIES,INVESTIGATION,STUDIES,currentEntity,currentStudy,isComparisonReady,legacyLink,type EntityId,type Mode,type Note,type SessionView,type StudyId,type Perspective} from './model';

type Props={
 session:SessionView;
 changeMode:(mode:Mode)=>void;
 select:(id:EntityId)=>void;
 chooseStudy:(id:StudyId)=>void;
 setPerspective:(value:Perspective,forCandidate?:boolean)=>void;
 toggleSync:()=>void;
 toggleIsolate:()=>void;
 addNote:(content:string)=>void;
 prepareTask:()=>void;
};
const entity=(id:EntityId)=>ENTITIES.find(x=>x.id===id)!;
function TextLink({module,children}:{module:Parameters<typeof legacyLink>[0];children:React.ReactNode}){
 return <a className="es-deep-link" href={legacyLink(module)}>{children}<ArrowUpRight size={15}/></a>;
}
function ExampleNotice(){return <span className="es-example-flag">SYNTHETIC EXAMPLE · NO APPROVED CAD OR SOLVER DATA</span>}
function ObjectButton({id,onSelect,kind='node'}:{id:EntityId;onSelect:(id:EntityId)=>void;kind?:'node'|'mini'}){
 const item=entity(id);
 return <button type="button" className={'es-object es-object-'+kind} onClick={()=>onSelect(id)} title={'Inspect '+item.title}>
   <span className="es-object-kicker">{item.type}</span>
   <strong>{item.title}</strong><small>{item.subtitle}</small>
   <span className="es-object-status">{item.status}<ChevronRight size={13}/></span>
 </button>;
}
export function Worktable({session,changeMode,select}:Props){
 return <section className="es-screen es-worktable" aria-label="Connected investigation worktable">
  <div className="es-screen-header">
   <div><span className="es-eyebrow">01 / CONNECTED WORKTABLE</span><h2>Explore the question, not the modules.</h2><p>One investigation holds its configurations, experiments, requirements and unresolved questions together.</p></div>
   <button type="button" className="es-secondary" onClick={()=>changeMode('design')}><GitCompareArrows size={17}/> Compare designs <ArrowRight size={15}/></button>
  </div>
  <div className="es-workspace">
   <div className="es-spatial-layer" aria-hidden="true">
    <svg viewBox="0 0 1000 520" preserveAspectRatio="none"><path d="M175 118C350 120 330 190 445 215M825 118C680 118 690 190 555 215M175 406C360 405 360 330 445 285M827 406C688 409 695 332 555 285" stroke="#8db5c3" strokeWidth="1.6" fill="none" strokeDasharray="6 7"/></svg>
   </div>
   <div className="es-space-left">
    <ObjectButton id="reference" onSelect={select}/>
    <ObjectButton id="req-mass" onSelect={select}/>
   </div>
   <div className="es-space-center">
    <div className="es-vessel-display">
     <div className="es-model-label"><span>SELECTED INVESTIGATION / USV-01</span><span>Concept illustration only</span></div>
     <ConceptVessel variant="reference"/>
     <div className="es-display-actions"><button type="button" onClick={()=>select('reference')}><Box size={15}/> Inspect concept</button><button type="button" onClick={()=>changeMode('design')}><GitCompareArrows size={15}/> Compare</button></div>
    </div>
    <span className="es-center-caption">Design artifacts are connected by a question and source relationships—not visual proximity alone.</span>
   </div>
   <div className="es-space-right">
    <ObjectButton id="candidate" onSelect={select}/>
    <ObjectButton id="mass-study" onSelect={select}/>
   </div>
  </div>
  <div className="es-context-trail">
   <span><Lightbulb size={18}/> Key unresolved question</span>
   <button type="button" onClick={()=>select('uncertainty')}>Can a mass reduction be demonstrated under comparable, reviewed loading and stability conditions? <ArrowUpRight size={15}/></button>
   <button type="button" className="es-tertiary" onClick={()=>changeMode('decide')}>Explore evidence <ArrowRight size={15}/></button>
  </div>
  <div className="es-object-strip" aria-label="Investigation linked objects">
   <span className="es-strip-title"><Network size={16}/> Linked objects</span>
   {(['operating','stability-study','req-stability','uncertainty'] as EntityId[]).map(id=><ObjectButton key={id} id={id} onSelect={select} kind="mini"/>)}
  </div>
 </section>;
}

export function Design({session,changeMode,select,setPerspective,toggleSync,toggleIsolate}:Props){
 const check=isComparisonReady('reference','candidate','operating');
 return <section className="es-screen es-design" aria-label="Design comparison worktable">
  <div className="es-screen-header">
   <div><span className="es-eyebrow">02 / PRODUCT COMPARISON</span><h2>Two concepts. One set of assumptions.</h2><p>Compare visual arrangement first; numerical differences remain blocked until reviewed geometry and conditions exist.</p></div>
   <TextLink module="cad-studio">Governed CAD Studio</TextLink>
  </div>
  <div className="es-compare-toolbar">
   <div className="es-control-group" role="group" aria-label="Reference model projection">
    <span>Projection</span>
    <button type="button" aria-pressed={session.perspective==='iso'} onClick={()=>setPerspective('iso')}>Isometric</button>
    <button type="button" aria-pressed={session.perspective==='plan'} onClick={()=>setPerspective('plan')}>Plan</button>
   </div>
   <button type="button" aria-pressed={session.cameraSync} className="es-switch" onClick={toggleSync}><Network size={16}/> {session.cameraSync?'Synchronized views':'Independent views'}</button>
   <button type="button" aria-pressed={session.isolate} className="es-switch" onClick={toggleIsolate}><SlidersHorizontal size={16}/> {session.isolate?'Highlight on':'Highlight hulls'}</button>
  </div>
  <div className="es-pair">
   {(['reference','candidate'] as const).map((id,i)=><article className="es-model-frame" key={id}>
     <header><div><span className="es-model-tag">{i===0?'A / REFERENCE':'B / EXPLORATORY'}</span><strong>{entity(id).title}</strong></div><span>Source required</span></header>
     <div className="es-model-stage"><ConceptVessel variant={id} perspective={id==='candidate'&&!session.cameraSync?session.candidatePerspective:session.perspective} isolate={session.isolate}/></div>
     <footer><button type="button" onClick={()=>select(id)}><PanelRightOpen size={16}/> Inspect source status</button>
       {id==='candidate'&&!session.cameraSync&&<button type="button" onClick={()=>setPerspective(session.candidatePerspective==='iso'?'plan':'iso',true)}>Toggle B projection</button>}
       <span>{id==='reference'?'Placeholder / Rev A':'Placeholder / Rev B'}</span>
     </footer>
   </article>)}
  </div>
  <div className="es-comparison-integrity" role="status"><ShieldAlert size={20}/>
    <div><strong>Numerical comparison unavailable</strong><p>{check.reason} No mass, CG, GM, resistance or other performance difference is established by these drawings.</p></div>
    <button type="button" onClick={()=>changeMode('experiment')}>View required studies <ArrowRight size={16}/></button>
  </div>
  <div className="es-compare-footer"><button type="button" onClick={()=>select('operating')}>Operating assumptions <ArrowUpRight size={14}/></button><button type="button" onClick={()=>select('req-stability')}>Stability criteria <ArrowUpRight size={14}/></button><TextLink module="workstream-MEC">Structural workstream</TextLink></div>
 </section>;
}

export function Experiment({session,select,chooseStudy,changeMode}:Props){
 const study=currentStudy(session.study);
 return <section className="es-screen es-experiment" aria-label="Source-aware simulation theatre">
  <div className="es-screen-header">
   <div><span className="es-eyebrow">03 / PHYSICS INVESTIGATION</span><h2>See the evidence—or exactly what's missing.</h2><p>Scientific visualization appears only when reproducible, source-backed output exists.</p></div><TextLink module="simulations">Simulation Centre</TextLink>
  </div>
  <div className="es-theatre">
   <aside className="es-study-selector" aria-label="Simulation case selection">
    <div className="es-study-heading"><FlaskConical size={18}/><span>Study cases</span></div>
    {STUDIES.map(s=><button type="button" key={s.id} aria-pressed={session.study===s.id} onClick={()=>chooseStudy(s.id)}>
      <small>{s.discipline}</small><strong>{s.title}</strong><span><i/> Source required</span>
    </button>)}
    <div className="es-study-notice">Demo case descriptions only. No solver is launched here.</div>
   </aside>
   <div className="es-result-shell">
    <div className="es-result-bar"><strong>{study.title}</strong><span>NOT REVIEWED · NO RESULT FILE</span></div>
    <div className="es-result-canvas">
      <div className="es-result-grid" aria-hidden="true"/>
      <div className="es-missing-result">
       <span className="es-missing-emblem"><FlaskConical size={32}/></span>
       <h3>Source-backed result required</h3>
       <p>No reviewed solver output, time series, mesh field or validated plot is attached to this demonstration study.</p>
       <div className="es-missing-actions"><button type="button" onClick={()=>select(study.id)}>Inspect study inputs</button><a href={legacyLink('simulations')}>Open real study register <ArrowUpRight size={15}/></a></div>
      </div>
      <span className="es-result-axes">VISUALIZATION DISABLED · SOURCE MISSING</span>
    </div>
    <div className="es-result-metadata" aria-label="Selected experiment provenance">
     <div><span>Geometry</span><strong>{study.revision}</strong></div>
     <div><span>Conditions</span><strong>{study.conditions}</strong></div>
     <div><span>Validation</span><strong>Not reviewed</strong></div>
    </div>
   </div>
  </div>
  <div className="es-bottom-ribbon"><span><LockKeyhole size={16}/> Comparative plots, timelines and playback require actual validated data.</span><button type="button" onClick={()=>changeMode('decide')}>Inspect blockers <ArrowRight size={16}/></button></div>
 </section>;
}

const ARGUMENTS:{id:EntityId;tag:string;relation:string}[]=[
 {id:'req-mass',tag:'CONSTRAINT',relation:'Required · source missing'},
 {id:'req-stability',tag:'CONSTRAINT',relation:'Required · source missing'},
 {id:'candidate',tag:'DESIGN CLAIM',relation:'Alternative · unverified'},
 {id:'mass-study',tag:'EVIDENCE',relation:'No reviewed output'},
 {id:'stability-study',tag:'EVIDENCE',relation:'No reviewed output'},
 {id:'uncertainty',tag:'CONTRADICTION / GAP',relation:'Comparability not established'},
 {id:'review',tag:'INDEPENDENT REVIEW',relation:'Not performed'}
];
export function Decide({session,select,changeMode,prepareTask}:Props){
 return <section className="es-screen es-decide" aria-label="Evidence decision review">
  <div className="es-screen-header"><div><span className="es-eyebrow">04 / ENGINEERING DECISION</span><h2>Make uncertainty impossible to overlook.</h2><p>Every claim must lead to its source, limitations and independent review record.</p></div>
   <TextLink module="traceability">Full traceability</TextLink></div>
  <div className="es-decision-layout">
   <div className="es-argument">
    <div className="es-argument-question"><span>QUESTION UNDER REVIEW</span><strong>{INVESTIGATION.title}</strong><small>Conclusion: not established</small></div>
    <div className="es-argument-stream">
     {ARGUMENTS.map(a=><button type="button" key={a.id} className={'es-argument-node'+(a.id==='uncertainty'?' es-argument-alert':'')} onClick={()=>select(a.id)}>
      <span className="es-argument-kind">{a.tag}</span><strong>{entity(a.id).title}</strong><small>{a.relation}</small><ChevronRight size={15}/></button>)}
    </div>
    <div className="es-argument-end"><LockKeyhole size={21}/><div><strong>No authorized recommendation</strong><p>Missing technical evidence and independent review prevent a defensible release decision.</p></div></div>
   </div>
   <aside className="es-review-docket"><header><ShieldAlert size={20}/><h3>Review blockers</h3></header>
    <ol><li>Controlled reference and candidate geometries not attached.</li>
      <li>Comparable mass and stability calculations unavailable.</li>
      <li>Applicable mission constraints and assumptions unreviewed.</li>
      <li>Independent reviewer record missing.</li>
    </ol>
    <div className="es-gate-state"><span>HUMAN AUTHORITY</span><strong>Not requested · not approved</strong><p>The prototype cannot approve, sign or release engineering configurations.</p></div>
    <button type="button" className="es-primary" onClick={prepareTask}>Draft next verification task <ArrowRight size={16}/></button>
    <TextLink module="orchestrator-approvals">Open protected approvals</TextLink>
   </aside>
  </div>
 </section>;
}
export function Notebook({session,addNote,prepareTask}:Props){
 const [draft,setDraft]=useState('');
 const submit=(e:React.FormEvent)=>{e.preventDefault();if(!draft.trim())return;addNote(draft.trim());setDraft('');};
 return <section className="es-screen es-notebook" aria-label="Versioned engineering notebook concept">
  <div className="es-screen-header"><div><span className="es-eyebrow">05 / DIGITAL ENGINEERING THREAD</span><h2>A recoverable record of every engineering question.</h2><p>Draft observations remain local to this preview. Nothing here becomes an approved engineering record.</p></div><TextLink module="knowledge-centre">Knowledge Centre</TextLink></div>
  <div className="es-notebook-layout">
   <div className="es-notebook-paper">
    <div className="es-notebook-title"><BookOpen size={24}/><div><h3>Investigation journal</h3><span>{INVESTIGATION.id} · EXAMPLE ONLY</span></div></div>
    <ol className="es-timeline">
     <li><span>01</span><div><strong>Question established</strong><p>{INVESTIGATION.title}</p><small>Illustrative investigation setup</small></div></li>
     <li><span>02</span><div><strong>Concept comparison requested</strong><p>Reference and candidate concept drawings exist only as explanatory artwork. Approved source revisions remain missing.</p><small>No engineering calculation executed</small></div></li>
     <li><span>03</span><div><strong>Evidence gap identified</strong><p>Mass/CG, stability and structural outputs are required before any design recommendation.</p><small>Review not performed</small></div></li>
     {session.notes.map(note=><li key={note.id}><span>✎</span><div><strong>{note.kind==='task'?'Verification task draft':'Local observation'}</strong><p>{note.content}</p><small>Session only · {note.created} · not submitted</small></div></li>)}
    </ol>
    <form className="es-note-form" onSubmit={submit}><label htmlFor="es-note">Add an observation to this preview</label><textarea id="es-note" rows={3} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Record an engineering question or next investigation step (local draft only)"/><button type="submit" className="es-primary" disabled={!draft.trim()}><Plus size={16}/> Add local observation</button></form>
   </div>
   <aside className="es-notebook-sidebar"><h3>Source of truth</h3><p>This interactive concept does not persist notes, execute an agent or write to engineering records.</p><TextLink module="knowledge-centre">Open source knowledge centre</TextLink><TextLink module="agent-orchestrator">Open governed agent orchestrator</TextLink>
    <div className="es-side-rule"/><h3>Next verification step</h3><p>Establish approved reference geometry and operating assumptions before selecting physical comparison cases.</p><button type="button" className="es-secondary" onClick={prepareTask}>Prepare verification draft</button>
   </aside>
  </div>
 </section>;
}
