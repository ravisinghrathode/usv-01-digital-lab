import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { classifyFile } from '../scripts/governance/classify-change.ts';
import { scanContentForSecrets } from '../scripts/governance/secret-scanner.ts';
import { validateRepositoryConfiguration } from '../scripts/governance/validate-config.ts';
import { validateECRFile } from '../scripts/governance/ecr-tool.ts';
import { APPROVAL_SCHEMA, computeBaselineDigest, publicKeyFingerprint, signApproval, verifyApproval } from '../scripts/governance/ecr-approval.ts';
import { hashCredential, saveCredential, resetLockouts } from '../src/core/auth/credentialStore.ts';
import crypto from 'crypto';
import os from 'os';
import { CryptographicAuditTrail } from '../src/core/safety/CryptographicAuditTrail.ts';
import { AgentGovernanceBridge } from '../src/core/governance/AgentGovernanceBridge.ts';
import { generateReleaseManifest } from '../scripts/governance/release-manifest.ts';
import { evaluateStageDHumanApproval } from '../scripts/governance/stage-d-human-approval.ts';
import { authenticateLoginRequest, AUTHORIZED_MEMBERS } from '../server.ts';
import { ModelProviderRouter } from '../src/core/models/ModelProvider.ts';
import { generateMultiRoleReview } from '../scripts/governance/independent-ai-review.ts';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

