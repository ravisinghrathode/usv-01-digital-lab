import React from 'react';
import { ArrowUpRight, ClipboardCheck, Fingerprint, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Requirement, SimulationJob, TestRecord, VerificationPlan } from '../types/engineering';
import type { NavigationModule } from '../moduleRegistry';
import { useEngineeringContext } from '../studio/engineeringContext';

interface Props {
  requirements: readonly Requirement[];
  simulations: readonly SimulationJob[];
  testRecords: readonly TestRecord[];
  verificationPlans: readonly VerificationPlan[];
  onNavigate: (module:NavigationModule) => void;
  onOpenFull: () => void;
}
export const DockyardAssuranceDesk:React.FC<Props>=({
  requirements,simulations,testRecords,verificationPlans,onNavigate,onOpenFull
})=>{
  const {selection}=useEngineeringContext();
  const verifiedSimulationRecords=simulations.filter(s=>s.validationStatus==='Verified').length;
  const rows=requirements.slice(0,12).map(r=>{
    const plans=verificationPlans.filter(v=>v.targetReqIds.includes(r.id)||r.relatedVerifications.includes(v.id));
    const tests=testRecords.filter(t=>plans.some(plan=>plan.id===t.planId));
    return { requirement:r, plans, tests };
  });
  return <section className="dy-desk" aria-label="Evidence and assurance desk">
    <div className="dy-desk-header">
      <div><h1>Evidence & assurance</h1>
        <p>Trace every requirement through a controlled configuration, supporting analysis, and independent verification.</p></div>
      <button type="button" className="dy-button dy-button--primary" onClick={onOpenFull}>
        Open full traceability matrix <ArrowUpRight size={17}/></button>
    </div>
    <div className="dy-desk-facts">
      <div><span>Selected configuration</span><strong>{selection.configurationRevision??'Unassigned'}</strong><small>No release inferred from UI selection</small></div>
      <div><span>Verification plans loaded</span><strong>{verificationPlans.length}</strong><small>Recorded plans · not closed-out evidence</small></div>
      <div><span>Simulations recorded as Verified</span><strong>{verifiedSimulationRecords} / {simulations.length}</strong><small>Register status, not independent certification</small></div>
    </div>
    <section className="dy-desk-panel">
      <div className="dy-desk-panel-head"><h2>Requirement-to-evidence register</h2><p>Only existing explicit record links are counted</p></div>
      <div className="dy-matrix-scroll">
        <table className="dy-matrix"><thead><tr>
          <th scope="col">Requirement</th><th scope="col">Method / status</th>
          <th scope="col">Plans linked</th><th scope="col">Test records</th>
        </tr></thead><tbody>{rows.map(({requirement:r,plans,tests})=><tr key={r.id}>
          <td><strong>{r.title}</strong><small>{r.id} · {r.isIllustrative?'Sample':'Loaded record'}</small></td>
          <td>{r.verificationMethod}<small>{r.status}</small></td>
          <td>{plans.length?plans.length+' linked':'None linked'}</td>
          <td>{tests.length?tests.length+' recorded':'None linked'}</td>
        </tr>)}</tbody></table>
      </div>
      {!requirements.length&&<p className="dy-empty">No requirements loaded; the evidence trail cannot be assessed.</p>}
    </section>
    <div className="dy-desk-columns">
      <section className="dy-desk-panel">
        <div className="dy-desk-panel-head"><h2>Configuration provenance</h2><Fingerprint size={20}/></div>
        <div className="dy-evidence-list"><span>Selected revision</span><strong>{selection.configurationRevision??'TBD'}</strong></div>
        <div className="dy-evidence-list"><span>Local mesh fingerprint</span><strong>{selection.geometryFingerprint?.slice(0,14)??'Not loaded'}</strong></div>
        <div className="dy-evidence-list"><span>Approval authority</span><strong>Requires independent review</strong></div>
        <p className="dy-empty">A browser preview or local hash is not proof of an approved CAD configuration.</p>
      </section>
      <section className="dy-desk-panel">
        <div className="dy-desk-panel-head"><h2>Review routes</h2><ShieldAlert size={20}/></div>
        <button type="button" className="dy-action-row" onClick={()=>onNavigate('workstream-VNV')}>
          <ClipboardCheck size={19}/><span>Verification & validation<small>Plans, test records, deviations</small></span><ArrowUpRight size={17}/></button>
        <button type="button" className="dy-action-row" onClick={()=>onNavigate('simulations')}>
          <ShieldCheck size={19}/><span>Simulation evidence<small>Assumptions, model inputs, reviewer status</small></span><ArrowUpRight size={17}/></button>
        <button type="button" className="dy-action-row" onClick={()=>onNavigate('orchestrator-approvals')}>
          <ShieldAlert size={19}/><span>Human authority gates<small>Approval decisions remain controlled</small></span><ArrowUpRight size={17}/></button>
      </section>
    </div>
    <p className="dy-record-disclaimer">This view reports links and statuses in the loaded records only. Missing or illustrative records prevent certification. Engineering release is not granted from this interface.</p>
  </section>;
};
