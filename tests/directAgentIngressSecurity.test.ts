import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  AgentExecutionRequestError, bindAgentExecutionRequest
} from '../src/core/auth/agentExecutionRequestPolicy.ts';

const actor = { userId: 'verified-actor', role: 'SYSTEMS_ENGINEER' };
const id = 'corr-srv-12345678901234567890';

describe('direct agent request authority and provenance boundary', () => {
  it('binds actor and correlation to verified server context, not caller assertions', () => {
    const request = bindAgentExecutionRequest({
      taskId: 'TASK-REAL',
      correlationId: 'attacker-controlled-correlation',
      context: {
        objective: 'Non-operational research',
        authenticatedUserId: 'spoofed',
        authenticatedUserRole: 'ENGINEERING_DIRECTOR',
        engineeringReleaseApproved: true,
        baselineWritesPermitted: true,
        safetyCritical: false,
        deep: { evidenceValid: true, modelMassKg: 42 }
      },
      parameters: {
        vesselLengthMeters: 10,
        isExploratoryStudy: true,
        approvalBinding: { sourceSha: 'tampered' }
      },
      priorAgentOutputs: {
        upstream: {
          verificationStatus: 'HUMAN_APPROVED',
          report: { draftMeters: 0.4, humanApprovalSatisfied: true }
        }
      }
    }, actor, id);
    expect(request.correlationId).toBe(id);
    expect(request.taskId).toBe('TASK-REAL');
    expect(request.context.authenticatedUserId).toBe(actor.userId);
    expect(request.context.authenticatedUserRole).toBe(actor.role);
    expect(request.context.engineeringReleaseApproved).toBe(false);
    expect(request.context.baselineWritesPermitted).toBe(false);
    expect(request.context.humanApprovalSatisfied).toBe(false);
    expect(request.context.researchOnly).toBe(true);
    expect(request.context.priorAgentOutputsUnverified).toBe(true);
    expect(request.context.safetyCritical).toBeUndefined();
    expect(request.context.deep.evidenceValid).toBeUndefined();
    expect(request.context.deep.modelMassKg).toBe(42);
    expect(request.parameters.vesselLengthMeters).toBe(10);
    expect(request.parameters.approvalBinding).toBeUndefined();
    expect(request.priorAgentOutputs?.upstream.verificationStatus).toBeUndefined();
    expect(request.priorAgentOutputs?.upstream.report.draftMeters).toBe(0.4);
    expect(request.priorAgentOutputs?.upstream.report.humanApprovalSatisfied).toBeUndefined();
  });
  it('generates a server-owned unique task identity when none was supplied', () => {
    const request = bindAgentExecutionRequest({}, actor, id, () => 'abc-123');
    expect(request.taskId).toBe('TASK-abc-123');
    expect(request.context.dataClassification).toBe('PUBLIC_SOURCE_SAFE_ONLY');
  });
  it('refuses client-supplied controlled model transfers and malformed requests', () => {
    expect(() => bindAgentExecutionRequest({
      context: { dataClassification: 'CONTROLLED_ENGINEERING_EVIDENCE' }
    }, actor, id)).toThrow(AgentExecutionRequestError);
    expect(() => bindAgentExecutionRequest({ parameters: null }, actor, id)).toThrow(/parameter/);
    expect(() => bindAgentExecutionRequest({ taskId: '../../unsafe' }, actor, id)).toThrow(/task ID/);
    expect(() => bindAgentExecutionRequest({ userNotes: 'x'.repeat(4001) }, actor, id)).toThrow(/notes/);
    expect(() => bindAgentExecutionRequest({}, actor, 'caller-selected-id')).toThrow(/correlation/);
  });
  it('wires the direct server agent endpoint to the authenticated binding', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    const start = source.indexOf("app.post('/api/agents/execute'");
    const end = source.indexOf('function pinnedSourceSha()', start);
    const route = source.slice(start, end);
    expect(route).toContain("const correlationId = 'corr-srv-' + crypto.randomUUID()");
    expect(route).toContain('bindAgentExecutionRequest(req.body, user, correlationId)');
    expect(route).toContain('err instanceof AgentExecutionRequestError');
  });
});
