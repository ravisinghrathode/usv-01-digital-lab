import React,{useState} from 'react';
import {ArrowRight,ArrowUpRight,BookOpen,Box,Check,ChevronDown,ChevronRight,Compass,FileText,FlaskConical,GitCompareArrows,History,Layers3,Link2,LockKeyhole,Maximize2,Move3D,Network,PanelRightOpen,Play,Plus,ScanLine,ShieldAlert,ShieldCheck,SlidersHorizontal,Workflow} from 'lucide-react';
import {VesselVisual} from './VesselVisual';
import {ENTITIES,INVESTIGATION,STUDIES,currentStudy,isComparisonReady,legacyLink,type EntityId,type Mode,type Note,type SessionView,type StudyId,type Perspective} from '../model';
interface Props{
 session:SessionView;changeMode:(mode:Mode)=>void;select:(id:EntityId)=>void;
 chooseStudy:(id:StudyId)=>void;setPerspective:(v:Perspective,candidate?:boolean)=>void;
 toggleSync:()=>void;toggleIsolate:()=>void;addNote:(value:string)=>void;prepareTask:()=>void;
}
const RECORDS=new Map(ENTITIES.map(e=>[e.id,e]));
const record=(id:EntityId)=>RECORDS.get(id)!;
const SourceLink=({module,children}:{module:Parameters<typeof legacyLink>[0],children:React.ReactNode})=><a href={legacyLink(module)} className="v2-source-link">{children}<ArrowUpRight size={15}/></a>;
function Eyebrow({children}:{children:React.ReactNode}){return <span className="v2-eyebrow">{children}</span>}

export function Worktable({session,changeMode,select}:Props){
 return <section className="v2-scene v2-worktable" aria-label="Immersive investigation worktable">
  <header className="v2-scene-intro">
   <div><Eyebrow>THE INVESTIGATION WORKTABLE / 01</Eyebrow><h2>Design begins with a question.</h2>
    <p>Explore a vessel concept, test alternative hypotheses and follow the engineering evidence through one continuous session.</p></div>
   <button className="v2-solid" type="button" onClick={()=>changeMode('design')}>Enter design studio <ArrowRight size={17}/></button>
  </header>
  <div className="v2-worktable-board">
   <div className="v2-board-main">
    <div className="v2-board-meta"><span><i className="v2-indicator"/> MAIN WORKING OBJECT</span><span>USV-01 / CONCEPT EXPLORATION</span></div>
    <div className="v2-vessel-lightstage">
      <div className="v2-ambience-orbit v2-orbit-a" aria-hidden="true"/><div className="v2-ambience-orbit v2-orbit-b" aria-hidden="true"/>
      <VesselVisual/>
      <button className="v2-model-pin v2-pin-one" type="button" onClick={()=>select('reference')} aria-label="Inspect reference configuration">
       <span>01</span><strong>Reference configuration</strong></button>
      <button className="v2-model-pin v2-pin-two" type="button" onClick={()=>select('candidate')} aria-label="Inspect lightweight candidate"><span>02</span><strong>Lightweight candidate</strong></button>
    </div>
    <div className="v2-board-foot">
     <span><Box size={16}/> Illustrative twin-hull research platform</span>
     <span>Approved geometry: not yet available</span>
     <button type="button" onClick={()=>changeMode('design')}>Compare two concepts <ArrowRight size={15}/></button>
    </div>
   </div>
   <aside className="v2-research-rail" aria-label="Engineering investigation context">
    <div className="v2-rail-title"><div><Eyebrow>SESSION FOCUS</Eyebrow><h3>Mass reduction</h3></div><span className="v2-progress-ring"><ScanLine size={20}/></span></div>
    <p className="v2-rail-lead">What must we establish before changing the vessel?</p>
    <button type="button" className="v2-research-item" onClick={()=>select('req-mass')}>
     <span className="v2-research-symbol"><FileText size={18}/></span><span><small>01 / REQUIREMENT</small><strong>Mass envelope</strong><em>Acceptance limit missing</em></span><ChevronRight size={16}/></button>
    <button type="button" className="v2-research-item" onClick={()=>select('stability-study')}>
     <span className="v2-research-symbol"><FlaskConical size={18}/></span><span><small>02 / STUDY</small><strong>Stability investigation</strong><em>Reviewable result required</em></span><ChevronRight size={16}/></button>
    <button type="button" className="v2-research-item" onClick={()=>select('uncertainty')}>
     <span className="v2-research-symbol"><ShieldAlert size={18}/></span><span><small>03 / RISK</small><strong>Structural uncertainty</strong><em>Independent check pending</em></span><ChevronRight size={16}/></button>
    <div className="v2-rail-task"><span>RECOMMENDED NEXT ACTION</span><strong>Establish controlled reference geometry</strong><button type="button" onClick={()=>select('reference')}>Inspect source requirements <ArrowUpRight size={15}/></button></div>
   </aside>
  </div>
  <div className="v2-context-line">
   <div><span className="v2-context-icon"><Network size={19}/></span><div><strong>All research stays connected</strong><p>Your models, studies, requirements and decision evidence remain in the same investigation.</p></div></div>
   <div className="v2-mode-shortcuts">
    <button type="button" onClick={()=>changeMode('experiment')}><FlaskConical size={17}/> Explore experiments <ArrowRight size={14}/></button>
    <button type="button" onClick={()=>changeMode('decide')}><ShieldCheck size={17}/> Review evidence <ArrowRight size={14}/></button>
   </div>
  </div>
 </section>;
}