describe('STAGE G: Engineering Governance System (EGS) Verification', () => {

  describe('1. Change & Risk Classification Engine (Stage A)', () => {
    it('should classify safety and security paths as CRITICAL risk', () => {
      const safetyCheck = classifyFile('src/core/safety/HumanApprovalGate.ts');
      expect(safetyCheck.categories).toContain('SAFETY');
      expect(safetyCheck.risk).toBe('CRITICAL');

      const authCheck = classifyFile('src/core/auth/authClient.ts');
      expect(authCheck.categories).toContain('SECURITY');
      expect(authCheck.risk).toBe('CRITICAL');

      const workflowCheck = classifyFile('.github/workflows/safety-governance-gate.yml');
      expect(workflowCheck.categories).toContain('CONFIGURATION');
      expect(workflowCheck.risk).toBe('CRITICAL');
    });

    it('should classify core architecture as HIGH risk and documentation as LOW risk', () => {
      const archCheck = classifyFile('src/core/orchestrator/CentralOrchestrator.ts');
      expect(archCheck.categories).toContain('ARCHITECTURE');
      expect(archCheck.risk).toBe('HIGH');

      const docCheck = classifyFile('docs/ARCHITECTURE.md');
      expect(docCheck.categories).toContain('DOCUMENTATION');
      expect(docCheck.risk).toBe('LOW');
    });
  });

  describe('2. DevSecOps Secret Scanner & Data Protection (Stage B)', () => {
    it('should detect exposed private keys and API keys', () => {
      // Assemble synthetic strings dynamically at runtime so the test file itself does not match secret scanning regexes
      const fakeKeyHeader = '-----' + 'BEGIN ' + 'RSA ' + 'PRIVATE ' + 'KEY-----';
      const fakeOpenAi = 'sk' + '-proj-' + '1234567890abcdef1234567890abcdef';
      const badContent = `
        const key = "${fakeKeyHeader}\\nMIIEowIBAAKCAQEA...";
        const openai = "${fakeOpenAi}";
      `;
      const findings = scanContentForSecrets(badContent, 'fake_secret.ts');
      expect(findings.length).toBeGreaterThanOrEqual(2);
      expect(findings.some(f => f.patternName.includes('Private Key'))).toBe(true);
      expect(findings.some(f => f.patternName.includes('OpenAI'))).toBe(true);
    });

    it('should pass cleanly for standard engineering code without credentials', () => {
      const cleanContent = `
        export function computeDisplacement(lwl: number, beam: number, draft: number, cb: number): number {
          return lwl * beam * draft * cb * 1.025;
        }
      `;
      const findings = scanContentForSecrets(cleanContent, 'clean_code.ts');
      expect(findings.length).toBe(0);
    });
  });

  describe('3. Repository Configuration & CODEOWNERS Validation', () => {
    it('should validate CODEOWNERS and required governance files', () => {
      const res = validateRepositoryConfiguration(process.cwd());
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });
  });

  describe('4. Engineering Change Request (ECR) Validation', () => {
    it('should validate compliant ECR baseline records', () => {
      const ecrPath = path.join(process.cwd(), 'governance', 'ecr', 'ECR-20261111-001_EGS_IMPLEMENTATION.md');
      const res = validateECRFile(ecrPath);
      expect(res.valid).toBe(true);
      expect(res.record?.changeId).toBe('ECR-20261111-001');
      expect(res.record?.riskAssessment).toBe('CRITICAL');
      // Markdown ECRs never carry approval authority; decisions live only in signed approval records
      expect(res.record?.approvalRecord?.decision).toBe('PENDING');
    });

    it('should reject incomplete ECR records missing mandatory sections', () => {
      const invalidPath = path.join(process.cwd(), 'governance', 'ecr', 'NON_EXISTENT_ECR.md');
      const res = validateECRFile(invalidPath);
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
    });
  });

  describe('5. Cryptographically Hash-Chained Append-Only Audit Trail', () => {
    it('should create valid chained blocks and verify end-to-end cryptographic integrity', () => {
      const trail = CryptographicAuditTrail.getInstance();
      const entry1 = trail.appendEntry({
        actor: 'usr-eng-dir-8841',
        role: 'ENGINEERING_DIRECTOR',
        action: 'CHANGE_REQUEST_CREATED',
        changeId: 'ECR-TEST-001',
        details: { scope: 'Baseline Hydrostatics' }
      });

      const entry2 = trail.appendEntry({
        actor: 'usr-eng-dir-8841',
        role: 'ENGINEERING_DIRECTOR',
        action: 'HUMAN_APPROVAL_RECORDED',
        changeId: 'ECR-TEST-001',
        details: { decision: 'APPROVED' }
      });

      expect(entry2.previousHash).toBe(entry1.hash);
      const integrity = trail.verifyIntegrity();
      expect(integrity.valid).toBe(true);
    });

    it('should detect retroactive tampering or bit flips in historical records', () => {
      const trail = CryptographicAuditTrail.getInstance();
      const rawEntries = trail.getEntries();
      expect(rawEntries.length).toBeGreaterThanOrEqual(2);

      // Create a tampered copy of the audit chain
      const tamperedChain = JSON.parse(JSON.stringify(rawEntries));
      tamperedChain[0].details.tamperedField = 'MALICIOUS_OVERRIDE';

      const check = CryptographicAuditTrail.verifyChain(tamperedChain);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('Tamper detected');
    });
  });

  describe('6. Multi-Agent Governance Authority Boundaries (HMEA v0.2)', () => {
    const bridge = AgentGovernanceBridge.getInstance();

    it('should permit canonical agents to submit engineering change proposals', () => {
      const proposal = bridge.submitProposal({
        agentId: 'STR-MAT-10',
        targetSubsystem: 'STR',
        proposedTitle: 'Hull Bottom Slamming Scantlings',
        description: 'Calculated 4.82mm bottom plating per DNV-RU-HSLC',
        reason: 'Resolve TBD scantling parameter',
        affectedParameters: ['USV-STR-001'],
        calculationEvidence: { minimumThicknessMm: 4.82 }
      });

      expect(proposal.success).toBe(true);
      expect(proposal.actionTaken).toBe('PROPOSAL_QUEUED');
      expect(proposal.changeId).toBeDefined();
    });

    it('should reject agent attempts to directly modify governance or security subsystems', () => {
      const badProposal = bridge.submitProposal({
        agentId: 'HULL-GEO-05',
        targetSubsystem: 'GOV',
        proposedTitle: 'Bypass Branch Protection',
        description: 'Attempt to alter branch protection rules',
        reason: 'Expedited deployment',
        affectedParameters: []
      });

      expect(badProposal.success).toBe(false);
      expect(badProposal.actionTaken).toBe('REJECTED_GOVERNANCE_VIOLATION');
      expect(badProposal.message).toContain('Security Violation: Agents are barred from altering governance');
    });

    it('should fail-closed and block any agent attempt to authorise its own changes', () => {
      expect(() => {
        bridge.evaluateAgentAuthorizationAttempt('STAB-HYD-06', 'ECR-AGENT-001');
      }).toThrow('Non-Negotiable Principle 5: AI cannot independently authorise its own engineering changes.');
    });
  });

  describe('7. Configuration Management & Release Manifests', () => {
    it('should generate a reproducible release manifest with SHA-256 asset checksums', () => {
      const manifest = generateReleaseManifest();
      expect(manifest.schemaVersion).toBe('1.0.0');
      expect(manifest.programme).toBe('NAVAL-USV');
      expect(manifest.checksums.length).toBeGreaterThan(10);
      expect(manifest.immutableManifestSha256).toBeDefined();

      const pkgChecksum = manifest.checksums.find(c => c.path === 'package.json');
      expect(pkgChecksum).toBeDefined();
      expect(pkgChecksum?.sha256).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('8. Stage D: Ed25519 Director Approval Bound to Exact Baseline Content', () => {
    const git = (cwd: string, ...args: string[]) =>
      execSync(['git', '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args].map(a => `'${a}'`).join(' '), { cwd, encoding: 'utf-8' }).trim();

    let repo: string;
    let director: { publicKeyPem: string; privateKey: crypto.KeyObject };

    const makeApproval = (digest: string, key = director, overrides: Record<string, string> = {}) =>
      signApproval({
        schema: APPROVAL_SCHEMA,
        changeId: 'ECR-20261111-001',
        decision: 'APPROVED',
        authorityId: 'usr-eng-dir-8841',
        authorityName: 'Test Director',
        authorityRole: 'ENGINEERING_DIRECTOR',
        baselineDigest: digest,
        headCommitAtSigning: git(repo, 'rev-parse', 'HEAD'),
        signedAt: '2026-11-11T22:00:00.000Z',
        publicKeyFingerprint: publicKeyFingerprint(key.publicKeyPem),
        ...overrides
      } as any, key.privateKey);

    const newKey = () => {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      return { publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(), privateKey };
    };

    beforeAll(() => {
      director = newKey();
      repo = fs.mkdtempSync(path.join(os.tmpdir(), 'egs-stage-d-'));
      git(repo, 'init', '-q');
      fs.mkdirSync(path.join(repo, 'src'));
      fs.mkdirSync(path.join(repo, 'governance', 'approvals'), { recursive: true });
      fs.writeFileSync(path.join(repo, 'src', 'safety.ts'), 'export const LIMIT = 1;\n');
      fs.writeFileSync(path.join(repo, 'RELEASE_MANIFEST.json'), '{"v":1}\n');
      git(repo, 'add', '-A');
      git(repo, 'commit', '-q', '-m', 'baseline');
    });

    afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

    it('accepts a Director signature over the exact current baseline digest', () => {
      const digest = computeBaselineDigest('HEAD', repo);
      const v = verifyApproval(makeApproval(digest), { publicKeyPem: director.publicKeyPem, expectedDigest: digest });
      expect(v).toEqual({ verified: true, stale: false });
    });

    it('keeps the digest unchanged when only the approval record is committed (no chicken-and-egg)', () => {
      const before = computeBaselineDigest('HEAD', repo);
      fs.writeFileSync(path.join(repo, 'governance', 'approvals', 'ECR-20261111-001.approval.json'), JSON.stringify(makeApproval(before)));
      git(repo, 'add', '-A');
      git(repo, 'commit', '-q', '-m', 'sign-off');
      expect(computeBaselineDigest('HEAD', repo)).toBe(before);
    });

    it('rejects an older approval as STALE when ANY other file changes afterwards — including RELEASE_MANIFEST.json', () => {
      const signedDigest = computeBaselineDigest('HEAD', repo);
      const approval = makeApproval(signedDigest);
      fs.writeFileSync(path.join(repo, 'RELEASE_MANIFEST.json'), '{"v":2}\n');
      git(repo, 'commit', '-q', '-am', 'manifest-only change after sign-off');
      const headDigest = computeBaselineDigest('HEAD', repo);
      expect(headDigest).not.toBe(signedDigest);
      const v = verifyApproval(approval, { publicKeyPem: director.publicKeyPem, expectedDigest: headDigest });
      expect(v.verified).toBe(false);
      expect(v.stale).toBe(true);
      expect(v.error).toContain('STALE APPROVAL REJECTED');
    });

    it('rejects approvals signed by any key other than the pinned Director public key (AI/CI cannot forge)', () => {
      const digest = computeBaselineDigest('HEAD', repo);
      const forger = newKey();
      const forged = makeApproval(digest, forger);
      const v = verifyApproval(forged, { publicKeyPem: director.publicKeyPem, expectedDigest: digest });
      expect(v.verified).toBe(false);
      expect(v.error).toContain('not the pinned Director key');

      // Forger copying the Director's fingerprint still fails signature verification
      const spoofed = makeApproval(digest, forger, { publicKeyFingerprint: publicKeyFingerprint(director.publicKeyPem) });
      expect(verifyApproval(spoofed, { publicKeyPem: director.publicKeyPem, expectedDigest: digest }).error).toContain('signature verification failed');
    });

    it('rejects tampered records and records without a provisioned trust anchor', () => {
      const digest = computeBaselineDigest('HEAD', repo);
      const tampered = { ...makeApproval(digest), authorityName: 'Someone Else' };
      expect(verifyApproval(tampered, { publicKeyPem: director.publicKeyPem, expectedDigest: digest }).verified).toBe(false);
      const noKey = verifyApproval(makeApproval(digest), { publicKeyPem: undefined, expectedDigest: digest });
      expect(noKey.verified).toBe(false);
      expect(noKey.error).toContain('DIRECTOR_PUBLIC_KEY is not provisioned');
    });

    it('rejects a REJECTED decision even when correctly signed', () => {
      const digest = computeBaselineDigest('HEAD', repo);
      const v = verifyApproval(makeApproval(digest, director, { decision: 'REJECTED' }), { publicKeyPem: director.publicKeyPem, expectedDigest: digest });
      expect(v.verified).toBe(false);
    });

    it('blocks a safety-critical PR at Stage D until a genuine Director signature exists', () => {
      const baseBranch = git(repo, 'branch', '--show-current').trim();
      git(repo, 'checkout', '-b', 'feature/critical-safety-change');
      fs.mkdirSync(path.join(repo, 'src', 'core', 'safety'), { recursive: true });
      fs.writeFileSync(path.join(repo, 'src', 'core', 'safety', 'interlock.ts'), 'export const AIR_GAP = true;\n');
      git(repo, 'add', '-A');
      git(repo, 'commit', '-q', '-m', 'safety-critical change');
      const res = evaluateStageDHumanApproval(baseBranch, { rootDir: repo, headRef: 'HEAD', publicKeyPem: director.publicKeyPem, forceRisk: 'CRITICAL' });
      expect(res.humanApprovalRequired).toBe(true);
      expect(res.signatureVerified).toBe(false);
      expect(res.summary).toContain('Stage D Gate Blocked');
    });

    it('sign-ecr.ts contains no environment or argv passphrase substitution', () => {
      const src = fs.readFileSync(path.join(process.cwd(), 'scripts', 'governance', 'sign-ecr.ts'), 'utf-8');
      expect(src).not.toMatch(/process\.env\.(LAB_DIRECTOR_KEY|DIRECTOR_SIGNING_KEY|[A-Z_]*PASSPHRASE)/);
      expect(src).toContain('assertInteractiveTerminal');
      expect(src).toContain('promptHidden');
    });
  });

  describe('9. Authenticated Staff Allowlist & scrypt Credential Store (server.ts)', () => {
    const fastScrypt = { N: 2 ** 12, r: 8, p: 1, keyLen: 64 };
    let storeDir: string;
    let origStore: string | undefined;

    beforeAll(() => {
      origStore = process.env.STAFF_CREDENTIAL_STORE;
      storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'egs-creds-'));
      const store = path.join(storeDir, 'staff.json');
      process.env.STAFF_CREDENTIAL_STORE = store;
      saveCredential('usr-eng-dir-8841', hashCredential('director-test-passphrase-01', fastScrypt), store);
      saveCredential('usr-naval-arch-05', hashCredential('naval-arch-test-passphrase', fastScrypt), store);
    });

    afterAll(() => {
      if (origStore !== undefined) process.env.STAFF_CREDENTIAL_STORE = origStore; else delete process.env.STAFF_CREDENTIAL_STORE;
      fs.rmSync(storeDir, { recursive: true, force: true });
      resetLockouts();
    });

    it('server.ts embeds no credential hashes, salts, or environment passphrase overrides', () => {
      const src = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');
      expect(src).not.toMatch(/credentialHash|credentialSalt|STAFF_KEY_|LAB_DIRECTOR_KEY/);
      expect(src).not.toMatch(/createHash\('sha256'\)\.update\(`\$\{.*\}:\$\{passphrase\}`\)/);
    });

    it('stores credentials as salted scrypt hashes only', () => {
      const store = JSON.parse(fs.readFileSync(process.env.STAFF_CREDENTIAL_STORE!, 'utf-8'));
      const c = store.credentials['usr-naval-arch-05'];
      expect(c.algorithm).toBe('scrypt');
      expect(JSON.stringify(store)).not.toContain('naval-arch-test-passphrase');
      expect(Buffer.from(c.salt, 'base64').length).toBe(16);
    });

    it('rejects unknown identities with 403', () => {
      const res = authenticateLoginRequest({ userId: 'usr-unknown-intruder-999', passphrase: 'x'.repeat(20) });
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('not recognized in the authoritative staff member allowlist');
    });

    it('rejects role spoofing attempts', () => {
      const res = authenticateLoginRequest({ userId: 'usr-lead-sys-01', role: 'ENGINEERING_DIRECTOR', passphrase: 'x'.repeat(20) });
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('strictly authorized only for role');
    });

    it('rejects ID-only (anonymous) login', () => {
      const res = authenticateLoginRequest({ userId: 'usr-naval-arch-05' });
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Passphrase is required');
    });

    it('rejects wrong passphrases for staff and Director', () => {
      expect(authenticateLoginRequest({ userId: 'usr-naval-arch-05', passphrase: 'wrong-passphrase-123' }).statusCode).toBe(401);
      const d = authenticateLoginRequest({ userId: 'usr-eng-dir-8841', role: 'ENGINEERING_DIRECTOR', passphrase: 'wrong-passphrase-123' });
      expect(d.statusCode).toBe(401);
      expect(d.body.error).toContain('Invalid credentials');
    });

    it('fails closed (503) for identities with no provisioned credential', () => {
      const res = authenticateLoginRequest({ userId: 'usr-lead-sys-01', passphrase: 'anything-at-all-123' });
      expect(res.statusCode).toBe(503);
      expect(res.body.error).toContain('no credential has been provisioned');
    });

    it('fails closed (503) when the credential store is absent', () => {
      const cur = process.env.STAFF_CREDENTIAL_STORE;
      try {
        process.env.STAFF_CREDENTIAL_STORE = path.join(storeDir, 'missing.json');
        expect(authenticateLoginRequest({ userId: 'usr-naval-arch-05', passphrase: 'naval-arch-test-passphrase' }).statusCode).toBe(503);
      } finally {
        process.env.STAFF_CREDENTIAL_STORE = cur;
      }
    });

    it('authenticates staff and Director only with their own correct passphrase', () => {
      resetLockouts();
      const s = authenticateLoginRequest({ userId: 'usr-naval-arch-05', passphrase: 'naval-arch-test-passphrase' });
      expect(s.statusCode).toBe(200);
      expect(s.body.user?.role).toBe('NAVAL_ARCHITECT');
      expect(s.body.token).toBeDefined();
      const d = authenticateLoginRequest({ userId: 'usr-eng-dir-8841', role: 'ENGINEERING_DIRECTOR', passphrase: 'director-test-passphrase-01' });
      expect(d.statusCode).toBe(200);
      expect(d.body.user?.role).toBe('ENGINEERING_DIRECTOR');
      // Cross-use of another member's passphrase is rejected
      expect(authenticateLoginRequest({ userId: 'usr-eng-dir-8841', passphrase: 'naval-arch-test-passphrase' }).statusCode).toBe(401);
    });

    it('locks an identity out after repeated failures', () => {
      resetLockouts();
      for (let i = 0; i < 5; i++) authenticateLoginRequest({ userId: 'usr-naval-arch-05', passphrase: `bad-passphrase-${i}xx` });
      const res = authenticateLoginRequest({ userId: 'usr-naval-arch-05', passphrase: 'naval-arch-test-passphrase' });
      expect(res.statusCode).toBe(429);
      resetLockouts();
    });
  });

  describe('10. Production Model Provider Fail-Closed Safety Invariant', () => {
    it('should throw hard error and refuse mock fallback in production when provider fails', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origAllowMock = process.env.ALLOW_TEST_MOCK;
      const origVitest = process.env.VITEST;
      const origCi = process.env.CI;

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.ALLOW_TEST_MOCK;
        delete process.env.VITEST;
        delete process.env.CI;

        const router = ModelProviderRouter.getInstance();
        await expect(
          router.generate(
            { systemInstructions: 'Test instructions', userPrompt: 'Test user prompt', context: {} },
            {
              preferredProvider: 'non_existent_provider' as any,
              modelName: 'test-v1',
              temperature: 0.1,
              maxTokens: 1024,
              fallbackToMock: false
            }
          )
        ).rejects.toThrow(/Production Engineering Safety Invariant: Preferred model provider 'non_existent_provider' is unavailable/);
      } finally {
        process.env.NODE_ENV = origNodeEnv;
        if (origAllowMock !== undefined) process.env.ALLOW_TEST_MOCK = origAllowMock;
        if (origVitest !== undefined) process.env.VITEST = origVitest;
        if (origCi !== undefined) process.env.CI = origCi;
      }
    });

    it('should strictly prohibit direct invocation of mock_deterministic provider in production', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origAllowMock = process.env.ALLOW_TEST_MOCK;
      const origVitest = process.env.VITEST;
      const origCi = process.env.CI;

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.ALLOW_TEST_MOCK;
        delete process.env.VITEST;
        delete process.env.CI;

        const router = ModelProviderRouter.getInstance();
        await expect(
          router.generate(
            { systemInstructions: 'Test instructions', userPrompt: 'Test prompt', context: {} },
            {
              preferredProvider: 'mock_deterministic',
              modelName: 'marine-engine-v1',
              temperature: 0.1,
              maxTokens: 1024,
              fallbackToMock: false
            }
          )
        ).rejects.toThrow(/Production Engineering Safety Invariant: Direct invocation of 'mock_deterministic' provider is prohibited in production/);
      } finally {
        process.env.NODE_ENV = origNodeEnv;
        if (origAllowMock !== undefined) process.env.ALLOW_TEST_MOCK = origAllowMock;
        if (origVitest !== undefined) process.env.VITEST = origVitest;
        if (origCi !== undefined) process.env.CI = origCi;
      }
    });
  });

  describe('11. Stage C: Seven Independent Model-Backed Reviewer Architecture', () => {
    it('should execute all seven independent reviewer roles concurrently and fail-closed on mock fallback', async () => {
      const report = await generateMultiRoleReview('origin/main');
      expect(report.reviews).toHaveLength(7);

      const expectedRoles = [
        'SOFTWARE_ARCHITECTURE_REVIEWER',
        'CODE_QUALITY_REVIEWER',
        'SOFTWARE_QA_REVIEWER',
        'CYBERSECURITY_REVIEWER',
        'SAFETY_ENGINEERING_REVIEWER',
        'CONFIGURATION_MANAGEMENT_REVIEWER',
        'REQUIREMENTS_TRACEABILITY_REVIEWER'
      ];

      for (const role of expectedRoles) {
        const rev = report.reviews.find(r => r.role === role);
        expect(rev).toBeDefined();
        expect(rev?.provider).toBeDefined();
        expect(rev?.model).toBeDefined();
        expect(rev?.rawOutput.length).toBeGreaterThan(0);
        expect(rev?.advisoryRecommendation).toBeDefined();

        // Control 3: In an environment where the live model is unavailable or has exhausted quota,
        // mock fallback must fail closed (ADVISORY_BLOCK, executionStatus FAILED, isMockFallback true)
        if (rev?.isMockFallback) {
          expect(rev.advisoryRecommendation).toBe('ADVISORY_BLOCK');
          expect(rev.executionStatus).toBe('FAILED');
          expect(rev.summary).toContain('MOCK EXECUTION REJECTED');
        } else if (rev?.executionStatus === 'FAILED') {
          expect(rev.summary).toContain('AI review unavailable');
        } else {
          expect(rev?.executionStatus).toBe('COMPLETED');
        }
      }

      // If any reviewer fell back to mock, composite recommendation must strictly be ADVISORY_BLOCK
      if (report.hasMockFallback) {
        expect(report.compositeAdvisoryRecommendation).toBe('ADVISORY_BLOCK');
      }
    });
  });
});
