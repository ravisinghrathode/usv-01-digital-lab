import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';

const charter = readFileSync('docs/governance/USV01_26_AGENT_OPERATING_CHARTER_V1.md', 'utf8');
const architecture = readFileSync('docs/ARCHITECTURE.md', 'utf8');

describe('26-agent operating charter v1.1: specification and current evidence boundaries', () => {
  it('references the actual 26 canonical roles rather than inventing a second roster', () => {
    const roles = AgentRegistry.getInstance().getAllAgents();
    expect(roles).toHaveLength(26);
    expect(new Set(roles.map(x => x.canonicalId)).size).toBe(26);
    expect(charter).toContain('src/core/agents/definitions.ts');
    expect(charter).toContain('8 divisions');
    expect(architecture).toContain('USV01_26_AGENT_OPERATING_CHARTER_V1.md');
  });

  it('does not conflate Codex trace completeness with engineering acceptance', () => {
    expect(charter).toContain('TRADE_STUDY_READY_UNVERIFIED');
    expect(charter).toContain('0/26 roles independently accepted for engineering accuracy');
    expect(charter).toContain('Engineering release remains **HOLD**');
    expect(charter).toContain('without acquiring autonomous engineering release authority');
  });

  it('retains hard barriers between draft state, source evidence and human authority', () => {
    for (const label of ['DRAFT/HYPOTHESIS', 'SOURCE_ASSERTED', 'SCREENED', 'INDEPENDENTLY_VERIFIED', 'DIRECTOR_APPROVED']) {
      expect(charter).toContain(label);
    }
    expect(charter).toContain('no agent-side, UI-side or optimizer-side auto-promotion');
    expect(charter).toContain('Link loss is not automatically');
    expect(charter).toContain('**not** authoritative parametric CAD');
  });

  it('marks missing coupled solver/CAD/validation capabilities as unresolved', () => {
    for (const blocker of ['B03', 'B04', 'B05', 'B06', 'B07', 'B08']) {
      expect(charter).toMatch(new RegExp('\\*\\*' + blocker + '\\*\\*'));
    }
    expect(charter).toContain('at least two candidate concepts');
    expect(charter).toContain('at least two true feedback revisions');
    expect(charter).toContain('PROPOSED');
  });

  it('makes ChatGPT advisory authority explicit without introducing a 27th registered agent', () => {
    expect(charter).toContain('## 10. ChatGPT operating charter');
    expect(charter).toContain('not an additional registered A01–A26 runtime agent');
    expect(charter).toContain('The Engineering Director/Project Lead owns mission approval');
    expect(charter).toContain('It is not A27');
  });

  it('specifies task handoffs, revision invalidation and separated assurance artifacts', () => {
    expect(charter).toContain('## 11. Collaborative execution and handoff acceptance contract');
    expect(charter).toContain('NOT_RUN/BLOCKED');
    expect(charter).toContain('invalidates all dependent cached calculations');
    expect(charter).toContain('## 12. Evidence disposition and governance adoption checklist');
    expect(charter).toContain('C07: Attach an authorized Engineering Director');
  });

  it('keeps unfinished engineering implementation behind explicit adoption criteria', () => {
    expect(charter).toContain('## 13. Staged implementation and acceptance roadmap');
    expect(charter).toContain('R0 — Charter reconciliation');
    expect(charter).toContain('Do not implement B03 or B04 as part of this charter amendment');
    expect(charter).toContain('Engineering-release HOLD');
  });

  it('expressly binds amendments A-E to acceptance without implying implementation', () => {
    for (const amendment of [
      'A — One authoritative engineering digital thread',
      'B — Three separate, interfacing engineering loops',
      'C — Physics-based feasibility before optimization',
      'D — Autonomous research; controlled engineering authority',
      'E — Measurable proof of engineering autonomy'
    ]) expect(charter).toContain(amendment);
    expect(charter).toContain('**B03**');
    expect(charter).toContain('P0 OPEN');
  });

  it('disentangles evidence maturity from decision authority and treats missing safety data as unknown', () => {
    expect(charter).toContain('Two orthogonal status dimensions');
    expect(charter).toContain('an authority state, not proof');
    expect(charter).toContain('PASS at declared fidelity, FAIL, or UNKNOWN');
    expect(charter).toContain('UNKNOWN can remain in exploratory studies');
    expect(charter).toContain('Legacy single-field status labels');
  });

  it('blocks unapproved spending, publication and AI self-certification', () => {
    expect(charter).toContain('zero permission for new paid external resource consumption');
    expect(charter).toContain('The GitHub repository is publicly visible');
    expect(charter).toContain('self-critique');
    expect(charter).toContain('No actuation');
    expect(charter).toContain('model output and retrieved documents as untrusted input');
    expect(charter).toContain('recovery-plan Action A04');
    expect(charter).toContain('do not promote recovery Action A05');
    expect(charter).toContain('post-live A07 signed host-health requirement');
  });

  it('requires uncertainty-aware measured gain and distinguishes self-critique from independent review', () => {
    expect(charter).toContain('FAILURE_TO_IMPROVE');
    expect(charter).toContain('NOT ACCEPTED AS IMPROVEMENT');
    expect(charter).toContain('C09:');
    expect(charter).toContain('C10:');
    const memo = readFileSync('docs/governance/USV01_OPERATING_CHARTER_V11_AI_SELF_CRITIQUE.md', 'utf8');
    expect(memo).toContain('INDEPENDENT GOVERNANCE AND QUALIFIED ENGINEERING REVIEW **NOT PERFORMED**');
    for (let i = 1; i <= 18; i++) {
      expect(memo).toContain('| F' + String(i).padStart(2, '0') + ' |');
    }
    expect(memo).toContain('READY FOR INDEPENDENT GOVERNANCE REVIEW, NOT ADOPTED');
  });
});
