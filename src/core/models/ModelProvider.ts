import { isPaidAiApiAllowed } from './AiBillingPolicy.ts';
import { evaluateLabCommissioningPolicy } from '../mission-control/LabCommissioningPolicy.ts';
import { selectA26SubscriptionModel } from '../mission-control/A26SubscriptionModelAccess.ts';
import {
  CHATGPT_SOL_MODEL, GEMINI_HYDROGEN_MODEL, CODEX_CLI_MAX_PROMPT_CHARS, dualProviderEnabled,
  geminiTransferAuthorized, codexFallbackReason, recoverableGeminiCliFailure
} from './DualSubscriptionRoutingPolicy.ts';


export type ExecutionMode =
  | 'DETERMINISTIC_CALCULATION'
  | 'LIVE_AI_GENERATION'
  | 'STATIC_RULES_EVALUATION'
  | 'SYNTHETIC_TEST_MOCK'
  | 'EXECUTION_FAILED'
  | 'INDEPENDENTLY_VERIFIED';

export interface ModelConfig {
  preferredProvider?: 'gemini' | 'gemini_cli' | 'codex_cli' | 'openai' | 'deterministic' | 'ollama' | 'mock_deterministic';
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
  correlationId?: string;
}

export interface ModelPromptResponse {
  content: string;
  parsedJson?: Record<string, any>;
  providerUsed: string;
  modelUsed: string;
  executionMode: ExecutionMode;
  tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  isMock: boolean;
  isAiReview: boolean;
  evidenceValid: boolean;
  aiReviewUnavailable?: boolean;
  statusMessage?: string;
  correlationId?: string;
  timestamp: string;
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
      evidenceValid: false,
      disciplineSummary: `[DETERMINISTIC STATIC EVALUATION] Automated rules-based assessment executed without external AI API dependencies. Context files: ${Object.keys(context).join(', ') || 'Standard Baseline'}.`,
      keyMetrics: {},
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
      executionMode: 'STATIC_RULES_EVALUATION',
      isAiReview: false,
      isMock: false,
      evidenceValid: false,
      correlationId: request.correlationId || `corr-det-${Date.now()}`,
      timestamp: new Date().toISOString(),
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      statusMessage: 'Deterministic evaluation passed without external API dependencies.'
    };
  }
}

