import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { computeBaselineDigest } from './ecr-approval.ts';

export type ChangeCategory =
  | 'DOCUMENTATION'
  | 'SOFTWARE'
  | 'ARCHITECTURE'
  | 'SECURITY'
  | 'SAFETY'
  | 'REQUIREMENTS'
  | 'CONFIGURATION'
  | 'RELEASE';

export type RiskClassification = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ApprovalRoute = 'ROUTINE_SOFTWARE' | 'SAFETY_CRITICAL_ENGINEERING';

export interface FileClassification {
  file: string;
  categories: ChangeCategory[];
  risk: RiskClassification;
  linesAdded: number;
  linesDeleted: number;
}

export interface PRClassificationReport {
  summary: {
    totalFilesChanged: number;
    totalLinesAdded: number;
    totalLinesDeleted: number;
    dominantCategories: ChangeCategory[];
    overallRisk: RiskClassification;
    approvalRoute: ApprovalRoute;
    requiresIndependentEngineeringReview: boolean;
    requiresDesignatedAuthorityApproval: boolean;
    requiresECR: boolean;
  };
  commitSha?: string;
  baselineDigest?: string;
  fileDetails: FileClassification[];
  timestamp: string;
}

export function classifyFile(filePath: string): { categories: ChangeCategory[]; risk: RiskClassification } {
  const norm = filePath.replace(/\\/g, '/');
  const categories: ChangeCategory[] = [];
  let risk: RiskClassification = 'LOW';

  // A change to the autonomy/safety-evidence path or the authority gate
  // is safety-critical even when it sits in a generic verification or docs
  // directory. Do not infer risk solely from filename extension.
  const autonomyOrSafetyAcceptance = (
    /^src\/core\/verification\/(Autonomy[^/]*|SafetyScenarioSuite|MarineSystemsSuite|AcceptanceGate)\.ts$/i.test(norm) ||
    norm === 'src/components/SoftwareAutonomyView.tsx' ||
    /^tests\/(autonomy[^/]*|governance)\.test\.ts$/i.test(norm) ||
    /^docs\/AUT01_/i.test(norm) ||
    norm === 'docs/CONSOLIDATED_ACCEPTANCE_REGISTER.md' ||
    norm.startsWith('evidence/aut01/')
  );
  const governanceAuthorityControl = (
    norm.startsWith('scripts/governance/') ||
    norm.startsWith('governance/approvals/') ||
    norm.startsWith('governance/ecr/')
  );

  // Category matching
  if (autonomyOrSafetyAcceptance || governanceAuthorityControl) {
    categories.push('SAFETY');
  }
  if (norm.startsWith('.github/') || norm.includes('package.json') || norm.includes('tsconfig.json') || norm.includes('vite.config.ts')) {
    categories.push('CONFIGURATION');
  }

  // Never silently downgrade marine verification, evidence acceptance, or
  // governance enforcement changes to ordinary MEDIUM-risk software/docs.
  // These files can alter whether an unsafe naval design is reported as accepted.
  if (
    norm.includes('src/core/safety/') ||
    norm.includes('src/core/auth/') ||
    norm.startsWith('scripts/governance/')
  ) {
    categories.push('SECURITY');
  }

  if (
    norm.includes('src/core/safety/') ||
    norm.includes('src/core/tools/naval/') ||
    norm.includes('types/safety.ts') ||
    norm.startsWith('src/core/verification/') ||
    /^tests\/(marineSystems|acceptanceGate|acceptanceCampaign)/.test(norm)
  ) {
    categories.push('SAFETY');
  }

  if (
    norm.includes('USV01_PROJECT_CONTEXT.md') ||
    norm.startsWith('data/') ||
    norm.includes('src/data/') ||
    /^docs\/MAR[0-9]+_/.test(norm) ||
    norm.startsWith('governance/ecr/')
  ) {
    categories.push('REQUIREMENTS');
  }

  if (
    norm.includes('src/core/engine/') ||
    norm.includes('src/core/orchestrator/') ||
    norm.includes('src/core/models/') ||
    norm.includes('src/core/registry/')
  ) {
    categories.push('ARCHITECTURE');
  }

  if (norm.startsWith('src/components/') || norm.startsWith('src/utils/') || norm.endsWith('.tsx') || norm.endsWith('.ts')) {
    if (!categories.includes('ARCHITECTURE') && !categories.includes('SECURITY') && !categories.includes('SAFETY')) {
      categories.push('SOFTWARE');
    }
  }

  if (norm.endsWith('.md') || norm.startsWith('docs/')) {
    categories.push('DOCUMENTATION');
  }

  if (norm.includes('RELEASE_MANIFEST') || norm.includes('governance/release/')) {
    categories.push('RELEASE');
  }

  if (categories.length === 0) {
    categories.push('SOFTWARE');
  }

  // Risk Assignment
  if (
    categories.includes('SAFETY') ||
    categories.includes('SECURITY') ||
    norm.startsWith('.github/workflows/') ||
    norm === '.github/CODEOWNERS' ||
    norm === 'USV01_PROJECT_CONTEXT.md'
  ) {
    risk = 'CRITICAL';
  } else if (
    categories.includes('ARCHITECTURE') ||
    categories.includes('REQUIREMENTS') ||
    norm === 'server.ts' ||
    norm === 'package.json'
  ) {
    risk = 'HIGH';
  } else if (categories.includes('SOFTWARE') || categories.includes('CONFIGURATION')) {
    risk = 'MEDIUM';
  } else {
    risk = 'LOW';
  }

  return { categories, risk };
}

