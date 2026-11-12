import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { auditAll26AgentAccuracy } from '../src/core/verification/RoleAccuracyAudit.ts';

const source = JSON.parse(fs.readFileSync(path.resolve(
  'evidence/live-agents/live-gemini-26-20261113.json'), 'utf8'));
const hardened = JSON.parse(fs.readFileSync(path.resolve(
  'evidence/live-agents/native-hardened-26-20261113.json'), 'utf8'));
const allFileDigestsMatch = Object.entries(hardened.sourceFileSha256).length >= 10 &&
  Object.entries(hardened.sourceFileSha256).every(([filename, expected]) => {
    const target = path.resolve(filename);
    return fs.existsSync(target) &&
      ('sha256:' + createHash('sha256').update(fs.readFileSync(target)).digest('hex')) === expected;
  });
const normalizedResults = hardened.results.map((x: any) => ({
  ...x, agentId: x.registeredId,
  modelProviderResponseId: x.modelProviderResponseId,
  deterministicTools: x.toolEvidence.map((t: any) => ({
    id: t.id, success: t.success
  }))
}));
const registeredCommit = process.env.USV01_AUDIT_COMMIT_SHA ||
  'CURRENT_SOURCE_UNPINNED';
const r = auditAll26AgentAccuracy({
  registeredCommit,
  nativeEvidenceCommit: hardened.sourceBaseBeforeChanges,
  nativeResults: normalizedResults,
  originalResults: source.cases,
  sourceFileDigestsMatch: allFileDigestsMatch
});
const destination = path.resolve('governance/reports/agt02-all-26-accuracy-audit.json');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(r, null, 2) + '\n');
console.log(JSON.stringify({
  totalRoles: r.totalRoles,
  previouslyObservedLiveRuns: r.nativeOperationalMatches,
  currentRevisionLiveRuns: r.currentRevisionNativeMatches,
  currentEngineSourceHashMatched: r.currentEngineSourceHashMatched,
  analyticPassedUncertified: r.arithmeticScreenPassedUncertified,
  analyticFailed: r.arithmeticScreenFailed,
  independentQualitativeReviewsPending: r.qualitativeSpecialistReviewsPending,
  independentlyAccepted: r.independentlyAcceptedRoles,
  output: destination
}, null, 2));
if (process.argv.includes('--require-full-acceptance') && r.independentlyAcceptedRoles !== 26) {
  process.exitCode = 1;
}
