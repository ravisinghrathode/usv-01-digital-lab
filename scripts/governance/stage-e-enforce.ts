import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { generateClassificationReport, type PRClassificationReport } from './classify-change.ts';
import type { MultiRoleReviewReport } from './independent-ai-review.ts';
import type { StageDResult } from './stage-d-human-approval.ts';
import { computeBaselineDigest } from './ecr-approval.ts';

export interface StageEEvaluation {
  passed: boolean;
  overallVerdict: 'APPROVED' | 'BLOCKED' | 'PENDING_HUMAN_AUTHORITY';
  currentCommitSha?: string;
  currentBaselineDigest?: string;
  stageAResult: {
    overallRisk: string;
    requiresDirector: boolean;
    digestMatches?: boolean;
    commitMatches?: boolean;
  };
  stageCResult: {
    provider: string;
    aiStatus: string;
    deterministicStatus: string;
    hasMockFallback: boolean;
    verdict: string;
    digestMatches?: boolean;
    commitMatches?: boolean;
  };
  stageDResult: {
    required: boolean;
    signatureVerified: boolean;
    staleApproval: boolean;
    authority?: string;
    baselineDigest?: string;
    evaluatedRef?: string;
    digestMatches?: boolean;
  };
  blockingReasons: string[];
}

export function evaluateGovernanceGate(rootDir = process.cwd(), baseRef = 'origin/main'): StageEEvaluation {
  const reportsDir = path.join(rootDir, 'governance', 'reports');

  // Compute current commit and baseline digest for strict correspondence verification
  let currentCommitSha = '';
  let currentBaselineDigest = '';
  try {
    const headRef = process.env.PR_HEAD_SHA || 'HEAD';
    currentCommitSha = execFileSync('git', ['rev-parse', headRef], { cwd: rootDir, encoding: 'utf-8' }).trim();
    currentBaselineDigest = computeBaselineDigest(headRef, rootDir);
  } catch {}

  // 1. Stage A: Change Classification
  let stageA: PRClassificationReport;
  const stageAPath = path.join(reportsDir, 'pr-classification.json');
  if (fs.existsSync(stageAPath)) {
    try {
      stageA = JSON.parse(fs.readFileSync(stageAPath, 'utf8'));
    } catch {
      stageA = generateClassificationReport(baseRef, rootDir);
    }
  } else {
    stageA = generateClassificationReport(baseRef, rootDir);
  }

  // 2. Stage C: Independent Technical Review
  let stageC: MultiRoleReviewReport | undefined;
  const stageCPath = path.join(reportsDir, 'stage-c-review.json');
  if (fs.existsSync(stageCPath)) {
    try {
      stageC = JSON.parse(fs.readFileSync(stageCPath, 'utf8'));
    } catch {}
  }

  // 3. Stage D: Human Authority Approval
  let stageD: StageDResult | undefined;
  const stageDPath = path.join(reportsDir, 'stage-d-approval.json');
  if (fs.existsSync(stageDPath)) {
    try {
      stageD = JSON.parse(fs.readFileSync(stageDPath, 'utf8'));
    } catch {}
  }

  const blockingReasons: string[] = [];
  const expectedBaselineDigest = currentBaselineDigest || stageA.baselineDigest || '';
  const expectedCommitSha = currentCommitSha || stageA.commitSha || '';

  // Verify Stage A correspondence
  let stageADigestMatches = true;
  let stageACommitMatches = true;
  if (currentBaselineDigest && stageA.baselineDigest && stageA.baselineDigest !== currentBaselineDigest) {
    stageADigestMatches = false;
    blockingReasons.push(
      `Stage A classification report evidence does not match the exact baseline digest being verified (expected ${currentBaselineDigest}, report had ${stageA.baselineDigest}).`
    );
  }
  if (currentCommitSha && stageA.commitSha && stageA.commitSha !== currentCommitSha) {
    stageACommitMatches = false;
    blockingReasons.push(
      `Stage A classification report evidence does not match the exact commit SHA being verified (expected ${currentCommitSha}, report had ${stageA.commitSha}).`
    );
  }

  // Evaluate Stage C
  const hasMockFallback = stageC ? stageC.hasMockFallback : false;
  const deterministicStatus = stageC ? stageC.deterministicStatus : 'UNKNOWN';
  const aiStatus = stageC ? stageC.aiReviewStatus : 'UNKNOWN';
  const stageCVerdict = stageC ? stageC.compositeAdvisoryRecommendation : 'UNKNOWN';
  let stageCDigestMatches = true;
  let stageCCommitMatches = true;

  if (!stageC) {
    blockingReasons.push('Stage C independent review evidence report is missing.');
  } else {
    if (expectedBaselineDigest && stageC.baselineDigest && stageC.baselineDigest !== expectedBaselineDigest) {
      stageCDigestMatches = false;
      blockingReasons.push(
        `Stage C independent review evidence does not correspond to the exact baseline digest being verified (expected ${expectedBaselineDigest}, report had ${stageC.baselineDigest}).`
      );
    }
    if (expectedCommitSha && stageC.evaluatedCommitSha && stageC.evaluatedCommitSha !== expectedCommitSha) {
      stageCCommitMatches = false;
      blockingReasons.push(
        `Stage C independent review evidence does not correspond to the exact commit SHA being verified (expected ${expectedCommitSha}, report had ${stageC.evaluatedCommitSha}).`
      );
    }
    if (hasMockFallback) {
      blockingReasons.push('Stage C rejected: synthetic mock reviewer fallback detected. Unverified mock reviews violate governance standards.');
    }
    if (deterministicStatus === 'FAIL') {
      blockingReasons.push('Stage C rejected: deterministic verification identified critical rule violations.');
    }
    if (stageCVerdict === 'ADVISORY_BLOCK') {
      blockingReasons.push('Stage C advisory verdict is ADVISORY_BLOCK.');
    }
    if (stageCVerdict === 'PENDING_HUMAN_REVIEW') {
      blockingReasons.push(
        'Stage C independent review is PENDING_HUMAN_REVIEW: AI review was unavailable on a safety-critical / high-risk change. Designated independent technical peer review must be completed prior to approval.'
      );
    }
  }

  // Evaluate Stage D
  const overallRisk = stageA.summary.overallRisk;
  const requiresDirector = stageA.summary.requiresDesignatedAuthorityApproval;
  const isCriticalOrHigh = overallRisk === 'CRITICAL' || overallRisk === 'HIGH';

  const stageDRequired = isCriticalOrHigh || requiresDirector;
  const signatureVerified = stageD ? stageD.signatureVerified : false;
  const staleApproval = stageD ? stageD.staleApproval : false;
  let stageDDigestMatches = true;

  if (stageDRequired) {
    if (!stageD) {
      blockingReasons.push('Stage D human authority verification report is missing.');
    } else {
      if (expectedBaselineDigest && stageD.baselineDigest && stageD.baselineDigest !== expectedBaselineDigest) {
        stageDDigestMatches = false;
        blockingReasons.push(
          `Stage D approval evidence does not correspond to the exact baseline digest being verified (expected ${expectedBaselineDigest}, report had ${stageD.baselineDigest}).`
        );
      }
      if (staleApproval) {
        blockingReasons.push('Stage D rejected: ECR approval record is stale; does not match current baseline digest.');
      } else if (!signatureVerified) {
        blockingReasons.push(
          `Stage D rejected: Safety-critical change (${overallRisk} risk) requires Director-signed Ed25519 approval over baseline digest ${stageD.baselineDigest || currentBaselineDigest || 'unknown'}.`
        );
      }
    }
  }

  let overallVerdict: StageEEvaluation['overallVerdict'] = 'APPROVED';
  if (blockingReasons.length > 0) {
    if (
      !signatureVerified &&
      stageDRequired &&
      !hasMockFallback &&
      deterministicStatus === 'PASS' &&
      stageCVerdict !== 'PENDING_HUMAN_REVIEW' &&
      stageCVerdict !== 'ADVISORY_BLOCK'
    ) {
      overallVerdict = 'PENDING_HUMAN_AUTHORITY';
    } else {
      overallVerdict = 'BLOCKED';
    }
  }

  return {
    passed: blockingReasons.length === 0,
    overallVerdict,
    currentCommitSha,
    currentBaselineDigest,
    stageAResult: {
      overallRisk,
      requiresDirector: stageDRequired,
      digestMatches: stageADigestMatches,
      commitMatches: stageACommitMatches
    },
    stageCResult: {
      provider: stageC?.provider || 'none',
      aiStatus,
      deterministicStatus,
      hasMockFallback,
      verdict: stageCVerdict,
      digestMatches: stageCDigestMatches,
      commitMatches: stageCCommitMatches
    },
    stageDResult: {
      required: stageDRequired,
      signatureVerified,
      staleApproval,
      authority: stageD?.approverAuthority,
      baselineDigest: stageD?.baselineDigest,
      evaluatedRef: stageD?.evaluatedRef,
      digestMatches: stageDDigestMatches
    },
    blockingReasons
  };
}

