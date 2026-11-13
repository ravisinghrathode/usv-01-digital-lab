import React, { useState } from 'react';
import {
  Gauge,
  Sparkles,
  Download,
  Plus,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ComponentBOM } from '../types/engineering';
import { getStatusBadgeClass } from '../utils/engineeringUtils';

interface PropulsionViewProps {
  propulsionComponents: ComponentBOM[];
  onAskAi: (prompt: string, record?: any) => void;
}

export const PropulsionView: React.FC<PropulsionViewProps> = ({
  propulsionComponents,
  onAskAi
}) => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              PRP-06
            </span>
            <span className="text-xs text-slate-500 font-mono">PROPULSION & DRIVETRAIN WORKSPACE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Electric Marine Drives, Propeller Cavitation & Transmission Register
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Brushless Permanent Magnet Synchronous Motors (PMSM), propeller blade design, thrust matching, and cooling circuits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAskAi('Audit the propulsion subsystem. Compare twin electric steerable pods vs inboard motor with fixed shafting in terms of maneuverability, cavitation risk, and hydrodynamics for the USV-01.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Propulsion Trade Study</span>
          </button>
        </div>
      </div>

      {/* Propulsion Architecture Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-teal-400" />
          <span>Propulsion Architecture Proposal — Not Released</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px]">DRIVE CONFIGURATION</span>
            <strong className="text-teal-400 block mt-1">Twin electric drives — proposed</strong>
            <span className="text-[11px] text-slate-400 block mt-1">Differential thrust is a proposed control strategy. Station-keeping authority is not yet verified.</span>
          </div>
          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px]">MOTOR TOPOLOGY</span>
            <strong className="text-slate-200 block mt-1">PMSM candidate; cooling TBD</strong>
            <span className="text-[11px] text-slate-400 block mt-1">Drive train, efficiency, acoustic emissions and heat rejection require supplier and test evidence.</span>
          </div>
          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px]">MOTOR CONTINUOUS RATING</span>
            <strong className="text-amber-400 block mt-1">TBD kW</strong>
            <span className="text-[11px] text-slate-400 block mt-1">RES-01 evidence gate: require validated resistance and efficiency across operating speeds before rating motors.</span>
          </div>
          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-[10px]">PROPELLER DIAMETER & PITCH</span>
            <strong className="text-amber-400 block mt-1">TBD mm / TBD mm</strong>
            <span className="text-[11px] text-slate-400 block mt-1">Cavitation/ventilation margin TBD until selected propulsor and test conditions are verified.</span>
          </div>
        </div>
      </div>

      {/* Propeller Design Parameters Table */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs font-mono">
        <h3 className="text-xs font-semibold text-slate-200 pb-3 border-b border-slate-800">
          Propeller Blade Geometry & Cavitation Margins Register
        </h3>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px]">
                <th className="py-2 px-3">Parameter</th>
                <th className="py-2 px-3">Design Baseline</th>
                <th className="py-2 px-3">Tolerance / Target</th>
                <th className="py-2 px-3">Verification Mechanism</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-2 px-3 text-slate-200 font-bold">Number of Blades (Z)</td>
                <td className="py-2 px-3 text-slate-300">3 or 4 Blades</td>
                <td className="py-2 px-3 text-slate-400">Trade study on blade pressure pulse</td>
                <td className="py-2 px-3 text-slate-400">BEM Lifting Line Analysis</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-200 font-bold">Expanded Area Ratio (EAR)</td>
                <td className="py-2 px-3 text-amber-400">TBD</td>
                <td className="py-2 px-3 text-slate-400">Keller’s formula cavitation criterion</td>
                <td className="py-2 px-3 text-slate-400">Hydrodynamics OpenFOAM cavitation run</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-200 font-bold">Material Specification</td>
                <td className="py-2 px-3 text-slate-300">Material TBD — no approved propeller</td>
                <td className="py-2 px-3 text-slate-400">Selected material and corrosion evidence TBD</td>
                <td className="py-2 px-3 text-slate-400">Material qualification and mill certificate</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-200 font-bold">Cavitation Inception Speed</td>
                <td className="py-2 px-3 text-amber-400">&gt; TBD knots</td>
                <td className="py-2 px-3 text-slate-400">Zero suction side sheet cavitation at cruise</td>
                <td className="py-2 px-3 text-slate-400">Water tunnel strobe observation trial</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill of Materials Items for Propulsion */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs font-mono">
        <h3 className="text-xs font-semibold text-slate-200 pb-3 border-b border-slate-800">
          Propulsion Hardware Register — Candidate/Procurement Status Only
        </h3>
        <div className="space-y-2.5 mt-3 font-sans">
          {propulsionComponents.map((item) => (
            <div key={item.id} className="p-3 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-teal-400 font-bold text-xs">{item.partNumber}</span>
                <p className="text-slate-200 text-xs font-medium mt-0.5">{item.description}</p>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Supplier: {item.supplier} • Qty: {item.quantity} • Cost: {item.unitCost}
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadgeClass(item.procurementStatus)}`}>
                {item.procurementStatus}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
