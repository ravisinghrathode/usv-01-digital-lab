/**
 * Agent Academy: bounded quota-triggered Gemini Hydrogen study fallback.
 *
 * This is NOT a generic provider switch: only Codex provider-quota signals may
 * enter this route, only public lesson excerpts are transferred, and the
 * Google OAuth / classification / research-only gates remain mandatory.
 *
 * Neither a model response nor any CI test grants independent qualification.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import {
  GeminiCliProvider, type IModelProvider, type ModelPromptRequest
} from '../models/ModelProvider.ts';
import {
  GEMINI_HYDROGEN_MODEL, codexFallbackReason, geminiTransferAuthorized
} from '../models/DualSubscriptionRoutingPolicy.ts';
import { isQuotaFailure, QuotaResilience } from '../mission-control/QuotaResilience.ts';

type QuotaBudget = Pick<QuotaResilience, 'reserve' | 'recordSuccess' | 'recordQuotaFailure'>;

export interface AcademyGeminiStudyReceipt {
  provider: 'gemini_cli';
  modelUsed: typeof GEMINI_HYDROGEN_MODEL;
  status: 'COMPLETED_UNGRADED';
  content: string;
  publicMaterialSha256: string;
  fallbackReason: 'CODEX_QUOTA';
}

interface AcademyGeminiOptions {
  root: string;
  canonicalId: string;
  sourceSha: string;
  primaryError: unknown;
  env?: NodeJS.ProcessEnv;
  provider?: IModelProvider;
  budget?: QuotaBudget;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * The CLI runs in an isolated EMPTY workspace. Never forward the complete
 * Codex prompt, any private project context, local skills, docs, loaded
 * attachments, vessel parameters or provider session metadata.
 *
 * Only the specifically authorized, public source-controlled teaching
 * excerpts below are included in the secondary model request.
 */
export function publicAcademyStudyExcerpt(root: string, canonicalId: string): {
  text: string; sha256: string
} {
  if (!/^A(?:0[1-9]|1[0-9]|2[0-6])$/.test(canonicalId)) {
    throw new Error('USV_GEMINI_INVALID_ROLE: only A01–A26 may study');
  }
  const read = (file: string) => fs.readFileSync(path.join(root, 'docs', 'academy', file), 'utf8');
  const first = read('COHORT_01_OPEN_BOOK_LESSONS.md');
  const map = read('ALL_26_ROLE_STUDY_MAP.md');
  const foundationHeading = '## F01–F05: mandatory common foundation';
  const foundationStart = first.indexOf(foundationHeading);
  const foundationEnd = first.indexOf('\n### Source candidates', foundationStart);
  if (foundationStart < 0 || foundationEnd < foundationStart) {
    throw new Error('USV_GEMINI_PUBLIC_LESSON_INVALID: foundation module section missing');
  }
  const foundation = first.slice(foundationStart, foundationEnd);
  let speciality: string;
  const specificHeading = '## ' + canonicalId + ' |';
  const detailedStart = first.indexOf(specificHeading);
  if (detailedStart >= 0) {
    const otherStart = first.indexOf('\n## A', detailedStart + specificHeading.length);
    const footer = first.indexOf('\n## Student output contract', detailedStart);
    const end = Math.min(...[otherStart, footer, first.length].filter(n => n > detailedStart));
    speciality = first.slice(detailedStart, end);
  } else {
    const tableLine = map.split('\n').find(line => line.startsWith('| ' + canonicalId + ' '));
    if (!tableLine) throw new Error('USV_GEMINI_PUBLIC_LESSON_INVALID: no role exercise');
    speciality = tableLine;
  }
  const text = [
    'PUBLIC, OPEN-BOOK STUDY MATERIAL ONLY; NOT ENGINEERING EVIDENCE.',
    foundation,
    '## Your specialist learning exercise',
    speciality,
    'Boundaries: do not claim actual vessel values, applied class standards,',
    'independent benchmarks, executed deterministic tools or safety approval.',
    'No external references were loaded; name such source gaps explicitly.'
  ].join('\n\n');
  return { text, sha256: sha256(text) };
}

