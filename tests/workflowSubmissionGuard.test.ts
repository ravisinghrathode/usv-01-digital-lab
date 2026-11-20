import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeWorkflowInput, validateServerWorkflowReplacement, WorkflowSubmissionError
} from '../src/core/orchestrator/WorkflowSubmissionGuard.ts';

const allAgents = () => Array.from({ length: 26 }, (_, i) => ({
  id: 'A' + String(i + 1).padStart(2, '0'),
  dependencies: i === 0 ? [] : ['A' + String(i).padStart(2, '0')]
}));

describe('server-owned 26-agent workflow boundary', () => {
  it('accepts a deterministic, complete 26-agent DAG', () => {
    expect(() => validateServerWorkflowReplacement(allAgents(), [])).not.toThrow();
  });

  it('rejects duplicate, missing, cyclic and self dependencies before mutation', () => {
    const base = allAgents();
    expect(() => validateServerWorkflowReplacement([...base, base[0]], [])).toThrow(WorkflowSubmissionError);
    expect(() => validateServerWorkflowReplacement(
      [{ id: 'A01', dependencies: ['NOT_REGISTERED'] }], []
    )).toThrow(/missing dependencies/);
    expect(() => validateServerWorkflowReplacement(
      [{ id: 'A01', dependencies: ['A01'] }], []
    )).toThrow(/self or missing dependencies/);
    expect(() => validateServerWorkflowReplacement(
      [{ id: 'A01', dependencies: ['A02'] }, { id: 'A02', dependencies: ['A01'] }], []
    )).toThrow(/Cyclic/);
  });

  it('cannot silently abandon a previously pending director gate or executing task', () => {
    const next = [{ id: 'A01', dependencies: [] }];
    for (const status of ['WAITING_HUMAN_APPROVAL', 'RUNNING'] as const) {
      try {
        validateServerWorkflowReplacement(next, [{ id: 'OLDER', status }]);
        throw new Error('Expected fail-closed workflow replacement');
      } catch (e) {
        expect(e).toBeInstanceOf(WorkflowSubmissionError);
        expect((e as WorkflowSubmissionError).httpStatus).toBe(409);
      }
    }
  });

  it('removes spoofed approval, role and verification claims at arbitrary nesting', () => {
    const out = sanitizeWorkflowInput({
      objective: 'Document unverified hull study',
      authenticatedUserId: 'spoofed',
      approvalBinding: { sourceSha: 'forged' },
      nested: { evidenceValid: true, fields: [{ approvedBy: 'fake', massKg: 42 }] },
      researchOnly: false,
      engineeringReleaseApproved: true,
      baselineWritesPermitted: true
    }, {
      massKg: 21,
      verificationStatus: 'HUMAN_APPROVED',
      parameters: { approvalGateId: 'GATE-SPOOF', draftMeters: 0.6 }
    }, 'verified-user');
    expect(out.context.authenticatedUserId).toBe('verified-user');
    expect(out.context.researchOnly).toBe(true);
    expect(out.context.engineeringReleaseApproved).toBe(false);
    expect(out.context.baselineWritesPermitted).toBe(false);
    expect(out.context.humanApprovalSatisfied).toBe(false);
    expect(out.context.approvalBinding).toBeUndefined();
    const nested = out.context.nested as Record<string, any>;
    expect(nested.evidenceValid).toBeUndefined();
    expect(nested.fields[0].approvedBy).toBeUndefined();
    expect(nested.fields[0].massKg).toBe(42);
    expect(out.parameters.verificationStatus).toBeUndefined();
    expect((out.parameters.parameters as Record<string, unknown>).approvalGateId).toBeUndefined();
    expect(out.parameters.massKg).toBe(21);
  });

  it('strips separator-obfuscated authority claims at nested levels', () => {
    const out = sanitizeWorkflowInput({
      'approved_by': 'forged',
      'human-approval-satisfied': true,
      nested: { 'approval.gate.id': 'forged', 'verification_status': 'CERTIFIED', safeValue: 17 }
    }, {
      'private_key': 'not-a-credential',
      'baseline writes permitted': true,
      safeMassKg: 24
    }, 'verified-user');
    expect(out.context).not.toHaveProperty('approved_by');
    expect(out.context).not.toHaveProperty('human-approval-satisfied');
    expect(out.context.nested).toEqual({ safeValue: 17 });
    expect(out.parameters).not.toHaveProperty('private_key');
    expect(out.parameters).not.toHaveProperty('baseline writes permitted');
    expect(out.parameters.safeMassKg).toBe(24);
  });

  it('refuses unsupported information classifications and malformed input', () => {
    expect(() => sanitizeWorkflowInput(
      { dataClassification: 'NAVAL_SECRET' }, {}, 'verified-user'
    )).toThrow(/classification/);
    expect(() => sanitizeWorkflowInput([], {}, 'verified-user')).toThrow(/context/);
    expect(() => sanitizeWorkflowInput({}, null, 'verified-user')).toThrow(/parameters/);
  });

  it('rejects oversized nested strings and object keys while retaining bounded research data', () => {
    expect(() => sanitizeWorkflowInput({}, { note: 'x'.repeat(16_385) }, 'verified-user'))
      .toThrow(/Oversized workflow input string/);
    expect(() => sanitizeWorkflowInput({ nested: [{ note: 'x'.repeat(16_385) }] }, {}, 'verified-user'))
      .toThrow(/Oversized workflow input string/);
    expect(() => sanitizeWorkflowInput({}, { ['x'.repeat(257)]: 1 }, 'verified-user'))
      .toThrow(/Oversized workflow input key/);
    const safe = sanitizeWorkflowInput({}, { note: 'x'.repeat(16_384), massKg: 42 }, 'verified-user');
    expect(safe.parameters.massKg).toBe(42);
    expect(safe.parameters.note).toHaveLength(16_384);
  });

  it('guards the live workflow endpoint before destructive orchestrator.clearTasks', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    const start = source.indexOf("app.post('/api/orchestrator/execute-workflow'");
    const end = source.indexOf("app.post('/api/orchestrator/decide-gate'", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const route = source.slice(start, end);
    expect(route).toContain('submitted.length > 26');
    expect(route).toContain('sanitizeWorkflowInput(');
    expect(route).toContain('validateServerWorkflowReplacement(prepared, orchestrator.getAllTasks());');
    expect(route.indexOf('validateServerWorkflowReplacement(')).toBeLessThan(route.indexOf('orchestrator.clearTasks();'));
    expect(route).toContain('getPendingGates().length > 0');
  });
});
