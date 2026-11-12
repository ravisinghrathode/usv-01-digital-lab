import fs from 'fs';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import dotenv from 'dotenv';
import { generateClassificationReport } from './classify-change.ts';
import { validateECRFile } from './ecr-tool.ts';
import { computeBaselineDigest, loadApprovalRecords, resolveDirectorPublicKey, verifyApproval } from './ecr-approval.ts';

dotenv.config();

export interface StageDResult {
  humanApprovalRequired: boolean;
  highestRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ecrRecordFound: boolean;
  ecrRecordValid: boolean;
  approverAuthority?: string;
  approverRole?: string;
  approverId?: string;
  approvedChangeId?: string;
  evaluatedRef: string;
  baselineDigest: string;
  signatureVerified: boolean;
  staleApproval: boolean;
  signatureError?: string;
  independentReviewStatus: 'APPROVED_BY_PEER' | 'ECR_DIRECTOR_SIGNED' | 'PENDING_HUMAN_SIGN_OFF';
  summary: string;
}

export interface StageDOptions {
  /** Commit to evaluate. In CI this MUST be the PR head SHA, not the synthetic merge commit. */
  headRef?: string;
  /** PEM public key override (tests). Production reads DIRECTOR_PUBLIC_KEY only. */
  publicKeyPem?: string;
  rootDir?: string;
}

/**
 * Stage D: verifies that a Director-signed approval covers EXACTLY the content of the PR head.
 * The only files that may differ from the signed baseline are the approval records themselves.
 */
export function evaluateStageDHumanApproval(baseRef = 'origin/main', opts: StageDOptions = {}): StageDResult {
  const rootDir = opts.rootDir || process.cwd();
  const headRef = opts.headRef || process.env.PR_HEAD_SHA || 'HEAD';
  const evaluatedRef = execFileSync('git', ['rev-parse', headRef], { cwd: rootDir, encoding: 'utf-8' }).trim();

  const diffReport = generateClassificationReport(baseRef);
  const highestRisk = diffReport.summary.overallRisk;
  const isCriticalOrHigh = highestRisk === 'CRITICAL' || highestRisk === 'HIGH';

  const baselineDigest = computeBaselineDigest(evaluatedRef, rootDir);
  const publicKeyPem = opts.publicKeyPem ?? resolveDirectorPublicKey();

  const approvals = loadApprovalRecords(rootDir);
  let accepted: (typeof approvals)[number] | undefined;
  let staleApproval = false;
  const errors: string[] = [];

  for (const a of approvals) {
    if (!a.record) {
      errors.push(`${a.file}: unparseable (${a.parseError})`);
      continue;
    }
    const v = verifyApproval(a.record, { publicKeyPem, expectedDigest: baselineDigest });
    if (v.verified) {
      // The approval must reference a real, structurally valid ECR document in this baseline.
      const ecrDir = path.join(rootDir, 'governance', 'ecr');
      const ecrFile = fs.existsSync(ecrDir) ? fs.readdirSync(ecrDir).find(f => f.startsWith(String(a.record!.changeId)) && f.endsWith('.md')) : undefined;
      const ecrCheck = ecrFile ? validateECRFile(path.join(ecrDir, ecrFile)) : { valid: false, errors: ['ECR document not found'] };
      if (!ecrCheck.valid) {
        errors.push(`${a.file}: signature valid but ECR document invalid (${ecrCheck.errors.join('; ')})`);
        continue;
      }
      accepted = a;
      break;
    }
    if (v.stale) staleApproval = true;
    errors.push(`${a.file}: ${v.error}`);
  }

  const signatureVerified = !!accepted;
  const signatureError = signatureVerified ? undefined : (errors.join(' | ') || 'No Director approval records found in governance/approvals/.');

  let reviewStatus: StageDResult['independentReviewStatus'] = signatureVerified ? 'ECR_DIRECTOR_SIGNED' : 'PENDING_HUMAN_SIGN_OFF';
  try {
    const prData = JSON.parse(execSync('gh pr view --json reviews,author 2>/dev/null', { encoding: 'utf-8' }));
    if (prData.reviews?.some((r: any) => r.state === 'APPROVED' && r.author?.login !== prData.author?.login)) {
      reviewStatus = 'APPROVED_BY_PEER';
    }
  } catch {
    // Local execution or no PR context
  }

  let summary: string;
  if (!isCriticalOrHigh) {
    summary = `Stage D not required: change classified as ${highestRisk} risk.`;
  } else if (!publicKeyPem) {
    summary = `Stage D Gate Blocked: ${highestRisk} risk change, but DIRECTOR_PUBLIC_KEY is not provisioned. There is no fallback trust anchor.`;
  } else if (signatureVerified) {
    const r = accepted!.record!;
    summary = `Stage D Gate Passed: ${highestRisk} risk change. Director approval ${r.changeId} (${r.authorityName} [${r.authorityId}]) is Ed25519-verified and covers baseline ${baselineDigest} at ${evaluatedRef.substring(0, 7)}.`;
  } else if (staleApproval) {
    summary = `Stage D Gate Blocked: ${highestRisk} risk change. ${signatureError}`;
  } else {
    summary = `Stage D Gate Blocked: ${highestRisk} risk change requires a Director-signed approval covering baseline ${baselineDigest}. ${signatureError}`;
  }

  return {
    humanApprovalRequired: isCriticalOrHigh,
    highestRisk,
    ecrRecordFound: approvals.length > 0,
    ecrRecordValid: signatureVerified,
    approverAuthority: accepted?.record?.authorityName,
    approverRole: accepted?.record?.authorityRole,
    approverId: accepted?.record?.authorityId,
    approvedChangeId: accepted?.record?.changeId,
    evaluatedRef,
    baselineDigest,
    signatureVerified,
    staleApproval,
    signatureError,
    independentReviewStatus: reviewStatus,
    summary
  };
}