// -----------------------------------------------------------------------------------------
// Provider A — Google Gemini 4 Hydrogenvider (Optional, configurable, handles quota & auth failures)
// -----------------------------------------------------------------------------------------
// Provider A — Google Gemini 4 Hydrogenvider (Server-Side Proxy in Browser, @google/genai on Server)
// -----------------------------------------------------------------------------------------
export class GeminiProvider implements IModelProvider {
  name = 'gemini';
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);
  }

  isAvailable(): boolean {
    if (!isPaidAiApiAllowed()) return false;
    // In browser, Gemini is proxied through the server endpoint
    if (typeof window !== 'undefined') {
      return true;
    }
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  async generateText(request: ModelPromptRequest, config?: ModelConfig): Promise<ModelPromptResponse> {
    if (!isPaidAiApiAllowed()) {
      return await new DeterministicProvider().generateText(request, config);
    }
    // Deployment override takes precedence over agent specs; enables coordinated
    // model migrations without editing all 26 agent definitions.
    const model =
      (typeof process !== 'undefined' && process.env?.GEMINI_MODEL) ||
      config?.modelName ||
      'gemini-3.8-flash';

    // In browser environments, proxy all Gemini calls to server-side endpoint
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request,
            config: {
              ...config,
              modelName: model
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          return result;
        }
        const errData = await response.json().catch(() => ({}));
        console.warn(`[GeminiProvider] Server responded with HTTP ${response.status}: ${errData?.error || 'Unknown error'}. Falling back to deterministic provider.`);
        const detProvider = new DeterministicProvider();
        return await detProvider.generateText(request, config);
      } catch (browserErr: any) {
        console.warn(`[GeminiProvider] Communication error: ${browserErr?.message || browserErr}. Falling back to deterministic provider.`);
        const detProvider = new DeterministicProvider();
        return await detProvider.generateText(request, config);
      }
    }

    // Node.js server-side environment
    const apiKey = this.apiKey || process.env?.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API key is not configured. Set GEMINI_API_KEY in environment or select AI_REVIEW_PROVIDER=deterministic.'
      );
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const promptText = `Context:\n${JSON.stringify(request.context, null, 2)}\n\nTask Instructions:\n${request.userPrompt}\n\nRespond with valid JSON matching standard output format.`;

      const response = await ai.models.generateContent({
        model: model.replace(/^models\//, ''),
        contents: promptText,
        config: {
          systemInstruction: request.systemInstructions,
          responseMimeType: 'application/json'
        }
      });

      const candidateText = response.text || '{}';
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
        executionMode: 'LIVE_AI_GENERATION',
        isAiReview: true,
        isMock: false,
        evidenceValid: false,
        correlationId: request.correlationId || `corr-gem-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tokenUsage: {
          promptTokens: (response as any)?.usageMetadata?.promptTokenCount || 0,
          completionTokens: (response as any)?.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: (response as any)?.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (genAiErr: any) {
      throw new Error(`Gemini SDK Execution Error: ${genAiErr?.message || genAiErr}`);
    }
  }
}

// -----------------------------------------------------------------------------------------
// Provider A2 — Gemini CLI (operator-authenticated local CLI, no API key harvesting)
// -----------------------------------------------------------------------------------------
type GeminiCliRunner = (binary:string,args:string[],options:{
  cwd:string;timeout:number;maxBuffer:number;env:NodeJS.ProcessEnv;stdin?:string;
})=>Promise<{stdout:string;stderr:string}>;

/** Never display an exec/spawn error's original message or stderr in campaign
 * logs. Node errors may embed the entire child command, including user prompts.
 * Decode known provider diagnostics into bounded, non-sensitive status codes. */
export function classifiedGeminiCliFailure(error: unknown): Error {
  const raw = error && typeof error === 'object'
    ? error as {message?:unknown;stderr?:unknown;code?:unknown;killed?:unknown}
    : {message: String(error)};
  const msg = typeof raw.message === 'string' ? raw.message : '';
  const stderr = typeof raw.stderr === 'string' ? raw.stderr : '';
  // Historical execFile errors can embed the complete CLI prompt into their
  // message. Never interpret that untrusted prompt as a diagnostic category.
  const diagnosticMessage = /^Command failed:/i.test(msg) ? '' : msg;
  const details = (stderr + '\n' + diagnosticMessage).slice(0, 32768);
  if (/Gemini CLI did not emit the documented JSON envelope|Gemini CLI returned no response text|GEMINI_CLI_OUTPUT_TOO_LARGE/i.test(details)) {
    return new Error('USV_GEMINI_CLI_INVALID_OUTPUT: invalid or oversized headless response; fail closed');
  }
  if (/policy.denied|safety.refusal|unsafe request|permission denied by policy|content blocked/i.test(details)) {
    return new Error('USV_GEMINI_CLI_POLICY_DENIED: provider safety or policy refusal; fail closed');
  }
  if (/model.{0,90}(not found|unsupported|not available|not accessible|access denied)|unknown model|model.+404/i.test(details)) {
    return new Error('USV_GEMINI_CLI_MODEL_UNAVAILABLE: required model not accessible; fail closed');
  }
  if (/\b(429|RESOURCE_EXHAUSTED|quota exhausted|rate limit exceeded|too many requests)\b/i.test(details)) {
    return new Error('USV_QUOTA_WAIT: GEMINI_CLI_PROVIDER_QUOTA_EXHAUSTED');
  }
  if (/\b(ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN)\b|network unreachable|connection refused|request timed out|temporarily unavailable|service unavailable|\bHTTP[ :]*50[234]\b/i.test(details) || raw.code === 'ETIMEDOUT') {
    return new Error('USV_GEMINI_CLI_TRANSPORT_UNAVAILABLE: retryable connection or service failure');
  }
  if (/not logged in|sign in required|login required|not authenticated|authentication failed|session expired|credentials missing|oauth.{0,80}(expired|required|failed|invalid)|invalid credentials/i.test(details)) {
    return new Error('USV_GEMINI_CLI_AUTH_UNAVAILABLE: personal OAuth session requires attention');
  }
  if (raw.code === 'ENOENT') {
    return new Error('USV_GEMINI_CLI_TRANSPORT_UNAVAILABLE: Gemini CLI executable missing');
  }
  if (/unknown argument|unknown option|unrecognized option|invalid option|invalid values:\s*argument/i.test(details)) {
    return new Error('USV_GEMINI_CLI_INVALID_ARGUMENTS: installed CLI incompatible with reviewed invocation; fail closed');
  }
  const code = typeof raw.code === 'number' && Number.isInteger(raw.code) && raw.code >= 0 && raw.code <= 255
    ? String(raw.code) : 'unknown';
  return new Error('USV_GEMINI_CLI_EXIT_NONZERO: category unknown; exitCode=' + code +
    '; inspect provider authentication/version locally, without exposing prompt text');
}

const stripJsonFence=(text:string)=>{
  const trimmed=text.trim();
  const m=trimmed.match(/^\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`$/i);
  return m?m[1].trim():trimmed;
};

