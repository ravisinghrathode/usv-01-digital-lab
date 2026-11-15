import React, {useRef,useState} from 'react';
import {ArrowUpRight,Box,ClipboardList,FileUp,FlaskConical,Layers3,Maximize2,PanelRightClose,PanelRightOpen,ScanLine,ShieldAlert} from 'lucide-react';
import type {Snapshot} from '../dockyard2/domain';
import {MAX_OBJ_BYTES,parseObj,type Mesh} from '../dockyard2/mesh';
import {VesselBlueprint} from './VesselBlueprint';
import {GeometrySheet} from './GeometrySheet';
import {ASSEMBLIES,legacyRoute,selectedRecords,type AssemblyId,type DrawingView,type Room} from './model';
interface Props{snapshot:Snapshot;sourceLabel:string;onNavigate:(room:Room)=>void}
const viewLabels:ReadonlyArray<{id:DrawingView;label:string}>=[
 {id:'isometric',label:'Isometric'}, {id:'plan',label:'Plan'}, {id:'section',label:'Section'}
];
function SourceStamp({sourceLabel}:{sourceLabel:string}){
 return <span className="at-source-stamp" title="These are register records, not geometry-linked evidence">{sourceLabel}</span>;
}
export function Studio({snapshot,sourceLabel,onNavigate}:Props){
 const [assembly,setAssembly]=useState<AssemblyId>('vessel');
 const [view,setView]=useState<DrawingView>('isometric');
 const [mesh,setMesh]=useState<Mesh|null>(null);
 const [error,setError]=useState('');
 const [selectedRun,setSelectedRun]=useState<string|null>(null);
 const [inspector,setInspector]=useState(true);
 const upload=useRef<HTMLInputElement>(null);
 const current=ASSEMBLIES.find(a=>a.id===assembly)??ASSEMBLIES[0];
 const related=selectedRecords(snapshot,assembly);
 const picked=snapshot.simulations.find(s=>s.id===selectedRun)??snapshot.simulations[0];
 const addFile=async(file?:File)=>{
  if(!file)return;
  setError('');
  try{
   if(!file.name.toLowerCase().endsWith('.obj'))throw Error('Only local .obj surface meshes are supported.');
   if(file.size>MAX_OBJ_BYTES)throw Error('OBJ exceeds the 12 MB visual-inspection limit.');
   const parsed=parseObj(await file.text(),file.name);
   setMesh(parsed);
  }catch(e){setError(e instanceof Error?e.message:'Could not inspect local model.');}
 };
 return <section className="at-studio" aria-label="Product engineering workbench">
   <header className="at-studio-heading">
    <div><h1>USV-01 <span>design workspace</span></h1>
      <p>Explore the product. Run the evidence trail. Work from the source.</p></div>
    <div className="at-studio-head-actions">
      <span className="at-neutral-state">Working concept · baseline unapproved</span>
      <a className="at-action at-action-secondary" href={legacyRoute('cad-studio')}>Open CAD engineering <ArrowUpRight size={15}/></a>
    </div>
   </header>
   <div className={'at-canvas-assembly'+(!inspector?' at-inspector-hidden':'')}>
    <aside className="at-product-rail" aria-label="Product assembly library">
     <div className="at-rail-heading"><Layers3 size={17}/><span>Product library</span></div>
     <div className="at-assembly-list" role="group" aria-label="Select product assembly">
      {ASSEMBLIES.map((a,i)=><button type="button" key={a.id} className="at-assembly"
       aria-pressed={assembly===a.id} onClick={()=>{setAssembly(a.id);setMesh(null);}}>
        <span className="at-assembly-index">{String(i+1).padStart(2,'0')}</span>
        <span className="at-assembly-name"><strong>{a.short}</strong><small>{a.domain} discipline</small></span>
       </button>)}
     </div>
     <div className="at-library-end"><span>5 conceptual assemblies</span>
      <p>No authoritative CAD configuration has been established.</p></div>
    </aside>
    <div className="at-sheet" aria-label="Product drawing canvas">
      <div className="at-sheet-bar">
       <div><strong>{current.name}</strong><span>Concept drawing / USV-01</span></div>
       <div className="at-sheet-actions">
        <button type="button" className="at-sheet-inspector-toggle" onClick={()=>setInspector(v=>!v)}
         aria-label={inspector?'Hide context inspector':'Show context inspector'}
         aria-pressed={inspector} title="Toggle engineering context inspector">
         {inspector?<PanelRightClose size={19}/>:<PanelRightOpen size={19}/>}
        </button>
       </div>
      </div>
      <div className="at-drawing-surface">
       <div className="at-drawing-corner"><span>Design reference</span><strong>UNVERIFIED</strong></div>
       {mesh?<GeometrySheet mesh={mesh}/>:<VesselBlueprint view={view} assembly={assembly}/>}
       <div className="at-sheet-watermark">Illustration · Not a certified vessel configuration</div>
      </div>
      <div className="at-sheet-bottom">
       <div className="at-view-switch" role="group" aria-label="Drawing projection">
        {viewLabels.map(v=><button type="button" key={v.id} aria-pressed={!mesh&&view===v.id}
         onClick={()=>{setMesh(null);setView(v.id)}}>{v.label}</button>)}
        {mesh&&<button type="button" aria-pressed={true}>OBJ preview</button>}
       </div>
       <div className="at-sheet-tools">
        <input type="file" accept=".obj" ref={upload} className="at-sr-only" aria-label="Choose a local OBJ surface mesh"
         onChange={e=>{void addFile(e.currentTarget.files?.[0]);e.currentTarget.value='';}}/>
        <button type="button" className="at-quiet-tool" onClick={()=>upload.current?.click()}><FileUp size={16}/> Open local OBJ</button>
       </div>
      </div>
      {error&&<p role="alert" className="at-error">{error}</p>}
    </div>
    {inspector&&<aside className="at-product-inspector" aria-label="Engineering context inspector">
      <header><h2>Engineering context</h2><SourceStamp sourceLabel={sourceLabel}/></header>
      <div className="at-inspector-subject"><span>Selected system</span><h3>{current.name}</h3><p>{current.description}</p></div>
      <dl className="at-engineering-facts">
       <div><dt>Configuration</dt><dd>Unassigned</dd></div>
       <div><dt>Geometry</dt><dd>Not approved</dd></div>
       <div><dt>Requirements</dt><dd>{related.requirements.length} loaded</dd></div>
       <div><dt>Studies</dt><dd>{related.simulations.length} linked by discipline*</dd></div>
       <div><dt>Technical risks</dt><dd>{related.risks.filter(r=>r.status==='Open').length} open</dd></div>
       <div><dt>BOM entries</dt><dd>{related.components.length} loaded</dd></div>
      </dl>
      <div className="at-evidence-preview">
       <strong>Requirements to examine</strong>
       {related.requirements.length?related.requirements.slice(0,3).map(r=>
        <a href={legacyRoute(('workstream-'+r.subsystemCode) as import('../moduleRegistry').NavigationModule)} key={r.id}>
         <span>{r.id}</span>{r.title}<ArrowUpRight size={13}/></a>
       ):<p>No source requirements in this discipline.</p>}
      </div>
      <a className="at-inspector-cta" href={legacyRoute(current.module)}>Open discipline records <ArrowUpRight size={16}/></a>
      <p className="at-inspector-caveat">* Discipline grouping is not a verified link to selected geometry or test evidence.</p>
    </aside>}
   </div>
   <section className="at-runway" aria-label="Simulation runway">
     <div className="at-runway-heading">
      <div><span className="at-runway-icon"><FlaskConical size={19}/></span>
       <div><h2>Simulation runway</h2><p>Inspect solver cases in the context of this vessel</p></div></div>
      <button type="button" className="at-ribbon-link" onClick={()=>onNavigate('physics')}>Explore physics laboratory <ArrowUpRight size={16}/></button>
     </div>
     <div className="at-runway-tabs" role="group" aria-label="Select simulation record">
      {snapshot.simulations.length===0?<span className="at-runway-empty">No runs recorded in the loaded register.</span>:
       snapshot.simulations.map(s=><button type="button" key={s.id}
        className="at-run-tab" aria-pressed={picked?.id===s.id} onClick={()=>setSelectedRun(s.id)}>
        <span>{s.discipline}</span><strong>{s.name}</strong><small>{s.runStatus} {s.isIllustrative?'· Sample':''}</small>
       </button>)}
     </div>
     {picked?<div className="at-run-detail">
       <div className="at-run-ident"><span className="at-run-id">{picked.id}</span><strong>{picked.name}</strong><span>Recorded state: {picked.runStatus}</span></div>
       <div className="at-run-attributes"><div><span>Solver</span><strong>{picked.solver||'TBD'}</strong></div><div><span>Geometry</span><strong>{picked.geometryRevision||'Unassigned'}</strong></div>
        <div><span>Validation</span><strong>{picked.validationStatus||'Not reviewed'}</strong></div></div>
       <a href={legacyRoute('simulations')} className="at-run-open">Open source run <ArrowUpRight size={15}/></a>
     </div>:<p className="at-runway-empty">No simulation result can be inferred. Open the governed Simulation Centre.</p>}
     <div className="at-runway-disclaimer"><ShieldAlert size={15}/> Run status is a recorded value, not live execution or independently validated physics. No invented curves.</div>
   </section>
   <div className="at-studio-links">
    <a href={legacyRoute('traceability')}><ClipboardList size={17}/> Requirement traceability <ArrowUpRight size={14}/></a>
    <a href={legacyRoute('global-usv-fleet')}><Box size={17}/> Global fleet library <ArrowUpRight size={14}/></a>
    <a href={legacyRoute('generative-optimizer')}><ScanLine size={17}/> Candidate optimization <ArrowUpRight size={14}/></a>
   </div>
  </section>;
}
