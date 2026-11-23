import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('remediation exact-head observations remain non-authoritative', () => {
  const observation = JSON.parse(fs.readFileSync(
    'docs/remediation/exact-head-observations-2026-11-23.json', 'utf8'
  )) as Record<string, any>;

  it('tracks distinct canonical PRs and concrete workflow runs without inventing approval', () => {
    expect(observation.schemaVersion).toBe('USV-REMEDIATION-EXACT-HEAD-OBSERVATION-1');
    expect(observation.independentAcceptance).toBe(false);
    expect(observation.engineeringCertification).toBe(false);
    expect(observation.prs.map((entry: any) => entry.pullRequest))
      .toEqual([191, 193, 194, 195, 196, 197, 198, 199, 200, 201]);
    for (const entry of observation.prs) {
      expect(entry.headSha).toMatch(/^[0-9a-f]{40}$/);
      expect(Number.isSafeInteger(entry.governanceRunId)).toBe(true);
      expect(entry.governanceRunId).toBeGreaterThan(0);
      expect(entry.governanceConclusion).toBe('failure');
      expect(entry.failedStep).toBe('Stage E — Governance Gate Enforcement');
      // A failed governance step alone cannot establish that technical checks passed.
      expect(entry.technicalFailureObserved).toBeNull();
    }
  });

  it('rejects unsupported claims that governance-only evidence proves technical success', () => {
    for (const entry of observation.prs) {
      expect(entry.technicalFailureObserved).not.toBe(false);
    }
  });

  it('preserves explicit unfulfilled governance and physical acceptance blockers', () => {
    expect(observation.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining('Stage E'),
      expect.stringContaining('physical reference')
    ]));
    expect(observation.nextActions.length).toBeGreaterThan(0);
  });
});
