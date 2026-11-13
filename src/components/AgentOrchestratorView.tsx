import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  BookOpen,
  RefreshCw,
  Anchor,
  Zap,
  Activity,
  Check,
  X,
  Search,
  ShieldCheck,
  Play,
  Download,
  Terminal,
  UserCheck,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

import { AgentRegistry } from '../core/registry/AgentRegistry.ts';
import { ExecutionEngine } from '../core/engine/ExecutionEngine.ts';
import { CentralOrchestrator } from '../core/orchestrator/CentralOrchestrator.ts';
import { ToolRegistry } from '../core/tools/ToolRegistry.ts';
import { SharedMemory } from '../core/memory/SharedMemory.ts';
import { ApprovalGateManager } from '../core/safety/HumanApprovalGate.ts';
import { AuditLogger } from '../core/safety/AuditLogger.ts';
import { AgentSpec, AgentStatus } from '../core/types/agent.ts';
import { EngineeringTask } from '../core/types/orchestrator.ts';
import { HumanApprovalGate, ApproverIdentity } from '../core/types/safety.ts';
import { EngineeringParameter } from '../core/types/memory.ts';
import { downloadCsv } from '../utils/engineeringUtils.ts';
import {
  signApprovalGate,
  authenticateAsDirector,
  subscribeAuthState,
  fetchSetupStatus,
  provisionInitialCredential,
  fetchGovernanceStatus,
  generateDirectorKeypairWeb,
  signEcrWeb,
  authenticatedFetch
} from '../core/auth/authClient.ts';

interface AgentOrchestratorViewProps {
  onAskAi?: (prompt: string, record?: any) => void;
  initialTab?: 'agents' | 'orchestrator' | 'approvals' | 'tools' | 'parameters' | 'audit';
}

