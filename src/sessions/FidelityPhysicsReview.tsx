import React,{useState} from 'react';
import {Activity,ArrowRight,ArrowUpRight,BookOpen,Check,ChevronRight,ClipboardCheck,Clock3,Database,FileClock,FileQuestion,FileText,FlaskConical,GitBranch,Info,LockKeyhole,NotebookPen,Pause,Plus,Search,ShieldAlert,ShieldCheck,SlidersHorizontal,Target,TriangleAlert,Users,Waveform} from 'lucide-react';
import {VesselVisual} from './VesselVisual';
import {ContextTag,ObjectRow,SourceLink,SourceNotice,type SessionProps} from './FidelityCommon';
import {STUDIES,INVESTIGATION,currentStudy,type EntityId} from './model';

const CHANNELS=[
 {id:'hydro',name:'Hydrostatics',hint:'mass / CG'},
 {id:'waves',name:'Wave response',hint:'RAO / motions'},
 {id:'structure',name:'Structural loads',hint:'stress / fatigue'}
] as const;
export function Experiment({session,chooseStudy,select,changeMode}:SessionProps){
 const study=currentStudy(session.study);
 const [channel,setChannel]=useState<typeof CHANNELS[number]['id']>('hydro');
 const selectedChannel=CHANNELS.find(c=>c.id===channel)!;
 return <section className="vf-mode vf-experiment" aria-label="High-fidelity source-aware scientific experiment theatre">
  <div className="vf-page-title"><div><span className="vf-eyebrow"><FlaskConical size={15}/> EXPERIMENT / SCIENTIFIC VISUALIZATION</span>
    <h2>Physics investigation</h2><p>Examine applicable cases, input assumptions and what evidence must be produced.</p></div>
   <SourceLink module="simulations">Open source simulation centre</SourceLink>
  </div>
  <div className="vf-physics-workspace">
   <aside className="vf-physics-rail">
    <span className="vf-rail-caption">ENGINEERING QUESTION</span>
    <h3>Can vessel mass be reduced while preserving stability?</h3>
    <div className="vf-rail-divider"/>
    <span className="vf-rail-caption">PROPOSED STUDIES</span>
    <div className="vf-run-stack">
     {STUDIES.map((s,i)=><button type="button" key={s.id} aria-pressed={session.study===s.id} onClick={()=>chooseStudy(s.id)}>
       <span className="vf-run-number">0{i+1}</span><strong>{s.title}</strong><small>{s.discipline}</small><em>Source required</em>
      </button>)}
    </div>
    <div className="vf-physics-rail-footer"><Info size={15}/><span>Study titles are examples, not completed USV-01 jobs.</span></div>
   </aside>
   <div className="vf-physics-main">
    <div className="vf-physics-topline">
      <div className="vf-channel-tabs" role="group" aria-label="Required result channel">
       {CHANNELS.map(c=><button type="button" key={c.id} aria-pressed={channel===c.id} onClick={()=>setChannel(c.id)}>{c.name}</button>)}
      </div>
      <ContextTag tone="warning">NO VERIFIED RESULT</ContextTag>
    </div>
    <div className="vf-immersive-stage" aria-label="Conceptual vessel in scientific visualization stage">
     <div className="vf-scene-ocean" aria-hidden="true">
      <svg viewBox="0 0 1040 555" preserveAspectRatio="none">
       <defs>
         <linearGradient id="vf-sea-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#081d39"/><stop offset=".55" stopColor="#0b416d"/><stop offset="1" stopColor="#05253c"/></linearGradient>
         <pattern id="vf-ocean-grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" stroke="#5bb7db" strokeOpacity=".14" fill="none"/></pattern>
       </defs>
       <rect width="1040" height="555" fill="url(#vf-sea-gradient)"/>
       <rect width="1040" height="555" fill="url(#vf-ocean-grid)"/>
       {Array.from({length:13},(_,i)=><path key={i} d={'M -80 '+(110+i*35)+' C 210 '+(35+i*38)+' 395 '+(145+i*30)+' 670 '+(85+i*38)+' S 960 '+(78+i*33)+' 1130 '+(110+i*38)}
         fill="none" stroke="#75cde6" strokeOpacity={i%3===0?".22":".11"} strokeWidth={i%3===0?"1.6":"1"}/>)}
      </svg>
     </div>
     <div className="vf-scene-callout"><span>NOTIONAL VESSEL RENDER</span><strong>{study.discipline}</strong><small>Ocean background is decorative—not a CFD field.</small></div>
     <div className="vf-scene-product"><VesselVisual variant="candidate" caption={false}/></div>
     <div className="vf-stage-axis-legend"><span>SPATIAL / TEMPORAL OUTPUT</span><strong>NOT PROVIDED</strong></div>
     <div className="vf-stage-result-state" role="status"><span><FlaskConical size={17}/> SCIENTIFIC DATA GATE</span><strong>Source-backed result required</strong><small>There is no solver output to animate or plot for this proposed study.</small>
      <button type="button" onClick={()=>select(study.id)}>Inspect missing inputs <ArrowRight size={15}/></button>
     </div>
    </div>
    <div className="vf-stage-bottom-bar"><span><LockKeyhole size={15}/> Playback and field overlays disabled · no time-indexed data</span>
      <button type="button" onClick={()=>changeMode('decide')}>Inspect evidence blockers <ArrowRight size={15}/></button></div>
    <div className="vf-plot-shelf" aria-label="Scientific result channel availability">
     {[
      {name:'Mass & centre of gravity',unit:'kg / m',id:'mass-study'},
      {name:'Stability response',unit:'m / degrees',id:'stability-study'},
      {name:'Structural loading',unit:'N / Pa',id:'structural-study'}
     ].map((plot,i)=><button type="button" key={plot.id} className="vf-plot-slot" onClick={()=>select(plot.id as typeof session.study)}>
      <header><strong>{plot.name}</strong><small>{plot.unit}</small></header>
      <div className="vf-empty-plot"><svg viewBox="0 0 270 112" preserveAspectRatio="none" aria-hidden="true">
       <path d="M20 10V93H259" fill="none" stroke="#829cae" strokeWidth="1.2"/>
       {[38,63,88].map(y=><path key={y} d={'M21 '+y+'H259'} stroke="#e0e9ef" strokeDasharray="3 4"/>)}
       {[70,130,190,250].map(x=><path key={x} d={'M'+x+' 11V93'} stroke="#e0e9ef" strokeDasharray="3 4"/>)}
      </svg><span>Awaiting dataset</span></div>
     </button>)}
    </div>
   </div>
   <aside className="vf-physics-docket">
    <section><header><FlaskConical size={19}/><h3>Selected study</h3></header><strong>{study.title}</strong><p>{study.discipline} · example case</p></section>
    <section><header><SlidersHorizontal size={19}/><h3>Run conditions</h3></header>
     <dl>
      <div><dt>Geometry revision</dt><dd>Unassigned</dd></div>
      <div><dt>Operating condition</dt><dd>TBD</dd></div>
      <div><dt>Solver & version</dt><dd>Not recorded</dd></div>
      <div><dt>Mesh / convergence</dt><dd>Not established</dd></div>
     </dl>
    </section>
    <section><header><ShieldCheck size={19}/><h3>Verification</h3></header>
      <div className="vf-review-alert"><TriangleAlert size={17}/><span>Not reviewed<br/><small>No acceptance criteria checked</small></span></div>
    </section>
    <section><header><Database size={19}/><h3>Source provenance</h3></header>
     <dl>
      <div><dt>Input manifest</dt><dd>Missing</dd></div>
      <div><dt>Result artifact</dt><dd>Missing</dd></div>
      <div><dt>Peer review</dt><dd>Missing</dd></div>
     </dl><SourceLink module="simulations">Open governed study register</SourceLink>
    </section>
   </aside>
  </div>
 </section>;
}

