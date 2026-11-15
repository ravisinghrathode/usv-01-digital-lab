import React, { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, BookOpen, Bot, ClipboardCheck, Compass, ExternalLink, FileCheck2, GitCompare, LockKeyhole, Network, PanelRightOpen, ShieldAlert, ShieldCheck, Wrench } from 'lucide-react';
import type { NavigationModule } from '../moduleRegistry';
import { linkedEvidence, type Snapshot } from '../dockyard2/domain';
import type { WorkstreamCode, Requirement } from '../types/engineering';
import { VesselStage } from './VesselStage';
import { SimulationBench } from './SimulationBench';
import { engineeringSignals, moduleLink, PRODUCT_FACETS, type ProductFacetId, type LabSection } from './navigation';

function Go({id,children,className='nl-text-link'}:{id:NavigationModule;children:React.ReactNode;className?:string}){
  return <a className={className} href={moduleLink(id)}>{children} <ArrowUpRight size={15} aria-hidden="true"/></a>;
}
function SourceNote({sourceLabel}:{sourceLabel:string}) {
  return <span className="nl-source-note">{sourceLabel} · Engineering release not implied</span>;
}
function EmptyLine({children}:{children:React.ReactNode}) {
  return <p className="nl-empty-line">{children}</p>;
}
interface Common {snapshot:Snapshot;sourceLabel:string;}

function EvidenceLanes({snapshot,sourceLabel,onNavigate}:{snapshot:Snapshot;sourceLabel:string;onNavigate:(section:LabSection)=>void}){
  const s=engineeringSignals(snapshot);
  return <section className="nl-evidence-lanes" aria-label="Research and evidence shortcuts">
    <div className="nl-section-label">
      <div><h2>Engineering context</h2><p>Connected registers and next actions</p></div>
      <SourceNote sourceLabel={sourceLabel}/>
    </div>
    <div className="nl-evidence-line">
      <button type="button" onClick={()=>onNavigate('evidence')}>
        <ClipboardCheck size={21}/><span><strong>Requirements</strong><small>{s.requirements} loaded records</small></span><ArrowUpRight size={17}/>
      </button>
      <button type="button" onClick={()=>onNavigate('simulations')}>
        <Activity size={21}/><span><strong>Analysis</strong><small>{s.simulations} simulation records</small></span><ArrowUpRight size={17}/>
      </button>
      <button type="button" onClick={()=>onNavigate('agents')}>
        <Bot size={21}/><span><strong>Agent work</strong><small>Review tasks and decisions</small></span><ArrowUpRight size={17}/>
      </button>
      <a href={moduleLink('traceability')}>
        <ShieldCheck size={21}/><span><strong>Verification</strong><small>{s.plans} loaded plans</small></span><ArrowUpRight size={17}/>
      </a>
    </div>
  </section>;
}
function AttentionDesk({snapshot,sourceLabel}:{snapshot:Snapshot;sourceLabel:string}){
  const openRisks=snapshot.risks.filter(r=>r.status==='Open').sort((a,b)=>b.riskScore-a.riskScore).slice(0,3);
  const pending=snapshot.decisions.filter(d=>d.approvalState!=='Approved').slice(0,3);
  return <section className="nl-brief" aria-label="Director's technical attention">
    <div className="nl-section-label">
      <div><h2>Needs attention</h2><p>Unresolved engineering matters, not a readiness score</p></div>
      <Go id="risks-decisions">Decision register</Go>
    </div>
    <div className="nl-brief-columns">
      <div className="nl-brief-column">
        <h3><ShieldAlert size={18}/> Open technical risks</h3>
        {openRisks.length===0?<EmptyLine>No open risks appear in the loaded register.</EmptyLine>:
          openRisks.map(r=><div className="nl-brief-record" key={r.id}>
            <div><span>{r.id}{r.isIllustrative?' · Sample':''}</span><strong>{r.description}</strong></div>
            <small>Risk {r.riskScore}</small>
          </div>)}
      </div>
      <div className="nl-brief-column">
        <h3><ClipboardCheck size={18}/> Pending decisions</h3>
        {pending.length===0?<EmptyLine>No decisions awaiting approval in the loaded register.</EmptyLine>:
        pending.map(d=><div className="nl-brief-record" key={d.id}>
          <div><span>{d.id}{d.isIllustrative?' · Sample':''}</span><strong>{d.title}</strong></div>
          <small>{d.approvalState}</small>
        </div>)}
      </div>
    </div>
    <p className="nl-disclaimer">Summaries come from {sourceLabel.toLowerCase()}. Agent status and project release are not inferred from these lists.</p>
  </section>;
}

