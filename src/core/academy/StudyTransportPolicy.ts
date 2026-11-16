/**
 * Study-only routing for 26 canonically registered specialists.
 * No external model is executed by this selector and no engineering/academic
 * qualification is inferred from a model preference or from a study output.
 */
import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { CHATGPT_SOL_MODEL, dualProviderEnabled } from '../models/DualSubscriptionRoutingPolicy.ts';
import type { AgentCurriculum } from './AgentAcademy.ts';

export function selectAcademyStudyTransport(
  curriculum: Pick<AgentCurriculum, 'canonicalId' | 'runtimeId'>,
  env: NodeJS.ProcessEnv = process.env
): { agentId: string; modelOverride?: typeof CHATGPT_SOL_MODEL; modelIdentityVerified: false } {
  const spec = AgentRegistry.getInstance().requireAgent(curriculum.canonicalId);
  if (spec.id !== curriculum.runtimeId) {
    throw new Error('ACADEMY_RUNTIME_AGENT_ID_MISMATCH: refuse unreviewed identity changes');
  }
  // Codex adapter checks signed-in ChatGPT session independently.
  return {
    agentId: spec.id,
    ...(dualProviderEnabled(env) ? { modelOverride: CHATGPT_SOL_MODEL } : {}),
    modelIdentityVerified: false
  };
}