export function formatStageDMarkdown(result: StageDResult): string {
  const statusBadge = result.signatureVerified
    ? '🟢 APPROVED & VERIFIED (Ed25519)'
    : result.staleApproval
    ? '🔴 STALE APPROVAL'
    : '🟡 PENDING HUMAN SIGN-OFF';

  return `## 🏛️ NAVAL-USV Stage D: Human Authority & Baseline Verification

- **Governance Verdict:** **${statusBadge}**
- **Evaluated Commit:** \`${result.evaluatedRef}\`
- **Baseline Content Digest:** \`${result.baselineDigest}\`
- **Risk Classification:** \`${result.highestRisk}\`
- **Human Authority Required:** \`${result.humanApprovalRequired ? 'YES (MANDATORY)' : 'NO'}\`
- **Signatory Authority:** ${result.approverAuthority || 'None'} [${result.approverRole || 'N/A'}]
- **Review / Signature Status:** \`${result.independentReviewStatus}\`
- **Assessment Summary:** ${result.summary}
`;
}

if (process.argv[1] && process.argv[1].endsWith('stage-d-human-approval.ts')) {
  console.log('🏛️  [Stage D: Governance Gate] Executing Human Authority & ECR Authorization Verification...\n');
  const baseRef = process.argv[2] || 'origin/main';
  const result = evaluateStageDHumanApproval(baseRef);

  console.log(`Evaluated commit:            ${result.evaluatedRef}`);
  console.log(`Baseline digest:             ${result.baselineDigest}`);
  console.log(`Risk Regime:                 ${result.highestRisk}`);
  console.log(`Human Authority Required:    ${result.humanApprovalRequired ? 'YES (MANDATORY)' : 'NO'}`);
  console.log(`Approval records present:    ${result.ecrRecordFound ? 'YES' : 'NO'}`);
  console.log(`Signatory Authority:         ${result.approverAuthority || 'None'} [${result.approverRole || 'N/A'}]`);
  console.log(`Ed25519 Signature:           ${result.signatureVerified ? '✅ VERIFIED (exact baseline)' : result.staleApproval ? '❌ STALE' : '❌ UNVERIFIED'}`);
  console.log(`Review Status:               ${result.independentReviewStatus}\n`);
  console.log(`Summary: ${result.summary}\n`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n' + formatStageDMarkdown(result) + '\n');
    } catch {
      // Ignore step summary write error
    }
  }

  const outDir = path.join(process.cwd(), 'governance', 'reports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'stage-d-approval.json'), JSON.stringify(result, null, 2));

  if (result.humanApprovalRequired && !result.signatureVerified) {
    console.error('❌ STAGE D REJECTED: Safety-critical changes require a Director approval signed over this exact baseline.\n');
    process.exit(1);
  }
  console.log('✅ STAGE D ACCEPTED.\n');
}
