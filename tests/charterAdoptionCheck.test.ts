import { describe, expect, it } from 'vitest';
import {
  computeCharterDigest,
  evaluateCharterAdoptionReadiness
} from '../src/core/governance/charterAdoptionCheck.ts';

const COMMIT_SHA = '4b6bf3107abd50fec0074a98563979ca9dae9b42';

describe('M01 — Operating Charter v1.1 (A–E) verification and fail-closed adoption gate', () => {
  it('passes static criteria C01–C09 while refusing adoption without an authenticated decision record', () => {
    const audit = evaluateCharterAdoptionReadiness({ expectedCommitSha: COMMIT_SHA });
    expect(audit.registeredRoleCount).toBe(26);
    expect(audit.allStaticCriteriaPassed).toBe(true);
    expect(audit.charterMarkedProposed).toBe(true);
    expect(audit.adopted).toBe(false);
    expect(audit.disposition).toBe('PROPOSED_NOT_ADOPTED');
    expect(audit.vesselBaselineApproved).toBe(false);
    expect(audit.engineeringReleaseApproved).toBe(false);
  });

  it('rejects forged AI reviewer, self-review, wrong digest, or missing delegation reference', () => {
    const { charterSha256 } = computeCharterDigest();

    const aiReviewer = evaluateCharterAdoptionReadiness({
      expectedCommitSha: COMMIT_SHA,
      decisionRecord: {
        decisionId: 'DEC-001',
        charterVersion: '1.1',
        charterSha256,
        gitCommitSha: COMMIT_SHA,
        independentGovernanceReviewer: 'ChatGPT-5 Advisor',
        reviewerOrganization: 'OpenAI',
        authorizerRole: 'ENGINEERING_DIRECTOR',
        authorizerIdentity: 'Director Human',
        authenticatedSignatureReference: 'SIG-001',
        effectiveDateUtc: '2026-11-15T00:00:00Z',
        dissentResolved: true,
        disposition: 'ADOPTED_FOR_OPERATING_SPEC_ONLY'
      }
    });
    expect(aiReviewer.adopted).toBe(false);
    expect(aiReviewer.disposition).toBe('HOLD_INVALID_RECORD');

    const badDigest = evaluateCharterAdoptionReadiness({
      expectedCommitSha: COMMIT_SHA,
      decisionRecord: {
        decisionId: 'DEC-002',
        charterVersion: '1.1',
        charterSha256: 'sha256:' + 'f'.repeat(64),
        gitCommitSha: COMMIT_SHA,
        independentGovernanceReviewer: 'Independent Counsel',
        reviewerOrganization: 'Maritime Assurance Ltd',
        authorizerRole: 'DELEGATED_GOVERNANCE_AUTHORITY',
        authorizerIdentity: 'Lead Delegate',
        authenticatedSignatureReference: 'SIG-002',
        effectiveDateUtc: '2026-11-15T00:00:00Z',
        dissentResolved: true,
        disposition: 'ADOPTED_FOR_OPERATING_SPEC_ONLY'
      }
    });
    expect(badDigest.adopted).toBe(false);
    expect(badDigest.blockers.some(b => b.includes('SHA-256'))).toBe(true);
    expect(badDigest.blockers.some(b => b.includes('delegationReference'))).toBe(true);
  });

  it('accepts operating spec adoption ONLY when exact SHA/digest, distinct reviewer, and Director decision match without releasing vessel', () => {
    const { charterSha256 } = computeCharterDigest();
    const audit = evaluateCharterAdoptionReadiness({
      expectedCommitSha: COMMIT_SHA,
      decisionRecord: {
        decisionId: 'DEC-CHARTER-V11',
        charterVersion: '1.1',
        charterSha256,
        gitCommitSha: COMMIT_SHA,
        independentGovernanceReviewer: 'A. Marine Governance Auditor',
        reviewerOrganization: 'External Assurance Body',
        authorizerRole: 'ENGINEERING_DIRECTOR',
        authorizerIdentity: 'Chief Engineering Director',
        authenticatedSignatureReference: 'ED25519-DIRECTOR-REF-001',
        effectiveDateUtc: '2026-11-15T01:00:00Z',
        dissentResolved: true,
        disposition: 'ADOPTED_FOR_OPERATING_SPEC_ONLY'
      }
    });
    expect(audit.adopted).toBe(true);
    expect(audit.disposition).toBe('ADOPTED_OPERATING_SPEC_ONLY');
    expect(audit.vesselBaselineApproved).toBe(false);
    expect(audit.engineeringReleaseApproved).toBe(false);
  });
});
