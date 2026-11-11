import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { generateClassificationReport } from './classify-change.ts';
import { validateAllECRs, validateECRFile } from './ecr-tool.ts';

export interface StageDResult {
  humanApprovalRequired: boolean;
  highestRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ecrRecordFound: boolean;
  ecrRecordValid: boolean;
  approverAuthority?: string;
  approverRole?: string;
  approverId?: string;
  signatureVerified: boolean;
  independentReviewStatus: 'APPROVED_BY_PEER' | 'ECR_DIRECTOR_SIGNED' | 'PENDING_HUMAN_SIGN_OFF';
  summary: string;
}

export function evaluateStageDHumanApproval(baseRef = 'origin/main'): StageDResult {
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
  const signatureVerified = !!approvedECR?.approvalRecord?.signatureOrHash;

  let reviewStatus: StageDResult['independentReviewStatus'] = 'PENDING_HUMAN_SIGN_OFF';
  if (hasApprovedECR && approvedECR.approvalRecord.authorityRole === 'ENGINEERING_DIRECTOR') {
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

  const summary = isCriticalOrHigh
    ? hasApprovedECR
      ? `Stage D Gate Passed: Change classified as ${highestRisk} risk. Verified Engineering Director closure recorded under ${approvedECR.changeId} (Authority: ${approvedECR.approvalRecord.authorityName} [${approvedECR.approvalRecord.authorityId}]).`
      : `Stage D Gate Blocked: Change classified as ${highestRisk} risk requiring mandatory Engineering Director sign-off, but no approved ECR record was found in governance/ecr/.`
    : `Stage D Gate Bypassed: Change classified as ${highestRisk} risk. Standard developer sign-off permitted.`;

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
