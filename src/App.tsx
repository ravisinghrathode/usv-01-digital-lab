/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { NavigationSidebar, NavigationModule } from './components/NavigationSidebar';
import { TopBar } from './components/TopBar';
import { ProjectOverview } from './components/ProjectOverview';
import { SystemsEngineeringView } from './components/SystemsEngineeringView';
import { NavalArchitectureView } from './components/NavalArchitectureView';
import { HydrodynamicsView } from './components/HydrodynamicsView';
import { MechanicalStructuralView } from './components/MechanicalStructuralView';
import { ElectricalPowerView } from './components/ElectricalPowerView';
import { PropulsionView } from './components/PropulsionView';
import { SoftwareAutonomyView } from './components/SoftwareAutonomyView';
import { VerificationValidationView } from './components/VerificationValidationView';
import { SimulationCentreView } from './components/SimulationCentreView';
import { RisksDecisionsView } from './components/RisksDecisionsView';
import { ProcurementBOMView } from './components/ProcurementBOMView';
import { TraceabilityMatrixView } from './components/TraceabilityMatrixView';
import { KnowledgeCentreView } from './components/KnowledgeCentreView';
import { AgentOrchestratorView } from './components/AgentOrchestratorView';
import { RealtimeSimulationView } from './components/RealtimeSimulationView';
import { ShipBuildingProcessView } from './components/ShipBuildingProcessView';
import { GenerativeOptimizerView } from './components/GenerativeOptimizerView';
import { AiEngineeringAssistant } from './components/AiEngineeringAssistant';
import { NewRecordModal } from './components/NewRecordModal';
import { ExportImportModal } from './components/ExportImportModal';
import { ContextGuideModal } from './components/ContextGuideModal';
import { LoginModal } from './components/LoginModal';
import {
  authenticatedFetch,
  getCurrentUser,
  subscribeAuthState,
  logout,
  validateSession
} from './core/auth/authClient.ts';
import { ApproverIdentity } from './core/types/safety.ts';

import {
  ProjectInfo,
  WorkstreamSummary,
  Requirement,
  DesignDecision,
  EngineeringRisk,
  SimulationJob,
  VerificationPlan,
  TestRecord,
  ComponentBOM,
  ActivityLogItem,
  PrincipalParticulars,
  WeightCGItem,
  ResistanceEstimate,
  MaterialRecord,
  LoadCaseRecord,
  PowerLoadItem,
  InterfaceDefinition,
  KnowledgeNote,
  WorkstreamCode,
  EngineeringStatus,
  SimulationRunStatus
} from './types/engineering';

import {
  INITIAL_PROJECT,
  INITIAL_WORKSTREAMS,
  INITIAL_REQUIREMENTS,
  INITIAL_DECISIONS,
  INITIAL_RISKS,
  INITIAL_SIMULATIONS,
  INITIAL_VERIFICATION_PLANS,
  INITIAL_TEST_RECORDS,
  INITIAL_COMPONENTS_BOM,
  INITIAL_ACTIVITY_LOG,
  INITIAL_NAVAL_PARTICULARS,
  INITIAL_WEIGHT_CG,
  INITIAL_RESISTANCE,
  INITIAL_MATERIALS,
  INITIAL_LOAD_CASES,
  INITIAL_POWER_LOADS,
  INITIAL_INTERFACES,
  INITIAL_KNOWLEDGE_NOTES
} from './data/initialProjectData';

