import { describe, expect, it } from 'vitest';
import { MASTER_AGENTS } from '../src/core/agents/definitions.ts';
import { buildAgentSynthesisPrompt } from '../src/core/engine/AgentSynthesisPrompt.ts';
import { buildCodexSubscriptionPrompt, CodexCliProvider } from '../src/core/models/ModelProvider.ts';
import { CODEX_CLI_MAX_PROMPT_CHARS } from '../src/core/models/DualSubscriptionRoutingPolicy.ts';
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

  it('preserves all six upstream receipts and tool evidence in the REAL Codex prompt', () => {
    const request = buildAgentSynthesisPrompt(a23, inputForReviewer(), evidence, 'corr-a23');
    const codexEnvelope = buildCodexSubscriptionPrompt(request);
    expect(codexEnvelope.length).toBeLessThanOrEqual(CODEX_CLI_MAX_PROMPT_CHARS);
    expect(codexEnvelope).toContain('INDEP-REV-23');
    expect(codexEnvelope).toContain('UNVERIFIED_UPSTREAM_ADVISORY');
    expect(codexEnvelope).toContain('preliminaryCalculation35');
    expect(codexEnvelope).toContain('CONTROLLED_REVIEW_CONTEXT_SENTINEL');
    expect(codexEnvelope).toContain('UNTRUSTED_USER_NOTES_SENTINEL');
    for (const dependency of a23.dependencies) {
      expect(codexEnvelope).toContain(dependency);
    }
    expect(codexEnvelope).toContain('Independent critical uncertainty 7');
  });

  it('accepts a complete 25,836-char A23-size prompt without dropping any evidence', () => {
    const request = buildAgentSynthesisPrompt(a23, inputForReviewer(), evidence, 'corr-a23');
    const initial = buildCodexSubscriptionPrompt(request);
    const supplemental = '\\n\\nAdditional synthetic trace notes: ';
    // Reproduce the measured 25,836-character operator failure with the real
    // A23 six-dependency context and tool payload, plus non-secret fixture text.
    expect(initial.length + supplemental.length).toBeLessThan(25_836);
    request.userPrompt += supplemental +
      'X'.repeat(25_836 - initial.length - supplemental.length);
    const prompt = buildCodexSubscriptionPrompt(request);
    expect(prompt.length).toBe(25_836);
    expect(prompt.length).toBeGreaterThan(24_000);
    expect(prompt.length).toBeLessThan(CODEX_CLI_MAX_PROMPT_CHARS);
    expect(prompt).toContain('preliminaryCalculation35');
    for (const d of a23.dependencies) expect(prompt).toContain(d);
    expect(prompt).toContain('X'.repeat(300));
  });

  it('continues to reject genuinely oversized Codex evidence without launching a model', async () => {
    const request = buildAgentSynthesisPrompt(a23, inputForReviewer(), evidence, 'corr-a23');
    request.userPrompt += 'X'.repeat(CODEX_CLI_MAX_PROMPT_CHARS);
    const adapter = new CodexCliProvider();
    // Only bypass availability precheck for the test: bounded rejection MUST
    // happen before CLI import, quota reservation, or any model invocation.
    adapter.isAvailable = () => true;
    await expect(adapter.generateText(request)).rejects
      .toThrow('bounded ' + CODEX_CLI_MAX_PROMPT_CHARS + '-character input');
  });

});
