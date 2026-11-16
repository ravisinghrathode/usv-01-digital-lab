import { generateKeyPairSync, sign } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeCharterDigest,
  canonicalCharterAdoptionPayload,
  evaluateCharterAdoptionReadiness,
  type CharterAdoptionDecisionRecord
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

  it('validates a synthetic signed adoption record only under a pinned independent trust root', () => {
    // Create a scratch *synthetic* approved charter. Source document stays proposed.
    // A valid signature alone must not override the canonical status.
    const current = computeCharterDigest();
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'usv-charter-adoption-'));
    const governanceDir = path.join(rootDir, 'docs', 'governance');
    fs.mkdirSync(governanceDir, { recursive: true });
    const adoptedText = current.charterText.replace(
      'Status:** PROPOSED — NOT ADOPTED; engineering release remains on HOLD',
      'Status:** ADOPTED FOR OPERATING SPEC ONLY; engineering release remains on HOLD'
    );
    expect(adoptedText).not.toBe(current.charterText);
    fs.writeFileSync(path.join(governanceDir, 'USV01_26_AGENT_OPERATING_CHARTER_V1.md'), adoptedText);
    fs.writeFileSync(path.join(governanceDir, 'USV01_OPERATING_CHARTER_V11_AI_SELF_CRITIQUE.md'), current.selfCritiqueText);
    const { charterSha256 } = computeCharterDigest(rootDir);
    // Ephemeral test keys show cryptographic wiring, never a real Director approval.
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const trustAnchor = publicKey.export({ format: 'pem', type: 'spki' }).toString();
    const record: CharterAdoptionDecisionRecord = {
      decisionId: 'SYNTHETIC-TEST-DECISION',
      charterVersion: '1.1',
      charterSha256,
      gitCommitSha: COMMIT_SHA,
      independentGovernanceReviewer: 'A. Marine Governance Auditor',
      reviewerOrganization: 'External Assurance Body',
      authorizerRole: 'ENGINEERING_DIRECTOR',
      authorizerIdentity: 'Synthetic Test Approver',
      authenticatedSignatureReference: 'NON_OPERATIONAL_SYNTHETIC_REFERENCE',
      effectiveDateUtc: '2026-11-15T01:00:00Z',
      dissentResolved: true,
      disposition: 'ADOPTED_FOR_OPERATING_SPEC_ONLY'
    };
    record.signatureBase64 = sign(
      null, Buffer.from(canonicalCharterAdoptionPayload(record), 'utf8'), privateKey
    ).toString('base64');

    const audit = evaluateCharterAdoptionReadiness({
      rootDir,
      expectedCommitSha: COMMIT_SHA,
      decisionRecord: record,
      trustedDirectorPublicKeyPem: trustAnchor
    });
    expect(audit.adopted).toBe(true);
    expect(audit.disposition).toBe('ADOPTED_OPERATING_SPEC_ONLY');
    expect(audit.vesselBaselineApproved).toBe(false);
    expect(audit.engineeringReleaseApproved).toBe(false);

    // Reference strings or self-generated keys are not authorization.
    const missingTrust = evaluateCharterAdoptionReadiness({
      rootDir,
      expectedCommitSha: COMMIT_SHA, decisionRecord: record
    });
    expect(missingTrust.adopted).toBe(false);
    expect(missingTrust.blockers.some(b => b.includes('trusted Director'))).toBe(true);

    const unsigned = evaluateCharterAdoptionReadiness({
      rootDir,
      expectedCommitSha: COMMIT_SHA,
      decisionRecord: { ...record, signatureBase64: undefined },
      trustedDirectorPublicKeyPem: trustAnchor
    });
    expect(unsigned.adopted).toBe(false);
    expect(unsigned.blockers.some(b => b.includes('reference alone'))).toBe(true);

    const tampered = evaluateCharterAdoptionReadiness({
      rootDir,
      expectedCommitSha: COMMIT_SHA,
      decisionRecord: { ...record, authorizerIdentity: 'Altered Approver' },
      trustedDirectorPublicKeyPem: trustAnchor
    });
    expect(tampered.adopted).toBe(false);
    expect(tampered.blockers.some(b => b.includes('signature invalid'))).toBe(true);

    const attackerKey = generateKeyPairSync('ed25519').publicKey;
    const untrusted = evaluateCharterAdoptionReadiness({
      rootDir,
      expectedCommitSha: COMMIT_SHA,
      decisionRecord: record,
      trustedDirectorPublicKeyPem: attackerKey.export({ format: 'pem', type: 'spki' }).toString()
    });
    expect(untrusted.adopted).toBe(false);
    expect(untrusted.blockers.some(b => b.includes('signature invalid'))).toBe(true);

    // Even a correctly signed decision must not adopt the still-PROPOSED main charter.
    const proposedRecord: CharterAdoptionDecisionRecord = {
      ...record, charterSha256: current.charterSha256
    };
    proposedRecord.signatureBase64 = sign(
      null, Buffer.from(canonicalCharterAdoptionPayload(proposedRecord), 'utf8'), privateKey
    ).toString('base64');
    const stillProposed = evaluateCharterAdoptionReadiness({
      expectedCommitSha: COMMIT_SHA, decisionRecord: proposedRecord,
      trustedDirectorPublicKeyPem: trustAnchor
    });
    expect(stillProposed.adopted).toBe(false);
    expect(stillProposed.blockers.some(b => b.includes('Canonical charter status'))).toBe(true);
    fs.rmSync(rootDir, { recursive: true, force: true });
  });
});