export async function runAcademyGeminiQuotaFallback(
  options: AcademyGeminiOptions
): Promise<AcademyGeminiStudyReceipt> {
  if (codexFallbackReason(options.primaryError) !== 'CODEX_QUOTA') {
    throw new Error('USV_GEMINI_FALLBACK_DENIED: only Codex provider quota is retryable');
  }
  const env = options.env ?? process.env;
  if (!geminiTransferAuthorized(env)) {
    throw new Error(
      'USV_GEMINI_TRANSFER_BLOCKED: enable reviewed public-only dual-provider routing ' +
      'and verify operator Google OAuth. Restricted or unknown data must never transfer.'
    );
  }
  if (!/^[a-f0-9]{40}$/i.test(options.sourceSha)) {
    throw new Error('USV_GEMINI_SOURCE_UNPINNED: exact Git revision required');
  }
  const publicLesson = publicAcademyStudyExcerpt(options.root, options.canonicalId);
  const provider = options.provider ?? new GeminiCliProvider();
  if (!(await Promise.resolve(provider.isAvailable()))) {
    throw new Error('USV_GEMINI_FALLBACK_UNAVAILABLE: signed-in Gemini CLI not available');
  }
  const budget = options.budget ?? new QuotaResilience(
    path.join(os.homedir(), '.usv01', 'runtime', 'gemini-quota.json')
  );
  await budget.reserve();
  const request: ModelPromptRequest = {
    systemInstructions: [
      'You are a specialist in an OPEN-BOOK public educational exercise.',
      'Use ONLY the supplied public lesson text, with no other files, tools, browsing or sources.',
      'No claims of real-vessel verification, certification, unseen exams or tool executions.',
      'Return one JSON object with exactly the requested study report fields.'
    ].join(' '),
    userPrompt: [
      'Produce an ungraded STUDY REPORT and work the role exercise.',
      'Include canonicalId: ' + options.canonicalId,
      'Include sourceSha: ' + options.sourceSha,
      'Include trainingStatus: "UNGRADED_STUDY"',
      'Include learningNotes: a nonempty array of substantive educational observations.',
      'Include workedReasoning: a nonempty string with assumptions, units and worked steps.',
      'Include missingSources: an array naming unverified or inaccessible references.',
      'Include safetyHolds: a nonempty array naming constraints and failure conditions.',
      'Include engineeringReleaseApproved: false',
      'Include independentlyQualified: false',
      'Never assert that external files, standards, measurements or Tools were accessed.'
    ].join('\n'),
    context: {
      canonicalId: options.canonicalId,
      sourceSha: options.sourceSha,
      publicLessonSha256: publicLesson.sha256,
      publicLesson: publicLesson.text
    },
    correlationId: 'ACADEMY-GEMINI-' + options.canonicalId
  };

  try {
    const result = await provider.generateText(request, {
      preferredProvider: 'gemini_cli', modelName: GEMINI_HYDROGEN_MODEL
    });
    if (result.providerUsed !== 'gemini_cli' ||
        result.modelUsed !== GEMINI_HYDROGEN_MODEL ||
        result.isMock || result.executionMode !== 'LIVE_AI_GENERATION') {
      throw new Error(
        'USV_GEMINI_MODEL_NOT_VERIFIED: exact Hydrogen model must appear in actual CLI usage metadata'
      );
    }
    const r = result.parsedJson;
    if (!r || typeof r !== 'object' || Array.isArray(r) ||
        r.canonicalId !== options.canonicalId || r.sourceSha !== options.sourceSha ||
        r.trainingStatus !== 'UNGRADED_STUDY' ||
        r.engineeringReleaseApproved !== false || r.independentlyQualified !== false ||
        !Array.isArray(r.learningNotes) || r.learningNotes.length === 0 ||
        typeof r.workedReasoning !== 'string' || !r.workedReasoning.trim() ||
        !Array.isArray(r.missingSources) ||
        !Array.isArray(r.safetyHolds) || r.safetyHolds.length === 0) {
      throw new Error('USV_GEMINI_STUDY_SCHEMA_INVALID: study response rejected; not completed');
    }
    await budget.recordSuccess();
    return {
      provider: 'gemini_cli',
      modelUsed: GEMINI_HYDROGEN_MODEL,
      status: 'COMPLETED_UNGRADED',
      content: result.content,
      publicMaterialSha256: publicLesson.sha256,
      fallbackReason: 'CODEX_QUOTA'
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isQuotaFailure(message)) await budget.recordQuotaFailure();
    throw error;
  }
}
