import React,{useState} from 'react';
import {Activity,ArrowRight,ArrowUpRight,Box,Check,ChevronDown,ClipboardCheck,FileClock,FileQuestion,FileText,FlaskConical,Focus,GitBranch,GitCompareArrows,Info,Layers3,ListFilter,Maximize2,Network,ScanLine,ShieldAlert,ShieldCheck,SlidersHorizontal,Target,Waypoints} from 'lucide-react';
import {VesselVisual} from './VesselVisual';
import {ContextTag,ObjectRow,SourceLink,SourceNotice,type SessionProps} from './FidelityCommon';
import {INVESTIGATION,type EntityId} from './model';

const PARTS=[
 {id:'all',label:'Complete vessel',icon:Box,source:'reference'},
 {id:'hull',label:'Hull & buoyancy',icon:Layers3,source:'reference'},
 {id:'deck',label:'Deck & structure',icon:ScanLine,source:'reference'},
 {id:'propulsion',label:'Propulsion',icon:Activity,source:'mass-study'},
 {id:'payload',label:'Mission systems',icon:Target,source:'operating'},
 {id:'sensors',label:'Sensors & mast',icon:Focus,source:'operating'}
] as const;

export function Worktable({session,changeMode,select}:SessionProps){
 const [part,setPart]=useState<string>('all');
 const [tab,setTab]=useState<'context'|'relations'|'history'>('context');
 const [projection,setProjection]=useState<'iso'|'plan'>('iso');
 return <section className="vf-mode vf-worktable" aria-label="High-fidelity connected investigation worktable">
  <div className="vf-page-title">
   <div><span className="vf-eyebrow"><Target size={14}/> ENGINEERING SESSION / WORKTABLE</span>
    <h2>USV-01 <span>product investigation</span></h2>
    <p>A single view of the vessel, its alternatives and the engineering question connecting them.</p>
   </div>
   <div className="vf-title-actions"><ContextTag tone="warning">Geometry not verified</ContextTag>
    <button className="vf-button vf-button-primary" type="button" onClick={()=>changeMode('design')}><GitCompareArrows size={17}/> Compare concepts <ArrowRight size={15}/></button>
   </div>
  </div>
  <div className="vf-worktable-grid">
   <div className="vf-worktable-left">
    <article className="vf-product-hero">
     <div className="vf-hero-meta"><div><span>ACTIVE PRODUCT</span><strong>USV-01</strong><p>Twin-hull autonomous surface vessel · visual study</p></div>
       <span className="vf-drawing-id">CONCEPT VIEW 001</span></div>
     <div className="vf-part-selector" role="group" aria-label="Conceptual component focus">
       <span className="vf-control-caption">VISUAL FOCUS</span>
       {PARTS.map(p=>{const Icon=p.icon;return <button type="button" key={p.id} aria-pressed={part===p.id}
         onClick={()=>setPart(p.id)}><Icon size={16}/>{p.label}</button>})}
       <span className="vf-part-disclaimer">Focus labels are illustrative; not linked to CAD geometry.</span>
     </div>
     <div className="vf-hero-render">
       <VesselVisual variant="reference" perspective={projection}/>
       {part!=='all'&&<div className="vf-focus-marker" role="status"><ScanLine size={16}/> Focus: {PARTS.find(p=>p.id===part)?.label}<small>No geometry isolation</small></div>}
     </div>
     <div className="vf-stage-axis" aria-hidden="true"><span>Z</span><span>Y</span><span>X</span></div>
     <div className="vf-view-controls" role="group" aria-label="Model view selection">
       <button type="button" aria-pressed={projection==='iso'} onClick={()=>setProjection('iso')}>3D view</button>
       <button type="button" aria-pressed={projection==='plan'} onClick={()=>setProjection('plan')}>Plan</button>
       <button type="button" onClick={()=>select('reference')}><Info size={15}/> Source</button>
     </div>
     <div className="vf-hero-bottom"><span><span className="vf-live-dot"/> Original artistic 3D visualization</span>
       <button type="button" onClick={()=>select('reference')}>Inspect concept <ArrowUpRight size={16}/></button></div>
    </article>
    <section className="vf-relationship">
     <header><div><span className="vf-eyebrow"><Waypoints size={14}/> LIVE INVESTIGATION CONTEXT — EXAMPLE</span>
        <h3>Reduce mass while preserving stability</h3></div>
      <button type="button" onClick={()=>changeMode('decide')}>Evidence map <ArrowRight size={14}/></button>
     </header>
     <div className="vf-relationship-flow">
      <div className="vf-pair-nodes">
       <button type="button" className="vf-design-entity" onClick={()=>select('reference')}>
        <span className="vf-entity-thumb"><VesselVisual variant="reference" caption={false}/></span>
        <span><small>REFERENCE · PLACEHOLDER</small><strong>Reference vessel</strong><em>Source required</em></span>
       </button>
       <button type="button" className="vf-design-entity" onClick={()=>select('candidate')}>
        <span className="vf-entity-thumb"><VesselVisual variant="candidate" caption={false}/></span>
        <span><small>ALTERNATIVE · PLACEHOLDER</small><strong>Lightweight concept</strong><em>Source required</em></span>
       </button>
      </div>
      <div className="vf-flow-join" aria-hidden="true"><span/><span/></div>
      <button type="button" className="vf-question-node" onClick={()=>select('uncertainty')}>
       <FlaskConical size={23}/><strong>Mass-reduction investigation</strong><span>No comparable engineering results</span>
      </button>
      <div className="vf-flow-join vf-flow-join-out" aria-hidden="true"><span/><span/></div>
      <div className="vf-source-nodes">
       <button type="button" onClick={()=>select('req-mass')}><FileText size={18}/><span><strong>Requirements</strong><small>Limits to establish</small></span><ArrowUpRight size={14}/></button>
       <button type="button" onClick={()=>{select('mass-study')}}><FlaskConical size={18}/><span><strong>Simulation study</strong><small>No output attached</small></span><ArrowUpRight size={14}/></button>
       <button type="button" onClick={()=>select('review')}><ClipboardCheck size={18}/><span><strong>Independent review</strong><small>Not performed</small></span><ArrowUpRight size={14}/></button>
      </div>
     </div>
    </section>
   </div>
   <aside className="vf-investigation-inspector" aria-label="Worktable contextual information">
    <div className="vf-inspector-tabs" role="group" aria-label="Worktable detail">
     {(['context','relations','history'] as const).map(t=><button type="button" key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t==='context'?'Inspector':t==='relations'?'Relations':'History'}</button>)}
    </div>
    {tab==='context'&&<>
     <section className="vf-property-section"><header><h3>Configuration study</h3><ContextTag tone="warning">Unverified</ContextTag></header>
      <div className="vf-inspector-vessel">
       <span className="vf-mini-vessel"><VesselVisual variant="reference" caption={false}/></span>
       <div><strong>Reference configuration</strong><small>Not linked to approved CAD</small><button type="button" onClick={()=>select('reference')}>View source status <ArrowRight size={13}/></button></div>
      </div>
      <div className="vf-inspector-vessel">
       <span className="vf-mini-vessel"><VesselVisual variant="candidate" caption={false}/></span>
       <div><strong>Candidate concept</strong><small>No quantified mass difference</small><button type="button" onClick={()=>select('candidate')}>View source status <ArrowRight size={13}/></button></div>
      </div>
     </section>
     <section className="vf-property-section"><header><h3>Assumptions</h3><button type="button" onClick={()=>select('operating')}>Inspect <ArrowUpRight size={13}/></button></header>
      <ul className="vf-assumptions"><li>Mission and payload envelope — TBD</li><li>Loading and displacement — TBD</li><li>Hydrostatic acceptance criteria — unverified</li><li>Environmental conditions — TBD</li></ul>
     </section>
     <section className="vf-property-section"><header><h3>Evidence status</h3><button type="button" onClick={()=>changeMode('decide')}>View all <ArrowUpRight size={13}/></button></header>
      <div className="vf-evidence-checks">{[['Geometry revision','Source needed'],['Mass and centre of gravity','Not calculated'],['Stability assessment','Not reviewed'],['Independent review','Not started']].map(([label,status])=>
       <button key={label} type="button" onClick={()=>select(label==='Geometry revision'?'reference':label==='Mass and centre of gravity'?'mass-study':label==='Stability assessment'?'stability-study':'review')}>
        <span className="vf-unverified-ring"/><strong>{label}</strong><small>{status}</small></button>)}</div>
     </section>
     <SourceLink module="traceability" className="vf-inspector-footer">Open governed traceability</SourceLink>
    </>}
    {tab==='relations'&&<div className="vf-inspector-alt"><h3>Related engineering records</h3><p>These are conceptual relationships; no authoritative record links are asserted.</p>
     {(['req-mass','req-stability','mass-study','operating'] as EntityId[]).map(id=><ObjectRow key={id} id={id} onSelect={select}/>)}</div>}
    {tab==='history'&&<div className="vf-inspector-alt"><h3>Investigation history</h3><p>The demonstration includes an example engineering question and optional local notebook drafts. It contains no recorded design approvals.</p>
      <button type="button" className="vf-button vf-button-outline" onClick={()=>changeMode('notebook')}><FileClock size={16}/> Open session notebook</button></div>}
   </aside>
  </div>
 </section>;
}

