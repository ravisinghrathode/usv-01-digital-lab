import React, { useState } from 'react';
import {
  Zap,
  Battery,
  ShieldCheck,
  Download,
  Sparkles,
  Cpu,
  Layers,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { PowerLoadItem, TestRecord } from '../types/engineering';
import { downloadCsv } from '../utils/engineeringUtils';

interface ElectricalPowerViewProps {
  powerLoads: PowerLoadItem[];
  testRecords: TestRecord[];
  onAskAi: (prompt: string, record?: any) => void;
}

export const ElectricalPowerView: React.FC<ElectricalPowerViewProps> = ({
  powerLoads,
  testRecords,
  onAskAi
}) => {
  const [activeTab, setActiveTab] = useState<'load_budget' | 'battery' | 'distribution' | 'protection'>('load_budget');

  // Sum non-propulsion baseline load
  const knownLoads = powerLoads.filter(p => typeof p.averageContinuousPowerW === 'number');
  const totalKnownContinuousW = knownLoads.reduce((sum, p) => sum + (p.averageContinuousPowerW as number), 0);

  const handleExportLoadCsv = () => {
    const headers = ['Consumer Name', 'Subsystem', 'Voltage', 'Nominal Power (W)', 'Duty Cycle (%)', 'Avg Continuous (W)', 'Peak Power (W)', 'Essential'];
    const rows = powerLoads.map(p => [p.consumerName, p.subsystem, p.voltageV, p.nominalPowerW, p.dutyCyclePercent, p.averageContinuousPowerW, p.peakPowerW, p.isEssential ? 'YES' : 'NO']);
    downloadCsv(`USV01_Electrical_Load_Budget_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              ELE-05
            </span>
            <span className="text-xs text-slate-500 font-mono">ELECTRICAL & POWER SYSTEMS</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            24h Mission Load Budget, Battery Energy Storage & Isolated DC Bus
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Galvanically isolated dual DC bus topology (48V / 24V), LiFePO4 battery pack sizing, and continuous electrical consumption balance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAskAi('Audit the Electrical and Power load budget. What battery capacity (kWh) is required to sustain 24-hour loiter vs 8-hour sprint mission profiles under IEEE 45 standards?')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Electrical Review</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-1 text-xs font-mono">
        <button
          onClick={() => setActiveTab('load_budget')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'load_budget'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          24h Electrical Load Budget
        </button>
        <button
          onClick={() => setActiveTab('battery')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'battery'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Battery & Energy Storage (LiFePO4)
        </button>
        <button
          onClick={() => setActiveTab('distribution')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'distribution'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Power Distribution Architecture
        </button>
        <button
          onClick={() => setActiveTab('protection')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'protection'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Isolation & Protection
        </button>
      </div>

      {/* TAB 1: Load Budget */}
      {activeTab === 'load_budget' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-400" />
                <span>Subsystem Electrical Load Balance Table</span>
              </h3>
              <button
                onClick={handleExportLoadCsv}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                <Download className="w-3 h-3" />
                <span>Export Budget CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px]">
                    <th className="py-2 px-3">Consumer Equipment</th>
                    <th className="py-2 px-3">Subsystem</th>
                    <th className="py-2 px-3">Operating Voltage</th>
                    <th className="py-2 px-3">Nominal (W)</th>
                    <th className="py-2 px-3">Duty Cycle (%)</th>
                    <th className="py-2 px-3">Avg Continuous (W)</th>
                    <th className="py-2 px-3">Peak Power (W)</th>
                    <th className="py-2 px-3">Essential Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  {powerLoads.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 text-slate-200 font-medium">{p.consumerName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{p.subsystem}</td>
                      <td className="py-2.5 px-3 font-mono text-teal-400">{p.voltageV}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{p.nominalPowerW}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{p.dutyCyclePercent}%</td>
                      <td className="py-2.5 px-3 font-mono text-amber-300 font-semibold">{p.averageContinuousPowerW}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{p.peakPowerW}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${p.isEssential ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          {p.isEssential ? 'ESSENTIAL' : 'AUXILIARY'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500">Avionics & Sensor Continuous Baseload:</span>{' '}
                <strong className="text-teal-400">{totalKnownContinuousW.toFixed(1)} Watts</strong>
              </div>
              <div>
                <span className="text-slate-500">Propulsion Cruise Power:</span>{' '}
                <strong className="text-amber-400">TBD kW (Awaiting Resistance Validation)</strong>
              </div>
              <div>
                <span className="text-slate-500">IEEE 45 Isolation Threshold:</span>{' '}
                <strong className="text-emerald-400">&gt; 10 MΩ (Verified in FAT)</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Battery Storage */}
      {activeTab === 'battery' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <Battery className="w-4 h-4 text-teal-400" />
              <span>LiFePO4 Energy Storage Baseline Configuration (DEC-ELE-001)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px]">CHEMISTRY</span>
                <strong className="text-teal-400 block mt-1">Lithium Iron Phosphate (LiFePO4)</strong>
                <span className="text-[11px] text-slate-400 block mt-1">Chosen for zero thermal runaway risk in sealed marine compartment.</span>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px]">NOMINAL SYSTEM VOLTAGE</span>
                <strong className="text-slate-100 block mt-1">51.2V DC Nominal (16S Configuration)</strong>
                <span className="text-[11px] text-slate-400 block mt-1">Safe extra-low voltage threshold; minimizes marine arc flash hazard.</span>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px]">PACK TOTAL CAPACITY</span>
                <strong className="text-amber-400 block mt-1">TBD kWh</strong>
                <span className="text-[11px] text-slate-400 block mt-1">Dependent on mission endurance trade-off (TBD hours at TBD knots).</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Distribution */}
      {activeTab === 'distribution' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs space-y-3 font-mono">
          <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800">
            Single Line Power Distribution Architecture
          </h3>
          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2 text-[11px]">
            <div className="flex items-center gap-2 text-teal-400">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <strong>[BUS 1 — 48V HIGH POWER]</strong>: Dedicated to twin electric propulsion ESC drives and high-capacity bilge pumping.
            </div>
            <div className="flex items-center gap-2 text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <strong>[BUS 2 — 24V AVIONICS]</strong>: Galvanically isolated DC-DC converter feeding ROS2 Jetson compute, RTK GNSS, 4G Radar, and LiDAR.
            </div>
            <div className="flex items-center gap-2 text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <strong>[BUS 3 — 12V AUXILIARY]</strong>: Navigation LED lighting, AIS transponder, and ultrasonic sounder.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Protection */}
      {activeTab === 'protection' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Electrical Protection & Factory Acceptance Evidence</span>
          </h3>
          <p className="text-slate-300 leading-relaxed">
            Factory acceptance test record <strong>TEST-REC-001</strong> passed on 2026-11-06: Verified 48.2 MΩ isolation resistance (IEEE 45 threshold 10 MΩ) and 3.1% voltage sag during 100A step load.
          </p>
        </div>
      )}
    </div>
  );
};