const ARGUMENT_OBJECTS:[
 EntityId,EntityId,EntityId,EntityId
]=['req-mass','candidate','mass-study','uncertainty'];

export function Decide({session,select,changeMode,prepareTask}:SessionProps){
 const [view,setView]=useState<'argument'|'source'>('argument');
 return <section className="vf-mode vf-decision" aria-label="High-fidelity engineering evidence decision room">
  <div className="vf-page-title"><div><span className="vf-eyebrow"><ShieldCheck size={15}/> EVIDENCE / INDEPENDENT TECHNICAL REVIEW</span>
    <h2>Engineering decision room</h2><p>Evaluate the proposed lightweight vessel against source-backed constraints, contradictory evidence and review requirements.</p></div>
   <SourceLink module="orchestrator-approvals">Governed approval workflow</SourceLink>
  </div>
  <div className="vf-decision-workspace">
   <div className="vf-decision-canvas">
    <div className="vf-decision-toolbar"><span><GitBranch size={17}/> ENGINEERING ARGUMENT</span>
      <div className="vf-pills" role="group" aria-label="Evidence argument view"><button type="button" aria-pressed={view==='argument'} onClick={()=>setView('argument')}>Relationships</button><button type="button" aria-pressed={view==='source'} onClick={()=>setView('source')}>Source list</button></div>
    </div>
    {view==='argument'?<>
    <button type="button" className="vf-decision-question" onClick={()=>select('uncertainty')}><span>ENGINEERING QUESTION</span><strong>{INVESTIGATION.title}</strong><small>Conclusion not established</small></button>
    <div className="vf-decision-graph">
      <button type="button" className="vf-graph-req" onClick={()=>select('req-stability')}>
       <span><FileText size={19}/> REQUIREMENT</span><strong>Safety, stability & mission constraints</strong><p>Acceptance limits must be obtained from applicable requirements.</p><small>Source required</small>
      </button>
      <div className="vf-graph-middle">
       <button type="button" className="vf-graph-candidate" onClick={()=>select('candidate')}>
        <div className="vf-graph-candidate-head"><Box size={18}/> CANDIDATE CONFIGURATION <ContextTag tone="warning">Unverified</ContextTag></div>
        <div className="vf-graph-candidate-body"><VesselVisual variant="candidate" caption={false}/><div><strong>Lightweight exploration</strong><p>Illustrative twin-hull variant</p><span>Mass difference — unknown</span><span>Structure — not evaluated</span></div></div>
       </button>
       <button type="button" className="vf-graph-uncertainty" onClick={()=>select('uncertainty')}><TriangleAlert size={19}/><div><strong>Outstanding uncertainty</strong><span>Comparable mass, loading and stability data missing</span></div></button>
      </div>
      <div className="vf-graph-sources">
       <button type="button" onClick={()=>select('mass-study')}><FlaskConical size={18}/><div><strong>Mass-properties analysis</strong><small>No reviewed calculation</small></div><ChevronRight size={15}/></button>
       <button type="button" onClick={()=>select('stability-study')}><Activity size={18}/><div><strong>Stability assessment</strong><small>No accepted solver output</small></div><ChevronRight size={15}/></button>
       <button type="button" onClick={()=>select('review')}><ClipboardCheck size={18}/><div><strong>Independent review</strong><small>Not performed</small></div><ChevronRight size={15}/></button>
      </div>
    </div>
    <button type="button" className="vf-review-boundary" onClick={()=>select('review')}><Users size={19}/><div><strong>Independent reviewer required</strong><p>The proposal cannot advance until its evidence has been independently evaluated.</p></div><ArrowRight size={16}/></button>
    </>:<div className="vf-evidence-source-list">
      <h3>Required source relationships</h3><p>No attached example objects are independently verified or approved. Select an item to inspect what is missing.</p>
      {(['req-mass','req-stability','candidate','mass-study','stability-study','structural-study','uncertainty','review'] as EntityId[]).map(id=><ObjectRow key={id} id={id} onSelect={select}/>)}
    </div>}
   </div>
   <aside className="vf-decision-docket">
    <section><header><FileText size={20}/><h3>Evidence status</h3></header>
     <div className="vf-state-cards">
      <button type="button" onClick={()=>select('reference')}><span className="vf-warning-mark">!</span><div><strong>Source geometry missing</strong><small>Controlled comparison not possible</small></div><ChevronRight size={17}/></button>
      <button type="button" onClick={()=>select('mass-study')}><span className="vf-warning-mark">!</span><div><strong>Verification incomplete</strong><small>Mass and stability outputs missing</small></div><ChevronRight size={17}/></button>
     </div>
    </section>
    <section><header><Users size={20}/><h3>Independent review</h3></header>
      <p>No reviewer finding, calculation sign-off or technical conclusion exists for this synthetic case.</p>
      <SourceLink module="traceability">Review source evidence</SourceLink>
    </section>
    <section><header><ShieldCheck size={20}/><h3>Approval boundary</h3></header>
     <div className="vf-denied-approval"><LockKeyhole size={19}/><strong>NOT APPROVED</strong></div>
     <p>Protected engineering authority remains in the original USV-01 governance workflow.</p>
     <div className="vf-blockers"><strong>Required before decision</strong><ul><li>Traceable source geometries</li><li>Reviewed mass and stability analyses</li><li>Applicable acceptance criteria</li><li>Independent technical assessment</li></ul></div>
    </section>
    <button type="button" className="vf-button vf-button-primary vf-review-action" onClick={prepareTask}>Draft verification task <ArrowRight size={15}/></button>
   </aside>
  </div>
 </section>;
}

