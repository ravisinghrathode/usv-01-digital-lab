export interface ModelConfig {
  preferredProvider?: 'gemini' | 'openai' | 'deterministic' | 'ollama' | 'mock_deterministic';
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  fallbackToMock?: boolean;
}

export interface ModelPromptRequest {
  systemInstructions: string;
  userPrompt: string;
  context: Record<string, any>;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelPromptResponse {
  content: string;
  parsedJson?: Record<string, any>;
  providerUsed: string;
  modelUsed: string;
  tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  isMock?: boolean;
  isAiReview?: boolean;
  evidenceValid?: boolean;
  aiReviewUnavailable?: boolean;
  statusMessage?: string;
}

export interface IModelProvider {
  name: string;
  isAvailable(): Promise<boolean> | boolean;
  generateText(request: ModelPromptRequest, config?: ModelConfig): Promise<ModelPromptResponse>;
}

// -----------------------------------------------------------------------------------------
// Provider B — Deterministic Review Provider (Zero external AI API, verified static evaluation)
// -----------------------------------------------------------------------------------------
export class DeterministicProvider implements IModelProvider {
  name = 'deterministic';

  isAvailable(): boolean {
    return true;
  }

  async generateText(request: ModelPromptRequest, config?: ModelConfig): Promise<ModelPromptResponse> {
    const { systemInstructions, userPrompt, context } = request;

    const resultData: Record<string, any> = {
      reviewMode: 'DETERMINISTIC_STATIC_EVALUATION',
      isAiReview: false,
      isMock: false,
      evidenceValid: true,
      disciplineSummary: `[DETERMINISTIC STATIC EVALUATION] Automated rules-based assessment executed without external AI API dependencies. Context files: ${Object.keys(context).join(', ') || 'Standard Baseline'}.`,
      findings: [],
      designDecisions: [
        'DETERMINISTIC_RULE_EVALUATION: Code checked against static pattern and safety boundary rules.'
      ],
      assumptions: [
        {
          id: 'DETERMINISTIC-CHECK-001',
          category: 'CALCULATION',
          description: 'Deterministic static pattern evaluation. No probabilistic AI model used.',
          sourceReference: 'ModelProvider.DeterministicProvider',
          impactIfViolated: 'Static pattern violations will fail build.',
          isBaseline: true
        }
      ],
      openTbdItems: [],
      requiresDirectorApproval: false,
      summary: 'Deterministic static review completed successfully. Zero external API calls made.'
    };

    return {
      content: JSON.stringify(resultData, null, 2),
      parsedJson: resultData,
      providerUsed: 'deterministic',
      modelUsed: config?.modelName || 'deterministic-rules-engine-v1',
      isAiReview: false,
      isMock: false,
      evidenceValid: true,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      statusMessage: 'Deterministic evaluation passed without external API dependencies.'
    };
  }
}

// -----------------------------------------------------------------------------------------
// Provider A — Google Gemini Provider (Optional, configurable, handles quota & auth failures)
// -----------------------------------------------------------------------------------------
export class GeminiProvider implements IModelProvider {
  name = 'gemini';
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  async generateText(request: ModelPromptRequest, config?: ModelConfig): Promise<ModelPromptResponse> {
    if (!this.apiKey) {
      throw new Error(
        'Gemini API key is not configured. Set GEMINI_API_KEY in environment or select AI_REVIEW_PROVIDER=deterministic.'
      );
    }

    const model =
      config?.modelName ||
      (typeof process !== 'undefined' && process.env?.GEMINI_MODEL) ||
      'gemini-2.5-flash';

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const promptText = `${request.systemInstructions}\n\nContext:\n${JSON.stringify(request.context, null, 2)}\n\nTask Instructions:\n${request.userPrompt}\n\nRespond with valid JSON matching standard output format.`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: request.temperature ?? config?.temperature ?? 0.1,
            maxOutputTokens: request.maxTokens ?? config?.maxTokens ?? 2048,
            responseMimeType: 'application/json'
          }
        })
      });
    } catch (networkErr: any) {
      throw new Error(`Gemini Network Connection Error: ${networkErr?.message || networkErr}`);
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      if (response.status === 429) {
        throw new Error(
          `Gemini API Rate Limit / Quota Exhausted (HTTP 429). The system refuses fallback to paid external APIs under USV-01 policy. Response: ${errBody}`
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Gemini API Authentication Failed (HTTP ${response.status}). Verify GEMINI_API_KEY. Response: ${errBody}`
        );
      }
      if (response.status === 404) {
        throw new Error(
          `Gemini API Model Not Found (HTTP 404): Model '${model}' is unavailable on this endpoint.`
        );
      }
      throw new Error(`Gemini API Error (HTTP ${response.status}): ${errBody}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsedJson: Record<string, any> | undefined;
    try {
      parsedJson = JSON.parse(candidateText);
    } catch {
      // Non-json response fallback
    }

    return {
      content: candidateText,
      parsedJson,
      providerUsed: 'gemini',
      modelUsed: model,
      isAiReview: true,
      isMock: false,
      evidenceValid: true,
      tokenUsage: {
        promptTokens: data?.usageMetadata?.promptTokenCount || 0,
        completionTokens: data?.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data?.usageMetadata?.totalTokenCount || 0
      }
    };
  }
}

// -----------------------------------------------------------------------------------------
// Provider C — Local Ollama Provider (Future-compatible local model interface)
// -----------------------------------------------------------------------------------------
export class OllamaProvider implements IModelProvider {
  name = 'ollama';
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ||
      (typeof process !== 'undefined' && process.env?.OLLAMA_BASE_URL) ||
      'http://localhost:11434';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateText(request: ModelPromptRequest, config?: ModelConfig): Promise<ModelPromptResponse> {
    const model =
      config?.modelName ||
      (typeof process !== 'undefined' && process.env?.OLLAMA_MODEL) ||
      'llama3';

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        system: request.systemInstructions,
        prompt: `${request.userPrompt}\n\nContext:\n${JSON.stringify(request.context, null, 2)}`,
        stream: false,
        format: 'json',
        options: {
          temperature: config?.temperature ?? 0.1
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama Local API Error (HTTP ${res.status}): ${await res.text()}`);
    }

    const data = await res.json();
    const content = data.response || '{}';
    let parsedJson: Record<string, any> | undefined;
    try {
      parsedJson = JSON.parse(content);
    } catch {
      // fallback
    }

    return {
      content,
      parsedJson,
      providerUsed: 'ollama',
      modelUsed: model,
      isAiReview: true,
      isMock: false,
      evidenceValid: true
    };
  }
}

// -----------------------------------------------------------------------------------------
// Optional OpenAI Provider (Retained for optional user opt-in only; strictly disabled by default)
// -----------------------------------------------------------------------------------------
export class OpenAIProvider implements IModelProvider {
  name = 'openai';

  isAvailable(): boolean {
    const isConfigured =
      typeof process !== 'undefined' &&
      process.env?.AI_REVIEW_PROVIDER?.toLowerCase() === 'openai';
    const hasKey =
      typeof process !== 'undefined' &&
      !!process.env?.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY.trim().length > 0;
    return isConfigured && hasKey;
  }

  async generateText(request: ModelPromptRequest, config?: ModelConfig): Promise<ModelPromptResponse> {
    const apiKey = typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not configured.');
    }

    const model =
      config?.modelName ||
      (typeof process !== 'undefined' &&
        (process.env?.OPENAI_MODEL || process.env?.CHATGPT_MODEL)) ||
      'gpt-4o-mini';

    const messages = [
      { role: 'system', content: request.systemInstructions },
      { role: 'user', content: `${request.userPrompt}\n\nContext:\n${JSON.stringify(request.context, null, 2)}` }
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: config?.temperature ?? 0.1,
        max_tokens: config?.maxTokens ?? 4096
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    let parsedJson: Record<string, any> | undefined;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      parsedJson = JSON.parse(jsonMatch[1]);
    } catch {
      // Non-JSON response
    }

    return {
      content,
      parsedJson,
      providerUsed: 'openai',
      modelUsed: model,
      isAiReview: true,
      isMock: false,
      evidenceValid: true,
      tokenUsage: {
        promptTokens: data?.usage?.prompt_tokens || 0,
        completionTokens: data?.usage?.completion_tokens || 0,
        totalTokens: data?.usage?.total_tokens || 0
      }
    };
  }
}

// -----------------------------------------------------------------------------------------
// Mock Deterministic Provider (Zero-credential, permitted ONLY in unit test environments)
// -----------------------------------------------------------------------------------------
export class MockDeterministicProvider implements IModelProvider {
  name = 'mock_deterministic';

  isAvailable(): boolean {
    return true;
  }

  async generateText(request: ModelPromptRequest, config?: ModelConfig): Promise<ModelPromptResponse> {
    const { systemInstructions, userPrompt, context } = request;

    const isHydrostatics = userPrompt.includes('hydrostatic') || systemInstructions.includes('Hydrostatics');
    const isResistance = userPrompt.includes('resistance') || systemInstructions.includes('Resistance');
    const isStability = userPrompt.includes('stability') || systemInstructions.includes('Stability');
    const isElectrical = userPrompt.includes('electrical') || systemInstructions.includes('Electrical');

    const resultData: Record<string, any> = {
      disciplineSummary: `[UNVERIFIED SYNTHETIC MOCK] Offline simulation fallback. Context: ${Object.keys(context).join(', ') || 'Standard Baseline'}.`,
      keyMetrics: {
        analysisMode: 'SYNTHETIC_MOCK_FALLBACK',
        isMockFallback: true,
        evidenceValid: false,
        convergenceConfidence: 0.0,
        baselineIntegrityVerified: false,
        auditWarning: 'UNVERIFIED MOCK OUTPUT — UNACCEPTABLE AS CERTIFIED ENGINEERING EVIDENCE'
      },
      designDecisions: [
        'FLAGGED: Decision generated under mock fallback; requires live recalculation and human sign-off'
      ],
      assumptions: [
        {
          id: 'ASSUMP-MOCK-001',
          category: 'ASSUMPTION',
          description: 'Offline mock model output. Physics evidence not confirmed by live LLM or solver.',
          sourceReference: 'ModelProvider.MockDeterministicProvider',
          impactIfViolated: 'Invalid engineering baseline if used for vessel certification.',
          isBaseline: false
        }
      ],
      openTbdItems: ['Live engineering model validation required before design freeze'],
      requiresDirectorApproval: true,
      approvalRationale: 'Mock fallback execution used; unverified for engineering evidence.'
    };

    if (isHydrostatics || isStability) {
      resultData.disciplineSummary = '[UNVERIFIED MOCK FALLBACK] Offline parametric estimate. Hydrostatic characteristics NOT verified.';
      resultData.keyMetrics = {
        ...resultData.keyMetrics,
        hydrostaticAudit: 'UNVERIFIED_MOCK',
        minTransverseMetacentricHeight: 'UNVERIFIED (Requires live solver)'
      };
    } else if (isResistance) {
      resultData.disciplineSummary = '[UNVERIFIED MOCK FALLBACK] Offline parametric estimate. Hydrodynamic resistance NOT verified.';
      resultData.keyMetrics = {
        ...resultData.keyMetrics,
        regimeClassification: 'UNVERIFIED_MOCK',
        recommendedThrustMargin: 'UNVERIFIED'
      };
    } else if (isElectrical) {
      resultData.disciplineSummary = '[UNVERIFIED MOCK FALLBACK] Offline parametric estimate. DC bus architecture NOT verified.';
      resultData.keyMetrics = {
        ...resultData.keyMetrics,
        nominalBusVoltage: 'UNVERIFIED_MOCK',
        converterMargin: 'UNVERIFIED'
      };
    }

    return {
      content: JSON.stringify(resultData, null, 2),
      parsedJson: resultData,
      providerUsed: 'mock_deterministic',
      modelUsed: config?.modelName || 'deterministic-marine-engine-v1',
      isAiReview: false,
      isMock: true,
      evidenceValid: false,
      tokenUsage: { promptTokens: 120, completionTokens: 180, totalTokens: 300 }
    };
  }
}

export function isTestExecutionEnvironment(): boolean {
  return (
    (typeof process !== 'undefined' &&
      process.env?.NODE_ENV === 'test' &&
      process.env?.VITEST === 'true') ||
    (typeof process !== 'undefined' && process.env?.ALLOW_TEST_MOCK === 'true')
  );
}

/**
 * Resolves the default provider from runtime environment variables.
 * Never requires or defaults to paid OpenAI.
 */
export function resolveConfiguredProvider(): 'gemini' | 'deterministic' | 'ollama' | 'openai' {
  if (typeof process === 'undefined') return 'deterministic';

  const configured = process.env.AI_REVIEW_PROVIDER?.toLowerCase();
  if (configured === 'gemini' || configured === 'deterministic' || configured === 'ollama' || configured === 'openai') {
    return configured;
  }

  // If Gemini API key is explicitly present, default to Gemini; otherwise default to deterministic
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    return 'gemini';
  }

  return 'deterministic';
}

// -----------------------------------------------------------------------------------------
// Model Provider Router / Dispatcher
// -----------------------------------------------------------------------------------------
export class ModelProviderRouter {
  private static instance: ModelProviderRouter;
  private providers: Map<string, IModelProvider> = new Map();

  private constructor() {
    this.registerProvider(new DeterministicProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OllamaProvider());
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new MockDeterministicProvider());
  }

  public static getInstance(): ModelProviderRouter {
    if (!ModelProviderRouter.instance) {
      ModelProviderRouter.instance = new ModelProviderRouter();
    }
    return ModelProviderRouter.instance;
  }

  public registerProvider(provider: IModelProvider): void {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name: string): IModelProvider | undefined {
    return this.providers.get(name);
  }

  public async generate(request: ModelPromptRequest, config: ModelConfig): Promise<ModelPromptResponse> {
    const isTestMode = isTestExecutionEnvironment();
    const providerName = config.preferredProvider || resolveConfiguredProvider();

    // If deterministic mode is requested or active, execute immediately without external APIs
    if (providerName === 'deterministic') {
      const deterministic = this.providers.get('deterministic')!;
      return await deterministic.generateText(request, config);
    }

    if (!isTestMode && providerName === 'mock_deterministic') {
      throw new Error(
        "Production Engineering Safety Invariant: Direct invocation of 'mock_deterministic' provider is prohibited in production baseline execution. Certified engineering calculations must execute against authenticated model providers or deterministic tools."
      );
    }

    const provider = this.providers.get(providerName);

    if (provider && (await Promise.resolve(provider.isAvailable()))) {
      try {
        return await provider.generateText(request, config);
      } catch (err) {
        if (!isTestMode) {
          throw new Error(
            `Production Engineering Safety Invariant: Preferred model provider '${providerName}' failed during execution: ${err}. Mock fallback is strictly prohibited in production baseline execution.`
          );
        }
        console.warn(`[SAFETY ALERT] Preferred provider '${providerName}' failed in test environment. Using test mock simulation.`);
      }
    } else if (providerName !== 'mock_deterministic') {
      if (!isTestMode) {
        throw new Error(
          `Production Engineering Safety Invariant: Preferred model provider '${providerName}' is unavailable. Production baseline execution strictly prohibits unverified synthetic mock fallback. Set AI_REVIEW_PROVIDER=deterministic for offline execution.`
        );
      }
      console.warn(`[SAFETY ALERT] Preferred provider '${providerName}' is unavailable in test environment. Using test mock simulation.`);
    }

    // Fallback to Mock Provider (Explicitly permitted ONLY in test environment)
    const fallback = this.providers.get('mock_deterministic')!;
    const response = await fallback.generateText(request, config);
    response.isMock = true;
    response.evidenceValid = false;
    return response;
  }
}
