import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';

const report = JSON.parse(fs.readFileSync(path.resolve(
  'evidence/live-agents/native-hardened-26-20261113.json'), 'utf8'
));
const registry = AgentRegistry.getInstance();

describe('AGT-02 historical live Gemini 26-agent run — NOT proof of current revised source', () => {
  it('matches the bytes of every critical source file actually executed during the 26 agent run', () => {
    expect(report.schemaVersion).toBe('3.0');
    expect(report.testClass).toBe('SYNTHETIC_NON_OPERATIONAL_LIVE_ENGINE_COMMISSIONING');
    expect(Object.keys(report.sourceFileSha256).length).toBeGreaterThanOrEqual(10);
    const stale: string[] = [];
    for (const [file, fingerprint] of Object.entries(report.sourceFileSha256)) {
      const content = fs.readFileSync(path.resolve(file));
      expect(fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
      if (fingerprint !== 'sha256:' + createHash('sha256').update(content).digest('hex')) {
        stale.push(file);
      }
    }
    expect(stale).toContain('src/core/tools/naval/engineeringTools.ts');
    expect(stale).toContain('src/core/engine/BaseAgent.ts');
    expect(report.testedSourceIsPatchedWorkingTree).toBe(true);
    expect(report.providerAttestationType).toMatch(/NOT provider-signed/);
  });

  it('contains 26 distinct live Gemini responses with safe status and no model-generated release', () => {
    expect(report.nativeEngineAgentSuccesses).toBe(26);
    expect(report.liveProviderResponses).toBe(26);
    expect(report.distinctProviderResponseIds).toBe(26);
    expect(report.registeredOutputSchemaPasses).toBe(26);
    expect(report.agentExecutionFailures).toBe(0);
    expect(report.results).toHaveLength(26);
    const ids = new Set<string>();
    const providerIds = new Set<string>();
    for (const x of report.results) {
      expect(ids.has(x.canonicalId)).toBe(false);
      ids.add(x.canonicalId);
      const spec = registry.requireAgent(x.canonicalId);
      expect(x.registeredId).toBe(spec.id);
      expect(x.roleName).toBe(spec.name);
      expect(x.provider).toBe('gemini');
      expect(x.model).toBe('gemini-3.8-flash');
      expect(x.providerExecutionMode).toBe('LIVE_AI_GENERATION');
      expect(x.providerFinishReason).toBe('STOP');
      expect(x.outputSchemaValid).toBe(true);
      expect(x.evidenceValid).toBe(false);
      expect(x.allModelAssumptionsUnapproved).toBe(true);
      expect(['SUCCESS', 'NEEDS_HUMAN_APPROVAL']).toContain(x.status);
      expect(x.modelProviderResponseId).toMatch(/^[A-Za-z0-9_-]{10,}$/);
      expect(providerIds.has(x.modelProviderResponseId)).toBe(false);
      providerIds.add(x.modelProviderResponseId);
      expect(x.providerInputSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(x.providerOutputSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
    expect(ids).toEqual(new Set(Array.from({length:26}, (_,i) =>
      'A' + String(i+1).padStart(2,'0'))));
    expect(report.engineeringAccuracyIndependentlyValidated).toBe(false);
    expect(report.regulatoryApprovalClaimed).toBe(false);
    expect(report.engineeringReleaseApproved).toBe(false);
  });

  it('proves exactly ten real mandatory tool results are the only primary numerical values', () => {
    let actualToolCalls = 0;
    for (const x of report.results) {
      const mandatory = registry.requireAgent(x.canonicalId).verificationCriteria.mandatoryDeterministicTools;
      expect(x.toolEvidence.map((t: any) => t.id)).toEqual(mandatory);
      for (const t of x.toolEvidence) {
        actualToolCalls++;
        expect(t.success).toBe(true);
        for (const [key, value] of Object.entries(t.output)) {
          if (['string','number','boolean'].includes(typeof value)) {
            expect(x.primaryMetrics[t.id + '.' + key]).toBe(value);
          }
        }
      }
      if (mandatory.length === 0) {
        expect(x.primaryMetrics).toEqual({});
        expect(x.primaryMetricsOrigin).toBe('NO_VERIFIED_QUANTITATIVE_METRICS');
      } else {
        expect(x.primaryMetricsOrigin).toBe('DETERMINISTIC_TOOL_OUTPUT_UNCERTIFIED');
        expect(Object.keys(x.primaryMetrics).every((k:string) =>
          mandatory.some((name:string) => k.startsWith(name + '.')))).toBe(true);
      }
    }
    expect(actualToolCalls).toBe(10);
    expect(report.successfulMandatoryTools).toBe(10);
    expect(report.noToolAgentPrimaryMetricsAllQuarantined).toBe(true);
    expect(report.unapprovedModelBaselineClaimsInAuthoritativeFields).toBe(0);
  });

  it('records corrected A14 electrical demand and protected A17 COLREG screening', () => {
    const a14 = report.results.find((x:any) => x.canonicalId === 'A14');
    expect(a14.primaryMetrics['TOOL-ELECTRICAL-01.totalContinuousPowerW']).toBe(6680);
    expect(a14.primaryMetrics['TOOL-ELECTRICAL-01.averagePowerW']).toBe(6742);
    expect(a14.primaryMetrics['TOOL-ELECTRICAL-01.estimatedEnduranceHours']).toBeCloseTo(14.24, 2);
    const a17 = report.results.find((x:any) => x.canonicalId === 'A17');
    expect(a17.primaryMetrics['TOOL-COLREGS-01.colregsRuleApplicable'])
      .toBe('RULE_15_CROSSING_GIVE_WAY');
    expect(a17.primaryMetrics['TOOL-COLREGS-01.legalApplicabilityValidated']).toBe(false);
    expect(a17.primaryMetrics['TOOL-COLREGS-01.maneuverValidated']).toBe(false);
    expect(a17.primaryMetrics['TOOL-COLREGS-01.safeAlterationCourseDeg']).toBeUndefined();
  });
});
