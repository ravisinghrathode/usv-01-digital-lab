import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { resolveConfiguredProvider, ModelProviderRouter } from '../src/core/models/ModelProvider.ts';

dotenv.config();

interface ReviewFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  file?: string;
  description: string;
  recommendation: string;
}

interface ReviewResult {
  verdict: 'APPROVE' | 'REJECT';
  confidenceScore: number;
  summary: string;
  findings: ReviewFinding[];
  statutoryComplianceChecks: {
    tbdTracking: boolean;
    failClosedEnforcement: boolean;
    authenticationEnforcement: boolean;
  };
}

/**
 * Strips sensitive files (environment files, private keys, lockfiles) from git diff
 * prior to sending diff payloads to external AI endpoints.
 */
function sanitizeDiff(rawDiff: string): string {
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
      if (pattern.test(firstLine)) {
        console.log(`🔒 Privacy Filter: Redacted file from AI diff payload: ${firstLine}`);
        return false;
      }
    }
    return true;
  });

  return sanitizedBlocks.map(b => 'diff --git ' + b).join('\n');
}

function runDeterministicAdvisoryCheck(sanitizedDiff: string): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const blocks = sanitizedDiff.split(/^diff --git /m);

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

    const isTestFile = filePath.startsWith('tests/') || filePath.endsWith('.test.ts');
    const isPhysicsFile = filePath.startsWith('src/core/tools/');

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        const added = line.substring(1);
        if (isTestFile && /\b(?:it|describe|test)\.skip\b/.test(added)) {
          findings.push({
            severity: 'CRITICAL',
            file: filePath,
            description: 'Skipped test suite detected in test file diff.',
            recommendation: 'Remove test skipping before pushing.'
          });
        }
        if (isPhysicsFile && /(?:margin|density|tolerance|factor)\s*\|\|\s*\d+/i.test(added)) {
          findings.push({
            severity: 'HIGH',
            file: filePath,
            description: 'Suspicious logical OR used for numeric fallback instead of nullish coalescing (??).',
            recommendation: 'Use ?? instead of || to prevent 0 coercion.'
          });
        }
      }
    }
  }

  return findings;
}

