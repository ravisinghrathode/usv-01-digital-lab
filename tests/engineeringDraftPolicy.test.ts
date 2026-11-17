import { describe, expect, it } from 'vitest';
import { guardEngineeringDraftWrite as draft } from '../src/core/auth/engineeringDraftPolicy.ts';

describe('general engineering CRUD cannot confer engineering authority', () => {
  it('creates a server-owned unverified requirement regardless of an optimistic UI status', () => {
    const row = draft('requirements', { id: 'FORGED-1', title: 'Proposed requirement', status: 'In Review', isIllustrative: false });
    expect(row).toMatchObject({ title: 'Proposed requirement', status: 'Draft', recordStatus: 'DRAFT_UNVERIFIED', isIllustrative: false });
    expect(row).not.toHaveProperty('id');
  });
  it('rejects approval, reviewer and evidence claims even from an authenticated writer', () => {
    for (const input of [
      { status: 'Approved' }, { approvalState: 'Approved' },
      { reviewer: 'Self-appointed' }, { verificationStatus: 'Verified' },
      { serverVerifiedSignature: 'spoofed' }, { baselineAdmitted: true },
      { runStatus: 'Completed' }, { resultStatus: 'Passed' },
      { metadata: { approvalState: 'Approved' } },
      { evidence: [{ status: 'Verified' }] }
    ]) {
      expect(() => draft('requirements', input)).toThrow();
    }
  });
  it('never rewrites immutable IDs or creation timestamps', () => {
    const next = draft('requirements', { title: 'Edited', id: 'REQ-01', createdAt: '2001-01-01' }, { id: 'REQ-01', status: 'Draft' });
    expect(next).toEqual({ title: 'Edited' });
    expect(() => draft('requirements', { id: 'REQ-OTHER' }, { id: 'REQ-01', status: 'Draft' })).toThrow(/identity/);
  });
  it('locks old approved and verified records until a separately governed revision', () => {
    for (const existing of [
      { id: 'REQ-A', status: 'Approved' },
      { id: 'DEC-A', approvalState: 'Approved' },
      { id: 'SIM-A', runStatus: 'Completed' },
      { id: 'A', baselineAdmitted: true }
    ]) {
      expect(() => draft('requirements', { title: 'Tampered' }, existing)).toThrow(/Controlled/);
    }
  });
  it('allows bounded routine drafts but never a direct test pass or agent completion', () => {
    expect(draft('engineering_risks', { description: 'Review corrosion', status: 'Open' }).status).toBe('Open');
    expect(draft('simulation_jobs', { name: 'Draft CFD' }).runStatus).toBe('Draft');
    expect(draft('test_records', { measuredDataSummary: 'Pending' }).approvalStatus).toBe('Draft');
    expect(() => draft('verification_plans', { status: 'Executed' })).toThrow();
    expect(() => draft('engineering_risks', { status: 'Accepted' })).toThrow();
  });
  it('rejects dangerous record shapes and prototype pollution', () => {
    expect(() => draft('requirements', null)).toThrow();
    expect(() => draft('requirements', [])).toThrow();
    expect(() => draft('requirements', JSON.parse('{"__proto__": {"status": "Approved"}}'))).toThrow();
  });
});
