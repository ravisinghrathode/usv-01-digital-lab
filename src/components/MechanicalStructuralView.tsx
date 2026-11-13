import React, { useState } from 'react';
import {
  Hammer,
  Database,
  FileCode,
  Layers,
  Sparkles,
  Download,
  Plus,
  ShieldCheck,
  CheckCircle,
  FileText
} from 'lucide-react';
import { MaterialRecord, LoadCaseRecord, SimulationJob } from '../types/engineering';
import { downloadCsv } from '../utils/engineeringUtils';

interface MechanicalStructuralViewProps {
  materials: MaterialRecord[];
  loadCases: LoadCaseRecord[];
  simulations: SimulationJob[];
  onAskAi: (prompt: string, record?: any) => void;
}

export const MechanicalStructuralView: React.FC<MechanicalStructuralViewProps> = ({
  materials,
  loadCases,
  simulations,
  onAskAi
}) => {
  const [activeTab, setActiveTab] = useState<'materials' | 'load_cases' | 'fea' | 'drawings'>('materials');

  const feaSims = simulations.filter(s => s.discipline === 'MEC');

  const handleExportMaterials = () => {
    const headers = ['Material Name', 'Specification', 'Yield (MPa)', 'Ultimate (MPa)', 'Density (kg/m3)', 'Marine Corrosion', 'Notes'];
    const rows = materials.map(m => [m.materialName, m.specification, m.yieldStrengthMPa, m.ultimateStrengthMPa, m.densityKgM3, m.corrosionResistanceMarine, m.notes]);
    downloadCsv(`USV01_Material_Database_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              MEC-04
            </span>
            <span className="text-xs text-slate-500 font-mono">MECHANICAL & STRUCTURAL WORKSPACE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Structural Integrity, Marine Materials & FEA Register
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Material candidates, structural load-case register, and FEA evidence status; illustrative records do not demonstrate structural compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAskAi('Audit the mechanical/structural candidate load cases and materials without assuming DNV/ISO applicability or verified CAD/FEA. Identify absent geometry, mass, CG, weld allowables, lift load paths, galvanic isolation and required validation evidence.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Structural Audit</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-1 text-xs font-mono">
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'materials'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Marine Material Database ({materials.length})
        </button>
        <button
          onClick={() => setActiveTab('load_cases')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'load_cases'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Structural Load Cases ({loadCases.length})
        </button>
        <button
          onClick={() => setActiveTab('fea')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'fea'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          FEA Stress & Fatigue Analysis ({feaSims.length})
        </button>
        <button
          onClick={() => setActiveTab('drawings')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'drawings'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Engineering Drawings Register
        </button>
      </div>

      {/* TAB 1: Materials Database */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-400" />
                <span>Material Candidate Register — Validate Manufacturer Certificates</span>
              </h3>
              <button
                onClick={handleExportMaterials}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                <Download className="w-3 h-3" />
                <span>Export Materials CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px]">
                    <th className="py-2 px-3">Material Designation</th>
                    <th className="py-2 px-3">Specification / Grade</th>
                    <th className="py-2 px-3">Yield Rp0.2 (MPa)</th>
                    <th className="py-2 px-3">Tensile Rm (MPa)</th>
                    <th className="py-2 px-3">Density (kg/m³)</th>
                    <th className="py-2 px-3">Corrosion Classification</th>
                    <th className="py-2 px-3">Application Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  {materials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-mono text-teal-400 font-bold">{mat.materialName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{mat.specification}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-200">{mat.yieldStrengthMPa}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-200">{mat.ultimateStrengthMPa}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-200">{mat.densityKgM3}</td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">{mat.corrosionResistanceMarine}</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{mat.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Load Cases */}
      {activeTab === 'load_cases' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <h3 className="text-xs font-semibold text-slate-200 pb-3 border-b border-slate-800">
              Structural Design Load Cases & Standards Register
            </h3>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px]">
                    <th className="py-2 px-3">Load Case ID</th>
                    <th className="py-2 px-3">Title & Phenomenon</th>
                    <th className="py-2 px-3">Governing Code</th>
                    <th className="py-2 px-3">Design Pressure / Force</th>
                    <th className="py-2 px-3">Safety Factor (Approval Required)</th>
                    <th className="py-2 px-3">FEA Stress Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  {loadCases.map((lc) => (
                    <tr key={lc.id} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-mono text-teal-400 font-bold">{lc.id}</td>
                      <td className="py-2.5 px-3 text-slate-200 font-medium">{lc.title}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{lc.governingStandard}</td>
                      <td className="py-2.5 px-3 font-mono text-amber-300">{lc.designPressureOrForce}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{lc.safetyFactorTarget === 'TBD' ? 'TBD — not approved' : `SF ≥ ${lc.safetyFactorTarget} (illustrative)`}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {lc.feaStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FEA Records */}
      {activeTab === 'fea' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <h3 className="text-xs font-semibold text-slate-200 pb-3 border-b border-slate-800">
              Finite Element Analysis (FEA) Register — Evidence Required
            </h3>

            <div className="space-y-3 mt-4">
              {feaSims.map((sim) => (
                <div key={sim.id} className="p-3.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-teal-400 font-bold">{sim.id} — {sim.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {sim.runStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Solver: {sim.solver} • Cad Rev: {sim.geometryRevision}
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                    {sim.resultsSummary}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Drawings */}
      {activeTab === 'drawings' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs font-mono space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800">
            Illustrative Drawings Register — Actual Controlled CAD Not Verified
          </h3>
          <div className="space-y-2">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-teal-400 font-bold">DWG-HULL-001 Rev A [SAMPLE]</span>
                <span className="text-slate-400 block text-[11px] mt-0.5">Lines Plan, Station Offsets, and Waterlines</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">ILLUSTRATIVE ONLY</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-teal-400 font-bold">DWG-STR-002 Rev B [SAMPLE]</span>
                <span className="text-slate-400 block text-[11px] mt-0.5">Midship Section Scantlings, Keel Plating & Stiffeners</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">ILLUSTRATIVE ONLY</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-teal-400 font-bold">DWG-MAST-003 Rev A [SAMPLE]</span>
                <span className="text-slate-400 block text-[11px] mt-0.5">Carbon Fiber Sensor Mast & Shock Mount Assembly</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">ILLUSTRATIVE ONLY</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
