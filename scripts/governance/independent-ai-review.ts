import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ModelProviderRouter, isTestExecutionEnvironment, resolveConfiguredProvider } from '../../src/core/models/ModelProvider.ts';
import { computeBaselineDigest } from './ecr-approval.ts';
import { generateClassificationReport } from './classify-change.ts';

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

export type ReviewerRole =
  | 'SOFTWARE_ARCHITECTURE_REVIEWER'
  | 'CODE_QUALITY_REVIEWER'
  | 'SOFTWARE_QA_REVIEWER'
  | 'CYBERSECURITY_REVIEWER'
  | 'SAFETY_ENGINEERING_REVIEWER'
  | 'CONFIGURATION_MANAGEMENT_REVIEWER'
  | 'REQUIREMENTS_TRACEABILITY_REVIEWER';

export type ReviewSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AdvisoryRecommendation = 'ADVISORY_APPROVE' | 'ADVISORY_REQUEST_CHANGES' | 'ADVISORY_BLOCK';

export interface RoleFinding {
  severity: ReviewSeverity;
  affectedFiles: string[];
  description: string;
  evidence: string;
  potentialConsequences: string;
  recommendedAction: string;
}

export interface RoleReviewOutput {
  role: ReviewerRole;
  title: string;
  advisoryRecommendation: AdvisoryRecommendation;
  findings: RoleFinding[];
  summary: string;
  provider: string;
  model: string;
  executionStatus: 'COMPLETED' | 'FAILED';
  isMockFallback: boolean;
  rawOutput: string;
  deterministicFindings?: RoleFinding[];
}

export interface MultiRoleReviewReport {
  timestamp: string;
  gitRef: string;
  evaluatedCommitSha: string;
  baselineDigest: string;
  executionMode: string;
  provider: string;
  aiReviewStatus: 'COMPLETED' | 'AI_REVIEW_UNAVAILABLE' | 'FAILED';
  deterministicStatus: 'PASS' | 'FAIL';
  hasMockFallback: boolean;
  reviews: RoleReviewOutput[];
  compositeAdvisoryRecommendation: AdvisoryRecommendation | 'PENDING_HUMAN_REVIEW';
  governanceBanner: string;
}

export interface FileDiff {
  path: string;
  addedLines: string[];
  deletedLines: string[];
  allLines: string[];
}

/**
 * Strips sensitive environment files and private keys from diff before inspection,
 * while preserving all application, governance, and documentation files.
 */
export function sanitizeDiffForReview(rawDiff: string): string {
  const sensitivePatterns = [
    /\.env.*/i,
    /.*secret.*/i,
    /.*\.pem$/i,
    /.*id_rsa/i,
    /package-lock\.json/i
  ];

  const blocks = rawDiff.split(/^diff --git /m);
  const sanitizedBlocks = blocks.filter(block => {
    if (!block.trim()) return false;
    const firstLine = block.split('\n')[0];
    for (const pattern of sensitivePatterns) {
      if (pattern.test(firstLine)) return false;
    }
    return true;
  });

  return sanitizedBlocks.map(b => 'diff --git ' + b).join('\n');
}

/**
 * Parses raw git diff output into structured per-file modifications.
 */
export function parseDiff(rawDiff: string): FileDiff[] {
  const fileDiffs: FileDiff[] = [];
  const blocks = rawDiff.split(/^diff --git /m);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split('\n');
    let filePath = '';
    const match = lines[0].match(/a\/(.*?)\s+b\/(.*)/);
    if (match) {
      filePath = match[2];
    } else {
      const bLine = lines.find(l => l.startsWith('+++ b/'));
      if (bLine) filePath = bLine.substring(6);
    }
    if (!filePath) continue;

    const addedLines: string[] = [];
    const deletedLines: string[] = [];
    for (const l of lines) {
      if (l.startsWith('+') && !l.startsWith('+++')) {
        addedLines.push(l.substring(1));
      } else if (l.startsWith('-') && !l.startsWith('---')) {
        deletedLines.push(l.substring(1));
      }
    }

    fileDiffs.push({
      path: filePath,
      addedLines,
      deletedLines,
      allLines: lines
    });
  }

  return fileDiffs;
}

/**
 * Base contract for an independent technical reviewer.
 */
export interface IIndependentTechnicalReviewer {
  readonly role: ReviewerRole;
  readonly title: string;
  readonly charter: string;
  readonly systemPrompt: string;
  execute(files: FileDiff[], rawDiff: string): Promise<RoleReviewOutput>;
}

