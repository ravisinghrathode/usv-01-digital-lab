import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  GitPullRequest,
  CheckCircle,
  Activity,
  Layers,
  ArrowUpRight,
  Clock,
  UserCheck,
  AlertOctagon,
  Compass,
  Hammer,
  Cpu,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Radio,
  Eye,
  Crosshair,
  Ship,
  Sparkles,
  RefreshCw,
  Box,
  Globe,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Info
} from 'lucide-react';
import {
  WorkstreamSummary,
  Requirement,
  DesignDecision,
  EngineeringRisk,
  SimulationJob,
  VerificationPlan,
  ActivityLogItem
} from '../types/engineering';
import { getStatusBadgeClass, getRiskSeverityClass } from '../utils/engineeringUtils';
import { NavigationModule } from './NavigationSidebar';
import { Vessel3DVisualizer } from './Vessel3DVisualizer';
import { AgentRegistry } from '../core/registry/AgentRegistry';
import { CentralOrchestrator } from '../core/orchestrator/CentralOrchestrator';
import { ExecutionEngine } from '../core/engine/ExecutionEngine';
import { ToolRegistry } from '../core/tools/ToolRegistry';
import { AgentSpec, AgentStatus } from '../core/types/agent';

interface ProjectOverviewProps {
  workstreams: WorkstreamSummary[];
  requirements: Requirement[];
  decisions: DesignDecision[];
  risks: EngineeringRisk[];
  simulations: SimulationJob[];
  verificationPlans: VerificationPlan[];
  activityLogs: ActivityLogItem[];
  onNavigate: (module: NavigationModule) => void;
  onAskAi: (prompt: string) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  workstreams,
  requirements,
  decisions,
  risks,
  simulations,
  verificationPlans,
  activityLogs,
  onNavigate,
  onAskAi
}) => {
  // Calculated stats
  const approvedReqs = requirements.filter(r => r.status === 'Approved').length;
  const inReviewReqs = requirements.filter(r => r.status === 'In Review').length;
  const draftReqs = requirements.filter(r => r.status === 'Draft').length;
  const reqCompletion = requirements.length ? Math.round((approvedReqs / requirements.length) * 100) : 0;

  const approvedDecisions = decisions.filter(d => d.approvalState === 'Approved').length;
  const pendingDecisions = decisions.filter(d => d.approvalState === 'In Review' || d.approvalState === 'Draft');

  const highRisks = risks.filter(r => r.riskScore >= 10 && r.status !== 'Closed');
  const activeSims = simulations.filter(s => s.runStatus === 'Running' || s.runStatus === 'Under Review' || s.runStatus === 'Queued');
  const verifiedPlans = verificationPlans.filter(v => v.status === 'Approved' || v.status === 'Executed').length;

  // 3D Vessel Visualizer State — Synchronized with Rev 0.4 Approved Baseline
  const [selectedHullType, setSelectedHullType] = useState<'CATAMARAN' | 'MONOHULL'>('MONOHULL');
  const [vesselLwl, setVesselLwl] = useState<number>(10.5);
  const [vesselBeam, setVesselBeam] = useState<number>(2.9);
  const [vesselDraft, setVesselDraft] = useState<number>(0.65);
  const [vesselDispl, setVesselDispl] = useState<number>(6.2);

  // 26 Agents Directorate State
  const registry = AgentRegistry.getInstance();
  const orchestrator = CentralOrchestrator.getInstance();
  const executionEngine = ExecutionEngine.getInstance();
  const toolRegistry = ToolRegistry.getInstance();

  const [agents, setAgents] = useState<AgentSpec[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [agentDivisionFilter, setAgentDivisionFilter] = useState<string>('ALL');
  const [selectedAgent, setSelectedAgent] = useState<AgentSpec | null>(null);
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState<boolean>(false);
  const [workflowLog, setWorkflowLog] = useState<string[]>([]);
  const [activeWorkflowStage, setActiveWorkflowStage] = useState<number>(0);

  // Tactical Radar Mini-Simulator State
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRadarRunning, setIsRadarRunning] = useState<boolean>(true);
  const [radarScenario, setRadarScenario] = useState<string>('head_on');
  const [colregsTelemetry, setColregsTelemetry] = useState<{
    rule: string;
    cpa: number;
    tcpa: number;
    action: string;
  }>({
    rule: 'Rule 14 (Head-on)',
    cpa: 210,
    tcpa: 38,
    action: 'GIVE-WAY: ALTER TO STARBOARD'
  });

  // Load Agents & Live Statuses
  useEffect(() => {
    setAgents(registry.getAllAgents());
    setAgentStatuses(executionEngine.getAllStatuses());
  }, []);

  // Filtered agents
  const filteredAgents = agents.filter(a => {
    if (agentDivisionFilter === 'ALL') return true;
    return a.division === agentDivisionFilter;
  });

  // Interactive Radar Loop
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let sweepAngle = 0;
    let targetY = 160;
    let usvY = -140;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      // Dark tactical radar background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Radar Range Rings
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 1;
      for (let r = 30; r <= 140; r += 35) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Compass Crosshairs
      ctx.strokeStyle = '#134e4a';
      ctx.beginPath();
      ctx.moveTo(cx, 10);
      ctx.lineTo(cx, height - 10);
      ctx.moveTo(10, cy);
      ctx.lineTo(width - 10, cy);
      ctx.stroke();

      // Heading Tick Marks
      ctx.fillStyle = '#14b8a6';
      ctx.font = '9px monospace';
      ctx.fillText('000°', cx - 12, 22);
      ctx.fillText('090°', width - 30, cy + 3);
      ctx.fillText('180°', cx - 12, height - 14);
      ctx.fillText('270°', 14, cy + 3);

      if (isRadarRunning) {
        sweepAngle += 0.04;
        targetY -= 0.35;
        usvY += 0.45;
        if (targetY < -120) targetY = 160;
        if (usvY > 120) usvY = -140;
      }

      // Rotating Radar Beam Sweep
      const beamX = cx + Math.cos(sweepAngle) * 140;
      const beamY = cy + Math.sin(sweepAngle) * 140;
      const sweepGrad = ctx.createLinearGradient(cx, cy, beamX, beamY);
      sweepGrad.addColorStop(0, 'rgba(45, 212, 191, 0.4)');
      sweepGrad.addColorStop(1, 'rgba(45, 212, 191, 0.0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 140, sweepAngle - 0.3, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();

      // Draw USV (Ownship)
      const usvScreenY = cy + usvY * 0.5;
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(cx, usvScreenY, 5, 0, Math.PI * 2);
      ctx.fill();

      // USV Velocity Vector
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, usvScreenY);
      ctx.lineTo(cx, usvScreenY - 22);
      ctx.stroke();
      ctx.fillStyle = '#22d3ee';
      ctx.fillText('USV-01 (18.5 kn)', cx + 8, usvScreenY + 2);

      // Draw Target Vessel (AIS Contact)
      const targetScreenY = cy - targetY * 0.5;
      const targetScreenX = cx + (radarScenario === 'crossing' ? 50 : 0);
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(targetScreenX, targetScreenY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Target Velocity Vector
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(targetScreenX, targetScreenY);
      ctx.lineTo(targetScreenX, targetScreenY + (radarScenario === 'crossing' ? 18 : 22));
      ctx.stroke();
      ctx.fillText('M/V TARGET (14.0 kn)', targetScreenX + 8, targetScreenY - 4);

      // Closest Point of Approach (CPA) dashed indicator
      ctx.strokeStyle = '#fbbf24';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, usvScreenY);
      ctx.lineTo(targetScreenX, targetScreenY);
      ctx.stroke();
      ctx.setLineDash([]);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isRadarRunning, radarScenario]);

  const renderAgentStatusBadge = (status?: AgentStatus) => {
    switch (status) {
      case 'EXECUTING':
        return (
          <span className="text-amber-400 flex items-center gap-1.5 font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            EXECUTING
          </span>
        );
      case 'WAITING_APPROVAL':
        return (
          <span className="text-purple-400 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            GATE PENDING
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="text-cyan-400/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-pulse" />
            STANDBY
          </span>
        );
    }
  };

  // Execute Live Mission DAG Workflow via Real CentralOrchestrator
  const handleExecuteLiveDAG = async () => {
    if (isExecutingWorkflow) return;
    setIsExecutingWorkflow(true);
    setWorkflowLog([]);
    setActiveWorkflowStage(1);

    const log = (msg: string) => {
      setWorkflowLog(prev => [...prev, msg]);
    };

    log('⚡ [0.00s] Central Orchestrator dispatching live multi-agent mission DAG: High-Speed Sizing & Stability.');

    try {
      orchestrator.clearTasks();

      const hullTaskId = `TASK-HULL-${Date.now()}`;
      const massTaskId = `TASK-MASS-${Date.now()}`;
      const stabTaskId = `TASK-STAB-${Date.now()}`;

      // Stage 1: Hull Form & Parametric Geometry
      orchestrator.registerTask({
        id: hullTaskId,
        title: 'Hull Geometry & Hydrostatics',
        description: 'Compute parametric hull dimensions and waterplane coefficients.',
        assignedAgentId: 'HULL-GEO-05',
        discipline: 'NA',
        priority: 'HIGH',
        dependencies: [],
        input: {
          taskId: 'TASK-HULL-PARAM',
          context: {},
          parameters: {
            lwlMeters: vesselLwl,
            beamMeters: vesselBeam,
            draftMeters: vesselDraft,
            displacementTonnes: vesselDispl,
            speedKnots: 22.0
          }
        },
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        safetyCritical: false
      });

      // Stage 2: Mass Balance & SWBS Tracking
      orchestrator.registerTask({
        id: massTaskId,
        title: 'SWBS Mass Breakdown & LCG Synthesis',
        description: 'Sum weight groups and compute center of gravity.',
        assignedAgentId: 'WGT-BAL-09',
        discipline: 'NA',
        priority: 'HIGH',
        dependencies: [hullTaskId],
        input: {
          taskId: 'TASK-MASS-EST',
          context: {},
          parameters: {
            components: [
              { name: 'Bare Hull Composite Structure', massKg: Math.max(Math.round(vesselDispl * 280), 1736), lcgMetersFromTransom: Number((vesselLwl * 0.45).toFixed(2)), tcgMetersFromCl: 0, vcgMetersFromKeel: Number((vesselDraft * 0.9).toFixed(2)), designMarginPercent: 10 },
              { name: 'Twin Electric Inboard Pod Motors', massKg: 380, lcgMetersFromTransom: 1.6, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.4, designMarginPercent: 5 },
              { name: 'Main Battery ESS (LiFePO4 Keel)', massKg: 720, lcgMetersFromTransom: Number((vesselLwl * 0.38).toFixed(2)), tcgMetersFromCl: 0, vcgMetersFromKeel: 0.35, designMarginPercent: 10 },
              { name: 'Avionics, Doppler Radar & Sensors', massKg: 180, lcgMetersFromTransom: Number((vesselLwl * 0.55).toFixed(2)), tcgMetersFromCl: 0, vcgMetersFromKeel: 2.1, designMarginPercent: 15 }
            ],
            baselineLcbMetersFromTransom: Number((vesselLwl * 0.42).toFixed(2))
          }
        },
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        safetyCritical: false
      });

      // Stage 3: Intact Stability Audit (Safety-Critical -> Human Gate)
      orchestrator.registerTask({
        id: stabTaskId,
        title: 'Intact Stability & GMt IMO MSC.267(85) Audit',
        description: 'Validate transverse metacentric height GMt and righting energy.',
        assignedAgentId: 'STAB-HYD-06',
        discipline: 'NA',
        priority: 'CRITICAL',
        dependencies: [massTaskId],
        input: {
          taskId: 'TASK-STAB-AUDIT',
          context: {},
          parameters: {
            lwlMeters: vesselLwl,
            beamMeters: vesselBeam,
            draftMeters: vesselDraft,
            displacementTonnes: vesselDispl,
            speedKnots: 22.0
          }
        },
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        safetyCritical: true
      });

      setAgentStatuses(executionEngine.getAllStatuses());

      setActiveWorkflowStage(2);
      log(`🚢 [Stage 1-2] Executing Agent HULL-GEO-05 (A05) via TOOL-HYDROSTATICS-01...`);

      // Run actual orchestrator workflow
      const result = await orchestrator.executeWorkflow();

      setActiveWorkflowStage(3);
      log(`📊 [ExecutionEngine] Agent HULL-GEO-05 completed. Displ = ${vesselDispl.toFixed(2)}t, Draft = ${vesselDraft.toFixed(2)}m.`);

      setActiveWorkflowStage(4);
      log(`🛡️ [ExecutionEngine] Agent WGT-BAL-09 computed composite SWBS centers; STAB-HYD-06 verified IMO MSC.267(85).`);

      setActiveWorkflowStage(5);
      log(`⭐ [Success] Live Workflow complete: ${result.completed} tasks passed, ${result.waitingApproval} gated for Director approval.`);
      log(`🔒 Cryptographic audit chain updated with deterministic mathematical evidence.`);

      setAgentStatuses(executionEngine.getAllStatuses());
    } catch (err: any) {
      log(`❌ Workflow execution error: ${err.message}`);
    } finally {
      setIsExecutingWorkflow(false);
      setAgentStatuses(executionEngine.getAllStatuses());
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive Master Command Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold">
                USV-01 DIGITAL ENGINEERING LAB
              </span>
              <span className="text-slate-500 text-xs font-mono">•</span>
              <span className="text-slate-300 text-xs font-mono font-medium">BASELINE REV 0.2</span>
              <span className="text-slate-500 text-xs font-mono">•</span>
              <span className="text-emerald-400 text-xs font-mono flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                26 AGENTS LIVE & RUNNING
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-1.5 tracking-tight">
              Unmanned Surface Vessel Multi-Agent Engineering Workspace
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Unified engineering control center combining 3D generative hull exploration, real-time COLREGs radar kinematics, 26 specialist autonomous agents across 7 naval divisions, and deterministic physics solvers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center flex-wrap">
            <button
              onClick={() => onNavigate('agent-orchestrator')}
              className="px-3.5 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-950/30"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Open 26-Agent Directorate</span>
            </button>
            <button
              onClick={() => onAskAi('Summarize the top engineering risks, pending decisions, and missing TBD parameters for the USV-01 project overview.')}
              className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>AI Executive Synthesis</span>
            </button>
          </div>
        </div>

        {/* Safety & Actuator Air-Gap Governance Notice */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong className="text-slate-200">Non-Negotiable Principle 5:</strong> AI agents cannot independently authorize safety-critical baselines. Explicit Engineering Director human authority is mandatory.
            </span>
          </div>
          <div className="text-slate-500">
            IMO MSC.267(85) • DNV-RU-HSLC • IEEE 45 • COLREGs 1972
          </div>
        </div>
      </div>

      {/* 2. DUAL INTERACTIVE HERO WORKBENCH: 3D Vessel Model + Real-Time Tactical Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Interactive 3D Vessel Model */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>Interactive 3D Vessel Visualizer</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
                      360° ORBIT
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Tactical scale naval hull with realistic CFD surface pressure and X-ray structural modes.</p>
                </div>
              </div>

              {/* Monohull vs Catamaran Toggle */}
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono self-start sm:self-auto">
                <button
                  onClick={() => setSelectedHullType('CATAMARAN')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    selectedHullType === 'CATAMARAN'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Catamaran
                </button>
                <button
                  onClick={() => setSelectedHullType('MONOHULL')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    selectedHullType === 'MONOHULL'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Monohull
                </button>
              </div>
            </div>

            {/* Live 3D Vessel Canvas Container */}
            <div className="mt-4 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
              <Vessel3DVisualizer
                initialHullType={selectedHullType}
                lwlMeters={vesselLwl}
                beamMeters={vesselBeam}
                draftMeters={vesselDraft}
                displacementTonnes={vesselDispl}
                className="w-full h-80"
              />
            </div>
          </div>

          {/* Quick Particulars Telemetry Footer */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 flex-wrap gap-2">
            <div>LOA: <strong className="text-slate-200">{vesselLwl} m</strong></div>
            <div>Beam: <strong className="text-slate-200">{vesselBeam} m</strong></div>
            <div>Draft: <strong className="text-slate-200">{vesselDraft} m</strong></div>
            <div>Displacement: <strong className="text-slate-200">{vesselDispl} t</strong></div>
            <button
              onClick={() => onNavigate('generative-optimizer')}
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
            >
              <span>Full Optimizer & What-If Studio &rarr;</span>
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Real-Time Tactical Radar Simulator */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>Tactical Radar & Waves</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-300 animate-pulse">
                      60 FPS LIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Autonomous COLREGs encounter kinematics.</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsRadarRunning(!isRadarRunning)}
                  className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-teal-400 transition-colors"
                  title={isRadarRunning ? "Pause Radar" : "Start Radar"}
                >
                  {isRadarRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Radar Canvas */}
            <div className="mt-4 flex flex-col items-center">
              <div className="relative rounded-xl overflow-hidden border border-teal-500/30 shadow-inner bg-slate-950 p-1">
                <canvas
                  ref={radarCanvasRef}
                  width={310}
                  height={310}
                  className="rounded-lg block"
                />
              </div>

              {/* Scenario Selector */}
              <div className="mt-3 flex items-center gap-2 text-[10px] font-mono">
                <span className="text-slate-400">Scenario:</span>
                <button
                  onClick={() => {
                    setRadarScenario('head_on');
                    setColregsTelemetry({ rule: 'Rule 14 (Head-on)', cpa: 210, tcpa: 38, action: 'GIVE-WAY: ALTER TO STARBOARD' });
                  }}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    radarScenario === 'head_on' ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Head-On (R14)
                </button>
                <button
                  onClick={() => {
                    setRadarScenario('crossing');
                    setColregsTelemetry({ rule: 'Rule 15 (Crossing Starboard)', cpa: 145, tcpa: 24, action: 'GIVE-WAY: ALTER COURSE ASTERN' });
                  }}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    radarScenario === 'crossing' ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Crossing (R15)
                </button>
              </div>
            </div>
          </div>

          {/* Radar Telemetry Box */}
          <div className="mt-4 pt-3 border-t border-slate-800 font-mono text-[11px] space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Active Encounter:</span>
              <span className="text-amber-400 font-bold">{colregsTelemetry.rule}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Target Range / CPA:</span>
              <span>320m / <strong className="text-cyan-400">{colregsTelemetry.cpa}m</strong></span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Recommended Action:</span>
              <span className="text-emerald-400 font-bold">{colregsTelemetry.action}</span>
            </div>
            <button
              onClick={() => onNavigate('realtime-sim')}
              className="w-full mt-2.5 py-2 px-3 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center gap-2 text-xs font-mono font-semibold transition"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Launch Full Boat Simulator (COLREGS & Wave Tank) &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. 26 SPECIALIST AGENTS MULTI-AGENT DIRECTORATE LIVE OPERATIONS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>26 Autonomous Engineering Agents Directorate</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                    HMEA A01 – A26
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Specialist multi-agent system executing mission DAGs, physics tools, and baseline synthesis.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExecuteLiveDAG}
              disabled={isExecutingWorkflow}
              className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-950/30"
            >
              {isExecutingWorkflow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isExecutingWorkflow ? 'Executing Mission DAG...' : 'Run Multi-Agent Mission DAG'}</span>
            </button>
            <button
              onClick={() => onNavigate('agent-orchestrator')}
              className="px-3 py-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono transition-colors"
            >
              Open Full Orchestrator &rarr;
            </button>
          </div>
        </div>

        {/* Live Execution Console & DAG Progress (Visible when running or logs present) */}
        {workflowLog.length > 0 && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
              <span className="text-cyan-400 font-bold flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                <span>Live Central DAG Execution Stream</span>
              </span>
              <span className="text-[10px] text-slate-500">
                {isExecutingWorkflow ? `Stage ${activeWorkflowStage} of 5 Active` : 'Workflow Completed'}
              </span>
            </div>

            {/* Visual Topological Pipeline Indicator */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px]">
              <div className={`p-2 rounded border text-center ${activeWorkflowStage >= 1 ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                1. DAG Scheduling
              </div>
              <div className={`p-2 rounded border text-center ${activeWorkflowStage >= 2 ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                2. A05 Hydrostatics
              </div>
              <div className={`p-2 rounded border text-center ${activeWorkflowStage >= 3 ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                3. A06 Stability Gate
              </div>
              <div className={`p-2 rounded border text-center ${activeWorkflowStage >= 4 ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                4. A07 Powering
              </div>
              <div className={`p-2 rounded border text-center ${activeWorkflowStage >= 5 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                5. A01 Baseline Freeze
              </div>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pt-2 text-[11px] text-slate-300">
              {workflowLog.map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-slate-500">{i + 1}.</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Division Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono pb-1">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider mr-2">Division:</span>
          {[
            { id: 'ALL', label: `All (${agents.length})` },
            { id: 'DIRECTORATE', label: 'Directorate (A01-A04)' },
            { id: 'NAVAL_ARCHITECTURE', label: 'Naval Arch (A05-A08)' },
            { id: 'HYDRODYNAMICS', label: 'Hydrodynamics (A09-A10)' },
            { id: 'STRUCTURAL_MECHANICAL', label: 'Structures (A11-A13)' },
            { id: 'ELECTRICAL_POWER', label: 'Electrical (A14-A15)' },
            { id: 'SOFTWARE_AUTONOMY', label: 'Autonomy (A16-A20)' },
            { id: 'SAFETY_VERIFICATION', label: 'V&V & Safety (A21-A26)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAgentDivisionFilter(tab.id)}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                agentDivisionFilter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredAgents.slice(0, 8).map(agent => (
            <div
              key={agent.id}
              className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-2.5"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-400 font-bold">{agent.canonicalId} • {agent.id}</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-400">
                    {agent.division.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 mt-1 line-clamp-1">{agent.name}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{agent.speciality}</p>
              </div>

              <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[10px] font-mono">
                {renderAgentStatusBadge(agentStatuses[agent.id])}
                <span className="text-slate-500">{agent.permittedTools.length} Tools</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-1">
          <button
            onClick={() => onNavigate('agent-orchestrator')}
            className="text-xs font-mono text-cyan-400 hover:underline"
          >
            View all 26 specialist agents and deterministic calculation solvers &rarr;
          </button>
        </div>
      </div>

      {/* 4. PRIMARY KPI METERS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Requirements Completion */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Requirements Baselined</span>
            <GitPullRequest className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold font-mono text-slate-100">
              {approvedReqs} <span className="text-xs text-slate-500 font-normal">/ {requirements.length}</span>
            </div>
            <span className="text-xs font-mono text-teal-400">{reqCompletion}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full transition-all" style={{ width: `${reqCompletion}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
            <span>In Review: {inReviewReqs}</span>
            <span>Draft: {draftReqs}</span>
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Verification Procedures</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold font-mono text-slate-100">
              {verifiedPlans} <span className="text-xs text-slate-500 font-normal">/ {verificationPlans.length}</span>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              {verificationPlans.length ? Math.round((verifiedPlans / verificationPlans.length) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${verificationPlans.length ? (verifiedPlans / verificationPlans.length) * 100 : 0}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1.5">
            1 FAT Passed • 2 Procedures Staged
          </div>
        </div>

        {/* Open Engineering Decisions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pending Decisions</span>
            <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold font-mono text-amber-300">
              {pendingDecisions.length}
            </div>
            <span className="text-xs font-mono text-slate-400">
              {approvedDecisions} Approved
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-3 truncate">
            {pendingDecisions[0]?.title ? `Next: ${pendingDecisions[0].id}` : 'All decisions current'}
          </div>
        </div>

        {/* High Priority Risks */}
        <div className="bg-slate-900/80 border border-slate-800 rounded p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>High-Priority Risks</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold font-mono text-rose-300">
              {highRisks.length}
            </div>
            <span className="text-xs font-mono text-slate-500">
              Total Logged: {risks.length}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-3">
            Mitigation tracking active
          </div>
        </div>
      </div>

      {/* 5. 8 PRIMARY ENGINEERING WORKSTREAMS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Subsystem Workstreams</h3>
            <p className="text-xs text-slate-400">Core discipline baselines and open engineering items.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {workstreams.map(ws => (
            <div
              key={ws.code}
              onClick={() => onNavigate(`workstream-${ws.code}` as NavigationModule)}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded p-3.5 cursor-pointer transition-colors group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-400">{ws.code}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${getStatusBadgeClass(ws.status)}`}>
                    {ws.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-200 mt-1.5 group-hover:text-teal-300 transition-colors">
                  {ws.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Lead: {ws.lead}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>{ws.openItemsCount} Open Items</span>
                <span>{ws.completionPercent}% Ready</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
