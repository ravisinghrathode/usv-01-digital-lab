import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { ExecutionEngine } from '../src/core/engine/ExecutionEngine.ts';
import { assertPinnedCleanGitRevision } from '../src/core/mission-control/GitRevisionGuard.ts';
import { sanitizedSubscriptionEnvironment } from '../src/core/mission-control/SubscriptionCliAdapter.ts';
import { evaluateStageDHumanApproval } from './governance/stage-d-human-approval.ts';

const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const input = 'evidence/runtime-closeout/requirements.json';

async function main() {
  if (process.env.AI_REVIEW_PROVIDER !== 'codex_cli' ||
      process.env.USV_SUBSCRIPTION_PILOT !== 'enabled' ||
      process.env.USV_ALLOW_PAID_AI_API !== 'false') {
    throw new Error('Select the signed-in Codex CLI and explicitly disable paid API access.');
  }
  const commit = process.argv[2] ?? '';
  await assertPinnedCleanGitRevision(process.cwd(), commit);
  const raw = readFileSync(input, 'utf8');
  const { id, source, requirements } = JSON.parse(raw);
  const sourceText = readFileSync(source, 'utf8');
  const rows: string[] = requirements.map((row: Record<string, string>) => {
    if (!sourceText.includes(row.quote) || !row.quote || !row.subsystem ||
        row.method !== 'Test' || !row.criterion ||
        !/^USV-RT-\d{3}$/.test(row.id) || !/^USV-RT-V\d{2}$/.test(row.verificationId)) {
      throw new Error('Invalid source anchor, allocation or verification record: ' + row.id);
    }
    return JSON.stringify([row.id, row.subsystem, row.method, row.verificationId, row.criterion]);
  });
  for (const key of ['id', 'verificationId']) {
    if (!rows.length || new Set(requirements.map((row: Record<string, string>) => row[key])).size !== rows.length) {
      throw new Error('Empty or duplicate trace records for ' + key);
    }
  }

  mkdirSync('data', { recursive: true });
  const gate = evaluateStageDHumanApproval('origin/main', { headRef: commit });
  const cycles: object[] = [];
  const report = {
    id, commit: gate.evaluatedRef, input, inputSha256: digest(raw), source,
    sourceSha256: digest(sourceText), requirements, cycles, gate,
    state: 'INTAKE_VALIDATED'
  };
  const persist = () => writeFileSync('data/runtime-traceability.json', JSON.stringify(report, null, 2) + '\n');
  persist();
  let findings: string[] = [];
  for (let cycle = 1; cycle <= 2; cycle++) {
    const taskId = id + '-R' + cycle;
    const worker = await ExecutionEngine.getInstance().executeAgent('REQ-TRC-02', {
      taskId,
      parameters: {},
      context: { source, requirements, previousFindings: findings },
      userNotes: 'Trace these controlled software requirements. Return one designDecisions string per requirement. Each string must contain only a compact JSON array with exactly five values copied from that requirement, in order: id, subsystem, method, verificationId, criterion. Preserve wording, case and punctuation. Report no test outcomes or approvals.'
    }, 0);
    const actual = worker.data.designDecisions;
    const nativeLive = worker.provider === 'codex_cli' &&
      worker.providerExecutionMode === 'LIVE_AI_GENERATION' &&
      worker.status === 'NEEDS_HUMAN_APPROVAL';
    const linksMatch = Array.isArray(actual) && actual.length === rows.length &&
      actual.every((row, index) => {
        try { return JSON.stringify(JSON.parse(row)) === rows[index]; } catch { return false; }
      });
    const record = { cycle, worker, checks: { nativeLive, linksMatch }, review: {} };
    cycles.push(record);
    report.state = 'WORKER_EXECUTED';
    persist();
    if (!nativeLive) throw new Error('Native Codex worker did not complete at the approval gate');

    const prompt = 'Independently review this software traceability package. Use only supplied records. Do not call tools. Compare each output row with the corresponding source requirement and check stable IDs, subsystem allocation, method, criterion and reverse link. Review the supplied deterministic check. Return JSON only, with decision APPROVE or REQUEST_CHANGES and findings as an array of strings. APPROVE means the traceability artifact is suitable for qualified human review. Never grant human approval.\n' +
      JSON.stringify({ source, requirements, actual, linksMatch });
    report.state = 'REVIEW_PENDING';
    persist();
    const rawReview = execFileSync('agy', [
      '-p', prompt, '--output-format', 'json', '--mode', 'plan', '--print-timeout', '90s'
    ], { env: sanitizedSubscriptionEnvironment(), encoding: 'utf8', timeout: 100_000, stdio: ['ignore', 'pipe', 'ignore'] });
    const envelope = JSON.parse(rawReview);
    if (envelope.status !== 'SUCCESS' || typeof envelope.response !== 'string') {
      throw new Error('Antigravity review did not complete');
    }
    const review = JSON.parse(envelope.response.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1'));
    if (!['APPROVE', 'REQUEST_CHANGES'].includes(review.decision) ||
        !Array.isArray(review.findings) || review.findings.some((item: unknown) => typeof item !== 'string')) {
      throw new Error('Invalid review disposition');
    }
    record.review = { provider: 'antigravity_gemini', promptSha256: digest(prompt), responseSha256: digest(rawReview), ...review };
    if (linksMatch && review.decision === 'APPROVE') {
      await assertPinnedCleanGitRevision(process.cwd(), commit);
      report.state = gate.signatureVerified && gate.independentReviewStatus === 'APPROVED_BY_PEER'
        ? 'GOVERNANCE_EVIDENCE_PRESENT' : 'PENDING_QUALIFIED_REVIEW_AND_DIRECTOR_APPROVAL';
      persist();
      console.log(report.state);
      return;
    }
    findings = [...review.findings, ...(!linksMatch ? ['Deterministic row comparison failed. Copy the five exact fields from each controlled record.'] : [])];
    report.state = 'CORRECTION_REQUIRED';
    persist();
  }
  throw new Error('Traceability work package exhausted two review cycles');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Traceability work package failed');
  process.exitCode = 1;
});
