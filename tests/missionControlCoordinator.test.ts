import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { MissionControlCoordinator, extractStructuredJson } from '../src/core/mission-control/MissionControlCoordinator.ts';
import { MissionControlStore } from '../src/core/mission-control/MissionControlStore.ts';
import type { PilotRequest, PilotResult } from '../src/core/mission-control/SubscriptionCliAdapter.ts';

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

const validWorkerOutput = {
  disciplineSummary: 'Traceability review completed without inventing engineering values.',
  keyMetrics: { orphanRequirements: 0 },
  designDecisions: [],
  assumptions: [],
  openTbdItems: [],
  requiresDirectorApproval: false
};

function completed(input: PilotRequest, stdout: string): PilotResult {
  return {
    role: input.role,
    taskId: input.taskId,
    agentId: input.agentId,
    status: 'COMPLETED',
    stdout,
    stderr: '',
    exitCode: 0,
    executable: input.role === 'orchestrator' ? 'claude' : input.role === 'worker' ? 'agy' : 'codex',
    verifiedByHuman: false
  };
}

describe('Mission Control coordination', () => {
  it('preserves all 26 existing specialist agents', () => {
    const registry = AgentRegistry.getInstance();
    expect(registry.getCount()).toBe(26);
    expect(registry.validateRegistry()).toEqual({ valid: true, errors: [] });
  });

  it('unwraps provider JSON envelopes', () => {
    const wrapped = JSON.stringify({
      status: 'SUCCESS',
      response: JSON.stringify({ decision: 'APPROVE', summary: 'ok', findings: [] })
    });
    expect(extractStructuredJson(wrapped)).toMatchObject({ decision: 'APPROVE' });
  });

  it('routes rejected work back to Gemini and never marks human approval satisfied', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'usv-mission-control-'));
    tempDirs.push(dir);
    const storePath = path.join(dir, 'state.json');
    const store = new MissionControlStore(storePath);

    const calls: PilotRequest[] = [];
    let reviewCount = 0;
    const fakeRunner = async (input: PilotRequest): Promise<PilotResult> => {
      calls.push(input);
      if (input.role === 'orchestrator') {
        return completed(input, JSON.stringify({
          plan: { steps: ['inspect requirements', 'produce traceability result'], dependencies: [], acceptanceCriteria: ['no orphan requirements'], risks: [] }
        }));
      }
      if (input.role === 'worker') {
        return completed(input, JSON.stringify({ status: 'SUCCESS', response: JSON.stringify(validWorkerOutput) }));
      }
      reviewCount += 1;
      if (reviewCount === 1) {
        return completed(input, JSON.stringify({
          decision: 'REQUEST_CHANGES',
          summary: 'Need explicit traceability statement.',
          findings: ['Explicitly state that no requirement was invented.']
        }));
      }
      return completed(input, JSON.stringify({
        decision: 'APPROVE',
        summary: 'Technically acceptable for the next governance stage.',
        findings: []
      }));
    };

    const coordinator = new MissionControlCoordinator(store, fakeRunner);
    const result = await coordinator.execute({
      taskId: 'MC-TEST-001',
      specialistAgentId: 'REQ-TRC-02',
      objective: 'Check a bounded requirements traceability package.',
      requirements: ['Do not invent requirements', 'Preserve TBD values'],
      parameters: {},
      context: { test: true },
      commitSha: 'abcdef0123456789',
      workingDirectory: dir,
      safetyCritical: false,
      maxReviewCycles: 2
    });

    expect(result.state).toBe('TECHNICALLY_REVIEWED');
    expect(result.reviewCycles).toBe(2);
    expect(result.manifest?.humanApprovalSatisfied).toBe(false);
    expect(result.manifest?.specialistAgentId).toBe('REQ-TRC-02');
    expect(calls.map(call => call.role)).toEqual([
      'orchestrator', 'worker', 'reviewer', 'worker', 'reviewer'
    ]);
    expect(calls[3].prompt).toContain('Explicitly state that no requirement was invented.');

    const persisted = JSON.parse(await readFile(storePath, 'utf8'));
    expect(persisted.tasks['MC-TEST-001'].state).toBe('TECHNICALLY_REVIEWED');
    expect(persisted.tasks['MC-TEST-001'].evidenceManifest.humanApprovalSatisfied).toBe(false);
  });

  it('fails closed when a provider is unavailable', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'usv-mission-control-'));
    tempDirs.push(dir);
    const store = new MissionControlStore(path.join(dir, 'state.json'));
    const fakeRunner = async (input: PilotRequest): Promise<PilotResult> => ({
      role: input.role,
      taskId: input.taskId,
      agentId: input.agentId,
      status: 'UNAVAILABLE',
      stdout: '',
      stderr: 'authentication required',
      exitCode: 1,
      executable: 'missing',
      verifiedByHuman: false
    });

    const coordinator = new MissionControlCoordinator(store, fakeRunner);
    const result = await coordinator.execute({
      taskId: 'MC-TEST-002',
      specialistAgentId: 'REQ-TRC-02',
      objective: 'Fail closed.',
      requirements: [],
      parameters: {},
      commitSha: 'abcdef0123456789',
      workingDirectory: dir
    });

    expect(result.state).toBe('FAILED');
    expect(result.blocker).toContain('unavailable or failed');
    expect((await store.getTask('MC-TEST-002'))?.state).toBe('FAILED');
  });
});