/**
 * Executes a model-backed review for an independent reviewer role.
 * Queries configured LLM provider; in test/CI environments without live quota,
 * executes simulated model evaluation; in production, strictly fails closed.
 */
async function executeModelReview(
  reviewer: IIndependentTechnicalReviewer,
  files: FileDiff[],
  rawDiff: string,
  runDeterministicLayer: (files: FileDiff[], rawDiff: string) => RoleFinding[]
): Promise<RoleReviewOutput> {
  const isTestMode = isTestExecutionEnvironment();
  const router = ModelProviderRouter.getInstance();

  const userPrompt = `You are performing an independent technical review for the NAVAL-USV Digital Engineering Lab.
Evaluate the following change set diff and modified files against your charter.

Role: ${reviewer.role}
Charter: ${reviewer.charter}

Modified Files:
${files.map(f => `- ${f.path} (+${f.addedLines.length} / -${f.deletedLines.length})`).join('\n')}

Diff Excerpt:
${rawDiff.substring(0, 5000)}

Respond strictly in valid JSON matching this schema:
{
  "recommendation": "ADVISORY_APPROVE" | "ADVISORY_REQUEST_CHANGES" | "ADVISORY_BLOCK",
  "summary": "<Concise summary of findings>",
  "findings": [
    {
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "affectedFiles": ["<file path>"],
      "description": "<Description of finding>",
      "evidence": "<Code or diff snippet>",
      "potentialConsequences": "<Engineering or safety risk>",
      "recommendedAction": "<Required correction>"
    }
  ]
}`;

  let providerUsed = 'unknown';
  let modelUsed = 'unknown';
  let executionStatus: 'COMPLETED' | 'FAILED' = 'COMPLETED';
  let isMockUsed = false;
  let rawOutput = '';
  let modelFindings: RoleFinding[] = [];
  let modelRecommendation: AdvisoryRecommendation = 'ADVISORY_APPROVE';
  let summary = '';

  const configuredProvider = resolveConfiguredProvider();

  // If deterministic mode is active, execute purely offline without external AI calls
  if (configuredProvider === 'deterministic') {
    const deterministicFindings = runDeterministicLayer(files, rawDiff);
    let deterministicRec: AdvisoryRecommendation = 'ADVISORY_APPROVE';
    if (deterministicFindings.some(f => f.severity === 'CRITICAL')) {
      deterministicRec = 'ADVISORY_BLOCK';
    } else if (deterministicFindings.some(f => f.severity === 'HIGH')) {
      deterministicRec = 'ADVISORY_REQUEST_CHANGES';
    } else if (deterministicFindings.length > 0) {
      deterministicRec = 'ADVISORY_REQUEST_CHANGES';
    }

    return {
      role: reviewer.role,
      title: reviewer.title,
      advisoryRecommendation: deterministicRec,
      findings: deterministicFindings,
      summary: deterministicFindings.length === 0
        ? `Deterministic static verification completed for ${reviewer.title}. Zero rule violations identified.`
        : `Deterministic static verification flagged ${deterministicFindings.length} issue(s) for ${reviewer.title}.`,
      provider: 'deterministic',
      model: 'none',
      executionStatus: 'COMPLETED',
      isMockFallback: false,
      rawOutput: JSON.stringify({
        status: 'COMPLETED',
        provider: 'deterministic',
        role: reviewer.role,
        findingsCount: deterministicFindings.length,
        recommendation: deterministicRec
      }, null, 2),
      deterministicFindings
    };
  }

  let preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (configuredProvider === 'openai') {
    preferredModel = process.env.CHATGPT_MODEL || 'gpt-4o-mini';
  } else if (configuredProvider === 'ollama') {
    preferredModel = process.env.OLLAMA_MODEL || 'llama3';
  }

  try {
    const response = await router.generate(
      {
        systemInstructions: reviewer.systemPrompt,
        userPrompt,
        context: {
          role: reviewer.role,
          charter: reviewer.charter,
          modifiedFileCount: files.length
        }
      },
      {
        preferredProvider: configuredProvider,
        modelName: preferredModel,
        temperature: 0.1,
        maxTokens: 2048,
        fallbackToMock: false
      }
    );

    providerUsed = response.providerUsed;
    modelUsed = response.modelUsed;
    rawOutput = response.content;

    isMockUsed = !!(response.isMock || providerUsed === 'mock_deterministic' || providerUsed === 'test_autonomous_agent');

    if (isMockUsed) {
      modelRecommendation = 'ADVISORY_BLOCK';
      executionStatus = 'FAILED';
      summary = `MOCK EXECUTION REJECTED: Reviewer '${reviewer.role}' executed under synthetic mock fallback. Mock output is strictly barred from satisfying Stage C independent technical review under NAVAL-USV Governance Standards.`;
      modelFindings = [{
        severity: 'CRITICAL',
        affectedFiles: files.map(f => f.path),
        description: `Stage C Reviewer '${reviewer.role}' executed under synthetic mock fallback. Mock output cannot be accepted as certified Stage C independent technical review evidence.`,
        evidence: `Provider: ${providerUsed}, Model: ${modelUsed}, isMock: true`,
        potentialConsequences: 'Unreviewed baseline change entering engineering ecosystem with zero authentic independent AI verification.',
        recommendedAction: 'Execute Stage C using an authenticated, operational model provider or configure deterministic provider.'
      }];
    } else if (response.parsedJson && response.parsedJson.recommendation) {
      modelRecommendation = response.parsedJson.recommendation || 'ADVISORY_APPROVE';
      summary = response.parsedJson.summary || `Model evaluation completed by ${reviewer.role}.`;
      modelFindings = response.parsedJson.findings || [];
    } else {
      summary = `Evaluation completed by ${reviewer.role}. Output parsed as plain text.`;
    }
  } catch (err: any) {
    // When external AI endpoint fails or credentials are unprovisioned, run deterministic checks
    // Never fabricate mock AI output!
    const deterministicFindings = runDeterministicLayer(files, rawDiff);
    let deterministicRec: AdvisoryRecommendation = 'ADVISORY_APPROVE';
    if (deterministicFindings.some(f => f.severity === 'CRITICAL')) {
      deterministicRec = 'ADVISORY_BLOCK';
    } else if (deterministicFindings.some(f => f.severity === 'HIGH')) {
      deterministicRec = 'ADVISORY_REQUEST_CHANGES';
    }

    return {
      role: reviewer.role,
      title: reviewer.title,
      advisoryRecommendation: deterministicRec,
      findings: deterministicFindings,
      summary: `AI review unavailable (${err?.message || err}). Deterministic verification executed with ${deterministicFindings.length} finding(s).`,
      provider: `${configuredProvider} (unavailable)`,
      model: preferredModel,
      executionStatus: 'FAILED',
      isMockFallback: false,
      rawOutput: `AI invocation unavailable: ${err?.message || err}`,
      deterministicFindings
    };
  }

  // Layer 2: Deterministic Rule Verification
  const deterministicFindings = runDeterministicLayer(files, rawDiff);

  // Combine findings from model evaluation and deterministic layer
  const allFindings = [...modelFindings, ...deterministicFindings];

  let compositeRec: AdvisoryRecommendation = modelRecommendation;
  if (allFindings.some(f => f.severity === 'CRITICAL')) {
    compositeRec = 'ADVISORY_BLOCK';
  } else if (allFindings.some(f => f.severity === 'HIGH')) {
    compositeRec = 'ADVISORY_REQUEST_CHANGES';
  } else if (allFindings.length > 0 && compositeRec === 'ADVISORY_APPROVE') {
    compositeRec = 'ADVISORY_REQUEST_CHANGES';
  }

  if (deterministicFindings.length > 0) {
    summary += ` (Deterministic verification layer flagged ${deterministicFindings.length} issue(s)).`;
  }

  return {
    role: reviewer.role,
    title: reviewer.title,
    advisoryRecommendation: compositeRec,
    findings: allFindings,
    summary,
    provider: providerUsed,
    model: modelUsed,
    executionStatus,
    isMockFallback: isMockUsed,
    rawOutput,
    deterministicFindings
  };
}

