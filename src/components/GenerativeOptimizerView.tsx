import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Info,
  Waves,
  Users,
  Search,
  FileText
} from 'lucide-react';
import {
  GenerativeDesignOptimizer,
  CandidateDesign,
  LearnedInvariant,
  DesignPhilosophy,
  AgentEvaluation25
} from '../core/optimizer/GenerativeDesignOptimizer';
import { downloadCsv } from '../utils/engineeringUtils';
import { Vessel3DVisualizer } from './Vessel3DVisualizer';

interface GenerativeOptimizerViewProps {
  onAskAi?: (prompt: string, record?: any) => void;
}

export const GenerativeOptimizerView: React.FC<GenerativeOptimizerViewProps> = ({ onAskAi }) => {
  const optimizer = GenerativeDesignOptimizer.getInstance();

  const [activeTab, setActiveTab] = useState<'ledger' | 'studio' | 'agents25' | 'seastates' | 'pareto' | 'invariants' | 'redteam'>('ledger');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [philosophy, setPhilosophy] = useState<DesignPhilosophy>('BALANCED_PATROL');
  const [history, setHistory] = useState<CandidateDesign[]>(() => {
    const existing = optimizer.getHistory();
    if (existing.length === 0) {
      for (let i = 0; i < 5; i++) {
        optimizer.runIteration('BALANCED_PATROL');
      }
      return optimizer.getHistory();
    }
    return existing;
  });
  const [champion, setChampion] = useState<CandidateDesign | null>(() => optimizer.getChampion());
  const [invariants, setInvariants] = useState<LearnedInvariant[]>(() => optimizer.getLearnedInvariants());
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDesign | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 25-Agent tab filters
  const [agentDivisionFilter, setAgentDivisionFilter] = useState<string>('ALL');
  const [agentSearch, setAgentSearch] = useState<string>('');

  // Interactive What-If Studio Sliders
  const [studioParams, setStudioParams] = useState<{
    hullType: 'CATAMARAN' | 'MONOHULL';
    lwlMeters: number;
    beamMeters: number;
    deadriseDeg: number;
    batteryKwh: number;
    motorKwTotal: number;
    lcgPercent: number;
  }>({
    hullType: 'CATAMARAN',
    lwlMeters: 10.8,
    beamMeters: 2.85,
    deadriseDeg: 19.5,
    batteryKwh: 58,
    motorKwTotal: 75,
    lcgPercent: 35.0
  });

  const [candidateVisualTab, setCandidateVisualTab] = useState<'3D' | '2D'>('3D');
  const [studioVisualTab, setStudioVisualTab] = useState<'3D' | '2D'>('3D');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const studioCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state
  const refreshState = () => {
    setHistory([...optimizer.getHistory()]);
    setChampion(optimizer.getChampion());
    setInvariants([...optimizer.getLearnedInvariants()]);
  };

  useEffect(() => {
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
  const activeCandidate = selectedCandidate || champion || history[0] || optimizer.getChampion() || optimizer.getHistory()[0] || null;

  // Studio candidate evaluation
  const studioCandidate = useMemo(() => {
    return optimizer.evaluateCustomHypothesis(studioParams);
  }, [studioParams]);

  // Download CSV of trials
  const handleExportCsv = () => {
    const headers = [
      'Trial ID', 'Generation', 'Topology', 'Philosophy', 'Status', 'Fitness',
      'LWL (m)', 'Beam (m)', 'Draft (m)', 'Deadrise (deg)', 'LCG (%)',
      'Battery (kWh)', 'Motor (kW)', 'Disp (t)', 'KG (m)', 'GMt (m)',
      'Peak Drag (kN)', 'Cruise Drag (kN)', 'Cruise Power (kW)',
      'Sprint Speed (kt)', 'Endurance (h)', 'Range (nm)', 'Slamming (kPa)',
      'Failed Gate', 'Rejection Reason'
    ];
    const rows = history.map((h) => [
      h.id, h.generation, h.hullType, h.philosophy, h.status, h.fitnessScore,
      h.lwlMeters, h.beamMeters, h.draftMeters, h.deadriseDeg, h.lcgPercent,
      h.batteryKwh, h.motorKwTotal, h.displacementTonnes, h.kgMeters, h.gmtMeters,
      h.peakDragKn, h.cruiseDragKn, h.cruisePowerKw,
      h.sprintSpeedKnots, h.enduranceHours, h.rangeNm, h.slammingPressureKpa,
      h.failedGate || 'NONE', h.rejectionReason || 'PASSED'
    ]);
    downloadCsv('USV-01_Generative_Design_Exploration_Ledger.csv', headers, rows);
  };

  // Download Executive Defense Dossier
  const handleDownloadDossier = () => {
    const dossier = optimizer.generateExecutiveDefenseDossierMarkdown(activeCandidate);
    const blob = new Blob([dossier], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `USV-01_Executive_Design_Defense_Dossier_${activeCandidate?.id || 'CHAMPION'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Water Surface
    ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
    ctx.fillRect(0, cy, w, h - cy);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Hull Transverse Section
    const scale = 80;
    const bPx = activeCandidate.beamMeters * scale;
    const dPx = activeCandidate.draftMeters * scale;
    const depthPx = 1.6 * scale;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = activeCandidate.status === 'SURVIVED' ? '#0d9488' : '#e11d48';
    ctx.strokeStyle = activeCandidate.status === 'SURVIVED' ? '#0f766e' : '#be123c';
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

    // Centerline and Center of Gravity (KG)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -depthPx + dPx - 10);
    ctx.lineTo(0, dPx + 15);
    ctx.stroke();

    const kgPx = dPx - activeCandidate.kgMeters * scale;
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(0, kgPx, 4, 0, Math.PI * 2);
    ctx.fill();

    const kmPx = dPx - activeCandidate.kmtMeters * scale;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(0, kmPx, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.font = '10px monospace';
    ctx.fillStyle = '#b45309';
    ctx.fillText(`• KG: ${activeCandidate.kgMeters}m`, 10, 20);
    ctx.fillStyle = '#0369a1';
    ctx.fillText(`• KMt: ${activeCandidate.kmtMeters}m`, 10, 35);
    ctx.fillStyle = activeCandidate.gmtMeters >= 0.35 ? '#059669' : '#dc2626';
    ctx.fillText(`• GMt: ${activeCandidate.gmtMeters}m (${activeCandidate.gmtMeters >= 0.35 ? 'PASS' : 'FAIL'})`, 10, 50);
  }, [activeCandidate]);

  // Draw Studio Canvas
  useEffect(() => {
    const canvas = studioCanvasRef.current;
    if (!canvas || !studioCandidate) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 10;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Water
    ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
    ctx.fillRect(0, cy, w, h - cy);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Hull Section
    const scale = 80;
    const bPx = studioCandidate.beamMeters * scale;
    const dPx = studioCandidate.draftMeters * scale;
    const depthPx = 1.6 * scale;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = studioCandidate.status === 'SURVIVED' ? '#0d9488' : '#be123c';
    ctx.strokeStyle = studioCandidate.status === 'SURVIVED' ? '#059669' : '#e11d48';
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

    ctx.restore();

    ctx.font = '10px monospace';
    ctx.fillStyle = studioCandidate.gmtMeters >= 0.35 ? '#059669' : '#dc2626';
    ctx.fillText(`GMt: ${studioCandidate.gmtMeters}m (${studioCandidate.status})`, 10, 20);
    ctx.fillStyle = '#334155';
    ctx.fillText(`Disp: ${studioCandidate.displacementTonnes}t | Draft: ${studioCandidate.draftMeters}m`, 10, 35);
  }, [studioCandidate]);

  const filteredHistory = history.filter((h) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'SURVIVED') return h.status === 'SURVIVED';
    if (statusFilter === 'REJECTED') return h.status !== 'SURVIVED';
    if (statusFilter === 'CATAMARAN') return h.hullType === 'CATAMARAN';
    if (statusFilter === 'MONOHULL') return h.hullType === 'MONOHULL';
    return h.status === statusFilter;
  });

  const redTeamQuestions = optimizer.generateRedTeamChallenge();

  // Filtered 25 agents
  const filtered25Agents = useMemo(() => {
    if (!activeCandidate || !activeCandidate.agentEvaluations25) return [];
    return activeCandidate.agentEvaluations25.filter(a => {
      const matchDivision = agentDivisionFilter === 'ALL' || a.division === agentDivisionFilter;
      const matchSearch = agentSearch.trim() === '' ||
        a.agentId.toLowerCase().includes(agentSearch.toLowerCase()) ||
        a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
        a.metric.toLowerCase().includes(agentSearch.toLowerCase());
      return matchDivision && matchSearch;
    });
  }, [activeCandidate, agentDivisionFilter, agentSearch]);

  const agentVoteSummary = useMemo(() => {
    if (!activeCandidate || !activeCandidate.agentEvaluations25) return { concur: 0, reservation: 0, veto: 0 };
    return {
      concur: activeCandidate.agentEvaluations25.filter(a => a.vote === 'CONCUR').length,
      reservation: activeCandidate.agentEvaluations25.filter(a => a.vote === 'RESERVATION').length,
      veto: activeCandidate.agentEvaluations25.filter(a => a.vote === 'VETO').length
    };
  }, [activeCandidate]);

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                USV-GEN-OPT // 25-AGENT MULTI-OBJECTIVE
              </span>
              <span className="text-xs font-mono text-slate-400">
                GENERATION #{history[0]?.generation ?? optimizer.getHistory()[0]?.generation ?? 0}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              Generative Multi-Agent Design Optimization & Defense
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              25 specialized engineering agents iteratively generate, debate, stress-test, and eliminate hull candidates using deterministic naval hydrostatics, Savitsky planing equations, ISO 12215 scantlings, and multi-sea-state survivability gates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? 'Pause Evolution' : 'Continuous Evolution'}
            </button>

            <button
              onClick={handleStepOnce}
              disabled={isRunning}
              className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Step Trial
            </button>

            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 flex items-center gap-1"
              title="Reset Search Space"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDownloadDossier}
              className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 flex items-center gap-1.5"
              title="Export Executive Defense Dossier for Senior Leadership"
            >
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              Export Defense Dossier (.md)
            </button>

            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 rounded text-xs font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1"
              title="Export Trials to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              CSV
            </button>
          </div>
        </div>

        {/* PHILOSOPHY SELECTOR & METRICS STRIP */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Design Philosophy:</span>
            <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
              <button
                onClick={() => setPhilosophy('BALANCED_PATROL')}
                className={`px-2.5 py-1 rounded text-xs font-mono ${
                  philosophy === 'BALANCED_PATROL'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Balanced Patrol (10.5m)
              </button>
              <button
                onClick={() => setPhilosophy('ALPHA_SPRINT')}
                className={`px-2.5 py-1 rounded text-xs font-mono ${
                  philosophy === 'ALPHA_SPRINT'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Alpha Sprint (26kt)
              </button>
              <button
                onClick={() => setPhilosophy('BRAVO_ENDURANCE')}
                className={`px-2.5 py-1 rounded text-xs font-mono ${
                  philosophy === 'BRAVO_ENDURANCE'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bravo Endurance (12h)
              </button>
              <button
                onClick={() => setPhilosophy('CHARLIE_GUARDIAN')}
                className={`px-2.5 py-1 rounded text-xs font-mono ${
                  philosophy === 'CHARLIE_GUARDIAN'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Charlie Guardian (Heavy Sea)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-slate-400">
              Trials Run: <strong className="text-slate-200">{history.length}</strong>
            </div>
            <div className="text-slate-400">
              Passed Gates: <strong className="text-emerald-400">{history.filter(h => h.status === 'SURVIVED').length}</strong>
            </div>
            <div className="text-slate-400">
              Learned Invariants: <strong className="text-purple-400">{invariants.length} rules</strong>
            </div>
          </div>
        </div>
      </div>

      {/* TOP CHAMPION & DYNAMIC MORPHING VISUALIZER */}
      {activeCandidate && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Dynamic 3D Boat Model Visualizer & Transverse Stability */}
          <div className="lg:col-span-6 flex flex-col">
            {candidateVisualTab === '3D' ? (
              <Vessel3DVisualizer
                lwlMeters={activeCandidate.lwlMeters}
                beamMeters={activeCandidate.beamMeters}
                draftMeters={activeCandidate.draftMeters}
                deadriseDeg={activeCandidate.deadriseDeg}
                displacementTonnes={activeCandidate.displacementTonnes}
                candidateId={activeCandidate.id}
                status={activeCandidate.status}
                initialHullType={activeCandidate.hullType}
                className="h-full"
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        TRANSVERSE HULL DYNAMICS
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                        activeCandidate.status === 'SURVIVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {activeCandidate.id}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">ARCHIMEDES FLOTATION</span>
                  </div>

                  <div className="mt-3 flex justify-center">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={200}
                      className="rounded border border-slate-800 bg-white shadow-inner w-full max-w-[380px]"
                    />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">LWL x BEAM</span>
                    <span className="font-bold text-slate-200">
                      {activeCandidate.lwlMeters}m x {activeCandidate.beamMeters}m
                    </span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">DISPLACEMENT</span>
                    <span className="font-bold text-slate-200">
                      {activeCandidate.displacementTonnes} tonnes
                    </span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">GMt MARGIN</span>
                    <span className={`font-bold ${activeCandidate.gmtMeters >= 0.35 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeCandidate.gmtMeters}m
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Toggle bar between 3D Model and 2D Cross Section */}
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-[10px] font-mono text-slate-400">VISUALIZATION MODE</span>
              <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px] font-mono">
                <button
                  onClick={() => setCandidateVisualTab('3D')}
                  className={`px-2.5 py-0.5 rounded transition-colors ${
                    candidateVisualTab === '3D'
                      ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  3D Boat Model Viewport
                </button>
                <button
                  onClick={() => setCandidateVisualTab('2D')}
                  className={`px-2.5 py-0.5 rounded transition-colors ${
                    candidateVisualTab === '2D'
                      ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  2D Transverse Stability
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE CANDIDATE PERFORMANCE & DIALECTICAL DEBATE */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-200">
                    MULTI-AGENT CONSENSUS & DEBATE FEED
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    activeCandidate.hullType === 'CATAMARAN'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  }`}>
                    {activeCandidate.hullType === 'CATAMARAN' ? 'TWIN CATAMARAN' : 'DEEP-V MONOHULL'}
                  </span>
                  {activeCandidate.id === champion?.id && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      ★ CURRENT LEADING CHAMPION
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-slate-400">FITNESS:</span>
                  <span className="text-sm font-bold text-purple-400">{activeCandidate.fitnessScore} / 100</span>
                </div>
              </div>

              {/* 5 Physical Gates Telemetry Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs font-mono">
                <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">14KT CRUISE DRAG</span>
                  <span className="font-bold text-slate-200">{activeCandidate.cruiseDragKn} kN</span>
                  <span className="text-[10px] text-slate-500 block">Peak: {activeCandidate.peakDragKn}kN</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">MAX SPRINT SPEED</span>
                  <span className="font-bold text-teal-400">{activeCandidate.sprintSpeedKnots} knots</span>
                  <span className="text-[10px] text-slate-500 block">Installed: {activeCandidate.motorKwTotal}kW</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">PATROL ENDURANCE</span>
                  <span className={`font-bold ${activeCandidate.enduranceHours >= 8 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeCandidate.enduranceHours} hours
                  </span>
                  <span className="text-[10px] text-slate-500 block">Battery: {activeCandidate.batteryKwh}kWh</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">ISO 12215 SLAMMING</span>
                  <span className={`font-bold ${activeCandidate.slammingPressureKpa <= 135 ? 'text-slate-200' : 'text-rose-400'}`}>
                    {activeCandidate.slammingPressureKpa} kPa
                  </span>
                  <span className="text-[10px] text-slate-500 block">Deadrise: {activeCandidate.deadriseDeg}°</span>
                </div>
              </div>

              {/* Debate Transcript */}
              <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {(activeCandidate.debateTranscript || []).map((d, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded text-xs border ${
                      d.sentiment === 'ENDORSE'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : d.sentiment === 'COMPROMISE'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-0.5">
                      <span className="font-bold">{d.agentId} ({d.role})</span>
                      <span className="uppercase font-semibold tracking-wider">{d.sentiment}</span>
                    </div>
                    <p className="text-[11px] leading-snug">{d.statement}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Verdict Footer */}
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">VERDICT:</span>
                <span className={`font-mono font-bold text-xs ${
                  activeCandidate.status === 'SURVIVED' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {activeCandidate.status === 'SURVIVED'
                    ? '✓ PASSED ALL 5 MULTI-AGENT GATES'
                    : `✗ REJECTED: ${activeCandidate.rejectionReason}`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-slate-400">25-Agent Sign-off:</span>
                <span className="text-emerald-400 font-bold">{agentVoteSummary.concur} Concur</span>
                <span className="text-amber-400 font-bold">{agentVoteSummary.reservation} Res</span>
                <span className="text-rose-400 font-bold">{agentVoteSummary.veto} Veto</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex items-center border-b border-slate-800 gap-1 text-xs font-mono overflow-x-auto">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Trial Ledger ({history.length})
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'studio'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-teal-400" />
          Interactive "What-If" Studio
        </button>

        <button
          onClick={() => setActiveTab('agents25')}
          className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'agents25'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          25-Agent Concurrence Matrix ({agentVoteSummary.concur} / 25)
        </button>

        <button
          onClick={() => setActiveTab('seastates')}
          className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'seastates'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Waves className="w-3.5 h-3.5 text-cyan-400" />
          Sea-State Dynamics (SS 1–5)
        </button>

        <button
          onClick={() => setActiveTab('pareto')}
          className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'pareto'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Pareto & Sensitivity
        </button>

        <button
          onClick={() => setActiveTab('invariants')}
          className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'invariants'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Learned Invariants ({invariants.length})
        </button>

        <button
          onClick={() => setActiveTab('redteam')}
          className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'redteam'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          Senior Leadership Red Team
        </button>
      </div>

      {/* TAB 1: TRIAL LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Filter Verdict:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none"
              >
                <option value="ALL">Show All Iterations</option>
                <option value="SURVIVED">Survived Only (Passed All Gates)</option>
                <option value="CATAMARAN">Catamaran Hulls Only</option>
                <option value="MONOHULL">Monohull Hulls Only</option>
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
                  <th className="p-3">Topology</th>
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
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.hullType === 'CATAMARAN'
                            ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                            : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {item.hullType === 'CATAMARAN' ? 'Catamaran' : 'Monohull'}
                        </span>
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

      {/* TAB 2: INTERACTIVE WHAT-IF SENSITIVITY STUDIO */}
      {activeTab === 'studio' && (
        <div className="space-y-5">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed flex items-start gap-3">
            <Sliders className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-100 font-semibold">Live Naval Architecture "What-If" Studio:</strong>
              <p className="mt-1 text-slate-400">
                Directly adjust vessel geometry, energy storage, and deadrise below. Deterministic physics instantly recalculates intact stability, Savitsky drag, endurance, and ISO slamming loads, with real-time feedback from the 25 engineering agents.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Sliders Control Panel */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-200">FREE DESIGN PARAMETERS</span>
                <span className="text-[11px] text-slate-400">7 DEGREES OF FREEDOM</span>
              </div>

              {/* Hull Topology Architecture Selector */}
              <div className="space-y-1.5 p-2.5 bg-slate-950/80 rounded border border-slate-800">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold">Hull Topology Architecture:</span>
                  <span className="text-[10px] text-teal-400 font-bold px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/30">
                    {studioParams.hullType === 'CATAMARAN' ? 'TWIN SLENDER DEMI-HULLS' : 'DEEP-V MONOHULL'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStudioParams({ ...studioParams, hullType: 'CATAMARAN', beamMeters: Math.max(studioParams.beamMeters, 2.7) })}
                    className={`py-1.5 px-3 rounded text-xs font-mono font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      studioParams.hullType === 'CATAMARAN'
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>Catamaran (Twin Hull)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioParams({ ...studioParams, hullType: 'MONOHULL', beamMeters: Math.min(studioParams.beamMeters, 2.8) })}
                    className={`py-1.5 px-3 rounded text-xs font-mono font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      studioParams.hullType === 'MONOHULL'
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>Monohull (Deep-V)</span>
                  </button>
                </div>
              </div>

              {/* Slider 1: LWL */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Waterline Length (LWL):</span>
                  <strong className="text-teal-400">{studioParams.lwlMeters} m</strong>
                </div>
                <input
                  type="range"
                  min={8.5}
                  max={13.5}
                  step={0.1}
                  value={studioParams.lwlMeters}
                  onChange={(e) => setStudioParams({ ...studioParams, lwlMeters: parseFloat(e.target.value) })}
                  className="w-full accent-teal-400 bg-slate-950 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>8.5m (Trailerable)</span>
                  <span>10.5m (Nominal)</span>
                  <span>13.5m (Heavy Patrol)</span>
                </div>
              </div>

              {/* Slider 2: Beam */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Waterline Beam (B):</span>
                  <strong className="text-teal-400">{studioParams.beamMeters} m</strong>
                </div>
                <input
                  type="range"
                  min={2.0}
                  max={3.6}
                  step={0.05}
                  value={studioParams.beamMeters}
                  onChange={(e) => setStudioParams({ ...studioParams, beamMeters: parseFloat(e.target.value) })}
                  className="w-full accent-teal-400 bg-slate-950 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>2.0m (Slender, Low Drag)</span>
                  <span>2.85m (Stable)</span>
                  <span>3.6m (High GMt, Wave Slam)</span>
                </div>
              </div>

              {/* Slider 3: Deadrise */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Transom Deadrise Angle (β):</span>
                  <strong className="text-teal-400">{studioParams.deadriseDeg}°</strong>
                </div>
                <input
                  type="range"
                  min={14.0}
                  max={26.0}
                  step={0.5}
                  value={studioParams.deadriseDeg}
                  onChange={(e) => setStudioParams({ ...studioParams, deadriseDeg: parseFloat(e.target.value) })}
                  className="w-full accent-teal-400 bg-slate-950 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>14° (Fast Planing, Harsh Ride)</span>
                  <span>19.5° (Deep-V Optimal)</span>
                  <span>26° (Soft Wave Piercing)</span>
                </div>
              </div>

              {/* Slider 4: Battery */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Battery Capacity (E_batt):</span>
                  <strong className="text-teal-400">{studioParams.batteryKwh} kWh</strong>
                </div>
                <input
                  type="range"
                  min={35}
                  max={90}
                  step={1}
                  value={studioParams.batteryKwh}
                  onChange={(e) => setStudioParams({ ...studioParams, batteryKwh: parseFloat(e.target.value) })}
                  className="w-full accent-teal-400 bg-slate-950 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>35 kWh (Lightweight, 5h)</span>
                  <span>58 kWh (8.5h Patrol)</span>
                  <span>90 kWh (13h Endurance, Heavy)</span>
                </div>
              </div>

              {/* Slider 5: Motor Power */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Installed Motor Power (Twin Pods):</span>
                  <strong className="text-teal-400">{studioParams.motorKwTotal} kW</strong>
                </div>
                <input
                  type="range"
                  min={40}
                  max={120}
                  step={5}
                  value={studioParams.motorKwTotal}
                  onChange={(e) => setStudioParams({ ...studioParams, motorKwTotal: parseFloat(e.target.value) })}
                  className="w-full accent-teal-400 bg-slate-950 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>40 kW (Economic 16kt)</span>
                  <span>75 kW (Nominal 24kt)</span>
                  <span>120 kW (Sprint 28kt)</span>
                </div>
              </div>
            </div>

            {/* Studio Physics Feedback */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-200">STUDIO TELEMETRY</span>
                    <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px] font-mono">
                      <button
                        onClick={() => setStudioVisualTab('3D')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          studioVisualTab === '3D'
                            ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        3D Model
                      </button>
                      <button
                        onClick={() => setStudioVisualTab('2D')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          studioVisualTab === '2D'
                            ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        2D Section
                      </button>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    studioCandidate.status === 'SURVIVED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {studioCandidate.status}
                  </span>
                </div>

                {studioVisualTab === '3D' ? (
                  <div className="mt-3">
                    <Vessel3DVisualizer
                      lwlMeters={studioParams.lwlMeters}
                      beamMeters={studioParams.beamMeters}
                      draftMeters={studioCandidate.draftMeters}
                      deadriseDeg={studioParams.deadriseDeg}
                      displacementTonnes={studioCandidate.displacementTonnes}
                      candidateId="WHAT-IF-STUDIO"
                      status={studioCandidate.status}
                      initialHullType={studioParams.hullType}
                      showPhotoRenderToggle={false}
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex justify-center">
                    <canvas
                      ref={studioCanvasRef}
                      width={320}
                      height={130}
                      className="rounded border border-slate-800 bg-white shadow-inner w-full max-w-[320px]"
                    />
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">GMt STABILITY</span>
                    <span className={`font-bold ${studioCandidate.gmtMeters >= 0.35 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {studioCandidate.gmtMeters} m
                    </span>
                    <span className="text-[10px] text-slate-500 block">IMO Limit: &gt;= 0.35m</span>
                  </div>

                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">SPRINT SPEED</span>
                    <span className="font-bold text-teal-400">{studioCandidate.sprintSpeedKnots} knots</span>
                    <span className="text-[10px] text-slate-500 block">Peak Drag: {studioCandidate.peakDragKn}kN</span>
                  </div>

                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">PATROL ENDURANCE</span>
                    <span className={`font-bold ${studioCandidate.enduranceHours >= 8.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {studioCandidate.enduranceHours} hrs
                    </span>
                    <span className="text-[10px] text-slate-500 block">Mission Target: 8.0h</span>
                  </div>

                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">ISO SLAMMING</span>
                    <span className={`font-bold ${studioCandidate.slammingPressureKpa <= 135 ? 'text-slate-200' : 'text-rose-400'}`}>
                      {studioCandidate.slammingPressureKpa} kPa
                    </span>
                    <span className="text-[10px] text-slate-500 block">Limit: 135 kPa</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Agents Critical Reaction:</span>
                <p className="mt-1 text-slate-300 leading-snug">
                  {studioCandidate.status === 'SURVIVED'
                    ? `✓ Balanced solution! GMt=${studioCandidate.gmtMeters}m offers safe restoring arm; ${studioCandidate.batteryKwh}kWh battery safely supports ${studioCandidate.enduranceHours}h patrol without overload.`
                    : `✗ ${studioCandidate.rejectionReason}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 25-AGENT CONCURRENCE & VETO MATRIX */}
      {activeTab === 'agents25' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <strong className="text-slate-100 font-semibold">25-Agent Multi-Disciplinary Concurrence Matrix:</strong>
              <p className="text-slate-400 mt-0.5">
                Full governance sign-off record for Candidate <strong>{activeCandidate?.id}</strong>. Every specialized agent across all 5 engineering divisions evaluates their statutory criteria.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                {agentVoteSummary.concur} CONCUR
              </span>
              <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                {agentVoteSummary.reservation} RESERVATION
              </span>
              <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                {agentVoteSummary.veto} VETO
              </span>
            </div>
          </div>

          {/* Division Filter & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded border border-slate-800">
              {['ALL', 'DIRECTORATE', 'NAVAL_ARCH', 'PROPULSION', 'AUTONOMY', 'SYSTEMS'].map((div) => (
                <button
                  key={div}
                  onClick={() => setAgentDivisionFilter(div)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    agentDivisionFilter === div
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {div.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search agent ID, metric, name..."
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none placeholder-slate-500"
              />
            </div>
          </div>

          {/* 25 Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
            {filtered25Agents.map((agent) => (
              <div
                key={agent.agentId}
                className={`p-3.5 rounded-lg border flex flex-col justify-between space-y-2.5 ${
                  agent.vote === 'CONCUR'
                    ? 'bg-slate-900/90 border-slate-800'
                    : agent.vote === 'RESERVATION'
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-rose-500/5 border-rose-500/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                    <span className="font-bold text-slate-200">{agent.agentId}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      agent.vote === 'CONCUR'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : agent.vote === 'RESERVATION'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}>
                      {agent.vote}
                    </span>
                  </div>

                  <div className="text-[11px] font-sans font-semibold text-slate-300 mt-1">
                    {agent.name}
                  </div>

                  <div className="text-[10px] text-teal-400 mt-1 font-mono">
                    Criteria: {agent.metric}
                  </div>
                </div>

                <div className="p-2 bg-slate-950/70 rounded text-[11px] font-sans text-slate-300 leading-snug">
                  {agent.rationale}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SEA-STATE SURVIVABILITY GATES (SS 1 - 5) */}
      {activeTab === 'seastates' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed flex items-start gap-3">
            <Waves className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-100 font-semibold">Multi-Sea-State Dynamics & Dynamic Resonance Audit:</strong>
              <p className="mt-1 text-slate-400">
                Senior naval architects require proof that hull performance is not confined to calm-water equations. This module evaluates vertical accelerations (a_cg), slamming shock loads, and synchronous roll resonance across Sea States 1 through 5.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-xs">
            {activeCandidate?.seaStates?.map((ss) => (
              <div
                key={ss.seaState}
                className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="font-bold text-cyan-400">SEA STATE {ss.seaState}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      ss.slammingRisk === 'MINIMAL'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : ss.slammingRisk === 'MODERATE'
                        ? 'bg-teal-500/20 text-teal-300'
                        : ss.slammingRisk === 'ELEVATED'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {ss.slammingRisk}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 font-sans mt-1">
                    {ss.description}
                  </div>

                  <div className="mt-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Wave Height (Hs):</span>
                      <strong className="text-slate-200">{ss.significantWaveHeightM} m</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Vertical Accel (a_cg):</span>
                      <strong className={ss.verticalAccelG <= 2.5 ? 'text-emerald-400' : 'text-amber-400'}>
                        {ss.verticalAccelG} g
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Roll Period (T_phi):</span>
                      <strong className="text-slate-200">{ss.naturalRollPeriodSec} s</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Resonance Hazard:</span>
                      <strong className={ss.rollResonanceRisk ? 'text-rose-400' : 'text-emerald-400'}>
                        {ss.rollResonanceRisk ? 'CRITICAL' : 'SAFE'}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Deck Wetness Prob:</span>
                      <strong className="text-slate-200">{ss.deckWetnessProbabilityPercent}%</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                  {ss.seaState <= 3 ? 'Normal Operations Approved' : ss.seaState === 4 ? 'Seakeeping Envelope Limit' : 'Survival Mode / Storm Loiter'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PARETO FRONTIER & SOBOL SENSITIVITIES */}
      {activeTab === 'pareto' && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200">
                Multi-Variable Pareto Frontier: Sprint Speed vs. Patrol Endurance vs. Intact Stability
              </h3>
              <span className="text-[10px] font-mono text-slate-400">THE KNEE OF THE CURVE</span>
            </div>

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
                  <div>&bull; 8.5m Hull: Capsizes with 60kWh pack (GMt=0.18m)</div>
                  <div>&bull; 13.5m Hull: Tooling cost +40%, over-budget</div>
                  <div>&bull; 25° Deadrise: Planing hump drag stalls motors</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sobol Parameter Sensitivity Decomposition */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="space-y-0.5">
                <h3 className="text-xs font-semibold text-slate-200">
                  Sobol Global Sensitivity Analysis (S_i & S_Ti Decomposition)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Quantifies which parameters most heavily dictate stability, drag, and mission success.
                </p>
              </div>
              <span className="text-[10px] font-mono text-purple-400">VARIANCE DECOMPOSITION</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {activeCandidate?.sobolSensitivities?.map((s) => (
                <div key={s.parameter} className="p-3.5 bg-slate-950 rounded border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{s.displayName}</span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span>First-Order S_i: <strong className="text-teal-400">{s.firstOrderIndex}</strong></span>
                      <span>Total-Effect S_Ti: <strong className="text-purple-400">{s.totalEffectIndex}</strong></span>
                    </div>
                  </div>

                  {/* Sensitivity Bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="bg-teal-400 h-full"
                      style={{ width: `${s.firstOrderIndex * 100}%` }}
                      title={`First Order: ${s.firstOrderIndex}`}
                    />
                    <div
                      className="bg-purple-500 h-full opacity-60"
                      style={{ width: `${(s.totalEffectIndex - s.firstOrderIndex) * 100}%` }}
                      title={`Interaction Effect: ${(s.totalEffectIndex - s.firstOrderIndex).toFixed(2)}`}
                    />
                  </div>

                  <div className="text-[11px] font-sans text-slate-300 flex items-start justify-between gap-3 pt-1">
                    <div>
                      <span className="text-slate-500 font-mono text-[10px] uppercase">Primary Target: </span>
                      {s.primaryTarget}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Guidance: {s.architecturalGuidance}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PERMANENT LEARNED INVARIANTS */}
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

      {/* TAB 7: RED TEAM DEFENSE Q&A */}
      {activeTab === 'redteam' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 font-semibold">Senior Leadership Defense Dossier:</strong>
                <p className="mt-0.5 text-slate-400 leading-relaxed">
                  Aggressive cross-examination compiled by <strong>INDEP-REV-24 (Independent Red Team Reviewer)</strong>. Prepares the engineering team for adversarial scrutiny from Chief Naval Architects, Executives, and Classification Societies.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadDossier}
              className="px-3.5 py-1.5 rounded text-xs font-mono font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download Formal Dossier (.md)
            </button>
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
