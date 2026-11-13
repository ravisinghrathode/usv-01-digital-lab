import { AgentRegistry } from '../registry/AgentRegistry.ts';
import type { AgentExecutionInput } from '../types/agent.ts';

/**
 * Convert the historical illustrative commissioning catalog to actual
 * per-canonical-agent inputs, without laundering synthetic values into baseline evidence.
 */
export function compileCodexAgentCases(catalog: unknown): Record<string, AgentExecutionInput> {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    throw new Error('Controlled 26-agent catalog must be an object');
  }
  const source = catalog as Record<string, unknown>;
  if (!Array.isArray(source.agents) || source.agents.length !== 26 ||
      typeof source.sharedParameters !== 'object' || source.sharedParameters === null ||
      Array.isArray(source.sharedParameters)) {
    throw new Error('Expected exactly 26 agents and sharedParameters map');
  }
  const cases: Record<string, AgentExecutionInput> = {};
  for (const item of source.agents) {
    if (!item || typeof item !== 'object') throw new Error('Malformed agent entry');
    const row = item as Record<string, unknown>;
    if (typeof row.canonicalId !== 'string' || !/^A(0[1-9]|1[0-9]|2[0-6])$/.test(row.canonicalId) ||
        typeof row.taskId !== 'string' || !row.taskId.trim() ||
        typeof row.task !== 'string' || !row.task.trim() ||
        cases[row.canonicalId]) {
      throw new Error('Duplicate or malformed canonical agent case');
    }
    AgentRegistry.getInstance().requireAgent(row.canonicalId);
    cases[row.canonicalId] = {
      taskId: row.taskId,
      parameters: structuredClone(source.sharedParameters as Record<string, unknown>),
      context: {
        campaignId: source.campaignId,
        task: row.task,
        source: source.source,
        dataClassification: source.dataClassification,
        illustrativeNonOperational: true,
        engineeringBaselineApproved: false
      }
    };
  }
  if (Object.keys(cases).length !== 26) throw new Error('Incomplete 26-agent catalog');
  return cases;
}