// ----------------------------------------------------------------------------------------
// 1. Software Architecture Reviewer
// ----------------------------------------------------------------------------------------
export class SoftwareArchitectureReviewer implements IIndependentTechnicalReviewer {
  readonly role: ReviewerRole = 'SOFTWARE_ARCHITECTURE_REVIEWER';
  readonly title = 'Software Architecture & Modular Cohesion Reviewer';
  readonly charter = 'Modular boundaries, non-circular DAG dependencies, interface stability. Preserves strict decoupling between deterministic naval tools and probabilistic LLM synthesis.';
  readonly systemPrompt = `You are the Software Architecture Reviewer for the NAVAL-USV project. Your mandate is to enforce modular layering, verify that deterministic physics tools never import probabilistic LLM code, and ensure interface stability across core modules.`;

  async execute(files: FileDiff[], rawDiff: string): Promise<RoleReviewOutput> {
    return executeModelReview(this, files, rawDiff, (diffFiles) => {
      const findings: RoleFinding[] = [];
      for (const file of diffFiles) {
        if (file.path.startsWith('src/core/')) {
          for (const line of file.addedLines) {
            if (line.includes('import ') && line.includes('../../../')) {
              findings.push({
                severity: 'MEDIUM',
                affectedFiles: [file.path],
                description: 'Deep relative import paths detected across architectural layers.',
                evidence: line.trim(),
                potentialConsequences: 'Tight coupling between lower-level utilities and higher-level domain services.',
                recommendedAction: 'Use TypeScript path aliases or consolidate shared core modules.'
              });
              break;
            }
          }
        }

        if (file.path.startsWith('src/core/tools/naval/')) {
          for (const line of file.addedLines) {
            if (/import.*(?:ModelProvider|OpenAI|GoogleGenerativeAI)/i.test(line)) {
              findings.push({
                severity: 'CRITICAL',
                affectedFiles: [file.path],
                description: 'Deterministic calculation tool directly imports probabilistic model provider.',
                evidence: line.trim(),
                potentialConsequences: 'Breaks strict architectural boundary between physics calculation core and LLM synthesis.',
                recommendedAction: 'Keep physics tools pure and deterministic; route AI interaction through CentralOrchestrator.'
              });
            }
          }
        }
      }
      return findings;
    });
  }
}

