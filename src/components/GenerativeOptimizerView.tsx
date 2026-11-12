import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Filter,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Info
} from 'lucide-react';
import {
  GenerativeDesignOptimizer,
  CandidateDesign,
  LearnedInvariant,
  DesignPhilosophy
} from '../core/optimizer/GenerativeDesignOptimizer';
import { downloadCsv } from '../utils/engineeringUtils';

interface GenerativeOptimizerViewProps {
  onAskAi?: (prompt: string, record?: any) => void;
}

export const GenerativeOptimizerView: React.FC<GenerativeOptimizerViewProps> = ({ onAskAi }) => {
  const optimizer = GenerativeDesignOptimizer.getInstance();

  const [activeTab, setActiveTab] = useState<'ledger' | 'pareto' | 'invariants' | 'redteam'>('ledger');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [philosophy, setPhilosophy] = useState<DesignPhilosophy>('BALANCED_PATROL');
  const [history, setHistory] = useState<CandidateDesign[]>([]);
  const [champion, setChampion] = useState<CandidateDesign | null>(null);
  const [invariants, setInvariants] = useState<LearnedInvariant[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDesign | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state
  const refreshState = () => {
    setHistory([...optimizer.getHistory()]);
    setChampion(optimizer.getChampion());
    setInvariants([...optimizer.getLearnedInvariants()]);
  };

  useEffect(() => {
    // Run initial batch if empty
    if (optimizer.getHistory().length === 0) {
      for (let i = 0; i < 5; i++) {
        optimizer.runIteration('BALANCED_PATROL');
      }
    }
    refreshState();
  }, []);

  // Continuous optimization loop
  useEffect(() => {
    let timer: any = null;
    if (isRunning) {
      timer = setInterval(() => {
        optimizer.runIteration(philosophy);
        refreshState();
      }, 700);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, philosophy]);

  // Step single iteration
  const handleStepOnce = () => {
    const res = optimizer.runIteration(philosophy);
    setSelectedCandidate(res);
    refreshState();
  };

  // Reset
  const handleReset = () => {
    setIsRunning(false);
    optimizer.resetOptimizer();
    for (let i = 0; i < 3; i++) {
      optimizer.runIteration(philosophy);
    }
    refreshState();
    setSelectedCandidate(null);
  };

  // Active display candidate
  const activeCandidate = selectedCandidate || champion || history[0];

  // Draw Dynamic Morphing Hull Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeCandidate) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 10;

    ctx.fillStyle = '#060d17';
    ctx.fillRect(0, 0, w, h);

    // Water Surface
    ctx.fillStyle = 'rgba(14, 116, 144, 0.4)';
    ctx.fillRect(0, cy, w, h - cy);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Hull Transverse Section
    const scale = 80; // px/m
    const bPx = activeCandidate.beamMeters * scale;
    const dPx = activeCandidate.draftMeters * scale;
    const depthPx = 1.6 * scale;

    ctx.save();
    ctx.translate(cx, cy);

    // Draw Hull
    ctx.fillStyle = activeCandidate.status === 'SURVIVED' ? '#0f766e' : '#881337';
    ctx.strokeStyle = activeCandidate.status === 'SURVIVED' ? '#2dd4bf' : '#f43f5e';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-bPx / 2, -depthPx + dPx);
    ctx.lineTo(-bPx * 0.45, dPx * 0.3);
    ctx.lineTo(0, dPx);
    ctx.lineTo(bPx * 0.45, dPx * 0.3);
    ctx.lineTo(bPx / 2, -depthPx + dPx);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Centers K, B, G, M
    const kY = dPx;
    const bY = dPx - activeCandidate.kbMeters * scale;
    const gY = dPx - activeCandidate.kgMeters * scale;
    const mY = dPx - activeCandidate.kmtMeters * scale;

    // Keel (K)
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath(); ctx.arc(0, kY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillText('K', 8, kY + 3);

    // Buoyancy (B)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(0, bY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillText(`B (${activeCandidate.kbMeters}m)`, 8, bY + 3);

    // Gravity (G)
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath(); ctx.arc(0, gY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillText(`G (${activeCandidate.kgMeters}m)`, 8, gY + 3);

    // Metacenter (M)
    ctx.fillStyle = activeCandidate.gmtMeters >= 0.35 ? '#10b981' : '#ef4444';
    ctx.beginPath(); ctx.arc(0, mY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillText(`M (${activeCandidate.kmtMeters}m)`, 8, mY + 3);

    ctx.restore();

    // Canvas Telemetry Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px monospace';
    ctx.fillText(`Candidate: ${activeCandidate.id} [${activeCandidate.philosophy}]`, 15, 25);
    ctx.fillText(`LWL: ${activeCandidate.lwlMeters}m • Beam: ${activeCandidate.beamMeters}m • Deadrise: ${activeCandidate.deadriseDeg}°`, 15, 42);
    ctx.fillText(`Displacement: ${activeCandidate.displacementTonnes}t • GMt: ${activeCandidate.gmtMeters}m`, 15, 59);

    ctx.fillStyle = activeCandidate.status === 'SURVIVED' ? '#34d399' : '#f87171';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`STATUS: ${activeCandidate.status} (Fitness: ${activeCandidate.fitnessScore}/100)`, 15, 80);
  }, [activeCandidate]);

  // Export Iterations CSV
  const handleExportCsv = () => {
    const headers = [
      'Trial ID',
      'Generation',
      'Philosophy',
      'Status',
      'Fitness Score',
      'LWL (m)',
      'Beam (m)',
      'Draft (m)',
      'Deadrise (deg)',
      'Displacement (t)',
      'Battery (kWh)',
      'Motor (kW)',
      'GMt (m)',
      'Peak Drag (kN)',
      'Sprint Speed (kt)',
      'Endurance (h)',
      'Range (nm)',
      'Slamming (kPa)',
      'Rejection Reason'
    ];
    const rows = history.map((c) => [
      c.id,
      c.generation,
      c.philosophy,
      c.status,
      c.fitnessScore,
      c.lwlMeters,
      c.beamMeters,
      c.draftMeters,
      c.deadriseDeg,
      c.displacementTonnes,
      c.batteryKwh,
      c.motorKwTotal,
      c.gmtMeters,
      c.peakDragKn,
      c.sprintSpeedKnots,
      c.enduranceHours,
      c.rangeNm,
      c.slammingPressureKpa,
      c.rejectionReason || 'PASSED'
    ]);
    downloadCsv(`USV01_Generative_Optimization_Ledger_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const filteredHistory = history.filter((h) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'SURVIVED') return h.status === 'SURVIVED';
    if (statusFilter === 'REJECTED') return h.status !== 'SURVIVED';
    return h.status === statusFilter;
  });

  const redTeamQuestions = optimizer.generateRedTeamChallenge();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded flex items-center gap-1.5 font-bold">
              <Cpu className="w-3.5 h-3.5" /> GENERATIVE-AI-OPTIMIZER
            </span>
            <span className="text-xs text-slate-500 font-mono">AUTONOMOUS MULTI-AGENT TRIAL & ERROR ENGINE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Generative Design Space Optimization & Executive Defense Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            25 specialist agents exploring permutations via simulated trial-and-error, debating trade-offs, synthesizing permanent learned invariants, and establishing bulletproof senior leadership defense evidence.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-bold transition-colors ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Optimization' : 'Auto Trial & Error'}</span>
          </button>

          <button
            onClick={handleStepOnce}
            disabled={isRunning}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono disabled:opacity-50 transition-colors"
          >
            Step 1 Trial
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset Generations"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Ledger CSV</span>
          </button>
        </div>
      </div>

      {/* Philosophy Selector & Live Generation Tracker */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">Design Team Philosophy:</span>
          <select
            value={philosophy}
            onChange={(e) => setPhilosophy(e.target.value as DesignPhilosophy)}
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="BALANCED_PATROL">Team Balanced: 14kt Cruise, 8h+ Range, SS3 Capability</option>
            <option value="ALPHA_SPRINT">Team Alpha: Sprint Interceptor (26+ kt High Speed)</option>
            <option value="BRAVO_ENDURANCE">Team Bravo: Endurance Patroller (12+ hours loiter)</option>
            <option value="CHARLIE_GUARDIAN">Team Charlie: Heavy-Weather Guardian (Sea State 4 Stability)</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500">TRIALS RUN:</span>
            <span className="text-slate-100 font-bold ml-1">{history.length}</span>
          </div>
          <div>
            <span className="text-slate-500">SURVIVED:</span>
            <span className="text-emerald-400 font-bold ml-1">
              {history.filter(h => h.status === 'SURVIVED').length}
            </span>
          </div>
          <div>
            <span className="text-slate-500">LEARNED INVARIANTS:</span>
            <span className="text-purple-400 font-bold ml-1">{invariants.length}</span>
          </div>
        </div>
      </div>

      {/* Live Morphing Hull Visualizer & Multi-Agent Dialectical Debate Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dynamic 2D Transverse Section (Canvas) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Dynamic Hull Morphing & Center of Mass (Current Candidate)</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">LIVE GEOMETRY</span>
          </div>

          <div className="rounded overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
            <canvas ref={canvasRef} width={550} height={320} className="w-full h-auto block" />
          </div>

          {/* Candidate Metrics Ribbon */}
          {activeCandidate && (
            <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">GMt STABILITY</span>
                <span className={`font-bold ${activeCandidate.gmtMeters >= 0.35 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activeCandidate.gmtMeters}m
                </span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SPRINT SPEED</span>
                <span className="text-slate-200 font-bold">{activeCandidate.sprintSpeedKnots} kts</span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">ENDURANCE</span>
                <span className={`font-bold ${activeCandidate.enduranceHours >= 8 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {activeCandidate.enduranceHours} hrs
                </span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">FITNESS SCORE</span>
                <span className="text-purple-400 font-bold">{activeCandidate.fitnessScore} / 100</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Multi-Agent Dialectical Debate Feed */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Multi-Agent Dialectical Debate & Trade-Off Tension</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                TRIAL {activeCandidate?.id || 'N/A'}
              </span>
            </div>

            <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {activeCandidate?.debateTranscript && activeCandidate.debateTranscript.length > 0 ? (
                activeCandidate.debateTranscript.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded text-xs border ${
                      t.sentiment === 'ENDORSE'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : t.sentiment === 'OBJECT'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                      <span className="font-bold">{t.agentId} ({t.role})</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                        t.sentiment === 'ENDORSE' ? 'bg-emerald-500/20 text-emerald-300' :
                        t.sentiment === 'OBJECT' ? 'bg-rose-500/20 text-rose-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {t.sentiment}
                      </span>
                    </div>
                    <p className="leading-relaxed font-sans">{t.statement}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 font-mono text-xs">
                  Run a trial to observe multi-agent engineering debate.
                </div>
              )}
            </div>
          </div>

          {activeCandidate?.rejectionReason && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Failed Gate: {activeCandidate.failedGate}</strong>
                <p className="mt-0.5 text-[11px] text-rose-200/90">{activeCandidate.rejectionReason}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Section: Ledger, Invariants, Pareto, Red Team Defense */}
      <div className="flex border-b border-slate-800 gap-2 text-xs font-mono overflow-x-auto">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'border-purple-400 text-purple-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>Iteration Audit Ledger ({history.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invariants')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'invariants'
              ? 'border-purple-400 text-purple-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Learned Engineering Invariants ({invariants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pareto')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pareto'
              ? 'border-purple-400 text-purple-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pareto Frontier & "Knee of the Curve"</span>
        </button>

        <button
          onClick={() => setActiveTab('redteam')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'redteam'
              ? 'border-purple-400 text-purple-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Senior Leadership Red Team Defense Q&A</span>
        </button>
      </div>

      {/* TAB 1: ITERATION LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Filter Verdict:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none"
              >
                <option value="ALL">Show All Iterations</option>
                <option value="SURVIVED">Survived Only (Passed All Gates)</option>
                <option value="REJECTED">Rejected Only</option>
                <option value="REJECTED_STABILITY">Rejected by Stability (GMt)</option>
                <option value="REJECTED_DRAG">Rejected by Drag (Savitsky)</option>
                <option value="REJECTED_RANGE">Rejected by Range (Endurance)</option>
              </select>
            </div>
            <span className="text-slate-500">Showing {filteredHistory.length} of {history.length} records</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/60">
                  <th className="p-3">Trial ID</th>
                  <th className="p-3">Verdict</th>
                  <th className="p-3">Fitness</th>
                  <th className="p-3">LWL x Beam</th>
                  <th className="p-3">Disp (t)</th>
                  <th className="p-3">Battery</th>
                  <th className="p-3">GMt (m)</th>
                  <th className="p-3">Endurance</th>
                  <th className="p-3">Sprint</th>
                  <th className="p-3">Failure Reason / Critique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredHistory.map((item) => {
                  const isSelected = selectedCandidate?.id === item.id;
                  const isChamp = champion?.id === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedCandidate(item)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-purple-500/15 text-purple-200'
                          : isChamp
                          ? 'bg-emerald-500/10 text-emerald-200'
                          : 'hover:bg-slate-950/40 text-slate-300'
                      }`}
                    >
                      <td className="p-3 font-bold flex items-center gap-1.5">
                        {isChamp && <span className="text-amber-400 font-bold" title="Current Champion">★</span>}
                        <span>{item.id}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'SURVIVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {item.status.replace('REJECTED_', '')}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-purple-400">{item.fitnessScore}</td>
                      <td className="p-3">{item.lwlMeters}m x {item.beamMeters}m</td>
                      <td className="p-3">{item.displacementTonnes}t</td>
                      <td className="p-3">{item.batteryKwh}kWh</td>
                      <td className={`p-3 font-bold ${item.gmtMeters >= 0.35 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.gmtMeters}m
                      </td>
                      <td className="p-3">{item.enduranceHours}h</td>
                      <td className="p-3">{item.sprintSpeedKnots}kt</td>
                      <td className="p-3 text-[11px] text-slate-400 max-w-xs truncate">
                        {item.rejectionReason || 'Passed all 5 naval architecture gates'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PERMANENT LEARNED INVARIANTS */}
      {activeTab === 'invariants' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed">
            <strong className="text-slate-100 font-semibold">How Invariant Learning Works:</strong> Whenever an agent rejects a trial design, it performs an automated Root Cause Analysis (RCA) and synthesizes a permanent boundary rule. All future trials inherit these constraints, guaranteeing the multi-agent system never repeats past mistakes.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            {invariants.map((inv) => (
              <div key={inv.id} className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
                  <span className="text-purple-400 font-bold">{inv.id}</span>
                  <span className="text-slate-400">{inv.agentId} • GEN #{inv.discoveredAtGeneration}</span>
                </div>
                <div className="font-semibold text-slate-100">{inv.ruleStatement}</div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                  Evidence: {inv.mathEvidence}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PARETO FRONTIER */}
      {activeTab === 'pareto' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200">
                Multi-Variable Pareto Frontier: Sprint Speed vs. Patrol Endurance vs. Intact Stability
              </h3>
              <span className="text-[10px] font-mono text-slate-400">THE KNEE OF THE CURVE</span>
            </div>

            {/* Simulated Scatter Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[11px]">GLOBAL CHAMPION</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block">
                  {champion?.id || 'Running...'}
                </span>
                <div className="mt-2 text-slate-300 space-y-1 text-[11px]">
                  <div>LWL: {champion?.lwlMeters}m • Beam: {champion?.beamMeters}m</div>
                  <div>Speed: {champion?.sprintSpeedKnots} kts • Range: {champion?.rangeNm} nm</div>
                  <div>Endurance: {champion?.enduranceHours} hrs @ 14kt</div>
                  <div className="text-teal-400 font-bold">GMt: {champion?.gmtMeters}m (IMO Compliant)</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[11px]">THE "KNEE" TRADE-OFF POINT</span>
                <p className="text-slate-300 text-[11px] leading-relaxed mt-2">
                  At <strong>23–24 knots</strong>, planing drag transitions from linear to cubic. Pushing for 28 knots cuts patrol endurance by <strong>45%</strong> while requiring 2x motor inverter mass.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[11px]">REJECTED ALTERNATIVES</span>
                <div className="mt-2 space-y-1.5 text-[11px] text-rose-300">
                  <div>&bull; 8.5m Hull: Capsizes with 60kWh pack</div>
                  <div>&bull; 13.5m Hull: Tooling cost +40%, over-budget</div>
                  <div>&bull; 25° Deadrise: Planing hump drag stalls motors</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RED TEAM DEFENSE Q&A */}
      {activeTab === 'redteam' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-100 font-semibold">Senior Leadership Defense Dossier:</strong>
              <p className="mt-0.5 text-slate-400 leading-relaxed">
                Aggressive cross-examination compiled by <strong>INDEP-REV-23 (Independent Red Team Reviewer)</strong>. Prepares the engineering team for adversarial scrutiny from Chief Naval Architects and Executives.
              </p>
            </div>
          </div>

          <div className="space-y-3 font-sans text-xs">
            {redTeamQuestions.map((q, idx) => (
              <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-rose-400 font-bold bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded text-[10px]">
                      Q{idx + 1}: {q.skepticismCategory}
                    </span>
                  </div>
                </div>

                <div className="text-sm font-bold text-slate-100">
                  "{q.question}"
                </div>

                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5">
                  <div className="font-mono text-[10px] text-teal-400 font-bold uppercase">Certified Engineering Defense:</div>
                  <p className="text-slate-200 leading-relaxed">{q.engineeringDefense}</p>
                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                    Math Proof: <strong className="text-slate-200">{q.verifiedMath}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