export function generateClassificationReport(baseRef = 'origin/main', rootDir = process.cwd()): PRClassificationReport {
  let diffStat = '';
  try {
    diffStat = execSync(`git diff --numstat ${baseRef}...HEAD`, { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch {}

  if (!diffStat.trim()) {
    try {
      diffStat = execSync('git diff --numstat HEAD~1...HEAD', { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    } catch {
      try {
        diffStat = execSync('git diff --numstat --staged', { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      } catch {}
    }
  }

  const lines = diffStat.trim().split('\n').filter(Boolean);
  const fileDetails: FileClassification[] = [];
  let totalAdded = 0;
  let totalDeleted = 0;
  const categoryCounts = new Map<ChangeCategory, number>();
  const riskLevels: RiskClassification[] = [];

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const added = parts[0] === '-' ? 0 : parseInt(parts[0], 10);
    const deleted = parts[1] === '-' ? 0 : parseInt(parts[1], 10);
    const file = parts[2];

    totalAdded += added;
    totalDeleted += deleted;

    const { categories, risk } = classifyFile(file);
    riskLevels.push(risk);

    for (const cat of categories) {
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }

    fileDetails.push({
      file,
      categories,
      risk,
      linesAdded: added,
      linesDeleted: deleted
    });
  }

  // Determine overall risk
  let overallRisk: RiskClassification = 'LOW';
  if (riskLevels.includes('CRITICAL')) {
    overallRisk = 'CRITICAL';
  } else if (riskLevels.includes('HIGH')) {
    overallRisk = 'HIGH';
  } else if (riskLevels.includes('MEDIUM') || totalAdded + totalDeleted > 400) {
    overallRisk = 'MEDIUM';
  }

  const dominantCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0]);

  const requiresDesignatedAuthorityApproval = overallRisk === 'HIGH' || overallRisk === 'CRITICAL';
  // LOW/MEDIUM changes still require the repository's independent GitHub review
  // and required CI checks.  Only HIGH/CRITICAL changes alter an engineering
  // baseline and therefore require the additional independent engineering
  // review and cryptographic Project Lead authorization path.
  const approvalRoute: ApprovalRoute = requiresDesignatedAuthorityApproval
    ? 'SAFETY_CRITICAL_ENGINEERING'
    : 'ROUTINE_SOFTWARE';
  const requiresECR = requiresDesignatedAuthorityApproval;

  const headRef = process.env.PR_HEAD_SHA || 'HEAD';
  let commitSha = '';
  let baselineDigest = '';
  try {
    commitSha = execSync(`git rev-parse ${headRef}`, { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    baselineDigest = computeBaselineDigest(headRef, rootDir);
  } catch {}

  return {
    summary: {
      totalFilesChanged: fileDetails.length,
      totalLinesAdded: totalAdded,
      totalLinesDeleted: totalDeleted,
      dominantCategories: dominantCategories.length ? dominantCategories : ['SOFTWARE'],
      overallRisk,
      approvalRoute,
      requiresIndependentEngineeringReview: requiresDesignatedAuthorityApproval,
      requiresDesignatedAuthorityApproval,
      requiresECR
    },
    commitSha,
    baselineDigest,
    fileDetails,
    timestamp: new Date().toISOString()
  };
}

export function formatReportMarkdown(report: PRClassificationReport): string {
  const s = report.summary;
  const badgeMap: Record<RiskClassification, string> = {
    CRITICAL: '🔴 CRITICAL RISK',
    HIGH: '🟠 HIGH RISK',
    MEDIUM: '🟡 MEDIUM RISK',
    LOW: '🟢 LOW RISK'
  };

  return `### 🛡️ NAVAL-USV Stage A: Change & Risk Classification Report

| Metric | Assessment |
|---|---|
| **Overall Change Risk** | **${badgeMap[s.overallRisk]}** |
| **Approval Route** | **${s.approvalRoute === 'SAFETY_CRITICAL_ENGINEERING' ? 'Safety-Critical Engineering' : 'Routine Software'}** |
| **Change Categories** | \`${s.dominantCategories.join(', ')}\` |
| **Files Modified** | \`${s.totalFilesChanged}\` |
| **Lines Changed** | \`+${s.totalLinesAdded} / -${s.totalLinesDeleted}\` |
| **Independent Engineering Review Required** | **${s.requiresIndependentEngineeringReview ? 'YES (High/Critical change)' : 'NO (GitHub independent review still required)'}** |
| **Designated Authority Approval Required** | **${s.requiresDesignatedAuthorityApproval ? 'YES (Engineering Director)' : 'NO (Independent GitHub review)'}** |
| **Engineering Change Request (ECR) Required** | **${s.requiresECR ? 'YES (Mandatory for High/Critical)' : 'NO (Optional)'}** |

#### Modified File Classifications
| File | Categories | Risk Level | Diff (+/-) |
|---|---|---|---|
${report.fileDetails.map(f => `| \`${f.file}\` | ${f.categories.join(', ')} | **${f.risk}** | +${f.linesAdded} / -${f.linesDeleted} |`).join('\n')}

> **Governance Notice:** AI tools may review or challenge this change, but **cannot authorise merge**. Every change requires an independent GitHub approval. Safety-critical engineering changes additionally require the evidence and signed-authority controls above.
`;
}

if (process.argv[1] && process.argv[1].endsWith('classify-change.ts')) {
  const baseRef = process.argv[2] || 'origin/main';
  const report = generateClassificationReport(baseRef);
  const outDir = path.join(process.cwd(), 'governance', 'reports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outDir, 'pr-classification.json'), JSON.stringify(report, null, 2));
  console.log(formatReportMarkdown(report));
}
