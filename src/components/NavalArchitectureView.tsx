import React, { useState, useMemo } from 'react';
import {
  Anchor,
  ShieldAlert,
  Download,
  Plus,
  Scale,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Check,
  XCircle,
  FileCheck2
} from 'lucide-react';
import { PrincipalParticulars, WeightCGItem, WorkstreamCode } from '../types/engineering';
import { downloadCsv } from '../utils/engineeringUtils';
import { calculateGZStability, StabilityInputs } from '../utils/navalCalculators';

interface NavalArchitectureViewProps {
  particulars: PrincipalParticulars;
  weightItems: WeightCGItem[];
  onUpdateParticulars?: (updated: Partial<PrincipalParticulars>) => void;
  onUpdateWeightItem?: (id: string, updates: Partial<WeightCGItem>) => void;
  onAddWeightItem?: (item: Partial<WeightCGItem>) => void;
  onAskAi: (prompt: string, record?: any) => void;
}

export const NavalArchitectureView: React.FC<NavalArchitectureViewProps> = ({
  particulars,
  weightItems,
  onUpdateParticulars,
  onUpdateWeightItem,
  onAddWeightItem,
  onAskAi
}) => {
  const [activeTab, setActiveTab] = useState<'solver' | 'particulars' | 'stability' | 'weight_cg' | 'subdivision'>('solver');

  // Interactive Sizing & Stability Solver State
  const [displacementKg, setDisplacementKg] = useState<number>(2450);
  const [beamM, setBeamM] = useState<number>(2.20);
  const [draftM, setDraftM] = useState<number>(0.52);
  const [depthM, setDepthM] = useState<number>(1.25);
  const [vcgM, setVcgM] = useState<number>(0.68);
  const [blockCoeffCb, setBlockCoeffCb] = useState<number>(0.46);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Compute live GZ stability results
  const stabilityResult = useMemo(() => {
    return calculateGZStability({
      displacementKg,
      beamM,
      draftM,
      depthM,
      vcgM,
      blockCoeffCb
    });
  }, [displacementKg, beamM, draftM, depthM, vcgM, blockCoeffCb]);

  const handleExportWeightCsv = () => {
    const headers = ['Weight ID', 'Item Name', 'Subsystem', 'Mass (kg)', 'LCG (m from AP)', 'VCG (m from BL)', 'TCG (m)', 'Confidence'];
    const rows = weightItems.map(w => [w.id, w.name, w.subsystem, w.massKg, w.lcgM, w.vcgM, w.tcgM, w.confidence]);
    downloadCsv(`USV01_Weight_CG_Tracking_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleExportGzCsv = () => {
    const headers = ['Heel Angle (deg)', 'GZ Lever (m)', 'Righting Moment (kNm)', 'Deck Immersed'];
    const rows = stabilityResult.curve.map(pt => [pt.heelDeg, pt.gzM, pt.rightingMomentKNm, pt.isDeckImmersed ? 'YES' : 'NO']);
    downloadCsv(`USV01_GZ_Stability_Curve_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleCommitToBaseline = () => {
    if (onUpdateParticulars) {
      onUpdateParticulars({
        beamOverall: `${beamM.toFixed(2)} m`,
        beamWaterline: `${(beamM * 0.92).toFixed(2)} m`,
        draftDesign: `${draftM.toFixed(2)} m`,
        depthMolded: `${depthM.toFixed(2)} m`,
        freeboardDesign: `${(depthM - draftM).toFixed(2)} m`,
        displacementMolded: `${displacementKg} kg (${(displacementKg / 1000).toFixed(2)} t)`,
        blockCoefficientCb: `${blockCoeffCb.toFixed(2)}`,
        validationState: 'Preliminary Calculations'
      });
    }
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  // Render SVG GZ curve points
  const maxGzInCurve = Math.max(...stabilityResult.curve.map(p => p.gzM), 0.5);
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { left: 45, right: 25, top: 25, bottom: 35 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const pointsSvg = stabilityResult.curve.map(pt => {
    const x = padding.left + (pt.heelDeg / 60) * plotWidth;
    const y = padding.top + plotHeight - (Math.max(pt.gzM, 0) / (maxGzInCurve * 1.15)) * plotHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Naval Architecture Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              NAV-02
            </span>
            <span className="text-xs text-slate-500 font-mono">NAVAL ARCHITECTURE & STABILITY WORKSPACE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Vessel Geometry, Hydrostatics & Interactive GZ Stability Solver
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time hydrostatic equilibrium, IMO Resolution MSC.267(85) intact stability code audit, and weight/CG management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAskAi('Audit the Naval Architecture baseline against IMO MSC.267(85) criteria. List all unverified parameters and explain what physical or numerical evidence is required before dimensions can be unfrozen.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Naval Architecture Review</span>
          </button>
        </div>
      </div>

      {/* Strict Engineering Notice */}
      <div className="p-3.5 rounded bg-slate-900 border border-amber-500/30 flex items-start gap-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-300">Mandatory Naval Architecture Governance Rule</h4>
          <p className="text-slate-300 mt-0.5 leading-relaxed">
            Per systems engineering guidelines, vessel dimensions and stability metrics must not be fabricated. The interactive calculator below provides analytical mathematical estimates to guide preliminary sizing. Values remain <strong className="font-mono text-amber-300 bg-amber-500/10 px-1 py-0.2 rounded">TBD</strong> on the baseline register until peer-reviewed and verified by physical inclining trials.
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-slate-800 gap-1 text-xs font-mono overflow-x-auto">
        <button
          onClick={() => setActiveTab('solver')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'solver'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Interactive GZ Solver & Sizing
        </button>
        <button
          onClick={() => setActiveTab('particulars')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'particulars'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Principal Particulars Register
        </button>
        <button
          onClick={() => setActiveTab('stability')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'stability'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          IMO MSC.267(85) Standard Audit
        </button>
        <button
          onClick={() => setActiveTab('weight_cg')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'weight_cg'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Weight & CG Budget
        </button>
        <button
          onClick={() => setActiveTab('subdivision')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'subdivision'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Watertight Subdivision
        </button>
      </div>

      {/* TAB 0: Interactive Live GZ Solver & Sizing */}
      {activeTab === 'solver' && (
        <div className="space-y-5">
          {/* Controls & Live Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Sizing Parameters Sliders */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-teal-400" />
                  <span>Parametric Hull Sizing Controls</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">REAL-TIME MATH</span>
              </div>

              {/* Displacement Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Full Load Displacement (Δ)</span>
                  <span className="text-teal-400 font-bold">{displacementKg} kg ({(displacementKg / 1000).toFixed(2)} t)</span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="8000"
                  step="50"
                  value={displacementKg}
                  onChange={(e) => setDisplacementKg(Number(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>

              {/* Waterline Beam Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Waterline Beam (B)</span>
                  <span className="text-teal-400 font-bold">{beamM.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="1.20"
                  max="3.60"
                  step="0.05"
                  value={beamM}
                  onChange={(e) => setBeamM(Number(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>

              {/* Design Draft Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Design Draft (T)</span>
                  <span className="text-teal-400 font-bold">{draftM.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="1.20"
                  step="0.02"
                  value={draftM}
                  onChange={(e) => setDraftM(Number(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>

              {/* Molded Depth Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Molded Depth (D)</span>
                  <span className="text-teal-400 font-bold">{depthM.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0.70"
                  max="2.00"
                  step="0.05"
                  value={depthM}
                  onChange={(e) => setDepthM(Number(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>

              {/* VCG / KG Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Vertical Center of Gravity (VCG / KG)</span>
                  <span className="text-amber-400 font-bold">{vcgM.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="1.40"
                  step="0.02"
                  value={vcgM}
                  onChange={(e) => setVcgM(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
                <span className="text-[10px] text-slate-500 font-mono block">Sensitive to sensor mast height & battery placement</span>
              </div>

              {/* Block Coefficient Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Block Coefficient (Cb)</span>
                  <span className="text-slate-200 font-bold">{blockCoeffCb.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.35"
                  max="0.65"
                  step="0.01"
                  value={blockCoeffCb}
                  onChange={(e) => setBlockCoeffCb(Number(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                <button
                  onClick={handleCommitToBaseline}
                  className="flex-1 py-1.5 px-3 rounded bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-mono font-medium transition-colors"
                >
                  {saveSuccessMsg ? 'Committed to Baseline!' : 'Stage to Particulars'}
                </button>
                <button
                  onClick={handleExportGzCsv}
                  className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                >
                  Export GZ CSV
                </button>
              </div>
            </div>

            {/* Right Column: Live GZ Curve & Hydrostatic Figures */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded p-4 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-teal-400" />
                    <span>Righting Arm GZ(θ) Curve (0° to 60° Heel)</span>
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    stabilityResult.audit.criteria.overallPass
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {stabilityResult.audit.criteria.overallPass ? 'IMO 2008 IS COMPLIANT' : 'STABILITY CRITERIA FAILED'}
                  </span>
                </div>

                {/* SVG GZ Plot */}
                <div className="mt-3 bg-slate-950 p-3 rounded border border-slate-800">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-48 select-none">
                    {/* Grid Lines */}
                    {[0, 15, 30, 45, 60].map(deg => {
                      const x = padding.left + (deg / 60) * plotWidth;
                      return (
                        <g key={deg}>
                          <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotHeight} stroke="#1e293b" strokeDasharray="3 3" />
                          <text x={x} y={svgHeight - 10} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                            {deg}°
                          </text>
                        </g>
                      );
                    })}

                    {/* Horizontal Y Axes */}
                    {[0, 0.2, 0.4, 0.6].map(gzVal => {
                      const y = padding.top + plotHeight - (gzVal / (maxGzInCurve * 1.15)) * plotHeight;
                      if (y < padding.top) return null;
                      return (
                        <g key={gzVal}>
                          <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke="#1e293b" strokeDasharray="2 2" />
                          <text x={padding.left - 8} y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                            {gzVal.toFixed(1)}m
                          </text>
                        </g>
                      );
                    })}

                    {/* Zero Baseline */}
                    <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="#334155" strokeWidth="1.5" />

                    {/* Deck Edge Angle Line */}
                    {stabilityResult.audit.deckEdgeAngleDeg <= 60 && (
                      <g>
                        <line
                          x1={padding.left + (stabilityResult.audit.deckEdgeAngleDeg / 60) * plotWidth}
                          y1={padding.top}
                          x2={padding.left + (stabilityResult.audit.deckEdgeAngleDeg / 60) * plotWidth}
                          y2={padding.top + plotHeight}
                          stroke="#f59e0b"
                          strokeDasharray="4 2"
                          strokeWidth="1"
                        />
                        <text
                          x={padding.left + (stabilityResult.audit.deckEdgeAngleDeg / 60) * plotWidth}
                          y={padding.top + 12}
                          fill="#f59e0b"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          Deck Edge ({stabilityResult.audit.deckEdgeAngleDeg}°)
                        </text>
                      </g>
                    )}

                    {/* GZ Curve Polygon Fill */}
                    <polygon
                      points={`${padding.left},${padding.top + plotHeight} ${pointsSvg} ${padding.left + plotWidth},${padding.top + plotHeight}`}
                      fill="rgba(20, 184, 166, 0.12)"
                    />

                    {/* GZ Curve Stroke */}
                    <polyline
                      points={pointsSvg}
                      fill="none"
                      stroke="#14b8a6"
                      strokeWidth="2.5"
                    />

                    {/* GZ Max Dot */}
                    <circle
                      cx={padding.left + (stabilityResult.audit.gzMaxAngleDeg / 60) * plotWidth}
                      cy={padding.top + plotHeight - (stabilityResult.audit.gzMaxM / (maxGzInCurve * 1.15)) * plotHeight}
                      r="4"
                      fill="#38bdf8"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>Heel Angle θ (degrees)</span>
                    <span className="text-teal-400 font-semibold">GZ max = {stabilityResult.audit.gzMaxM} m at {stabilityResult.audit.gzMaxAngleDeg}°</span>
                  </div>
                </div>
              </div>

              {/* Hydrostatic Center Readouts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">INITIAL GM₀</span>
                  <span className={`text-base font-bold ${stabilityResult.audit.gm0M >= 0.15 ? 'text-teal-400' : 'text-rose-400'}`}>
                    {stabilityResult.audit.gm0M} m
                  </span>
                  <span className="text-[9px] text-slate-500 block">Req ≥ 0.15 m</span>
                </div>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">METACENTER KM</span>
                  <span className="text-base font-bold text-slate-200">
                    {stabilityResult.kmM} m
                  </span>
                  <span className="text-[9px] text-slate-500 block">KB + BM</span>
                </div>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">METACENTRIC BM</span>
                  <span className="text-base font-bold text-slate-200">
                    {stabilityResult.bmM} m
                  </span>
                  <span className="text-[9px] text-slate-500 block">Transverse radius</span>
                </div>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">CENTER BUOYANCY KB</span>
                  <span className="text-base font-bold text-slate-200">
                    {stabilityResult.kbM} m
                  </span>
                  <span className="text-[9px] text-slate-500 block">Morrish formula</span>
                </div>
              </div>
            </div>
          </div>

          {/* IMO MSC.267(85) Live Compliance Scorecard */}
          <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs font-mono">
            <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-teal-400" />
                <span>IMO MSC.267(85) Intact Stability Code Automated Compliance Matrix</span>
              </span>
              <span className="text-[10px] text-slate-400">INTERNATIONAL MANDATE</span>
            </h3>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px]">
                    <th className="py-2 px-3">Regulatory Stability Criterion</th>
                    <th className="py-2 px-3">Mandatory Threshold</th>
                    <th className="py-2 px-3">Calculated Value</th>
                    <th className="py-2 px-3">Margin Ratio</th>
                    <th className="py-2 px-3 text-right">Pass / Fail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="py-2.5 px-3 text-slate-200">Area under GZ curve from 0° to 30°</td>
                    <td className="py-2.5 px-3 text-slate-400">≥ 0.0550 m-rad</td>
                    <td className="py-2.5 px-3 text-teal-400 font-bold">{stabilityResult.audit.area0To30DegMrad} m-rad</td>
                    <td className="py-2.5 px-3 text-slate-300">{(stabilityResult.audit.area0To30DegMrad / 0.055).toFixed(2)}x</td>
                    <td className="py-2.5 px-3 text-right">
                      {stabilityResult.audit.criteria.area0To30Pass ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold"><Check className="w-3.5 h-3.5" /> PASS</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold"><XCircle className="w-3.5 h-3.5" /> FAIL</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-200">Area under GZ curve from 0° to 40°</td>
                    <td className="py-2.5 px-3 text-slate-400">≥ 0.0900 m-rad</td>
                    <td className="py-2.5 px-3 text-teal-400 font-bold">{stabilityResult.audit.area0To40DegMrad} m-rad</td>
                    <td className="py-2.5 px-3 text-slate-300">{(stabilityResult.audit.area0To40DegMrad / 0.090).toFixed(2)}x</td>
                    <td className="py-2.5 px-3 text-right">
                      {stabilityResult.audit.criteria.area0To40Pass ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold"><Check className="w-3.5 h-3.5" /> PASS</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold"><XCircle className="w-3.5 h-3.5" /> FAIL</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-200">Area under GZ curve from 30° to 40°</td>
                    <td className="py-2.5 px-3 text-slate-400">≥ 0.0300 m-rad</td>
                    <td className="py-2.5 px-3 text-teal-400 font-bold">{stabilityResult.audit.area30To40DegMrad} m-rad</td>
                    <td className="py-2.5 px-3 text-slate-300">{(stabilityResult.audit.area30To40DegMrad / 0.030).toFixed(2)}x</td>
                    <td className="py-2.5 px-3 text-right">
                      {stabilityResult.audit.criteria.area30To40Pass ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold"><Check className="w-3.5 h-3.5" /> PASS</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold"><XCircle className="w-3.5 h-3.5" /> FAIL</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-200">Initial Metacentric Height (GM₀)</td>
                    <td className="py-2.5 px-3 text-slate-400">≥ 0.150 m</td>
                    <td className="py-2.5 px-3 text-teal-400 font-bold">{stabilityResult.audit.gm0M} m</td>
                    <td className="py-2.5 px-3 text-slate-300">{(stabilityResult.audit.gm0M / 0.150).toFixed(2)}x</td>
                    <td className="py-2.5 px-3 text-right">
                      {stabilityResult.audit.criteria.gm0Pass ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold"><Check className="w-3.5 h-3.5" /> PASS</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold"><XCircle className="w-3.5 h-3.5" /> FAIL</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-200">Maximum Righting Lever (GZ max)</td>
                    <td className="py-2.5 px-3 text-slate-400">≥ 0.200 m at θ ≥ 25°</td>
                    <td className="py-2.5 px-3 text-teal-400 font-bold">{stabilityResult.audit.gzMaxM} m at {stabilityResult.audit.gzMaxAngleDeg}°</td>
                    <td className="py-2.5 px-3 text-slate-300">{(stabilityResult.audit.gzMaxM / 0.200).toFixed(2)}x</td>
                    <td className="py-2.5 px-3 text-right">
                      {stabilityResult.audit.criteria.gzMaxPass ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold"><Check className="w-3.5 h-3.5" /> PASS</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold"><XCircle className="w-3.5 h-3.5" /> FAIL</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Principal Particulars */}
      {activeTab === 'particulars' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Anchor className="w-4 h-4 text-teal-400" />
                <span>Hull Geometry & Principal Dimensions Register</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                STATE: {particulars.validationState}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4 text-xs font-mono">
              <ParticularCard label="Length Overall (LOA)" value={particulars.loa} unit="meters" note="Awaiting towing tank synthesis" />
              <ParticularCard label="Length Waterline (LWL)" value={particulars.lwl} unit="meters" note="Awaiting design waterline selection" />
              <ParticularCard label="Beam Overall (B)" value={particulars.beamOverall} unit="meters" note="Dependent on trailer road limit & GM" />
              <ParticularCard label="Beam Waterline (BWL)" value={particulars.beamWaterline} unit="meters" note="Pending hull chine geometry" />
              <ParticularCard label="Molded Depth (D)" value={particulars.depthMolded} unit="meters" note="Baseline scantling depth" />
              <ParticularCard label="Design Draft (T)" value={particulars.draftDesign} unit="meters" note="Constraint: Coastal shallow water access" />
              <ParticularCard label="Design Freeboard (Fb)" value={particulars.freeboardDesign} unit="meters" note="Reserve buoyancy requirement" />
              <ParticularCard label="Block Coefficient (Cb)" value={particulars.blockCoefficientCb} unit="ratio" note="Under CFD resistance optimization" />
              <ParticularCard label="Prismatic Coeff (Cp)" value={particulars.prismaticCoefficientCp} unit="ratio" note="Pending longitudinal distribution" />
              <ParticularCard label="Displacement Molded (Δ)" value={particulars.displacementMolded} unit="tonnes / kg" note="Subject to battery mass budget" />
              <ParticularCard label="Deadweight Capacity" value={particulars.deadweightCapacity} unit="kg payload" note="Sensor mast + communication payload" />
              <ParticularCard label="Hull Configuration" value="CAT vs MONOHULL" unit="Trade Study" note="Design Decision DEC-NAV-001 Active" isHighlight />
            </div>
          </div>

          <div className="p-4 rounded bg-slate-900 border border-slate-800 text-xs space-y-2">
            <h4 className="font-semibold text-slate-200">Active Hull Configuration Trade Study (DEC-NAV-001)</h4>
            <p className="text-slate-400 leading-relaxed">
              The project is currently evaluating a symmetric catamaran hull form versus a deep-V planing monohull. Catamaran advantages: superior initial transverse metacentric height (GM₀), wide sensor payload deck, and high roll resistance during low-speed loitering. Monohull advantages: reduced structural complexity, lower low-Froude wetted surface, and simpler road trailering without wide-load transport permits.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Static Standard Audit Description */}
      {activeTab === 'stability' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs font-mono space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800">
              IMO MSC.267(85) Statutory Stability Regulatory Background
            </h3>
            <p className="text-slate-300 leading-relaxed font-sans">
              The 2008 Intact Stability Code applies to all commercial and autonomous marine craft. It mandates positive dynamic stability reserves against gusting cross-winds and dynamic sea states.
            </p>
            <div className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] space-y-1.5">
              <div><strong className="text-teal-400">Area under GZ (0°-30°):</strong> Minimum 0.055 m-rad to prevent capsize under sudden gust heeling moments.</div>
              <div><strong className="text-teal-400">Area under GZ (0°-40°):</strong> Minimum 0.090 m-rad, accounting for roll inertia in heavy seaway.</div>
              <div><strong className="text-teal-400">Initial GM₀:</strong> Minimum 0.150 m to prevent negative initial metacentric stability (loll).</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Weight and CG Tracking */}
      {activeTab === 'weight_cg' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-teal-400" />
                  <span>Weight & Centre-of-Gravity (LCG, VCG, TCG) Accounting Table</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Coordinate reference: Origin at AP centerline baseline; X+ Forward, Y+ Starboard, Z+ Upward.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportWeightCsv}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Weight CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px]">
                    <th className="py-2 px-3">Item ID</th>
                    <th className="py-2 px-3">Subsystem Group</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Mass (kg)</th>
                    <th className="py-2 px-3">LCG (m from AP)</th>
                    <th className="py-2 px-3">VCG (m from BL)</th>
                    <th className="py-2 px-3">TCG (m)</th>
                    <th className="py-2 px-3">Confidence State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  {weightItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/50">
                      <td className="py-2 px-3 font-mono text-teal-400">{item.id}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{item.subsystem}</td>
                      <td className="py-2 px-3 text-slate-200">{item.name}</td>
                      <td className="py-2 px-3 font-mono text-amber-300">{item.massKg}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{item.lcgM}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{item.vcgM}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{item.tcgM}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.confidence}
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

      {/* TAB 4: Watertight Subdivision */}
      {activeTab === 'subdivision' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800">
              Watertight Bulkhead & Compartment Architecture
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              Preliminary compartment allocations designed to maintain positive reserve buoyancy under one-compartment damage condition:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-xs font-mono">
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">COMPARTMENT 1 (BOW)</span>
                <strong className="text-teal-400 block mt-1">Collision Forepeak Void</strong>
                <span className="text-[11px] text-slate-400 block mt-1">Watertight bulkhead at Station 1. Absorbs front wave impact or grounding without engine room flooding.</span>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">COMPARTMENT 2 (MID)</span>
                <strong className="text-teal-400 block mt-1">Avionics & Sensor Bay</strong>
                <span className="text-[11px] text-slate-400 block mt-1">Hermetically sealed IP67 bay housing navigation computer, RTK GNSS, and radar power modules.</span>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">COMPARTMENT 3 (MID-AFT)</span>
                <strong className="text-teal-400 block mt-1">Battery Energy Storage</strong>
                <span className="text-[11px] text-slate-400 block mt-1">Isolated LiFePO4 enclosure with passive thermal venting and pressure relief valve.</span>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">COMPARTMENT 4 (STERN)</span>
                <strong className="text-teal-400 block mt-1">Propulsion & Steering Bay</strong>
                <span className="text-[11px] text-slate-400 block mt-1">Houses motor inverters, steering actuators, and dual bilge pumping system.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ParticularCardProps {
  label: string;
  value: string;
  unit: string;
  note: string;
  isHighlight?: boolean;
}

const ParticularCard: React.FC<ParticularCardProps> = ({ label, value, unit, note, isHighlight }) => {
  return (
    <div className={`p-3 rounded border ${isHighlight ? 'bg-teal-500/10 border-teal-500/30' : 'bg-slate-950 border-slate-800'}`}>
      <span className="text-[10px] text-slate-500 block truncate">{label}</span>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={`text-base font-bold ${value === 'TBD' ? 'text-amber-400' : 'text-slate-100'}`}>
          {value}
        </span>
        <span className="text-[10px] text-slate-500">{unit}</span>
      </div>
      <p className="text-[10px] text-slate-500 mt-1 truncate">{note}</p>
    </div>
  );
};
