import React from 'react';
import {
  ShieldAlert,
  GitPullRequest,
  CheckCircle,
  Activity,
  Layers,
  ArrowUpRight,
  Clock,
  UserCheck,
  AlertOctagon,
  Compass,
  Hammer
} from 'lucide-react';
import {
  WorkstreamSummary,
  Requirement,
  DesignDecision,
  EngineeringRisk,
  SimulationJob,
  VerificationPlan,
  ActivityLogItem
} from '../types/engineering';
import { getStatusBadgeClass, getRiskSeverityClass } from '../utils/engineeringUtils';
import { NavigationModule } from './NavigationSidebar';

interface ProjectOverviewProps {
  workstreams: WorkstreamSummary[];
  requirements: Requirement[];
  decisions: DesignDecision[];
  risks: EngineeringRisk[];
  simulations: SimulationJob[];
  verificationPlans: VerificationPlan[];
  activityLogs: ActivityLogItem[];
  onNavigate: (module: NavigationModule) => void;
  onAskAi: (prompt: string) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  workstreams,
  requirements,
  decisions,
  risks,
  simulations,
  verificationPlans,
  activityLogs,
  onNavigate,
  onAskAi
}) => {
  // Calculated stats
  const approvedReqs = requirements.filter(r => r.status === 'Approved').length;
  const inReviewReqs = requirements.filter(r => r.status === 'In Review').length;
  const draftReqs = requirements.filter(r => r.status === 'Draft').length;
  const reqCompletion = requirements.length ? Math.round((approvedReqs / requirements.length) * 100) : 0;

  const approvedDecisions = decisions.filter(d => d.approvalState === 'Approved').length;
  const pendingDecisions = decisions.filter(d => d.approvalState === 'In Review' || d.approvalState === 'Draft');

  const highRisks = risks.filter(r => r.riskScore >= 10 && r.status !== 'Closed');
  const activeSims = simulations.filter(s => s.runStatus === 'Running' || s.runStatus === 'Under Review' || s.runStatus === 'Queued');
  const verifiedPlans = verificationPlans.filter(v => v.status === 'Approved' || v.status === 'Executed').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Executive Command Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 font-mono text-xs">
                USV-01 DIGITAL ENGINEERING LAB
              </span>
              <span className="text-slate-400 text-xs font-mono">•</span>
              <span className="text-slate-400 text-xs font-mono">BASELINE REV 0.2</span>
              <span className="text-slate-400 text-xs font-mono">•</span>
              <span className="text-emerald-400 text-xs font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ACTIVE LIFECYCLE
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-1">
              Unmanned Surface Vessel Multi-Disciplinary Engineering Workspace
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Unified digital engineering baseline across 8 primary subsystems. Enforcing strict traceability from top-level requirements to verified CFD/FEA runs and certified sea trials.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              onClick={() => onAskAi('Summarize the top engineering risks, pending decisions, and missing TBD parameters for the USV-01 project overview.')}
              className="px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>AI Executive Synthesis</span>
            </button>
          </div>
        </div>

        {/* Mandatory Engineering Governance Notice */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong className="text-slate-200">Zero-Fabrication Policy:</strong> Vessel physical particulars (LOA, Beam, Draft, Power, GM) remain <span className="font-mono text-amber-300 font-bold bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">TBD</span> until certified by hydrodynamic testing or approved engineering baseline dossiers.
            </span>
          </div>
          <div className="font-mono text-[10px] text-slate-500">
            IMO MSC.267(85) • DNV-RU-HSLC • IEEE 45
          </div>
        </div>
      </div>

      {/* Primary KPI Meters (Compact, Technical) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Requirements Completion */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Requirements Baselined</span>
            <GitPullRequest className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold font-mono text-slate-100">
              {approvedReqs} <span className="text-xs text-slate-500 font-normal">/ {requirements.length}</span>
            </div>
            <span className="text-xs font-mono text-teal-400">{reqCompletion}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full transition-all" style={{ width: `${reqCompletion}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
            <span>In Review: {inReviewReqs}</span>
            <span>Draft: {draftReqs}</span>
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Verification Procedures</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold font-mono text-slate-100">
              {verifiedPlans} <span className="text-xs text-slate-500 font-normal">/ {verificationPlans.length}</span>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              {verificationPlans.length ? Math.round((verifiedPlans / verificationPlans.length) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${verificationPlans.length ? (verifiedPlans / verificationPlans.length) * 100 : 0}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1.5">
            1 FAT Passed • 2 Procedures Staged
          </div>
        </div>

        {/* Open Engineering Decisions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pending Decisions</span>
            <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold font-mono text-amber-300">
              {pendingDecisions.length}
            </div>
            <span className="text-xs font-mono text-slate-400">
              {approvedDecisions} Approved
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-3 truncate">
            {pendingDecisions[0]?.title ? `Next: ${pendingDecisions[0].id}` : 'All decisions current'}
          </div>
        </div>

        {/* High Priority Risks */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>High-Priority Risks</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold font-mono text-rose-300">
              {highRisks.length}
            </div>
            <span className="text-xs font-mono text-slate-500">
              Total Logged: {risks.length}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-3">
            Mitigation tracking active
          </div>
        </div>
      </div>

      {/* Featured Live Modules: Real-Time Simulator & Physical Shipbuilding Lifecycle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Real-time Simulator Card */}
        <div
          onClick={() => onNavigate('realtime-sim')}
          className="p-4 rounded-lg bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-900 border border-teal-500/30 hover:border-teal-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded bg-teal-500/20 text-teal-400 border border-teal-500/40">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] text-teal-400 font-bold uppercase tracking-wider">Interactive Live Simulator</span>
                <h4 className="text-sm font-bold text-slate-100 group-hover:text-teal-300 transition-colors">
                  Real-Time COLREGs Radar & Flotation Wave Tank
                </h4>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-teal-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Test autonomous obstacle avoidance (Rules 13, 14, 15) with dynamic radar sweeps, CPA/TCPA vectors, and Archimedes wave tank flotation restoration in real time.
          </p>
          <div className="mt-3 flex items-center gap-2 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">60 FPS Radar</span>
            <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">COLREGs Kinematics</span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">Hydrostatic Physics</span>
          </div>
        </div>

        {/* Physical Shipbuilding Card */}
        <div
          onClick={() => onNavigate('ship-building')}
          className="p-4 rounded-lg bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 hover:border-amber-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Hammer className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] text-amber-400 font-bold uppercase tracking-wider">Physical Manufacturing</span>
                <h4 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                  Shipbuilding Lifecycle & Commissioning Roadmap
                </h4>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Step-by-step 9-phase physical construction tracker from 5-axis CNC hull tooling, vacuum resin infusion, and electric pod outfitting to basin inclining and open-water sea trials.
          </p>
          <div className="mt-3 flex items-center gap-2 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">9 Build Stages</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">QC Checklists</span>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">Profile Cutaway</span>
          </div>
        </div>
      </div>

      {/* 8 Primary Engineering Workstreams Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Engineering Workstreams (8 Primary Disciplines)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Authoritative workstream health, progress, and pending items.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 hidden sm:inline">
            CLICK CARD TO ENTER DISCIPLINE WORKSPACE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {workstreams.map((ws) => (
            <div
              key={ws.code}
              onClick={() => onNavigate(`workstream-${ws.code}` as NavigationModule)}
              className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 rounded p-3.5 cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-400 group-hover:text-teal-300">
                    {ws.code}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${getStatusBadgeClass(ws.status)}`}>
                    {ws.status}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-200 mt-1.5 group-hover:text-white">
                  {ws.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {ws.description}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Lead: {ws.lead.split(' ')[0]} {ws.lead.split(' ')[1] || ''}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <span>Open Items: {ws.openItemsCount}</span>
                  <span>Rev: 0.2</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Split Section: Pending Decisions & High Priority Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Open Engineering Decisions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              <span>Open Engineering Decisions</span>
            </h3>
            <button
              onClick={() => onNavigate('risks-decisions')}
              className="text-[11px] font-mono text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              View Register <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 space-y-2.5 flex-1">
            {decisions.slice(0, 3).map((dec) => (
              <div key={dec.id} className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-teal-400 font-semibold">{dec.id}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${getStatusBadgeClass(dec.approvalState)}`}>
                    {dec.approvalState}
                  </span>
                </div>
                <p className="font-medium text-slate-200 mt-1">{dec.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {dec.problemStatement}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Reviewer: {dec.reviewer}</span>
                  <span>Subsystem: {dec.subsystemCode}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High Priority Risks */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>High-Priority Engineering Risks</span>
            </h3>
            <button
              onClick={() => onNavigate('risks-decisions')}
              className="text-[11px] font-mono text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              View Risk Matrix <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 space-y-2.5 flex-1">
            {risks.slice(0, 3).map((rsk) => {
              const sev = getRiskSeverityClass(rsk.riskScore);
              return (
                <div key={rsk.id} className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-rose-400 font-semibold">{rsk.id}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${sev.bg}`}>
                      Score: {rsk.riskScore} ({sev.label})
                    </span>
                  </div>
                  <p className="text-slate-200 mt-1 leading-relaxed">{rsk.description}</p>
                  <div className="mt-1.5 p-1.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                    <strong className="text-slate-300">Mitigation:</strong> {rsk.mitigation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Split Section: Simulation Activity & Recent Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Simulation Activity */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              <span>Simulation & HPC Analysis Activity</span>
            </h3>
            <button
              onClick={() => onNavigate('simulations')}
              className="text-[11px] font-mono text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              Simulation Centre <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {simulations.slice(0, 3).map((sim) => (
              <div key={sim.id} className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-teal-400 font-semibold">{sim.id}</span>
                    <span className="font-mono text-[10px] text-slate-500">[{sim.discipline}]</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${getStatusBadgeClass(sim.runStatus)}`}>
                    {sim.runStatus}
                  </span>
                </div>
                <p className="font-medium text-slate-200 mt-1">{sim.name}</p>
                <div className="mt-1 text-[11px] font-mono text-slate-400">
                  Solver: {sim.solver} • Env: {sim.computeEnvironment}
                </div>
                <div className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  {sim.resultsSummary}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Project Audit Trail */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Recent Engineering Activity & Audit Log</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">IMMUTABLE LOG</span>
          </div>

          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
            {activityLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="p-2 rounded bg-slate-950/60 border border-slate-800/60 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-teal-400 font-semibold">{log.action}</span>
                    <span>[{log.recordType}]</span>
                    <span className="text-slate-500">{log.recordId}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{log.timestamp}</span>
                </div>
                <p className="text-slate-300 mt-1">{log.details}</p>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  By: {log.userName}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