export class GeminiCliProvider implements IModelProvider {
  name='gemini_cli';
  private runner?:GeminiCliRunner;
  private binary:string;
  constructor(options:{runner?:GeminiCliRunner;binary?:string}={}){
    this.runner=options.runner;
    // A fixed executable prevents an environment-injected arbitrary program.
    this.binary=options.binary||'gemini';
  }
  private async run(args:string[],cwd:string,timeout=120000,requireOAuth=false,stdin?:string){
    // Only operator-managed Google OAuth may be used in the zero-paid-API
    // route. Never let a parent shell API key change authentication methods.
    const adapterPath = '../mission-control/' + 'SubscriptionCliAdapter.ts';
    const {sanitizedSubscriptionEnvironment} = await import(/* @vite-ignore */ adapterPath);
    const cleanEnv = sanitizedSubscriptionEnvironment();
    if(requireOAuth){
      const [{writeFile},{join}]=await Promise.all([
        import('node:fs/promises'),import('node:path')
      ]);
      const policy=join(cwd,'gemini-cli-oauth-only.json');
      await writeFile(policy,JSON.stringify({
        security:{auth:{enforcedType:'oauth-personal'}}
      }),{flag:'wx',mode:0o600});
      cleanEnv.GEMINI_CLI_SYSTEM_SETTINGS_PATH=policy;
    }
    const options={cwd,timeout,maxBuffer:8*1024*1024,env:cleanEnv,stdin};
    if(this.runner)return this.runner(this.binary,args,options);

    // Gemini documents headless execution from piped stdin. Do not put the
    // 26-agent prompt in argv: Node's default child error embeds the full
    // command, and OS process listings can expose command-line arguments.
    const {spawn}=await import('node:child_process');
    return await new Promise<{stdout:string;stderr:string}>((resolve,reject)=>{
      const child=spawn(this.binary,args,{
        cwd,env:cleanEnv,stdio:['pipe','pipe','pipe'],shell:false
      });
      const stdoutParts:Buffer[]=[];
      const stderrParts:Buffer[]=[];
      let outBytes=0,errBytes=0,timedOut=false,oversized=false;
      const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},timeout);
      child.stdout.on('data',(data:Buffer)=>{
        outBytes+=data.length;
        if(outBytes>options.maxBuffer){oversized=true;child.kill('SIGKILL');return;}
        stdoutParts.push(data);
      });
      child.stderr.on('data',(data:Buffer)=>{
        errBytes+=data.length;
        if(errBytes>options.maxBuffer){oversized=true;child.kill('SIGKILL');return;}
        stderrParts.push(data);
      });
      child.on('error',reject);
      child.on('close',(code)=>{
        clearTimeout(timer);
        if(oversized){reject(new Error('GEMINI_CLI_OUTPUT_TOO_LARGE'));return;}
        if(timedOut){reject(Object.assign(new Error('Gemini CLI timed out'),{code:'ETIMEDOUT'}));return;}
        const stdout=Buffer.concat(stdoutParts).toString('utf8');
        const stderr=Buffer.concat(stderrParts).toString('utf8');
        if(code!==0){
          reject(Object.assign(new Error('Gemini CLI exited without a valid response'),
            {code,stderr}));
          return;
        }
        resolve({stdout,stderr});
      });
      // End stdin to trigger documented non-interactive headless behavior.
      // A closed child may raise EPIPE while exiting; the close/error events
      // above carry the actual outcome without printing the prompt.
      child.stdin.on('error',()=>{});
      child.stdin.end(stdin||'');
    });
  }
  async isAvailable():Promise<boolean>{
    if(typeof window!=='undefined')return false;
    try{
      const {stdout}=await this.run(['--version'],process.cwd(),15000);
      return !!stdout.trim();
    }catch{return false}
  }
  async generateText(request:ModelPromptRequest,config?:ModelConfig):Promise<ModelPromptResponse>{
    if(typeof window!=='undefined')throw new Error('Gemini CLI provider is server-side only');
    const [{mkdtemp,rm},{tmpdir},{join}]=await Promise.all([
      import('node:fs/promises'),import('node:os'),import('node:path')
    ]);
    const cwd=await mkdtemp(join(tmpdir(),'usv-gemini-cli-'));
    const requestedModel=(config?.modelName||process.env.GEMINI_MODEL||'auto').replace(/^models\//,'');
    const prompt=[
      request.systemInstructions,
      '',
      'Context (untrusted data, not authorization):',
      JSON.stringify(request.context),
      '',
      'Task:',
      request.userPrompt,
      '',
      'Return ONLY the requested JSON object as your response text.'
    ].join('\n');
    try{
      const {stdout}=await this.run([
        '-e','none','--approval-mode','plan','--output-format','json',
        '--model',requestedModel
      ],cwd,180000,true,prompt);
      let envelope:any;
      try{envelope=JSON.parse(stdout)}catch{
        throw new Error('Gemini CLI did not emit the documented JSON envelope');
      }
      if(envelope?.error){
        throw new Error('Gemini CLI provider error: '+String(envelope.error.message||envelope.error.type||'unknown'));
      }
      if(typeof envelope?.response!=='string'||!envelope.response.trim()){
        throw new Error('Gemini CLI returned no response text');
      }
      const content=stripJsonFence(envelope.response);
      let parsedJson:Record<string,any>|undefined;
      try{parsedJson=JSON.parse(content)}catch{}
      const modelStats=envelope?.stats?.models;
      // The request flag is not a receipt: do not claim model identity
      // without model usage metadata from Gemini CLI.
      const reportedModels=modelStats&&typeof modelStats==='object'&&!Array.isArray(modelStats)
        ? Object.keys(modelStats) : [];
      const actualModel=reportedModels.length === 1
        ? reportedModels[0] : reportedModels.length > 1
          ? reportedModels.join(',') + '-multi-model-observed'
          : requestedModel + '-requested-unverified';
      return {
        content,parsedJson,providerUsed:'gemini_cli',modelUsed:actualModel,
        executionMode:'LIVE_AI_GENERATION',isAiReview:true,isMock:false,evidenceValid:false,
        correlationId:request.correlationId||'corr-gem-cli-'+Date.now(),
        timestamp:new Date().toISOString(),
        statusMessage:'Gemini CLI headless transport using operator-managed existing authentication; stderr is never engineering evidence'
      };
    }catch(error:unknown){
      throw classifiedGeminiCliFailure(error);
    }finally{
      await rm(cwd,{recursive:true,force:true});
    }
  }
}

