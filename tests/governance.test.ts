import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { classifyFile } from '../scripts/governance/classify-change.ts';
import { scanContentForSecrets } from '../scripts/governance/secret-scanner.ts';
import { validateRepositoryConfiguration } from '../scripts/governance/validate-config.ts';
import { validateECRFile, generateECRSignature } from '../scripts/governance/ecr-tool.ts';
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
      expect(res.record?.approvalRecord?.decision).toBe('APPROVED');
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

  describe('8. Stage D: Human Authority & Independent Review Verification', () => {
    const testSigningKey = '3f3e07df0401f535dd1254d57accc68ed8171a5aa7055d3d22ae024bcb7cf04e';

    it('should strictly detect and reject stale ECR approvals if code changed post-approval', () => {
      // Current ECR was approved for commit 'fa2329e', but subsequent commits modified baseline files
      const res = evaluateStageDHumanApproval('origin/main', testSigningKey);
      expect(res.humanApprovalRequired).toBe(true);
      expect(res.highestRisk).toBe('CRITICAL');
      expect(res.ecrRecordFound).toBe(true);
      expect(res.signatureVerified).toBe(false);
      expect(res.summary).toContain('STALE APPROVAL REJECTED');
    });

    it('should verify human authority closure when ECR is bound to current commit SHA', () => {
      const ecrPath = path.join(process.cwd(), 'governance', 'ecr', 'ECR-20261111-001_EGS_IMPLEMENTATION.md');
      const origContent = fs.readFileSync(ecrPath, 'utf8');
      try {
        const headSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
        const signedAt = '2026-11-11T22:00:00.000Z';
        const signature = generateECRSignature(
          'ECR-20261111-001',
          'APPROVED',
          'usr-eng-dir-8841',
          'ENGINEERING_DIRECTOR',
          signedAt,
          headSha,
          testSigningKey
        );
        const updated = origContent
          .replace(/Signed At:\*?\*?\s*[^\n\r]+/i, `Signed At: ${signedAt}`)
          .replace(/Implementation Commit:\*?\*?\s*[^\n\r]+/i, `Implementation Commit: ${headSha}`)
          .replace(/(?:Cryptographic Signature \/ Hash|Signature|Approval Hash):?\*?\*?\s*[^\n\r]+/i, `Cryptographic Signature / Hash: ${signature}`);
        fs.writeFileSync(ecrPath, updated, 'utf8');

        const res = evaluateStageDHumanApproval('origin/main', testSigningKey);
        expect(res.humanApprovalRequired).toBe(true);
        expect(res.ecrRecordFound).toBe(true);
        expect(res.approverRole).toBe('ENGINEERING_DIRECTOR');
        expect(res.signatureVerified).toBe(true);
      } finally {
        fs.writeFileSync(ecrPath, origContent, 'utf8');
      }
    });

    it('should strictly reject HMAC signature mismatch when wrong key is provided for bound commit', () => {
      const ecrPath = path.join(process.cwd(), 'governance', 'ecr', 'ECR-20261111-001_EGS_IMPLEMENTATION.md');
      const origContent = fs.readFileSync(ecrPath, 'utf8');
      try {
        const headSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
        const signedAt = '2026-11-11T22:00:00.000Z';
        const signature = generateECRSignature(
          'ECR-20261111-001',
          'APPROVED',
          'usr-eng-dir-8841',
          'ENGINEERING_DIRECTOR',
          signedAt,
          headSha,
          testSigningKey
        );
        const updated = origContent
          .replace(/Signed At:\*?\*?\s*[^\n\r]+/i, `Signed At: ${signedAt}`)
          .replace(/Implementation Commit:\*?\*?\s*[^\n\r]+/i, `Implementation Commit: ${headSha}`)
          .replace(/(?:Cryptographic Signature \/ Hash|Signature|Approval Hash):?\*?\*?\s*[^\n\r]+/i, `Cryptographic Signature / Hash: ${signature}`);
        fs.writeFileSync(ecrPath, updated, 'utf8');

        const res = evaluateStageDHumanApproval('origin/main', 'invalid-signing-key-0000');
        expect(res.signatureVerified).toBe(false);
        expect(res.summary).toContain('cryptographic HMAC signature verification failed');
      } finally {
        fs.writeFileSync(ecrPath, origContent, 'utf8');
      }
    });
  });

  describe('9. Authenticated Staff Allowlist Boundary (server.ts)', () => {
    const testDirectorKey = 'test-director-passphrase-8841-alpha';
    let origDirectorKey: string | undefined;

    beforeAll(() => {
      origDirectorKey = process.env.LAB_DIRECTOR_KEY;
      process.env.LAB_DIRECTOR_KEY = testDirectorKey;
    });

    afterAll(() => {
      if (origDirectorKey !== undefined) {
        process.env.LAB_DIRECTOR_KEY = origDirectorKey;
      } else {
        delete process.env.LAB_DIRECTOR_KEY;
      }
    });

    it('should reject unknown staff user IDs with 403 Forbidden', () => {
      const res = authenticateLoginRequest({ userId: 'usr-unknown-intruder-999' });
      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not recognized in the authoritative staff member allowlist');
    });

    it('should reject role spoofing attempts where requested role differs from allowlist', () => {
      const res = authenticateLoginRequest({ userId: 'usr-lead-sys-01', role: 'ENGINEERING_DIRECTOR' });
      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('strictly authorized only for role');
    });

    it('should return 503 when LAB_DIRECTOR_KEY is not configured in environment', () => {
      const current = process.env.LAB_DIRECTOR_KEY;
      try {
        delete process.env.LAB_DIRECTOR_KEY;
        const res = authenticateLoginRequest({ userId: 'usr-eng-dir-8841', role: 'ENGINEERING_DIRECTOR' });
        expect(res.statusCode).toBe(503);
        expect(res.body.error).toContain('LAB_DIRECTOR_KEY is not configured');
      } finally {
        process.env.LAB_DIRECTOR_KEY = current;
      }
    });

    it('should reject Engineering Director login without valid passphrase', () => {
      const resMissing = authenticateLoginRequest({ userId: 'usr-eng-dir-8841', role: 'ENGINEERING_DIRECTOR' });
      expect(resMissing.statusCode).toBe(401);

      const resWrong = authenticateLoginRequest({
        userId: 'usr-eng-dir-8841',
        role: 'ENGINEERING_DIRECTOR',
        passphrase: 'wrong-passphrase'
      });
      expect(resWrong.statusCode).toBe(401);
      expect(resWrong.body.error).toContain('Invalid Engineering Director passphrase');
    });

    it('should authenticate Engineering Director when valid passphrase is provided', () => {
      const res = authenticateLoginRequest({
        userId: 'usr-eng-dir-8841',
        role: 'ENGINEERING_DIRECTOR',
        passphrase: testDirectorKey
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user?.role).toBe('ENGINEERING_DIRECTOR');
    });

    it('should reject staff login without passphrase (anonymous assertion prohibited)', () => {
      const res = authenticateLoginRequest({ userId: 'usr-naval-arch-05' });
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Passphrase is required for staff member');
    });

    it('should reject staff login with incorrect passphrase', () => {
      const res = authenticateLoginRequest({
        userId: 'usr-naval-arch-05',
        passphrase: 'wrong-staff-passphrase'
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid credentials');
    });

    it('should authenticate standard allowlisted engineering staff members with valid cryptographic passphrase', () => {
      const res = authenticateLoginRequest({
        userId: 'usr-naval-arch-05',
        passphrase: 'usv01-naval-arch-3341'
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user?.userName).toBe('Senior Hydrodynamics Engineer');
      expect(res.body.user?.role).toBe('NAVAL_ARCHITECT');
      expect(res.body.token).toBeDefined();

      const res2 = authenticateLoginRequest({
        userId: 'usr-lead-sys-01',
        passphrase: 'usv01-sys-lead-9912'
      });
      expect(res2.statusCode).toBe(200);
      expect(res2.body.user?.role).toBe('LEAD_SYSTEMS_ENGINEER');
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
