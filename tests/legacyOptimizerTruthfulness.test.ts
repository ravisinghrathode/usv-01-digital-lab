import { describe, expect, it } from 'vitest';
import { GenerativeDesignOptimizer } from '../src/core/optimizer/GenerativeDesignOptimizer.ts';

describe('Legacy optimizer does not forge multi-agent or independent naval evidence', () => {
  it('offers 12 explicitly synthetic hygiene rules, no role-spoofed votes or certified stability', () => {
    const opt = GenerativeDesignOptimizer.getInstance();
    opt.resetOptimizer(1234);
    const trial = opt.runIteration();
    expect(trial.scenarioRuleChecks).toHaveLength(12);
    expect(trial.scenarioRuleChecks.every(r => /^SCR-\d{3}$/.test(r.agentId))).toBe(true);
    expect(trial.scenarioRuleChecks.every(r =>
      ['SCREEN_PASS_UNVERIFIED','SCREEN_FAIL_UNVERIFIED'].includes(r.vote))).toBe(true);
    expect(trial.scenarioRuleChecks.every(r => !/^A\d\d$/.test(r.canonicalId))).toBe(true);
    expect(trial.debateTranscript.every(x => x.agentId === 'SYNTHETIC_SCENARIO_GATE')).toBe(true);
    expect(opt.getLearnedInvariants()).toHaveLength(0);
    expect(trial.runSeed).toBe(1234);
  });

  it('computes actual local 1% model differences rather than hard-coded fake Sobol indices', () => {
    const opt = GenerativeDesignOptimizer.getInstance();
    opt.resetOptimizer(222);
    const trial = opt.runIteration();
    expect(trial.localSensitivities).toHaveLength(5);
    expect(trial.localSensitivities.every(s => s.inputPerturbationPercent === 1)).toBe(true);
    expect(trial.localSensitivities.every(s =>
      s.targetChangePercent === null || Number.isFinite(s.targetChangePercent))).toBe(true);
    const metrics = trial.localSensitivities.map(x => x.targetChangePercent);
    opt.resetOptimizer(222);
    expect(opt.runIteration().localSensitivities.map(x => x.targetChangePercent)).toEqual(metrics);
  });

  it('exports only unverified candidate and missing technical evidence, not imaginary compliance', () => {
    const opt = GenerativeDesignOptimizer.getInstance();
    opt.resetOptimizer(333);
    const c = opt.runIteration();
    const dossier = opt.generateExecutiveDefenseDossierMarkdown(c);
    expect(dossier).toContain('UNVERIFIED EXPLORATORY CANDIDATE');
    expect(dossier).toContain('Reproducibility Seed');
    expect(dossier).toContain('Synthetic Input Screening Matrix');
    expect(dossier).toContain('SOURCE EVIDENCE MISSING');
    expect(dossier).not.toContain('25-Agent Full Concurrence');
    expect(dossier).not.toContain('Global Sobol Parameter Sensitivity');
    expect(dossier).not.toContain('ISO 12215 / IMO MSC.267 compliant');
    expect(opt.generateRedTeamChallenge().every(q =>
      q.engineeringDefense.startsWith('NOT DEMONSTRATED'))).toBe(true);
  });
});
