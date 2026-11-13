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
/** Risk severity and approval purpose are intentionally independent. */
export type ApprovalRoute =
  | 'ROUTINE_SOFTWARE'
  | 'RESTRICTED_LAB_SOFTWARE'
  | 'PROTECTED_SOFTWARE_SECURITY'
  | 'SAFETY_CRITICAL_ENGINEERING';

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
    requiresIndependentSoftwareReview: boolean;
    requiresIndependentPeerApproval: boolean;
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

/**
 * Authoritative path-only approval routing: no labels, PR body text, branch
 * variables or "research only" flags can downgrade the route.
 *
 * Precedence: vessel engineering authority > software security authority >
 * restricted research > routine. High severity alone does NOT mean an
 * engineering baseline has been changed.
 */
export function isVesselEngineeringAuthorityPath(file: string): boolean {
  const p = file.replace(/\\/g, '/');
  return p.startsWith('src/core/tools/naval/') ||
    p.startsWith('governance/ecr/') ||
    p.startsWith('governance/approvals/') ||
    p.startsWith('governance/release/') ||
    p === 'RELEASE_MANIFEST.json' ||
    p === 'USV01_PROJECT_CONTEXT.md' ||
    p.startsWith('data/') ||
    p.startsWith('src/data/') ||
    /^docs\\/MAR[0-9]+_/.test(p) ||
    /^docs\\/AUT01_/.test(p) ||
    p === 'docs/CONSOLIDATED_ACCEPTANCE_REGISTER.md' ||
    p.startsWith('evidence/aut01/') ||
    /^src\\/core\\/verification\\/(Autonomy[^/]*|SafetyScenarioSuite|MarineSystemsSuite|AcceptanceGate)\\.ts$/i.test(p) ||
    p === 'src/components/SoftwareAutonomyView.tsx' ||
    /^tests\\/(autonomy[^/]*|marineSystems|acceptanceGate|acceptanceCampaign)/i.test(p);
}

export function isProtectedSoftwareAuthorityPath(file: string): boolean {
  const p = file.replace(/\\/g, '/');
  return p.startsWith('scripts/governance/') ||
    p.startsWith('.github/') ||
    p.startsWith('src/core/auth/') ||
    p.startsWith('src/core/governance/') ||
    p.startsWith('src/core/safety/') ||
    p.startsWith('src/core/models/') ||
    p.startsWith('src/core/mission-control/') ||
    p.startsWith('src/core/verification/EngineeringCampaignAcceptance.') ||
    p.startsWith('src/core/verification/LiveAgentMatrix.') ||
    p.startsWith('src/core/verification/RoleAccuracyAudit.') ||
    p === 'server.ts' ||
    p === 'package.json' ||
    p === 'bun.lock' ||
    p === 'tsconfig.json' ||
    p === 'vite.config.ts' ||
    p === '.gitignore';
}

export function isRestrictedLabResearchPath(file: string): boolean {
  const p = file.replace(/\\/g, '/');
  return p.startsWith('src/core/agents/') ||
    p.startsWith('src/core/registry/') ||
    p.startsWith('src/core/orchestrator/') ||
    p.startsWith('src/core/verification/') ||
    p.startsWith('scripts/run-codex-agent-campaign.') ||
    p.startsWith('scripts/run-concept-discovery.') ||
    p.startsWith('scripts/run-design-loop.') ||
    p.startsWith('scripts/engineering/') ||
    p.startsWith('tests/') ||
    p.startsWith('evidence/live-agents/') ||
    p.startsWith('references/') ||
    p.startsWith('docs/LAB_COMMISSIONING_') ||
    p.startsWith('docs/USV01_26_AGENT_');
}

export function approvalRouteForChangedFiles(files: readonly string[]): ApprovalRoute {
  // Missing/damaged diff data must never implicitly certify a software change
  // as low risk. The final Stage E gate additionally requires real Git diff.
  if (!files.length) return 'PROTECTED_SOFTWARE_SECURITY';
  if (files.some(isVesselEngineeringAuthorityPath)) return 'SAFETY_CRITICAL_ENGINEERING';
  if (files.some(isProtectedSoftwareAuthorityPath)) return 'PROTECTED_SOFTWARE_SECURITY';
  if (files.some(p => {
    const risk = classifyFile(p).risk;
    return risk === 'HIGH' || risk === 'CRITICAL';
  } && !isRestrictedLabResearchPath(p))) return 'PROTECTED_SOFTWARE_SECURITY';
  if (files.some(isRestrictedLabResearchPath)) return 'RESTRICTED_LAB_SOFTWARE';
  return 'ROUTINE_SOFTWARE';
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

  // Never derive vessel-signature obligations from severity alone.
  const approvalRoute = approvalRouteForChangedFiles(fileDetails.map(f => f.file));
  const requiresDesignatedAuthorityApproval = approvalRoute === 'SAFETY_CRITICAL_ENGINEERING';
  const requiresIndependentSoftwareReview = approvalRoute === 'PROTECTED_SOFTWARE_SECURITY';
  const requiresIndependentPeerApproval = requiresDesignatedAuthorityApproval ||
    requiresIndependentSoftwareReview;
  const requiresIndependentEngineeringReview = requiresDesignatedAuthorityApproval;
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
      requiresIndependentEngineeringReview,
      requiresIndependentSoftwareReview,
      requiresIndependentPeerApproval,
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
| **Approval Route** | **${s.approvalRoute}** |
| **Change Categories** | \`${s.dominantCategories.join(', ')}\` |
| **Files Modified** | \`${s.totalFilesChanged}\` |
| **Lines Changed** | \`+${s.totalLinesAdded} / -${s.totalLinesDeleted}\` |
| **Independent Engineering Review Required** | **${s.requiresIndependentEngineeringReview ? 'YES (vessel engineering evidence/release)' : 'NO (not a vessel baseline)' }** |
| **Independent Software Peer Review Required** | **${s.requiresIndependentPeerApproval ? 'YES (exact PR head, protected route)' : 'NO (normal branch protections apply)' }** |
| **Designated Authority Approval Required** | **${s.requiresDesignatedAuthorityApproval ? 'YES (Engineering Director)' : 'NO (Independent GitHub review)'}** |
| **Engineering Change Request (ECR) Required** | **${s.requiresECR ? 'YES (vessel engineering authority route)' : 'NO (not vessel design approval)'}** |

#### Modified File Classifications
| File | Categories | Risk Level | Diff (+/-) |
|---|---|---|---|
${report.fileDetails.map(f => `| \`${f.file}\` | ${f.categories.join(', ')} | **${f.risk}** | +${f.linesAdded} / -${f.linesDeleted} |`).join('\n')}

> **Governance Notice:** Path-based routing cannot be overridden by PR metadata. Restricted research software is not a released vessel design. Protected software and governance changes require independent exact-head peer review; vessel-baseline changes additionally require Engineering Director Ed25519 approval. AI tools cannot authorise their own changes.
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
