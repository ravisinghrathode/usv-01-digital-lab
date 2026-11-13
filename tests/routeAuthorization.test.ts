import { describe, expect, it } from 'vitest';
import { authorizeLabRoute } from '../src/core/auth/routeAuthorization.ts';

describe('USV-01 server-side route authorization', () => {
  it('allows authenticated staff to read engineering data', () => {
    expect(authorizeLabRoute('GET', '/data/requirements', 'VVT_SPECIALIST')).toBe(true);
  });

  it('blocks destructive operations for non-Director staff', () => {
    for (const role of ['VVT_SPECIALIST', 'LEAD_SYSTEMS_ENGINEER', 'NAVAL_ARCHITECT']) {
      expect(authorizeLabRoute('POST', '/data/reset-demo', role)).toBe(false);
      expect(authorizeLabRoute('POST', '/import', role)).toBe(false);
      expect(authorizeLabRoute('DELETE', '/data/requirements/REQ-001', role)).toBe(false);
      expect(authorizeLabRoute('POST', '/governance/sign-ecr', role)).toBe(false);
    }
  });

  it('permits Director authority while restricting routine engineering edits', () => {
    expect(authorizeLabRoute('POST', '/data/reset-demo', 'ENGINEERING_DIRECTOR')).toBe(true);
    expect(authorizeLabRoute('PUT', '/data/requirements/REQ-001', 'STRUCTURAL_ENGINEER')).toBe(true);
    expect(authorizeLabRoute('PUT', '/data/requirements/REQ-001', 'SECURITY_ANALYST')).toBe(false);
    expect(authorizeLabRoute('POST', '/verify/execute', 'VVT_SPECIALIST')).toBe(true);
    expect(authorizeLabRoute('POST', '/verify/execute', 'ELECTRICAL_ENGINEER')).toBe(false);
  });

  it('allows authenticated staff to consult Codex but rejects unknown write routes', () => {
    expect(authorizeLabRoute('POST', '/assistant/assist', 'LEAD_SYSTEMS_ENGINEER')).toBe(true);
    expect(authorizeLabRoute('POST', '/assistant/assist', 'NAVAL_ARCHITECT')).toBe(true);
    expect(authorizeLabRoute('POST', '/assistant/assist', 'UNKNOWN')).toBe(false);
    expect(authorizeLabRoute('POST', '/assistant/approve-baseline', 'ENGINEERING_DIRECTOR')).toBe(false);
  });

  it('fails closed on unknown roles and new write routes', () => {
    expect(authorizeLabRoute('GET', '/context', 'UNRECOGNIZED')).toBe(false);
    expect(authorizeLabRoute('POST', '/new-sensitive-feature', 'ENGINEERING_DIRECTOR')).toBe(false);
    expect(authorizeLabRoute('PATCH', '/new-sensitive-feature', 'ENGINEERING_DIRECTOR')).toBe(false);
  });

  it('requires engineering authority for adopting NotebookLM clues', () => {
    expect(authorizeLabRoute('POST', '/notebook-lm/clues/123/adopt', 'NAVAL_ARCHITECT')).toBe(true);
    expect(authorizeLabRoute('POST', '/notebook-lm/clues/123/adopt', 'VVT_SPECIALIST')).toBe(false);
  });
});
