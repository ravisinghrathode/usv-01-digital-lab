import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';

const charter = readFileSync('docs/governance/USV01_26_AGENT_OPERATING_CHARTER_V1.md', 'utf8');
const architecture = readFileSync('docs/ARCHITECTURE.md', 'utf8');

describe('26-agent operating charter v1: specification and current evidence boundaries', () => {
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
});
