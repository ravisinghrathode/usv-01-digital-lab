import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { approvalRouteForChangedFiles, classifyFile } from '../scripts/governance/classify-change.ts';
import { evaluateGovernanceGate } from '../scripts/governance/stage-e-enforce.ts';

describe('USV-01 authority routing: distinguish lab software from vessel design', () => {
  it('routes non-operational research roles without a vessel engineering ECR', () => {
    expect(approvalRouteForChangedFiles([
      'src/core/agents/definitions.ts',
      'src/core/verification/TopologicalAgentCampaign.ts',
      'docs/USV01_26_AGENT_OPERATIONAL_ACCEPTANCE.md'
    ])).toBe('RESTRICTED_LAB_SOFTWARE');
  });

  it('keeps governance, provider, authorization and workflows protected by software peer review', () => {
    const protectedFiles = [
      'scripts/governance/classify-change.ts',
      'scripts/governance/stage-d-human-approval.ts',
      'scripts/governance/stage-e-enforce.ts',
      'src/core/mission-control/LabCommissioningPolicy.ts',
      'src/core/models/ModelProvider.ts',
      '.github/workflows/usv01-26-agent-commissioning.yml',
      'src/core/auth/credentialStore.ts',
      'package.json'
    ];
    for (const file of protectedFiles) {
      expect(approvalRouteForChangedFiles([file]), file).toBe('PROTECTED_SOFTWARE_SECURITY');
    }
    expect(classifyFile('scripts/governance/stage-e-enforce.ts').risk).toBe('CRITICAL');
    expect(classifyFile('.github/workflows/safety-governance-gate.yml').risk).toBe('CRITICAL');
  });

  it('never downgrades vessel safety, release evidence, naval physics or approved data even when mixed with lab files', () => {
    const engineeringFiles = [
      'src/core/tools/naval/HydrostaticsTool.ts',
      'src/core/verification/AutonomyColregsSafetyScreen.ts',
      'src/core/verification/SafetyScenarioSuite.ts',
      'docs/AUT01_SIL_HIL_SEA_TRIAL_PROTOCOL.md',
      'governance/ecr/ECR-TEST.md',
      'governance/approvals/ECR-TEST.approval.json',
      'data/controlled-vessel-parameters.yaml',
      'evidence/aut01/acceptance-status.json',
      'RELEASE_MANIFEST.json'
    ];
    for (const file of engineeringFiles) {
      expect(approvalRouteForChangedFiles([file]), file).toBe('SAFETY_CRITICAL_ENGINEERING');
      expect(approvalRouteForChangedFiles([
        'src/core/agents/definitions.ts', file,
        'scripts/governance/stage-e-enforce.ts'
      ]), file).toBe('SAFETY_CRITICAL_ENGINEERING');
    }
  });

  it('cannot opt into restricted route through descriptions, labels, risk or missing Git diff', () => {
    expect(approvalRouteForChangedFiles([])).toBe('PROTECTED_SOFTWARE_SECURITY');
    expect(approvalRouteForChangedFiles(['docs/ARCHITECTURE.md'])).toBe('ROUTINE_SOFTWARE');
    expect(approvalRouteForChangedFiles([
      'src/core/agents/definitions.ts', '.github/workflows/deploy.yml'
    ])).toBe('PROTECTED_SOFTWARE_SECURITY');
    expect(approvalRouteForChangedFiles([
      'src/core/agents/definitions.ts', 'docs/AUT01_RELEASE_PROTOCOL.md'
    ])).toBe('SAFETY_CRITICAL_ENGINEERING');
    expect(approvalRouteForChangedFiles([
      'src/core/verification/AutonomySilReplay.ts'
    ])).toBe('SAFETY_CRITICAL_ENGINEERING');
    // Windows separators cannot circumvent protected route detection.
    expect(approvalRouteForChangedFiles([
      ['scripts', 'governance', 'stage-e-enforce.ts'].join(String.fromCharCode(92))
    ])).toBe('PROTECTED_SOFTWARE_SECURITY');
  });
});

