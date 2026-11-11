import { execSync } from 'child_process';
import dotenv from 'dotenv';

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

async function runChatGPTReview() {
  console.log('\n======================================================');
  console.log('🤖 USV-01 DIGITAL LAB — CHATGPT PRE-PUSH REVIEW GATE');
  console.log('======================================================\n');

  if (process.env.GIT_CHATGPT_BYPASS === '1' || process.argv.includes('--bypass')) {
    console.warn('⚠️  WARNING: ChatGPT pre-push verification gate was manually bypassed (GIT_CHATGPT_BYPASS=1).');
    process.exit(0);
  }

  // 1. Get git diff
  let diff = '';
  try {
    // Attempt diff against origin/main
    diff = execSync('git diff origin/main..HEAD', { encoding: 'utf-8' });
  } catch {
    try {
      // Fallback: diff against latest commit
      diff = execSync('git diff HEAD~1..HEAD', { encoding: 'utf-8' });
    } catch {
      diff = execSync('git diff --staged', { encoding: 'utf-8' });
    }
  }

  if (!diff || diff.trim().length === 0) {
    console.log('ℹ️  No unpushed git diff detected relative to remote. Push permitted.');
    process.exit(0);
  }

  const lineCount = diff.split('\n').length;
  console.log(`📋 Analyzing diff: ${lineCount} lines across modified files...`);

  // 2. Validate OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('\n❌ ERROR: OPENAI_API_KEY environment variable is missing.');
    console.error('To enable the ChatGPT pre-push verification gate:');
    console.error('  1. Add OPENAI_API_KEY=sk-... to your .env file or export it in your terminal.');
    console.error('  2. Run: npm run chatgpt:verify');
    console.error('  (For emergency offline bypass, push with GIT_CHATGPT_BYPASS=1 git push)\n');
    console.error('Fail-closed: Push aborted because review gate is enforced.');
    process.exit(1);
  }

  const model = process.env.CHATGPT_MODEL || 'gpt-4o';
  console.log(`📡 Connecting to OpenAI (${model}) for engineering review...`);

  const systemInstructions = `
You are the Independent Safety & Technical Reviewer (ChatGPT / GPT-4o) embedded in the USV-01 Digital Engineering Lab CI/CD gate.
You must review Git diffs before code is permitted into the 'main' branch.

EVALUATION MANDATES & CRITICAL DEFECTS:
1. [ZERO FABRICATED METRICS]: Principal vessel particulars (length, beam, draft, displacement, speed) must remain 'TBD' or be explicitly isolated as '[UNVERIFIED PARAMETRIC STUDY]'. Hardcoded demo vessel particulars must never execute as certified baselines.
2. [AUTHENTICATED AUTHORITY]: Safety-critical approval gates must require verified ApproverIdentity (checking userId, role, and signature token), NOT bare string role literals like 'ENGINEERING_DIRECTOR'.
3. [PERSISTENCE & SECURITY]: Server data endpoints (/api/data, /api/export, /api/import) must be authenticated and state must be persisted across restarts.
4. [FAIL-CLOSED ORCHESTRATION & SYNTHESIS]:
   - Downstream DAG tasks MUST be blocked if upstream dependencies fail or are waiting approval.
   - Mandatory deterministic naval calculation failures MUST halt agent synthesis immediately.
5. [MATHEMATICAL & SIZING RIGOR]: Nullish coalescing (??) must be used for zero-values (e.g. 0% design margin must not convert to default 10%).
6. [HMEA v0.2 SPECIFICATION]: Master agents must adhere to canonical IDs (A01-A25).

OUTPUT FORMAT:
Respond STRICTLY with valid JSON adhering to this schema:
{
  "verdict": "APPROVE" | "REJECT",
  "confidenceScore": <number between 0.0 and 1.0>,
  "summary": "<concise summary of review findings>",
  "findings": [
    {
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "INFO",
      "file": "<filename>",
      "description": "<issue description>",
      "recommendation": "<corrective action>"
    }
  ],
  "statutoryComplianceChecks": {
    "tbdTracking": <boolean>,
    "failClosedEnforcement": <boolean>,
    "authenticationEnforcement": <boolean>
  }
}
`;

  // Truncate diff to 60,000 characters if oversized to prevent token overflows
  const truncatedDiff = diff.length > 60000 ? diff.slice(0, 60000) + '\n\n[... Diff truncated for token limits ...]' : diff;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemInstructions },
          { role: 'user', content: `Please review this Git diff for merge into main:\n\n${truncatedDiff}` }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      try {
        const parsedErr = JSON.parse(errText);
        if (parsedErr.error?.code === 'credit_balance_exhausted' || parsedErr.error?.type === 'insufficient_quota') {
          console.error('\n⚠️  OPENAI BILLING NOTICE: Your OpenAI account has exhausted its API credit balance.');
          console.error('To run live ChatGPT reviews, add API credits at: https://platform.openai.com/settings/organization/billing/');
          console.error('(To push without live review during billing maintenance: GIT_CHATGPT_BYPASS=1 git push)\n');
          process.exit(1);
        }
      } catch {}
      throw new Error(`OpenAI API HTTP ${response.status}: ${errText}`);
    }

    const resJson = await response.json();
    const review: ReviewResult = JSON.parse(resJson.choices[0].message.content);

    console.log('\n----------------- CHATGPT REVIEW REPORT -----------------');
    console.log(`Verdict:          ${review.verdict === 'APPROVE' ? '✅ APPROVED' : '❌ REJECTED'}`);
    console.log(`Confidence Score: ${(review.confidenceScore * 100).toFixed(1)}%`);
    console.log(`Summary:          ${review.summary}\n`);

    console.log('Compliance Status:');
    console.log(`  - TBD Tracking & Vessel Particulars:     ${review.statutoryComplianceChecks.tbdTracking ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  - Fail-Closed Orchestration/Synthesis:   ${review.statutoryComplianceChecks.failClosedEnforcement ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  - Human Authority Identity Verification: ${review.statutoryComplianceChecks.authenticationEnforcement ? '✅ PASS' : '❌ FAIL'}`);

    if (review.findings && review.findings.length > 0) {
      console.log('\nFindings & Action Items:');
      for (const finding of review.findings) {
        const badge = finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? '🔴' : '🟡';
        console.log(`  ${badge} [${finding.severity}] ${finding.file ? `(${finding.file}) ` : ''}${finding.description}`);
        console.log(`     ↳ Recommendation: ${finding.recommendation}`);
      }
    }
    console.log('---------------------------------------------------------\n');

    if (review.verdict !== 'APPROVE') {
      console.error('🚫 PUSH REJECTED: ChatGPT identified critical safety or architectural defects.');
      console.error('Please address the findings above before pushing to origin/main.\n');
      process.exit(1);
    }

    console.log('🎉 PUSH PERMITTED: ChatGPT verified all engineering governance and safety mandates.\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Failed to execute ChatGPT review gate:', error.message);
    process.exit(1);
  }
}

runChatGPTReview();