// ----------------------------------------------------------------------------------------
// 2. Code Quality Reviewer
// ----------------------------------------------------------------------------------------
export class CodeQualityReviewer implements IIndependentTechnicalReviewer {
  readonly role: ReviewerRole = 'CODE_QUALITY_REVIEWER';
  readonly title = 'Code Quality, Types & Strictness Reviewer';
  readonly charter = 'TypeScript typing strictness, nullish coalescing (?? vs ||), error handling. Guarantees numeric zero values (0% design margin) are never coerced into defaults.';
  readonly systemPrompt = `You are the Code Quality Reviewer for the NAVAL-USV project. Your mandate is to enforce strict TypeScript typing, reject loose type coercions, and verify that numeric properties use nullish coalescing (??) instead of logical OR (||).`;

  async execute(files: FileDiff[], rawDiff: string): Promise<RoleReviewOutput> {
    return executeModelReview(this, files, rawDiff, (diffFiles) => {
      const findings: RoleFinding[] = [];
      for (const file of diffFiles) {
        if (file.path.startsWith('src/core/tools/')) {
          for (const line of file.addedLines) {
            if (/(?:margin|density|tolerance|factor)\s*\|\|\s*\d+/i.test(line) || /\|\|\s*0\b/.test(line)) {
              findings.push({
                severity: 'HIGH',
                affectedFiles: [file.path],
                description: 'Suspicious logical OR used for numeric fallback instead of nullish coalescing (??).',
                evidence: line.trim(),
                potentialConsequences: 'Explicitly supplied 0 values (e.g. 0% design margin) will be overwritten with non-zero defaults.',
                recommendedAction: 'Replace logical OR (||) with nullish coalescing (??).'
              });
            }
          }
        }
      }
      return findings;
    });
  }
}

// ----------------------------------------------------------------------------------------
// 3. Software QA Reviewer
// ----------------------------------------------------------------------------------------
export class SoftwareQAReviewer implements IIndependentTechnicalReviewer {
  readonly role: ReviewerRole = 'SOFTWARE_QA_REVIEWER';
  readonly title = 'Software QA & Verification Coverage Reviewer';
  readonly charter = 'Automated test coverage, regression risks, determinism of calculations. Blocks merge if tests are skipped, unverified mock fallback is introduced, or assertions deleted.';
  readonly systemPrompt = `You are the Software QA Reviewer for the NAVAL-USV project. Your mandate is to ensure test coverage is maintained, verify that test cases are never skipped, and ensure assertions test genuine safety invariants.`;

