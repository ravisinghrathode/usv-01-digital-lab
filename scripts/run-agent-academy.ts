/**
 * USV-01 Agent Academy control plane.
 *
 * plan   : offline, generates complete 26-role learning plans without AI calls.
 * status : verifies any externally signed qualification records, fails closed.
 * --execute : runs actual role-specific, read-only Codex study exercises on a
 * trusted subscription host. Outputs are UNGRADED and do not qualify agents.
 *
 * No paid model API fallback. No vessel design approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { buildAgentAcademyCurricula, ACADEMY_VERSION, type StudyAttempt } from '../src/core/academy/AgentAcademy.ts';
import { verifyAcademyQualification } from '../src/core/academy/QualificationVerifier.ts';
import { runSubscriptionCli } from '../src/core/mission-control/SubscriptionCliAdapter.ts';
import { assertPinnedCleanGitRevision } from '../src/core/mission-control/GitRevisionGuard.ts';
import { requireLabCommissioningPolicy } from '../src/core/mission-control/LabCommissioningPolicy.ts';

const root = process.cwd();
const outDir = path.join(root, 'data', 'academy');
const args = process.argv.slice(2);
const execute = args.includes('--execute');
const command = execute ? 'study' : (args[0] || 'plan');
if (!['study', 'plan', 'status'].includes(command)) throw new Error('Use plan, status, or --execute');
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error('Cannot establish exact source SHA');
const curricula = buildAgentAcademyCurricula();

function writeJson(target: string, value: unknown): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = target + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temporary, target);
}

function trustedPublicKey(envName: string): string | undefined {
  const filename = process.env[envName];
  if (!filename) return undefined;
  const resolved = path.resolve(filename);
  if (resolved === root || resolved.startsWith(root + path.sep)) {
    throw new Error(envName + ' must resolve to a controlled file outside the repository');
  }
  return fs.readFileSync(resolved, 'utf8');
}

function status() {
  const reviewerKey = trustedPublicKey('USV_ACADEMY_REVIEWER_PUBLIC_KEY_FILE');
  const directorKey = trustedPublicKey('USV_ACADEMY_DIRECTOR_PUBLIC_KEY_FILE');
  const results = curricula.map(c => {
    const file = path.join(outDir, 'qualifications', c.canonicalId + '.json');
    let record;
    if (fs.existsSync(file)) {
      try { record = JSON.parse(fs.readFileSync(file, 'utf8')); }
      catch { record = undefined; }
    }
    return verifyAcademyQualification(c, record, sourceSha, reviewerKey, directorKey);
  });
  const studyRecords = curricula.map(c => {
    const file = path.join(outDir, 'attempts', c.canonicalId + '.json');
    let attempts: StudyAttempt[] = [];
    if (fs.existsSync(file)) {
      try { attempts = JSON.parse(fs.readFileSync(file, 'utf8')); }
      catch { attempts = []; }
    }
    const current = attempts.filter(a => a.sourceSha === sourceSha &&
      a.curriculumVersion === ACADEMY_VERSION &&
      a.status === 'COMPLETED_UNGRADED');
    return { canonicalId: c.canonicalId, completedUngradedExercises: current.length };
  });
  const result = {
    schemaVersion: ACADEMY_VERSION,
    sourceSha, totalRoles: 26,
    generatedAt: new Date().toISOString(),
    completedStudySessionsUngraded: studyRecords.filter(r => r.completedUngradedExercises > 0).length,
    independentlyQualified: results.filter(r => r.status === 'QUALIFIED_SUPERVISED_RESEARCH_ONLY').length,
    vesselDesignCertified: false, engineeringReleaseApproved: false,
    authority: 'SUPERVISED_RESEARCH_ONLY_WHEN_INDEPENDENTLY_QUALIFIED',
    studyRecords, results
  };
  writeJson(path.join(outDir, 'academy-status.json'), result);
  console.log(JSON.stringify({
    sourceSha, curriculumCount: curricula.length,
    agentsWithCompletedUngradedStudy: result.completedStudySessionsUngraded,
    independentlyQualified: result.independentlyQualified,
    blockedAgents: results.filter(r => r.blockers.length).map(r => ({ id:r.canonicalId, reasons:r.blockers.slice(0,4) })),
    statusReport: 'data/academy/academy-status.json',
    vesselDesignCertified: false
  }, null, 2));
  if (args.includes('--require-qualified') && result.independentlyQualified !== 26) {
    process.exitCode = 1;
  }
}

async function study() {
  if (!execute) throw new Error('Live study requires explicit --execute opt-in');
  requireLabCommissioningPolicy(process.env);
  await assertPinnedCleanGitRevision(root, sourceSha);
  // Verify once before spending tokens. runSubscriptionCli also checks each call.
  const auth = spawnSync('codex', ['login', 'status'], { cwd: root, encoding: 'utf8', timeout: 8000 });
  const login = ((auth.stdout || '') + ' ' + (auth.stderr || '')).toLowerCase();
  if (auth.error || auth.status !== 0 || !login.includes('chatgpt') ||
      /api[- ]?key|access token/.test(login)) {
    throw new Error('A real Codex CLI authenticated by ChatGPT subscription is required; no model sessions started');
  }
  const roleFlag = args.indexOf('--agents');
  const selected = roleFlag < 0 ? curricula : curricula.filter(c =>
    (args[roleFlag + 1] || '').split(',').includes(c.canonicalId));
  if (selected.length < 1) throw new Error('Unknown --agents selection');
  const summary: Array<{agent:string;status:string;outputSha256?:string}> = [];
  for (const c of selected) {
    const prompt = [
      'USV-01 AGENT ACADEMY OPEN-BOOK LEARNING SESSION — NOT DESIGN APPROVAL',
      'Role: ' + c.canonicalId + ' / ' + c.name + ' / ' + c.specialism,
      'Source revision: ' + sourceSha,
      'Read AGENTS.md, USV01_PROJECT_CONTEXT.md and relevant repository skill files if available.',
      'Do NOT claim that an inaccessible textbook/paid standard has been read.',
      'Do NOT change code or design parameters; remain in read-only research scope.',
      'Establish fundamental concepts, assumptions, SI units, sources and validity limits for this role.',
      'Specialist learning outcomes: ' + c.specialistOutcomes.join('; '),
      'Candidate reference identifiers (NOT authenticated documents): ' + c.requiredSources.map(s => s.id).join(', '),
      'Reviewed local procedure candidates: ' + c.approvedSkillDocumentCandidates.join(', '),
      'Solve a worked example and openly state missing inputs: ' + c.practicalTasks.workedExample,
      'Identify counterexamples and failure conditions: ' + c.practicalTasks.adversarialChallenge,
      'Do not fabricate reference measurements, grades, external reviews or qualifications.',
      'Return a structured study report: concepts understood, worked reasoning, sources actually accessed,',
      'unavailable material, unresolved knowledge gaps, and questions for an independent examiner.'
    ].join('\n');
    let attempt: StudyAttempt;
    let output = '';
    try {
      const result = await runSubscriptionCli({
        role: 'worker', agentId: c.canonicalId, taskId: 'ACADEMY-STUDY-' + c.canonicalId,
        prompt, workingDirectory: root, timeoutMs: 360000
      });
      output = result.stdout;
      attempt = {
        canonicalId: c.canonicalId, curriculumVersion: ACADEMY_VERSION,
        sourceSha, stage:'OPEN_BOOK_STUDY', provider:'codex_cli',
        status: result.status === 'COMPLETED' ? 'COMPLETED_UNGRADED' : result.status,
        ...(output ? { outputSha256: createHash('sha256').update(output).digest('hex') } : {}),
        timestamp: new Date().toISOString(), reviewedByHuman:false
      };
    } catch (error) {
      attempt = { canonicalId:c.canonicalId, curriculumVersion:ACADEMY_VERSION,
        sourceSha, stage:'OPEN_BOOK_STUDY', provider:'codex_cli', status:'UNAVAILABLE',
        timestamp:new Date().toISOString(), reviewedByHuman:false };
      output = 'Execution unavailable: ' + (error instanceof Error ? error.message : 'unknown');
    }
    const file = path.join(outDir, 'attempts', c.canonicalId + '.json');
    let previous: StudyAttempt[] = [];
    if (fs.existsSync(file)) {
      try { previous = JSON.parse(fs.readFileSync(file, 'utf8')); }
      catch { previous = []; }
    }
    writeJson(file, [...previous, attempt]);
    writeJson(path.join(outDir, 'study-outputs', c.canonicalId + '.json'),
      { attempt, ungradedAgentResponse: output, engineeringReleaseApproved:false });
    summary.push({ agent:c.canonicalId, status: attempt.status, outputSha256:attempt.outputSha256 });
    writeJson(path.join(outDir, 'study-progress.json'), {
      sourceSha, completed:selected.length, attempted:summary.length,
      roleResults:summary, certifiedAgents:0, independentReviewPending:true
    });
  }
  status();
  if (summary.some(r => r.status !== 'COMPLETED_UNGRADED')) process.exitCode = 1;
}

async function main() {
  if (command === 'plan') {
    writeJson(path.join(outDir, 'curricula.json'), {
      schemaVersion:ACADEMY_VERSION, sourceSha,
      caveat:'Curriculum plans and source IDs are not proof of ingestion or agent competence',
      curricula
    });
    console.log('Generated 26 role-specific academy curricula: data/academy/curricula.json');
    status();
  } else if (command === 'status') status();
  else await study();
}
main().catch(err => {
  console.error('Agent Academy failed closed: ' + (err instanceof Error ? err.message : String(err)));
  process.exitCode = 1;
});