export function Design({session,changeMode,select,setPerspective,toggleSync,toggleIsolate}:Props){
 const check=isComparisonReady('reference','candidate','operating');
 return <section className="v2-scene v2-design" aria-label="Immersive synchronized design comparison">
  <header className="v2-scene-intro"><div><Eyebrow>DESIGN STUDIO / 02</Eyebrow><h2>One design space. Two possibilities.</h2>
    <p>Inspect the proposed concepts together. Source geometry and matching conditions are mandatory before accepting numerical differences.</p></div>
   <SourceLink module="cad-studio">Open governed CAD studio</SourceLink>
  </header>
  <div className="v2-design-ribbon">
   <span><Layers3 size={17}/> COMPARATIVE DESIGN SESSION</span>
   <div role="group" aria-label="Reference model projection" className="v2-ribbon-group">
     <button type="button" aria-pressed={session.perspective==='iso'} onClick={()=>setPerspective('iso')}>Perspective</button>
     <button type="button" aria-pressed={session.perspective==='plan'} onClick={()=>setPerspective('plan')}>Plan</button>
   </div>
   <button type="button" className="v2-ribbon-control" aria-pressed={session.cameraSync} onClick={toggleSync}><Network size={15}/>{session.cameraSync?'Synchronized views':'Independent views'}</button>
   <button type="button" className="v2-ribbon-control" aria-pressed={session.isolate} onClick={toggleIsolate}><ScanLine size={15}/>{session.isolate?'Highlight on':'Highlight hulls'}</button>
  </div>
  <div className="v2-design-split">
   {(['reference','candidate'] as const).map((id,i)=><article className="v2-design-pane" key={id}>
    <div className="v2-design-meta"><div><span>{i===0?'DESIGN A / REFERENCE':'DESIGN B / EXPERIMENTAL'}</span><strong>{i===0?'Current design concept':'Lightweight design proposal'}</strong></div><span className="v2-model-provenance">ILLUSTRATIVE GEOMETRY</span></div>
    <div className="v2-design-image">
      <div className="v2-design-grid" aria-hidden="true"/>
      <VesselVisual variant={id} perspective={id==='candidate'&&!session.cameraSync?session.candidatePerspective:session.perspective}/>
      {session.isolate&&<div className="v2-isolation-guide"><ScanLine size={16}/> Hull interfaces highlighted in illustration only</div>}
    </div>
    <div className="v2-design-pane-foot">
      <button type="button" onClick={()=>select(id)}><PanelRightOpen size={16}/> Inspect source</button>
      {id==='candidate'&&!session.cameraSync&&<button type="button" onClick={()=>setPerspective(session.candidatePerspective==='iso'?'plan':'iso',true)}>Toggle B projection</button>}
      <span>REVISION ID / UNASSIGNED</span>
    </div>
   </article>)}
  </div>
  <div className="v2-comparison-warning" role="status"><span className="v2-comparison-symbol"><ShieldAlert size={22}/></span><div><strong>Physical comparison is not yet defensible.</strong>
    <p>{check.reason} Mass, centre of gravity, seakeeping and structural values remain unavailable.</p></div>
    <button type="button" onClick={()=>changeMode('experiment')}>Examine required studies <ArrowRight size={16}/></button></div>
 </section>;
}

