import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ToolRegistry } from '../tools/ToolRegistry.ts';
import { ACCEPTANCE_REQUIREMENTS, evaluateAcceptance, type AcceptanceId, type AcceptanceEvidence } from './AcceptanceGate.ts';
import { evaluateBenchmark, type ReferenceMeasurement } from './EngineeringBenchmarks.ts';
import { screenResistancePropulsionEvidence } from './ResistancePropulsionEvidence.ts';

/**
 * Integrated software-observable acceptance campaign. This is NOT an engineering
 * certificate: independent inspection, physical data, authenticated service
 * handshakes and Director authorization must be validated separately.
 */
export const CAMPAIGN_WORKSTREAMS = [
  { id: 'WS-01', name: '26-agent operational readiness', criteria: ['AGT-01'] },
  { id: 'WS-02', name: 'Agent-specific reference accuracy', criteria: ['AGT-02'] },
  { id: 'WS-03', name: 'Hydrostatics and intact stability', criteria: ['HYD-01'] },
  { id: 'WS-04', name: 'Hydrodynamic resistance and propulsion', criteria: ['RES-01'] },
  { id: 'WS-05', name: 'Structural engineering', criteria: ['STR-01'] },
  { id: 'WS-06', name: 'Autonomy safety and loss of link', criteria: ['AUT-01'] },
  { id: 'WS-07', name: 'Marine integration and launch/recovery', criteria: ['MAR-01'] },
  { id: 'WS-08', name: 'Google AI Studio live deployment sync', criteria: ['INT-01'] },
  { id: 'WS-09', name: 'Google Drive authorized roundtrip', criteria: ['INT-02'] },
  { id: 'WS-10', name: 'Obsidian knowledge graph roundtrip', criteria: ['INT-03'] },
  { id: 'WS-11', name: 'Cybersecurity and audit integrity', criteria: ['SEC-01', 'SEC-02'] },
  { id: 'WS-12', name: 'Independent review and Director governance', criteria: ['GOV-01', 'GOV-02'] },
  { id: 'WS-13', name: 'Production deployment and recovery', criteria: ['DEP-01'] }
] as const satisfies readonly { id: string; name: string; criteria: readonly AcceptanceId[] }[];

export type CampaignStatus = 'SOFTWARE_CHECK_PASSED_EXTERNAL_EVIDENCE_PENDING' | 'BLOCKED_MISSING_EVIDENCE' | 'BLOCKED_SOFTWARE_DEFECT';
export interface CampaignInputs {
  baselineSha: string;
  evidence?: readonly AcceptanceEvidence[];
  benchmarkMeasurements?: readonly ReferenceMeasurement[];
  resistancePropulsionEvidence?: unknown;
}

export function runAcceptanceCampaign(input: CampaignInputs) {
  const registry = AgentRegistry.getInstance();
  const tools = ToolRegistry.getInstance();
  const registryCheck = registry.validateRegistry();
  const agents = registry.getAllAgents();
  const agentFindings = agents.map(agent => {
    const missingTools = agent.verificationCriteria.mandatoryDeterministicTools.filter(
      id => !tools.getTool(id) || !agent.permittedTools.includes(id) ||
        !agent.executionPermissions.includes('CALCULATION_EXEC')
    );
    return {
      agentId: agent.canonicalId,
      runtimeId: agent.id,
      missingTools,
      configurationValid: missingTools.length === 0,
      liveProviderExecutionVerified: false,
      independentlyValidated: false
    };
  });
  const structurallyValid = registryCheck.valid &&
    agents.length === 26 &&
    agentFindings.every(a => a.configurationValid);
  const acceptance = evaluateAcceptance(input.baselineSha, input.evidence);
  const benchmark = evaluateBenchmark(input.benchmarkMeasurements || []);
  const resistancePropulsion = screenResistancePropulsionEvidence(input.resistancePropulsionEvidence, input.baselineSha);
  const assigned = new Set(CAMPAIGN_WORKSTREAMS.flatMap(w => [...w.criteria]));
  const missingCriteria = ACCEPTANCE_REQUIREMENTS.filter(c => !assigned.has(c.id)).map(c => c.id);
  const workstreams = CAMPAIGN_WORKSTREAMS.map(w => {
    const softwareDefect = (w.id === 'WS-01' && !structurallyValid) ||
      (w.id === 'WS-03' && benchmark.status === 'INVALID_REFERENCE_DATA') ||
      (w.id === 'WS-04' && benchmark.status === 'INVALID_REFERENCE_DATA');
    const status: CampaignStatus = softwareDefect ? 'BLOCKED_SOFTWARE_DEFECT' :
      w.id === 'WS-01' ? 'SOFTWARE_CHECK_PASSED_EXTERNAL_EVIDENCE_PENDING' : 'BLOCKED_MISSING_EVIDENCE';
    return {
      ...w,
      status,
      accepted: false,
      acceptanceCriteria: w.criteria.map(id => {
        const evidence = acceptance.requirements.find(r => r.id === id);
        return { id, status: evidence?.status ?? 'PENDING_EVIDENCE' };
      })
    };
  });
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    baselineSha: input.baselineSha,
    baselineValid: acceptance.baselineValid,
    registeredAgents: agents.length,
    structurallyValid,
    agentFindings,
    registryErrors: registryCheck.errors,
    benchmark,
    resistancePropulsion,
    missingCriteria,
    workstreams,
    pendingWorkstreams: workstreams.filter(w => !w.accepted).length,
    acceptedWorkstreams: 0,
    releaseApproved: false,
    releaseReason: 'External engineering evidence, authenticated live-service proof, independent review and applicable human approval are not established by repository tests.',
    automatedTestScope: 'Run npm test and the production build independently; this campaign only evaluates local configuration and supplied untrusted evidence metadata.'
  };
}

export function acceptanceCampaignMarkdown(
  report: ReturnType<typeof runAcceptanceCampaign>
): string {
  const rows = report.workstreams.map(w =>
    '| ' + w.id + ' | ' + w.name.replace(/\\|/g, '/') + ' | ' + w.status + ' |'
  ).join('\n');
  return [
    '# USV-01 Integrated Acceptance Campaign',
    '',
    'Baseline: \`' + report.baselineSha + '\`',
    '',
    'Registered agents: ' + report.registeredAgents + ' (registry structural check: ' +
      (report.structurallyValid ? 'PASS' : 'FAIL') + ')',
    'External acceptance: **NOT APPROVED**',
    'Benchmark comparison: ' + report.benchmark.status,
    'RES-01 numerical evidence screening: ' + report.resistancePropulsion.status + ' (not a physical acceptance or release signature)',
    'RES-01 unclosed external engineering/review gates: ' + report.resistancePropulsion.missingGates.join(', '),
    '',
    '| Workstream | Requirement | Disposition |',
    '|---|---|---|',
    rows,
    '',
    '**Scope limit:** These results are software-observable checks only, not naval engineering certification, authenticated external-system evidence, or Director authorization.',
    ''
  ].join('\n');
}
