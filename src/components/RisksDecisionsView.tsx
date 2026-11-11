import React, { useState } from 'react';
import {
  AlertTriangle,
  GitPullRequest,
  ShieldAlert,
  Plus,
  Download,
  Sparkles,
  CheckCircle,
  Clock,
  UserCheck,
  Info
} from 'lucide-react';
import { EngineeringRisk, DesignDecision, EngineeringStatus } from '../types/engineering';
import { getRiskSeverityClass, getStatusBadgeClass, downloadCsv } from '../utils/engineeringUtils';

interface RisksDecisionsViewProps {
  risks: EngineeringRisk[];
  decisions: DesignDecision[];
  onOpenNewRiskModal: () => void;
  onOpenNewDecisionModal: () => void;
  onUpdateDecisionStatus: (id: string, status: EngineeringStatus) => void;
  onAskAi: (prompt: string, record?: any) => void;
}

export const RisksDecisionsView: React.FC<RisksDecisionsViewProps> = ({
  risks,
  decisions,
  onOpenNewRiskModal,
  onOpenNewDecisionModal,
  onUpdateDecisionStatus,
  onAskAi
}) => {
  const [activeTab, setActiveTab] = useState<'decisions' | 'risks' | 'matrix'>('decisions');
  const [selectedDecision, setSelectedDecision] = useState<DesignDecision | null>(null);

  const handleExportDecisions = () => {
    const headers = ['Decision ID', 'Subsystem', 'Title', 'Problem Statement', 'Rationale', 'Reviewer', 'Approval State', 'Revision'];
    const rows = decisions.map(d => [d.id, d.subsystemCode, d.title, d.problemStatement, d.rationale, d.reviewer, d.approvalState, d.revision]);
    downloadCsv(`USV01_Design_Decisions_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleExportRisks = () => {
    const headers = ['Risk ID', 'Subsystem', 'Description', 'Probability', 'Impact', 'Risk Score', 'Mitigation', 'Owner', 'Status'];
    const rows = risks.map(r => [r.id, r.subsystemCode, r.description, r.probability, r.impact, r.riskScore, r.mitigation, r.owner, r.status]);
    downloadCsv(`USV01_Engineering_Risks_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
              GOVERNANCE
            </span>
            <span className="text-xs text-slate-500 font-mono">RISKS & ARCHITECTURAL DECISIONS</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Formal Design Decisions & Engineering Risk Register
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Systems trade-offs, evaluated alternatives, human reviewer sign-off workflows, and 5x5 quantitative risk mitigations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAskAi('Audit the open design decisions and high-priority risks. Compare the alternatives evaluated for hull form and battery chemistry and highlight any missing engineering trade-offs.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Governance Review</span>
          </button>
        </div>
      </div>

      {/* AI Ethics & Sign-off Warning */}
      <div className="p-3.5 rounded bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs">
        <Info className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-slate-200">Human Engineering Authority Mandate</h4>
          <p className="text-slate-400 mt-0.5 leading-relaxed">
            Per system rules, AI-generated trade studies and design recommendations are classified as <strong>proposals</strong>. No AI suggestion may ever be automatically marked as Approved. Safety-critical decisions require explicit sign-off by a designated lead engineer.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-1 text-xs font-mono">
        <button
          onClick={() => setActiveTab('decisions')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'decisions'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Design Decision Register ({decisions.length})
        </button>
        <button
          onClick={() => setActiveTab('risks')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'risks'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Engineering Risk Register ({risks.length})
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'matrix'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          5x5 Probability-Impact Matrix
        </button>
      </div>

      {/* TAB 1: Design Decisions */}
      {activeTab === 'decisions' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-teal-400" />
                <span>Formal Architectural Decisions Register</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenNewDecisionModal}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Decision</span>
                </button>
                <button
                  onClick={handleExportDecisions}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                >
                  <Download className="w-3 h-3" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {decisions.map((dec) => (
                <div key={dec.id} className="p-4 rounded bg-slate-950 border border-slate-800 text-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-teal-400 font-bold">{dec.id}</span>
                      <span className="font-mono text-slate-500">[{dec.subsystemCode}]</span>
                      <h4 className="text-slate-100 font-semibold">{dec.title}</h4>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadgeClass(dec.approvalState)}`}>
                      {dec.approvalState}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Problem Statement</span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">{dec.problemStatement}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Alternatives Evaluated</span>
                    <ul className="mt-1 space-y-1 text-slate-400 font-mono text-[11px]">
                      {dec.alternatives.map((alt, idx) => (
                        <li key={idx} className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                          {alt}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80">
                    <span className="text-teal-400 font-mono text-[10px] uppercase font-semibold block">Engineering Rationale:</span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">{dec.rationale}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                    <span>Reviewer: {dec.reviewer} • Rev: {dec.revision}</span>
                    <div className="flex items-center gap-1.5">
                      <span>Sign-off state:</span>
                      <button
                        onClick={() => onUpdateDecisionStatus(dec.id, 'Approved')}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onUpdateDecisionStatus(dec.id, 'In Review')}
                        className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                      >
                        Stage In Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Engineering Risks */}
      {activeTab === 'risks' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Technical Risk Assessment & Mitigation Register</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenNewRiskModal}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Risk</span>
                </button>
                <button
                  onClick={handleExportRisks}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                >
                  <Download className="w-3 h-3" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {risks.map((r) => {
                const sev = getRiskSeverityClass(r.riskScore);
                return (
                  <div key={r.id} className="p-3.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-rose-400 font-bold">{r.id}</span>
                        <span className="font-mono text-slate-500">[{r.subsystemCode}]</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sev.bg}`}>
                          P={r.probability} × I={r.impact} = Score {r.riskScore} ({sev.label})
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </div>

                    <p className="text-slate-200 leading-relaxed">{r.description}</p>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                      <strong className="text-slate-300 font-mono text-[10px] uppercase">Engineered Mitigation:</strong>
                      <p className="text-slate-300 mt-0.5">{r.mitigation}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                      <span>Owner: {r.owner}</span>
                      <span>Recorded: {r.createdAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 5x5 Matrix */}
      {activeTab === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs font-mono">
          <h3 className="text-xs font-semibold text-slate-200 pb-3 border-b border-slate-800">
            5×5 Probability vs Impact Risk Matrix
          </h3>

          <div className="grid grid-cols-6 gap-1 mt-4 text-center">
            <div className="p-2 text-slate-500 font-bold">P \ I</div>
            <div className="p-2 text-slate-400">1 (Negligible)</div>
            <div className="p-2 text-slate-400">2 (Minor)</div>
            <div className="p-2 text-slate-400">3 (Moderate)</div>
            <div className="p-2 text-slate-400">4 (Major)</div>
            <div className="p-2 text-slate-400">5 (Catastrophic)</div>

            {[5, 4, 3, 2, 1].map((p) => (
              <React.Fragment key={p}>
                <div className="p-2 text-slate-400 font-bold self-center">{p}</div>
                {[1, 2, 3, 4, 5].map((i) => {
                  const score = p * i;
                  const matchingRisks = risks.filter(r => r.probability === p && r.impact === i);
                  let bg = 'bg-slate-950 text-slate-500';
                  if (score >= 15) bg = 'bg-red-950/60 border border-red-800 text-red-300';
                  else if (score >= 9) bg = 'bg-amber-950/60 border border-amber-800 text-amber-300';
                  else if (score >= 4) bg = 'bg-yellow-950/40 border border-yellow-800/60 text-yellow-300';
                  else bg = 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300';

                  return (
                    <div key={i} className={`p-2.5 rounded min-h-[50px] flex flex-col items-center justify-center ${bg}`}>
                      <span className="text-[10px] font-bold opacity-60">{score}</span>
                      {matchingRisks.map(r => (
                        <span key={r.id} className="text-[9px] font-bold mt-0.5 px-1 rounded bg-black/40 text-white">
                          {r.id}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
