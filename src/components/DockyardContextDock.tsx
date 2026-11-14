import React from 'react';
import { ArrowUpRight, Bot, ClipboardList, FlaskConical, ShieldCheck } from 'lucide-react';
import type { Requirement, SimulationJob, VerificationPlan, WorkstreamCode } from '../types/engineering';
import type { NavigationModule } from '../moduleRegistry';
import { useEngineeringContext } from '../studio/engineeringContext';

interface Props {
  domain: WorkstreamCode | null;
  selectedLabel: string;
  requirements: readonly Requirement[];
  simulations: readonly SimulationJob[];
  verificationPlans: readonly VerificationPlan[];
  onNavigate: (module: NavigationModule) => void;
  onAskAi?: (prompt: string) => void;
}
const WORKSTREAM_MODULE: Record<WorkstreamCode, NavigationModule> = {
  SYS:'workstream-SYS', NAV:'workstream-NAV', HYD:'workstream-HYD',
  MEC:'workstream-MEC', ELE:'workstream-ELE', PRP:'workstream-PRP',
  AUT:'workstream-AUT', VNV:'workstream-VNV'
};

/** Context is from loaded discipline registers; it never implies a geometry-to-record relationship. */
export const DockyardContextDock: React.FC<Props> = ({
  domain,selectedLabel,requirements,simulations,verificationPlans,onNavigate,onAskAi
}) => {
  const { selection } = useEngineeringContext();
  const relatedRequirements = domain ? requirements.filter(r => r.subsystemCode === domain) : [];
  const relatedSimulations = domain ? simulations.filter(s => s.discipline === domain) : [];
  const relatedPlans = domain ? verificationPlans.filter(v => v.subsystemCode === domain) : [];
  return <section className="dy-context-dock" aria-label="Contextual engineering dock">
    <div className="dy-dock-heading">
      <div><h2>Engineering context</h2><p>Discipline register entries for {selectedLabel}. Not CAD-linked evidence.</p></div>
      <span className="dy-evidence-tag">UNVERIFIED</span>
    </div>
    <div className="dy-dock-grid">
      <section className="dy-dock-cell">
        <ClipboardList size={18} aria-hidden="true"/>
        <h3>Requirements</h3>
        <strong>{domain ? relatedRequirements.length + ' loaded' : 'Not mapped'}</strong>
        <p>{domain ? (relatedRequirements[0]?.title ?? 'No requirement in this discipline') : 'Imported objects have no declared engineering allocation.'}</p>
        <button type="button" onClick={() => onNavigate(domain ? WORKSTREAM_MODULE[domain] : 'workstream-SYS')}>
          Open requirements <ArrowUpRight size={15}/></button>
      </section>
      <section className="dy-dock-cell">
        <FlaskConical size={18} aria-hidden="true"/>
        <h3>Analysis</h3>
        <strong>{domain ? relatedSimulations.length + ' loaded' : 'Not mapped'}</strong>
        <p>{domain ? (relatedSimulations[0]?.name ?? 'No simulation in this discipline') : 'No approved analysis is linked to this imported geometry.'}</p>
        <button type="button" onClick={() => onNavigate('simulations')}>
          Open simulations <ArrowUpRight size={15}/></button>
      </section>
      <section className="dy-dock-cell">
        <Bot size={18} aria-hidden="true"/>
        <h3>Agent investigation</h3>
        <strong>Draft authority only</strong>
        <p>Ask for a review question or open the existing orchestrator.</p>
        <button type="button" onClick={() => onAskAi
          ? onAskAi('Draft engineering review questions for '+selectedLabel+
             ' in USV-01. Selected configuration: '+(selection.configurationRevision??'TBD')+
             '. No fabricated results or approval claims.')
          : onNavigate('agent-orchestrator')}>
          {onAskAi?'Ask engineering AI':'Open agents'} <ArrowUpRight size={15}/>
        </button>
      </section>
      <section className="dy-dock-cell">
        <ShieldCheck size={18} aria-hidden="true"/>
        <h3>Verification</h3>
        <strong>{domain ? relatedPlans.length + ' loaded' : 'Not mapped'}</strong>
        <p>Loaded plans do not establish verified CAD provenance or release.</p>
        <button type="button" onClick={() => onNavigate('traceability')}>
          Open evidence <ArrowUpRight size={15}/></button>
      </section>
    </div>
    <p className="dy-dock-disclosure">
      These are discipline-level matches in existing registers, not verified component relationships. 
      Geometry source, configuration authority, analysis applicability and independent review must be established separately.
    </p>
  </section>;
};