export function Design({session,changeMode,select,setPerspective,toggleSync,toggleIsolate}:SessionProps){
 const [scope,setScope]=useState('all');
 const groups=[['all','Complete assembly'],['hull','Hull structure'],['power','Propulsion'],['sensors','Sensors & mast'],['payload','Mission payload']] as const;
 return <section className="vf-mode vf-design" aria-label="High-fidelity comparative vessel design workspace">
  <div className="vf-page-title"><div><span className="vf-eyebrow"><Box size={14}/> DESIGN / CONFIGURATION EXPLORATION</span>
    <h2>Configuration comparison</h2><p>Study both concepts with aligned visual projections. Source-based properties remain unavailable.</p></div>
   <SourceLink module="cad-studio">Open CAD Studio</SourceLink>
  </div>
  <div className="vf-design-toolbar">
   <div className="vf-pills" role="group" aria-label="Reference model projection">
    <button type="button" aria-pressed={session.perspective==='iso'} onClick={()=>setPerspective('iso')}>3D view</button>
    <button type="button" aria-pressed={session.perspective==='plan'} onClick={()=>setPerspective('plan')}>Plan view</button>
   </div>
   <span className="vf-design-toolbar-divider"/>
   <button type="button" className="vf-tool-toggle" aria-pressed={session.cameraSync} onClick={toggleSync}><GitCompareArrows size={16}/>{session.cameraSync?'Synchronized views':'Independent views'}</button>
   <button type="button" className="vf-tool-toggle" aria-pressed={session.isolate} onClick={toggleIsolate}><ScanLine size={16}/>{session.isolate?'Highlight on':'Highlight hulls'}</button>
   <span className="vf-toolbar-hint">Visual controls only · no dimensioned CAD</span>
  </div>
  <div className="vf-design-grid">
   <aside className="vf-design-tree" aria-label="Conceptual system browser">
    <header><Layers3 size={18}/> Assembly browser</header>
    {groups.map(([id,label])=><button key={id} type="button" aria-pressed={scope===id} onClick={()=>setScope(id)}>
      <span className="vf-assembly-glyph"><Box size={15}/></span>{label}</button>)}
    <div className="vf-design-tree-note"><Info size={15}/> Selecting a discipline changes visual focus, not source geometry.</div>
   </aside>
   <div className="vf-dual-stage">
    {(['reference','candidate'] as const).map((variant,index)=><article className={'vf-design-scene vf-design-scene-'+variant} key={variant}>
      <header><div><span>{index===0?'A · REFERENCE CONCEPT':'B · ALTERNATIVE CONCEPT'}</span><strong>{index===0?'Reference vessel':'Lightweight exploration'}</strong></div><ContextTag tone="warning">No approved CAD</ContextTag></header>
      <div className="vf-design-image"><VesselVisual variant={variant}
        perspective={variant==='candidate'&&!session.cameraSync?session.candidatePerspective:session.perspective}/>
        {scope!=='all'&&<span className="vf-design-focus">{scope} · illustrative focus</span>}
      </div>
      <footer><button type="button" onClick={()=>select(variant)}><ScanLine size={16}/> Inspect source</button>
        {variant==='candidate'&&!session.cameraSync&&<button type="button" onClick={()=>setPerspective(session.candidatePerspective==='iso'?'plan':'iso',true)}>Toggle B projection</button>}
        <span>{index===0?'Reference / Rev TBD':'Alternative / Rev TBD'}</span></footer>
    </article>)}
   </div>
   <aside className="vf-design-properties"><h3>Comparison basis</h3>
    <div><span>Reference geometry</span><strong>Source required</strong></div>
    <div><span>Candidate geometry</span><strong>Source required</strong></div>
    <div><span>Loading conditions</span><strong>Unestablished</strong></div>
    <div><span>Mass & centre of gravity</span><strong>Not calculated</strong></div>
    <div><span>Stability margins</span><strong>Not reviewed</strong></div>
    <div className="vf-properties-action"><SourceNotice short/><button type="button" onClick={()=>select('operating')}>Inspect conditions <ArrowRight size={14}/></button></div>
   </aside>
  </div>
  <div className="vf-compare-disclaimer"><ShieldAlert size={21}/><div><strong>Performance difference cannot be calculated yet.</strong><p>These are two original artistic concept renders—not real USV-01 revisions. Matched geometry, loading and calculation evidence are required for a valid A/B result.</p></div>
   <button type="button" onClick={()=>changeMode('experiment')}>Explore required studies <ArrowRight size={16}/></button></div>
 </section>;
}