describe('Stage E route-specific enforcement', () => {
  const makeDir = (): { root: string; reports: string } => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'usv-route-gate-'));
    const reports = path.join(root, 'governance', 'reports');
    fs.mkdirSync(reports, { recursive: true });
    return { root, reports };
  };
  const write = (dir: string, name: string, data: unknown) =>
    fs.writeFileSync(path.join(dir, name), JSON.stringify(data));

  function stageA(route: 'PROTECTED_SOFTWARE_SECURITY' | 'SAFETY_CRITICAL_ENGINEERING') {
    const engineering = route === 'SAFETY_CRITICAL_ENGINEERING';
    return {
      summary: {
        approvalRoute: route, overallRisk: 'CRITICAL',
        requiresIndependentEngineeringReview: engineering,
        requiresIndependentSoftwareReview: !engineering,
        requiresIndependentPeerApproval: true,
        requiresDesignatedAuthorityApproval: engineering,
        requiresECR: engineering, totalFilesChanged: 1,
        totalLinesAdded: 10, totalLinesDeleted: 1,
        dominantCategories: ['SECURITY']
      }, fileDetails: [], timestamp: new Date().toISOString()
    };
  }
  function stageC() {
    return {
      compositeAdvisoryRecommendation: 'PENDING_HUMAN_REVIEW',
      provider: 'deterministic', aiReviewStatus: 'AI_REVIEW_UNAVAILABLE',
      deterministicStatus: 'PASS', hasMockFallback: false
    };
  }

  it('allows protected-software peer-approved change without Director vessel ECR', () => {
    const { root, reports } = makeDir();
    try {
      write(reports, 'pr-classification.json', stageA('PROTECTED_SOFTWARE_SECURITY'));
      write(reports, 'stage-c-review.json', stageC());
      write(reports, 'stage-d-approval.json', {
        approvalRoute: 'PROTECTED_SOFTWARE_SECURITY',
        humanApprovalRequired: false, peerApprovalRequired: true,
        independentPeerApproved: true,
        signatureVerified: false, staleApproval: true,
        independentReviewStatus: 'APPROVED_BY_PEER'
      });
      const verdict = evaluateGovernanceGate(root);
      expect(verdict.stageAResult.approvalRoute).toBe('PROTECTED_SOFTWARE_SECURITY');
      expect(verdict.stageDResult.required).toBe(false);
      expect(verdict.stageDResult.peerRequired).toBe(true);
      expect(verdict.stageDResult.independentPeerApproved).toBe(true);
      expect(verdict.passed).toBe(true);
      expect(verdict.blockingReasons).toHaveLength(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects protected-software changes when independent exact-head peer approval is absent', () => {
    const { root, reports } = makeDir();
    try {
      write(reports, 'pr-classification.json', stageA('PROTECTED_SOFTWARE_SECURITY'));
      write(reports, 'stage-c-review.json', stageC());
      write(reports, 'stage-d-approval.json', {
        approvalRoute: 'PROTECTED_SOFTWARE_SECURITY',
        humanApprovalRequired: false, peerApprovalRequired: true,
        independentPeerApproved: false,
        signatureVerified: false, staleApproval: false,
        independentReviewStatus: 'PENDING_HUMAN_SIGN_OFF'
      });
      const verdict = evaluateGovernanceGate(root);
      expect(verdict.passed).toBe(false);
      expect(verdict.blockingReasons.some(x => x.includes('independent GitHub peer approval'))).toBe(true);
      expect(verdict.blockingReasons.every(x => !x.includes('Director-signed Ed25519 approval'))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('continues to require an exact Director signature and peer for actual vessel releases', () => {
    const { root, reports } = makeDir();
    try {
      write(reports, 'pr-classification.json', stageA('SAFETY_CRITICAL_ENGINEERING'));
      write(reports, 'stage-c-review.json', stageC());
      write(reports, 'stage-d-approval.json', {
        approvalRoute: 'SAFETY_CRITICAL_ENGINEERING',
        humanApprovalRequired: true, peerApprovalRequired: true,
        independentPeerApproved: true, signatureVerified: false, staleApproval: true,
        independentReviewStatus: 'APPROVED_BY_PEER'
      });
      const verdict = evaluateGovernanceGate(root);
      expect(verdict.passed).toBe(false);
      expect(verdict.stageDResult.required).toBe(true);
      expect(verdict.blockingReasons.some(x => x.includes('ECR approval record is stale'))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