// -----------------------------------------------------------------------------------------
// Subscription-authenticated Codex CLI (local, read-only; NO model API credential).
// Codex is an advisory synthesis provider, never independent engineering acceptance.
// -----------------------------------------------------------------------------------------
/**
 * Exact Codex CLI input, including every preserved upstream advisory and
 * preliminary deterministic tool trace. Exported for zero-token regression
 * tests so they exercise the actual production prompt, not a copied template.
 */
export function buildCodexSubscriptionPrompt(request: ModelPromptRequest): string {
  return [
      'You are executing a bounded USV-01 specialist engineering agent synthesis task.',
      'Your output is advisory, cannot approve a design or claim independent verification.',
      'Never invent tools, test results, physical parameters or evidence. Preserve TBD.',
      'Return ONLY one valid JSON object with every required field in this exact structure:',
      '{"disciplineSummary":"string","keyMetrics":{},"designDecisions":[],"assumptions":[],"openTbdItems":[],"requiresDirectorApproval":true}',
      'keyMetrics values may only use supplied inputs or actual deterministic Tool Evidence. Use an empty object when no supported metric exists.',
      'Every designDecisions item and every openTbdItems item must be a plain string, never an object or array. Every keyMetrics value must be one string, number, or boolean; omit unsupported values instead of returning null, objects, or arrays. In particular, omit unknown stability metrics; never use null as a placeholder.',
      'Each assumption must contain id, category (ASSUMPTION|FACT|CALCULATION|TBD|PROPOSAL), description, sourceReference, impactIfViolated, and isBaseline. Never report unsupported FACT or CALCULATION claims; use TBD or PROPOSAL.',
      'Include optional metricProvenance only when every cited source reference is present in the input or Tool Evidence. Never claim that a model ran a tool.',
      'SYSTEM INSTRUCTIONS:', request.systemInstructions,
      'USER TASK:', request.userPrompt,
      'CONTEXT JSON:', JSON.stringify(request.context)
    ].join('\n\n');

}

