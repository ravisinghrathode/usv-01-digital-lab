import type { AgentSpec, AgentDivision } from '../types/agent.ts';
import { MASTER_AGENTS } from '../agents/definitions.ts';

/**
 * The registry owns role authority. Zod validators are trusted executable
 * schemas and remain shared references; all mutable role metadata is copied.
 */
function snapshotAgentSpec(spec: AgentSpec): AgentSpec {
  return {
    ...spec,
    aliases: spec.aliases ? [...spec.aliases] : undefined,
    responsibilities: [...spec.responsibilities],
    requiredKnowledgeSources: [...spec.requiredKnowledgeSources],
    permittedTools: [...spec.permittedTools],
    dependencies: [...spec.dependencies],
    executionPermissions: [...spec.executionPermissions],
    modelConfig: { ...spec.modelConfig },
    verificationCriteria: {
      ...spec.verificationCriteria,
      requiredChecklist: [...spec.verificationCriteria.requiredChecklist],
      mandatoryDeterministicTools: [...spec.verificationCriteria.mandatoryDeterministicTools],
      acceptanceThresholds: { ...spec.verificationCriteria.acceptanceThresholds }
    },
    auditRequirement: { ...spec.auditRequirement }
  };
}

function freezeRegistryMetadata(spec: AgentSpec): AgentSpec {
  Object.freeze(spec.aliases);
  Object.freeze(spec.responsibilities);
  Object.freeze(spec.requiredKnowledgeSources);
  Object.freeze(spec.permittedTools);
  Object.freeze(spec.dependencies);
  Object.freeze(spec.executionPermissions);
  Object.freeze(spec.modelConfig);
  Object.freeze(spec.verificationCriteria.requiredChecklist);
  Object.freeze(spec.verificationCriteria.mandatoryDeterministicTools);
  Object.freeze(spec.verificationCriteria.acceptanceThresholds);
  Object.freeze(spec.verificationCriteria);
  Object.freeze(spec.auditRequirement);
  return Object.freeze(spec);
}

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AgentSpec> = new Map();
  private aliasMap: Map<string, string> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  private registerDefaults(): void {
    for (const spec of MASTER_AGENTS) {
      this.registerAgent(spec);
    }
    this.validateRegistry();
  }

  public registerAgent(spec: AgentSpec): void {
    if (!spec.id || typeof spec.id !== 'string') {
      throw new Error(`Invalid agent specification: missing or invalid ID`);
    }
    if (this.agents.has(spec.id)) {
      throw new Error(`Duplicate agent registration: Agent with ID '${spec.id}' already exists.`);
    }
    const snapshot = snapshotAgentSpec(spec);
    const allAliases = new Set([snapshot.canonicalId, ...(snapshot.aliases ?? [])]);
    for (const alias of allAliases) {
      if (!alias || typeof alias !== 'string') {
        throw new Error(`Invalid alias in agent '${snapshot.id}'`);
      }
      const mapped = this.aliasMap.get(alias);
      if ((mapped && mapped !== snapshot.id) ||
          (this.agents.has(alias) && alias !== snapshot.id)) {
        throw new Error(`Agent alias collision: '${alias}' is already owned by another role`);
      }
    }
    if (this.aliasMap.has(snapshot.id) && this.aliasMap.get(snapshot.id) !== snapshot.id) {
      throw new Error(`Agent ID collision: '${snapshot.id}' is already assigned as an alias`);
    }

    this.agents.set(snapshot.id, freezeRegistryMetadata(snapshot));
    for (const alias of allAliases) this.aliasMap.set(alias, snapshot.id);
  }

  public getAgent(id: string): AgentSpec | undefined {
    const resolvedId = this.aliasMap.get(id) || id;
    const spec = this.agents.get(resolvedId);
    return spec ? snapshotAgentSpec(spec) : undefined;
  }

  public requireAgent(id: string): AgentSpec {
    const resolvedId = this.aliasMap.get(id) || id;
    const agent = this.agents.get(resolvedId);
    if (!agent) {
      throw new Error(`Agent not found in registry: '${id}'`);
    }
    return snapshotAgentSpec(agent);
  }

  public getAllAgents(): AgentSpec[] {
    return Array.from(this.agents.values(), spec => snapshotAgentSpec(spec));
  }

  public getAgentsByDivision(division: AgentDivision): AgentSpec[] {
    return this.getAllAgents().filter(a => a.division === division);
  }

  public getAgentsByTool(toolId: string): AgentSpec[] {
    return this.getAllAgents().filter(a => a.permittedTools.includes(toolId));
  }

  public getDependentAgents(agentId: string): AgentSpec[] {
    return this.getAllAgents().filter(a => a.dependencies.includes(agentId));
  }

  public getCount(): number {
    return this.agents.size;
  }

  /**
   * Validates that:
   * 1. Exactly 26 canonical agents are registered.
   * 2. All agent dependencies exist in the registry.
   * 3. No circular dependencies exist in the agent reporting or dependency tree.
   * 4. System instructions and schemas are defined.
   */
  public validateRegistry(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.agents.size !== 26) {
      errors.push(`Registry count mismatch: expected exactly 26 agents, found ${this.agents.size}`);
    }

    // Verify HMEA canonical IDs (A01 - A26)
    for (let i = 1; i <= 26; i++) {
      const canonical = `A${i.toString().padStart(2, '0')}`;
      if (!this.aliasMap.has(canonical)) {
        errors.push(`Canonical agent compliance error: Canonical agent '${canonical}' is not mapped.`);
      }
    }

    // Check all dependencies point to valid agents
    for (const [id, agent] of this.agents.entries()) {
      for (const depId of agent.dependencies) {
        if (!this.getAgent(depId)) {
          errors.push(`Agent '${id}' has unresolved dependency on unknown agent '${depId}'`);
        }
      }
      for (const requiredTool of agent.verificationCriteria?.mandatoryDeterministicTools || []) {
        if (!agent.permittedTools.includes(requiredTool)) {
          errors.push(`Agent '${id}' requires tool '${requiredTool}' but lacks permittedTools authorization`);
        }
      }

      if (!agent.name || agent.name.trim().length === 0) {
        errors.push(`Agent '${id}' is missing a valid name`);
      }

      if (!agent.systemInstructions || agent.systemInstructions.trim().length === 0) {
        errors.push(`Agent '${id}' is missing system instructions`);
      }

      if (!agent.verificationCriteria) {
        errors.push(`Agent '${id}' is missing verification criteria`);
      }

      if (!agent.auditRequirement) {
        errors.push(`Agent '${id}' is missing audit requirements`);
      }
    }

    // Check for circular dependencies using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const checkCycle = (currId: string, path: string[]): boolean => {
      visited.add(currId);
      recStack.add(currId);

      const agent = this.agents.get(currId);
      if (agent) {
        for (const depAlias of agent.dependencies) {
          const dependency = this.getAgent(depAlias);
          if (!dependency) continue;
          const depId = dependency.id;
          if (!visited.has(depId)) {
            if (checkCycle(depId, [...path, depId])) return true;
          } else if (recStack.has(depId)) {
            errors.push(`Circular dependency detected: ${[...path, depId].join(' -> ')}`);
            return true;
          }
        }
      }

      recStack.delete(currId);
      return false;
    };

    for (const id of this.agents.keys()) {
      if (!visited.has(id)) {
        checkCycle(id, [id]);
      }
    }

    if (errors.length > 0) {
      console.warn(`Registry validation found ${errors.length} issues:`, errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
