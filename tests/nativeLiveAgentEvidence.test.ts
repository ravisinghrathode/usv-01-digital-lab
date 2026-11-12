import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';

const source = JSON.parse(fs.readFileSync(
  path.resolve('evidence/live-agents/native-execution-26-20261113.json'), 'utf8'
));
const catalog = JSON.parse(fs.readFileSync(
  path.resolve('evidence/live-agents/representative-cases.json'), 'utf8'
));

describe('Historical native 26-agent execution evidence (NOT naval certification)', () => {
  it('covers 26 unique registered agents with genuine connected Gemini response identifiers', () => {
    expect(source.campaignId).toBe('USV01-AGT02-NATIVE-LIVE-20261113');
    expect(source.schemaVersion).toBe('2.0');
    expect(source.testClass).toBe('SYNTHETIC_NON_OPERATIONAL_AGENT_COMMISSIONING');
    expect(source.registeredAgentsTested).toBe(26);
    expect(source.nativeExecutionObserved).toBe(true);
    expect(source.liveModelResponses).toBe(26);
    expect(source.validAgentOutputSchemas).toBe(26);
    expect(source.failedAgentExecutions).toBe(0);
    expect(source.results).toHaveLength(26);

    const seen = new Set<string>();
    const responses = new Set<string>();
    for (const x of source.results) {
      expect(seen.has(x.canonicalId)).toBe(false);
      seen.add(x.canonicalId);
      const agent = AgentRegistry.getInstance().requireAgent(x.canonicalId);
      const testCase = catalog.agents.find((a: any) => a.canonicalId === x.canonicalId);
      expect(x.agentId).toBe(agent.id);
      expect(x.taskId).toBe(testCase?.taskId);
      expect(x.model).toBe('gemini-3.8-flash');
      expect(x.modelProviderVersion).toBe('gemini-3.8-flash');
      expect(x.provider).toBe('gemini');
      expect(x.providerExecutionMode).toBe('LIVE_AI_GENERATION');
      expect(x.providerFinishReason).toBe('STOP');
      expect(x.providerResponseJsonParsed).toBe(true);
      expect(x.outputSchemaValid).toBe(true);
      expect(x.modelProviderResponseId).toMatch(/^[A-Za-z0-9_-]{10,}$/);
      expect(responses.has(x.modelProviderResponseId)).toBe(false);
      responses.add(x.modelProviderResponseId);
      expect(x.inputPromptSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(x.modelOutputSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(x.correlationId).toBe('corr-native-' + x.canonicalId + '-20261113');
      expect(['SUCCESS', 'NEEDS_HUMAN_APPROVAL']).toContain(x.status);
      expect(x.error).toBe(null);
    }
    expect(seen).toEqual(new Set(
      Array.from({ length: 26 }, (_, i) => 'A' + String(i + 1).padStart(2, '0'))
    ));
  });

  it('records all ten actually executed mandatory deterministic tools with matching registry permissions', () => {
    let toolCount = 0;
    let approvalPending = 0;
    for (const row of source.results) {
      const agent = AgentRegistry.getInstance().requireAgent(row.canonicalId);
      const mandated = agent.verificationCriteria.mandatoryDeterministicTools;
      const actual = row.deterministicTools.map((tool: { id: string; success: boolean }) => tool.id);
      expect(actual).toEqual(mandated);
      expect(row.deterministicTools.every((t: { id: string; success: boolean }) => t.success)).toBe(true);
      toolCount += actual.length;
      if (row.status === 'NEEDS_HUMAN_APPROVAL') approvalPending++;
    }
    expect(toolCount).toBe(10);
    expect(source.successfulDeterministicToolInvocations).toBe(toolCount);
    expect(source.humanApprovalRequiredCount).toBe(approvalPending);
    expect(approvalPending).toBe(15);
  });

  it('does not represent this synthetic execution as independently validated naval engineering', () => {
    expect(source.sourceCommit).toMatch(/^[a-f0-9]{40}$/);
    expect(source.representativeCaseSourceCommit).toBe(catalog.baselineSha);
    expect(source.independentEngineeringAccuracyValidated).toBe(false);
    expect(source.productionDeploymentVerified).toBe(false);
    expect(source.navalEngineeringReleaseApproved).toBe(false);
    expect(source.limitations.length).toBeGreaterThan(0);
    expect(source.modelProvider).toContain('ephemeral relay');
  });
});