export function Experiment({session,chooseStudy,select,changeMode}:Props){
 const study=currentStudy(session.study);
 return <section className="v2-scene v2-experiment" aria-label="Scientific experiment theatre">
   <header className="v2-scene-intro"><div><Eyebrow>SIMULATION THEATRE / 03</Eyebrow><h2>Physics takes centre stage.</h2>
     <p>Investigate comparable operating conditions and source-backed results without inventing a scientific visualization.</p></div>
    <SourceLink module="simulations">Simulation source library</SourceLink>
   </header>
   <div className="v2-physics-theatre">
    <div className="v2-physics-topline"><span><i/> EXPERIMENT SESSION</span><strong>{study.title}</strong><span>CASE: {study.id}</span></div>
    <div className="v2-physics-content">
      <div className="v2-physics-vessel">
        <div className="v2-ocean-circles" aria-hidden="true"/><VesselVisual mode="ocean"/>
        <div className="v2-physics-stamp"><strong>ILLUSTRATIVE VESSEL</strong><span>Not a solver visualization</span></div>
      </div>
      <section className="v2-physics-results" aria-label="Unavailable scientific result channels">
       <header><div><span>RESULT FIELD / NO SOURCE DATA</span><strong>Measured output</strong></div><span className="v2-result-unavailable">UNAVAILABLE</span></header>
       <div className="v2-physics-plot">
        <div className="v2-plot-grid" aria-hidden="true"/>
        <div className="v2-plot-missing"><FlaskConical size={27}/><strong>No reviewable result attached</strong><p>A validated curve or field appears here only after source data, units, geometry and solver provenance are available.</p></div>
        <span className="v2-axis-left">OUTPUT / TBD</span><span className="v2-axis-bottom">CONDITION / TBD</span>
       </div>
       <dl className="v2-physics-conditions"><div><dt>Configuration</dt><dd>Source required</dd></div><div><dt>Operating case</dt><dd>{study.conditions}</dd></div><div><dt>Validation</dt><dd>Not reviewed</dd></div></dl>
      </section>
    </div>
    <div className="v2-experiment-runbar"><div><span>AVAILABLE STUDIES</span><strong>Choose a source case</strong></div>
      {STUDIES.map(s=><button type="button" key={s.id} aria-pressed={session.study===s.id} onClick={()=>chooseStudy(s.id)}>
        <small>{s.discipline}</small><strong>{s.title}</strong><span>Result missing</span></button>)}
    </div>
   </div>
   <div className="v2-physics-footer"><span><LockKeyhole size={17}/> Playback and synthetic CFD overlays are intentionally disabled. No solver has run in this prototype.</span><button type="button" onClick={()=>{select(study.id)}}>Inspect case assumptions <ArrowRight size={16}/></button><button type="button" onClick={()=>changeMode('decide')}>Review blockers <ArrowRight size={16}/></button></div>
 </section>;
}

const FLOW:{id:EntityId,kind:string,detail:string}[]=[
 {id:'req-mass',kind:'REQUIREMENT',detail:'Mass envelope · source needed'},
 {id:'candidate',kind:'CANDIDATE',detail:'Proposed revision · unverified'},
 {id:'mass-study',kind:'SIMULATION',detail:'Mass result · not reviewed'},
 {id:'stability-study',kind:'STABILITY',detail:'Assessment · not executed'},
 {id:'uncertainty',kind:'UNCERTAINTY',detail:'Assumption comparability unknown'},
 {id:'review',kind:'INDEPENDENT REVIEW',detail:'Human review · not recorded'}
];
export function Decide({select,changeMode,prepareTask}:Props){
 return <section className="v2-scene v2-decide" aria-label="Source-linked engineering decision room">
  <header className="v2-scene-intro"><div><Eyebrow>DECISION & EVIDENCE / 04</Eyebrow><h2>Every conclusion needs a chain of proof.</h2><p>Examine the argument, the missing sources and the independent review boundary.</p></div><SourceLink module="traceability">Traceability matrix</SourceLink></header>
  <div className="v2-decision-grid">
   <div className="v2-proof-map">
    <div className="v2-question-focus"><span>THE ENGINEERING QUESTION</span><h3>{INVESTIGATION.title}</h3><small>Determination withheld · unverified study</small></div>
    <div className="v2-argument-connectors" aria-hidden="true"/>
    <div className="v2-proof-stream">
     {FLOW.map((item,i)=><button type="button" key={item.id} className={'v2-proof-node'+(item.id==='uncertainty'?' v2-proof-risk':'')} onClick={()=>select(item.id)}>
       <span className="v2-proof-index">{String(i+1).padStart(2,'0')}</span>
       {item.id==='candidate'&&<span className="v2-proof-thumb" aria-hidden="true"><VesselVisual variant="candidate" compact/></span>}
       <span className="v2-proof-details"><small>{item.kind}</small><strong>{record(item.id).title}</strong><em>{item.detail}</em></span><ChevronRight size={17}/></button>)}
    </div>
    <p className="v2-evidence-key"><Network size={15}/> All relationships shown here are proposed investigation links, not verified programme traceability.</p>
    <div className="v2-proof-outcome"><LockKeyhole size={20}/><div><strong>Recommendation withheld</strong><p>There is not enough verified evidence to authorize any design change.</p></div></div>
   </div>
   <aside className="v2-review-pane">
    <div className="v2-review-pane-header"><ShieldAlert size={23}/><div><span>INDEPENDENT ASSESSMENT</span><h3>Open review docket</h3></div></div>
    <div className="v2-review-count"><strong>4</strong><span>Sources or verification actions missing<br/><small>Example task count, not live programme status</small></span></div>
    <ol><li>Attach controlled vessel geometry.</li><li>Establish comparable mass and stability calculations.</li><li>Confirm mission and loading conditions.</li><li>Obtain independent reviewer assessment.</li></ol>
    <div className="v2-boundary"><span><LockKeyhole size={16}/> HUMAN APPROVAL BOUNDARY</span><strong>Not requested / not approved</strong><p>No agent or screen can approve the engineering release.</p></div>
    <button type="button" className="v2-solid" onClick={prepareTask}>Prepare verification task <ArrowRight size={16}/></button>
    <SourceLink module="orchestrator-approvals">Open governed review authority</SourceLink>
   </aside>
  </div>
 </section>;
}

