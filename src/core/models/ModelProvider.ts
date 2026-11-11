import { ModelConfig } from '../types/agent.ts';

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
  evidenceValid?: boolean;
}

export interface IModelProvider {
  name: string;
  isAvailable(): Promise<boolean> | boolean;
  generateText(request: ModelPromptRequest, config?: ModelConfig): Promise<ModelPromptResponse>;
}

// 1. Mock Deterministic Provider (Zero-credential, robust offline execution & CI testing)
export class MockDeterministicProvider implements IModelProvider {
  name = 'mock_deterministic';

  isAvailable(): boolean {
    return true;
  }

  async generateText(request: ModelPromptRequest, config?: ModelConfig): Promise<ModelPromptResponse> {
    const { systemInstructions, userPrompt, context } = request;

    // Synthesize realistic naval engineering responses based on prompt keywords
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
      resultData.disciplineSummary = 'Hydrostatic characteristics verified against intact stability standards.';
      resultData.keyMetrics = {
        ...resultData.keyMetrics,
        hydrostaticAudit: 'PASS',
        minTransverseMetacentricHeight: 'GMt > 0.35m'
      };
    } else if (isResistance) {
      resultData.disciplineSummary = 'Hydrodynamic resistance evaluated across transit and sprint profiles.';
      resultData.keyMetrics = {
        ...resultData.keyMetrics,
        regimeClassification: 'Semi-displacement',
        recommendedThrustMargin: '25%'
      };
    } else if (isElectrical) {
      resultData.disciplineSummary = 'DC bus architecture and continuous hotel/propulsion balance evaluated.';
      resultData.keyMetrics = {
        ...resultData.keyMetrics,
        nominalBusVoltage: '48V DC',
        converterMargin: '20%'
      };
    }

    return {
      content: JSON.stringify(resultData, null, 2),
      parsedJson: resultData,
      providerUsed: 'mock_deterministic',
      modelUsed: config?.modelName || 'deterministic-marine-engine-v1',
      tokenUsage: { promptTokens: 120, completionTokens: 180, totalTokens: 300 },
      isMock: true,
      evidenceValid: false
    };
  }
}

// 2. Gemini Provider (Configured via environment variable GEMINI_API_KEY)
export class GeminiProvider implements IModelProvider {
  name = 'gemini';
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generateText(request: ModelPromptRequest, config?: ModelConfig): Promise<ModelPromptResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY in environment or use MockDeterministicProvider.');
    }

    const model = config?.modelName || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const promptText = `${request.systemInstructions}\n\nContext:\n${JSON.stringify(request.context, null, 2)}\n\nTask Instructions:\n${request.userPrompt}\n\nRespond with valid JSON matching standard output format.`;

    const response = await fetch(endpoint, {
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

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errBody}`);
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
      tokenUsage: {
        promptTokens: data?.usageMetadata?.promptTokenCount || 0,
        completionTokens: data?.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data?.usageMetadata?.totalTokenCount || 0
      }
    };
  }
}

// 3. Model Provider Router / Dispatcher
export class ModelProviderRouter {
  private static instance: ModelProviderRouter;
  private providers: Map<string, IModelProvider> = new Map();

  private constructor() {
    this.registerProvider(new MockDeterministicProvider());
    this.registerProvider(new GeminiProvider());
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

  public async generate(request: ModelPromptRequest, config: ModelConfig): Promise<ModelPromptResponse> {
    const preferred = this.providers.get(config.preferredProvider);

    if (preferred && (await Promise.resolve(preferred.isAvailable()))) {
      try {
        return await preferred.generateText(request, config);
      } catch (err) {
        if (!config.fallbackToMock) {
          throw new Error(`Preferred provider '${config.preferredProvider}' failed and fallbackToMock is disabled: ${err}`);
        }
        console.warn(`[SAFETY ALERT] Preferred provider '${config.preferredProvider}' failed. Falling back to UNVERIFIED mock simulation.`);
      }
    } else if (config.preferredProvider !== 'mock_deterministic') {
      if (!config.fallbackToMock) {
        throw new Error(`Preferred provider '${config.preferredProvider}' is unavailable and fallbackToMock is disabled. Cannot synthesize unverified engineering evidence.`);
      }
      console.warn(`[SAFETY ALERT] Preferred provider '${config.preferredProvider}' is unavailable. Falling back to UNVERIFIED mock simulation.`);
    }

    // Fallback to Mock Provider
    const fallback = this.providers.get('mock_deterministic')!;
    const response = await fallback.generateText(request, config);
    response.isMock = true;
    response.evidenceValid = false;
    return response;
  }
}
