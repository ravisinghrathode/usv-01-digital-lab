import React, { useState, useMemo } from 'react';
import {
  Activity,
  Plus,
  Download,
  Filter,
  ExternalLink,
  Sparkles,
  Search,
  Server,
  Layers,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { SimulationJob, SimulationRunStatus, WorkstreamCode } from '../types/engineering';
import { getStatusBadgeClass, downloadCsv } from '../utils/engineeringUtils';

interface SimulationCentreViewProps {
  simulations: SimulationJob[];
  onOpenNewSimModal: () => void;
  onUpdateSimStatus: (id: string, newStatus: SimulationRunStatus) => void;
  onAskAi: (prompt: string, record?: any) => void;
}

export const SimulationCentreView: React.FC<SimulationCentreViewProps> = ({
  simulations,
  onOpenNewSimModal,
  onUpdateSimStatus,
  onAskAi
}) => {
  const [disciplineFilter, setDisciplineFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<SimulationJob | null>(null);

  const filteredSims = useMemo(() => {
    return simulations.filter((s) => {
      if (disciplineFilter !== 'ALL' && s.discipline !== disciplineFilter) return false;
      if (statusFilter !== 'ALL' && s.runStatus !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.solver.toLowerCase().includes(q) ||
          s.assumptions.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [simulations, disciplineFilter, statusFilter, search]);

  const handleExportCsv = () => {
    const headers = [
      'Sim ID',
      'Discipline',
      'Job Name',
      'Geometry Rev',
      'Solver',
      'Compute Environment',
      'Run Status',
      'Validation Status',
      'Reviewer'
    ];
    const rows = filteredSims.map((s) => [
      s.id,
      s.discipline,
      s.name,
      s.geometryRevision,
      s.solver,
      s.computeEnvironment,
      s.runStatus,
      s.validationStatus,
      s.reviewer
    ]);
    downloadCsv(`USV01_Simulation_Jobs_Registry_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              SIM-CENTRE
            </span>
            <span className="text-xs text-slate-500 font-mono">MULTI-PHYSICS ANALYSIS REGISTRY</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            HPC Simulation Job Tracker & Verification Archive
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Central repository for OpenFOAM CFD, CalculiX/Code_Aster FEA, and Gazebo Monte Carlo simulation records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenNewSimModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Simulation Run</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => onAskAi('Review the simulation centre registry. Check for unverified numerical assumptions, convergence discrepancies, and ensure no fictional results are marked as approved.', selectedJob)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Simulation Audit</span>
          </button>
        </div>
      </div>

      {/* HPC Integrity Note */}
      <div className="p-3.5 rounded bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs">
        <Server className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-slate-200">Simulation Data Integrity Rule</h4>
          <p className="text-slate-400 mt-0.5 leading-relaxed">
            CFD and FEA are executed on dedicated HPC Linux clusters and recorded here with authoritative metadata (geometry hash, mesh count, boundary conditions, turbulence model). In compliance with engineering ethics, <strong>no fictional simulation numbers are presented as certified engineering data</strong>.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-3 rounded border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search simulation jobs, solvers, boundary conditions..."
            className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] text-slate-400 font-mono">Discipline:</span>
          <select
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
          >
            <option value="ALL">All Disciplines</option>
            <option value="HYD">HYD (Hydrodynamics)</option>
            <option value="MEC">MEC (Structural/FEA)</option>
            <option value="AUT">AUT (Autonomy)</option>
            <option value="NAV">NAV (Naval Arch)</option>
            <option value="Multi-Physics">Multi-Physics</option>
          </select>

          <span className="text-[11px] text-slate-400 font-mono ml-2">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
          >
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Ready">Ready</option>
            <option value="Queued">Queued</option>
            <option value="Running">Running</option>
            <option value="Completed">Completed</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Simulation Jobs List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`${selectedJob ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
          {filteredSims.map((sim) => (
            <div
              key={sim.id}
              onClick={() => setSelectedJob(sim)}
              className={`p-4 rounded bg-slate-900 border transition-all cursor-pointer ${
                selectedJob?.id === sim.id
                  ? 'border-teal-400 bg-slate-850 ring-1 ring-teal-500/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-teal-400 font-bold text-xs">{sim.id}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {sim.discipline}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-100">{sim.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadgeClass(sim.runStatus)}`}>
                    {sim.runStatus}
                  </span>
                  {sim.externalRefUrl && (
                    <a
                      href={sim.externalRefUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-teal-400 text-xs"
                      onClick={(e) => e.stopPropagation()}
                      title="External HPC Run Folder"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">SOLVER:</span>
                  <span className="text-slate-200 truncate block">{sim.solver}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">COMPUTE ENV:</span>
                  <span className="text-slate-200 truncate block">{sim.computeEnvironment}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">CAD REV:</span>
                  <span className="text-slate-200 truncate block">{sim.geometryRevision}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-2.5 line-clamp-2 leading-relaxed">
                {sim.resultsSummary}
              </p>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Reviewer: {sim.reviewer}</span>
                <span>Validation: {sim.validationStatus}</span>
              </div>
            </div>
          ))}

          {filteredSims.length === 0 && (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded text-slate-500 text-xs">
              No simulation jobs found matching selected filters.
            </div>
          )}
        </div>

        {/* Selected Job Inspection Panel */}
        {selectedJob && (
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded p-4 text-xs space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-teal-400">{selectedJob.id}</span>
                  <span className="text-[10px] font-mono text-slate-400">[{selectedJob.discipline}]</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${getStatusBadgeClass(selectedJob.runStatus)}`}>
                    {selectedJob.runStatus}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 mt-1">{selectedJob.name}</h3>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-slate-500 hover:text-slate-300 text-xs px-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Mesh & Inputs</span>
                <p className="text-slate-300 font-mono text-[11px] mt-0.5 bg-slate-950 p-2 rounded border border-slate-800">
                  {selectedJob.inputConfiguration}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Boundary Conditions</span>
                <p className="text-slate-300 font-mono text-[11px] mt-0.5 bg-slate-950 p-2 rounded border border-slate-800">
                  {selectedJob.boundaryConditions}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Reference Frame & Units</span>
                <p className="text-slate-400 font-mono text-[11px] mt-0.5">
                  {selectedJob.unitsAndReferenceFrame}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Physical Assumptions</span>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  {selectedJob.assumptions}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono text-teal-400 uppercase block font-semibold">Results Summary</span>
                <p className="text-slate-200 text-xs mt-0.5 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800">
                  {selectedJob.resultsSummary}
                </p>
              </div>

              {/* Status Update Quick Buttons */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block mb-1.5">Change Run Status:</span>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                  {(['Ready', 'Queued', 'Running', 'Completed', 'Under Review', 'Approved', 'Failed'] as SimulationRunStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => onUpdateSimStatus(selectedJob.id, st)}
                      className={`px-2 py-0.5 rounded border transition-colors ${
                        selectedJob.runStatus === st
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
