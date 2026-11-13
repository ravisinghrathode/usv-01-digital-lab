import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  auditHydroEvidence,
  compareHydroReference,
  HYDRO_CASE_EVIDENCE,
  HYDRO_GLOBAL_EVIDENCE,
  type HydroEvidenceManifest
} from './HydroEvidenceAudit.ts';

const SHA = 'a'.repeat(40);
const DIGEST = 'sha256:' + 'b'.repeat(64);
function manifest(): HydroEvidenceManifest {
  return {
    vesselConfigurationId: 'ANALYTIC-TEST-HULL',
    geometryRevision: 'TEST-NOT-ACTUAL-USV-01',
    designBasisId: 'TEST-BASIS',
    baselineSha: SHA,
    requiredLoadCaseIds: ['LIGHTSHIP', 'MAX_PAYLOAD'],
    evidence: []
  };
}
const evidence = (kind: typeof HYDRO_GLOBAL_EVIDENCE[number] | typeof HYDRO_CASE_EVIDENCE[number],
                  loadCaseId?: string) => ({
  kind,
  ...(loadCaseId ? { loadCaseId } : {}),
  geometryRevision: 'TEST-NOT-ACTUAL-USV-01',
  baselineSha: SHA,
  sourceUri: 'https://example.test/geometry',
  sourceSha256: DIGEST,
  sourceToolAndVersion: 'synthetic-test-tool-v1',
  attributedReviewer: 'TEST-NOT-A-REAL-APPROVAL',
  capturedAtUtc: '2026-11-13T00:00:00Z'
});

describe('HYD-01 geometry and physical evidence acceptance ledger', () => {
  it('keeps the actual repository manifest blocked rather than inventing evidence', () => {
    const data = JSON.parse(fs.readFileSync(
      path.resolve('evidence/hyd01/acceptance-manifest.json'), 'utf8'
    ));
    expect(data.requirementId).toBe('HYD-01');
    const r = auditHydroEvidence(data);
    expect(r.status).toBe('BLOCKED_MISSING_EVIDENCE');
    expect(r.missing).toContain('VESSEL_CONFIGURATION_SELECTION');
    expect(r.missing).toContain('APPROVED_UNIQUE_LOAD_CASE_MATRIX');
    expect(r.missing).toContain('APPROVED_HULL_GEOMETRY');
    expect(r.engineeringReleaseAccepted).toBe(false);
  });

  it('rejects incomplete source/input evidence and missing per-case references', () => {
    const m = manifest();
    m.evidence.push(evidence('APPROVED_HULL_GEOMETRY'));
    const r = auditHydroEvidence(m);
    expect(r.missing).toContain('INDEPENDENT_NAVAL_REVIEW');
    expect(r.missing).toContain('HYDROSTATIC_TABLE:LIGHTSHIP');
    expect(r.missing).toContain('HYDROSTATIC_TABLE:MAX_PAYLOAD');
    expect(r.structurallyComplete).toBe(false);
  });

  it('rejects substituted-baseline and unverifiable digests', () => {
    const m = manifest();
    m.evidence.push({ ...evidence('APPROVED_HULL_GEOMETRY'), baselineSha: 'c'.repeat(40) });
    m.evidence.push({ ...evidence('APPROVED_HULL_GEOMETRY'), sourceSha256: 'sha256:fake' });
    const r = auditHydroEvidence(m);
    expect(r.rejected).toHaveLength(2);
    expect(r.engineeringReleaseAccepted).toBe(false);
  });

  it('even with all apparently complete entries refuses self-attested approval', () => {
    const m = manifest();
    m.evidence.push(...HYDRO_GLOBAL_EVIDENCE.map(k => evidence(k)));
    for (const caseId of m.requiredLoadCaseIds) {
      m.evidence.push(...HYDRO_CASE_EVIDENCE.map(k => evidence(k, caseId)));
    }
    const r = auditHydroEvidence(m);
    expect(r.structurallyComplete).toBe(true);
    expect(r.status).toBe('SUBMITTED_REQUIRES_INDEPENDENT_VERIFICATION');
    expect(r.physicalEvidenceAuthenticated).toBe(false);
    expect(r.independentlyVerified).toBe(false);
    expect(r.engineeringReleaseAccepted).toBe(false);
  });

  it('requires distinct sources and explicitly agreed numerical tolerances', () => {
    expect(() => compareHydroReference('same','same',[
      {metric:'draft',computed:0.2,independentReference:0.2,approvedAbsoluteTolerance:0.01}
    ])).toThrow(/Distinct/);
    expect(() => compareHydroReference('solver-a','solver-b',[
      {metric:'draft',computed:0.2,independentReference:0.2,approvedAbsoluteTolerance:NaN}
    ])).toThrow(/finite/);
    const pass = compareHydroReference('solver-a','solver-b',[
      {metric:'draft',computed:0.2,independentReference:0.201,approvedAbsoluteTolerance:0.002}
    ]);
    expect(pass.passed).toBe(true);
    expect(pass.engineeringReleaseAccepted).toBe(false);
    expect(pass.independentSourceAuthenticated).toBe(false);
    const fail = compareHydroReference('solver-a','solver-b',[
      {metric:'draft',computed:0.2,independentReference:0.208,approvedAbsoluteTolerance:0.002}
    ]);
    expect(fail.passed).toBe(false);
  });

  it('rejects missing load cases and duplicates rather than silently declaring full coverage', () => {
    const m = manifest();
    m.requiredLoadCaseIds = [];
    expect(auditHydroEvidence(m).missing).toContain('APPROVED_UNIQUE_LOAD_CASE_MATRIX');
    m.requiredLoadCaseIds = ['A', 'A'];
    expect(auditHydroEvidence(m).missing).toContain('APPROVED_UNIQUE_LOAD_CASE_MATRIX');
  });
});
