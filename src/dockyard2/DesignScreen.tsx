import React, { useRef, useState } from 'react';
import { ArrowUpRight, Box, ClipboardList, Eye, FileUp, Focus, GitCompare, ShieldCheck, Wrench, X } from 'lucide-react';
import type { WorkstreamCode } from '../types/engineering';
import type { NavigationModule } from '../moduleRegistry';
import { ConceptVessel } from './ConceptVessel';
import { MeshViewport } from './MeshViewport';
import { domainForPart, legacyModuleUrl, type Snapshot } from './domain';
import { MAX_OBJ_BYTES, parseObj, type Mesh } from './mesh';

const parts=[
  {id:'vessel',label:'Vessel assembly',note:'Conceptual project root'},
  {id:'hull',label:'Hull bodies',note:'Naval architecture'},
  {id:'deck',label:'Deck structure',note:'Structural engineering'},
  {id:'propulsion',label:'Propulsion',note:'Propulsion interfaces'},
  {id:'power',label:'Electrical power',note:'Power and distribution'},
  {id:'payload',label:'Payload integration',note:'Systems engineering'},
  {id:'autonomy',label:'Control & autonomy',note:'Autonomy interfaces'}
] as const;

const partModule:Record<string,NavigationModule>={
  vessel:'workstream-NAV',hull:'workstream-NAV',deck:'workstream-MEC',
  propulsion:'workstream-PRP',power:'workstream-ELE',payload:'workstream-SYS',
  autonomy:'workstream-AUT',imported:'cad-studio'
};
type View='assembly'|'section'|'compare';
interface Props {snapshot:Snapshot;sourceLabel:string;}

