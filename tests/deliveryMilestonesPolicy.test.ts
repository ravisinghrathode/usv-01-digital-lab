import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Milestone {
  id: string;
  title: string;
  status: 'BLOCKED' | 'PLANNED' | 'ACTIVE' | 'VERIFIED';
  dependencies: string[];
  issueUrl: string;
  accountable: string;
  acceptanceCriterion: string;
  acceptanceEvidenceUri: string | null;
  independentReviewAccepted: boolean;
  authorizedPromotion: boolean;
}

const register = JSON.parse(readFileSync('config/delivery-milestones.json', 'utf8')) as {
  schema: string;
  auditedMainSha: string;
  canonicalProjectRegister: string;
  evidencePolicy: string;
  authorizationSnapshot: Record<string, boolean>;
  milestones: Milestone[];
};

describe('Delivery roadmap cannot self-certify engineering or skip recovery gates', () => {
  it('is source-pinned and subordinate to the canonical Master Project Register', () => {
    expect(register.schema).toBe('usv01-delivery-milestones/v1');
    expect(register.auditedMainSha).toMatch(/^[a-f0-9]{40}$/);
    expect(register.canonicalProjectRegister).toBe('docs/MASTER_PROJECT_REGISTER.md');
    expect(register.evidencePolicy).toBe('TRACKING_ONLY_NO_AUTOMATIC_ENGINEERING_AUTHORITY');
    expect(readFileSync(register.canonicalProjectRegister, 'utf8')).toContain('Master Project Register');
  });

  it('tracks nine unique GitHub issues with owned, verifiable exit criteria', () => {
    expect(register.milestones.map(m => m.id)).toEqual(
      Array.from({ length: 9 }, (_, i) => 'M' + String(i).padStart(2, '0'))
    );
    expect(new Set(register.milestones.map(m => m.id)).size).toBe(9);
    for (const m of register.milestones) {
      expect(m.issueUrl).toMatch(/^https:\/\/github\.com\/ravisinghrathode\/usv-01-digital-lab\/issues\/\d+$/);
      expect(m.accountable.trim().length).toBeGreaterThan(8);
      expect(m.acceptanceCriterion.trim().length).toBeGreaterThan(30);
      expect(['BLOCKED', 'PLANNED', 'ACTIVE', 'VERIFIED']).toContain(m.status);
      // A status label alone never constitutes a source-bound, independently reviewed promotion.
      if (m.status === 'VERIFIED') {
        expect(m.acceptanceEvidenceUri).toMatch(/^https:\/\//);
        expect(m.independentReviewAccepted).toBe(true);
        expect(m.authorizedPromotion).toBe(true);
      }
    }
  });

  it('maintains an acyclic delivery dependency graph, including true charter/host prerequisites', () => {
    const nodes = new Map(register.milestones.map(m => [m.id, m]));
    const visited = new Set<string>();
    const active = new Set<string>();
    const walk = (id: string) => {
      expect(nodes.has(id)).toBe(true);
      if (visited.has(id)) return;
      expect(active.has(id), 'Milestone cycle at ' + id).toBe(false);
      active.add(id);
      for (const dep of nodes.get(id)!.dependencies) {
        expect(dep).not.toBe(id);
        walk(dep);
      }
      active.delete(id);
      visited.add(id);
    };
    for (const id of nodes.keys()) walk(id);
    expect(nodes.get('M03')!.dependencies).toContain('M01');
    expect(nodes.get('M03')!.dependencies).toContain('M02');
    expect(nodes.get('M04')!.dependencies).toContain('M03');
    expect(nodes.get('M08')!.dependencies).toContain('M07');
  });

  it('does not reinterpret a merged PR or a synthetic model campaign as acceptance', () => {
    const a = register.authorizationSnapshot;
    for (const field of [
      'charterV11Adopted', 'recoveryA04Verified', 'recoveryA05Verified',
      'liveA06CurrentShaVerified', 'aiStudioDeployedShaVerified',
      'independentEngineeringQualified', 'vesselBaselineApproved',
      'engineeringReleaseApproved', 'paidServiceAuthorization',
      'physicalActuationAuthorization'
    ]) expect(a[field]).toBe(false);

    const byId = new Map(register.milestones.map(m => [m.id, m]));
    if (!a.charterV11Adopted) expect(byId.get('M01')?.status).not.toBe('VERIFIED');
    if (!a.recoveryA04Verified) {
      expect(byId.get('M02')?.status).not.toBe('VERIFIED');
      expect(a.recoveryA05Verified).toBe(false);
    }
    if (!a.aiStudioDeployedShaVerified) expect(byId.get('M00')?.status).not.toBe('VERIFIED');
    for (const m of register.milestones) {
      expect(m.authorizedPromotion).toBe(false);
      expect(m.independentReviewAccepted).toBe(false);
    }
  });
});
