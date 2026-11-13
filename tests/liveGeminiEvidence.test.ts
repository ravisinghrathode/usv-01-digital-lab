import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';

const evidence = JSON.parse(fs.readFileSync(
  path.resolve('evidence/live-agents/live-gemini-26-20261113.json'), 'utf8'
));
const catalog = JSON.parse(fs.readFileSync(
  path.resolve('evidence/live-agents/representative-cases.json'), 'utf8'
));

describe('Externally observed live Gemini role execution evidence (NOT full agent-runtime approval)', () => {
  it('records 26 distinct live responses with complete model provenance fields', () => {
    expect(evidence.schemaVersion).toBe('1.1');
    expect(evidence.campaignId).toBe('USV01-26-20261113');
    expect(evidence.sourceCommit).toMatch(/^[a-f0-9]{40}$/);
    expect(evidence.dataClassification).toBe('SYNTHETIC_TEST_ONLY_NON_OPERATIONAL');
    expect(evidence.realProviderResponsesObserved).toBe(26);
    expect(evidence.strictJsonShapePass).toBe(26);
    expect(evidence.cases).toHaveLength(26);
    const ids = new Set<string>();
    const providerIds = new Set<string>();
    for (const c of evidence.cases) {
      expect(ids.has(c.canonicalId)).toBe(false);
      ids.add(c.canonicalId);
      expect(c.provider).toBe('gemini');
      expect(c.modelVersion).toBe('gemini-3.8-flash');
      expect(c.finishReason).toBe('STOP');
      expect(c.liveProviderObserved).toBe(true);
      expect(c.outputSchemaValid).toBe(true);
      expect(c.responseId).toMatch(/^[A-Za-z0-9_-]{10,}$/);
      expect(providerIds.has(c.responseId)).toBe(false);
      providerIds.add(c.responseId);
      expect(c.taskPromptSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(c.outputSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
    expect(ids).toEqual(new Set(Array.from({ length: 26 }, (_, i) =>
      'A' + String(i + 1).padStart(2, '0'))));
  });

  it('ties unmodified roles to current instructions and preserves A06 historical provenance after HYD-01', () => {
    const registry = AgentRegistry.getInstance();
    for (const c of evidence.cases) {
      const spec = registry.requireAgent(c.canonicalId);
      const caseDefinition = catalog.agents.find((a: any) => a.canonicalId === c.canonicalId);
      expect(c.runtimeId).toBe(spec.id);
      expect(c.role).toBe(spec.name);
      expect(c.taskId).toBe(caseDefinition?.taskId);
      expect(c.inputTask).toBe(caseDefinition?.task);
      expect(c.sourceCommit).toBe(catalog.baselineSha);
      const currentInstructionsDigest = 'sha256:' +
        createHash('sha256').update(spec.systemInstructions).digest('hex');
      if (c.canonicalId === 'A06') {
        // The live campaign belongs to source commit 8548128; its A06 prompt has
        // been corrected by HYD-01. Retain evidence unchanged but mark it stale
        // for the current agent. Never rewrite historical provider provenance.
        const archivedA06Instructions = `You are the Hydrostatics & Stability Engineer.
You MUST invoke TOOL-HYDROSTATICS-01 to compute displacement, KB, BMt, and GMt.
GMt must be strictly positive (GMt > 0.35m minimum for small USVs). Any negative or borderline GM is a SAFETY_CRITICAL alert.`;
        const archivedDigest = 'sha256:' +
          createHash('sha256').update(archivedA06Instructions).digest('hex');
        expect(c.registeredInstructionsSha256).toBe(archivedDigest);
        expect(c.registeredInstructionsSha256).not.toBe(currentInstructionsDigest);
        expect(evidence.engineeringReleaseApproved).toBe(false);
      } else {
        expect(c.registeredInstructionsSha256).toBe(currentInstructionsDigest);
      }
      const parsed = spec.outputSchema.safeParse(c.parsedOutput);
      expect(parsed.success, 'Output schema for ' + c.canonicalId).toBe(true);
      expect(c.parsedOutput.requiresDirectorApproval).toBe(true);
    }
  });

  it('never confuses connector-backed Gemini responses with executed mandatory deterministic tools', () => {
    expect(evidence.internalExecutionEngineLiveRunVerified).toBe(false);
    expect(evidence.mandatoryDeterministicToolExecutionVerified).toBe(false);
    expect(evidence.independentEngineeringValidation).toBe(false);
    expect(evidence.engineeringReleaseApproved).toBe(false);
    const flagged: string[] = [];
    for (const c of evidence.cases) {
      expect(c.mandatoryDeterministicToolsActuallyExecutedInThisCall).toBe(false);
      expect(c.executionContext).toBe('CONNECTED_GEMINI_EXTERNAL_TOOL_NOT_INTERNAL_AGENT_ENGINE');
      const mentionsTool = /TOOL-[A-Z0-9_-]+/.test(JSON.stringify(c.parsedOutput));
      expect(c.mentionsDeterministicToolWithoutTrace).toBe(mentionsTool);
      if (mentionsTool) flagged.push(c.canonicalId);
    }
    expect(evidence.toolReferenceWithoutTraceCount).toBe(flagged.length);
    expect(flagged).toEqual(['A06', 'A07', 'A09', 'A14']);
  });
});