export function DesignScreen({snapshot,sourceLabel}:Props) {
  const [part,setPart]=useState<string>('hull');
  const [view,setView]=useState<View>('assembly');
  const [focus,setFocus]=useState(false);
  const [meshA,setMeshA]=useState<Mesh|null>(null);
  const [meshB,setMeshB]=useState<Mesh|null>(null);
  const [loadError,setLoadError]=useState('');
  const uploadA=useRef<HTMLInputElement>(null),uploadB=useRef<HTMLInputElement>(null);
  const domain=domainForPart(part);
  const selected=parts.find(p=>p.id===part);
  const requirements=domain?snapshot.requirements.filter(r=>r.subsystemCode===domain):[];
  const simulations=domain?snapshot.simulations.filter(s=>s.discipline===domain):[];
  const plans=domain?snapshot.plans.filter(p=>p.subsystemCode===domain):[];
  const selectFile=async(file:File|undefined,slot:'A'|'B')=>{
    if(!file)return;
    setLoadError('');
    try {
      if(file.size>MAX_OBJ_BYTES)throw Error('OBJ file exceeds the 12 MB local preview limit.');
      if(!file.name.toLowerCase().endsWith('.obj'))throw Error('Select a .obj mesh for local inspection.');
      const mesh=parseObj(await file.text(),file.name);
      if(slot==='A'){setMeshA(mesh);setPart('imported');}
      else setMeshB(mesh);
    }catch(error){
      setLoadError(error instanceof Error?error.message:'Unable to read OBJ file.');
    }
  };
  const stage=(mesh:Mesh|null,label:string,section=false)=><div className="d2-viewport" aria-label={label}>
    <div className="d2-viewport-grid" aria-hidden="true"/>
    <div className="d2-viewport-top">
      <span>{section?'SCHEMATIC SECTION':mesh?'LOCAL OBJ / VIEW INSPECTION':'CONCEPT PERSPECTIVE'}</span>
      <span className="d2-viewport-warning">NOT VERIFIED CAD</span>
    </div>
    {section?<ConceptVessel section/>:mesh?<MeshViewport mesh={mesh} title={label}/>:
      <ConceptVessel/>}
    <div className="d2-viewport-bottom">
      <span>{mesh&&!section?'DRAG TO ORBIT · SCROLL TO ZOOM · ARROWS + HOME':'ILLUSTRATIVE · NOT TO SCALE'}</span>
      <span>USV-01</span>
    </div>
  </div>;

  const link=(id:NavigationModule,label:string)=>
    <a className="d2-link" href={legacyModuleUrl(id)}>{label} <ArrowUpRight size={15}/></a>;

  return <section className={'d2-screen d2-design'+(focus?' d2-focus':'')}>
    <div className="d2-titlebar">
      <div><h1>Vessel design workspace</h1>
        <p>Inspect local geometry, choose an assembly and follow its engineering records.</p></div>
      <div className="d2-titleactions">
        <button type="button" className="d2-button" onClick={()=>uploadA.current?.click()}>
          <FileUp size={17}/> Import OBJ A
        </button>
        <button type="button" className="d2-button" onClick={()=>uploadB.current?.click()}>
          <FileUp size={17}/> Import OBJ B
        </button>
        <button type="button" className="d2-button d2-button-accent"
          aria-pressed={focus} onClick={()=>setFocus(x=>!x)}>
          {focus?<X size={17}/>:<Focus size={17}/>} {focus?'Exit focus':'Focus geometry'}
        </button>
        <input ref={uploadA} type="file" accept=".obj,text/plain" className="d2-visually-hidden"
          aria-label="Import local OBJ candidate A" onChange={e=>{void selectFile(e.target.files?.[0],'A');e.target.value='';}}/>
        <input ref={uploadB} type="file" accept=".obj,text/plain" className="d2-visually-hidden"
          aria-label="Import local OBJ candidate B" onChange={e=>{void selectFile(e.target.files?.[0],'B');e.target.value='';}}/>
      </div>
    </div>
    {loadError&&<div role="alert" className="d2-error">{loadError} Select another OBJ file or open the original CAD tools.</div>}
    <div className="d2-modes" role="group" aria-label="Geometry presentation">
      <button type="button" aria-pressed={view==='assembly'} onClick={()=>setView('assembly')}><Box size={16}/> Assembly</button>
      <button type="button" aria-pressed={view==='section'} onClick={()=>setView('section')}><Eye size={16}/> Schematic section</button>
      <button type="button" aria-pressed={view==='compare'} onClick={()=>setView('compare')}><GitCompare size={16}/> Compare imported meshes</button>
      <span className="d2-mode-note">{meshA?'A: '+meshA.name:'A: illustrative diagram'}{meshB?' · B: '+meshB.name:''}</span>
    </div>
    <div className="d2-cad-grid">
      <aside className="d2-panel d2-tree" aria-label="Product assembly tree">
        <div className="d2-panelhead"><h2>Product structure</h2><small>Concept / local</small></div>
        <div className="d2-tree-items" role="group" aria-label="Select conceptual part">
          {parts.map(p=><button type="button" key={p.id} aria-pressed={part===p.id}
            className="d2-tree-item" onClick={()=>setPart(p.id)}>
            <Box size={16} aria-hidden="true"/><span>{p.label}</span>
          </button>)}
          {meshA&&<button type="button" className="d2-tree-item" aria-pressed={part==='imported'} onClick={()=>setPart('imported')}>
            <FileUp size={16}/>Imported OBJ A</button>}
        </div>
        <div className="d2-panelbottom">Conceptual hierarchy. A local mesh is never automatically mapped to a part or requirement.</div>
      </aside>
      {view==='compare'?<div className="d2-compare-stage">
        <div><h3>Candidate A</h3>{meshA?stage(meshA,'Imported OBJ candidate A'):
        <div className="d2-awaiting"><GitCompare size={26}/><strong>No candidate A loaded</strong>
          <p>Import the first local OBJ mesh to begin a meaningful visual comparison.</p>
          <button type="button" className="d2-button" onClick={()=>uploadA.current?.click()}>Import OBJ A</button>
        </div>}</div>
        <div><h3>Candidate B</h3>{meshB?stage(meshB,'Imported OBJ candidate B'):
          <div className="d2-awaiting"><GitCompare size={26}/><strong>No candidate B loaded</strong>
            <p>Import a second local OBJ mesh to compare visual geometry.</p>
            <button type="button" className="d2-button" onClick={()=>uploadB.current?.click()}>Import OBJ B</button>
          </div>}</div>
        <p>Visual inspection only. No automatic dimensional, structural or hydrodynamic comparison is performed.</p>
      </div>:stage(view==='assembly'?meshA:null,'Selected vessel or imported geometry',view==='section')}
      <aside className="d2-panel d2-inspector" aria-label="Selected component inspector">
        <div className="d2-panelhead"><h2>Inspector</h2><small>Working selection</small></div>
        <div className="d2-inspector-body">
          <div className="d2-selected-part">{part==='imported'?'Imported local OBJ':selected?.label??'Unassigned'}</div>
          <p>{part==='imported'?'Unmapped user-provided triangle mesh':selected?.note??'Conceptual structure'}</p>
          <dl>
            <div><dt>CAD source</dt><dd>{part==='imported'&&meshA?meshA.name:'Illustrative / not assigned'}</dd></div>
            <div><dt>Configuration</dt><dd>Unassigned</dd></div>
            <div><dt>Material</dt><dd>TBD</dd></div>
            <div><dt>Displacement</dt><dd>TBD</dd></div>
            {part==='imported'&&meshA&&<div><dt>Source triangles</dt><dd>{meshA.faces.length.toLocaleString()} (not B-rep)</dd></div>}
            <div><dt>Evidence</dt><dd className="d2-uncertain">Unverified</dd></div>
          </dl>
          {link(partModule[part]??'cad-studio','Open relevant register')}
        </div>
      </aside>
    </div>
    <section className="d2-contextdock" aria-label="Engineering context dock">
      <div className="d2-panelhead"><h2>Engineering context</h2><small>{part==='imported'?'No part allocation':'Discipline-level matches only'} · {sourceLabel}</small></div>
      <div className="d2-context-grid">
        <article>
          <ClipboardList size={20}/><h3>Requirements</h3>
          <strong>{domain?requirements.length+' loaded':'Not mapped'}</strong>
          <p>{domain?(requirements[0]?.title??'None in loaded discipline register'):'No allocation to imported geometry.'}</p>
          {link(domain?partModule[part]:'workstream-SYS','Open register')}
        </article>
        <article>
          <Wrench size={20}/><h3>Analysis</h3>
          <strong>{domain?simulations.length+' loaded':'Not mapped'}</strong>
          <p>{domain?(simulations[0]?.name??'No simulation in loaded discipline register'):'No approved solver evidence linked.'}</p>
          {link('simulations','Open simulation centre')}
        </article>
        <article>
          <Box size={20}/><h3>Agent investigation</h3><strong>Draft authority only</strong>
          <p>Orchestrate a question, check assumptions, request independent assessment.</p>
          {link('agent-orchestrator','Open agent tools')}
        </article>
        <article>
          <ShieldCheck size={20}/><h3>Verification</h3>
          <strong>{domain?plans.length+' loaded':'Not mapped'}</strong>
          <p>Discipline plans do not imply component-level traceability.</p>
          {link('traceability','Open evidence')}
        </article>
      </div>
      <p className="d2-contextnote">Local OBJ files stay in this browser. Register matches are by discipline, not verified CAD links. The diagrams, meshes and selections do not establish a released engineering baseline.</p>
    </section>
  </section>;
}
