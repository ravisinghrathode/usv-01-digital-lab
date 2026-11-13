/**
 * Deliberately performs a real authenticated provider call. Never uses
 * deterministic/mock fallback, cannot attest engineering correctness.
 */
import { createHash } from 'node:crypto';
import { CodexCliProvider, GeminiProvider, GeminiCliProvider, type IModelProvider } from '../models/ModelProvider.ts';

export interface LiveCommissioningResult {
  status: 'LIVE_PROVIDER_PROBE_PASSED_UNVERIFIED';
  sourceCommit: string;
  provider: 'gemini' | 'codex_cli';
  transport: 'SDK_API_KEY' | 'GEMINI_CLI_OPERATOR_AUTH' | 'CODEX_CLI_OPERATOR_AUTH';
  modelUsed: string;
  responseDigest: string;
  actualLiveProviderCall: true;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  independentEngineeringEvidence: false;
  authorizedDesignRelease: false;
}

export async function commissionLiveModel(
  sourceCommit: string,
  modelName: string,
  provider?: IModelProvider
): Promise<LiveCommissioningResult> {
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error('Exact source commit required');
  if (!/^[A-Za-z0-9._-]{3,80}$/.test(modelName)) throw new Error('Explicit approved model ID required');
  let target:IModelProvider;
  let transport:LiveCommissioningResult['transport'];
  if (provider) {
    target=provider;
    transport=provider.name==='codex_cli'?'CODEX_CLI_OPERATOR_AUTH':
      provider.name==='gemini_cli'?'GEMINI_CLI_OPERATOR_AUTH':'SDK_API_KEY';
  } else if (process.env.AI_REVIEW_PROVIDER?.toLowerCase()==='codex_cli') {
    target=new CodexCliProvider();
    transport='CODEX_CLI_OPERATOR_AUTH';
  } else if (process.env.AI_REVIEW_PROVIDER?.toLowerCase()==='gemini_cli') {
    target=new GeminiCliProvider();
    transport='GEMINI_CLI_OPERATOR_AUTH';
  } else {
    const token = process.env.GEMINI_API_KEY;
    if (!token || token.trim().length < 16) throw new Error(
      'AUTH_REQUIRED: use an authenticated Gemini CLI with AI_REVIEW_PROVIDER=gemini_cli or provide GEMINI_API_KEY');
    target=new GeminiProvider();
    transport='SDK_API_KEY';
  }
  if (!['gemini','gemini_cli','codex_cli'].includes(target.name) || !(await target.isAvailable())) {
    throw new Error('Genuine authenticated live provider unavailable; synthetic/deterministic fallback forbidden');
  }
  const result = await target.generateText({
    systemInstructions: 'Return a JSON object with exactly one string field named readinessToken; return the literal text LIVE_USV01_PROBE. This probe has no engineering release authority.',
    userPrompt: 'Return {"readinessToken":"LIVE_USV01_PROBE"} as JSON, without extra fields.',
    context: { runType: 'NON_ENGINEERING_PROVIDER_AUTHENTICATION_PROBE', sourceCommit },
    correlationId: 'USV01-LIVE-PREFLIGHT-' + sourceCommit.slice(0,12)
  }, { preferredProvider: target.name==='codex_cli'?'codex_cli':target.name==='gemini_cli'?'gemini_cli':'gemini', modelName, fallbackToMock: false, temperature: 0 });
  const expectedProvider = target.name === 'codex_cli' ? 'codex_cli' : 'gemini';
  if (result.providerUsed !== expectedProvider || result.executionMode !== 'LIVE_AI_GENERATION' ||
      result.isMock !== false || result.evidenceValid !== false ||
      !result.modelUsed || !result.parsedJson ||
      result.parsedJson.readinessToken !== 'LIVE_USV01_PROBE') {
    throw new Error('Provider authenticity or structured probe failed; no fallback accepted');
  }
  return {
    status: 'LIVE_PROVIDER_PROBE_PASSED_UNVERIFIED',
    sourceCommit, provider: expectedProvider, transport, modelUsed: result.modelUsed,
    responseDigest: 'sha256:' + createHash('sha256').update(result.content).digest('hex'),
    actualLiveProviderCall: true, usage: result.tokenUsage || null,
    independentEngineeringEvidence: false, authorizedDesignRelease: false
  };
}
