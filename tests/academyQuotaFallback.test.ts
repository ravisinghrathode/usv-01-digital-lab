import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAcademyGeminiQuotaFallback, publicAcademyStudyExcerpt }
  from '../src/core/academy/AcademyQuotaFallback.ts';
import { GEMINI_HYDROGEN_MODEL }
  from '../src/core/models/DualSubscriptionRoutingPolicy.ts';
import type { IModelProvider, ModelPromptRequest, ModelPromptResponse }
  from '../src/core/models/ModelProvider.ts';

const saved = { ...process.env };
afterEach(() => {
  for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
  Object.assign(process.env, saved);
});

const sourceSha = 'a'.repeat(40);
function authorizedEnv(): NodeJS.ProcessEnv {
  return {
    AI_REVIEW_PROVIDER: 'codex_cli',
    USV_SUBSCRIPTION_PILOT: 'enabled',
    USV_ALLOW_PAID_AI_API: 'false',
    USV_NO_PAID_API: '1',
    USV_LAB_SCOPE: 'RESEARCH_ONLY',
    USV_DUAL_PROVIDER_ROUTING: 'enabled',
    USV_GEMINI_FALLBACK_APPROVED: 'true',
    USV_GEMINI_OAUTH_REVIEWED: 'true',
    USV_GEMINI_DATA_CLASSIFICATION: 'PUBLIC_NON_SENSITIVE'
  };
}
function quotaBudget() {
  return {
    reserve: vi.fn(async () => ({ state: 'AVAILABLE' })),
    recordSuccess: vi.fn(async () => {}),
    recordQuotaFailure: vi.fn(async () => ({ state: 'WAITING_FOR_QUOTA' }))
  };
}
function completed(req: ModelPromptRequest, model: string = GEMINI_HYDROGEN_MODEL): ModelPromptResponse {
  const body = {
    canonicalId: req.context.canonicalId,
    sourceSha: req.context.sourceSha,
    trainingStatus: 'UNGRADED_STUDY',
    learningNotes: ['checked SI units and input uncertainty'],
    workedReasoning: 'Synthetic screen: inputs -> dimensional equation -> calculated result.',
    missingSources: ['verified vessel configuration and external reference'],
    safetyHolds: ['no safety release or physical hardware command'],
    engineeringReleaseApproved: false,
    independentlyQualified: false
  };
  return {
    providerUsed: 'gemini_cli', modelUsed: model, content: JSON.stringify(body),
    parsedJson: body, executionMode: 'LIVE_AI_GENERATION', isMock: false,
    isAiReview: true, evidenceValid: false, timestamp: '2026-11-15T12:00:00Z'
  };
}
function provider(mock: (req: ModelPromptRequest) => ModelPromptResponse): IModelProvider {
  return { name: 'gemini_cli', isAvailable: () => true,
    generateText: async req => mock(req) };
}
const base = { root: process.cwd(), canonicalId: 'A05', sourceSha,
  primaryError: new Error('USV_QUOTA_WAIT: PROVIDER_QUOTA_EXHAUSTED') };

