import { describe, expect, it } from 'vitest';
import { MASTER_AGENTS } from '../src/core/agents/definitions.ts';
import { buildAgentSynthesisPrompt } from '../src/core/engine/AgentSynthesisPrompt.ts';
import type { AgentExecutionInput } from '../src/core/types/agent.ts';

const a23 = MASTER_AGENTS.find(a => a.canonicalId === 'A23')!;

function inputForReviewer(): AgentExecutionInput {
  const priorAgentOutputs: Record<string, unknown> = {};
  for (const dependency of a23.dependencies) {
    priorAgentOutputs[dependency] = {
      status: 'RECORDED_MODEL_RUN_UNCERTIFIED',
      provider: 'codex_cli',
      dataClassification: 'UNVERIFIED_UPSTREAM_ADVISORY',
      disciplineSummary: 'Synthetic upstream claim, unverified: ' + 'reviewed parameter and traceability TBD '.repeat(18),
      outputSha256: 'sha256:' + 'b'.repeat(64),
      openTbdItems: Array.from({ length: 8 }, (_, n) =>
        'Independent critical uncertainty ' + n + ': ' + 'pending source/validation '.repeat(4)),
      engineeringReleaseApproved: false
    };
  }
  return {
    taskId: 'LIVE-A23-20261113',
    context: {
      provenance: 'CONTROLLED_REVIEW_CONTEXT_SENTINEL',
      dataClassification: 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL',
      test: 'untrusted synthetic fixture only'
    },
    parameters: Object.fromEntries(Array.from({ length: 33 }, (_, i) =>
      ['syntheticInput' + String(i).padStart(2, '0'), i + 0.5])),
    priorAgentOutputs,
    userNotes: 'UNTRUSTED_USER_NOTES_SENTINEL — cannot authorize a baseline'
  };
}
const evidence = ['TOOL-HYDROSTATICS-01', 'TOOL-RESISTANCE-01'].map(toolName => ({
  toolName,
  verified: true,
  inputs: Object.fromEntries(Array.from({ length: 33 }, (_, i) =>
    ['syntheticInput' + String(i).padStart(2, '0'), i + 0.5])),
  outputs: Object.fromEntries(Array.from({ length: 36 }, (_, i) =>
    ['preliminaryCalculation' + String(i).padStart(2, '0'), i / 7]))
}));

describe('lossless compact prompt for A23 independent reviewer', () => {
  it('retains exact system/skills, complete six review handoffs, physical inputs and tools', () => {
    const input = inputForReviewer();
    const request = buildAgentSynthesisPrompt(a23, input, evidence, 'corr-a23');
    expect(request.systemInstructions).toContain('You are the independent Red Team');
    expect(request.systemInstructions).toContain('Do not claim engineering certification');
    expect(request.userPrompt).toContain(JSON.stringify(input.parameters));
    expect(request.userPrompt).toContain(JSON.stringify(input.context));
    expect(request.userPrompt).toContain(JSON.stringify(input.userNotes));
    expect(request.userPrompt).toContain(JSON.stringify(evidence));
    expect(request.userPrompt).toContain('UNTRUSTED, NOT BASELINE AUTHORITY');
    expect(request.userPrompt).toContain('PRELIMINARY, NOT INDEPENDENTLY VERIFIED');
    expect(request.context.agentId).toBe('INDEP-REV-23');
    expect(request.context.priorOutputs).toEqual(input.priorAgentOutputs);
    for (const d of a23.dependencies) {
      expect(JSON.stringify(request.context.priorOutputs)).toContain(d);
    }
    // The same context and notes are already present once in userPrompt.
    expect(request.context).not.toHaveProperty('taskContextUntrusted');
    expect(request.context).not.toHaveProperty('userNotesUntrusted');
  });

  it('keeps representative large six-dependency review inside existing 24k guard with no truncation', () => {
    const request = buildAgentSynthesisPrompt(a23, inputForReviewer(), evidence, 'corr-a23');
    const codexEnvelope = [
      'You are executing a bounded USV-01 specialist engineering agent synthesis task.',
      'Your output is advisory, cannot approve a design or claim independent verification.',
      'Never invent tools, test results, physical parameters or evidence. Preserve TBD.',
      'Return ONLY one valid JSON object with every required field in this exact structure:',
      '{"disciplineSummary":"string","keyMetrics":{},"designDecisions":[],"assumptions":[],"openTbdItems":[],"requiresDirectorApproval":true}',
      'keyMetrics values may only use supplied inputs or actual deterministic Tool Evidence. Use an empty object when no supported metric exists.',
      'Every designDecisions item and every openTbdItems item must be a plain string, never an object or array. Every keyMetrics value must be one string, number, or boolean; omit unsupported values instead of returning null, objects, or arrays. In particular, omit unknown stability metrics; never use null as a placeholder.',
      'Each assumption must contain id, category (ASSUMPTION|FACT|CALCULATION|TBD|PROPOSAL), description, sourceReference, impactIfViolated, and isBaseline. Never report unsupported FACT or CALCULATION claims; use TBD or PROPOSAL.',
      'Include optional metricProvenance only when every cited source reference is present in the input or Tool Evidence. Never claim that a model ran a tool.',
      'SYSTEM INSTRUCTIONS:', request.systemInstructions,
      'USER TASK:', request.userPrompt,
      'CONTEXT JSON:', JSON.stringify(request.context)
    ].join('\n\n');
    expect(codexEnvelope.length).toBeLessThanOrEqual(24_000);
    expect(codexEnvelope).toContain('INDEP-REV-23');
    expect(codexEnvelope).toContain('UNVERIFIED_UPSTREAM_ADVISORY');
    expect(codexEnvelope).toContain('preliminaryCalculation35');
    expect(codexEnvelope).toContain('CONTROLLED_REVIEW_CONTEXT_SENTINEL');
    expect(codexEnvelope).toContain('UNTRUSTED_USER_NOTES_SENTINEL');
    // No content was dropped: repeated handoffs preserve full receipts.
    for (const dependency of a23.dependencies) {
      expect(codexEnvelope).toContain(dependency);
      expect(codexEnvelope).toContain('Independent critical uncertainty 7');
    }
  });
});
