import { createHash } from 'node:crypto';
import type { AgentSpec, AgentExecutionOutput } from '../types/agent.ts';

/**
 * Deterministic DAG schedule for all registered specialists.
 * A registry listing is not a valid engineering execution plan: A06 requires
 * A09, and A14 requires A16/A19 although those IDs are numerically later.
 */
export function topologicalAgentOrder(specs: readonly AgentSpec[]): AgentSpec[] {
  const byId = new Map(specs.map(spec => [spec.id, spec]));
  if (byId.size !== specs.length) throw new Error('Duplicate runtime agent identifiers');
  const visited = new Set<string>();
  const active = new Set<string>();
  const order: AgentSpec[] = [];

  const visit = (spec: AgentSpec): void => {
    if (visited.has(spec.id)) return;
    if (active.has(spec.id)) throw new Error('Agent dependency cycle at ' + spec.id);
    active.add(spec.id);
    for (const dependencyId of spec.dependencies) {
      const dependency = byId.get(dependencyId);
      if (!dependency) throw new Error(`Missing agent dependency: ${spec.id} -> ${dependencyId}`);
      visit(dependency);
    }
    active.delete(spec.id);
    visited.add(spec.id);
    order.push(spec);
  };

  for (const spec of specs) visit(spec);
  return order;
}

/**
 * Upstream model synthesis is UNVERIFIED advisory context, never accepted as
 * deterministic data or a released engineering baseline.
 */
export function advisoryHandoff(
  spec: AgentSpec,
  outputs: ReadonlyMap<string, AgentExecutionOutput>
): Record<string, unknown> {
  const upstream: Record<string, unknown> = {};
  for (const dependencyId of spec.dependencies) {
    const output = outputs.get(dependencyId);
    if (!output) throw new Error('Missing upstream evidence: ' + dependencyId);
    upstream[dependencyId] = {
      status: output.status,
      provider: output.provider,
      dataClassification: 'UNVERIFIED_UPSTREAM_ADVISORY',
      disciplineSummary: typeof output.data?.disciplineSummary === 'string'
        ? output.data.disciplineSummary.slice(0, 700) : '',
      outputSha256: 'sha256:' + createHash('sha256').update(JSON.stringify(output.data)).digest('hex'),
      openTbdItems: output.openTbdItems.slice(0, 8),
      engineeringReleaseApproved: false
    };
  }
  return upstream;
}