export function LabOverview({snapshot,sourceLabel,facet,onFacetChange,onNavigate}:Common&{
  facet:ProductFacetId;onFacetChange:(v:ProductFacetId)=>void;onNavigate:(s:LabSection)=>void;
}){
  return <section className="nl-page nl-laboverview">
    <div className="nl-intro">
      <div><h1>Naval AI Lab</h1><p>One place to inspect the vessel, investigate simulations and follow engineering evidence.</p></div>
      <div className="nl-intro-actions">
        <span className="nl-context-mark">USV-01 · Working concept</span>
        <Go id="overview" className="nl-button nl-button-outline">Programme record</Go>
      </div>
    </div>
    <div className="nl-hero-grid">
      <VesselStage facet={facet} onFacetChange={onFacetChange} compact/>
      <SimulationBench simulations={snapshot.simulations} sourceLabel={sourceLabel} compact/>
    </div>
    <EvidenceLanes snapshot={snapshot} sourceLabel={sourceLabel} onNavigate={onNavigate}/>
    <AttentionDesk snapshot={snapshot} sourceLabel={sourceLabel}/>
    <section className="nl-resources">
      <div><BookOpen size={20}/><span><strong>Knowledge & reference fleet</strong>
        <small>Public USV research, standards, notes and provenance</small></span></div>
      <div className="nl-resource-actions">
        <Go id="global-usv-fleet">Global fleet</Go>
        <Go id="knowledge-centre">Knowledge centre</Go>
      </div>
    </section>
  </section>;
}

export function ProductsPage({snapshot,sourceLabel,facet,onFacetChange}:Common&{
  facet:ProductFacetId;onFacetChange:(v:ProductFacetId)=>void
}){
  const product=PRODUCT_FACETS.find(p=>p.id===facet)??PRODUCT_FACETS[0];
  const req=snapshot.requirements.filter(r=>r.subsystemCode===product.domain);
  const bom=snapshot.components.filter(c=>c.subsystemCode===product.domain);
  return <section className="nl-page">
    <div className="nl-intro">
      <div><h1>Vessel & product engineering</h1><p>Inspect the working concept and open the authoritative discipline registers.</p></div>
      <div className="nl-intro-actions"><Go id="cad-studio" className="nl-button nl-button-primary">Open full CAD Studio</Go></div>
    </div>
    <div className="nl-product-workbench">
      <VesselStage facet={facet} onFacetChange={onFacetChange}/>
      <aside className="nl-product-inspector" aria-label="Selected product assembly">
        <header><h2>Selected assembly</h2><span>01 / CONCEPT</span></header>
        <h3>{product.name}</h3><p>Discipline-level context. Imported meshes and diagrams have no approved part allocation.</p>
        <dl className="nl-properties">
          <div><dt>Engineering domain</dt><dd>{product.domain}</dd></div>
          <div><dt>Configuration revision</dt><dd>Unassigned</dd></div>
          <div><dt>Mass / CG</dt><dd>Not established</dd></div>
          <div><dt>Evidence state</dt><dd>Unverified</dd></div>
        </dl>
        <Go id={product.module} className="nl-button nl-button-outline">Open {product.domain} register</Go>
        <div className="nl-inspector-links"><strong>Related records</strong>
          <span>{req.length} requirements · {bom.length} BOM entries</span>
          {req.slice(0,3).map(r=><a key={r.id} href={moduleLink(product.module)}>
            {r.title} <ArrowUpRight size={14}/></a>)}
        </div>
        <p className="nl-disclaimer">{sourceLabel} only. No geometry-to-register relationship is asserted.</p>
      </aside>
    </div>
    <div className="nl-subsystem-navigation">
      <div><h2>Engineering disciplines</h2><p>Source material, assumptions and boundaries</p></div>
      <div className="nl-subsystem-links">
        <Go id="workstream-NAV">Naval architecture</Go>
        <Go id="workstream-MEC">Structures</Go>
        <Go id="workstream-PRP">Propulsion</Go>
        <Go id="workstream-AUT">Autonomy</Go>
        <Go id="procurement-bom">BOM</Go>
      </div>
    </div>
  </section>;
}

