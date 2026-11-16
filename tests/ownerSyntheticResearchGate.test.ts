import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assessOwnerSyntheticResearch, deriveOwnerSyntheticGeminiAutoRoute,
  OWNER_RESEARCH_CONFIRMATION,
  OWNER_SYNTHETIC_CATALOG
} from '../src/core/mission-control/OwnerSyntheticResearchGate.ts';

const sha = 'a'.repeat(40);
const hostId = 'usv01-private-test-mac';
const nowMs = Date.parse('2026-11-17T01:00:00.000Z');
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const synthetic = Buffer.from(
  '{"dataClassification":"SYNTHETIC_TEST_ONLY_NON_OPERATIONAL"}\n');
const receipt = () => Buffer.from(JSON.stringify({
  schemaVersion: 'USV-A04-HOST-PREFLIGHT-1.0',
  observedAtUtc: '2026-11-17T00:30:00.000Z',
  type: 'NON_SECRET_LOCAL_OBSERVATION_UNATTESTED',
  sourceSha: sha, expectedSourceSha: sha,
  stableHostAliasSha256: hash(hostId),
  decision: {
    status: 'PASS_UNATTESTED', blockerCodes: [],
    authenticatedModelExecution: false,
    independentlyAttested: false, a04Complete: false,
    a05Authorized: false,
    vesselEngineeringReleaseAuthorized: false
  },
  checks: {
    repositoryIdentityVerified: true, trackedWorktreeClean: true,
    checkoutOwnerMatchesOperator: true, codexCliPresent: true,
    chatgptSubscriptionAuthenticated: true, researchPolicyPermitted: true,
    privateTempStorageVerified: true, stableHostAliasConfigured: true
  },
  sandboxReview: {
    localSandboxAndNetworkRestrictionsIndependentlyReviewed: false
  }
}) + '\n');

const accepted = () => ({
  sourceSha: sha, actualSha: sha, originMainSha: sha,
  approvedRemote: true,
  trackedWorktreeClean: true,
  locallyOwnedCheckout: true,
  interactiveTerminal: true,
  isolatedPrivateHost: true,
  hostId, receiptBytes: receipt(), catalogBytes: synthetic, nowMs,
  env: {} as NodeJS.ProcessEnv
});

