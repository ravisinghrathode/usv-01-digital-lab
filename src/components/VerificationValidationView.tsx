import React, { useState } from 'react';
import {
  CheckCircle2,
  FileCheck,
  Download,
  Plus,
  Sparkles,
  Link2,
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { VerificationPlan, TestRecord, EngineeringStatus } from '../types/engineering';
import { getStatusBadgeClass, downloadCsv } from '../utils/engineeringUtils';

interface VerificationValidationViewProps {
  plans: VerificationPlan[];
  testRecords: TestRecord[];
  onAddPlan?: (plan: Partial<VerificationPlan>) => void;
  onOpenNewModal: () => void;
  onAskAi: (prompt: string, record?: any) => void;
}

export const VerificationValidationView: React.FC<VerificationValidationViewProps> = ({
  plans,
  testRecords,
  onOpenNewModal,
  onAskAi
}) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'records' | 'traceability'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<VerificationPlan | null>(null);

  const handleExportPlans = () => {
    const headers = ['Plan ID', 'Subsystem', 'Title', 'Procedure Summary', 'Acceptance Criteria', 'Instrumentation', 'Target Req IDs', 'Status'];
    const rows = plans.map(p => [p.id, p.subsystemCode, p.title, p.procedureSummary, p.acceptanceCriteria, p.instrumentationAndCalibration, p.targetReqIds.join('; '), p.status]);
    downloadCsv(`USV01_Verification_Plans_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              VNV-08
            </span>
            <span className="text-xs text-slate-500 font-mono">VERIFICATION & VALIDATION WORKSPACE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Verification Plans, Test Execution Records & Evidence Archive
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Formal factory acceptance testing (FAT), calibrated instrumentation logs, non-conformance deviations, and requirement closure evidence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Verification Plan</span>
          </button>
          <button
            onClick={() => onAskAi('Audit the verification plan register. Identify requirements that lack formal test procedures, calibrated instrument certificates, or physical evidence.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI V&V Audit</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-1 text-xs font-mono">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'plans'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Verification Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'records'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Executed Test Records ({testRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('traceability')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'traceability'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Requirement Closure Status
        </button>
      </div>

      {/* TAB 1: Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-400" />
                <span>Verification Procedure Register</span>
              </h3>
              <button
                onClick={handleExportPlans}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                <Download className="w-3 h-3" />
                <span>Export Plans CSV</span>
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {plans.map((plan) => (
                <div key={plan.id} className="p-3.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-teal-400 font-bold">{plan.id}</span>
                      <span className="font-mono text-slate-500">[{plan.subsystemCode}]</span>
                      <h4 className="text-slate-100 font-semibold">{plan.title}</h4>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadgeClass(plan.status)}`}>
                      {plan.status}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-300">
                    <strong className="text-slate-400 block font-mono text-[10px] uppercase">Procedure Summary:</strong>
                    {plan.procedureSummary}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                      <span className="text-slate-500 block">Acceptance Criteria:</span>
                      <span className="text-emerald-400">{plan.acceptanceCriteria}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                      <span className="text-slate-500 block">Calibrated Instruments:</span>
                      <span className="text-slate-300">{plan.instrumentationAndCalibration}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[10px] font-mono pt-1 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span>Target Requirements:</span>
                      {plan.targetReqIds.map(req => (
                        <span key={req} className="text-teal-400 bg-teal-500/10 px-1 py-0.2 rounded border border-teal-500/20">
                          {req}
                        </span>
                      ))}
                    </div>
                    <span>Owner: {plan.owner}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Executed Records */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Physical Test & Trial Execution Evidence Records</span>
            </h3>

            {testRecords.map((rec) => (
              <div key={rec.id} className="p-3.5 bg-slate-950 rounded border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-bold">{rec.id}</span>
                    <span className="font-mono text-slate-400">Plan: {rec.planId}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadgeClass(rec.resultStatus)}`}>
                    {rec.resultStatus}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200">
                  <strong className="text-slate-400 font-mono block text-[10px]">Measured Physical Data:</strong>
                  {rec.measuredDataSummary}
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                  <span>Executed By: {rec.executingEngineer} on {rec.testDate}</span>
                  <span>Approved By: {rec.approver} ({rec.approvalStatus})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Traceability */}
      {activeTab === 'traceability' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800">
            Requirements-to-Verification Evidence Traceability
          </h3>
          <p className="text-slate-400 leading-relaxed">
            Every approved requirement in the systems baseline must be backed by a verified test record or approved simulation dossier before project critical design review (CDR).
          </p>
        </div>
      )}
    </div>
  );
};