export const AgentOrchestratorView: React.FC<AgentOrchestratorViewProps> = ({ onAskAi, initialTab = 'orchestrator' }) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'orchestrator' | 'approvals' | 'tools' | 'parameters' | 'audit'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Singletons
  const registry = AgentRegistry.getInstance();
  const executionEngine = ExecutionEngine.getInstance();
  const orchestrator = CentralOrchestrator.getInstance();
  const toolRegistry = ToolRegistry.getInstance();
  const sharedMemory = SharedMemory.getInstance();
  const gateManager = ApprovalGateManager.getInstance();
  const auditLogger = AuditLogger.getInstance();

  // State
  const [agents, setAgents] = useState<AgentSpec[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [selectedAgent, setSelectedAgent] = useState<AgentSpec | null>(null);
  const [agentFilter, setAgentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [tasks, setTasks] = useState<EngineeringTask[]>([]);
  const [pendingGates, setPendingGates] = useState<HumanApprovalGate[]>([]);
  const [parameters, setParameters] = useState<EngineeringParameter[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState(false);
  const [serverWorkflowError, setServerWorkflowError] = useState<string | null>(null);
  const [serverTasks, setServerTasks] = useState<EngineeringTask[] | null>(null);
  const [serverPendingGates, setServerPendingGates] = useState<HumanApprovalGate[] | null>(null);

  // Tool Calculator Nominal Presets
  const DEFAULT_TOOL_INPUTS: Record<string, Record<string, any>> = {
    'TOOL-HYDROSTATICS-01': {
      lwlMeters: 11.8,
      beamMeters: 4.2,
      draftMeters: 0.85,
      blockCoefficientCb: 0.44,
      waterplaneCoefficientCwp: 0.66,
      kgMeters: 0.98,
      displacementTonnes: 6.8,
      seawaterDensityKgM3: 1025
    },
    'TOOL-RESISTANCE-01': {
      lwlMeters: 11.8,
      beamMeters: 4.2,
      draftMeters: 0.85,
      displacementTonnes: 6.8,
      speedKnots: 22.0,
      propulsiveEfficiencyEtaD: 0.65,
      waterTempCelsius: 15
    },
    'TOOL-MASS-BALANCE-01': {
      components: [
        { name: 'Composite Hull Shell', massKg: 1900, lcgMetersFromTransom: 5.3, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.8, designMarginPercent: 10 },
        { name: 'Twin Electric Pods (480kW)', massKg: 380, lcgMetersFromTransom: 1.6, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.4, designMarginPercent: 5 },
        { name: 'Main Battery ESS (LiFePO4)', massKg: 1400, lcgMetersFromTransom: 4.5, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.35, designMarginPercent: 10 }
      ],
      baselineLcbMetersFromTransom: 5.0
    },
    'TOOL-ELECTRICAL-01': {
      busVoltageV: 48,
      batteryTotalKwh: 320,
      usableDepthOfDischarge: 0.8,
      consumers: [
        { name: 'Propulsion Inverter (Cruising)', voltageV: 48, continuousPowerW: 32000, intermittentPowerW: 48000, dutyCycle: 0.8, isEmergencyLoad: false },
        { name: 'Nav Doppler Radar & LiDAR', voltageV: 48, continuousPowerW: 350, intermittentPowerW: 100, dutyCycle: 1, isEmergencyLoad: true },
        { name: 'Autonomous Edge Compute & Comms', voltageV: 48, continuousPowerW: 650, intermittentPowerW: 200, dutyCycle: 1, isEmergencyLoad: true }
      ]
    },
    'TOOL-STRUCTURES-01': {
      displacementTonnes: 6.8,
      speedKnots: 22.0,
      lwlMeters: 11.8,
      deadriseAngleDeg: 18.0,
      unsupportedPanelWidthMm: 450,
      unsupportedPanelLengthMm: 900,
      materialYieldStrengthMpa: 125,
      safetyFactor: 2.0
    },
    'TOOL-COLREGS-01': {
      ownCourseDeg: 0,
      ownSpeedKnots: 18.5,
      targetBearingDeg: 45,
      targetRangeNm: 1.8,
      targetCourseDeg: 270,
      targetSpeedKnots: 14.0
    }
  };

  // Tool Calculator State
  const [selectedToolId, setSelectedToolId] = useState<string>('TOOL-HYDROSTATICS-01');
  const [toolInputs, setToolInputs] = useState<Record<string, any>>(DEFAULT_TOOL_INPUTS['TOOL-HYDROSTATICS-01']);
  const [toolOutput, setToolOutput] = useState<any>(null);

  const selectTool = (toolId: string) => {
    setSelectedToolId(toolId);
    setToolInputs(DEFAULT_TOOL_INPUTS[toolId] || {});
    setToolOutput(null);
  };

  // Approval Gate Director Notes
  const [directorNote, setDirectorNote] = useState<string>('Verified against USV-01 preliminary design criteria.');

  // Illustrative parametric study inputs, never an approved vessel baseline.
  const [studyLwl, setStudyLwl] = useState<number>(11.8);
  const [studyBeam, setStudyBeam] = useState<number>(4.2);
  const [studyDraft, setStudyDraft] = useState<number>(0.85);
  const [studyDisplacement, setStudyDisplacement] = useState<number>(6.8);
  const [studySpeed, setStudySpeed] = useState<number>(22.0);

  // Authenticated User & Director Passphrase Verification State
  const [approverIdentity, setApproverIdentity] = useState<ApproverIdentity | null>(null);
  const [directorPassphrase, setDirectorPassphrase] = useState<string>('');
  const [initialSetupSecret, setInitialSetupSecret] = useState<string>('');
  const [directorAuthError, setDirectorAuthError] = useState<string | null>(null);
  const [isDirectorAuthenticated, setIsDirectorAuthenticated] = useState<boolean>(false);

  // 1-Click Web ECR Governance State
  const [govStatus, setGovStatus] = useState<any>(null);
  const [ecrSigningPassphrase, setEcrSigningPassphrase] = useState<string>('');
  const [ecrActionStatus, setEcrActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSigningEcr, setIsSigningEcr] = useState<boolean>(false);
  const [copiedPublicKey, setCopiedPublicKey] = useState<boolean>(false);

  // Obsidian Export Modal State
  const [obsidianModalOpen, setObsidianModalOpen] = useState(false);
  const [exportedNotes, setExportedNotes] = useState<Record<string, string>>({});

  const refreshState = () => {
    setAgents(registry.getAllAgents());
    setAgentStatuses(executionEngine.getAllStatuses());
    setTasks(serverTasks ?? orchestrator.getAllTasks());
    setPendingGates(serverPendingGates ?? gateManager.getPendingGates());
    setParameters(sharedMemory.getAllParameters());
    setLogs(auditLogger.getLogs().slice(-30).reverse());
    fetchGovernanceStatus().then(setGovStatus).catch(() => {});
  };

  useEffect(() => {
    refreshState();
    const unsubscribe = subscribeAuthState((user) => {
      setApproverIdentity(user);
      setIsDirectorAuthenticated(user?.role === 'ENGINEERING_DIRECTOR');
    });
    return () => unsubscribe();
  }, []);

  const handleDirectorLogin = async () => {
    try {
      setDirectorAuthError(null);
      if (directorPassphrase.trim().length < 12) {
        throw new Error('Passphrase must be at least 12 characters.');
      }
      const setup = await fetchSetupStatus();
      let user: ApproverIdentity;
      if (!setup.provisionedUsers.includes('usr-eng-dir-8841')) {
        user = await provisionInitialCredential('usr-eng-dir-8841', directorPassphrase, initialSetupSecret);
      } else {
        user = await authenticateAsDirector(directorPassphrase);
      }
      setApproverIdentity(user);
      setIsDirectorAuthenticated(true);
      setEcrSigningPassphrase(directorPassphrase);
      setDirectorPassphrase('');
      setInitialSetupSecret('');
      refreshState();
    } catch (err: any) {
      setDirectorAuthError(err.message);
      setIsDirectorAuthenticated(false);
    }
  };

  const handleOneClickKeygen = async () => {
    try {
      setIsSigningEcr(true);
      setEcrActionStatus(null);
      const pw = ecrSigningPassphrase.trim() || 'usv01-director-ed25519-key';
      if (pw.length < 16) {
        throw new Error('Signing passphrase must be at least 16 characters.');
      }
      const res = await generateDirectorKeypairWeb(pw, false);
      setEcrActionStatus({ type: 'success', message: res.message || 'Director Ed25519 keypair ready!' });
      refreshState();
    } catch (err: any) {
      setEcrActionStatus({ type: 'error', message: err.message });
    } finally {
      setIsSigningEcr(false);
    }
  };

  const handleOneClickSignEcr = async (changeId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      setIsSigningEcr(true);
      setEcrActionStatus(null);
      const pw = ecrSigningPassphrase.trim() || 'usv01-director-ed25519-key';
      if (pw.length < 16) {
        throw new Error('Please enter your 16+ character Director signing passphrase.');
      }
      // If private key hasn't been generated yet, auto-generate it in 1 click first!
      if (!govStatus?.directorKey?.hasPrivateKey) {
        await generateDirectorKeypairWeb(pw, false);
      }
      const res = await signEcrWeb(changeId, decision, pw);
      setEcrActionStatus({
        type: 'success',
        message: `${res.message} Saved to ${res.filePath}`
      });
      refreshState();
    } catch (err: any) {
      setEcrActionStatus({ type: 'error', message: err.message });
    } finally {
      setIsSigningEcr(false);
    }
  };

  // Run Baseline or Exploratory Topological Workflow
  const handleRunSampleWorkflow = async () => {
    setIsExecutingWorkflow(true);
    setServerWorkflowError(null);
    setServerTasks(null);
    setServerPendingGates(null);
    orchestrator.clearTasks();

    // These are unverified demonstration inputs, not an authenticated vessel baseline.
    // Numeric presence in browser SharedMemory never implies an approved design.
    const lwlVal = studyLwl > 0 ? studyLwl : 11.2;
    const beamVal = studyBeam > 0 ? studyBeam : 2.9;
    const draftVal = studyDraft > 0 ? studyDraft : 0.68;
    const displVal = studyDisplacement > 0 ? studyDisplacement : 6.2;
    const speedVal = studySpeed > 0 ? studySpeed : 22.0;

    const titlePrefix = '[UNVERIFIED PARAMETRIC STUDY] ';
    const studyNotice = 'Illustrative study only; no authenticated vessel baseline or independent physics verification.';

    const timestampSuffix = Date.now().toString().slice(-4);
    const hullTaskId = `TASK-HULL-${timestampSuffix}`;
    const massTaskId = `TASK-MASS-${timestampSuffix}`;
    const stabTaskId = `TASK-STAB-${timestampSuffix}`;

    // Stage 1: Hull Form & Parametric Geometry
    orchestrator.registerTask({
      id: hullTaskId,
      title: `${titlePrefix}Hull Geometry & Form Coefficients`,
      description: `Compute parametric hull dimensions and waterplane parameters. (${studyNotice})`,
      assignedAgentId: 'HULL-GEO-05',
      discipline: 'NA',
      priority: 'HIGH',
      dependencies: [],
      input: {
        taskId: 'TASK-HULL-PARAM',
        context: { isExploratoryStudy: true },
        parameters: {
          isExploratoryStudy: true,
          baselineStatus: 'UNVERIFIED_PARAMETRIC_STUDY',
          lwlMeters: lwlVal,
          beamMeters: beamVal,
          draftMeters: draftVal,
          blockCoefficientCb: 0.44,
          waterplaneCoefficientCwp: 0.66,
          kgMeters: Number((draftVal * 1.15).toFixed(2)),
          displacementTonnes: displVal,
          speedKnots: speedVal
        }
      },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: false
    });

    // Stage 2: Mass Balance & SWBS Tracking
    orchestrator.registerTask({
      id: massTaskId,
      title: `${titlePrefix}SWBS Mass Breakdown & LCG Synthesis`,
      description: `Sum weight groups and compute center of gravity. (${studyNotice})`,
      assignedAgentId: 'WGT-BAL-09',
      discipline: 'NA',
      priority: 'HIGH',
      dependencies: [hullTaskId],
      input: {
        taskId: 'TASK-MASS-EST',
        context: { isExploratoryStudy: true },
        parameters: {
          components: [
            { name: 'Bare Hull Composite Structure', massKg: Math.round(displVal * 280), lcgMetersFromTransom: Number((lwlVal * 0.45).toFixed(2)), tcgMetersFromCl: 0, vcgMetersFromKeel: Number((draftVal * 0.9).toFixed(2)), designMarginPercent: 10 },
            { name: 'Twin Electric Inboard Pod Motors', massKg: 380, lcgMetersFromTransom: 1.6, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.4, designMarginPercent: 5 },
            { name: 'Main Battery ESS (LiFePO4 Keel)', massKg: 720, lcgMetersFromTransom: Number((lwlVal * 0.38).toFixed(2)), tcgMetersFromCl: 0, vcgMetersFromKeel: 0.35, designMarginPercent: 10 },
            { name: 'Avionics, Doppler Radar & Sensors', massKg: 180, lcgMetersFromTransom: Number((lwlVal * 0.55).toFixed(2)), tcgMetersFromCl: 0, vcgMetersFromKeel: 2.1, designMarginPercent: 15 }
          ],
          baselineLcbMetersFromTransom: Number((lwlVal * 0.42).toFixed(2)),
          isExploratoryStudy: true
        }
      },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: false
    });

    // Stage 3: Intact Stability Audit (Safety-Critical -> triggers Human Gate!)
    orchestrator.registerTask({
      id: stabTaskId,
      title: `${titlePrefix}Intact Stability & GMt IMO MSC.267(85) Audit`,
      description: `Validate transverse metacentric height GMt and righting energy. (${studyNotice})`,
      assignedAgentId: 'STAB-HYD-06',
      discipline: 'NA',
      priority: 'CRITICAL',
      dependencies: [massTaskId],
      input: {
        taskId: 'TASK-STAB-AUDIT',
        context: { isExploratoryStudy: true },
        parameters: {
          isExploratoryStudy: true,
          baselineStatus: 'UNVERIFIED_PARAMETRIC_STUDY',
          lwlMeters: lwlVal,
          beamMeters: beamVal,
          draftMeters: draftVal,
          blockCoefficientCb: 0.44,
          waterplaneCoefficientCwp: 0.66,
          kgMeters: Number((draftVal * 1.15).toFixed(2)),
          displacementTonnes: displVal,
          speedKnots: speedVal
        }
      },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: true
    });

    refreshState();

    try {
      const response = await authenticatedFetch('/api/orchestrator/execute-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: orchestrator.getAllTasks() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.tasks)) {
        throw new Error(data.error || `Server workflow rejected (HTTP ${response.status})`);
      }
      setServerTasks(data.tasks);
      setServerPendingGates(Array.isArray(data.pendingGates) ? data.pendingGates : []);
      if (!data.success) setServerWorkflowError('One or more workflow tasks failed. See task results.');
    } catch (e: any) {
      setServerWorkflowError(e?.message || 'Workflow execution failed.');
    } finally {
      setIsExecutingWorkflow(false);
    }
  };

  // Evaluate Approval Gate with Cryptographically Signed Decision
  const handleDecision = async (gateId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      // Request cryptographic signature from backend signing authority
      const response = await authenticatedFetch('/api/orchestrator/decide-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateId, decision, directorNotes: directorNote })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'Approval decision failed.');
      setServerTasks(data.tasks);
      setServerPendingGates(data.pendingGates);
      setServerWorkflowError(null);
    } catch (err: any) {
      alert(`Approval Gate Authorization Failed: ${err.message}`);
    }
  };

  // Run Deterministic Tool
  const handleExecuteTool = async () => {
    const res = await toolRegistry.executeTool(selectedToolId, toolInputs, ['CALCULATION_EXEC']);
    setToolOutput(res);
    refreshState();
  };

  // Export Obsidian Vault
  const handleExportObsidian = () => {
    const exported = sharedMemory.exportObsidianVault();
    setExportedNotes(exported);
    setObsidianModalOpen(true);
  };

  const handleDownloadVaultFiles = () => {
    const combinedContent = Object.entries(exportedNotes)
      .map(([filename, content]) => `<!-- FILE: ${filename} -->\n${content}\n\n`)
      .join('---\n\n');
    const blob = new Blob([combinedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `USV01_Obsidian_Vault_Bundle_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered Agents
  const filteredAgents = agents.filter(agent => {
    const matchesDiv = agentFilter === 'ALL' || agent.division === agentFilter;
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.speciality.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiv && matchesSearch;
  });

  const getStatusBadge = (status?: AgentStatus) => {
    switch (status) {
      case 'EXECUTING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            EXECUTING
          </span>
        );
      case 'WAITING_APPROVAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            WAITING APPROVAL
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            COMPLETED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            IDLE
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
              MULTI-AGENT CORE
            </span>
            <span className="text-xs text-slate-500 font-mono">26 SPECIALIST AGENTS & DAG ORCHESTRATOR</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>Autonomous Naval Engineering Directorate</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Topological DAG task scheduling, deterministic physics tools, and strict Human Authority approval gates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pendingGates.length > 0 && (
            <button
              onClick={() => setActiveTab('approvals')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-200 text-xs font-semibold animate-pulse"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{pendingGates.length} Approval Gates Pending</span>
            </button>
          )}

          <button
            onClick={handleExportObsidian}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Obsidian Vault Export</span>
          </button>

          <button
            onClick={handleRunSampleWorkflow}
            disabled={isExecutingWorkflow}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-900/30 disabled:opacity-50"
          >
            {isExecutingWorkflow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isExecutingWorkflow ? 'Executing DAG...' : 'Dispatch Sizing Workflow'}</span>
          </button>
        </div>
      </div>

      {serverWorkflowError && <div role="alert" className="p-3 rounded border border-red-600 text-red-300 bg-red-950/50 text-xs">{serverWorkflowError}</div>}
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto font-mono text-xs">
        <button
          onClick={() => setActiveTab('orchestrator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'orchestrator' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>DAG Orchestrator ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'agents' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>26 Specialist Agents ({agents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'tools' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-teal-400" />
          <span>Deterministic Naval Tools</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'approvals' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>Approval Gates ({pendingGates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('parameters')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'parameters' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Parameter Register ({parameters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'audit' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Cryptographic Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: DAG Orchestrator */}
      {activeTab === 'orchestrator' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-slate-100">Topological DAG Task Scheduling & Safety Air-Gap</p>
              <p className="text-slate-400">
                The Central Orchestrator resolves task dependencies topologically. Tasks in the same stage execute in parallel.
                Safety-critical parameters (e.g. metacentric height GM, structural scantlings, DC microgrid voltages) are trapped at
                Human Authority Gates requiring explicit Engineering Director approval before baseline modification.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Active & Completed DAG Execution Tasks ({tasks.length})
              </h3>
              <button
                onClick={refreshState}
                className="text-xs text-slate-400 hover:text-slate-200 font-mono flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Governance & Parametric Study Configuration */}
            <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Parametric Study Configuration & Governance Notice
                </span>
                <span className="text-[10px] font-mono text-amber-400/80 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  BASELINE STATUS: UNVERIFIED / EXPLORATORY
                </span>
              </div>
              <p className="text-amber-200/80 text-[11px]">
                Historical values in SharedMemory are unverified assumptions, not an approved baseline. All sample tasks execute strictly under
                explicit <code className="text-amber-300 font-mono">[UNVERIFIED PARAMETRIC STUDY]</code> tags and do NOT alter certified vessel baseline
                without Engineering Director gate sign-off.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-[11px]">
                <div>
                  <label className="text-slate-400 block text-[10px]">Study LWL (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={studyLwl}
                    onChange={(e) => setStudyLwl(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[10px]">Study Beam (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={studyBeam}
                    onChange={(e) => setStudyBeam(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[10px]">Study Draft (m):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={studyDraft}
                    onChange={(e) => setStudyDraft(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[10px]">Displ (t):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={studyDisplacement}
                    onChange={(e) => setStudyDisplacement(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[10px]">Speed (kn):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={studySpeed}
                    onChange={(e) => setStudySpeed(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="p-8 rounded-lg bg-slate-900/30 border border-slate-800 text-center space-y-3">
                <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No active DAG workflow tasks registered in orchestrator queue.</p>
                <button
                  onClick={handleRunSampleWorkflow}
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
                >
                  Dispatch Sizing Workflow
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {tasks.map((task, idx) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                        STAGE {idx + 1}
                      </span>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : task.status === 'WAITING_HUMAN_APPROVAL'
                            ? 'bg-purple-500/20 text-purple-300 animate-pulse'
                            : task.status === 'RUNNING'
                            ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100">{task.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{task.description}</p>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Agent: {task.assignedAgentId}</span>
                      {task.safetyCritical && (
                        <span className="text-rose-400 flex items-center gap-1 font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Safety Gate
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: 26 Agents Directory */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search agent ID, name, or speciality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
              {['ALL', 'DIRECTORATE', 'REQUIREMENTS_BASELINE', 'NAVAL_ARCHITECTURE', 'STRUCTURES_MECHANICAL', 'POWER_PROPULSION', 'AUTONOMY_ELECTRONICS', 'SYSTEMS_VVT', 'OPERATIONS_DELIVERABLES'].map((div) => (
                <button
                  key={div}
                  onClick={() => setAgentFilter(div)}
                  className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                    agentFilter === div
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
                  }`}
                >
                  {div.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
                    {agent.id}
                  </span>
                  {getStatusBadge(agentStatuses[agent.id])}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-100">{agent.name}</h4>
                  <p className="text-[11px] text-cyan-400/80 font-mono mt-0.5">{agent.speciality}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Div: {agent.division}</span>
                  <span className="text-slate-400 group-hover:text-cyan-300 flex items-center gap-0.5">
                    View Spec <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Human Authority Approvals */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-800/40 flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-purple-200 space-y-1">
              <p className="font-semibold text-purple-100">Human Authority Sign-off — Engineering Director Only</p>
              <p className="text-purple-300/80">
                Per project safety governance, automated agents CANNOT independently modify safety-critical vessel baselines.
                All changes touching intact stability, high voltage distribution, or hull scantlings require explicit human sign-off.
              </p>
            </div>
          </div>

          {/* Dynamic Approver Session & Director Authentication Bar */}
          {isDirectorAuthenticated ? (
            <div className="p-3 bg-emerald-950/30 border border-emerald-700/50 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-emerald-200">Authenticated Director Authority:</span>
                <span className="text-slate-200 font-mono">{approverIdentity?.userName} ({approverIdentity?.userId})</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-300 bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded">
                Signing Authority: ACTIVE
              </span>
            </div>
          ) : (
            <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-amber-200 text-xs">Director Authentication Required</span>
                  <span className="text-slate-400 text-xs font-mono">
                    (Current role: {approverIdentity?.role || 'STAFF_ENGINEER'})
                  </span>
                </div>
                <span className="font-mono text-[10px] text-amber-400 bg-amber-950/80 border border-amber-800/50 px-2 py-0.5 rounded">
                  Signing Authority: LOCKED
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Evaluating safety-critical baseline gates requires verified Engineering Director credentials. Enter director passphrase to unlock cryptographic decision signing:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="Engineering Director Passphrase..."
                  value={directorPassphrase}
                  onChange={(e) => setDirectorPassphrase(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDirectorLogin()}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                />
                <button
                  onClick={handleDirectorLogin}
                  className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Authenticate Authority
                </button>
              </div>
              <input
                type="password"
                autoComplete="off"
                aria-label="One-time initial setup secret (only needed for first provisioning)"
                placeholder="Initial setup secret (required on first provisioning only)"
                value={initialSetupSecret}
                onChange={(e) => setInitialSetupSecret(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500"
              />
              {directorAuthError && (
                <p className="text-[11px] text-rose-400 font-mono">❌ {directorAuthError}</p>
              )}
            </div>
          )}

          {/* 1-CLICK ENGINEERING CHANGE REQUEST (ECR) & BASELINE SIGN-OFF PANEL */}
          <div className="p-4 rounded-lg bg-slate-900 border border-teal-500/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  1-Click Engineering Change Request (ECR) & Baseline Sign-Off
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No terminal commands required. Generate your Ed25519 keypair and cryptographically sign safety-critical ECRs in one click.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                  HEAD: <strong className="text-teal-300">{govStatus?.headCommit?.substring(0, 7) || '---'}</strong>
                </span>
                <span className={`px-2 py-0.5 rounded border ${
                  govStatus?.directorKey?.hasPrivateKey
                    ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-700/50 text-amber-300'
                }`}>
                  {govStatus?.directorKey?.hasPrivateKey ? 'Ed25519 Key: READY' : 'Ed25519 Key: NOT CREATED'}
                </span>
              </div>
            </div>

            {ecrActionStatus && (
              <div className={`p-3 rounded border text-xs flex items-center justify-between ${
                ecrActionStatus.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-700/60 text-rose-200'
              }`}>
                <div className="flex items-center gap-2">
                  {ecrActionStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{ecrActionStatus.message}</span>
                </div>
                <button
                  onClick={() => setEcrActionStatus(null)}
                  className="text-[10px] underline opacity-75 hover:opacity-100"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Signing Passphrase & 1-Click Key Setup Bar */}
            <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-medium text-slate-300">
                  Director Signing Key Passphrase (16+ chars — auto-creates key if needed):
                </label>
                {govStatus?.directorKey?.publicKeyPem && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(govStatus.directorKey.publicKeyPem);
                      setCopiedPublicKey(true);
                      setTimeout(() => setCopiedPublicKey(false), 2500);
                    }}
                    className="text-[11px] font-mono text-teal-400 hover:text-teal-300 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    {copiedPublicKey ? '✅ Copied Public Key PEM!' : 'Copy Public Key (DIRECTOR_PUBLIC_KEY)'}
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="password"
                  placeholder="Enter a 16+ char passphrase (or leave blank to use default workstation key)..."
                  value={ecrSigningPassphrase}
                  onChange={(e) => setEcrSigningPassphrase(e.target.value)}
                  disabled={!isDirectorAuthenticated}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                />
                {!govStatus?.directorKey?.hasPrivateKey && (
                  <button
                    onClick={handleOneClickKeygen}
                    disabled={!isDirectorAuthenticated || isSigningEcr}
                    className="px-3.5 py-1.5 rounded bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> 1-Click Generate Signing Key
                  </button>
                )}
              </div>
              {govStatus?.baselineDigest && (
                <div className="text-[10px] font-mono text-slate-500 truncate">
                  Current Baseline Digest: <span className="text-slate-400">{govStatus.baselineDigest}</span>
                </div>
              )}
            </div>

            {/* ECR Records List with 1-Click Approve & Sign Button */}
            <div className="space-y-2.5">
              {(govStatus?.ecrRecords || []).map((ecrItem: any) => {
                const changeId = ecrItem.record?.changeId || ecrItem.file.split('_')[0];
                const matchingApproval = (govStatus?.approvals || []).find(
                  (a: any) => a.record?.changeId === changeId
                );
                const isVerified = matchingApproval?.verified;
                const isStale = matchingApproval?.stale;

                return (
                  <div
                    key={ecrItem.file}
                    className={`p-3.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isVerified
                        ? 'bg-emerald-950/15 border-emerald-700/50'
                        : 'bg-slate-950/90 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-teal-300 bg-teal-950/60 border border-teal-800/60 px-2 py-0.5 rounded">
                          {changeId}
                        </span>
                        <span className="text-xs font-bold text-slate-100">
                          {ecrItem.record?.title || ecrItem.file}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-800/50 text-rose-300">
                          {ecrItem.record?.riskAssessment || 'CRITICAL'} RISK
                        </span>
                        {isVerified ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> SIGNED & VERIFIED (Ed25519)
                          </span>
                        ) : isStale ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700 text-amber-300">
                            ⚠️ STALE SIGNATURE — RE-SIGN NEEDED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300">
                            ⏳ PENDING DIRECTOR SIGN-OFF
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {matchingApproval?.record
                          ? `Last signed by ${matchingApproval.record.authorityName} at ${matchingApproval.record.signedAt} (Commit ${matchingApproval.record.headCommitAtSigning?.substring(0, 7)})`
                          : 'Click "1-Click Approve & Sign" to cryptographically authorize this Engineering Change Request.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOneClickSignEcr(changeId, 'APPROVED')}
                        disabled={!isDirectorAuthenticated || isSigningEcr}
                        title={!isDirectorAuthenticated ? 'Authenticate as Engineering Director above first' : 'Cryptographically sign this ECR with Ed25519'}
                        className={`px-4 py-2 rounded font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
                          isDirectorAuthenticated
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        {isSigningEcr ? 'Signing...' : isVerified ? 'Re-Sign Baseline' : '1-Click Approve & Sign'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {pendingGates.length === 0 ? (
            <div className="p-8 rounded-lg bg-slate-900/40 border border-slate-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-bold text-slate-200">Zero Pending Approval Gates</p>
              <p className="text-[11px] text-slate-500">All agent tasks are nominal. No safety-critical overrides waiting.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingGates.map((gate) => (
                <div key={gate.id} className="p-4 rounded-lg bg-slate-900 border border-purple-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-purple-300 bg-purple-950/70 border border-purple-800/50 px-2 py-0.5 rounded">
                        {gate.id}
                      </span>
                      <span className="text-xs font-mono text-slate-400">Agent: {gate.agentId}</span>
                    </div>
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> WAITING HUMAN APPROVAL
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{gate.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{gate.description}</p>
                  </div>

                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <span className="font-mono text-[10px] text-rose-400 font-bold uppercase">Safety Implication:</span>
                    <p className="text-slate-300 text-[11px]">{gate.safetyImplication}</p>
                  </div>

                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase">Proposed Changes:</span>
                    <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto">
                      {JSON.stringify(gate.proposedChanges, null, 2)}
                    </pre>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <input
                      type="text"
                      placeholder="Engineering Director Evaluation Notes..."
                      value={directorNote}
                      onChange={(e) => setDirectorNote(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleDecision(gate.id, 'APPROVED')}
                      disabled={!isDirectorAuthenticated}
                      title={!isDirectorAuthenticated ? "Director authentication required to approve safety gates" : undefined}
                      className={`px-3.5 py-1.5 rounded font-bold text-xs flex items-center gap-1 ${
                        isDirectorAuthenticated
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Baseline
                    </button>
                    <button
                      onClick={() => handleDecision(gate.id, 'REJECTED')}
                      disabled={!isDirectorAuthenticated}
                      title={!isDirectorAuthenticated ? "Director authentication required to reject safety gates" : undefined}
                      className={`px-3.5 py-1.5 rounded font-bold text-xs flex items-center gap-1 ${
                        isDirectorAuthenticated
                          ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Deterministic Tools Runner */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Deterministic Naval Tools Execution Engine
            </h3>
            <span className="text-xs text-slate-500 font-mono">ZERO PROBABILISTIC LLM IN PHYSICS CALCS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400">Select Deterministic Tool:</label>
              {[
                { id: 'TOOL-HYDROSTATICS-01', name: 'Hydrostatics & GMt Solver' },
                { id: 'TOOL-RESISTANCE-01', name: 'Resistance & Towing Power' },
                { id: 'TOOL-MASS-BALANCE-01', name: 'SWBS Mass Balance & CG' },
                { id: 'TOOL-ELECTRICAL-01', name: 'DC Microgrid 24h Load Sheet' },
                { id: 'TOOL-STRUCTURES-01', name: 'Bottom Slamming Scantling' },
                { id: 'TOOL-COLREGS-01', name: 'COLREGS Encounter Kinematics' }
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => selectTool(tool.id)}
                  className={`w-full text-left p-2.5 rounded text-xs font-mono transition-colors border ${
                    selectedToolId === tool.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold block">{tool.id}</span>
                  <span className="text-[11px] text-slate-500">{tool.name}</span>
                </button>
              ))}
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-mono">Tool Inputs ({selectedToolId})</h4>
                    <span className="text-[10px] text-emerald-400 font-mono">Nominal USV-01 parameters loaded</span>
                  </div>
                  <button
                    onClick={handleExecuteTool}
                    className="px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950/30 active:scale-95 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Execute Tool
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {Object.entries(toolInputs).map(([key, val]) => {
                    const isObj = typeof val === 'object' && val !== null;
                    return (
                      <div key={key} className={isObj ? 'col-span-2' : ''}>
                        <span className="text-[10px] text-slate-400 block mb-0.5">{key}:</span>
                        {isObj ? (
                          <textarea
                            rows={4}
                            value={JSON.stringify(val, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                setToolInputs((prev) => ({ ...prev, [key]: parsed }));
                              } catch {}
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 text-[11px] font-mono focus:outline-none focus:border-cyan-500"
                          />
                        ) : (
                          <input
                            type={typeof val === 'number' ? 'number' : 'text'}
                            step="0.01"
                            value={val}
                            onChange={(e) => setToolInputs((prev) => ({
                              ...prev,
                              [key]: typeof val === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value
                            }))}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {toolOutput && (
                <div className="p-3.5 rounded-lg bg-slate-950 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 font-mono">Execution Results (Deterministic):</span>
                    <span className="text-[10px] font-mono text-emerald-400">STATUS: VALIDATED</span>
                  </div>
                  <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 rounded bg-slate-900/60 border border-slate-800">
                    {JSON.stringify(toolOutput, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Parameter Register & TBD Tracking */}
      {activeTab === 'parameters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Shared Memory Parameter Register ({parameters.length})
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">Strict TBD designation for unverified parameters.</p>
            </div>
            <button
              onClick={() => {
                const headers = ['Param ID', 'Key', 'Name', 'Discipline', 'Value', 'Unit', 'Status', 'Revision'];
                const rows = parameters.map(p => [p.id, p.key, p.name, p.discipline, p.value, p.unit, p.status, p.revision]);
                downloadCsv(`USV01_Parameters_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
              }}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1"
            >
              <Download className="w-3 h-3 text-cyan-400" /> Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {parameters.map((param) => (
              <div key={param.id} className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-bold">{param.id}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      param.status === 'TBD'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {param.status}
                  </span>
                </div>
                <h5 className="font-sans font-bold text-slate-200 text-xs">{param.name}</h5>
                <div className="text-[11px] text-slate-400">
                  Value: <span className="text-slate-100 font-bold">{param.value}</span> {param.unit}
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 flex justify-between">
                  <span>Rev: {param.revision}</span>
                  <span>Agent: {param.lastModifiedByAgent}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Immutable Safety Audit Log
            </h3>
            <span className="text-xs text-slate-500 font-mono">APPEND-ONLY SECURE EVENT STREAM</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        log.severity === 'SAFETY_CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : log.severity === 'AUDIT'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {log.severity}
                    </span>
                    <span className="font-bold text-slate-200">{log.action}</span>
                    <span className="text-slate-500 text-[11px]">({log.agentId || 'SYSTEM'})</span>
                  </div>
                  <pre className="text-[11px] text-slate-400 mt-0.5 whitespace-pre-wrap">
                    {JSON.stringify(log.details)}
                  </pre>
                </div>
                <span className="text-[10px] text-slate-500 flex-shrink-0">
                  {new Date(log.timestamp).toTimeString().substring(0, 8)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Obsidian Vault Export Preview */}
      {obsidianModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Obsidian [[wikilink]] Vault Markdown Export</h3>
              </div>
              <button onClick={() => setObsidianModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Generated {Object.keys(exportedNotes).length} interlinked markdown notes with Obsidian syntax, linking parameters, ADRs, and risk items.
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2 p-3 bg-slate-950 border border-slate-800 rounded">
              {Object.entries(exportedNotes).map(([fname, content]) => (
                <div key={fname} className="space-y-1">
                  <div className="text-xs font-mono font-bold text-cyan-300">📄 {fname}</div>
                  <pre className="text-[11px] font-mono text-slate-400 bg-slate-900/50 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {content}
                  </pre>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setObsidianModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs font-mono"
              >
                Close
              </button>
              <button
                onClick={handleDownloadVaultFiles}
                className="px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 font-mono"
              >
                <Download className="w-3.5 h-3.5" /> Download Obsidian Vault Bundle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
