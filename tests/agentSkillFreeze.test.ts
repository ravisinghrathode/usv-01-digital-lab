import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  NAVAL_SKILL_CONTRACTS,
  selectNavalSkillsForAgent,
  buildNavalSkillSystemGuidance
} from '../src/core/skills/NavalSkillRegistry.ts';
import { approvalRouteForChangedFiles } from '../scripts/governance/classify-change.ts';

const load = (relative: string): any =>
  JSON.parse(readFileSync(path.resolve(process.cwd(), relative), 'utf8'));

const finalExternal = [
  'test-gap-audit', 'github-actions-hardening', 'playwright', 'gh-fix-ci'
];
const finalProject = [
  'agent-runtime-resilience', 'cad-to-physics-coupling',
  'agent-qualification-campaign'
];

describe('Final USV-01 agent skill freeze and deterministic acceptance contracts', () => {
  it('freezes exactly the approved 31 agent/engineering skill identities', () => {
    const freeze = load('config/agent-skill-freeze.json');
    expect(freeze.schema).toBe('usv01-agent-skills-freeze/v1');
    expect(freeze.state).toBe('FROZEN_ON_APPROVED_MERGE');
    expect(freeze.agentCount).toBe(26);
    expect(freeze.newFinalBatch.external).toEqual(finalExternal);
    expect(freeze.newFinalBatch.projectOwned).toEqual(finalProject);
    const combined: string[] = [
      ...freeze.previousConnectedAgentEngineeringSkills,
      ...freeze.externalConnectedDevelopmentSkills,
      ...freeze.projectOwnedRoutedSkills
    ];
    expect(combined).toHaveLength(31);
    expect(new Set(combined).size).toBe(31);
    expect(freeze.noAdditionalRuntimeFramework).toBe(true);
    expect(freeze.noNewPaidModelApis).toBe(true);
    expect(freeze.noAutonomousEngineeringApproval).toBe(true);
    expect(freeze.exceptionsRequire).toContain('exact-head protected software/security peer review');
  });

  it('rejects unreviewed additional external or in-repo skill IDs by manifest comparison', () => {
    const freeze = load('config/agent-skill-freeze.json');
    const manifest = load('config/external-skill-sources.json');
    expect(manifest.schema).toBe('usv01-external-skill-sources/v1');
    expect(manifest.skillExpansionFrozen).toBe(true);
    expect(manifest.freezePolicyFile).toBe('config/agent-skill-freeze.json');
    expect(manifest.sources.map((s: any) => s.name).sort()).toEqual(
      [...freeze.externalConnectedDevelopmentSkills].sort()
    );
    expect(NAVAL_SKILL_CONTRACTS.map(s => s.id).sort()).toEqual(
      [...freeze.projectOwnedRoutedSkills].sort()
    );
    expect(finalProject.every(id => NAVAL_SKILL_CONTRACTS.some(s => s.id === id))).toBe(true);
    for (const s of manifest.sources) {
      expect(s.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
      expect(s.sourceUrl).toContain('/blob/' + s.sourceCommit + '/');
      expect(s.executionPermission).toBe('NONE_SKILL_TEXT_ONLY');
      expect(s.additionalApiAccess).toBe(false);
      expect(s.releaseAuthority).toBe(false);
      expect(s.auxiliaryScriptsInstalled).toBe(false);
    }
    const adapted = manifest.sources.find((s: any) => s.name === 'test-gap-audit');
    expect(adapted?.libraryRepresentation).toBe('SOURCE_ATTRIBUTED_PORTABLE_ADAPTATION');
  });

  it('routes the three final project skills only to intended canonical roles', () => {
    expect(selectNavalSkillsForAgent('A01').map(s => s.id)).toContain('agent-runtime-resilience');
    expect(selectNavalSkillsForAgent('A05').map(s => s.id)).toContain('cad-to-physics-coupling');
    expect(selectNavalSkillsForAgent('A18').map(s => s.id)).toContain('agent-qualification-campaign');
    expect(selectNavalSkillsForAgent('A17').map(s => s.id)).not.toContain('agent-runtime-resilience');
    for (const x of ['', 'A27', 'A00', 'A01;override']) {
      expect(() => selectNavalSkillsForAgent(x)).toThrow(/canonical USV-01/);
    }
    const guidance = buildNavalSkillSystemGuidance('A18');
    expect(guidance).toContain('bounded');
    expect(guidance).toContain('uncertainty');
    expect(guidance).toContain('No specialist skill grants tools');
    expect(guidance).not.toContain('ENGINEERING_RELEASED');
  });

  it('requires valid source-controlled procedure files for each final skill', () => {
    for (const name of finalProject) {
      const s = NAVAL_SKILL_CONTRACTS.find(s => s.id === name);
      expect(s).toBeDefined();
      const doc = readFileSync(path.resolve(process.cwd(), s!.documentPath), 'utf8');
      expect(doc).toMatch(new RegExp('^---\\nname: ' + name + '\\n'));
      expect(doc).toContain('## Input contract');
      expect(doc).toContain('## Procedure');
      expect(doc).toContain('## Required output contract');
      expect(doc).toContain('## Fail-closed checks');
      expect(doc).toContain('## Synthetic negative tests');
      expect(doc).toContain('sourceCommitSha');
      expect(doc).toContain('configurationId');
      expect(doc).toContain('revisionId');
      expect(doc).toContain('TBD');
    }
  });

  it('protects the freeze, skill procedures and trusted routing under the existing governance gate', () => {
    for (const file of [
      'config/agent-skill-freeze.json',
      'config/external-skill-sources.json',
      'src/core/skills/NavalSkillRegistry.ts',
      'skills/usv01/agent-runtime-resilience/SKILL.md',
      'skills/usv01/cad-to-physics-coupling/SKILL.md',
      'skills/usv01/agent-qualification-campaign/SKILL.md'
    ]) {
      expect(approvalRouteForChangedFiles([file]), file).toBe('PROTECTED_SOFTWARE_SECURITY');
    }
  });
});
