import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { ROLE_ACCURACY_OBLIGATIONS } from '../src/core/verification/RoleAccuracyObligations.ts';
import { auditAll26AgentAccuracy } from '../src/core/verification/RoleAccuracyAudit.ts';

const samples = JSON.parse(fs.readFileSync(path.resolve(
  'evidence/live-agents/live-gemini-26-20261113.json'), 'utf8'));
const native = JSON.parse(fs.readFileSync(path.resolve(
  'evidence/live-agents/native-execution-26-20261113.json'), 'utf8'));
const oldCommit = native.sourceCommit;

const measure = (revision: string, results = native.results) =>
  auditAll26AgentAccuracy({
    registeredCommit: revision,
    nativeEvidenceCommit: oldCommit,
    nativeResults: results,
    originalResults: samples.cases
  });

describe('26 discipline-specific independent accuracy obligations', () => {
  it('defines distinct technical challenges with separate independent source requirements for every registered specialist', () => {
    const ids = new Set(ROLE_ACCURACY_OBLIGATIONS.map(x => x.canonicalId));
    expect(ids.size).toBe(26);
    expect(ids).toEqual(new Set(Array.from({ length: 26 }, (_, i) =>
      'A' + String(i + 1).padStart(2, '0'))));
    const registry = AgentRegistry.getInstance();
    for (const c of ROLE_ACCURACY_OBLIGATIONS) {
      expect(registry.requireAgent(c.canonicalId).name.length).toBeGreaterThan(8);
      expect(c.representativeChallenge.length).toBeGreaterThan(25);
      expect(c.independentlyRequired.length).toBeGreaterThan(25);
      expect(c.externalAttestationRequired).toBe(true);
      expect(c.requiresPhysicalOrAuthoritativeReference).toBe(true);
    }
    expect(new Set(ROLE_ACCURACY_OBLIGATIONS.map(x => x.representativeChallenge)).size).toBe(26);
    expect(new Set(ROLE_ACCURACY_OBLIGATIONS.map(x => x.independentlyRequired)).size).toBe(26);
  });

  it('finds historical provider/tool trace coverage but does not accept older live tests as current-source accuracy', () => {
    const r = measure('0'.repeat(40));
    expect(r.totalRoles).toBe(26);
    expect(r.nativeOperationalMatches).toBe(26);
    expect(r.currentRevisionNativeMatches).toBe(0);
    expect(r.arithmeticScreenPassedUncertified).toBe(5);
    expect(r.arithmeticScreenFailed).toBe(4);
    expect(r.qualitativeSpecialistReviewsPending).toBe(17);
    expect(r.independentlyAcceptedRoles).toBe(0);
    expect(r.engineeringReleaseApproved).toBe(false);
    for (const item of r.findings) {
      expect(item.independentlyVerified).toBe(false);
      expect(item.finalAcceptance).toBe('PENDING_INDEPENDENT_REVIEW');
      expect(item.issues).toContain('Independently authenticated specialist reference and witness sign-off unavailable');
      expect(item.currentSourceExecuted).toBe(false);
    }
  });

  it('never treats tool execution and one matching code revision as independent naval accuracy', () => {
    const r = measure(oldCommit);
    expect(r.currentRevisionNativeMatches).toBe(26);
    expect(r.independentlyAcceptedRoles).toBe(0);
    expect(r.engineeringReleaseApproved).toBe(false);
  });

  it('fails role trace coverage on forged Gemini response IDs or false mandatory-tool flags', () => {
    const forged = native.results.map((x: any) => x.canonicalId === 'A06'
      ? { ...x, modelProviderResponseId: '', deterministicTools: [{ id:'TOOL-HYDROSTATICS-01', success:false }] }
      : x);
    const r = measure(oldCommit, forged);
    expect(r.nativeOperationalMatches).toBe(25);
    const role = r.findings.find(x => x.canonicalId === 'A06');
    expect(role?.nativeRunObserved).toBe(false);
    expect(role?.mandatoryToolsCorrect).toBe(false);
    expect(role?.independentlyVerified).toBe(false);
  });
});