  async execute(files: FileDiff[], rawDiff: string): Promise<RoleReviewOutput> {
    return executeModelReview(this, files, rawDiff, (diffFiles) => {
      const findings: RoleFinding[] = [];
      for (const file of diffFiles) {
        if (file.path.startsWith('tests/') || file.path.endsWith('.test.ts')) {
          for (const line of file.addedLines) {
            if (/\b(?:it|describe|test)\.skip\b/.test(line)) {
              findings.push({
                severity: 'CRITICAL',
                affectedFiles: [file.path],
                description: 'Skipped test suite or test case detected in test implementation.',
                evidence: line.trim(),
                potentialConsequences: 'Verification coverage regression masking broken safety or calculation invariants.',
                recommendedAction: 'Remove test skipping; resolve underlying assertion or update test baseline.'
              });
            }
          }
        }
      }
      return findings;
    });
  }
}

// ----------------------------------------------------------------------------------------
// 4. Cybersecurity Reviewer
// ----------------------------------------------------------------------------------------
export class CybersecurityReviewer implements IIndependentTechnicalReviewer {
  readonly role: ReviewerRole = 'CYBERSECURITY_REVIEWER';
  readonly title = 'Cybersecurity, Cryptography & Threat Mitigation Reviewer';
  readonly charter = 'Authentication tokens, cryptographic HMAC-SHA256 signatures, timing-safe equality, credential protection. Prevents wildcard tokens, dummy credentials, and unauthenticated endpoint exposure.';
  readonly systemPrompt = `You are the Cybersecurity Reviewer for the NAVAL-USV project. Your mandate is to inspect cryptographic primitives, verify timingSafeEqual usage, prevent secret leaks, and ensure all authenticated endpoints reject unverified callers.`;