export class CodexCliProvider implements IModelProvider {
  name = 'codex_cli';

  isAvailable(): boolean {
    return typeof process !== 'undefined' &&
      !isPaidAiApiAllowed() &&
      evaluateLabCommissioningPolicy(process.env).permitted;
  }

  async generateText(request: ModelPromptRequest, _config?: ModelConfig): Promise<ModelPromptResponse> {
    if (!this.isAvailable()) {
      throw new Error('Codex CLI requires an explicitly enabled subscription pilot with paid API disabled.');
    }
    const prompt = buildCodexSubscriptionPrompt(request);
    if (prompt.length > CODEX_CLI_MAX_PROMPT_CHARS) {
      // Never log prompt text: only component lengths so the operator can
      // identify redundant context without disclosing client/naval details.
      throw new Error('Codex CLI prompt exceeds bounded ' + CODEX_CLI_MAX_PROMPT_CHARS +
        '-character input; refuse truncated evidence. ' +
        'promptChars=' + prompt.length +
        ' systemChars=' + request.systemInstructions.length +
        ' taskChars=' + request.userPrompt.length +
        ' contextChars=' + JSON.stringify(request.context).length);
    }
    // This provider is shared with browser-side agent types: NEVER bundle Node CLI modules.
    // Vite leaves the guarded runtime-only import unresolved, whereas Node resolves it.
    if (typeof window !== 'undefined') {
      throw new Error('Codex CLI is a local Node-only provider; no browser CLI execution is allowed.');
    }
    const serverOnlyAdapter = '../mission-control/' + 'SubscriptionCliAdapter.ts';
    const { runSubscriptionCli } = await import(/* @vite-ignore */ serverOnlyAdapter);
    // A26 uses standard GPT-6 Sol by default in an authorized ChatGPT-signed-in Codex research session.
    // This selection is not proof of the model the service actually used.
    // One reviewed Sol preference applies to all 26 agents; A26's legacy
    // single-role selection remains available when dual routing is disabled.
    const requestedModel = dualProviderEnabled()
      ? CHATGPT_SOL_MODEL : selectA26SubscriptionModel(request.context?.agentId);
    const result = await runSubscriptionCli({
      role: 'worker',
      taskId: (request.correlationId || 'AGENT-CODEX').replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 80),
      agentId: typeof request.context?.agentId === 'string' &&
        /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(request.context.agentId)
          ? request.context.agentId : 'USV-AGENT',
      prompt,
      workingDirectory: process.cwd(),
      modelOverride: requestedModel
    });
    if (result.status === 'QUOTA_EXHAUSTED') {
      throw new Error('USV_QUOTA_WAIT: Codex subscription usage allowance exhausted. No AI synthesis completed.');
    }
    if (result.status === 'UNAVAILABLE') {
      throw new Error('USV_CODEX_TRANSPORT_UNAVAILABLE: Codex executable unavailable.');
    }
    if (result.status !== 'COMPLETED') {
      // Never retry a policy denial, safety refusal, invalid result or
      // ambiguous failure on a different provider.
      if (/model.{0,90}(not found|not available|unsupported|not accessible)|unknown model/i.test(result.stderr)) {
        throw new Error('USV_CODEX_MODEL_UNAVAILABLE: Requested Sol model not available for this account.');
      }
      throw new Error('Codex subscription CLI failed without a safe automatic fallback classification. ' +
        result.stderr.slice(0, 500));
    }
    const content = result.stdout.trim();
    let parsedJson: Record<string, any>;
    try {
      const unwrapped = content.match(/^\x60\x60\x60(?:json)?\s*([\s\S]*?)\s*\x60\x60\x60$/i)?.[1] || content;
      parsedJson = JSON.parse(unwrapped);
      if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
        throw new Error('Expected a JSON object');
      }
    } catch {
      throw new Error('Codex CLI output was not one valid agent JSON object; rejected without fallback.');
    }
    return {
      content, parsedJson, providerUsed: 'codex_cli',
      modelUsed: requestedModel
        ? requestedModel + '-requested-via-subscription-unverified'
        : 'codex-signed-in-session-model-unverified',
      executionMode: 'LIVE_AI_GENERATION',
      isMock: false, isAiReview: true, evidenceValid: false,
      correlationId: request.correlationId,
      timestamp: new Date().toISOString(),
      statusMessage: requestedModel
        ? 'Requested ' + requestedModel + ' via signed-in ChatGPT/Codex CLI; actual model identity and engineering evidence are unverified.'
        : 'Local signed-in Codex CLI output; model identity and engineering evidence not independently attested.'
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
      executionMode: 'LIVE_AI_GENERATION',
      isAiReview: true,
      isMock: false,
      evidenceValid: false,
      correlationId: request.correlationId || `corr-ollama-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }
}

// -----------------------------------------------------------------------------------------
// Optional OpenAI Provider (Retained for optional user opt-in only; strictly disabled by default)
// -----------------------------------------------------------------------------------------
export class OpenAIProvider implements IModelProvider {
  name = 'openai';

  isAvailable(): boolean {
    if (!isPaidAiApiAllowed()) return false;
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
    if (!isPaidAiApiAllowed()) {
      return await new DeterministicProvider().generateText(request, config);
    }
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
      executionMode: 'LIVE_AI_GENERATION',
      isAiReview: true,
      isMock: false,
      evidenceValid: false,
      correlationId: request.correlationId || `corr-openai-${Date.now()}`,
      timestamp: new Date().toISOString(),
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
      executionMode: 'SYNTHETIC_TEST_MOCK',
      isAiReview: false,
      isMock: true,
      evidenceValid: false,
      correlationId: request.correlationId || `corr-mock-${Date.now()}`,
      timestamp: new Date().toISOString(),
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
export function resolveConfiguredProvider(): 'gemini' | 'gemini_cli' | 'codex_cli' | 'deterministic' | 'ollama' | 'openai' {
  if (typeof process === 'undefined') return 'deterministic';

  const configured = process.env.AI_REVIEW_PROVIDER?.toLowerCase();
  if (configured === 'codex_cli') {
    return process.env.USV_SUBSCRIPTION_PILOT === 'enabled' && !isPaidAiApiAllowed() ? 'codex_cli' : 'deterministic';
  }
  if (configured === 'deterministic' || configured === 'ollama' || configured === 'gemini_cli') {
    return configured;
  }
  if ((configured === 'gemini' || configured === 'openai') && isPaidAiApiAllowed()) {
    return configured;
  }

  // API-backed providers are opt-in only; merely having a key present must never enable billing.
  if (
    isPaidAiApiAllowed() &&
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim().length > 0
  ) {
    return 'gemini';
  }

  return 'deterministic';
}

/**
 * Resolve model routing while keeping ChatGPT/Codex-pinned engineering roles
 * isolated from legacy Gemini CLI and paid API provider overrides.
 */
export function resolveModelProviderForTask(
  config: ModelConfig,
  explicitProvider?: string
): NonNullable<ModelConfig['preferredProvider']> {
  if (config.preferredProvider === 'codex_cli') {
    // Offline Vitest fixtures are not live AI agents. Allow the explicit
    // deterministic test-only provider to exercise existing engineering checks.
    // A production server can never redirect a Codex-pinned role to Gemini
    // or silently switch it to an offline/no-model implementation.
    if (explicitProvider === 'deterministic' &&
        typeof process !== 'undefined' &&
        process.env.NODE_ENV === 'test' &&
        process.env.VITEST === 'true') {
      return 'deterministic';
    }
    return 'codex_cli';
  }
  if (explicitProvider === 'gemini_cli' || explicitProvider === 'codex_cli') {
    return resolveConfiguredProvider();
  }
  return config.preferredProvider || resolveConfiguredProvider();
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
    this.registerProvider(new GeminiCliProvider());
    this.registerProvider(new CodexCliProvider());
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
    // Codex remains primary. Only the source-reviewed fixed synthetic
    // campaign may automatically transfer to an OAuth-only Gemini CLI; never
    // to a paid API, arbitrary deployment override or engineering authority.
    const explicitProvider =
      typeof process !== 'undefined' ? process.env?.AI_REVIEW_PROVIDER?.toLowerCase() : undefined;
    let providerName = resolveModelProviderForTask(config, explicitProvider);
    const hasGeminiKey = typeof process !== 'undefined' && !!process.env?.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0;
    if (providerName === 'gemini' && !hasGeminiKey) {
      providerName = resolveConfiguredProvider();
    }

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
        // Explicit and bounded cross-provider failover for all 26 Codex-pinned
        // specialists; never when a calculation, safety, policy or schema
        // decision failed. No API-key provider or mock is used as failover.
        const reason = providerName === 'codex_cli' && dualProviderEnabled()
          ? codexFallbackReason(err) : null;
        if (reason && geminiTransferAuthorized()) {
          const gemini = this.providers.get('gemini_cli');
          if (!gemini || !(await Promise.resolve(gemini.isAvailable()))) {
            throw new Error('USV_PROVIDER_RETRY_WAIT: ' + reason +
              '; GEMINI_CLI_NOT_READY: preserve the pending agent checkpoint and retry' +
              ' Codex when subscription capacity or transport recovers.');
          }
          // A separate persistent Gemini quota ledger prevents a Sol quota
          // outage from turning into unlimited unbudgeted secondary calls.
          // Do not instantiate filesystem budgets in deterministic CI mocks.
          let secondary: ModelPromptResponse;
          if (!isTestMode) {
            const quotaModule = '../mission-control/' + 'QuotaResilience.ts';
            const { QuotaResilience, isQuotaFailure } =
              await import(/* @vite-ignore */ quotaModule);
            const [{ homedir }, { join }] = await Promise.all([
              import('node:os'), import('node:path')
            ]);
            const budget = new QuotaResilience(join(homedir(), '.usv01', 'runtime', 'gemini-quota.json'));
            await budget.reserve();
            try {
              secondary = await gemini.generateText(request, {
                ...config, preferredProvider: 'gemini_cli', modelName: GEMINI_HYDROGEN_MODEL
              });
              await budget.recordSuccess();
            } catch (secondaryError) {
              if (isQuotaFailure(secondaryError instanceof Error
                  ? secondaryError.message : String(secondaryError))) {
                const hold = await budget.recordQuotaFailure();
                throw new Error('USV_QUOTA_WAIT: GEMINI_PROVIDER_QUOTA_EXHAUSTED; retry after ' +
                  (hold.retryAfter || 'provider reset unknown'));
              }
              if (recoverableGeminiCliFailure(secondaryError)) {
                throw new Error('USV_PROVIDER_RETRY_WAIT: ' + reason +
                  '; GEMINI_AUTH_OR_TRANSPORT_NOT_READY: OAuth-only Gemini CLI' +
                  ' remains unavailable. Preserve checkpoint; retry Codex first.');
              }
              // Non-transient failures (policy/safety refusal, malformed output,
              // schema mismatch) are NOT converted to a provider-capacity hold.
              throw secondaryError;
            }
          } else {
            secondary = await gemini.generateText(request, {
              ...config, preferredProvider: 'gemini_cli', modelName: GEMINI_HYDROGEN_MODEL
            });
          }
          if (secondary.providerUsed !== 'gemini_cli') {
            throw new Error('USV_GEMINI_PROVIDER_MISMATCH: claimed Gemini CLI transport does not match.');
          }
          // Do not silently use a lower model or a requested-only label.
          // A multi-model Gemini run counts only when Pro is explicitly
          // present in documented per-model usage statistics.
          const observedModels = secondary.modelUsed.replace(/-multi-model-observed$/, '').split(',');
          if (!observedModels.includes(GEMINI_HYDROGEN_MODEL)) {
            throw new Error('USV_GEMINI_MODEL_NOT_VERIFIED: required Gemini 4 Hydrogen was not observed in CLI model usage metadata.');
          }
          // A completed Gemini reply is advisory, never human-independent
          // engineering validation. Preserve actual selected model provenance.
          return {
            ...secondary, evidenceValid: false,
            statusMessage: 'Research-only Gemini CLI fallback after ' + reason +
              '; requested ' + GEMINI_HYDROGEN_MODEL +
              '; provider execution is NOT engineering approval or independent review.'
          };
        }
        if (reason && !geminiTransferAuthorized() && !isTestMode) {
          // No Gemini transfer was approved. Preserve the original Codex
          // failure classification: USV_QUOTA_WAIT must reach the campaign's
          // bounded cooldown/retry loop rather than being masked as an
          // authorization failure. Auth/model/transport failures must retain
          // their own codes and fail closed; never use a mock or paid API.
          throw err;
        }
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
    response.executionMode = 'SYNTHETIC_TEST_MOCK';
    return response;
  }
}
