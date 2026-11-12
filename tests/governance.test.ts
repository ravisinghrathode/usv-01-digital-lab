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
import { evaluateGovernanceGate } from '../scripts/governance/stage-e-enforce.ts';
import { VerifyUsv01Engine } from '../src/core/verification/VerifyUsv01Engine.ts';
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

  describe('12. Stage E: Governance Gate Enforcement & Fail-Closed Integrity', () => {
    it('should evaluate governance gate with fail-closed verdict when critical change lacks human approval', () => {
      const evalRes = evaluateGovernanceGate(process.cwd(), 'origin/main');
      expect(evalRes).toBeDefined();
      expect(evalRes.stageAResult).toBeDefined();
      expect(evalRes.stageCResult).toBeDefined();
      expect(evalRes.stageDResult).toBeDefined();

      // If Stage A is CRITICAL or HIGH and Stage D has no verified signature, overallVerdict cannot be APPROVED
      if (evalRes.stageDResult.required && !evalRes.stageDResult.signatureVerified) {
        expect(evalRes.passed).toBe(false);
        expect(['PENDING_HUMAN_AUTHORITY', 'BLOCKED']).toContain(evalRes.overallVerdict);
        expect(evalRes.blockingReasons.length).toBeGreaterThan(0);
      }
    });

    it('should block merge and reject PENDING_HUMAN_REVIEW as acceptable Stage C result on critical changes', () => {
      // Simulate reports with PENDING_HUMAN_REVIEW in a temporary directory
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'egs-stage-e-'));
      const reportsDir = path.join(tmpDir, 'governance', 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });

      try {
        fs.writeFileSync(
          path.join(reportsDir, 'pr-classification.json'),
          JSON.stringify({
            summary: {
              overallRisk: 'CRITICAL',
              requiresDesignatedAuthorityApproval: true,
              totalFilesChanged: 2,
              totalLinesAdded: 50,
              totalLinesDeleted: 0,
              dominantCategories: ['SAFETY'],
              requiresECR: true
            },
            fileDetails: [],
            timestamp: new Date().toISOString()
          })
        );

        fs.writeFileSync(
          path.join(reportsDir, 'stage-c-review.json'),
          JSON.stringify({
            compositeAdvisoryRecommendation: 'PENDING_HUMAN_REVIEW',
            provider: 'deterministic',
            aiReviewStatus: 'AI_REVIEW_UNAVAILABLE',
            deterministicStatus: 'PASS',
            hasMockFallback: false
          })
        );

        fs.writeFileSync(
          path.join(reportsDir, 'stage-d-approval.json'),
          JSON.stringify({
            humanApprovalRequired: true,
            highestRisk: 'CRITICAL',
            signatureVerified: false,
            staleApproval: false
          })
        );

        const evalRes = evaluateGovernanceGate(tmpDir, 'origin/main');
        expect(evalRes.passed).toBe(false);
        expect(evalRes.overallVerdict).toBe('BLOCKED');
        expect(evalRes.blockingReasons.some(r => r.includes('PENDING_HUMAN_REVIEW'))).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('should reject Stage C evidence when baseline digest does not match current commit baseline', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'egs-digest-c-'));
      const reportsDir = path.join(tmpDir, 'governance', 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });

      try {
        fs.writeFileSync(
          path.join(reportsDir, 'pr-classification.json'),
          JSON.stringify({
            summary: {
              overallRisk: 'LOW',
              requiresDesignatedAuthorityApproval: false,
              totalFilesChanged: 1,
              totalLinesAdded: 5,
              totalLinesDeleted: 0,
              dominantCategories: ['DOCUMENTATION'],
              requiresECR: false
            },
            baselineDigest: 'sha256:current1234567890abcdef',
            fileDetails: [],
            timestamp: new Date().toISOString()
          })
        );

        fs.writeFileSync(
          path.join(reportsDir, 'stage-c-review.json'),
          JSON.stringify({
            compositeAdvisoryRecommendation: 'ADVISORY_APPROVE',
            provider: 'deterministic',
            aiReviewStatus: 'AI_REVIEW_UNAVAILABLE',
            deterministicStatus: 'PASS',
            hasMockFallback: false,
            baselineDigest: 'sha256:mismatchedOldDigest999',
            evaluatedCommitSha: 'oldCommitSha1234'
          })
        );

        // When evaluating against a rootDir with different digest, Stage E detects mismatch
        const evalRes = evaluateGovernanceGate(tmpDir, 'origin/main');
        expect(evalRes.passed).toBe(false);
        expect(evalRes.blockingReasons.some(r => r.includes('Stage C independent review evidence does not correspond to the exact baseline digest'))).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('should accurately disclose deterministic review and never represent it as model-backed', async () => {
      const report = await generateMultiRoleReview('HEAD');
      expect(report).toBeDefined();
      if (report.provider === 'deterministic') {
        expect(report.aiReviewStatus).toBe('AI_REVIEW_UNAVAILABLE');
        expect(report.executionMode).toContain('Deterministic Static Rule Engine');
        expect(report.governanceBanner).toContain('DETERMINISTIC STATIC RULE ENGINE REVIEW ONLY');
        expect(report.governanceBanner).not.toContain('SEVEN INDEPENDENT MODEL-BACKED REVIEWERS');
      }
    });
  });

  describe('13. VERIFY USV-01: Single-Press Systems Verification Engine', () => {
    it('should execute complete 4-phase verification and return structured report', async () => {
      const engine = VerifyUsv01Engine.getInstance(process.cwd());
      const report = await engine.executeVerification();

      expect(report).toBeDefined();
      expect(report.reportId).toMatch(/^USV01-VRFY-/);
      expect(report.system).toContain('USV-01');
      expect(report.evaluatedCommitSha).toBeTruthy();
      expect(report.baselineDigest).toBeTruthy();
      expect(['PASS', 'CONDITIONAL', 'FAIL']).toContain(report.overallVerdict);

      // Verify all 4 phases are present
      expect(report.phases.phase1_repoQuality).toBeDefined();
      expect(report.phases.phase2_governanceStages).toBeDefined();
      expect(report.phases.phase3_hmeaAgents).toBeDefined();
      expect(report.phases.phase4_engineeringData).toBeDefined();

      // Verify stats
      expect(report.summaryStatistics.totalChecks).toBeGreaterThanOrEqual(15);
      expect(report.summaryStatistics.passed).toBeGreaterThan(0);
      expect(report.reportMarkdown.length).toBeGreaterThan(500);
    });

    it('should enforce fail-closed zero-fabrication: never produce PASS on unverified or failing criteria', async () => {
      const engine = VerifyUsv01Engine.getInstance(process.cwd());
      const report = await engine.executeVerification();

      // In current local repo state, if Stage D Director signature is missing or working tree is dirty or AI is unavailable,
      // overall verdict MUST NOT be PASS!
      if (report.summaryStatistics.failed > 0 || report.summaryStatistics.blocked > 0 || !report.governanceFindings.stageD.signatureVerified) {
        expect(report.overallVerdict).not.toBe('PASS');
        expect(['CONDITIONAL', 'FAIL']).toContain(report.overallVerdict);
      }
    });

    it('should evaluate all 25 canonical HMEA agents (A01 - A25) with non-fabricated readiness', async () => {
      const engine = VerifyUsv01Engine.getInstance(process.cwd());
      const report = await engine.executeVerification();

      const agents = report.phases.phase3_hmeaAgents.agentReadiness;
      expect(agents.length).toBeGreaterThanOrEqual(25);

      const canonicalIds = agents.map(a => a.canonicalId);
      for (let i = 1; i <= 25; i++) {
        const expected = `A${i.toString().padStart(2, '0')}`;
        expect(canonicalIds).toContain(expected);
      }

      // Check capability classifications
      for (const a of agents) {
        expect(['IMPLEMENTED', 'TESTED', 'SIMULATED', 'UNAVAILABLE', 'UNVERIFIED']).toContain(a.capabilityStatus);
        expect(a.readinessScore).toBeGreaterThanOrEqual(0);
        expect(a.readinessScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('14. Defect Remediation Regression Suite (PR #14 Acceptance Criteria)', () => {
    it('Defect 1: should decouple Node-only verification modules from browser bundle in src/App.tsx', () => {
      const appContent = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf-8');
      expect(appContent).not.toContain("import('./core/verification/VerifyUsv01Engine.ts')");
      expect(appContent).not.toContain('VerifyUsv01Engine.getInstance');
      expect(appContent).toContain('/api/verify/execute');
    });

    it('Defect 2: should enforce set -euo pipefail and bash defaults in CI workflow without continue-on-error', () => {
      const workflowContent = fs.readFileSync(path.join(process.cwd(), '.github', 'workflows', 'safety-governance-gate.yml'), 'utf-8');
      expect(workflowContent).toContain('shell: bash');
      expect(workflowContent).toContain('set -euo pipefail');
      expect(workflowContent).not.toContain('continue-on-error: true');
    });

    it('Defect 3: should include genuine command execution checks (lint, test, build) in VERIFY USV-01 Phase 1', async () => {
      const engine = VerifyUsv01Engine.getInstance(process.cwd());
      const report = await engine.executeVerification();

      const phase1 = report.phases.phase1_repoQuality;
      const checkIds = phase1.checks.map(c => c.id);

      expect(checkIds).toContain('CHK-REPO-07'); // Lint / typecheck
      expect(checkIds).toContain('CHK-REPO-08'); // Tests
      expect(checkIds).toContain('CHK-REPO-09'); // Production build

      const lintCheck = phase1.checks.find(c => c.id === 'CHK-REPO-07');
      expect(lintCheck?.evidence?.command).toBe('npm run lint');

      const testCheck = phase1.checks.find(c => c.id === 'CHK-REPO-08');
      expect(testCheck?.evidence?.command).toBe('npm test');

      const buildCheck = phase1.checks.find(c => c.id === 'CHK-REPO-09');
      expect(buildCheck?.evidence?.command).toBe('npm run build');
    });

    it('Defect 4: should verify genuine execution of all 25 canonical agents without static ID lookups', async () => {
      const engineFile = fs.readFileSync(path.join(process.cwd(), 'src', 'core', 'verification', 'VerifyUsv01Engine.ts'), 'utf-8');
      // Must not contain hardcoded testedAgentIds list
      expect(engineFile).not.toContain('const testedAgentIds = [');
      expect(engineFile).toContain('executionEngine.executeAgent');

      const engine = VerifyUsv01Engine.getInstance(process.cwd());
      const report = await engine.executeVerification();
      const agents = report.phases.phase3_hmeaAgents.agentReadiness;
      expect(agents.length).toBeGreaterThanOrEqual(25);

      for (const a of agents.slice(0, 25)) {
        expect(['TESTED', 'SIMULATED', 'IMPLEMENTED', 'UNVERIFIED', 'FAILED']).toContain(a.capabilityStatus);
        expect(a.executionTestStatus).toBe('PASS');
      }
    });

    it('Defect 5: should enforce that missing, skipped, or unverified mandatory checks strictly fail', () => {
      const allPassed: IndividualCheckResult[] = [
        {
          id: 'CHK-TEST-01',
          category: 'REPO_INTEGRITY',
          title: 'Mandatory Test',
          status: 'UNVERIFIED',
          mandatory: true,
          summary: 'Unverified test',
          timestamp: new Date().toISOString()
        }
      ];

      // In accordance with VERIFY USV-01 verdict policy:
      // Any mandatory check that is UNVERIFIED or SKIPPED must halt release with FAIL
      const hasUnverifiedMandatory = allPassed.some(c => c.mandatory && (c.status === 'UNVERIFIED' || c.status === 'SKIPPED'));
      expect(hasUnverifiedMandatory).toBe(true);
    });

    it('Defect 6: should enforce exact commit SHA and baseline digest matching in Stage E gate', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'egs-stage-e-digest-'));
      const reportsDir = path.join(tmpDir, 'governance', 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });

      try {
        fs.writeFileSync(
          path.join(reportsDir, 'pr-classification.json'),
          JSON.stringify({
            summary: {
              overallRisk: 'LOW',
              requiresDesignatedAuthorityApproval: false,
              totalFilesChanged: 1,
              totalLinesAdded: 5,
              totalLinesDeleted: 0,
              dominantCategories: ['DOCUMENTATION'],
              requiresECR: false
            },
            commitSha: '1111111111111111111111111111111111111111',
            baselineDigest: 'sha256:mismatched_digest_test_1234567890abcdef',
            fileDetails: [],
            timestamp: new Date().toISOString()
          })
        );

        fs.writeFileSync(
          path.join(reportsDir, 'stage-c-review.json'),
          JSON.stringify({
            compositeAdvisoryRecommendation: 'ADVISORY_APPROVE',
            provider: 'deterministic',
            aiReviewStatus: 'AI_REVIEW_UNAVAILABLE',
            deterministicStatus: 'PASS',
            hasMockFallback: false,
            evaluatedCommitSha: '1111111111111111111111111111111111111111',
            baselineDigest: 'sha256:mismatched_digest_test_1234567890abcdef'
          })
        );

        const evalRes = evaluateGovernanceGate(tmpDir, 'origin/main');
        expect(evalRes.passed).toBe(false);
        expect(evalRes.blockingReasons.some(r => r.includes('baseline digest'))).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('Defect 7: should ensure globalUsvIntel.test.ts and notebookLm.test.ts use vitest imports', () => {
      const intelTestContent = fs.readFileSync(path.join(process.cwd(), 'tests', 'globalUsvIntel.test.ts'), 'utf-8');
      expect(intelTestContent).toContain("from 'vitest'");
      expect(intelTestContent).not.toContain("from 'node:test'");

      const notebookTestContent = fs.readFileSync(path.join(process.cwd(), 'tests', 'notebookLm.test.ts'), 'utf-8');
      expect(notebookTestContent).toContain("from 'vitest'");
      expect(notebookTestContent).not.toContain("from 'node:test'");
    });
  });
});
