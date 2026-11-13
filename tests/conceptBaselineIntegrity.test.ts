import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('Fail-closed separation of synthetic concept scenarios from the approved baseline', () => {
  it('does not allow optimizer UI actions to write unverified values to SharedMemory', () => {
    const source = fs.readFileSync('src/components/GenerativeOptimizerView.tsx', 'utf8');
    expect(source).not.toContain('sm.updateParameter(');
    expect(source).not.toContain("import { SharedMemory }");
    expect(source).toContain('UNVERIFIED CONCEPT EXPLORATION');
    expect(source).toContain('controlled engineering baseline and simulator remain unchanged');
  });

  it('does not claim certification, real 26-agent voting or IMO compliance in the exported dossier', () => {
    const source = fs.readFileSync('src/core/optimizer/GenerativeDesignOptimizer.ts', 'utf8');
    expect(source).toContain('**UNVERIFIED EXPLORATORY CANDIDATE:**');
    expect(source).toContain('Synthetic Heuristic Voting Matrix');
    expect(source).not.toContain('**Certified Candidate:**');
    expect(source).not.toContain('ISO 12215 / IMO MSC.267 compliant.');
    expect(source).toContain('NOT certified, NOT independently verified');
  });

  it('keeps a genuine human decision and engineering release external to the discovery screen', async () => {
    const { assessConceptDiscovery } = await import('../src/core/verification/ConceptDiscoveryGate.ts');
    const status = assessConceptDiscovery({ sourceCommit: '', missionRequirements: [], agentRuns: [], concepts: [] });
    expect(status.projectLeadDecisionVerified).toBe(false);
    expect(status.detailedDesignAuthorized).toBe(false);
    expect(status.engineeringReleaseAuthorized).toBe(false);
  });
});
