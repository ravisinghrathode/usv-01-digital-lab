import React,{useMemo,useState} from 'react';
import {ArrowUpRight,BookOpen,CheckCheck,ChevronRight,Database,FileCheck2,FlaskConical,Globe2,Link2,Search,ShieldCheck,TerminalSquare,Workflow} from 'lucide-react';
import type {Snapshot} from '../dockyard2/domain';
import {MODULE_REGISTRY} from '../moduleRegistry';
import {evidenceFor,legacyRoute,simulationMatches} from './model';

interface Props{snapshot:Snapshot;sourceLabel:string}
function Link({module,children}:{module:(typeof MODULE_REGISTRY)[number]['id'];children:React.ReactNode}){
 return <a className="at-inline-link" href={legacyRoute(module)}>{children}<ArrowUpRight size={15}/></a>;
}
function Empty({children}:{children:React.ReactNode}){return <p className="at-empty">{children}</p>}
function Heading({title,subtitle,sourceLabel,children}:{title:string;subtitle:string;sourceLabel:string;children?:React.ReactNode}){
 return <header className="at-room-heading">
  <div><h1>{title}</h1><p>{subtitle}</p></div>
  <div className="at-room-tools"><span>{sourceLabel}</span>{children}</div>
 </header>;
}
export function PhysicsRoom({snapshot,sourceLabel}:Props){
 const [query,setQuery]=useState('');
 const [discipline,setDiscipline]=useState('all');
 const [current,setCurrent]=useState<string|null>(null);
 const list=useMemo(()=>snapshot.simulations.filter(s=>simulationMatches(s,query,discipline)),[snapshot.simulations,query,discipline]);
 const active=list.find(s=>s.id===current)??list[0];
 return <section className="at-room at-physics">
  <Heading title="Physics laboratory" subtitle="A run is not a result. Inspect the evidence chain before drawing conclusions." sourceLabel={sourceLabel}>
    <Link module="simulations">Simulation Centre</Link>
  </Heading>
  <div className="at-physics-grid">
   <aside className="at-case-rail">
    <div className="at-case-toolbar">
      <label className="at-case-search"><Search size={16}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a case" aria-label="Filter simulation cases"/></label>
      <label className="at-sr-only" htmlFor="at-case-filter">Simulation discipline</label>
      <select id="at-case-filter" value={discipline} onChange={e=>{setDiscipline(e.target.value);setCurrent(null);}}>
        <option value="all">All disciplines</option>
        {Array.from(new Set(snapshot.simulations.map(s=>s.discipline))).sort().map(d=><option key={d} value={d}>{d}</option>)}
      </select>
    </div>
    <div className="at-case-list" aria-label="Recorded simulation cases">
     {list.length===0?<Empty>No simulations match the current search and discipline.</Empty>:
      list.map(s=><button type="button" className="at-case" key={s.id} aria-pressed={active?.id===s.id} onClick={()=>setCurrent(s.id)}>
       <small>{s.id} {s.isIllustrative?'· SAMPLE':''}</small><strong>{s.name}</strong><span>{s.runStatus} · {s.discipline}</span>
      </button>)}
    </div>
   </aside>
   <div className="at-analysis-sheet">
    <div className="at-analysis-sheet-header"><strong>{active?.name||'No study selected'}</strong><span>{active?.id||'—'}</span></div>
    <div className="at-analysis-empty" aria-label="Solver result viewer">
      <div className="at-analysis-grid" aria-hidden="true"/>
      <div className="at-analysis-empty-message"><FlaskConical size={31}/><h2>Awaiting verified result files</h2>
       <p>Validated plots and calculated curves belong here. A register entry alone is not evidence that the simulation has been executed or independently reviewed.</p>
      </div>
      <span className="at-analysis-axis-x">Independent variable · not established</span><span className="at-analysis-axis-y">Output · TBD</span>
    </div>
    {active?<><dl className="at-sim-dossier">
     <div><dt>Run state</dt><dd>{active.runStatus}</dd></div>
     <div><dt>Solver</dt><dd>{active.solver||'Unspecified'}</dd></div>
     <div><dt>Model revision</dt><dd>{active.geometryRevision||'Unassigned'}</dd></div>
     <div><dt>Review</dt><dd>{active.validationStatus||'Not reviewed'}</dd></div>
     <div><dt>Environment</dt><dd>{active.computeEnvironment||'Not supplied'}</dd></div>
     <div><dt>Assumptions</dt><dd>{active.assumptions||'Not supplied'}</dd></div>
    </dl><div className="at-analysis-bottom"><Link module="simulations">Open study record and outputs</Link></div></>:
    <Empty>Choose a case after changing your filters.</Empty>}
   </div>
  </div>
  <div className="at-catalog-footer"><Link module="workstream-HYD">Hydrodynamics & CFD</Link><Link module="realtime-sim">Real-time simulator</Link><Link module="generative-optimizer">Concept optimizer</Link></div>
 </section>;
}
export function EvidenceRoom({snapshot,sourceLabel}:Props){
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState<string|null>(null);
 const visible=snapshot.requirements.filter(r=>(r.id+' '+r.title+' '+r.description).toLowerCase().includes(search.toLowerCase()));
 const active=visible.find(r=>r.id===selected)??visible[0];
 const refs=active?evidenceFor(snapshot,active):null;
 return <section className="at-room">
  <Heading title="Evidence browser" subtitle="From a requirement to its linked simulations and verification records." sourceLabel={sourceLabel}>
   <Link module="traceability">Traceability matrix</Link>
  </Heading>
  <div className="at-evidence-grid">
   <section className="at-evidence-list">
     <div className="at-list-search"><Search size={16}/><input type="search" aria-label="Filter engineering requirements" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter requirements"/></div>
     <div className="at-evidence-scroll">
      {visible.length===0?<Empty>No requirement matches this filter.</Empty>:
       visible.map(r=><button key={r.id} className="at-evidence-record" type="button" aria-pressed={active?.id===r.id} onClick={()=>setSelected(r.id)}>
        <span>{r.id} {r.isIllustrative?'· SAMPLE':''}</span><strong>{r.title}</strong>
        <small>{r.priority} · {r.status}</small>
       </button>)}
     </div>
   </section>
   <article className="at-evidence-article">
    <header><h2>Source dossier</h2><span>Read only</span></header>
    {active&&refs?<><span className="at-article-index">{active.id}{active.isIllustrative?' · ILLUSTRATIVE':''}</span>
      <h3>{active.title}</h3><p>{active.description}</p>
      <dl><div><dt>Acceptance criteria</dt><dd>{active.acceptanceCriteria}</dd></div>
       <div><dt>Verification method</dt><dd>{active.verificationMethod}</dd></div>
       <div><dt>Plans explicitly linked</dt><dd>{refs.plans.length?refs.plans.map(p=>p.id).join(', '):'No explicit link recorded'}</dd></div>
       <div><dt>Test records via plans</dt><dd>{refs.tests.length?refs.tests.map(t=>t.id).join(', '):'No test record linked'}</dd></div>
       <div><dt>Simulation references</dt><dd>{refs.simulations.length?refs.simulations.map(s=>s.id).join(', '):'No explicit simulation link'}</dd></div></dl>
      <Link module={('workstream-'+active.subsystemCode) as (typeof MODULE_REGISTRY)[number]['id']}>Open discipline register</Link>
    </>:<Empty>Choose a requirement to inspect its controlled links.</Empty>}
    <p className="at-context-caution">A visible reference is not a verified engineering release. Original human approval controls remain in the governed workbench.</p>
   </article>
  </div>
  <div className="at-catalog-footer"><Link module="workstream-VNV">Verification & validation</Link><Link module="orchestrator-approvals">Approval controls</Link></div>
 </section>;
}
export function AgentsRoom({snapshot,sourceLabel}:Props){
 const decisions=snapshot.decisions.filter(d=>d.approvalState!=='Approved');
 const risks=snapshot.risks.filter(r=>r.status==='Open').sort((a,b)=>b.riskScore-a.riskScore);
 return <section className="at-room">
  <Heading title="Agent directorate" subtitle="Research and design exploration under a separate chain of evidence and authority." sourceLabel={sourceLabel}>
   <Link module="agent-orchestrator">Open orchestrator</Link>
  </Heading>
  <div className="at-agent-flow" aria-label="Governed work sequence">
   {[['Investigate','Traceable sources'],['Model','Explicit assumptions'],['Challenge','Independent verification'],['Authorize','Human decision']].map(([name,detail],i)=>
    <div key={name}><span>{i+1}</span><h2>{name}</h2><p>{detail}</p></div>)}
  </div>
  <div className="at-ledger-pair">
   <section className="at-ledger"><h2>Decisions in review</h2>{decisions.length?decisions.slice(0,10).map(d=><div key={d.id}>
     <span>{d.id}{d.isIllustrative?' · Sample':''}</span><strong>{d.title}</strong><small>{d.approvalState}</small>
   </div>):<Empty>No pending decisions in the loaded register.</Empty>}
     <Link module="risks-decisions">Decision register</Link>
   </section>
   <section className="at-ledger"><h2>Open technical risks</h2>{risks.length?risks.slice(0,10).map(r=><div key={r.id}>
     <span>{r.id}{r.isIllustrative?' · Sample':''}</span><strong>{r.description}</strong><small>Risk score {r.riskScore}</small>
   </div>):<Empty>No open risks in the loaded register.</Empty>}
     <Link module="orchestrator-tools">Deterministic tools</Link>
   </section>
  </div>
  <p className="at-context-caution">The 26 specialist agents have not been modified. A register is not proof of a live agent session, physics verification or authorization.</p>
 </section>;
}
export function LibraryRoom({snapshot,sourceLabel}:Props){
 return <section className="at-room">
  <Heading title="Knowledge library" subtitle="Find the background, source material and tools behind each engineering choice." sourceLabel={sourceLabel}>
   <Link module="knowledge-centre">Open knowledge centre</Link>
  </Heading>
  <div className="at-library-grid">
   <a href={legacyRoute('global-usv-fleet')} className="at-library-feature"><Globe2 size={34}/><div><h2>Global USV reference fleet</h2><p>Investigate public reference vessels, provenance and technical comparators.</p></div><ArrowUpRight size={21}/></a>
   <a href={legacyRoute('notebook-lm')} className="at-library-feature"><BookOpen size={34}/><div><h2>Naval notebook</h2><p>Engineering notes, hypotheses and analysis workspaces.</p></div><ArrowUpRight size={21}/></a>
   <a href={legacyRoute('external-software')} className="at-library-feature"><Database size={34}/><div><h2>Software and source tools</h2><p>External solver and modelling capability registry.</p></div><ArrowUpRight size={21}/></a>
  </div>
  <section className="at-knowledge-notes"><header><h2>Knowledge records</h2><span>{snapshot.notes.length} loaded records · {sourceLabel}</span></header>
   {snapshot.notes.length?snapshot.notes.slice(0,18).map(note=><a href={legacyRoute('knowledge-centre')} key={note.id}>
     <span>{note.category}</span><strong>{note.title}</strong><ArrowUpRight size={16}/>
   </a>):<Empty>No knowledge records in the current snapshot.</Empty>}
  </section>
  <p className="at-context-caution">Source provenance and independent technical qualification must be inspected in each governed record.</p>
 </section>;
}