describe('Agent Academy Hydrogen fallback', () => {
  it('extracts the public-only specialist lesson without loading project files', () => {
    const detailed = publicAcademyStudyExcerpt(process.cwd(), 'A05');
    const tabular = publicAcademyStudyExcerpt(process.cwd(), 'A01');
    expect(detailed.text).toContain('## A05');
    expect(tabular.text).toContain('| A01 |');
    expect(detailed.text).toContain('F01');
    expect(detailed.text).not.toContain('USV01_PROJECT_CONTEXT.md');
    expect(detailed.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(() => publicAcademyStudyExcerpt(process.cwd(), 'A27')).toThrow();
  });

  it('switches on a provider quota, logs the observed model and only transmits public lessons', async () => {
    const budget = quotaBudget();
    let requestSeen: ModelPromptRequest | undefined;
    let requestedModel = '';
    const transport: IModelProvider = {
      name: 'gemini_cli', isAvailable: () => true,
      generateText: async (request, config) => {
        requestSeen = request;
        requestedModel = config?.modelName || '';
        return completed(request);
      }
    };
    const receipt = await runAcademyGeminiQuotaFallback({
      ...base, env: authorizedEnv(), provider: transport, budget: budget as any
    });
    expect(receipt.status).toBe('COMPLETED_UNGRADED');
    expect(receipt.provider).toBe('gemini_cli');
    expect(receipt.modelUsed).toBe(GEMINI_HYDROGEN_MODEL);
    expect(receipt.fallbackReason).toBe('CODEX_QUOTA');
    expect(receipt.publicMaterialSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(requestedModel).toBe(GEMINI_HYDROGEN_MODEL);
    expect(requestSeen?.context).toHaveProperty('publicLesson');
    expect(requestSeen?.context).not.toHaveProperty('privateProjectContext');
    expect(JSON.stringify(requestSeen)).not.toContain('USV01_PROJECT_CONTEXT.md');
    expect(budget.reserve).toHaveBeenCalledOnce();
    expect(budget.recordSuccess).toHaveBeenCalledOnce();
  });

  it('refuses secondary transport without data rights or reviewed OAuth', async () => {
    const budget = quotaBudget();
    const unsafe = authorizedEnv();
    unsafe.USV_GEMINI_DATA_CLASSIFICATION = 'RESTRICTED_NAVAL';
    await expect(runAcademyGeminiQuotaFallback({
      ...base, env: unsafe, budget: budget as any,
      provider: provider(completed)
    })).rejects.toThrow(/USV_GEMINI_TRANSFER_BLOCKED/);
    expect(budget.reserve).not.toHaveBeenCalled();
  });

  it('never evades a local spending budget, corrupt ledger or safety refusal', async () => {
    for (const message of [
      'USV_QUOTA_WAIT: LOCAL_REQUEST_BUDGET_EXHAUSTED',
      'USV_QUOTA_WAIT: QUOTA_LEDGER_CORRUPT',
      'unsafe request refused',
      'invalid JSON output'
    ]) {
      await expect(runAcademyGeminiQuotaFallback({
        ...base, primaryError: new Error(message),
        env: authorizedEnv(), provider: provider(completed)
      })).rejects.toThrow(/USV_GEMINI_FALLBACK_DENIED/);
    }
  });

  it('does not silently relabel a different Gemini model as Hydrogen', async () => {
    await expect(runAcademyGeminiQuotaFallback({
      ...base, env: authorizedEnv(), budget: quotaBudget() as any,
      provider: provider(req => completed(req, 'gemini-3.5-pro'))
    })).rejects.toThrow(/USV_GEMINI_MODEL_NOT_VERIFIED/);
    await expect(runAcademyGeminiQuotaFallback({
      ...base, env: authorizedEnv(), budget: quotaBudget() as any,
      provider: provider(req => completed(req, GEMINI_HYDROGEN_MODEL + '-requested-unverified'))
    })).rejects.toThrow(/USV_GEMINI_MODEL_NOT_VERIFIED/);
  });

  it('rejects incomplete or self-certifying study reports', async () => {
    await expect(runAcademyGeminiQuotaFallback({
      ...base, env: authorizedEnv(), budget: quotaBudget() as any,
      provider: provider(req => {
        const response = completed(req);
        response.parsedJson = { ...response.parsedJson, independentlyQualified: true };
        return response;
      })
    })).rejects.toThrow(/USV_GEMINI_STUDY_SCHEMA_INVALID/);
  });

  it('records secondary quota errors separately and does not fabricate success', async () => {
    const budget = quotaBudget();
    await expect(runAcademyGeminiQuotaFallback({
      ...base, env: authorizedEnv(), budget: budget as any,
      provider: {
        name: 'gemini_cli', isAvailable: () => true,
        generateText: async () => { throw new Error('429 too many requests'); }
      }
    })).rejects.toThrow(/429/);
    expect(budget.recordQuotaFailure).toHaveBeenCalledOnce();
    expect(budget.recordSuccess).not.toHaveBeenCalled();
  });
});
