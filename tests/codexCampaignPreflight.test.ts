import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileCodexAgentCases } from '../src/core/verification/CodexMatrixInput.ts';
import { preflightCodexAgentCases } from '../src/core/verification/CodexCampaignPreflight.ts';

const catalog = JSON.parse(fs.readFileSync(
  path.resolve('evidence/live-agents/representative-cases.json'), 'utf8'
));

describe('USV-01 zero-token 26-agent execution readiness', () => {
  it('actually executes mandatory deterministic tools and records unverified provenance', async () => {
    const cases = compileCodexAgentCases(catalog);
    const report = await preflightCodexAgentCases(cases);
    expect(report.totalAgents).toBe(26);
    expect(report.findings).toHaveLength(26);
    expect(report.agentInputsValid).toBe(26);
    expect(report.deterministicToolsPassed + report.deterministicToolsFailed)
      .toBe(report.findings.reduce((n, row) => n + row.toolEvidence.length, 0));
    expect(report.liveCodexCalls).toBe(0);
    expect(report.independentlyEngineeringValidated).toBe(false);
    expect(report.engineeringReleaseApproved).toBe(false);
    expect(report.findings.every(f => f.agentId && f.canonicalId && f.toolEvidence)).toBe(true);
  });

  it('blocks missing/inconsistent input before any model attempt', async () => {
    const cases = compileCodexAgentCases(catalog);
    delete cases.A06.parameters.lwlMeters;
    const report = await preflightCodexAgentCases(cases);
    const hydro = report.findings.find(x => x.canonicalId === 'A06');
    expect(hydro?.readyForModelAttempt).toBe(false);
    expect(hydro?.blockers.length).toBeGreaterThan(0);
    expect(report.status).toBe('PREFLIGHT_BLOCKED_NO_AI_CALLS');
    expect(report.liveCodexCalls).toBe(0);
  });
});