async function runAdvisoryReview() {
  console.log('\n================================================================');
  console.log('🤖 USV-01 DIGITAL LAB — LOCAL ADVISORY PRE-PUSH REVIEW');
  console.log('   (Authoritative branch protection is enforced by GitHub Actions CI)');
  console.log('================================================================\n');

  if (process.env.GIT_CHATGPT_BYPASS === '1' || process.argv.includes('--bypass')) {
    console.warn('⚠️  ADVISORY NOTICE: Pre-push verification gate was manually bypassed (GIT_CHATGPT_BYPASS=1).');
    console.warn('    Server-side GitHub Actions branch protection will remain authoritative upon push.\n');
    process.exit(0);
  }

  // 1. Get git diff
  let rawDiff = '';
  try {
    rawDiff = execSync('git diff origin/main..HEAD', { encoding: 'utf-8' });
  } catch {
    try {
      rawDiff = execSync('git diff HEAD~1..HEAD', { encoding: 'utf-8' });
    } catch {
      rawDiff = execSync('git diff --staged', { encoding: 'utf-8' });
    }
  }

  if (!rawDiff || rawDiff.trim().length === 0) {
    console.log('ℹ️  No unpushed git diff detected relative to remote. Push permitted.');
    process.exit(0);
  }

  const sanitized = sanitizeDiff(rawDiff);
  const lineCount = sanitized.split('\n').length;
  console.log(`📋 Sanitized diff: ${lineCount} lines across modified files ready for advisory review...`);

  const configuredProvider = resolveConfiguredProvider();
  console.log(`🔍 Advisory review provider: ${configuredProvider}`);

  // If deterministic provider or no live external AI credentials:
  if (configuredProvider === 'deterministic') {
    const findings = runDeterministicAdvisoryCheck(sanitized);
    const criticals = findings.filter(f => f.severity === 'CRITICAL');

    if (criticals.length > 0) {
      console.error('\n🚫 PUSH REJECTED: Deterministic advisory check identified critical defects:');
      for (const f of criticals) {
        console.error(`  - ${f.description} (Action: ${f.recommendation})`);
      }
      process.exit(1);
    }

    console.log('\n✅ DETERMINISTIC ADVISORY REVIEW PASSED (Zero external API dependencies).');
    console.log('   Zero critical safety regressions identified. Push permitted.\n');
    process.exit(0);
  }

  // External Model Review (Gemini or OpenAI)
  const isGemini = configuredProvider === 'gemini';
  const apiKey = isGemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn(`\nℹ️  NOTICE: API key for '${configuredProvider}' is not configured.`);
    console.log('Executing local deterministic static analysis checks instead...');
    const findings = runDeterministicAdvisoryCheck(sanitized);
    if (findings.some(f => f.severity === 'CRITICAL')) {
      console.error('\n🚫 PUSH REJECTED: Critical defect identified during static review.');
      process.exit(1);
    }
    console.log('✅ Deterministic checks passed. Push permitted.\n');
    process.exit(0);
  }

  const model = isGemini
    ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash')
    : (process.env.CHATGPT_MODEL || 'gpt-4o-mini');

  console.log(`📡 Connecting to ${configuredProvider.toUpperCase()} (${model}) for engineering review...`);

  const systemInstructions = `
You are the Independent Safety & Technical Reviewer embedded in the USV-01 Digital Engineering Lab pre-push gate.
Review the following Git diff before code is permitted into the 'main' branch.

EVALUATION MANDATES:
1. [ZERO FABRICATED METRICS]: Principal vessel particulars must remain 'TBD' or be isolated as '[UNVERIFIED PARAMETRIC STUDY]'.
2. [AUTHENTICATED AUTHORITY]: Safety-critical gates must require verified ApproverIdentity.
3. [PERSISTENCE & SECURITY]: Server data endpoints must be authenticated.
4. [FAIL-CLOSED ORCHESTRATION]: Downstream tasks must be blocked if upstream dependencies fail.
5. [MATHEMATICAL RIGOR]: Nullish coalescing (??) must be used for zero-values.

OUTPUT FORMAT:
Respond STRICTLY with valid JSON:
{
  "verdict": "APPROVE" | "REJECT",
  "confidenceScore": <number between 0.0 and 1.0>,
  "summary": "<concise summary>",
  "findings": [
    {
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "INFO",
      "file": "<filename>",
      "description": "<issue description>",
      "recommendation": "<corrective action>"
    }
  ],
  "statutoryComplianceChecks": {
    "tbdTracking": true,
    "failClosedEnforcement": true,
    "authenticationEnforcement": true
  }
}
`;

  const truncatedDiff = sanitized.length > 60000
    ? sanitized.slice(0, 60000) + '\n\n[... Diff truncated for token limits ...]'
    : sanitized;

  try {
    const router = ModelProviderRouter.getInstance();
    const response = await router.generate(
      {
        systemInstructions,
        userPrompt: `Please review this Git diff for merge into main:\n\n${truncatedDiff}`,
        context: { lineCount }
      },
      {
        preferredProvider: configuredProvider,
        modelName: model,
        temperature: 0.1,
        maxTokens: 2048,
        fallbackToMock: false
      }
    );

    if (response.isMock) {
      console.warn('⚠️  Synthetic mock returned by provider. Defaulting to deterministic static checks.');
      const findings = runDeterministicAdvisoryCheck(sanitized);
      if (findings.some(f => f.severity === 'CRITICAL')) {
        console.error('🚫 PUSH REJECTED: Critical defect identified during static review.');
        process.exit(1);
      }
      console.log('✅ Deterministic checks passed. Push permitted.\n');
      process.exit(0);
    }

    const review: ReviewResult = response.parsedJson || JSON.parse(response.content);

    console.log(`\n----------------- ${configuredProvider.toUpperCase()} REVIEW REPORT -----------------`);
    console.log(`Verdict:          ${review.verdict === 'APPROVE' ? '✅ APPROVED' : '❌ REJECTED'}`);
    console.log(`Confidence Score: ${((review.confidenceScore || 0.95) * 100).toFixed(1)}%`);
    console.log(`Summary:          ${review.summary}\n`);

    if (review.findings && review.findings.length > 0) {
      console.log('Findings & Action Items:');
      for (const finding of review.findings) {
        const badge = finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? '🔴' : '🟡';
        console.log(`  ${badge} [${finding.severity}] ${finding.file ? `(${finding.file}) ` : ''}${finding.description}`);
        console.log(`     ↳ Recommendation: ${finding.recommendation}`);
      }
      console.log('');
    }

    if (review.verdict !== 'APPROVE') {
      console.error(`🚫 PUSH REJECTED: ${configuredProvider.toUpperCase()} identified critical defects.`);
      process.exit(1);
    }

    console.log(`🎉 PUSH PERMITTED: ${configuredProvider.toUpperCase()} verified engineering governance.\n`);
    process.exit(0);
  } catch (error: any) {
    console.warn(`⚠️  Advisory AI check skipped due to error: ${error.message}`);
    console.log('Executing local deterministic static analysis checks instead...');
    const findings = runDeterministicAdvisoryCheck(sanitized);
    if (findings.some(f => f.severity === 'CRITICAL')) {
      console.error('🚫 PUSH REJECTED: Critical defect identified during static review.');
      process.exit(1);
    }
    console.log('✅ Deterministic checks passed. Push permitted.\n');
    process.exit(0);
  }
}

runAdvisoryReview();
