import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ToolRegistry } from '../tools/ToolRegistry.ts';
import { evaluateAcceptance } from './AcceptanceGate.ts';

export type ReadinessState = 'CONFIGURED' | 'TOOL_BOUND' | 'BLOCKED_MISSING_TOOL';
export interface AgentReadiness {
  canonicalId: string;
  agentId: string;
  role: string;
  state: ReadinessState;
  mandatoryTools: string[];
  missingTools: string[];
  independentlyValidated: false;
  operationalDeploymentVerified: false;
}

export interface IntegrationEvidence {
  service: string;
  status: 'UNVERIFIED';
  reason: string;
}

export function getLabReadinessSnapshot() {
  const registry = AgentRegistry.getInstance();
  const tools = ToolRegistry.getInstance();
  const agents: AgentReadiness[] = registry.getAllAgents().map(agent => {
    const mandatoryTools = agent.verificationCriteria.mandatoryDeterministicTools;
    const missingTools = mandatoryTools.filter(id => !tools.getTool(id));
    return {
      canonicalId: agent.canonicalId,
      agentId: agent.id,
      role: agent.name,
      state: missingTools.length > 0 ? 'BLOCKED_MISSING_TOOL' as const :
        mandatoryTools.length > 0 ? 'TOOL_BOUND' as const : 'CONFIGURED' as const,
      mandatoryTools,
      missingTools,
      independentlyValidated: false as const,
      operationalDeploymentVerified: false as const
    };
  });
  const integrations: IntegrationEvidence[] = ['Google AI Studio', 'Google Drive', 'Obsidian', 'GitHub live synchronization']
    .map(service => ({
      service,
      status: 'UNVERIFIED' as const,
      reason: 'No authenticated live handshake and source-commit attestation included with this process snapshot.'
    }));

  return {
    generatedAt: new Date().toISOString(),
    purpose: 'Configuration readiness snapshot; NOT a certification of physics, agents, or deployed integrations.',
    registeredAgents: agents.length,
    structuralRegistryValid: registry.validateRegistry().valid,
    deterministicToolCount: tools.getAllTools().length,
    agents,
    integrations,
    engineeringPhysicsValidated: false,
    productionApproved: false,
    acceptance: evaluateAcceptance(typeof process !== 'undefined' ? (process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || '') : '')
  };
}
