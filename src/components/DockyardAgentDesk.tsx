import React from 'react';
import { ArrowUpRight, Bot, CircleDot, ClipboardCheck, FileSearch, ShieldCheck } from 'lucide-react';
import type { DesignDecision, EngineeringRisk } from '../types/engineering';
import type { NavigationModule } from '../moduleRegistry';
import { useEngineeringContext } from '../studio/engineeringContext';

interface Props {
  decisions: readonly DesignDecision[];
  risks: readonly EngineeringRisk[];
  onNavigate: (module:NavigationModule) => void;
  onOpenFull: () => void;
  onAskAi?: (prompt:string) => void;
}

const stages = [
  { name:'Investigate', description:'Gather traceable sources and defined inputs.', icon:FileSearch },
  { name:'Draft proposal', description:'Make assumptions and uncertainty explicit.', icon:Bot },
  { name:'Independent review', description:'Check physics, methods and configuration.', icon:ClipboardCheck },
  { name:'Human authority', description:'Director makes controlled release decisions.', icon:ShieldCheck }
] as const;

export const DockyardAgentDesk:React.FC<Props>=({ decisions,risks,onNavigate,onOpenFull,onAskAi })=>{
  const {selection}=useEngineeringContext();
  const unresolved=decisions.filter(d=>d.approvalState!=='Approved');
  const openRisks=risks.filter(r=>r.status==='Open');
  return <section className="dy-desk" aria-label="Agent workbench">
    <div className="dy-desk-header">
      <div><h1>Agent engineering workbench</h1>
        <p>Research autonomously. Challenge independently. Approve through the established human gates.</p></div>
      <button type="button" className="dy-button dy-button--primary" onClick={onOpenFull}>
        Open existing orchestrator <ArrowUpRight size={17}/></button>
    </div>
    <div className="dy-desk-facts">
      <div><span>Selected configuration</span><strong>{selection.configurationRevision??'Unassigned'}</strong><small>UI selection · not a controlled baseline</small></div>
      <div><span>Decisions without Approved status</span><strong>{unresolved.length}</strong><small>Loaded engineering decision records</small></div>
      <div><span>Open technical risks</span><strong>{openRisks.length}</strong><small>Recorded risks · not agent-run status</small></div>
    </div>
    <section className="dy-desk-panel">
      <div className="dy-desk-panel-head"><h2>Governed work sequence</h2><p>Process, not live agent execution telemetry</p></div>
      <ol className="dy-agent-stages">{stages.map((stage,index)=>{
        const Icon=stage.icon;
        return <li key={stage.name}><div className="dy-stage-icon"><Icon size={20}/></div>
          <div><span>{index+1}. {stage.name}</span><p>{stage.description}</p></div>
        </li>;
      })}</ol>
    </section>
    <div className="dy-desk-columns">
      <section className="dy-desk-panel">
        <div className="dy-desk-panel-head"><h2>Work awaiting decisions</h2>
          <button type="button" onClick={()=>onNavigate('risks-decisions')} aria-label="Open decision register"><ArrowUpRight size={19}/></button></div>
        {unresolved.slice(0,5).map(d=><button type="button" key={d.id} className="dy-ledger-row" onClick={()=>onNavigate('risks-decisions')}>
          <span><strong>{d.title}</strong><small>{d.id} · {d.isIllustrative?'Illustrative record':'Loaded register record'}</small></span>
          <em>{d.approvalState}</em>
        </button>)}
        {!unresolved.length&&<p className="dy-empty">No unresolved decisions in the loaded register; this is not release approval.</p>}
      </section>
      <section className="dy-desk-panel">
        <div className="dy-desk-panel-head"><h2>Working tools</h2></div>
        <button type="button" className="dy-action-row" onClick={()=>onNavigate('orchestrator-tools')}>
          <CircleDot size={19}/><span>Deterministic tools and calculations<small>Use validated procedures and tool outputs</small></span><ArrowUpRight size={17}/></button>
        <button type="button" className="dy-action-row" onClick={()=>onNavigate('orchestrator-approvals')}>
          <ShieldCheck size={19}/><span>Human approval gates<small>No agent self-approval or engineering release</small></span><ArrowUpRight size={17}/></button>
        <button type="button" className="dy-action-row" onClick={()=>onNavigate('traceability')}>
          <ClipboardCheck size={19}/><span>Evidence and traceability<small>Inspect record coverage and outstanding gaps</small></span><ArrowUpRight size={17}/></button>
        {onAskAi&&<button type="button" className="dy-button" onClick={()=>onAskAi('Draft an evidence-backed investigation for USV-01. Propose questions and source checks only. Never claim a completed calculation, a connected model or approval.')}>
          Ask AI for draft investigation <ArrowUpRight size={17}/></button>}
      </section>
    </div>
    <p className="dy-record-disclaimer">This desk summarizes loaded records. It does not assert that an agent is active, that a review was performed or that a proposal has passed an approval gate.</p>
  </section>;
};
