import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { generateClassificationReport } from './classify-change.ts';
import { validateAllECRs, validateECRFile, verifyECRSignature } from './ecr-tool.ts';

dotenv.config();

export interface StageDResult {
  humanApprovalRequired: boolean;
  highestRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ecrRecordFound: boolean;
  ecrRecordValid: boolean;
  approverAuthority?: string;
  approverRole?: string;
  approverId?: string;
  signatureVerified: boolean;
  signatureError?: string;
  independentReviewStatus: 'APPROVED_BY_PEER' | 'ECR_DIRECTOR_SIGNED' | 'PENDING_HUMAN_SIGN_OFF';
  summary: string;
}

export function evaluateStageDHumanApproval(baseRef = 'origin/main', customSigningKey?: string): StageDResult {
  const diffReport = generateClassificationReport(baseRef);
  const highestRisk = diffReport.summary.overallRisk;
  const isCriticalOrHigh = highestRisk === 'CRITICAL' || highestRisk === 'HIGH';

  const ecrDir = path.join(process.cwd(), 'governance', 'ecr');
  const ecrCheck = validateAllECRs(ecrDir);

  // Check if at least one approved ECR exists for this change
  let approvedECR: any = null;
  if (fs.existsSync(ecrDir)) {
    const files = fs.readdirSync(ecrDir).filter(f => f.startsWith('ECR-') && f.endsWith('.md'));
    for (const f of files) {
      const res = validateECRFile(path.join(ecrDir, f));
      if (res.valid && res.record?.approvalRecord?.decision === 'APPROVED') {
        approvedECR = res.record;
        break;
      }
    }
  }

  const hasApprovedECR = !!approvedECR;
  const signingKey = customSigningKey || process.env.DIRECTOR_SIGNING_KEY;

  let isCommitBound = false;
  let commitBindingError = '';
  if (hasApprovedECR) {
    try {
      const targetCommit = (approvedECR.implementationCommit || '').trim();
      const headSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      let commits: string[] = [];
      try {
        commits = execSync('git rev-list origin/main..HEAD 2>/dev/null', { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
      } catch {
        commits = [headSha];
      }
      if (commits.length === 0) commits = [headSha];

      // Verify the authorized commit is either the current HEAD or in the branch commit set
      isCommitBound = targetCommit.length >= 7 && (
        commits.some(c => c.startsWith(targetCommit) || targetCommit.startsWith(c)) ||
        headSha.startsWith(targetCommit) || targetCommit.startsWith(headSha)
      );

      if (!isCommitBound) {
        commitBindingError = `ECR is bound to commit '${targetCommit}', which is not in this change set (HEAD: ${headSha.substring(0, 7)}). Stale or mismatched approvals are strictly rejected.`;
      }
    } catch (err: any) {
      commitBindingError = `Failed to verify commit binding in git: ${err?.message || err}`;
    }
  }

  const sigCheck = hasApprovedECR
    ? (!signingKey
        ? { verified: false, error: 'CRITICAL: No DIRECTOR_SIGNING_KEY securely provisioned in environment. Default key fallbacks are strictly prohibited.' }
        : (!isCommitBound
            ? { verified: false, error: commitBindingError }
            : verifyECRSignature(approvedECR, signingKey)))
    : { verified: false, error: 'No approved ECR found' };

  const signatureVerified = sigCheck.verified;

  let reviewStatus: StageDResult['independentReviewStatus'] = 'PENDING_HUMAN_SIGN_OFF';
  if (hasApprovedECR && approvedECR.approvalRecord.authorityRole === 'ENGINEERING_DIRECTOR' && signatureVerified) {
    reviewStatus = 'ECR_DIRECTOR_SIGNED';
  }

  // Check GitHub PR review state if gh CLI is available
  try {
    const prJson = execSync('gh pr view --json reviews,author,state 2>/dev/null', { encoding: 'utf-8' });
    const prData = JSON.parse(prJson);
    const peerApproved = prData.reviews?.some((r: any) => r.state === 'APPROVED' && r.author?.login !== prData.author?.login);
    if (peerApproved) {
      reviewStatus = 'APPROVED_BY_PEER';
    }
  } catch {
    // Local execution or PR not yet created
  }

  let summary = '';
  if (isCriticalOrHigh) {
    if (!hasApprovedECR) {
      summary = `Stage D Gate Blocked: Change classified as ${highestRisk} risk requiring mandatory Engineering Director sign-off, but no approved ECR record was found in governance/ecr/.`;
    } else if (!signingKey) {
      summary = `Stage D Gate Blocked: Change classified as ${highestRisk} risk. Approved ECR ${approvedECR.changeId} found, but no DIRECTOR_SIGNING_KEY was provisioned in environment. Fallback keys are barred.`;
    } else if (!isCommitBound) {
      summary = `Stage D Gate Blocked: Change classified as ${highestRisk} risk. Approved ECR ${approvedECR.changeId} is not bound to current change: ${commitBindingError}`;
    } else if (!signatureVerified) {
      summary = `Stage D Gate Blocked: Change classified as ${highestRisk} risk. Approved ECR ${approvedECR.changeId} found, but cryptographic HMAC signature verification failed: ${sigCheck.error || 'Invalid HMAC signature'}.`;
    } else {
      summary = `Stage D Gate Passed: Change classified as ${highestRisk} risk. Verified Engineering Director closure recorded under ${approvedECR.changeId} (Authority: ${approvedECR.approvalRecord.authorityName} [${approvedECR.approvalRecord.authorityId}]) cryptographically bound to commit '${approvedECR.implementationCommit}'.`;
    }
  } else {
    summary = `Stage D Gate Bypassed: Change classified as ${highestRisk} risk. Standard developer sign-off permitted.`;
  }

  return {
    humanApprovalRequired: isCriticalOrHigh,
    highestRisk,
    ecrRecordFound: hasApprovedECR,
    ecrRecordValid: hasApprovedECR && signatureVerified,
    approverAuthority: approvedECR?.approvalRecord?.authorityName,
    approverRole: approvedECR?.approvalRecord?.authorityRole,
    approverId: approvedECR?.approvalRecord?.authorityId,
    signatureVerified,
    independentReviewStatus: reviewStatus,
    summary
  };
}

if (process.argv[1] && process.argv[1].endsWith('stage-d-human-approval.ts')) {
  console.log('🏛️  [Stage D: Governance Gate] Executing Human Authority & ECR Authorization Verification...\n');
  const baseRef = process.argv[2] || 'origin/main';
  const result = evaluateStageDHumanApproval(baseRef);

  console.log(`Risk Regime:                 ${result.highestRisk}`);
  console.log(`Human Authority Required:    ${result.humanApprovalRequired ? 'YES (MANDATORY)' : 'NO'}`);
  console.log(`ECR Record Present:          ${result.ecrRecordFound ? '✅ YES' : '❌ NO'}`);
  console.log(`Signatory Authority:         ${result.approverAuthority || 'None'} [${result.approverRole || 'N/A'}]`);
  console.log(`Signatory ID:                ${result.approverId || 'None'}`);
  console.log(`Cryptographic Signature:     ${result.signatureVerified ? '✅ VERIFIED' : '❌ UNVERIFIED'}`);
  console.log(`Review / Dual-Key Status:    ${result.independentReviewStatus}\n`);
  console.log(`Summary: ${result.summary}\n`);

  if (result.humanApprovalRequired && (!result.ecrRecordFound || !result.signatureVerified)) {
    console.error('❌ STAGE D REJECTED: Safety-critical changes require verified human Engineering Director approval.\n');
    process.exit(1);
  }

  console.log('✅ STAGE D ACCEPTED: Human authority verification criteria satisfied.\n');
}