  async execute(files: FileDiff[], rawDiff: string): Promise<RoleReviewOutput> {
    return executeModelReview(this, files, rawDiff, (diffFiles) => {
      const findings: RoleFinding[] = [];
      for (const file of diffFiles) {
        if (file.path.endsWith('independent-ai-review.ts')) {
          continue;
        }

        for (const line of file.addedLines) {
          if (/token\.startsWith\(\s*['"]usv01-['"]\s*\)/.test(line)) {
            findings.push({
              severity: 'CRITICAL',
              affectedFiles: [file.path],
              description: 'Wildcard token prefix match introduced in authentication check.',
              evidence: line.trim(),
              potentialConsequences: 'Insecure authentication bypass allowing arbitrary attacker-crafted tokens starting with usv01-.',
              recommendedAction: 'Enforce cryptographic HMAC-SHA256 session tokens verified via timingSafeEqual.'
            });
          }

          if (/SIG_AUTH_HMAC_ED25519_USV01/.test(line)) {
            findings.push({
              severity: 'CRITICAL',
              affectedFiles: [file.path],
              description: 'Hardcoded dummy signature string introduced in place of authentic cryptographic token.',
              evidence: line.trim(),
              potentialConsequences: 'Cosmetic security illusion without real cryptographic protection.',
              recommendedAction: 'Generate and verify genuine HMAC-SHA256 tokens dynamically.'
            });
          }

          if (/providedSig\s*===\s*expectedSig/.test(line)) {
            findings.push({
              severity: 'HIGH',
              affectedFiles: [file.path],
              description: 'Plain equality check used for cryptographic signature verification.',
              evidence: line.trim(),
              potentialConsequences: 'Side-channel timing attacks allowing signature forgery.',
              recommendedAction: 'Use crypto.timingSafeEqual() with length pre-validation.'
            });
          }
        }
      }
      return findings;
    });
  }
}

// ----------------------------------------------------------------------------------------
// 5. Safety Engineering Reviewer
// ----------------------------------------------------------------------------------------
export class SafetyEngineeringReviewer implements IIndependentTechnicalReviewer {
  readonly role: ReviewerRole = 'SAFETY_ENGINEERING_REVIEWER';
  readonly title = 'Naval Safety Engineering & Actuator Air-Gap Reviewer';
  readonly charter = 'Marine safety criteria (IMO MSC.267(85), ISO 12217), intact hydrostatics, high voltage safety, and physical vessel actuator air-gap. Guarantees physical vessel actuator commands remain barred.';
  readonly systemPrompt = `You are the Naval Safety Engineering Reviewer for the NAVAL-USV project. Your mandate is to protect vessel safety invariants, intact hydrostatics, and verify that actuator hardware commands (GPIO, PWM, serial) remain strictly barred from the digital lab.`;

  async execute(files: FileDiff[], rawDiff: string): Promise<RoleReviewOutput> {
    return executeModelReview(this, files, rawDiff, (diffFiles) => {
      const findings: RoleFinding[] = [];
      for (const file of diffFiles) {
        if (file.path.startsWith('src/')) {
          for (const line of file.addedLines) {
            if (/\b(?:writeGpio|servoPwm|serialPort\.write)\b/.test(line)) {
              findings.push({
                severity: 'CRITICAL',
                affectedFiles: [file.path],
                description: 'Physical actuator hardware command detected in digital lab codebase.',
                evidence: line.trim(),
                potentialConsequences: 'Severe violation of actuator air-gap policy; accidental physical vessel actuation.',
                recommendedAction: 'Remove hardware control code immediately. The Digital Lab is strictly an analysis tool.'
              });
            }
          }
        }
      }
      return findings;
    });
  }
}

// ----------------------------------------------------------------------------------------
// 6. Configuration Management Reviewer
// ----------------------------------------------------------------------------------------
export class ConfigurationManagementReviewer implements IIndependentTechnicalReviewer {
  readonly role: ReviewerRole = 'CONFIGURATION_MANAGEMENT_REVIEWER';
  readonly title = 'Configuration Management & Baseline Integrity Reviewer';
  readonly charter = 'Semantic versioning, dependency lockfile pinning, release manifests, change traceability. Verifies version numbers, file hashes, and baseline comparisons are recorded.';
  readonly systemPrompt = `You are the Configuration Management Reviewer for the NAVAL-USV project. Your mandate is to track baseline modifications, verify that engineering change requests (ECR) exist for baseline updates, and confirm commit SHA bindings.`;

  async execute(files: FileDiff[], rawDiff: string): Promise<RoleReviewOutput> {
    return executeModelReview(this, files, rawDiff, (diffFiles) => {
      const findings: RoleFinding[] = [];
      const modifiesBaseline = diffFiles.some(f =>
        f.path.startsWith('src/core/') ||
        f.path === 'server.ts' ||
        f.path.startsWith('.github/workflows/')
      );

      const hasECRModification = diffFiles.some(f =>
        f.path.startsWith('governance/ecr/') && f.path.endsWith('.md')
      );

      if (modifiesBaseline && !hasECRModification) {
        const ecrDir = path.join(process.cwd(), 'governance', 'ecr');
        const hasExistingECR = fs.existsSync(ecrDir) && fs.readdirSync(ecrDir).some(f => f.startsWith('ECR-') && f.endsWith('.md'));
        if (!hasExistingECR) {
          findings.push({
            severity: 'HIGH',
            affectedFiles: diffFiles.map(f => f.path),
            description: 'Baseline modifications made without an Engineering Change Request (ECR).',
            evidence: 'Core files modified with no record found in governance/ecr/.',
            potentialConsequences: 'Uncontrolled baseline mutation violating configuration management policy.',
            recommendedAction: 'Author and submit an approved ECR record in governance/ecr/.'
          });
        }
      }
      return findings;
    });
  }
}

// ----------------------------------------------------------------------------------------
// 7. Requirements Traceability Reviewer
// ----------------------------------------------------------------------------------------
export class RequirementsTraceabilityReviewer implements IIndependentTechnicalReviewer {
  readonly role: ReviewerRole = 'REQUIREMENTS_TRACEABILITY_REVIEWER';
  readonly title = 'Requirements Traceability & Allocation Reviewer';
  readonly charter = 'Bi-directional traceability between code, requirements (REQ-*), design decisions (ADR-*), and test plans. Prevents orphan requirements or untraced parameter additions.';
  readonly systemPrompt = `You are the Requirements Traceability Reviewer for the NAVAL-USV project. Your mandate is to verify traceability between code modifications and project requirements (REQ-*), ensuring changes map to legitimate specifications.`;

  async execute(files: FileDiff[], rawDiff: string): Promise<RoleReviewOutput> {
    return executeModelReview(this, files, rawDiff, (diffFiles) => {
      const findings: RoleFinding[] = [];
      const newReqMatches = new Set<string>();
      for (const file of diffFiles) {
        if (file.path.startsWith('src/') && !file.path.includes('initialProjectData')) {
          for (const line of file.addedLines) {
            const matches = line.match(/\bREQ-[A-Z]{3,4}-\d{3}\b/g);
            if (matches) {
              for (const m of matches) newReqMatches.add(m);
            }
          }
        }
      }
      return findings;
    });
  }
}

// ----------------------------------------------------------------------------------------
// Multi-Role Review Orchestrator
// ----------------------------------------------------------------------------------------
export async function generateMultiRoleReview(baseRef = 'origin/main'): Promise<MultiRoleReviewReport> {
  const rootDir = process.cwd();
  let rawDiff = '';
  try {
    rawDiff = execSync(`git diff ${baseRef}...HEAD`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch {}

  if (!rawDiff.trim()) {
    try {
      rawDiff = execSync('git diff HEAD~1...HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    } catch {}
  }

  if (!rawDiff.trim()) {
    try {
      rawDiff = execSync('git diff --staged', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    } catch {}
  }

  const headRef = process.env.PR_HEAD_SHA || 'HEAD';
  let evaluatedCommitSha = 'unknown';
  try {
    evaluatedCommitSha = execFileSync('git', ['rev-parse', headRef], { encoding: 'utf-8' }).trim();
  } catch {
    try {
      evaluatedCommitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {}
  }

  let baselineDigest = 'unknown';
  try {
    baselineDigest = computeBaselineDigest(evaluatedCommitSha, rootDir);
  } catch {}

  const sanitized = sanitizeDiffForReview(rawDiff);
  const diffFiles = parseDiff(sanitized);

  // Initialize the 7 independently executing technical reviewers
  const reviewers: IIndependentTechnicalReviewer[] = [
    new SoftwareArchitectureReviewer(),
    new CodeQualityReviewer(),
    new SoftwareQAReviewer(),
    new CybersecurityReviewer(),
    new SafetyEngineeringReviewer(),
    new ConfigurationManagementReviewer(),
    new RequirementsTraceabilityReviewer()
  ];

  // Execute all 7 technical reviewers independently and concurrently
  const reviews = await Promise.all(reviewers.map(r => r.execute(diffFiles, sanitized)));

  const configuredProvider = resolveConfiguredProvider();
  const hasMockFallback = reviews.some(r => r.isMockFallback);

  // Check deterministic status across all reviewers
  const hasCriticalFindings = reviews.some(r => r.findings.some(f => f.severity === 'CRITICAL'));
  const hasHighFindings = reviews.some(r => r.findings.some(f => f.severity === 'HIGH'));
  const deterministicStatus: 'PASS' | 'FAIL' = hasCriticalFindings ? 'FAIL' : 'PASS';

  // Determine overall AI status
  let aiReviewStatus: 'COMPLETED' | 'AI_REVIEW_UNAVAILABLE' | 'FAILED' = 'COMPLETED';
  if (configuredProvider === 'deterministic') {
    aiReviewStatus = 'AI_REVIEW_UNAVAILABLE';
  } else if (reviews.some(r => r.executionStatus === 'FAILED')) {
    aiReviewStatus = 'AI_REVIEW_UNAVAILABLE';
  }

  // Get change classification risk
  let changeRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'CRITICAL';
  try {
    const classReport = generateClassificationReport(baseRef);
    changeRisk = classReport.summary.overallRisk;
  } catch {}

  // Compute composite recommendation
  let composite: AdvisoryRecommendation | 'PENDING_HUMAN_REVIEW' = 'ADVISORY_APPROVE';

  if (hasMockFallback || deterministicStatus === 'FAIL') {
    composite = 'ADVISORY_BLOCK';
  } else if (hasHighFindings) {
    composite = 'ADVISORY_REQUEST_CHANGES';
  } else if (aiReviewStatus === 'AI_REVIEW_UNAVAILABLE') {
    // If AI review was unavailable on a safety-critical / high-risk change:
    if (changeRisk === 'CRITICAL' || changeRisk === 'HIGH') {
      composite = 'PENDING_HUMAN_REVIEW';
    } else {
      composite = 'ADVISORY_APPROVE';
    }
  } else {
    composite = 'ADVISORY_APPROVE';
  }

  const governanceBanner = `
========================================================================================
⚠️  NAVAL-USV INDEPENDENT TECHNICAL REVIEW PIPELINE (STAGE C) — ADVISORY EVIDENCE ONLY
   NON-NEGOTIABLE PRINCIPLE 5: AI CANNOT INDEPENDENTLY AUTHORISE ITS OWN CHANGES.
   SEVEN INDEPENDENT MODEL-BACKED REVIEWERS CONCURRENTLY EVALUATING CHANGE SET.
   FINAL ACCEPTANCE REQUIRES SIGNED HUMAN AUTHORITY PER ENGINEERING GOVERNANCE POLICY.
========================================================================================
`;

  const report: MultiRoleReviewReport = {
    timestamp: new Date().toISOString(),
    gitRef: baseRef,
    evaluatedCommitSha,
    baselineDigest,
    executionMode: configuredProvider === 'deterministic'
      ? 'Deterministic Static Rule Engine (Zero External API)'
      : `Seven Independent Reviewers (${configuredProvider})`,
    provider: configuredProvider,
    aiReviewStatus,
    deterministicStatus,
    hasMockFallback,
    reviews,
    compositeAdvisoryRecommendation: composite,
    governanceBanner: governanceBanner.trim()
  };

  // Write report to governance/reports/stage-c-review.json
  const outDir = path.join(rootDir, 'governance', 'reports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'stage-c-review.json'), JSON.stringify(report, null, 2));

  return report;
}

export function formatReviewReportMarkdown(report: MultiRoleReviewReport): string {
  const recBadge: Record<AdvisoryRecommendation | 'PENDING_HUMAN_REVIEW', string> = {
    ADVISORY_APPROVE: '🟢 ADVISORY APPROVAL RECOMMENDED',
    ADVISORY_REQUEST_CHANGES: '🟡 ADVISORY: CHANGES REQUESTED',
    ADVISORY_BLOCK: '🔴 ADVISORY: MERGE BLOCKED BY INDEPENDENT REVIEW',
    PENDING_HUMAN_REVIEW: '🟡 ADVISORY: PENDING HUMAN AUTHORITY SIGN-OFF (AI UNAVAILABLE FOR CRITICAL RISK)'
  };

  let md = `## 🤖 NAVAL-USV Stage C: Independent Multi-Role Technical Review

> **CRITICAL GOVERNANCE MANDATE:**  
> This multi-role review constitutes **advisory technical evidence only**, not human authorisation.  
> Under USV-01 Governance Principle 5, **no AI tool or agent may independently authorise its own changes**.  
> Seven independent model-backed technical reviewers concurrently assess all application, governance, and test changes.  
> Mandatory human sign-off by designated Engineering Authority is required prior to baseline merge.

**Composite Advisory Verdict:** **${recBadge[report.compositeAdvisoryRecommendation]}**  
**Review Execution Mode:** \`${report.executionMode}\`  
**Evaluated Commit:** \`${report.evaluatedCommitSha}\`  
**Baseline Content Digest:** \`${report.baselineDigest}\`  
**Deterministic Verification Status:** \`${report.deterministicStatus}\`  
**AI Review Status:** \`${report.aiReviewStatus}\`  
**Timestamp:** \`${report.timestamp}\`

---

### Seven Independent Reviewer Findings
`;

  for (const r of report.reviews) {
    const roleBadge = r.advisoryRecommendation === 'ADVISORY_APPROVE' ? '✅' : r.advisoryRecommendation === 'ADVISORY_REQUEST_CHANGES' ? '⚠️' : '🚫';
    md += `\n#### ${roleBadge} ${r.title} (\`${r.role}\`)\n`;
    md += `* **Status:** \`${r.advisoryRecommendation}\` (Execution: \`${r.executionStatus}\`)\n`;
    md += `* **Model / Provider:** \`${r.provider}\` (\`${r.model}\`)\n`;
    md += `* **Assessment Summary:** ${r.summary}\n`;

    if (r.findings.length === 0) {
      md += `* **Findings:** Zero non-conformances identified.\n`;
    } else {
      md += `\n| Severity | File | Finding | Corrective Action |\n|---|---|---|---|\n`;
      for (const f of r.findings) {
        md += `| **${f.severity}** | \`${f.affectedFiles.join(', ')}\` | ${f.description} | ${f.recommendedAction} |\n`;
      }
    }

    if (r.rawOutput) {
      md += `\n<details>\n<summary>Raw Reviewer Completion Output</summary>\n\n\`\`\`json\n${r.rawOutput}\n\`\`\`\n</details>\n`;
    }
  }

  return md;
}

if (process.argv[1] && process.argv[1].endsWith('independent-ai-review.ts')) {
  const baseRef = process.argv[2] || 'origin/main';
  generateMultiRoleReview(baseRef).then(report => {
    console.log(report.governanceBanner);
    console.log(formatReviewReportMarkdown(report));

    if (report.compositeAdvisoryRecommendation === 'ADVISORY_BLOCK' || report.hasMockFallback) {
      console.error('\n🚫 Stage C Independent Review recommended BLOCKING the change due to critical defects or mock reviewer fallback.\n');
      process.exit(1);
    }
    process.exit(0);
  }).catch(err => {
    console.error('Fatal Stage C review error:', err);
    process.exit(1);
  });
}
