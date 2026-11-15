import React, { useState } from 'react';
import { Activity, ArrowUpRight, Bot, ClipboardCheck, FileCheck2, Gauge, GitCompare, ShieldCheck } from 'lucide-react';
import type { NavigationModule } from '../moduleRegistry';
import type { WorkstreamCode } from '../types/engineering';
import { legacyModuleUrl, linkedEvidence, type Snapshot } from './domain';

function LegacyLink({id,children,className='d2-link'}:{
  id:NavigationModule;children:React.ReactNode;className?:string;
}) {
  return <a href={legacyModuleUrl(id)} className={className} title="Open existing governed engineering workflow">
    {children} <ArrowUpRight size={15} aria-hidden="true"/>
  </a>;
}
function ScreenTitle({title,subtitle,actions}:{
  title:string;subtitle:string;actions?:React.ReactNode;
}) {
  return <div className="d2-titlebar">
    <div><h1>{title}</h1><p>{subtitle}</p></div>
    {actions&&<div className="d2-titleactions">{actions}</div>}
  </div>;
}
function Empty({children}: {children:React.ReactNode}) {
  return <div className="d2-empty"><FileCheck2 size={26}/><p>{children}</p></div>;
}
function Sample({illustrative}:{illustrative:boolean}) {
  return illustrative?<span className="d2-sample">Illustrative</span>:null;
}
const domains:{code:WorkstreamCode;name:string}[]=[
  {code:'SYS',name:'Systems'}, {code:'NAV',name:'Naval architecture'},
  {code:'HYD',name:'Hydrodynamics'}, {code:'MEC',name:'Structures'},
  {code:'ELE',name:'Electrical'}, {code:'PRP',name:'Propulsion'},
  {code:'AUT',name:'Autonomy'}, {code:'VNV',name:'Verification'}
];

