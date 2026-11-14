import React from 'react';
import { AlertTriangle, ArrowRight, ClipboardList, GitBranch, ShieldCheck } from 'lucide-react';
import type { Requirement, DesignDecision, EngineeringRisk, SimulationJob, VerificationPlan } from '../types/engineering';
import type { NavigationModule } from '../moduleRegistry';
import { useEngineeringContext } from '../studio/engineeringContext';
import { inspectStudioModuleContract } from '../studio/releaseParity';

interface Props {
  requirements:Requirement[];
  decisions:DesignDecision[];
  risks:EngineeringRisk[];
  simulations:SimulationJob[];
  verificationPlans:VerificationPlan[];
  onNavigate:(module:NavigationModule)=>void;
  onDetailed:()=>void;
}
export const DirectorBriefing:React.FC<Props>=({requirements,decisions,risks,simulations,verificationPlans,onNavigate,onDetailed})=>{
  const {selection}=useEngineeringContext();
  const studioContract=inspectStudioModuleContract();
  const reqApproved=requirements.filter(r=>r.status==='Approved').length;
  const pending=decisions.filter(d=>d.approvalState!=='Approved').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const openRisks=risks.filter(r=>r.status==='Open').sort((a,b)=>b.riskScore-a.riskScore);
  const unreviewed=simulations.filter(s=>s.validationStatus!=='Verified');
  const verificationPending=verificationPlans.filter(v=>v.status!=='Closed');
  return <section aria-label="Programme Director Briefing" className="studio-dark min-h-full bg-[#0e1b2c] p-4 text-slate-100 lg:p-6">
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div><div className="text-[11px] uppercase tracking-[0.17em] text-cyan-300">Programme command / USV-01</div>
        <h1 className="mt-1 text-2xl font-semibold">Director's Engineering Briefing</h1>
        <p className="mt-2 text-sm text-slate-400">Decisions, design maturity and unresolved technical risks, derived from current engineering records.</p>
      </div>
      <button type="button" onClick={onDetailed} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">Open full legacy programme dashboard</button>
    </header>
    <div className="mb-4 grid gap-3 md:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-[#182a3e] p-4">
        <div className="flex items-center gap-2 text-xs text-slate-400"><GitBranch size={15}/> Product configuration</div>
        <div className="mt-2 text-lg font-semibold">USV-01</div>
        <p className="mt-1 text-xs text-amber-200">{selection.configurationRevision ? 'Selected revision: '+selection.configurationRevision:'Authoritative CAD revision: TBD'}</p>
        <p className="mt-2 text-xs text-slate-400">No governing CAD baseline is inferred from the browser preview.</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-[#182a3e] p-4">
        <div className="flex items-center gap-2 text-xs text-slate-400"><ClipboardList size={15}/> Requirements register</div>
        <div className="mt-2 text-lg font-semibold">{reqApproved} / {requirements.length} <span className="text-xs font-normal text-slate-400">recorded Approved</span></div>
        <p className="mt-2 text-xs text-amber-200">Recorded status is not independently verified completion.</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-[#182a3e] p-4">
        <div className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck size={15}/> Evidence &amp; Studio X parity</div>
        <div className="mt-2 text-lg font-semibold">{unreviewed.length} <span className="text-xs font-normal text-slate-400">simulations without Verified status</span></div>
        <p className="mt-2 text-xs text-slate-400">{verificationPending.length} verification plans not closed; Studio X modules: {studioContract.totalModules}/24 registered (deployed AI Studio SHA parity: external operator verification required).</p>
      </div>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-white/10 bg-[#142337] p-4">
        <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Decisions requiring attention</h2><button type="button" onClick={()=>onNavigate('risks-decisions')} aria-label="Open decision register" className="text-cyan-200"><ArrowRight size={17}/></button></div>
        <p className="mt-1 text-xs text-slate-400">{pending.length} decision records without Approved status; approvals remain controlled by the existing governance workflow.</p>
        {pending.slice(0,5).map(d=><button key={d.id} type="button" onClick={()=>onNavigate('risks-decisions')} className="mt-2 flex w-full items-center justify-between gap-3 rounded-lg border border-white/5 px-3 py-3 text-left text-xs hover:bg-white/5"><span className="min-w-0 truncate">{d.title}</span><span className="shrink-0 text-amber-200">{d.approvalState}</span></button>)}
        {!pending.length&&<p className="mt-3 text-xs text-slate-400">No pending decisions in the loaded register. This does not prove design approval.</p>}
      </section>
      <section className="rounded-xl border border-white/10 bg-[#142337] p-4">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-semibold"><AlertTriangle size={16} className="text-amber-300"/> Open technical risks</h2><button type="button" onClick={()=>onNavigate('risks-decisions')} aria-label="Open risk register" className="text-cyan-200"><ArrowRight size={17}/></button></div>
        <p className="mt-1 text-xs text-slate-400">{openRisks.length} open recorded risks, ordered by recorded probability × impact score.</p>
        {openRisks.slice(0,5).map(r=><button key={r.id} type="button" onClick={()=>onNavigate('risks-decisions')} className="mt-2 flex w-full items-center justify-between gap-3 rounded-lg border border-white/5 px-3 py-3 text-left text-xs hover:bg-white/5"><span className="line-clamp-2">{r.description}</span><span className="shrink-0 font-mono text-amber-200">{r.riskScore}</span></button>)}
        {!openRisks.length&&<p className="mt-3 text-xs text-slate-400">No open risks in the loaded register. Confirm data completeness before accepting this conclusion.</p>}
      </section>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {[{label:'Review configuration',module:'cad-studio'},{label:'Verification evidence',module:'workstream-VNV'},{label:'Traceability matrix',module:'traceability'},{label:'Agent directorate',module:'agent-orchestrator'}].map(x=><button key={x.label} type="button" onClick={()=>onNavigate(x.module as NavigationModule)} className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/15">{x.label} →</button>)}
    </div>
  </section>;
};