describe('Single-operator synthetic research is NOT independent A04 authorization', () => {
  it('recognizes only explicit synthetic interactive owner intent and keeps all release flags false', () => {
    expect(OWNER_RESEARCH_CONFIRMATION).toBe('RUN 26 SYNTHETIC AGENTS');
    expect(OWNER_SYNTHETIC_CATALOG)
      .toBe('evidence/live-agents/representative-cases.json');
    expect(assessOwnerSyntheticResearch(accepted())).toMatchObject({
      allowed: true, authorization: 'OWNER_INTERACTIVE_SYNTHETIC_RESEARCH_ONLY',
      independentA04Approved: false,
      independentEngineeringValidated: false,
      engineeringReleaseApproved: false, actuatorControlAuthorized: false,
      sourceSha: sha
    });
  });
  it('rejects any stale or altered source and revoked local host characteristics', () => {
    for (const change of [
      { actualSha: 'b'.repeat(40) }, { originMainSha: 'b'.repeat(40) },
      { approvedRemote: false }, { trackedWorktreeClean: false },
      { locallyOwnedCheckout: false }, { interactiveTerminal: false },
      { isolatedPrivateHost: false }, { hostId: 'different-host' }
    ]) {
      expect(assessOwnerSyntheticResearch({ ...accepted(), ...change }).allowed)
        .toBe(false);
    }
  });
  it('rejects non-synthetic, expired, falsely completed or malformed A04 evidence', () => {
    expect(assessOwnerSyntheticResearch({
      ...accepted(),
      catalogBytes: Buffer.from('{"dataClassification":"RESTRICTED"}')
    }).allowed).toBe(false);
    expect(assessOwnerSyntheticResearch({
      ...accepted(), nowMs: nowMs + 25 * 60 * 60 * 1000
    }).allowed).toBe(false);
    const altered = JSON.parse(receipt().toString('utf8'));
    altered.decision.a04Complete = true;
    expect(assessOwnerSyntheticResearch({
      ...accepted(), receiptBytes: Buffer.from(JSON.stringify(altered))
    }).allowed).toBe(false);
    altered.decision.a04Complete = false;
    altered.checks.privateTempStorageVerified = false;
    expect(assessOwnerSyntheticResearch({
      ...accepted(), receiptBytes: Buffer.from(JSON.stringify(altered))
    }).allowed).toBe(false);
    expect(assessOwnerSyntheticResearch({
      ...accepted(), receiptBytes: Buffer.from('{not-json')
    }).allowed).toBe(false);
  });
  it('denies CI, paid API, hardware control, release claims and Gemini transfers', () => {
    for (const flags of [
      { CI: 'true' }, { GITHUB_ACTIONS: 'true' }, { GITHUB_RUN_ID: '1' },
      { USV_ALLOW_PAID_AI_API: 'true' },
      { USV_ENABLE_ACTUATOR_CONTROL: 'true' },
      { USV_ALLOW_ACTUATOR_CONTROL: 'true' },
      { USV_ENGINEERING_RELEASE_AUTHORIZED: 'true' },
      { USV_VESSEL_BASELINE_APPROVED: 'true' },
      { USV_GEMINI_FALLBACK_APPROVED: 'true' },
      { USV_GEMINI_OAUTH_REVIEWED: 'true' },
      { USV_GEMINI_DATA_CLASSIFICATION: 'PUBLIC_NON_SENSITIVE' },
      { USV_GEMINI_AUTO_SYNTHETIC_ROUTE: 'SOURCE_PINNED_OWNER_RESEARCH' },
      { USV_GEMINI_SYNTHETIC_CATALOG_SHA256: 'a'.repeat(64) },
      { USV_GEMINI_AUTH_METHOD: 'oauth-personal' }
    ]) {
      const result = assessOwnerSyntheticResearch({
        ...accepted(), env: flags
      });
      expect(result.allowed, JSON.stringify(flags)).toBe(false);
    }
  });
  it('derives an automatic Gemini OAuth-only source/collateral grant, never a user-supplied provider choice', () => {
    const decision = assessOwnerSyntheticResearch(accepted());
    const flags = deriveOwnerSyntheticGeminiAutoRoute(decision, synthetic);
    expect(flags).toMatchObject({
      USV_GEMINI_AUTO_SYNTHETIC_ROUTE: 'SOURCE_PINNED_OWNER_RESEARCH',
      USV_GEMINI_SYNTHETIC_CATALOG_SHA256: hash(synthetic.toString('utf8')),
      USV_GEMINI_DATA_CLASSIFICATION: 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL',
      USV_GEMINI_AUTH_METHOD: 'oauth-personal'
    });
    const denied = assessOwnerSyntheticResearch({
      ...accepted(), env: { USV_ENABLE_ACTUATOR_CONTROL: 'true' }
    });
    expect(() => deriveOwnerSyntheticGeminiAutoRoute(denied, synthetic)).toThrow();
    expect(() => deriveOwnerSyntheticGeminiAutoRoute(decision,
      Buffer.from('{"dataClassification":"RESTRICTED_NAVAL"}'))).toThrow();
    expect(() => deriveOwnerSyntheticGeminiAutoRoute({
      ...decision, catalogDigestSha256: 'f'.repeat(64)
    }, synthetic)).toThrow();

    // The owner authorizes the campaign once; the provider must be selected
    // by code, never by a second interactive Gemini-choice phrase.
    const launcher = fs.readFileSync(
      'scripts/mission-control/owner-synthetic-commission.ts', 'utf8');
    expect(launcher).toContain('deriveOwnerSyntheticGeminiAutoRoute');
    expect(launcher).not.toContain('AUTHORIZE GEMINI SYNTHETIC TRANSFER');
    expect(launcher).not.toContain('Otherwise press Enter for Codex-only');
  });

});