export function AnalysisScreen({snapshot,sourceLabel}: {snapshot:Snapshot;sourceLabel:string}) {
  const [discipline,setDiscipline]=useState<WorkstreamCode>('HYD');
  const req=snapshot.requirements.filter(r=>r.subsystemCode===discipline);
  const sim=snapshot.simulations.filter(s=>s.discipline===discipline);
  const module=('workstream-'+discipline) as NavigationModule;
  return <section className="d2-screen">
    <ScreenTitle title="Engineering analysis" subtitle="Inspect controlled inputs, source records and simulation evidence before making design decisions."
      actions={<LegacyLink id="simulations" className="d2-button d2-button-primary">Simulation Centre</LegacyLink>}/>
    <div className="d2-discipline">
      <label htmlFor="d2-discipline">Discipline</label>
      <select id="d2-discipline" value={discipline} onChange={e=>setDiscipline(e.target.value as WorkstreamCode)}>
        {domains.map(d=><option key={d.code} value={d.code}>{d.name}</option>)}
      </select>
      <LegacyLink id={module}>Open discipline workspace</LegacyLink>
    </div>
    <div className="d2-data-summary">
      <div><span>Requirements in discipline</span><strong>{req.length}</strong><small>{sourceLabel}</small></div>
      <div><span>Recorded simulations</span><strong>{sim.length}</strong><small>Validation state shown per record</small></div>
      <div><span>Authoritative CAD baseline</span><strong>Not established here</strong><small>Source geometry must be checked separately</small></div>
    </div>
    <div className="d2-twocol">
      <section className="d2-panel">
        <div className="d2-panelhead"><h2>Requirements & acceptance</h2><LegacyLink id={module}>Full register</LegacyLink></div>
        {req.length===0?<Empty>No requirements loaded for this discipline. Open its register to review completeness.</Empty>:
        req.map(r=><article key={r.id} className="d2-record">
          <div><div className="d2-overline">{r.id} <Sample illustrative={r.isIllustrative}/></div>
            <h3>{r.title}</h3><p>{r.description}</p>
            <small>Acceptance: {r.acceptanceCriteria}</small>
          </div><span className="d2-state">{r.status}</span>
        </article>)}
      </section>
      <section className="d2-panel">
        <div className="d2-panelhead"><h2>Solver register</h2><LegacyLink id="simulations">All runs</LegacyLink></div>
        {sim.length===0?<Empty>No simulation records are loaded for this discipline. Solver results cannot be inferred.</Empty>:
        sim.map(s=><article className="d2-record" key={s.id}>
          <div><div className="d2-overline">{s.id} <Sample illustrative={s.isIllustrative}/></div>
          <h3>{s.name}</h3><p>Solver: {s.solver||'TBD'}</p>
          <small>Geometry: {s.geometryRevision||'Unassigned'} · Review: {s.validationStatus}</small></div>
          <span className="d2-state">{s.runStatus}</span>
        </article>)}
      </section>
    </div>
    <p className="d2-footnote">Record statuses and summary values are not independent evidence that any computation is physically valid.</p>
  </section>;
}
export function AgentsScreen({snapshot,sourceLabel}:{snapshot:Snapshot;sourceLabel:string}) {
  const decisions=snapshot.decisions.filter(d=>d.approvalState!=='Approved');
  const risks=snapshot.risks.filter(r=>r.status==='Open');
  return <section className="d2-screen">
    <ScreenTitle title="Agent engineering workbench"
      subtitle="Agents may investigate and prepare draft recommendations. Independent review and engineering authority remain separate."
      actions={<LegacyLink id="agent-orchestrator" className="d2-button d2-button-primary">Open live orchestrator</LegacyLink>}/>
    <div className="d2-sequence" aria-label="Governed agent process">
      {[{n:'Investigate',d:'Gather constraints and traceable sources',i:Activity},
        {n:'Propose',d:'Draft alternatives and explicit assumptions',i:Bot},
        {n:'Cross-check',d:'Independently review physics and provenance',i:GitCompare},
        {n:'Authorize',d:'Human decision under existing controls',i:ShieldCheck}].map((s,i)=>{
        const Icon=s.i;
        return <div className="d2-seqitem" key={s.n}>
          <div className="d2-step"><Icon size={20}/><span>{i+1}</span></div>
          <h3>{s.n}</h3><p>{s.d}</p>
        </div>;
      })}
    </div>
    <div className="d2-twocol">
      <section className="d2-panel">
        <div className="d2-panelhead"><h2>Decision records awaiting approval</h2><small>{sourceLabel}</small></div>
        {decisions.length===0?<Empty>No unresolved decisions in the loaded register. This does not grant engineering release.</Empty>:
          decisions.slice(0,8).map(d=><article className="d2-record" key={d.id}>
            <div><div className="d2-overline">{d.id} <Sample illustrative={d.isIllustrative}/></div>
              <h3>{d.title}</h3><small>{d.subsystemCode} · {d.isAiProposal?'AI proposal — human review required':'Engineering decision'}</small>
            </div><span className="d2-state">{d.approvalState}</span>
          </article>)}
        <div className="d2-panelbottom"><LegacyLink id="risks-decisions">Review decisions</LegacyLink></div>
      </section>
      <section className="d2-panel">
        <div className="d2-panelhead"><h2>Agent tools & safeguards</h2><small>No live runs inferred</small></div>
        <div className="d2-route"><Gauge size={21}/><div><strong>Deterministic tools</strong><span>Use bounded calculations with recorded inputs.</span></div><LegacyLink id="orchestrator-tools">Open</LegacyLink></div>
        <div className="d2-route"><ShieldCheck size={21}/><div><strong>Approval gates</strong><span>Existing human authorities and review rules.</span></div><LegacyLink id="orchestrator-approvals">Open</LegacyLink></div>
        <div className="d2-route"><ClipboardCheck size={21}/><div><strong>Evidence trail</strong><span>Cross-reference requirements and results.</span></div><LegacyLink id="traceability">Open</LegacyLink></div>
        <div className="d2-panelbottom">{risks.length} open risks in loaded register. No agent task execution is claimed.</div>
      </section>
    </div>
  </section>;
}
export function DirectorScreen({snapshot,sourceLabel}:{snapshot:Snapshot;sourceLabel:string}) {
  const pending=snapshot.decisions.filter(d=>d.approvalState!=='Approved');
  const risks=snapshot.risks.filter(r=>r.status==='Open').sort((a,b)=>b.riskScore-a.riskScore);
  const approved=snapshot.requirements.filter(r=>r.status==='Approved').length;
  return <section className="d2-screen">
    <ScreenTitle title="Director's decision desk" subtitle="Programme priorities, unresolved technical risk and evidence required for a controlled design decision."
      actions={<LegacyLink id="overview" className="d2-button">Original programme dashboard</LegacyLink>}/>
    <div className="d2-data-summary">
      <div><span>Requirements marked Approved</span><strong>{approved} / {snapshot.requirements.length}</strong><small>{sourceLabel}</small></div>
      <div><span>Decisions without approval</span><strong>{pending.length}</strong><small>Loaded records only</small></div>
      <div><span>Controlled engineering release</span><strong>Not established</strong><small>Gate status must be checked in authoritative workflow</small></div>
    </div>
    <div className="d2-twocol">
      <section className="d2-panel">
        <div className="d2-panelhead"><h2>Decision queue</h2><LegacyLink id="risks-decisions">Full decision register</LegacyLink></div>
        {pending.length===0?<Empty>No decisions currently listed as awaiting approval.</Empty>:
        pending.slice(0,8).map(d=><article key={d.id} className="d2-record"><div>
          <div className="d2-overline">{d.id} <Sample illustrative={d.isIllustrative}/></div>
          <h3>{d.title}</h3><small>{d.subsystemCode} · Reviewer: {d.reviewer||'Unassigned'}</small>
        </div><span className="d2-state">{d.approvalState}</span></article>)}
      </section>
      <section className="d2-panel">
        <div className="d2-panelhead"><h2>Technical risks</h2><LegacyLink id="risks-decisions">Risk register</LegacyLink></div>
        {risks.length===0?<Empty>No open risks in this loaded snapshot. Verify completeness.</Empty>:
        risks.slice(0,8).map(r=><article className="d2-record" key={r.id}><div>
          <div className="d2-overline">{r.id} <Sample illustrative={r.isIllustrative}/></div>
          <h3>{r.description}</h3><small>{r.subsystemCode} · {r.mitigation}</small>
        </div><span className="d2-state">Score {r.riskScore}</span></article>)}
      </section>
    </div>
    <p className="d2-footnote">Recorded status is not independent review. No programme readiness percentage or engineering release is inferred.</p>
  </section>;
}
export function EvidenceScreen({snapshot,sourceLabel}:{snapshot:Snapshot;sourceLabel:string}) {
  const closed=snapshot.plans.filter(p=>p.status==='Closed').length;
  const verified=snapshot.simulations.filter(s=>s.validationStatus==='Verified').length;
  return <section className="d2-screen">
    <ScreenTitle title="Evidence & assurance" subtitle="Trace requirements through explicit plan, test and simulation record references. Independent sign-off is separately governed."
      actions={<LegacyLink id="traceability" className="d2-button d2-button-primary">Open full traceability</LegacyLink>}/>
    <div className="d2-data-summary">
      <div><span>Loaded requirements</span><strong>{snapshot.requirements.length}</strong><small>{sourceLabel}</small></div>
      <div><span>Plans marked Closed</span><strong>{closed} / {snapshot.plans.length}</strong><small>Register status — not certification</small></div>
      <div><span>Simulations marked Verified</span><strong>{verified} / {snapshot.simulations.length}</strong><small>Check independent review separately</small></div>
    </div>
    <section className="d2-panel">
      <div className="d2-panelhead"><h2>Requirement → evidence matrix</h2><LegacyLink id="workstream-VNV">Verification register</LegacyLink></div>
      <div className="d2-tablewrap">
        <table><thead><tr><th scope="col">Requirement</th><th scope="col">Method</th><th scope="col">Linked plans</th><th scope="col">Test records</th><th scope="col">Simulation refs</th></tr></thead>
          <tbody>{snapshot.requirements.map(r=>{
            const {plans,tests,simulations}=linkedEvidence(snapshot,r);
            return <tr key={r.id}>
              <td><strong>{r.title}</strong><small>{r.id} <Sample illustrative={r.isIllustrative}/></small></td>
              <td>{r.verificationMethod}<small>{r.status}</small></td>
              <td>{plans.length?plans.map(p=>p.id).join(', '):'Not linked'}</td>
              <td>{tests.length?tests.map(t=>t.id).join(', '):'Not linked'}</td>
              <td>{simulations.length?simulations.map(s=>s.id).join(', '):'Not linked'}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {snapshot.requirements.length===0&&<Empty>No requirements loaded. Evidence coverage cannot be assessed.</Empty>}
    </section>
    <div className="d2-handoff">
      <div><strong>Engineering release remains a protected action</strong><p>Only the existing authenticated approval workflow can change release or human-authorization state.</p></div>
      <LegacyLink id="orchestrator-approvals" className="d2-button">Review approval gates</LegacyLink>
    </div>
  </section>;
}