export default function App() {
  // Navigation & UI state
  const [currentModule, setCurrentModule] = useState<NavigationModule>('overview');
  const [globalSearch, setGlobalSearch] = useState('');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrefillPrompt, setAiPrefillPrompt] = useState<string | undefined>();
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [defaultNewSubsystem, setDefaultNewSubsystem] = useState<WorkstreamCode>('SYS');
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState(false);
  const [isContextGuideOpen, setIsContextGuideOpen] = useState(false);

  // Authentication & Access Control state
  const [currentUser, setCurrentUser] = useState<ApproverIdentity | null>(getCurrentUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginRequiredRole, setLoginRequiredRole] = useState<string | undefined>();

  // Application Data Stores
  const [project, setProject] = useState<ProjectInfo>(INITIAL_PROJECT);
  const [workstreams, setWorkstreams] = useState<WorkstreamSummary[]>(INITIAL_WORKSTREAMS);
  const [requirements, setRequirements] = useState<Requirement[]>(INITIAL_REQUIREMENTS);
  const [decisions, setDecisions] = useState<DesignDecision[]>(INITIAL_DECISIONS);
  const [risks, setRisks] = useState<EngineeringRisk[]>(INITIAL_RISKS);
  const [simulations, setSimulations] = useState<SimulationJob[]>(INITIAL_SIMULATIONS);
  const [verificationPlans, setVerificationPlans] = useState<VerificationPlan[]>(INITIAL_VERIFICATION_PLANS);
  const [testRecords, setTestRecords] = useState<TestRecord[]>(INITIAL_TEST_RECORDS);
  const [components, setComponents] = useState<ComponentBOM[]>(INITIAL_COMPONENTS_BOM);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(INITIAL_ACTIVITY_LOG);

  // Discipline specific stores
  const [particulars, setParticulars] = useState<PrincipalParticulars>(INITIAL_NAVAL_PARTICULARS);
  const [weightItems, setWeightItems] = useState<WeightCGItem[]>(INITIAL_WEIGHT_CG);
  const [resistanceEstimates, setResistanceEstimates] = useState<ResistanceEstimate[]>(INITIAL_RESISTANCE);
  const [materials, setMaterials] = useState<MaterialRecord[]>(INITIAL_MATERIALS);
  const [loadCases, setLoadCases] = useState<LoadCaseRecord[]>(INITIAL_LOAD_CASES);
  const [powerLoads, setPowerLoads] = useState<PowerLoadItem[]>(INITIAL_POWER_LOADS);
  const [interfaces, setInterfaces] = useState<InterfaceDefinition[]>(INITIAL_INTERFACES);
  const [knowledgeNotes, setKnowledgeNotes] = useState<KnowledgeNote[]>(INITIAL_KNOWLEDGE_NOTES);

  // Sync snapshot from server when authenticated
  const syncServerSnapshot = () => {
    authenticatedFetch('/api/data/snapshot')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((resData) => {
        if (resData.success && resData.data) {
          const d = resData.data;
          if (d.requirements?.length) setRequirements(d.requirements);
          if (d.design_decisions?.length) setDecisions(d.design_decisions);
          if (d.engineering_risks?.length) setRisks(d.engineering_risks);
          if (d.simulation_jobs?.length) setSimulations(d.simulation_jobs);
          if (d.verification_plans?.length) setVerificationPlans(d.verification_plans);
          if (d.test_records?.length) setTestRecords(d.test_records);
          if (d.components?.length) setComponents(d.components);
          if (d.activity_log?.length) setActivityLogs(d.activity_log);
          if (d.knowledge_notes?.length) setKnowledgeNotes(d.knowledge_notes);
          if (d.power_loads?.length) setPowerLoads(d.power_loads);
          if (d.interfaces?.length) setInterfaces(d.interfaces);
          if (d.materials?.length) setMaterials(d.materials);
          if (d.load_cases?.length) setLoadCases(d.load_cases);
          if (d.resistance_estimates?.length) setResistanceEstimates(d.resistance_estimates);
          if (d.weight_cg?.length) setWeightItems(d.weight_cg);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch server snapshot (read-only seed dataset active):', err.message);
      });
  };

  // Subscribe to authentication state changes & validate active session on mount
  useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      setCurrentUser(user);
      if (user) {
        syncServerSnapshot();
      }
    });

    validateSession().catch(() => {});
    return () => unsubscribe();
  }, []);

  // Sync log helper
  const addActivityLog = (action: ActivityLogItem['action'], recordType: string, recordId: string, details: string) => {
    const newLog: ActivityLogItem = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      userId: 'usr-engineer',
      userName: 'Lead Engineer',
      action,
      recordType,
      recordId,
      details
    };
    setActivityLogs((prev) => [newLog, ...prev]);

    // Send to server in background
    authenticatedFetch('/api/data/activity_log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog)
    }).catch(() => {});
  };

  // Requirements handlers
  const handleAddRequirement = (reqData: Partial<Requirement>) => {
    const newReq: Requirement = {
      id: `REQ-${reqData.subsystemCode || 'SYS'}-${Date.now().toString().slice(-3)}`,
      projectId: 'PRJ-USV-01',
      subsystemCode: reqData.subsystemCode || 'SYS',
      title: reqData.title || 'Untitled Requirement',
      description: reqData.description || '',
      category: reqData.category || 'Functional',
      priority: reqData.priority || 'High',
      subsystemAllocation: reqData.subsystemAllocation || reqData.subsystemCode || 'SYS',
      verificationMethod: reqData.verificationMethod || 'Test',
      acceptanceCriteria: reqData.acceptanceCriteria || 'Acceptance criteria [TBD]',
      owner: reqData.owner || 'Lead Engineer',
      revision: 'Rev 1.0',
      status: reqData.status || 'Draft',
      isIllustrative: false,
      relatedDecisions: reqData.relatedDecisions || [],
      relatedSimulations: reqData.relatedSimulations || [],
      relatedVerifications: reqData.relatedVerifications || [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setRequirements((prev) => [newReq, ...prev]);
    addActivityLog('CREATE', 'REQUIREMENT', newReq.id, `Created requirement: ${newReq.title}`);

    authenticatedFetch('/api/data/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq)
    }).catch(() => {});
  };

  const handleUpdateRequirement = (id: string, updates: Partial<Requirement>) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : r))
    );
    addActivityLog('UPDATE', 'REQUIREMENT', id, `Updated requirement fields`);

    authenticatedFetch(`/api/data/requirements/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }).catch(() => {});
  };

  const handleArchiveRequirement = (id: string) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Archived' as EngineeringStatus } : r))
    );
    addActivityLog('ARCHIVE', 'REQUIREMENT', id, `Archived requirement`);

    authenticatedFetch(`/api/data/requirements/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Archived' })
    }).catch(() => {});
  };

  // Decisions handler
  const handleUpdateDecisionStatus = (id: string, status: EngineeringStatus) => {
    setDecisions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, approvalState: status, updatedAt: new Date().toISOString().split('T')[0] } : d))
    );
    addActivityLog(status === 'Approved' ? 'APPROVE' : 'UPDATE', 'DECISION', id, `Changed decision state to ${status}`);

    authenticatedFetch(`/api/data/design_decisions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalState: status })
    }).catch(() => {});
  };

  // Simulations handler
  const handleUpdateSimStatus = (id: string, newStatus: SimulationRunStatus) => {
    setSimulations((prev) =>
      prev.map((s) => (s.id === id ? { ...s, runStatus: newStatus, updatedAt: new Date().toISOString().split('T')[0] } : s))
    );
    addActivityLog('UPDATE', 'SIMULATION', id, `Updated run status to ${newStatus}`);

    authenticatedFetch(`/api/data/simulation_jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runStatus: newStatus })
    }).catch(() => {});
  };

  // Modal new record dispatcher
  const handleCreateRecordFromModal = (kind: string, data: any) => {
    if (kind === 'requirement') {
      handleAddRequirement(data);
    } else if (kind === 'decision') {
      const newDec: DesignDecision = {
        id: `DEC-${data.subsystemCode || 'SYS'}-${Date.now().toString().slice(-3)}`,
        projectId: 'PRJ-USV-01',
        subsystemCode: data.subsystemCode,
        title: data.title,
        problemStatement: data.problemStatement,
        alternatives: data.alternatives || [],
        rationale: data.rationale,
        supportingEvidence: data.supportingEvidence || '',
        consequences: data.consequences || '',
        reviewer: data.reviewer,
        approvalState: data.approvalState || 'Draft',
        revision: 'Rev 0.1',
        isAiProposal: false,
        isIllustrative: false,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      setDecisions((prev) => [newDec, ...prev]);
      addActivityLog('CREATE', 'DECISION', newDec.id, `Created decision: ${newDec.title}`);
      authenticatedFetch('/api/data/design_decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDec)
      }).catch(() => {});
    } else if (kind === 'risk') {
      const newRisk: EngineeringRisk = {
        id: `RSK-${Date.now().toString().slice(-3)}`,
        projectId: 'PRJ-USV-01',
        subsystemCode: data.subsystemCode,
        description: data.description,
        probability: data.probability,
        impact: data.impact,
        riskScore: data.riskScore,
        mitigation: data.mitigation,
        owner: data.owner,
        status: 'Open',
        isIllustrative: false,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      setRisks((prev) => [newRisk, ...prev]);
      addActivityLog('CREATE', 'RISK', newRisk.id, `Logged risk score ${newRisk.riskScore}`);
      authenticatedFetch('/api/data/engineering_risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRisk)
      }).catch(() => {});
    } else if (kind === 'simulation') {
      const newSim: SimulationJob = {
        id: `SIM-${data.discipline || 'HYD'}-${Date.now().toString().slice(-3)}`,
        projectId: 'PRJ-USV-01',
        discipline: data.discipline,
        name: data.name,
        geometryRevision: data.geometryRevision,
        inputConfiguration: data.inputConfiguration,
        solver: data.solver,
        boundaryConditions: data.boundaryConditions,
        unitsAndReferenceFrame: data.unitsAndReferenceFrame,
        assumptions: data.assumptions,
        computeEnvironment: data.computeEnvironment,
        runStatus: data.runStatus || 'Ready',
        outputFiles: data.outputFiles || '',
        resultsSummary: data.resultsSummary,
        reviewer: data.reviewer,
        validationStatus: data.validationStatus,
        isIllustrative: false,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      setSimulations((prev) => [newSim, ...prev]);
      addActivityLog('CREATE', 'SIMULATION', newSim.id, `Created simulation job: ${newSim.name}`);
      authenticatedFetch('/api/data/simulation_jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSim)
      }).catch(() => {});
    } else if (kind === 'verification') {
      const newPlan: VerificationPlan = {
        id: `VER-${data.subsystemCode || 'SYS'}-${Date.now().toString().slice(-3)}`,
        projectId: 'PRJ-USV-01',
        subsystemCode: data.subsystemCode,
        title: data.title,
        procedureSummary: data.procedureSummary,
        acceptanceCriteria: data.acceptanceCriteria,
        instrumentationAndCalibration: data.instrumentationAndCalibration,
        targetReqIds: data.targetReqIds || [],
        status: 'Draft',
        owner: data.owner,
        isIllustrative: false,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      setVerificationPlans((prev) => [newPlan, ...prev]);
      addActivityLog('CREATE', 'VERIFICATION', newPlan.id, `Created verification plan: ${newPlan.title}`);
      authenticatedFetch('/api/data/verification_plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlan)
      }).catch(() => {});
    } else if (kind === 'component') {
      const newComp: ComponentBOM = {
        id: `BOM-${Date.now().toString().slice(-3)}`,
        projectId: 'PRJ-USV-01',
        subsystemCode: data.subsystemCode,
        partNumber: data.partNumber,
        description: data.description,
        manufacturer: data.manufacturer,
        supplier: data.supplier,
        technicalSpecs: data.technicalSpecs,
        quantity: data.quantity,
        unitCost: data.unitCost,
        leadTimeWeeks: data.leadTimeWeeks,
        procurementStatus: data.procurementStatus || 'Specifying',
        isIllustrative: false,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      setComponents((prev) => [newComp, ...prev]);
      addActivityLog('CREATE', 'BOM', newComp.id, `Added BOM component: ${newComp.partNumber}`);
      authenticatedFetch('/api/data/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComp)
      }).catch(() => {});
    }
  };

  // Reset demo data handler
  const handleResetDemoData = async () => {
    try {
      const res = await authenticatedFetch('/api/data/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data) {
        setRequirements(data.data.requirements);
        setDecisions(data.data.design_decisions);
        setRisks(data.data.engineering_risks);
        setSimulations(data.data.simulation_jobs);
        setVerificationPlans(data.data.verification_plans);
        setTestRecords(data.data.test_records);
        setComponents(data.data.components);
        setActivityLogs(data.data.activity_log);
      }
    } catch {
      // Offline fallback
      setRequirements(INITIAL_REQUIREMENTS);
      setDecisions(INITIAL_DECISIONS);
      setRisks(INITIAL_RISKS);
      setSimulations(INITIAL_SIMULATIONS);
      setVerificationPlans(INITIAL_VERIFICATION_PLANS);
      setTestRecords(INITIAL_TEST_RECORDS);
      setComponents(INITIAL_COMPONENTS_BOM);
      setActivityLogs(INITIAL_ACTIVITY_LOG);
    }
  };

  // Full export JSON
  const handleExportJson = () => {
    const fullStore = {
      project,
      workstreams,
      requirements,
      design_decisions: decisions,
      engineering_risks: risks,
      simulation_jobs: simulations,
      verification_plans: verificationPlans,
      test_records: testRecords,
      components,
      activity_log: activityLogs,
      knowledge_notes: knowledgeNotes,
      power_loads: powerLoads,
      interfaces,
      materials,
      load_cases: loadCases,
      resistance_estimates: resistanceEstimates,
      weight_cg: weightItems
    };

    const blob = new Blob([JSON.stringify(fullStore, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `USV01_Digital_Engineering_Lab_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Full import JSON
  const handleImportJson = async (jsonString: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.requirements) setRequirements(parsed.requirements);
      if (parsed.design_decisions) setDecisions(parsed.design_decisions);
      if (parsed.engineering_risks) setRisks(parsed.engineering_risks);
      if (parsed.simulation_jobs) setSimulations(parsed.simulation_jobs);
      if (parsed.verification_plans) setVerificationPlans(parsed.verification_plans);
      if (parsed.test_records) setTestRecords(parsed.test_records);
      if (parsed.components) setComponents(parsed.components);
      if (parsed.activity_log) setActivityLogs(parsed.activity_log);

      // Post to server
      await authenticatedFetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString
      });

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Trigger AI assistant from any sub-view
  const triggerAiQuery = (prompt: string, record?: any) => {
    setAiPrefillPrompt(prompt);
    setIsAiOpen(true);
  };

  // Map module to display title
  const currentModuleName = useMemo(() => {
    switch (currentModule) {
      case 'overview':
        return 'Project Overview & Executive Command';
      case 'agent-orchestrator':
        return '25-Agent Autonomous Directorate & DAG Orchestrator';
      case 'workstream-SYS':
        return 'Subsystem 1: Systems Engineering';
      case 'workstream-NAV':
        return 'Subsystem 2: Naval Architecture';
      case 'workstream-HYD':
        return 'Subsystem 3: Hydrodynamics & CFD';
      case 'workstream-MEC':
        return 'Subsystem 4: Mechanical & Structural';
      case 'workstream-ELE':
        return 'Subsystem 5: Electrical & Power';
      case 'workstream-PRP':
        return 'Subsystem 6: Propulsion';
      case 'workstream-AUT':
        return 'Subsystem 7: Software & Autonomy';
      case 'workstream-VNV':
        return 'Subsystem 8: Verification & Validation';
      case 'traceability':
        return 'Requirements Traceability Matrix';
      case 'simulations':
        return 'Central Simulation Register';
      case 'risks-decisions':
        return 'Risks & Architectural Decisions';
      case 'procurement-bom':
        return 'Procurement & Bill of Materials';
      case 'knowledge-centre':
        return 'Knowledge Centre & Obsidian Graph';
      case 'realtime-sim':
        return 'Real-Time COLREGs Autonomous Simulation & Flotation Physics';
      case 'ship-building':
        return 'Physical Shipbuilding & Commissioning Lifecycle';
      case 'generative-optimizer':
        return 'Generative Multi-Agent Design Optimization & Executive Defense';
      default:
        return 'Digital Engineering Lab';
    }
  }, [currentModule]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Left Persistent Navigation Sidebar */}
      <NavigationSidebar
        currentModule={currentModule}
        onSelectModule={(mod) => setCurrentModule(mod)}
        openRequirementsCount={requirements.filter((r) => r.status !== 'Archived').length}
        openDecisionsCount={decisions.filter((d) => d.approvalState !== 'Approved').length}
        openRisksCount={risks.filter((r) => r.status === 'Open').length}
        openSimulationsCount={simulations.filter((s) => s.runStatus === 'Under Review' || s.runStatus === 'Running').length}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <TopBar
          currentModuleName={currentModuleName}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          currentUser={currentUser}
          onOpenLogin={() => {
            setLoginRequiredRole(undefined);
            setIsLoginModalOpen(true);
          }}
          onLogout={logout}
          onOpenNewRecord={() => {
            if (!currentUser) {
              setLoginRequiredRole(undefined);
              setIsLoginModalOpen(true);
              return;
            }
            setDefaultNewSubsystem('SYS');
            setIsNewRecordModalOpen(true);
          }}
          onOpenExportImport={() => setIsExportImportModalOpen(true)}
          onResetDemo={() => {
            if (!currentUser) {
              setLoginRequiredRole(undefined);
              setIsLoginModalOpen(true);
              return;
            }
            handleResetDemoData();
          }}
          onToggleAiAssistant={() => setIsAiOpen(!isAiOpen)}
          isAiAssistantOpen={isAiOpen}
          onOpenContextGuide={() => setIsContextGuideOpen(true)}
        />

        {/* Scrollable Workspace Body */}
        <main className="flex-1 overflow-y-auto bg-slate-950/60 pb-12">
          {currentModule === 'overview' && (
            <ProjectOverview
              workstreams={workstreams}
              requirements={requirements}
              decisions={decisions}
              risks={risks}
              simulations={simulations}
              verificationPlans={verificationPlans}
              activityLogs={activityLogs}
              onNavigate={(mod) => setCurrentModule(mod)}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'agent-orchestrator' && (
            <AgentOrchestratorView onAskAi={triggerAiQuery} />
          )}

          {currentModule === 'workstream-SYS' && (
            <SystemsEngineeringView
              requirements={requirements}
              onAddRequirement={handleAddRequirement}
              onUpdateRequirement={handleUpdateRequirement}
              onArchiveRequirement={handleArchiveRequirement}
              onAskAi={triggerAiQuery}
              onOpenNewModal={(sub) => {
                setDefaultNewSubsystem(sub || 'SYS');
                setIsNewRecordModalOpen(true);
              }}
              filterSubsystem={undefined}
            />
          )}

          {currentModule === 'workstream-NAV' && (
            <NavalArchitectureView
              particulars={particulars}
              weightItems={weightItems}
              onUpdateParticulars={(updated) => setParticulars((prev) => ({ ...prev, ...updated }))}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'workstream-HYD' && (
            <HydrodynamicsView
              resistanceEstimates={resistanceEstimates}
              simulations={simulations}
              onOpenNewSimModal={() => {
                setDefaultNewSubsystem('HYD');
                setIsNewRecordModalOpen(true);
              }}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'workstream-MEC' && (
            <MechanicalStructuralView
              materials={materials}
              loadCases={loadCases}
              simulations={simulations}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'workstream-ELE' && (
            <ElectricalPowerView
              powerLoads={powerLoads}
              testRecords={testRecords}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'workstream-PRP' && (
            <PropulsionView
              propulsionComponents={components.filter((c) => c.subsystemCode === 'PRP')}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'workstream-AUT' && (
            <SoftwareAutonomyView
              interfaces={interfaces}
              requirements={requirements}
              simulations={simulations}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'workstream-VNV' && (
            <VerificationValidationView
              plans={verificationPlans}
              testRecords={testRecords}
              onOpenNewModal={() => {
                setDefaultNewSubsystem('VNV');
                setIsNewRecordModalOpen(true);
              }}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'traceability' && (
            <TraceabilityMatrixView
              requirements={requirements}
              decisions={decisions}
              simulations={simulations}
              verificationPlans={verificationPlans}
              testRecords={testRecords}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'simulations' && (
            <SimulationCentreView
              simulations={simulations}
              onOpenNewSimModal={() => {
                setDefaultNewSubsystem('HYD');
                setIsNewRecordModalOpen(true);
              }}
              onUpdateSimStatus={handleUpdateSimStatus}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'risks-decisions' && (
            <RisksDecisionsView
              risks={risks}
              decisions={decisions}
              onOpenNewRiskModal={() => {
                setDefaultNewSubsystem('SYS');
                setIsNewRecordModalOpen(true);
              }}
              onOpenNewDecisionModal={() => {
                setDefaultNewSubsystem('SYS');
                setIsNewRecordModalOpen(true);
              }}
              onUpdateDecisionStatus={handleUpdateDecisionStatus}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'procurement-bom' && (
            <ProcurementBOMView
              components={components}
              onOpenNewModal={() => {
                setDefaultNewSubsystem('SYS');
                setIsNewRecordModalOpen(true);
              }}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'knowledge-centre' && (
            <KnowledgeCentreView
              notes={knowledgeNotes}
              onAskAi={triggerAiQuery}
            />
          )}

          {currentModule === 'realtime-sim' && (
            <RealtimeSimulationView onAskAi={triggerAiQuery} />
          )}

          {currentModule === 'ship-building' && (
            <ShipBuildingProcessView onAskAi={triggerAiQuery} />
          )}

          {currentModule === 'generative-optimizer' && (
            <GenerativeOptimizerView onAskAi={triggerAiQuery} />
          )}
        </main>
      </div>

      {/* AI Engineering Assistant Sliding Panel */}
      <AiEngineeringAssistant
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        currentWorkstream={currentModuleName}
        prefillPrompt={aiPrefillPrompt}
        onClearPrefill={() => setAiPrefillPrompt(undefined)}
      />

      {/* New Record Modal */}
      <NewRecordModal
        isOpen={isNewRecordModalOpen}
        onClose={() => setIsNewRecordModalOpen(false)}
        defaultSubsystem={defaultNewSubsystem}
        onCreateRecord={handleCreateRecordFromModal}
      />

      {/* JSON Backup Export & Import Modal */}
      <ExportImportModal
        isOpen={isExportImportModalOpen}
        onClose={() => setIsExportImportModalOpen(false)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onResetDemo={handleResetDemoData}
      />

      {/* Project Baseline Context Guide Modal */}
      <ContextGuideModal
        isOpen={isContextGuideOpen}
        onClose={() => setIsContextGuideOpen(false)}
      />

      {/* Staff Authentication Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLoginModalOpen(false);
        }}
        requiredRole={loginRequiredRole}
      />
    </div>
  );
}