export function Notebook({session,addNote,prepareTask}:SessionProps){
 const [draft,setDraft]=useState('');
 const [scope,setScope]=useState<'all'|'sources'|'decisions'>('all');
 const submit=(e:React.FormEvent)=>{e.preventDefault();if(draft.trim()){addNote(draft.trim());setDraft('')}};
 return <section className="vf-mode vf-notebook" aria-label="Design investigation engineering notebook">
  <div className="vf-page-title"><div><span className="vf-eyebrow"><BookOpen size={15}/> NOTEBOOK / DIGITAL ENGINEERING THREAD</span>
    <h2>Investigation journal</h2><p>Record assumptions, uncertainties, proposed analyses and source handoffs together.</p></div>
   <SourceLink module="knowledge-centre">Knowledge Centre</SourceLink>
  </div>
  <div className="vf-notebook-grid">
   <article className="vf-notebook-paper">
    <header className="vf-notebook-paper-head"><span className="vf-notebook-index">INVESTIGATION / {INVESTIGATION.id}</span><ContextTag tone="warning">Local draft</ContextTag>
      <h3>{INVESTIGATION.title}</h3><p>Engineering question · synthetic demonstration</p></header>
    <nav className="vf-notebook-filters" aria-label="Notebook timeline filter">{([['all','All activity'],['sources','Source gaps'],['decisions','Decisions']] as const).map(([id,label])=>
     <button type="button" key={id} aria-pressed={scope===id} onClick={()=>setScope(id)}>{label}</button>)}</nav>
    <ol className="vf-notebook-timeline">
     {(scope==='all'||scope==='sources')&&<li><span>01</span><div><small>EXAMPLE / QUESTION DEFINED</small><h4>Study the feasibility of a lighter vessel concept</h4>
       <p>Any candidate assessment must retain explicit mission, loading, stability and structural requirements.</p><ContextTag>Initial hypothesis</ContextTag></div></li>}
     {(scope==='all'||scope==='sources')&&<li><span>02</span><div><small>EXAMPLE / EVIDENCE GAP</small><h4>Source geometries and calculations are needed</h4>
       <p>No authoritative CAD baseline, matched conditions or reviewable physics outputs are attached to this demonstration.</p><ContextTag tone="warning">Evidence missing</ContextTag></div></li>}
     {(scope==='all'||scope==='decisions')&&<li><span>03</span><div><small>EXAMPLE / GOVERNED DECISION</small><h4>Recommendation withheld pending review</h4><p>There is no authorization, independently reviewed calculation or verified improvement in this example.</p><ContextTag tone="warning">Not approved</ContextTag></div></li>}
     {session.notes.map(n=><li key={n.id}><span><NotebookPen size={15}/></span><div><small>{n.kind==='task'?'LOCAL VERIFICATION TASK DRAFT':'LOCAL OBSERVATION'} · {n.created}</small><h4>{n.kind==='task'?'Next technical verification step':'Investigation note'}</h4><p>{n.content}</p><ContextTag>Not saved to project</ContextTag></div></li>)}
    </ol>
    <form onSubmit={submit} className="vf-notebook-composer">
     <label htmlFor="vf-note">Add a draft investigation observation</label><textarea id="vf-note" value={draft} onChange={e=>setDraft(e.target.value)} rows={3} placeholder="What requires investigation? (Local session draft only)" aria-label="Add an observation to this preview"/>
     <button className="vf-button vf-button-primary" type="submit" disabled={!draft.trim()}><Plus size={16}/> Add local observation</button>
    </form>
   </article>
   <aside className="vf-notebook-index-pane">
    <div><span className="vf-eyebrow">RESEARCH BINDER</span><h3>Investigation sources</h3><p>Source records are opened through existing governed modules.</p></div>
    <SourceLink module="cad-studio"><FileText size={16}/> Geometry register</SourceLink>
    <SourceLink module="simulations"><FlaskConical size={16}/> Simulation Centre</SourceLink>
    <SourceLink module="traceability"><ClipboardCheck size={16}/> Requirements & verification</SourceLink>
    <SourceLink module="agent-orchestrator"><Users size={16}/> Governed agent tasks</SourceLink>
    <div className="vf-notebook-divider"/>
    <h3>Next action</h3><p>Obtain controlled geometry and operating conditions, then commission reproducible mass and stability studies.</p>
    <button className="vf-button vf-button-outline" type="button" onClick={prepareTask}>Prepare task draft <ArrowRight size={16}/></button>
    <SourceNotice short/>
    <small>Entries are kept only in this browser session; they are not posted, signed or permanently stored.</small>
   </aside>
  </div>
 </section>;
}