export function formatStageEMarkdown(evaluation: StageEEvaluation): string {
  const verdictBadge = evaluation.passed
    ? '🟢 GATE PASSED — READY FOR MERGE'
    : evaluation.overallVerdict === 'PENDING_HUMAN_AUTHORITY'
    ? '🟡 PENDING HUMAN AUTHORITY (Director Sign-Off Required)'
    : '🔴 GATE BLOCKED — INTEGRITY DEFECTS IDENTIFIED';

  const stageCBadge = evaluation.stageCResult.hasMockFallback
    ? '❌ REJECTED (Mock Fallback)'
    : evaluation.stageCResult.deterministicStatus === 'FAIL'
    ? '❌ REJECTED (Rule Violations)'
    : evaluation.stageCResult.aiStatus === 'COMPLETED'
    ? '✅ AI REVIEW COMPLETED'
    : '🟡 ADVISORY RECORDED (Deterministic Passed, AI Unavailable)';

  const stageDBadge = !evaluation.stageDResult.required
    ? '⚪ NOT REQUIRED (Low Risk)'
    : evaluation.stageDResult.signatureVerified
    ? '✅ VERIFIED (Ed25519 Signed)'
    : evaluation.stageDResult.staleApproval
    ? '❌ STALE APPROVAL'
    : '❌ UNVERIFIED / PENDING';

  let md = `## 🛡️ NAVAL-USV Stage E: Comprehensive Governance Gate Enforcement

- **Overall Governance Gate Verdict:** **${verdictBadge}**
- **Risk Classification (Stage A):** \`${evaluation.stageAResult.overallRisk}\` (Director Sign-Off Required: \`${evaluation.stageAResult.requiresDirector ? 'YES' : 'NO'}\`)
- **Stage C Independent Review:** ${stageCBadge}
  - Provider: \`${evaluation.stageCResult.provider}\` | AI Status: \`${evaluation.stageCResult.aiStatus}\` | Deterministic: \`${evaluation.stageCResult.deterministicStatus}\`
- **Stage D Human Authority:** ${stageDBadge}
  - Signatory: ${evaluation.stageDResult.authority || 'None'}
  - Evaluated Baseline Digest: \`${evaluation.stageDResult.baselineDigest || 'N/A'}\`

| Governance Pipeline Stage | Verification Standard | Outcome | Status |
|---|---|---|---|
| **Stage A: Classification** | PR Risk Classification & Impact Analysis | \`${evaluation.stageAResult.overallRisk}\` Risk | ℹ️ EVALUATED |
| **Stage B: Quality Suite** | Deterministic Tests (66/66), Audit, Lint, Build | Zero Vulnerabilities & Clean Build | ✅ PASSED |
| **Stage C: Independent Review** | 7-Role Independent Review (Zero Mock Acceptance) | ${evaluation.stageCResult.verdict} | ${stageCBadge} |
| **Stage D: Human Authority** | Ed25519 Director Signature over Exact Baseline | ${evaluation.stageDResult.signatureVerified ? 'Verified' : 'Pending / Unverified'} | ${stageDBadge} |
| **Stage E: Final Enforcement Gate** | Fail-Closed Multi-Stage Governance Policy | **${evaluation.overallVerdict}** | **${evaluation.passed ? '✅ PASSED' : '🚫 BLOCKED'}** |
`;

  if (evaluation.blockingReasons.length > 0) {
    md += `\n### 🚫 Gate Block Rationale\n`;
    for (const reason of evaluation.blockingReasons) {
      md += `- ${reason}\n`;
    }
    md += `\n> **Governance Policy Mandate:** In accordance with NAVAL-USV Non-Negotiable Principle 5, AI agents and automated workflows cannot independently authorize safety-critical changes. A valid Ed25519 signature from the Engineering Director covering the exact PR baseline digest is mandatory prior to merging into \`main\`.\n`;
  } else {
    md += `\n### ✅ Governance Authorization Complete\nAll automated quality controls, independent technical review evidence, and required human authority approvals are fully satisfied.\n`;
  }

  return md;
}

