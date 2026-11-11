import React, { useState } from 'react';
import {
  Network,
  Download,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Sparkles,
  Link2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Requirement, DesignDecision, SimulationJob, VerificationPlan, TestRecord } from '../types/engineering';
import { getStatusBadgeClass, downloadCsv } from '../utils/engineeringUtils';

interface TraceabilityMatrixViewProps {
  requirements: Requirement[];
  decisions: DesignDecision[];
  simulations: SimulationJob[];
  verificationPlans: VerificationPlan[];
  testRecords: TestRecord[];
  onAskAi: (prompt: string) => void;
}

export const TraceabilityMatrixView: React.FC<TraceabilityMatrixViewProps> = ({
  requirements,
  decisions,
  simulations,
  verificationPlans,
  testRecords,
  onAskAi
}) => {
  const [filterGapOnly, setFilterGapOnly] = useState(false);

  // Analyze traceability chains
  const matrixRows = requirements.map((req) => {
    const linkedDecisions = decisions.filter(d => req.relatedDecisions?.includes(d.id));
    const linkedSims = simulations.filter(s => req.relatedSimulations?.includes(s.id));
    const linkedPlans = verificationPlans.filter(p => req.relatedVerifications?.includes(p.id) || p.targetReqIds?.includes(req.id));
    const linkedTests = testRecords.filter(t => linkedPlans.some(p => p.id === t.planId));

    const hasDecision = linkedDecisions.length > 0;
    const hasVerification = linkedPlans.length > 0;
    const isComplete = hasDecision && hasVerification;
    const hasGap = !isComplete;

    return {
      req,
      linkedDecisions,
      linkedSims,
      linkedPlans,
      linkedTests,
      isComplete,
      hasGap
    };
  });

  const displayedRows = filterGapOnly ? matrixRows.filter(r => r.hasGap) : matrixRows;

  const handleExportCsv = () => {
    const headers = ['Requirement ID', 'Title', 'Subsystem', 'Linked Decisions', 'Linked Simulations', 'Linked Verification Plans', 'Linked Test Records', 'Traceability State'];
    const rows = matrixRows.map(r => [
      r.req.id,
      r.req.title,
      r.req.subsystemCode,
      r.linkedDecisions.map(d => d.id).join('; ') || 'GAP: Missing Decision',
      r.linkedSims.map(s => s.id).join('; ') || 'None',
      r.linkedPlans.map(p => p.id).join('; ') || 'GAP: Missing Test Plan',
      r.linkedTests.map(t => t.id).join('; ') || 'None',
      r.isComplete ? 'COMPLETE' : 'TRACEABILITY GAP'
    ]);
    downloadCsv(`USV01_Traceability_Matrix_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const totalGaps = matrixRows.filter(r => r.hasGap).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              TRACEABILITY
            </span>
            <span className="text-xs text-slate-500 font-mono">CROSS-DISCIPLINE REQUIREMENTS MATRIX</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            End-to-End Systems Engineering Traceability Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            INCOSE / ISO 15288 compliance mapping: Requirement → Architectural Decision → Physics Analysis → Test Verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Traceability CSV</span>
          </button>
          <button
            onClick={() => onAskAi('Audit the requirements traceability matrix. Enumerate all traceability gaps where a requirement has no assigned verification plan or design decision.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Traceability Audit</span>
          </button>
        </div>
      </div>

      {/* Gap Metrics Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-mono">Total Tracked Requirements</span>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">{requirements.length}</div>
          </div>
          <ShieldCheck className="w-6 h-6 text-teal-400" />
        </div>

        <div className="p-3.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-mono">Full End-to-End Traced</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {requirements.length - totalGaps} <span className="text-xs text-slate-500 font-normal">/ {requirements.length}</span>
            </div>
          </div>
          <CheckCircle className="w-6 h-6 text-emerald-400" />
        </div>

        <div className="p-3.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-mono">Pending Traceability Gaps</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">{totalGaps}</div>
          </div>
          <button
            onClick={() => setFilterGapOnly(!filterGapOnly)}
            className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
              filterGapOnly ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {filterGapOnly ? 'Showing Gaps Only' : 'Filter Gaps'}
          </button>
        </div>
      </div>

      {/* Traceability Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                <th className="py-2.5 px-3">Req ID & Discipline</th>
                <th className="py-2.5 px-3">Requirement Title</th>
                <th className="py-2.5 px-3">Architectural Decision</th>
                <th className="py-2.5 px-3">Physics / Simulation</th>
                <th className="py-2.5 px-3">Verification Procedure</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {displayedRows.map(({ req, linkedDecisions, linkedSims, linkedPlans, isComplete, hasGap }) => (
                <tr key={req.id} className="hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                    <span className="text-teal-400 font-bold block">{req.id}</span>
                    <span className="text-[10px] text-slate-500">[{req.subsystemCode}]</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200 max-w-xs">
                    <div className="font-medium truncate">{req.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{req.description}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    {linkedDecisions.length > 0 ? (
                      linkedDecisions.map(d => (
                        <span key={d.id} className="inline-block p-1 rounded bg-slate-950 border border-slate-800 text-teal-400 mr-1 mb-1">
                          {d.id}
                        </span>
                      ))
                    ) : (
                      <span className="text-amber-400 text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Unallocated
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    {linkedSims.length > 0 ? (
                      linkedSims.map(s => (
                        <span key={s.id} className="inline-block p-1 rounded bg-slate-950 border border-slate-800 text-sky-400 mr-1 mb-1">
                          {s.id}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-[10px]">N/A / Inspection</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    {linkedPlans.length > 0 ? (
                      linkedPlans.map(p => (
                        <span key={p.id} className="inline-block p-1 rounded bg-slate-950 border border-slate-800 text-emerald-400 mr-1 mb-1">
                          {p.id}
                        </span>
                      ))
                    ) : (
                      <span className="text-amber-400 text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Missing Plan
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        isComplete
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isComplete ? 'TRACED' : 'GAP ACTIVE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
