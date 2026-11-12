import React, { useState, useMemo } from 'react';
import {
  Waves,
  Activity,
  Cpu,
  ExternalLink,
  Download,
  Plus,
  Sparkles,
  Info,
  Server,
  FileText,
  Sliders,
  TrendingUp,
  Gauge
} from 'lucide-react';
import { ResistanceEstimate, SimulationJob } from '../types/engineering';
import { getStatusBadgeClass, downloadCsv } from '../utils/engineeringUtils';
import { calculateSavitskyPlaning, SavitskyInputs, SpeedResistancePoint } from '../utils/navalCalculators';

interface HydrodynamicsViewProps {
  resistanceEstimates: ResistanceEstimate[];
  simulations: SimulationJob[];
  onOpenNewSimModal: () => void;
  onAskAi: (prompt: string, record?: any) => void;
}

export const HydrodynamicsView: React.FC<HydrodynamicsViewProps> = ({
  resistanceEstimates,
  simulations,
  onOpenNewSimModal,
  onAskAi
}) => {
  const [activeTab, setActiveTab] = useState<'savitsky' | 'cfd_jobs' | 'resistance' | 'seakeeping' | 'propeller'>('savitsky');

  // Savitsky Planing Solver Parametric State (Rev 0.4 Baselined Particulars)
  const [massKg, setMassKg] = useState<number>(6200);
  const [beamM, setBeamM] = useState<number>(2.90);
  const [deadriseDeg, setDeadriseDeg] = useState<number>(19.0);
  const [lcgM, setLcgM] = useState<number>(4.85);

  // Live Savitsky Calculation
  const savitskyResult = useMemo(() => {
    return calculateSavitskyPlaning({
      massKg,
      beamM,
      deadriseDeg,
      lcgM
    });
  }, [massKg, beamM, deadriseDeg, lcgM]);

  // Filter CFD jobs for hydrodynamics
  const hydSims = simulations.filter(s => s.discipline === 'HYD');

  const handleExportResistance = () => {
    const headers = ['Record ID', 'Speed (knots)', 'Method', 'Bare Hull Drag (kN)', 'Appendage Drag (kN)', 'Effective Power (kW)', 'Status', 'Notes'];
    const rows = resistanceEstimates.map(r => [r.id, r.speedKnots, r.method, r.bareHullResistanceKN, r.appendageResistanceKN, r.effectivePowerKW, r.status, r.notes]);
    downloadCsv(`USV01_Hydrodynamics_Resistance_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleExportSavitskyCsv = () => {
    const headers = ['Speed (kn)', 'Speed (m/s)', 'Fn Beam', 'Trim (deg)', 'Wetted Ratio', 'Rf (kN)', 'Rp (kN)', 'R_total (kN)', 'Power PE (kW)', 'Regime'];
    const rows = savitskyResult.curve.map(pt => [
      pt.speedKnots,
      pt.speedMs,
      pt.froudeBeam,
      pt.trimDeg,
      pt.wettedLengthRatio,
      pt.frictionalDragKN,
      pt.pressureDragKN,
      pt.totalResistanceKN,
      pt.effectivePowerKW,
      pt.planingRegime
    ]);
    downloadCsv(`USV01_Savitsky_Planing_Curve_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  // SVG Chart Dimensions
  const svgWidth = 620;
  const svgHeight = 220;
  const padding = { left: 45, right: 35, top: 25, bottom: 35 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const maxDragKN = Math.max(...savitskyResult.curve.map(p => p.totalResistanceKN), 1.0);
  const maxPowerKW = Math.max(...savitskyResult.curve.map(p => p.effectivePowerKW), 10);

  // SVG Polyline points for Total Resistance (kN)
  const dragPointsSvg = savitskyResult.curve.map(pt => {
    const x = padding.left + ((pt.speedKnots - 4) / 36) * plotWidth;
    const y = padding.top + plotHeight - (pt.totalResistanceKN / (maxDragKN * 1.15)) * plotHeight;
    return `${x},${y}`;
  }).join(' ');

  // SVG Polyline points for Effective Power (kW)
  const powerPointsSvg = savitskyResult.curve.map(pt => {
    const x = padding.left + ((pt.speedKnots - 4) / 36) * plotWidth;
    const y = padding.top + plotHeight - (pt.effectivePowerKW / (maxPowerKW * 1.15)) * plotHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              HYD-03
            </span>
            <span className="text-xs text-slate-500 font-mono">HYDRODYNAMICS & RESISTANCE WORKSPACE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Savitsky Planing Hydrodynamics & High-Fidelity CFD Register
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Classical Savitsky (1964) empirical equations, speed-power estimation, OpenFOAM interFoam VOF cases, and wave interaction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAskAi('Review the hydrodynamics Savitsky results against the active hull particulars. What propulsion motor rating (continuous kW) is required to overcome the pre-planing resistance hump with a 25% sea margin?')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Hydrodynamic Review</span>
          </button>
        </div>
      </div>

      {/* Critical HPC Rule Notice */}
      <div className="p-3.5 rounded bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs">
        <Server className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-slate-200">Analytical vs High-Performance Compute (HPC) Architecture</h4>
          <p className="text-slate-400 mt-0.5 leading-relaxed">
            The interactive Savitsky solver below provides classical empirical speed-power estimates for initial trade studies. Complex viscous free-surface simulations (OpenFOAM v2312, Star-CCM+) are executed on dedicated HPC Linux clusters and recorded in the CFD job register with boundary mesh and convergence evidence.
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-slate-800 gap-1 text-xs font-mono overflow-x-auto">
        <button
          onClick={() => setActiveTab('savitsky')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'savitsky'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Interactive Savitsky Planing Solver
        </button>
        <button
          onClick={() => setActiveTab('cfd_jobs')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'cfd_jobs'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          CFD Numerical Analysis Jobs ({hydSims.length})
        </button>
        <button
          onClick={() => setActiveTab('resistance')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'resistance'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Calm-Water Resistance Register
        </button>
        <button
          onClick={() => setActiveTab('seakeeping')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'seakeeping'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Seakeeping & Motion RAOs
        </button>
        <button
          onClick={() => setActiveTab('propeller')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'propeller'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Propeller Interaction & Wake
        </button>
      </div>

      {/* TAB 0: Interactive Savitsky Planing Solver */}
      {activeTab === 'savitsky' && (
        <div className="space-y-5">
          {/* Controls & Curve Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Parametric Sliders */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-teal-400" />
                  <span>Savitsky (1964) Input Variables</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">PLANING MATH</span>
              </div>

              {/* Mass Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Vessel Mass (Δ)</span>
                  <span className="text-teal-400 font-bold">{massKg} kg</span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="6000"
                  step="50"
                  value={massKg}
                  onChange={(e) => setMassKg(Number(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>

              {/* Chine Beam Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Waterline Chine Beam (b)</span>
                  <span className="text-teal-400 font-bold">{beamM.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="1.20"
                  max="3.20"
                  step="0.05"
                  value={beamM}
                  onChange={(e) => setBeamM(Number(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>

              {/* Deadrise Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Bottom Deadrise Angle (β)</span>
                  <span className="text-teal-400 font-bold">{deadriseDeg.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="10.0"
                  max="28.0"
                  step="0.5"
                  value={deadriseDeg}
                  onChange={(e) => setDeadriseDeg(Number(e.target.value))}
                  className="w-full accent-teal-400"
                />
                <span className="text-[10px] text-slate-500 font-mono block">Higher deadrise softens sea wave impact at cost of planing lift</span>
              </div>

              {/* LCG Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Longitudinal CG forward of Transom (LCG)</span>
                  <span className="text-amber-400 font-bold">{lcgM.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="1.00"
                  max="3.00"
                  step="0.05"
                  value={lcgM}
                  onChange={(e) => setLcgM(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
                <span className="text-[10px] text-slate-500 font-mono block">Forward LCG reduces running trim; aft LCG risks porpoising instability</span>
              </div>

              {/* Quick Solver Stats */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs font-mono">
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">PLANING ONSET</span>
                  <span className="text-sm font-bold text-teal-400">{savitskyResult.planingSpeedKnots} knots</span>
                  <span className="text-[9px] text-slate-500 block">Fn_b ≥ 1.0</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">HUMP RESISTANCE</span>
                  <span className="text-sm font-bold text-amber-400">{savitskyResult.peakHumpResistanceKN} kN</span>
                  <span className="text-[9px] text-slate-500 block">At ~{savitskyResult.peakHumpSpeedKnots} kn</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExportSavitskyCsv}
                  className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Savitsky Data (CSV)</span>
                </button>
              </div>
            </div>

            {/* Right Column: Speed vs Resistance & Effective Power Chart */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded p-4 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                    <span>Speed vs Resistance $R_T$ & Effective Power $P_E$</span>
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="flex items-center gap-1 text-teal-400">
                      <span className="w-2.5 h-0.5 bg-teal-400 inline-block" /> Resistance (kN)
                    </span>
                    <span className="flex items-center gap-1 text-sky-400">
                      <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> Power (kW)
                    </span>
                  </div>
                </div>

                {/* SVG Speed Curve */}
                <div className="mt-3 bg-slate-950 p-3 rounded border border-slate-800">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-48 select-none">
                    {/* X-axis speed grid lines */}
                    {[4, 10, 16, 22, 28, 34, 40].map(kn => {
                      const x = padding.left + ((kn - 4) / 36) * plotWidth;
                      return (
                        <g key={kn}>
                          <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotHeight} stroke="#1e293b" strokeDasharray="3 3" />
                          <text x={x} y={svgHeight - 10} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                            {kn}kn
                          </text>
                        </g>
                      );
                    })}

                    {/* Y-axis Left: Resistance (kN) */}
                    {[0, maxDragKN * 0.33, maxDragKN * 0.66, maxDragKN].map((val, idx) => {
                      const y = padding.top + plotHeight - (val / (maxDragKN * 1.15)) * plotHeight;
                      return (
                        <g key={idx}>
                          <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke="#1e293b" strokeDasharray="2 2" />
                          <text x={padding.left - 6} y={y + 3} fill="#14b8a6" fontSize="9" fontFamily="monospace" textAnchor="end">
                            {val.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Baseline */}
                    <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="#334155" strokeWidth="1.5" />

                    {/* Resistance Curve (Teal) */}
                    <polyline points={dragPointsSvg} fill="none" stroke="#14b8a6" strokeWidth="2.5" />

                    {/* Effective Power Curve (Sky) */}
                    <polyline points={powerPointsSvg} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" />
                  </svg>

                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>Forward Speed (knots)</span>
                    <span className="text-slate-400">Planing onset speed marked at {savitskyResult.planingSpeedKnots} kn</span>
                  </div>
                </div>
              </div>

              {/* Recommended Propulsion Motor Sizing Readout */}
              <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-teal-400" />
                    <span>Propulsion Motor Sizing Synthesis (at 28 knots Sprint):</span>
                  </span>
                  <span className="text-teal-400 font-bold">
                    Effective $P_E$: {(savitskyResult.curve.find(c => c.speedKnots === 28)?.effectivePowerKW || 0).toFixed(1)} kW
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Shaft Power (η_prop ≈ 0.62):</span>
                    <strong className="text-slate-200">
                      {(((savitskyResult.curve.find(c => c.speedKnots === 28)?.effectivePowerKW || 0) / 0.62)).toFixed(1)} kW
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Installed Motor (with 25% margin):</span>
                    <strong className="text-teal-400">
                      {(((savitskyResult.curve.find(c => c.speedKnots === 28)?.effectivePowerKW || 0) / 0.62) * 1.25).toFixed(1)} kW Total
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Twin Outboard Split:</span>
                    <strong className="text-sky-400">
                      2× {((((savitskyResult.curve.find(c => c.speedKnots === 28)?.effectivePowerKW || 0) / 0.62) * 1.25) / 2).toFixed(1)} kW Motors
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Tabular Savitsky Hydrodynamic Output Table */}
          <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs font-mono">
            <h3 className="text-xs font-semibold text-slate-200 pb-3 border-b border-slate-800">
              Parametric Savitsky Hydrodynamic Resistance Calculation Matrix
            </h3>

            <div className="overflow-x-auto mt-3 max-h-64 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400">
                  <tr>
                    <th className="py-2 px-3">Speed (kn)</th>
                    <th className="py-2 px-3">Speed (m/s)</th>
                    <th className="py-2 px-3">Froude (Cv)</th>
                    <th className="py-2 px-3">Trim (deg)</th>
                    <th className="py-2 px-3">Wetted (λ)</th>
                    <th className="py-2 px-3">Friction (kN)</th>
                    <th className="py-2 px-3">Pressure (kN)</th>
                    <th className="py-2 px-3">Total Drag (kN)</th>
                    <th className="py-2 px-3">Power PE (kW)</th>
                    <th className="py-2 px-3">Hydrodynamic Regime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {savitskyResult.curve.map((row) => (
                    <tr key={row.speedKnots} className="hover:bg-slate-800/60">
                      <td className="py-2 px-3 font-bold text-teal-400">{row.speedKnots} kn</td>
                      <td className="py-2 px-3 text-slate-300">{row.speedMs}</td>
                      <td className="py-2 px-3 text-slate-400">{row.froudeBeam}</td>
                      <td className="py-2 px-3 text-amber-300">{row.trimDeg}°</td>
                      <td className="py-2 px-3 text-slate-400">{row.wettedLengthRatio}</td>
                      <td className="py-2 px-3 text-slate-300">{row.frictionalDragKN}</td>
                      <td className="py-2 px-3 text-slate-300">{row.pressureDragKN}</td>
                      <td className="py-2 px-3 font-bold text-slate-100">{row.totalResistanceKN} kN</td>
                      <td className="py-2 px-3 font-bold text-sky-400">{row.effectivePowerKW} kW</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                          row.planingRegime === 'Fully Planing'
                            ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                            : row.planingRegime === 'Semi-Planing'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {row.planingRegime}
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

      {/* TAB 1: CFD Jobs Register */}
      {activeTab === 'cfd_jobs' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" />
                <span>CFD Job Register & Solver Configuration Logs</span>
              </h3>
              <button
                onClick={onOpenNewSimModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New CFD Case</span>
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {hydSims.map((sim) => (
                <div key={sim.id} className="p-3.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-teal-400 font-bold">{sim.id}</span>
                      <span className="font-semibold text-slate-100">{sim.name}</span>
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
                          className="text-[10px] font-mono text-sky-400 hover:underline flex items-center gap-1"
                        >
                          HPC Files <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                      <span className="text-slate-500 block">Solver & Version:</span>
                      <span className="text-slate-200">{sim.solver}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                      <span className="text-slate-500 block">Mesh & Inputs:</span>
                      <span className="text-slate-200">{sim.inputConfiguration}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                      <span className="text-slate-500 block">HPC Compute Node:</span>
                      <span className="text-slate-200">{sim.computeEnvironment}</span>
                    </div>
                  </div>

                  <div className="pt-1 text-[11px] text-slate-400">
                    <strong className="text-slate-300">Boundary Conditions:</strong> {sim.boundaryConditions}
                  </div>

                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 text-[11px]">
                    <span className="text-teal-400 font-mono font-semibold block">Results & Validation Status:</span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">{sim.resultsSummary}</p>
                    <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>Reviewer: {sim.reviewer}</span>
                      <span>Validation: {sim.validationStatus}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Resistance Register */}
      {activeTab === 'resistance' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200">
                Speed-Power & Resistance Characterization Table
              </h3>
              <button
                onClick={handleExportResistance}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                <Download className="w-3 h-3" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px]">
                    <th className="py-2 px-3">Run ID</th>
                    <th className="py-2 px-3">Speed (knots)</th>
                    <th className="py-2 px-3">Prediction Method</th>
                    <th className="py-2 px-3">Bare Hull Drag (kN)</th>
                    <th className="py-2 px-3">Appendage Drag (kN)</th>
                    <th className="py-2 px-3">Effective Power PE (kW)</th>
                    <th className="py-2 px-3">Verification State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {resistanceEstimates.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 text-teal-400 font-bold">{res.id}</td>
                      <td className="py-2.5 px-3 text-amber-400">{res.speedKnots}</td>
                      <td className="py-2.5 px-3 text-slate-200">{res.method}</td>
                      <td className="py-2.5 px-3 text-amber-400">{res.bareHullResistanceKN}</td>
                      <td className="py-2.5 px-3 text-amber-400">{res.appendageResistanceKN}</td>
                      <td className="py-2.5 px-3 text-amber-400">{res.effectivePowerKW}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${getStatusBadgeClass(res.status)}`}>
                          {res.status}
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

      {/* TAB 3: Seakeeping & RAOs */}
      {activeTab === 'seakeeping' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-4 text-xs">
          <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800">
            Seakeeping Analysis & Motion Response Amplitude Operators (RAO)
          </h3>
          <p className="text-slate-400 leading-relaxed">
            Seakeeping performance evaluation under irregular Pierson-Moskowitz and JONSWAP wave spectra. The USV must operate safely in Sea State [TBD] without excessive deck wetting or payload sensor acceleration degradation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px]">PITCH RAO CRITERIA</span>
              <strong className="text-amber-400 block mt-1">TBD deg/m</strong>
              <span className="text-[11px] text-slate-500 block mt-1">Max acceptable pitch amplitude in head seas.</span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px]">HEAVE ACCELERATION</span>
              <strong className="text-amber-400 block mt-1">TBD g</strong>
              <span className="text-[11px] text-slate-500 block mt-1">Avionics compartment vertical shock limit.</span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px]">ROLL RESONANCE PERIOD</span>
              <strong className="text-amber-400 block mt-1">TBD seconds</strong>
              <span className="text-[11px] text-slate-500 block mt-1">Must avoid dominant wave encounter frequencies.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Propeller Interaction */}
      {activeTab === 'propeller' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-4 text-xs">
          <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800">
            Hull-Propeller Interaction Factors
          </h3>
          <p className="text-slate-400">
            Interaction coefficients governing self-propulsion power conversion:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px]">TAYLOR WAKE FRACTION (w)</span>
              <strong className="text-amber-400 block mt-1">TBD</strong>
              <span className="text-[10px] text-slate-500 mt-1 block">Wake velocity reduction factor at propeller disc</span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px]">THRUST DEDUCTION (t)</span>
              <strong className="text-amber-400 block mt-1">TBD</strong>
              <span className="text-[10px] text-slate-500 mt-1 block">Hull suction drag induced by propeller action</span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px]">HULL EFFICIENCY (ηH)</span>
              <strong className="text-amber-400 block mt-1">TBD</strong>
              <span className="text-[10px] text-slate-500 mt-1 block">Ratio: (1 - t) / (1 - w)</span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px]">RELATIVE ROTATIVE EFF (ηR)</span>
              <strong className="text-amber-400 block mt-1">TBD</strong>
              <span className="text-[10px] text-slate-500 mt-1 block">Open water vs behind hull propeller torque correlation</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