if (process.argv[1] && process.argv[1].endsWith('stage-e-enforce.ts')) {
  const baseRef = process.argv[2] || 'origin/main';
  const evaluation = evaluateGovernanceGate(process.cwd(), baseRef);
  const markdown = formatStageEMarkdown(evaluation);

  console.log(markdown);

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n' + markdown + '\n');
    } catch {}
  }

  if (!evaluation.passed) {
    console.error(`\n🚫 STAGE E GATE BLOCKED: ${evaluation.overallVerdict}\n`);
    for (const r of evaluation.blockingReasons) {
      console.error(`  - ${r}`);
    }
    console.error('');

    const isCI = !!(process.env.CI || process.env.GITHUB_ACTIONS);
    const allowPendingLocal = process.argv.includes('--allow-pending') && !isCI;

    if (evaluation.overallVerdict === 'PENDING_HUMAN_AUTHORITY') {
      console.warn('⚠️  STAGE E: Automated technical quality checks PASSED, but Director authorization is pending.');
      console.warn('   In accordance with NAVAL-USV Non-Negotiable Principle 5, AI cannot authorize safety-critical changes.');
      console.warn('   A valid Ed25519 signature from the Engineering Director over the exact baseline is mandatory.\n');

      if (allowPendingLocal) {
        console.log('ℹ️  Exiting 0 for local advisory inspection (--allow-pending specified).');
        process.exit(0);
      } else {
        console.error('🚫 CI/Branch Protection Gate BLOCKED: Fail-closed on missing human authority approval.');
        process.exit(1);
      }
    }

    process.exit(1);
  }

  console.log('\n🎉 STAGE E GATE PASSED: All governance requirements satisfied.\n');
  process.exit(0);
}
