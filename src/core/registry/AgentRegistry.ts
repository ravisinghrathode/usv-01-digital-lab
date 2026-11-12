import type { AgentSpec, AgentDivision } from '../types/agent.ts';
import { MASTER_AGENTS } from '../agents/definitions.ts';

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
    this.agents.set(spec.id, spec);
    if (spec.canonicalId) {
      this.aliasMap.set(spec.canonicalId, spec.id);
    }
    if (spec.aliases) {
      for (const alias of spec.aliases) {
        this.aliasMap.set(alias, spec.id);
      }
    }
  }

  public getAgent(id: string): AgentSpec | undefined {
    const resolvedId = this.aliasMap.get(id) || id;
    return this.agents.get(resolvedId);
  }

  public requireAgent(id: string): AgentSpec {
    const resolvedId = this.aliasMap.get(id) || id;
    const agent = this.agents.get(resolvedId);
    if (!agent) {
      throw new Error(`Agent not found in registry: '${id}'`);
    }
    return agent;
  }

  public getAllAgents(): AgentSpec[] {
    return Array.from(this.agents.values());
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
   * 1. Exactly 25 master agents are registered (or minimum 25).
   * 2. All agent dependencies exist in the registry.
   * 3. No circular dependencies exist in the agent reporting or dependency tree.
   * 4. System instructions and schemas are defined.
   */
  public validateRegistry(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.agents.size < 26) {
      errors.push(`Registry underpopulated: expected at least 26 agents, found ${this.agents.size}`);
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
        if (!this.agents.has(depId) && !this.aliasMap.has(depId)) {
          errors.push(`Agent '${id}' has unresolved dependency on unknown agent '${depId}'`);
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
        for (const depId of agent.dependencies) {
          if (!visited.has(depId)) {
            if (checkCycle(depId, [...path, depId])) return true;
          } else if (recStack.has(depId)) {
            errors.push(`Circular dependency detected: ${path.join(' -> ')} -> ${depId}`);
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