export function Notebook({session,addNote,prepareTask}:Props){
 const [draft,setDraft]=useState('');
 return <section className="v2-scene v2-notebook" aria-label="Engineering investigation notebook">
  <header className="v2-scene-intro"><div><Eyebrow>LABORATORY NOTEBOOK / 05</Eyebrow><h2>Make every investigation recoverable.</h2><p>A source-aware record of what was tested, what was learned and what remains open.</p></div><SourceLink module="knowledge-centre">Knowledge centre</SourceLink></header>
  <div className="v2-journal-grid">
   <div className="v2-journal-page">
    <div className="v2-journal-head"><BookOpen size={29}/><div><span>INVESTIGATION JOURNAL</span><h3>USV-01 / Weight optimization</h3></div><span>DEMO / NO SAVED RECORD</span></div>
    <div className="v2-journal-sequence">
     {[{step:'01',title:'Question',body:INVESTIGATION.title,meta:'Demonstration investigation'},
       {step:'02',title:'Design alternatives',body:'Reference and lightweight candidate models are illustrative concepts. Their authoritative source revisions are still required.',meta:'No geometry certification'},
       {step:'03',title:'Experiments',body:'Proposed mass, stability and structural studies have no validated result files or comparable input sets.',meta:'No solver execution'},
       ...session.notes.map((n,i)=>({step:String(i+4).padStart(2,'0'),title:n.kind==='task'?'Verification task draft':'Local observation',body:n.content,meta:'Unsaved session-only note · '+n.created}))].map(item=>
         <article className="v2-journal-entry" key={item.step}><span>{item.step}</span><div><h4>{item.title}</h4><p>{item.body}</p><small>{item.meta}</small></div></article>)}
    </div>
    <form className="v2-journal-compose" onSubmit={e=>{e.preventDefault();if(!draft.trim())return;addNote(draft.trim());setDraft('')}}>
     <label htmlFor="v2-note">Add a local research observation</label><textarea id="v2-note" rows={3} value={draft} onChange={e=>setDraft(e.target.value)}
      placeholder="Capture a hypothesis or next step. This draft is not uploaded."/>
     <div><span>Not saved to the programme record</span><button className="v2-solid" type="submit" disabled={!draft.trim()}><Plus size={16}/> Add observation</button></div>
    </form>
   </div>
   <aside className="v2-journal-sidebar"><div className="v2-note-provenance"><History size={22}/><span>TRANSPARENT RESEARCH</span><h3>What makes this reproducible?</h3><p>Source IDs, explicit assumptions, software versions, result artifacts and independent reviewer decisions—not a polished AI summary.</p></div>
    <div className="v2-note-steps"><h4>Next research actions</h4><button type="button" onClick={prepareTask}>Draft geometry and boundary-condition verification <ArrowRight size={14}/></button><SourceLink module="agent-orchestrator">Governed specialist agents</SourceLink></div>
    <div className="v2-note-warning"><LockKeyhole size={16}/> All notes here are temporary React state. A reload clears them; no project action is executed.</div>
   </aside>
  </div>
 </section>;
}
