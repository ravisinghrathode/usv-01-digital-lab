import { describe, expect, it } from 'vitest';
import { getLabReadinessSnapshot } from '../src/core/verification/LabReadiness.ts';

describe('Evidence-limited laboratory readiness', () => {
  it('reports canonical agents without implying verified engineering or deployment', () => {
    const report = getLabReadinessSnapshot();
    expect(report.registeredAgents).toBe(26);
    expect(report.structuralRegistryValid).toBe(true);
    expect(report.agents).toHaveLength(26);
    expect(report.agents.every(a => !a.independentlyValidated && !a.operationalDeploymentVerified)).toBe(true);
    expect(report.agents.every(a => a.state !== 'BLOCKED_MISSING_TOOL' || a.missingTools.length > 0)).toBe(true);
    expect(report.engineeringPhysicsValidated).toBe(false);
    expect(report.productionApproved).toBe(false);
  });
  it('does not claim a Google AI Studio, Drive, Obsidian, or GitHub sync handshake', () => {
    const report = getLabReadinessSnapshot();
    expect(report.integrations).toHaveLength(4);
    expect(report.integrations.every(x => x.status === 'UNVERIFIED')).toBe(true);
  });
});