export function SimulationsPage({snapshot,sourceLabel}:Common){
  const [discipline,setDiscipline]=useState<string>('all');
  const visible=useMemo(()=>snapshot.simulations.filter(s=>discipline==='all'||s.discipline===discipline),[snapshot.simulations,discipline]);
  return <section className="nl-page">
    <div className="nl-intro">
      <div><h1>Simulation & physics laboratory</h1><p>Explore recorded runs, check model applicability and follow results back to their sources.</p></div>
      <div className="nl-intro-actions"><Go id="simulations" className="nl-button nl-button-primary">Full Simulation Centre</Go></div>
    </div>
    <div className="nl-analysis-layout">
      <SimulationBench simulations={snapshot.simulations} sourceLabel={sourceLabel}/>
      <aside className="nl-analysis-notes">
        <h2>Verification path</h2>
        <ol>
          <li><span>01</span><div><strong>Controlled geometry</strong><p>Source model, units, revision and applicability</p></div></li>
          <li><span>02</span><div><strong>Reproducible calculation</strong><p>Solver, boundary conditions and environment</p></div></li>
          <li><span>03</span><div><strong>Independent assessment</strong><p>Uncertainty, validation and reviewer sign-off</p></div></li>
        </ol>
        <div className="nl-analysis-actions">
          <Go id="generative-optimizer">Optimization workspace</Go>
          <Go id="realtime-sim">Real-time simulator</Go>
          <Go id="workstream-HYD">Hydrodynamics & CFD</Go>
        </div>
        <p className="nl-disclaimer">No run is initiated from this overview. Solver access remains within the governed engine.</p>
      </aside>
    </div>
    <div className="nl-sim-table-section">
      <div className="nl-section-label"><div><h2>Simulation register</h2><p>All available records · {sourceLabel}</p></div>
        <label className="nl-filter-label">Filter by discipline
          <select value={discipline} onChange={e=>setDiscipline(e.target.value)}>
            <option value="all">All disciplines</option>
            {Array.from(new Set(snapshot.simulations.map(s=>s.discipline))).sort().map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </div>
      <div className="nl-table-scroll"><table className="nl-data-table">
        <thead><tr><th scope="col">Run / study</th><th scope="col">Solver</th><th scope="col">Geometry revision</th><th scope="col">State</th><th scope="col">Validation</th><th scope="col">Workflow</th></tr></thead>
        <tbody>{visible.map(s=><tr key={s.id}>
          <td><strong>{s.name}</strong><small>{s.id} · {s.discipline}{s.isIllustrative?' · SAMPLE':''}</small></td>
          <td>{s.solver||'TBD'}</td><td>{s.geometryRevision||'Unassigned'}</td>
          <td>{s.runStatus}</td><td>{s.validationStatus}</td>
          <td><Go id="simulations">Inspect</Go></td>
        </tr>)}</tbody>
      </table>{visible.length===0&&<EmptyLine>No matching recorded simulation runs.</EmptyLine>}</div>
    </div>
  </section>;
}

export function AgentsPage({snapshot,sourceLabel}:Common){
  const decisions=snapshot.decisions.filter(d=>d.approvalState!=='Approved');
  return <section className="nl-page">
    <div className="nl-intro"><div><h1>Engineering agents</h1>
      <p>Delegate research and draft concepts. Separate independent review from authorization.</p></div>
      <div className="nl-intro-actions"><Go id="agent-orchestrator" className="nl-button nl-button-primary">Open agent orchestrator</Go></div>
    </div>
    <section className="nl-agent-chain" aria-label="Four-step governed agent work">
      {[['01','Investigate','Gather source evidence'],['02','Propose','Draft alternatives'],['03','Challenge','Independent physics and traceability review'],['04','Authorize','Human-controlled approval']].map(([n,name,desc])=>
        <div key={n}><span>{n}</span><h2>{name}</h2><p>{desc}</p></div>)}
    </section>
    <div className="nl-agent-bottom">
      <section className="nl-record-ledger">
        <div className="nl-section-label"><div><h2>Decisions awaiting human review</h2><p>{sourceLabel} · not agent-run telemetry</p></div><Go id="risks-decisions">Decision ledger</Go></div>
        {decisions.length===0?<EmptyLine>No records in the loaded snapshot await approval.</EmptyLine>:
        decisions.slice(0,9).map(d=><div className="nl-ledger-row" key={d.id}>
          <div><small>{d.id}{d.isIllustrative?' · SAMPLE':''}</small><strong>{d.title}</strong></div>
          <span>{d.approvalState}</span>
        </div>)}
      </section>
      <aside className="nl-agent-toolbox"><h2>Available governed tools</h2>
        <p>Execution and approval occur in the existing protected workbench.</p>
        <Go id="orchestrator-tools">Deterministic tools</Go>
        <Go id="orchestrator-approvals">Human approvals</Go>
        <Go id="traceability">Evidence trace</Go>
        <div className="nl-disclaimer">The 26-agent roster is unchanged. No live agent activity is inferred from draft data.</div>
      </aside>
    </div>
  </section>;
}

export function EvidencePage({snapshot,sourceLabel}:Common){
  const [selected,setSelected]=useState<string|null>(null);
  const [filter,setFilter]=useState<string>('all');
  const req=snapshot.requirements.filter(r=>filter==='all'||r.subsystemCode===filter);
  const active=req.find(r=>r.id===selected)??req[0];
  const refs=active?linkedEvidence(snapshot,active):null;
  return <section className="nl-page">
    <div className="nl-intro"><div><h1>Engineering evidence</h1><p>Requirements, verification plans, source records and independent review.</p></div>
      <div className="nl-intro-actions"><Go id="traceability" className="nl-button nl-button-primary">Full traceability matrix</Go></div></div>
    <div className="nl-evidence-workbench">
      <section className="nl-evidence-index">
        <div className="nl-section-label"><div><h2>Requirements register</h2><p>{sourceLabel}</p></div>
          <label className="nl-filter-label">Discipline
            <select value={filter} onChange={e=>{setFilter(e.target.value);setSelected(null);}}>
              <option value="all">All</option>
              {Array.from(new Set(snapshot.requirements.map(r=>r.subsystemCode))).sort().map(d=><option value={d} key={d}>{d}</option>)}
            </select>
          </label></div>
        <div className="nl-req-list">
          {req.length===0?<EmptyLine>No requirements found in this discipline.</EmptyLine>:
          req.map(r=><button type="button" className="nl-requirement-row" key={r.id}
            aria-pressed={active?.id===r.id} onClick={()=>setSelected(r.id)}>
            <small>{r.id}{r.isIllustrative?' · SAMPLE':''}</small>
            <strong>{r.title}</strong><span>{r.priority} · {r.status}</span>
          </button>)}
        </div>
      </section>
      <section className="nl-evidence-detail">
        <header><h2>Evidence dossier</h2><span>READ ONLY</span></header>
        {active&&refs?<><h3>{active.title}</h3><p>{active.description}</p>
          <dl className="nl-properties">
            <div><dt>Verification method</dt><dd>{active.verificationMethod}</dd></div>
            <div><dt>Acceptance criteria</dt><dd>{active.acceptanceCriteria}</dd></div>
            <div><dt>Related plans</dt><dd>{refs.plans.length?refs.plans.map(p=>p.id).join(', '):'No explicit link'}</dd></div>
            <div><dt>Test records</dt><dd>{refs.tests.length?refs.tests.map(t=>t.id).join(', '):'No explicit link'}</dd></div>
            <div><dt>Simulation records</dt><dd>{refs.simulations.length?refs.simulations.map(s=>s.id).join(', '):'No explicit link'}</dd></div>
          </dl>
          <Go id={('workstream-'+active.subsystemCode) as NavigationModule}>Open source register</Go>
        </>:<EmptyLine>Select a requirement to review its explicitly linked records.</EmptyLine>}
        <div className="nl-disclaimer">No approval is inferred from a link, sample status or UI inspection. Controlled release remains a protected human action.</div>
      </section>
    </div>
    <section className="nl-resource-bottom">
      <h2>Related verification workspaces</h2>
      <Go id="workstream-VNV">Verification & validation</Go>
      <Go id="orchestrator-approvals">Approval gates</Go>
      <Go id="knowledge-centre">Knowledge centre</Go>
    </section>
  </section>;
}
