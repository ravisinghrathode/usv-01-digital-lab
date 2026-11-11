import React, { useState } from 'react';
import {
  Package,
  Plus,
  Download,
  Filter,
  Search,
  ExternalLink,
  Sparkles,
  DollarSign,
  Clock,
  Layers
} from 'lucide-react';
import { ComponentBOM, WorkstreamCode } from '../types/engineering';
import { getStatusBadgeClass, downloadCsv } from '../utils/engineeringUtils';

interface ProcurementBOMViewProps {
  components: ComponentBOM[];
  onOpenNewModal: () => void;
  onAskAi: (prompt: string, record?: any) => void;
}

export const ProcurementBOMView: React.FC<ProcurementBOMViewProps> = ({
  components,
  onOpenNewModal,
  onAskAi
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subsystemFilter, setSubsystemFilter] = useState('ALL');

  const filteredComponents = components.filter((c) => {
    if (statusFilter !== 'ALL' && c.procurementStatus !== statusFilter) return false;
    if (subsystemFilter !== 'ALL' && c.subsystemCode !== subsystemFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        c.partNumber.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.manufacturer.toLowerCase().includes(q) ||
        c.supplier.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCsv = () => {
    const headers = ['BOM ID', 'Subsystem', 'Part Number', 'Description', 'Manufacturer', 'Supplier', 'Quantity', 'Unit Cost', 'Lead Time', 'Status'];
    const rows = filteredComponents.map(c => [c.id, c.subsystemCode, c.partNumber, c.description, c.manufacturer, c.supplier, c.quantity, c.unitCost, c.leadTimeWeeks, c.procurementStatus]);
    downloadCsv(`USV01_Bill_of_Materials_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              BOM-LOGISTICS
            </span>
            <span className="text-xs text-slate-500 font-mono">BILL OF MATERIALS & PROCUREMENT</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Engineering Bill of Materials & Long-Lead Hardware Tracker
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Component specifications, supplier quotations, datasheets, lead times, and receiving inspection workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Component</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => onAskAi('Analyze the bill of materials lead times and procurement status. Highlight any critical path items that jeopardize assembly schedule.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Supply Chain Analysis</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-3 rounded border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search part numbers, descriptions, suppliers..."
            className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] text-slate-400 font-mono">Subsystem:</span>
          <select
            value={subsystemFilter}
            onChange={(e) => setSubsystemFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
          >
            <option value="ALL">All Subsystems</option>
            <option value="AUT">AUT (Autonomy)</option>
            <option value="ELE">ELE (Electrical)</option>
            <option value="PRP">PRP (Propulsion)</option>
            <option value="MEC">MEC (Mechanical)</option>
            <option value="NAV">NAV (Naval Arch)</option>
          </select>

          <span className="text-[11px] text-slate-400 font-mono ml-2">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
          >
            <option value="ALL">All Statuses</option>
            <option value="Specifying">Specifying</option>
            <option value="Quoted">Quoted</option>
            <option value="Ordered">Ordered</option>
            <option value="Received">Received</option>
            <option value="In Inspection">In Inspection</option>
            <option value="Installed">Installed</option>
          </select>
        </div>
      </div>

      {/* BOM Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                <th className="py-2.5 px-3">BOM ID</th>
                <th className="py-2.5 px-3">Subsystem</th>
                <th className="py-2.5 px-3">Part Number</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Manufacturer / Supplier</th>
                <th className="py-2.5 px-3">Qty</th>
                <th className="py-2.5 px-3">Unit Cost</th>
                <th className="py-2.5 px-3">Lead Time</th>
                <th className="py-2.5 px-3">Procurement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredComponents.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 font-mono text-teal-400 font-bold whitespace-nowrap">{item.id}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">{item.subsystemCode}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-200 font-semibold">{item.partNumber}</td>
                  <td className="py-2.5 px-3 text-slate-200 max-w-xs">{item.description}</td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    <div>{item.manufacturer}</div>
                    <div className="text-slate-500 font-mono text-[10px]">Via: {item.supplier}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-200">{item.quantity}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">{item.unitCost}</td>
                  <td className="py-2.5 px-3 font-mono text-amber-300">{item.leadTimeWeeks}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadgeClass(item.procurementStatus)}`}>
                      {item.procurementStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Items Listed: {filteredComponents.length}</span>
          <span>Sample data clearly labelled [SAMPLE]</span>
        </div>
      </div>
    </div>
  );
};
