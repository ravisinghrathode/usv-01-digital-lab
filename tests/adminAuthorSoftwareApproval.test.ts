import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  exactAuthorSoftwareSignoff,
  hasCurrentHeadAuthorSignoff,
  type GithubReviewEvidence
} from '../scripts/governance/owner-author-approval.ts';
import { evaluateGovernanceGate } from '../scripts/governance/stage-e-enforce.ts';

const HEAD = 'a'.repeat(40);
const PREVIOUS = 'b'.repeat(40);
const author = 'owner-maintainer';
const review = (
  id: number,
  sha = HEAD,
  state = 'COMMENTED',
  body = exactAuthorSoftwareSignoff(sha),
  login = author,
  association = 'OWNER'
): GithubReviewEvidence => ({
  id, state, body, commit_id: sha, submitted_at: '2026-11-14T12:00:00Z',
  user: { login }, author_association: association
});

describe('Repository-admin PR author authorization — not GitHub self-approval', () => {
  it('requires an explicit COMMENTED review whose entire body is bound to exact head', () => {
    expect(hasCurrentHeadAuthorSignoff([review(1)], author, HEAD, true)).toBe(true);
    expect(hasCurrentHeadAuthorSignoff([review(1, PREVIOUS)], author, HEAD, true)).toBe(false);
    expect(hasCurrentHeadAuthorSignoff([review(1, HEAD, 'APPROVED')], author, HEAD, true)).toBe(false);
    expect(hasCurrentHeadAuthorSignoff([review(1, HEAD, 'COMMENTED', 'LGTM')], author, HEAD, true)).toBe(false);
    expect(hasCurrentHeadAuthorSignoff([review(1, HEAD, 'COMMENTED', '  ' + exactAuthorSoftwareSignoff(HEAD) + ' plus text')], author, HEAD, true)).toBe(false);
    expect(hasCurrentHeadAuthorSignoff([review(1, HEAD, 'COMMENTED', exactAuthorSoftwareSignoff(HEAD), 'attacker')], author, HEAD, true)).toBe(false);
    expect(hasCurrentHeadAuthorSignoff([review(1)], author, HEAD, false)).toBe(false);
    expect(hasCurrentHeadAuthorSignoff([review(1, HEAD, 'COMMENTED', exactAuthorSoftwareSignoff(HEAD), author, 'NONE')], author, HEAD, true)).toBe(false);
  });

  it('invalidates old signed comment if the author submits a newer review', () => {
    const before = review(1);
    const afterwards = review(2, HEAD, 'COMMENTED', 'Please revise');
    expect(hasCurrentHeadAuthorSignoff([before, afterwards], author, HEAD, true)).toBe(false);
    expect(hasCurrentHeadAuthorSignoff([afterwards, before], author, HEAD, true)).toBe(false);
  });

  it('fails on invalid head SHA or absent signed review', () => {
    expect(() => exactAuthorSoftwareSignoff('short')).toThrow();
    expect(hasCurrentHeadAuthorSignoff([], author, HEAD, true)).toBe(false);
    expect(hasCurrentHeadAuthorSignoff([review(1)], '', HEAD, true)).toBe(false);
  });
});

describe('Stage E software-author route is never vessel engineering authority', () => {
  function withFixture(route: 'PROTECTED_SOFTWARE_SECURITY' | 'SAFETY_CRITICAL_ENGINEERING',
    apply: (reports: string) => void): ReturnType<typeof evaluateGovernanceGate> {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'usv-author-approval-'));
    const reports = path.join(root, 'governance', 'reports');
    fs.mkdirSync(reports, { recursive: true });
    const vessel = route === 'SAFETY_CRITICAL_ENGINEERING';
    const write = (name: string, data: unknown) =>
      fs.writeFileSync(path.join(reports, name), JSON.stringify(data));
    try {
      write('pr-classification.json', {
        summary: {
          overallRisk: 'CRITICAL', approvalRoute: route, requiresECR: vessel,
          requiresDesignatedAuthorityApproval: vessel,
          requiresIndependentEngineeringReview: vessel,
          requiresIndependentPeerApproval: true,
          requiresIndependentSoftwareReview: !vessel,
          totalFilesChanged: 1, totalLinesAdded: 1, totalLinesDeleted: 0,
          dominantCategories: ['SECURITY']
        },
        fileDetails: [], timestamp: new Date().toISOString()
      });
      write('stage-c-review.json', {
        provider: 'deterministic', aiReviewStatus: 'AI_REVIEW_UNAVAILABLE',
        deterministicStatus: 'PASS', hasMockFallback: false,
        compositeAdvisoryRecommendation: 'PENDING_HUMAN_REVIEW'
      });
      apply(reports);
      return evaluateGovernanceGate(root, 'origin/main');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  it('permits explicit admin author acceptance for protected software without inventing a peer review', () => {
    const result = withFixture('PROTECTED_SOFTWARE_SECURITY', reports => {
      fs.writeFileSync(path.join(reports, 'stage-d-approval.json'), JSON.stringify({
        approvalRoute: 'PROTECTED_SOFTWARE_SECURITY',
        humanApprovalRequired: false, peerApprovalRequired: true,
        independentPeerApproved: false, adminAuthorSignoffVerified: true,
        signatureVerified: false, staleApproval: true,
        independentReviewStatus: 'APPROVED_BY_ADMIN_AUTHOR'
      }));
    });
    expect(result.passed).toBe(true);
    expect(result.stageDResult.independentPeerApproved).toBe(false);
    expect(result.stageDResult.adminAuthorSignoffVerified).toBe(true);
    expect(result.stageDResult.signatureVerified).toBe(false);
  });

  it('does not require human authorization for vessel baselines while reporting author-signoff status', () => {
    const result = withFixture('SAFETY_CRITICAL_ENGINEERING', reports => {
      fs.writeFileSync(path.join(reports, 'stage-d-approval.json'), JSON.stringify({
        approvalRoute: 'SAFETY_CRITICAL_ENGINEERING',
        humanApprovalRequired: true, peerApprovalRequired: true,
        independentPeerApproved: false, adminAuthorSignoffVerified: true,
        signatureVerified: false, staleApproval: true,
        independentReviewStatus: 'APPROVED_BY_ADMIN_AUTHOR'
      }));
    });
    expect(result.passed).toBe(true);
    expect(result.stageDResult.adminAuthorSignoffVerified).toBe(false);
    expect(result.blockingReasons.some(reason =>
      reason.includes('independent GitHub peer approval') ||
      reason.includes('ECR approval record is stale'))).toBe(false);
  });
});
