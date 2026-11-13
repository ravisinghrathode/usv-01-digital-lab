import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileCodexAgentCases } from '../src/core/verification/CodexMatrixInput.ts';

const raw = JSON.parse(fs.readFileSync(path.resolve('evidence/live-agents/representative-cases.json'), 'utf8'));

describe('26-agent subscription Codex case compiler', () => {
  it('correctly maps the existing wrapped catalog to 26 canonical execution inputs', () => {
    const cases = compileCodexAgentCases(raw);
    expect(Object.keys(cases)).toHaveLength(26);
    expect(cases.A01.taskId).toBe(raw.agents[0].taskId);
    expect(cases.A01.context.illustrativeNonOperational).toBe(true);
    expect(cases.A01.context.engineeringBaselineApproved).toBe(false);
    expect(cases.A26.context.task).toBe(raw.agents[25].task);
    expect(cases.A01.parameters).toEqual(raw.sharedParameters);
  });

  it('does not mutate the source or cross-contaminate other agent inputs', () => {
    const cases = compileCodexAgentCases(raw);
    cases.A01.parameters.speedKnots = 999;
    expect(cases.A02.parameters.speedKnots).toBe(raw.sharedParameters.speedKnots);
  });

  it('fails closed for missing, duplicate, or malformed specialist cases', () => {
    const missing = { ...raw, agents: raw.agents.slice(1) };
    expect(() => compileCodexAgentCases(missing)).toThrow(/26/);
    const duplicate = { ...raw, agents: [...raw.agents.slice(0, 25), raw.agents[0]] };
    expect(() => compileCodexAgentCases(duplicate)).toThrow(/Duplicate/);
    expect(() => compileCodexAgentCases([])).toThrow(/catalog/);
  });
});
