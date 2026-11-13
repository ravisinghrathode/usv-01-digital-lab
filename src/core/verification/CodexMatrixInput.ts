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
    const parameters = structuredClone(source.sharedParameters as Record<string, unknown>);
    const withheldParameters: Record<string, unknown> = {};
    // Keep explicitly unverified fixture inputs visible to the specialist, but
    // out of calculators that must reject unsupported evidence. These values
    // are never silently changed or promoted into the controlled baseline.
    if (['A05', 'A06', 'A23'].includes(row.canonicalId) && 'blockCoefficientCb' in parameters) {
      withheldParameters.blockCoefficientCb = parameters.blockCoefficientCb;
      delete parameters.blockCoefficientCb;
    }
    if (['A07', 'A13', 'A23'].includes(row.canonicalId) && 'propulsiveEfficiencyEtaD' in parameters) {
      withheldParameters.propulsiveEfficiencyEtaD = parameters.propulsiveEfficiencyEtaD;
      delete parameters.propulsiveEfficiencyEtaD;
    }
    if (row.canonicalId === 'A17') {
      // The encounter case is a synthetic test vector; its bearing convention
      // is explicitly a tool-fixture convention and is not project evidence.
      parameters.bearingReference = 'TRUE_NORTH';
    }
    cases[row.canonicalId] = {
      taskId: row.taskId,
      parameters,
      context: {
        campaignId: source.campaignId,
        task: row.task,
        source: source.source,
        dataClassification: source.dataClassification,
        illustrativeNonOperational: true,
        engineeringBaselineApproved: false,
        unvalidatedCatalogParametersWithheldFromCalculators: withheldParameters,
        syntheticToolConventions: row.canonicalId === 'A17'
          ? { bearingReference: 'TRUE_NORTH', classification: 'TEST_FIXTURE_ONLY_NOT_NAVIGATION_EVIDENCE' }
          : {}
      }
    };
  }
  if (Object.keys(cases).length !== 26) throw new Error('Incomplete 26-agent catalog');
  return cases;
}
