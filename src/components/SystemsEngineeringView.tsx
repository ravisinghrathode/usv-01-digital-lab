import React, { useState, useMemo } from 'react';
import {
  GitMerge,
  Plus,
  Download,
  Filter,
  CheckCircle,
  Clock,
  ArrowRight,
  Edit2,
  Trash2,
  ExternalLink,
  Search,
  Sparkles,
  Link2
} from 'lucide-react';
import { Requirement, EngineeringStatus, RequirementPriority, WorkstreamCode } from '../types/engineering';
import { getStatusBadgeClass, downloadCsv } from '../utils/engineeringUtils';

interface SystemsEngineeringViewProps {
  requirements: Requirement[];
  onAddRequirement: (req: Partial<Requirement>) => void;
  onUpdateRequirement: (id: string, updates: Partial<Requirement>) => void;
  onArchiveRequirement: (id: string) => void;
  onAskAi: (prompt: string, record?: any) => void;
  onOpenNewModal: (initialSubsystem?: WorkstreamCode) => void;
  filterSubsystem?: WorkstreamCode;
}

export const SystemsEngineeringView: React.FC<SystemsEngineeringViewProps> = ({
  requirements,
  onAddRequirement,
  onUpdateRequirement,
  onArchiveRequirement,
  onAskAi,
  onOpenNewModal,
  filterSubsystem
}) => {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Requirement>>({});

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter((r) => {
      if (filterSubsystem && r.subsystemCode !== filterSubsystem) return false;
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          r.id.toLowerCase().includes(query) ||
          r.title.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.category.toLowerCase().includes(query) ||
          r.owner.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [requirements, filterSubsystem, priorityFilter, statusFilter, search]);

  const handleExportCsv = () => {
    const headers = [
      'Requirement ID',
      'Subsystem',
      'Title',
      'Description',
      'Category',
      'Priority',
      'Verification Method',
      'Acceptance Criteria',
      'Owner',
      'Revision',
      'Status'
    ];
    const rows = filteredRequirements.map((r) => [
      r.id,
      r.subsystemCode,
      r.title,
      r.description,
      r.category,
      r.priority,
      r.verificationMethod,
      r.acceptanceCriteria,
      r.owner,
      r.revision,
      r.status
    ]);
    downloadCsv(`USV01_Requirements_Register_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const startEdit = (req: Requirement) => {
    setSelectedReq(req);
    setEditFormData({ ...req });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (selectedReq) {
      onUpdateRequirement(selectedReq.id, editFormData);
      setIsEditing(false);
      setSelectedReq({ ...selectedReq, ...editFormData } as Requirement);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Subsystem Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              SYS-01
            </span>
            <span className="text-xs text-slate-500 font-mono">SYSTEMS ENGINEERING REGISTER</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Requirements Baseline & Verification Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full-lifecycle traceability from mission needs to engineering requirements, verification methods, and acceptance thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenNewModal(filterSubsystem || 'SYS')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Requirement</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => onAskAi('Audit the requirements register for missing acceptance criteria, untraceable items, and TBD variables.', selectedReq)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Audit</span>
          </button>
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
            placeholder="Filter by ID, description, category, or owner..."
            className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" /> Priority:
          </span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50 font-mono"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <span className="text-[11px] text-slate-400 font-mono ml-2">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50 font-mono"
          >
            <option value="ALL">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="In Review">In Review</option>
            <option value="Draft">Draft</option>
            <option value="Superseded">Superseded</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Main Split Layout: Table on Left, Details/Traceability on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Requirements Table */}
        <div className={`${selectedReq ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all`}>
          <div className="bg-slate-900/90 border border-slate-800 rounded overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Req ID</th>
                    <th className="py-2.5 px-3">Subsystem</th>
                    <th className="py-2.5 px-3">Requirement Title</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredRequirements.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => {
                        setSelectedReq(req);
                        setIsEditing(false);
                      }}
                      className={`hover:bg-slate-800/60 cursor-pointer transition-colors ${
                        selectedReq?.id === req.id ? 'bg-slate-800/80 ring-1 ring-teal-500/30' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-mono text-teal-400 font-semibold whitespace-nowrap">
                        {req.id}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-400">
                        {req.subsystemCode}
                      </td>
                      <td className="py-2 px-3 text-slate-200 font-medium max-w-xs truncate">
                        {req.title}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            req.priority === 'Critical'
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                              : req.priority === 'High'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-400">
                        {req.verificationMethod}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${getStatusBadgeClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(req)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                            title="Edit Requirement"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onArchiveRequirement(req.id)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-rose-400"
                            title="Archive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredRequirements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        No requirements found matching current query or filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Total Shown: {filteredRequirements.length}</span>
              <span>Baseline Rev: 0.2</span>
            </div>
          </div>
        </div>

        {/* Details & Traceability Panel */}
        {selectedReq && (
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded p-4 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-teal-400">{selectedReq.id}</span>
                  <span className="text-[10px] font-mono text-slate-400">{selectedReq.revision}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${getStatusBadgeClass(selectedReq.status)}`}>
                    {selectedReq.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 mt-1">{selectedReq.title}</h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                <button
                  onClick={() => setSelectedReq(null)}
                  className="text-slate-500 hover:text-slate-300 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {isEditing ? (
              /* Inline Edit Form */
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={editFormData.title || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Acceptance Criteria</label>
                  <textarea
                    rows={2}
                    value={editFormData.acceptanceCriteria || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, acceptanceCriteria: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Priority</label>
                    <select
                      value={editFormData.priority || 'Medium'}
                      onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as RequirementPriority })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Status</label>
                    <select
                      value={editFormData.status || 'Draft'}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as EngineeringStatus })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
                    >
                      <option value="Draft">Draft</option>
                      <option value="In Review">In Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Superseded">Superseded</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="px-3 py-1.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              /* Readonly Details & Traceability */
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Description</h4>
                  <p className="text-slate-200 mt-1 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800/60">
                    {selectedReq.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Acceptance Criteria</h4>
                  <p className="text-slate-300 mt-1 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800/60 font-mono text-[11px]">
                    {selectedReq.acceptanceCriteria}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/60">
                    <span className="text-slate-500 font-mono block">Owner:</span>
                    <span className="text-slate-200 font-medium">{selectedReq.owner}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/60">
                    <span className="text-slate-500 font-mono block">Subsystem Allocation:</span>
                    <span className="text-slate-200 font-medium">{selectedReq.subsystemAllocation}</span>
                  </div>
                </div>

                {/* Requirements Traceability Triangle */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between pb-2">
                    <h4 className="text-[10px] font-mono text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 className="w-3 h-3" />
                      <span>Requirements Traceability Links</span>
                    </h4>
                    <span className="text-[9px] font-mono text-slate-500">INCOSE ALIGNED</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    {/* Linked Design Decision */}
                    <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-500 font-mono block text-[10px]">Downstream Design Decision:</span>
                      {selectedReq.relatedDecisions?.length ? (
                        selectedReq.relatedDecisions.map((dec) => (
                          <span key={dec} className="inline-block mt-1 font-mono text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/30">
                            {dec}
                          </span>
                        ))
                      ) : (
                        <span className="text-amber-400 font-mono text-[10px]">Pending Design Decision Allocation</span>
                      )}
                    </div>

                    {/* Linked Simulation Analysis */}
                    <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-500 font-mono block text-[10px]">Physics Analysis / Simulation Job:</span>
                      {selectedReq.relatedSimulations?.length ? (
                        selectedReq.relatedSimulations.map((sim) => (
                          <span key={sim} className="inline-block mt-1 font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/30">
                            {sim}
                          </span>
                        ))
                      ) : (
                        <span className="text-amber-400 font-mono text-[10px]">No CFD/FEA Job Linked</span>
                      )}
                    </div>

                    {/* Linked Verification Evidence */}
                    <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-500 font-mono block text-[10px]">Verification Procedure:</span>
                      {selectedReq.relatedVerifications?.length ? (
                        selectedReq.relatedVerifications.map((ver) => (
                          <span key={ver} className="inline-block mt-1 font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            {ver}
                          </span>
                        ))
                      ) : (
                        <span className="text-amber-400 font-mono text-[10px]">Pending Verification Plan Link</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Review Action for this requirement */}
                <button
                  onClick={() => onAskAi(`Review requirement ${selectedReq.id} ("${selectedReq.title}"). Is the acceptance criteria quantitatively verifiable? Are there missing TBD parameters or ambiguity?`, selectedReq)}
                  className="w-full mt-3 py-2 px-3 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Gemini to Verify Requirement Rigor</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
