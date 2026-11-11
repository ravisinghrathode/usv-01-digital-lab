import { useState, useEffect } from 'react';
import {
  ShieldAlert,
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
  Search
} from 'lucide-react';

import { AgentRegistry } from './core/registry/AgentRegistry.ts';
import { ExecutionEngine } from './core/engine/ExecutionEngine.ts';
import { CentralOrchestrator } from './core/orchestrator/CentralOrchestrator.ts';
import { ToolRegistry } from './core/tools/ToolRegistry.ts';
import { SharedMemory } from './core/memory/SharedMemory.ts';
import { ApprovalGateManager } from './core/safety/HumanApprovalGate.ts';
import { AuditLogger } from './core/safety/AuditLogger.ts';
import { AgentSpec, AgentStatus } from './core/types/agent.ts';
import { EngineeringTask } from './core/types/orchestrator.ts';
import { HumanApprovalGate } from './core/types/safety.ts';
import { EngineeringParameter } from './core/types/memory.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'agents' | 'orchestrator' | 'approvals' | 'tools' | 'parameters' | 'audit'>('agents');
  
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

  // Tool Calculator State
  const [selectedToolId, setSelectedToolId] = useState<string>('TOOL-HYDROSTATICS-01');
  const [toolInputs, setToolInputs] = useState<Record<string, any>>({
    lwlMeters: 10.5,
    beamMeters: 2.8,
    draftMeters: 0.65,
    blockCoefficientCb: 0.44,
    kgMeters: 0.85
  });
  const [toolOutput, setToolOutput] = useState<any>(null);

  // Director Approval Notes State
  const [directorNote, setDirectorNote] = useState<string>('Approved under director review against DNV-RU-NAV specifications.');
  const [obsidianExportModal, setObsidianExportModal] = useState<boolean>(false);
  const [exportedNotes, setExportedNotes] = useState<Record<string, string>>({});

  const refreshState = () => {
    setAgents(registry.getAllAgents());
    setAgentStatuses(executionEngine.getAllStatuses());
    setTasks(orchestrator.getAllTasks());
    setPendingGates(gateManager.getPendingGates());
    setParameters(sharedMemory.getAllParameters());
    setLogs(auditLogger.getLogs().reverse().slice(0, 50));
  };

  useEffect(() => {
    refreshState();
    setSelectedAgent(registry.getAgent('LEAD-SYS-01') || null);
  }, []);

  // Run Baseline Sizing Workflow
  const handleRunSizingWorkflow = async () => {
    setIsExecutingWorkflow(true);
    orchestrator.clearTasks();

    orchestrator.registerTask({
      id: 'TASK-HULL-PARAM',
      title: 'Principal Particulars & Parametric Geometry',
      description: 'Define initial hull parameters and form coefficients',
      assignedAgentId: 'HULL-GEO-05',
      discipline: 'NA',
      priority: 'HIGH',
      dependencies: [],
      input: {
        taskId: 'TASK-HULL-PARAM',
        context: {},
        parameters: { lwlMeters: 11.2, beamMeters: 2.9, draftMeters: 0.68, blockCoefficientCb: 0.42 }
      },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: false
    });

    orchestrator.registerTask({
      id: 'TASK-MASS-SWBS',
      title: 'Weight Group Ledger & CG Calculation',
      description: 'SWBS lightship and center of gravity synthesis',
      assignedAgentId: 'WGT-BAL-09',
      discipline: 'NA',
      priority: 'HIGH',
      dependencies: ['TASK-HULL-PARAM'],
      input: {
        taskId: 'TASK-MASS-SWBS',
        context: {},
        parameters: {
          components: [
            { name: 'Carbon Composite Hull', massKg: 1950, lcgMetersFromTransom: 5.2, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.65, designMarginPercent: 10 },
            { name: 'Dual Torqeedo Deep Blue Motors', massKg: 380, lcgMetersFromTransom: 1.8, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.42, designMarginPercent: 5 },
            { name: 'BMW i3 High-Voltage Battery Pack', massKg: 1250, lcgMetersFromTransom: 4.1, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.38, designMarginPercent: 10 },
            { name: 'Sensor Mast & Mission Radome', massKg: 160, lcgMetersFromTransom: 6.2, tcgMetersFromCl: 0, vcgMetersFromKeel: 2.2, designMarginPercent: 15 }
          ]
        }
      },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: false
    });

    orchestrator.registerTask({
      id: 'TASK-STAB-AUDIT',
      title: 'Hydrostatic Intact Stability Verification',
      description: 'Evaluate transverse GMt and righting energy against ISO 12217-5',
      assignedAgentId: 'STAB-HYD-06',
      discipline: 'NA',
      priority: 'CRITICAL',
      dependencies: ['TASK-HULL-PARAM', 'TASK-MASS-SWBS'],
      input: {
        taskId: 'TASK-STAB-AUDIT',
        context: {},
        parameters: {
          lwlMeters: 11.2,
          beamMeters: 2.9,
          draftMeters: 0.68,
          blockCoefficientCb: 0.42,
          waterplaneCoefficientCwp: 0.64,
          kgMeters: 0.82
        }
      },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: true
    });

    orchestrator.registerTask({
      id: 'TASK-RES-POWER',
      title: 'Calm Water Resistance & Powering Curve',
      description: 'Holtrop-Mennen estimation at 22 knots sprint',
      assignedAgentId: 'RES-SEAK-07',
      discipline: 'NA',
      priority: 'MEDIUM',
      dependencies: ['TASK-HULL-PARAM', 'TASK-MASS-SWBS'],
      input: {
        taskId: 'TASK-RES-POWER',
        context: {},
        parameters: {
          lwlMeters: 11.2,
          beamMeters: 2.9,
          draftMeters: 0.68,
          displacementTonnes: 7.8,
          speedKnots: 22.0
        }
      },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      safetyCritical: false
    });

    refreshState();

    try {
      await orchestrator.executeWorkflow();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExecutingWorkflow(false);
      refreshState();
    }
  };

  // Evaluate Approval Gate
  const handleDecision = (gateId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      gateManager.evaluateDecision(gateId, decision, directorNote, 'ENGINEERING_DIRECTOR');
      refreshState();
    } catch (err: any) {
      alert(err.message);
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
    setObsidianExportModal(true);
  };

  // Filtered Agents
  const filteredAgents = agents.filter(agent => {
    const matchesDiv = agentFilter === 'ALL' || agent.division === agentFilter;
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.speciality.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiv && matchesSearch;
  });

  const getStatusBadge = (status?: AgentStatus) => {
    switch (status) {
      case 'EXECUTING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">EXECUTING</span>;
      case 'WAITING_APPROVAL':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">WAITING APPROVAL</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">COMPLETED</span>;
      case 'FAILED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">FAILED</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">IDLE</span>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950/70 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold tracking-wider px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                USV-01
              </span>
              <h1 className="font-bold text-lg text-slate-100 tracking-tight">
                Digital Engineering Lab
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                25 Agents Active
              </span>
            </div>
            <p className="text-xs text-slate-400">Deterministic Naval Systems & Multi-Agent Engineering Architecture</p>
          </div>
        </div>

        {/* Governance Authority Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-slate-400">Authority: </span>
              <span className="font-semibold text-slate-200">Engineering Director</span>
            </div>
          </div>

          {pendingGates.length > 0 && (
            <button
              onClick={() => setActiveTab('approvals')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-950/80 border border-purple-500/50 text-purple-300 text-xs font-semibold hover:bg-purple-900 transition-colors animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
              <span>{pendingGates.length} Pending Approval{pendingGates.length > 1 ? 's' : ''}</span>
            </button>
          )}

          <button
            onClick={refreshState}
            className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
            title="Refresh System State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 px-6 py-2 flex items-center justify-between text-xs">
        <div className="flex gap-2">
          {[
            { id: 'agents', label: 'Agent Matrix (25)', icon: Cpu },
            { id: 'orchestrator', label: 'Mission Cockpit & DAG', icon: Sliders },
            { id: 'approvals', label: `Director Approvals (${pendingGates.length})`, icon: ShieldAlert },
            { id: 'tools', label: 'Deterministic Tools Lab', icon: Zap },
            { id: 'parameters', label: 'Baseline & TBD Register', icon: Layers },
            { id: 'audit', label: 'Audit & Safety Log', icon: Activity }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleExportObsidian}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export Obsidian Notes</span>
        </button>
      </nav>

      {/* Content Area */}
      <main className="flex-1 p-6 overflow-auto">
        {/* TAB 1: 25 AGENT MATRIX */}
        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent List Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, name, or speciality..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {['ALL', 'DIRECTORATE', 'REQUIREMENTS_BASELINE', 'NAVAL_ARCHITECTURE', 'STRUCTURES_MECHANICAL', 'POWER_PROPULSION', 'AUTONOMY_ELECTRONICS', 'SYSTEMS_VVT', 'OPERATIONS_DELIVERABLES'].map(div => (
                    <button
                      key={div}
                      onClick={() => setAgentFilter(div)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                        agentFilter === div
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {div === 'ALL' ? 'All Divisions' : div.split('_')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agents Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAgents.map(agent => {
                  const status = agentStatuses[agent.id] || 'IDLE';
                  const isSelected = selectedAgent?.id === agent.id;
                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`p-3.5 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-900/90 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60">
                            {agent.id}
                          </span>
                          {getStatusBadge(status)}
                        </div>
                        <h3 className="font-semibold text-sm text-slate-100">{agent.name}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{agent.speciality}</p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Tools: {agent.permittedTools.length}</span>
                        <span>Deps: {agent.dependencies.length > 0 ? agent.dependencies.join(', ') : 'None'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Agent Inspector Panel */}
            <div className="space-y-4">
              {selectedAgent ? (
                <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-5 sticky top-24 space-y-4 shadow-xl">
                  <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                        {selectedAgent.id}
                      </span>
                      <h2 className="font-bold text-base text-slate-100 mt-1.5">{selectedAgent.name}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedAgent.speciality}</p>
                    </div>
                    {getStatusBadge(agentStatuses[selectedAgent.id])}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Core Responsibilities</h4>
                    <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                      {selectedAgent.responsibilities.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">System Instructions</h4>
                    <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {selectedAgent.systemInstructions}
                    </pre>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Reports To:</span>
                      <p className="font-mono text-slate-300">{selectedAgent.reportingTo}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Audit Level:</span>
                      <p className={`font-semibold ${selectedAgent.auditRequirement.logLevel === 'SAFETY_CRITICAL' ? 'text-amber-400' : 'text-slate-300'}`}>
                        {selectedAgent.auditRequirement.logLevel}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Model Preference:</span>
                      <p className="font-mono text-slate-300">{selectedAgent.modelConfig.preferredProvider} ({selectedAgent.modelConfig.modelName})</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Independent Review:</span>
                      <p className="font-semibold text-slate-300">{selectedAgent.verificationCriteria.independentReviewRequired ? 'MANDATORY' : 'STANDARD'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Permitted Tools</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedAgent.permittedTools.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-cyan-300 border border-slate-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        const input = {
                          taskId: `TASK-SAMPLE-${Date.now()}`,
                          context: {},
                          parameters: { lwlMeters: 10.5, beamMeters: 2.8, draftMeters: 0.65 }
                        };
                        await executionEngine.executeAgent(selectedAgent.id, input);
                        refreshState();
                      }}
                      className="w-full py-2 px-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-2 shadow-md"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Execute Single Agent Test Run</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-xs">
                  Select an agent from the matrix to inspect its architecture.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ORCHESTRATOR & TASK DAG */}
        {activeTab === 'orchestrator' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <div>
                <h2 className="font-bold text-base text-slate-100">Central Orchestrator Cockpit</h2>
                <p className="text-xs text-slate-400 mt-0.5">Topological dependency scheduling and multi-agent synthesis workflows</p>
              </div>

              <div className="flex gap-3">
                <button
                  disabled={isExecutingWorkflow}
                  onClick={handleRunSizingWorkflow}
                  className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-md"
                >
                  {isExecutingWorkflow ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>{isExecutingWorkflow ? 'Executing Workflow...' : 'Launch Sizing Workflow (4 Agents)'}</span>
                </button>
              </div>
            </div>

            {/* Task Pipeline List */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Task Dependency Pipeline ({tasks.length} Tasks)</h3>
              {tasks.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-xs">
                  No tasks currently in workflow queue. Click "Launch Sizing Workflow" above to dispatch multi-agent pipeline.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-300">#{idx + 1} {task.id}</span>
                          <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                            {task.assignedAgentId}
                          </span>
                          {task.safetyCritical && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                              SAFETY CRITICAL
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm text-slate-100">{task.title}</h4>
                        <p className="text-xs text-slate-400">{task.description}</p>
                        <div className="text-[11px] text-slate-500">
                          Dependencies: {task.dependencies.length > 0 ? task.dependencies.join(' -> ') : 'None (Root Node)'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          task.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          task.status === 'WAITING_HUMAN_APPROVAL' ? 'bg-purple-950 text-purple-300 border border-purple-800 animate-pulse' :
                          task.status === 'RUNNING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          task.status === 'FAILED' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {task.status}
                        </span>

                        {task.approvalGateId && task.status === 'WAITING_HUMAN_APPROVAL' && (
                          <button
                            onClick={() => setActiveTab('approvals')}
                            className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium"
                          >
                            Review Gate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: HUMAN DIRECTOR APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-purple-400" />
                  <span>Engineering Director Safety & Approval Queue</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mandatory human-in-the-loop sign-off for safety-critical calculations, baseline modifications, and high-consequence decisions.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Authenticated Role: </span>
                <span className="text-xs font-bold font-mono text-cyan-300">ENGINEERING_DIRECTOR</span>
              </div>
            </div>

            {pendingGates.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-12 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                No pending safety approval gates. All systems operating within approved envelope.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingGates.map(gate => (
                  <div key={gate.id} className="bg-slate-900/80 border border-purple-500/40 rounded-lg p-5 space-y-4 shadow-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                            {gate.id}
                          </span>
                          <span className="text-xs font-mono text-slate-400">From Agent: {gate.agentId}</span>
                        </div>
                        <h3 className="font-bold text-base text-slate-100 mt-1">{gate.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{gate.description}</p>
                      </div>

                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        DECISION REQUIRED
                      </span>
                    </div>

                    <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded text-xs text-rose-300">
                      <span className="font-bold uppercase tracking-wider">Safety Implication: </span>
                      {gate.safetyImplication}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Proposed Deliverable Data:</h4>
                      <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 max-h-48 overflow-y-auto">
                        {JSON.stringify(gate.proposedChanges, null, 2)}
                      </pre>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <label className="text-xs font-semibold text-slate-300">Director Sign-off / Review Rationale:</label>
                      <input
                        type="text"
                        value={directorNote}
                        onChange={e => setDirectorNote(e.target.value)}
                        placeholder="Enter director engineering notes for permanent audit log..."
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      />

                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          onClick={() => handleDecision(gate.id, 'REJECTED')}
                          className="px-4 py-1.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-semibold text-xs border border-rose-700 transition flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject Proposal</span>
                        </button>
                        <button
                          onClick={() => handleDecision(gate.id, 'APPROVED')}
                          className="px-5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Authorize Baseline</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DETERMINISTIC TOOLS LAB */}
        {activeTab === 'tools' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verified Naval Tool Suite</h3>
              <div className="space-y-2">
                {[
                  { id: 'TOOL-HYDROSTATICS-01', name: 'Hydrostatics & GMt Stability Calculator', cat: 'HYDROSTATICS' },
                  { id: 'TOOL-RESISTANCE-01', name: 'Resistance & Effective Power (PE)', cat: 'HYDRODYNAMICS' },
                  { id: 'TOOL-MASS-BALANCE-01', name: 'SWBS Mass Balance & CG Ledger', cat: 'WEIGHT_MASS' },
                  { id: 'TOOL-ELECTRICAL-01', name: 'DC Load Balance & Battery Sizing', cat: 'ELECTRICAL' },
                  { id: 'TOOL-STRUCTURES-01', name: 'Bottom Slamming & Plating Scantling', cat: 'STRUCTURES' },
                  { id: 'TOOL-COLREGS-01', name: 'COLREGS 1972 Collision Encounter Solver', cat: 'AUTONOMY_COLREGS' }
                ].map(tool => (
                  <div
                    key={tool.id}
                    onClick={() => {
                      setSelectedToolId(tool.id);
                      if (tool.id === 'TOOL-HYDROSTATICS-01') {
                        setToolInputs({ lwlMeters: 10.5, beamMeters: 2.8, draftMeters: 0.65, blockCoefficientCb: 0.44, kgMeters: 0.85 });
                      } else if (tool.id === 'TOOL-RESISTANCE-01') {
                        setToolInputs({ lwlMeters: 10.5, beamMeters: 2.8, draftMeters: 0.65, displacementTonnes: 7.2, speedKnots: 20 });
                      } else if (tool.id === 'TOOL-COLREGS-01') {
                        setToolInputs({ ownCourseDeg: 0, ownSpeedKnots: 14, targetBearingDeg: 35, targetRangeNm: 2.5, targetCourseDeg: 270, targetSpeedKnots: 12 });
                      }
                      setToolOutput(null);
                    }}
                    className={`p-3 rounded border cursor-pointer transition ${
                      selectedToolId === tool.id
                        ? 'bg-slate-900 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-cyan-400">{tool.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{tool.cat}</span>
                    </div>
                    <h4 className="font-semibold text-xs text-slate-200 mt-1">{tool.name}</h4>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Calculator Workpad */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-cyan-400">{selectedToolId}</span>
                    <h3 className="font-bold text-sm text-slate-100">Deterministic Computation Workbench</h3>
                  </div>
                  <button
                    onClick={handleExecuteTool}
                    className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Run Calculation</span>
                  </button>
                </div>

                {/* Input Parameters Form */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Input Parameters (JSON):</h4>
                  <textarea
                    rows={6}
                    value={JSON.stringify(toolInputs, null, 2)}
                    onChange={e => {
                      try {
                        setToolInputs(JSON.parse(e.target.value));
                      } catch {
                        // wait for valid json
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 p-3 rounded focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Execution Output */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Computation Results & Verification:</h4>
                  {toolOutput ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${toolOutput.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Status: {toolOutput.success ? 'SUCCESS (DETERMINISTIC_PASS)' : 'FAILED'}
                        </span>
                        <span className="text-slate-500">Execution Time: {toolOutput.executionTimeMs?.toFixed(2)} ms</span>
                      </div>
                      <pre className="bg-slate-950 border border-slate-800 rounded p-4 font-mono text-xs text-emerald-300 max-h-64 overflow-y-auto">
                        {JSON.stringify(toolOutput.output, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="bg-slate-950 border border-slate-800 rounded p-6 text-center text-slate-500 text-xs">
                      Click "Run Calculation" to execute deterministic formulas and verify output against classification criteria.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BASELINE & TBD REGISTER */}
        {activeTab === 'parameters' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <div>
                <h2 className="font-bold text-base text-slate-100">Baseline Parameter Register & TBD Ledger</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Governed engineering repository. Unknown vessel parameters are strictly preserved as TBD.
                </p>
              </div>

              <button
                onClick={handleExportObsidian}
                className="px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Export to Obsidian Vault</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Parameter Name</th>
                    <th className="px-4 py-3">Discipline</th>
                    <th className="px-4 py-3">Current Value</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Rev</th>
                    <th className="px-4 py-3">Modifying Agent</th>
                    <th className="px-4 py-3">Assumptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {parameters.map(param => (
                    <tr key={param.id} className="hover:bg-slate-900/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-cyan-400">{param.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-200">{param.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{param.discipline}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">
                        {param.value} {param.unit}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          param.status === 'TBD' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          param.status === 'DIRECTOR_APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        }`}>
                          {param.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">r{param.revision}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{param.lastModifiedByAgent}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={param.assumptions.join('; ')}>
                        {param.assumptions.length > 0 ? param.assumptions.join('; ') : 'None'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT & TRACEABILITY LOG */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-100">Immutable Audit Trail & Security Ledger</h2>
                <p className="text-xs text-slate-400 mt-0.5">Every agent action, tool invocation, and human approval decision is permanently traced</p>
              </div>

              <span className="text-xs text-slate-500 font-mono">Retained Events: {logs.length}</span>
            </div>

            <div className="space-y-2">
              {logs.map(log => (
                <div
                  key={log.id}
                  className={`p-3 rounded-md border text-xs flex items-start justify-between gap-4 font-mono ${
                    log.severity === 'SAFETY_CRITICAL' ? 'bg-rose-950/20 border-rose-500/40 text-rose-200' :
                    log.severity === 'APPROVAL_ACTION' ? 'bg-purple-950/20 border-purple-500/40 text-purple-200' :
                    'bg-slate-900/40 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px]">{log.timestamp.split('T')[1].slice(0, 8)}</span>
                      <span className="font-bold text-cyan-400">[{log.agentId || 'SYSTEM'}]</span>
                      <span className="font-semibold text-slate-100">{log.action}</span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {JSON.stringify(log.details)}
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    log.severity === 'SAFETY_CRITICAL' ? 'bg-rose-900 text-rose-300' :
                    log.severity === 'APPROVAL_ACTION' ? 'bg-purple-900 text-purple-300' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {log.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Obsidian Vault Export Modal */}
      {obsidianExportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-3xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-slate-100">Obsidian Markdown Knowledge Graph Export</h3>
              </div>
              <button
                onClick={() => setObsidianExportModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              The following linked Markdown notes with [[wikilinks]] have been generated directly from the live shared memory register:
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Object.entries(exportedNotes).map(([filename, content]) => (
                <div key={filename} className="border border-slate-800 rounded p-3 bg-slate-950">
                  <span className="font-mono text-xs font-bold text-cyan-400">{filename}</span>
                  <pre className="text-[11px] font-mono text-slate-300 mt-2 whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {content}
                  </pre>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setObsidianExportModal(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
