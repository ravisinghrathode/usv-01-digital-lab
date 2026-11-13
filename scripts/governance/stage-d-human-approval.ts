import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { generateClassificationReport } from './classify-change.ts';
import { validateECRFile } from './ecr-tool.ts';
import { computeBaselineDigest, loadApprovalRecords, resolveDirectorPublicKey, verifyApproval } from './ecr-approval.ts';

// Safely load .env without requiring third-party dependencies
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = (match[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
        }
      }
    }
  } catch {}
}
loadEnv();

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
  forceRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}


/**
 * A GitHub peer approval is independent only if its reviewer is an authorized
 * collaborator (not the author), their latest review remains APPROVED, and it
 * was submitted on the exact PR head being evaluated. An earlier approval
 * cannot authorize subsequent code changes.
 */
export function hasCurrentHeadIndependentApproval(
  reviews: ReadonlyArray<{
    id?: number;
    state?: string;
    commit_id?: string;
    submitted_at?: string;
    author_association?: string;
    user?: { login?: string };
  }>,
  authorLogin: string,
  exactHeadSha: string
): boolean {
  if (!authorLogin || !/^[0-9a-f]{40}$/i.test(exactHeadSha)) return false;
  const latest = new Map<string, (typeof reviews)[number]>();
  for (const review of [...reviews].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))) {
    const login = review.user?.login?.toLowerCase();
    if (login) latest.set(login, review);
  }
  return [...latest.entries()].some(([login, review]) =>
    login !== authorLogin.toLowerCase() &&
    review.state === 'APPROVED' &&
    review.commit_id === exactHeadSha &&
    !!review.submitted_at &&
    ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(review.author_association || '')
  );
}

function hasLiveIndependentApproval(exactHeadSha: string): boolean {
  const repository = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  // Outside a real authenticated PR job, fail closed rather than trusting
  // stale fixture reviews or branch-local claims.
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !eventPath) {
    return false;
  }
  try {
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf-8'));
    const pr = event.pull_request;
    if (!Number.isSafeInteger(pr?.number) || pr.number <= 0 ||
        pr.head?.sha !== exactHeadSha || !pr.user?.login) return false;
    const reviews: Array<{
      id?: number;
      state?: string;
      commit_id?: string;
      submitted_at?: string;
      author_association?: string;
      user?: { login?: string };
    }> = [];
    for (let page = 1; page <= 10; page++) {
      const endpoint = `repos/${repository}/pulls/${pr.number}/reviews?per_page=100&page=${page}`;
      const response = execFileSync('gh', ['api', endpoint], { encoding: 'utf-8' });
      const batch = JSON.parse(response);
      if (!Array.isArray(batch)) return false;
      reviews.push(...batch);
      if (batch.length < 100) {
        return hasCurrentHeadIndependentApproval(reviews, pr.user.login, exactHeadSha);
      }
    }
    // Never silently accept truncated history.
    return false;
  } catch {
    return false;
  }
}

/**
 * Stage D: verifies that a Director-signed approval covers EXACTLY the content of the PR head.
 * The only files that may differ from the signed baseline are the approval records themselves.
 */
export function evaluateStageDHumanApproval(baseRef = 'origin/main', opts: StageDOptions = {}): StageDResult {
  const rootDir = opts.rootDir || process.cwd();
  const headRef = opts.headRef || (opts.rootDir ? 'HEAD' : (process.env.PR_HEAD_SHA || 'HEAD'));
  const evaluatedRef = execFileSync('git', ['rev-parse', headRef], { cwd: rootDir, encoding: 'utf-8' }).trim();

  const diffReport = generateClassificationReport(baseRef, rootDir);
  const highestRisk = opts.forceRisk ?? diffReport.summary.overallRisk;
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
  // A peer reviewer is mandatory for HIGH/CRITICAL changes. Verify the
  // authenticated GitHub review against the current PR head; do not let
  // a prior approval, self-review or untrusted contributor satisfy this gate.
  if (isCriticalOrHigh && hasLiveIndependentApproval(evaluatedRef)) {
    reviewStatus = 'APPROVED_BY_PEER';
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
    console.log('ℹ️  STAGE D: Human authority confirmation required via interactive prompt prior to merge.\n');
    process.exit(0);
  }
  console.log('✅ STAGE D ACCEPTED.\n');
}
