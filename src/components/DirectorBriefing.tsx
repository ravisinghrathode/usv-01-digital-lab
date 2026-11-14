import React from 'react';
import { ArrowRight, ClipboardCheck, GitBranch, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { Requirement, DesignDecision, EngineeringRisk, SimulationJob, VerificationPlan } from '../types/engineering';
import type { NavigationModule } from '../moduleRegistry';
import { useEngineeringContext } from '../studio/engineeringContext';
import { inspectStudioModuleContract } from '../studio/releaseParity';

interface Props {
  requirements: Requirement[];
  decisions: DesignDecision[];
  risks: EngineeringRisk[];
  simulations: SimulationJob[];
  verificationPlans: VerificationPlan[];
  onNavigate: (module: NavigationModule) => void;
  onDetailed: () => void;
}

export const DirectorBriefing: React.FC<Props> = ({
  requirements, decisions, risks, simulations, verificationPlans, onNavigate, onDetailed
}) => {
  const { selection } = useEngineeringContext();
  const contract = inspectStudioModuleContract();
  const approvedRequirements = requirements.filter(r => r.status === 'Approved');
  const pendingDecisions = decisions.filter(d => d.approvalState !== 'Approved')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const openRisks = risks.filter(r => r.status === 'Open').sort((a, b) => b.riskScore - a.riskScore);
  const uncheckedSimulations = simulations.filter(s => s.validationStatus !== 'Verified');
  const pendingVerification = verificationPlans.filter(v => v.status !== 'Closed');

  return <section className="ns3-director" aria-label="Programme Director Briefing">
    <div className="ns3-director-heading">
      <div>
        <h1 className="ns3-director-title">Director's engineering briefing</h1>
        <p className="ns3-director-sub">What needs a decision, what remains technically unresolved, and which evidence is available.</p>
      </div>
      <button type="button" className="ns3-action" onClick={onDetailed}>
        Open full programme dashboard <ArrowRight size={17} aria-hidden="true"/>
      </button>
    </div>

    <div className="ns3-director-summary">
      <section aria-label="Product configuration">
        <div className="ns3-director-caption"><GitBranch size={16} style={{display:'inline',marginRight:8}}/>Product configuration</div>
        <div className="ns3-director-metric">USV-01</div>
        <p className="ns3-director-explain">
          {selection.configurationRevision ? 'Selected revision: ' + selection.configurationRevision : 'Authoritative CAD revision: TBD'}
          <br/>A selected browser mesh is not an approved design baseline.
        </p>
      </section>
      <section aria-label="Requirements maturity">
        <div className="ns3-director-caption"><ClipboardCheck size={16} style={{display:'inline',marginRight:8}}/>Requirements register</div>
        <div className="ns3-director-metric">{approvedRequirements.length} / {requirements.length}</div>
        <p className="ns3-director-explain">Recorded Approved status. Independent verification is not implied.</p>
      </section>
      <section aria-label="Engineering evidence">
        <div className="ns3-director-caption"><ShieldCheck size={16} style={{display:'inline',marginRight:8}}/>Engineering evidence</div>
        <div className="ns3-director-metric">{uncheckedSimulations.length}</div>
        <p className="ns3-director-explain">Simulations without Verified status; {pendingVerification.length} verification plans not closed.</p>
      </section>
    </div>

    <div className="ns3-director-ledgers">
      <section className="ns3-director-ledger" aria-label="Decision queue">
        <div className="ns3-director-ledger-header">
          <div>
            <h2>Decision queue</h2>
            <p className="ns3-director-explain">{pendingDecisions.length} records without Approved status</p>
          </div>
          <button className="ns3-icon-button" type="button" aria-label="Open decision register"
            onClick={() => onNavigate('risks-decisions')}><ArrowRight size={20}/></button>
        </div>
        {pendingDecisions.slice(0, 6).map(d => <button key={d.id} className="ns3-director-row" type="button"
          onClick={() => onNavigate('risks-decisions')}>
          <span><strong style={{display:'block',fontWeight:700}}>{d.title}</strong>
            <small style={{color:'var(--ns-muted)',fontSize:12}}>{d.id}</small></span>
          <span className="ns3-director-ledger-status">{d.approvalState}</span>
        </button>)}
        {!pendingDecisions.length && <p className="ns3-director-empty">No pending decisions in the loaded register. Verify record completeness before relying on this.</p>}
      </section>

      <section className="ns3-director-ledger" aria-label="Open technical risks">
        <div className="ns3-director-ledger-header">
          <div>
            <h2><TriangleAlert size={18} style={{display:'inline',marginRight:8,color:'var(--ns-attention)'}}/>Technical risks</h2>
            <p className="ns3-director-explain">{openRisks.length} open risks, highest recorded risk score first</p>
          </div>
          <button type="button" className="ns3-icon-button" aria-label="Open risk register"
            onClick={() => onNavigate('risks-decisions')}><ArrowRight size={20}/></button>
        </div>
        {openRisks.slice(0, 6).map(r => <button type="button" key={r.id} className="ns3-director-row"
          onClick={() => onNavigate('risks-decisions')}>
          <span><strong style={{display:'block',fontWeight:660}}>{r.description}</strong>
            <small style={{fontSize:12,color:'var(--ns-muted)'}}>{r.id}</small></span>
          <span className="ns3-director-ledger-status" title="Recorded probability times impact">Score {r.riskScore}</span>
        </button>)}
        {!openRisks.length && <p className="ns3-director-empty">No open risks in the loaded register. This does not prove the programme is risk-free.</p>}
      </section>
    </div>
    <div className="ns3-director-quicklinks">
      <button type="button" onClick={() => onNavigate('cad-studio')}>Product geometry</button>
      <button type="button" onClick={() => onNavigate('workstream-VNV')}>Verification evidence</button>
      <button type="button" onClick={() => onNavigate('traceability')}>Traceability</button>
      <button type="button" onClick={() => onNavigate('agent-orchestrator')}>Agent directorate</button>
    </div>
    <p className="ns3-director-explain" style={{marginTop:16}}>
      {contract.totalModules}/24 registered workspaces. Deployed Google AI Studio SHA parity: external operator verification required. Engineering release authority is separate.
    </p>
  </section>;
};
