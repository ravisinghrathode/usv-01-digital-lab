import {afterEach,describe,expect,it} from 'vitest';
import {ModelProviderRouter, type IModelProvider, type ModelPromptResponse}
  from '../src/core/models/ModelProvider.ts';
import {MASTER_AGENTS} from '../src/core/agents/definitions.ts';
import {validatePilotRequest,sanitizedSubscriptionEnvironment,SAFE_ROLES}
  from '../src/core/mission-control/SubscriptionCliAdapter.ts';
import {CHATGPT_SOL_MODEL,GEMINI_PRO_MODEL,dualProviderEnabled,
  geminiTransferAuthorized,codexFallbackReason}
  from '../src/core/models/DualSubscriptionRoutingPolicy.ts';

const saved={...process.env};
afterEach(()=>{
  for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];
  Object.assign(process.env,saved);
});
function optIn(){
  process.env.AI_REVIEW_PROVIDER='codex_cli';
  process.env.USV_SUBSCRIPTION_PILOT='enabled';
  process.env.USV_ALLOW_PAID_AI_API='false';
  process.env.USV_LAB_SCOPE='RESEARCH_ONLY';
  process.env.USV_DUAL_PROVIDER_ROUTING='enabled';
}
function optInGemini(){
  optIn();
  process.env.USV_GEMINI_FALLBACK_APPROVED='true';
  process.env.USV_GEMINI_OAUTH_REVIEWED='true';
  process.env.USV_GEMINI_DATA_CLASSIFICATION='PUBLIC_NON_SENSITIVE';
}
const prompt={systemInstructions:'Non-operational research only',
  userPrompt:'No vessel release',context:{agentId:'LEAD-SYS-01'},correlationId:'ROUTER-TEST'};
const stub=(provider:'codex_cli'|'gemini_cli',message='done'):ModelPromptResponse=>({
  content:message,parsedJson:{disciplineSummary:message,keyMetrics:{},designDecisions:[],
    assumptions:[],openTbdItems:[],requiresDirectorApproval:true},
  providerUsed:provider,modelUsed:provider==='gemini_cli'?GEMINI_PRO_MODEL:CHATGPT_SOL_MODEL,
  executionMode:'LIVE_AI_GENERATION',isMock:false,isAiReview:true,evidenceValid:false,
  timestamp:new Date().toISOString(),correlationId:'ROUTER-TEST'
});
describe('26 specialist dual subscription transport policy',()=>{
  it('routes every canonical agent to Sol, never an arbitrary role or paid API',()=>{
    optIn();
    expect(MASTER_AGENTS).toHaveLength(26);
    for(const agent of MASTER_AGENTS){
      expect(agent.modelConfig.preferredProvider).toBe('codex_cli');
      const request={role:'worker' as const,agentId:agent.id,taskId:'PILOT-'+agent.canonicalId,
        prompt:'Public domain, research only',workingDirectory:'/tmp/usv01-repo',
        modelOverride:CHATGPT_SOL_MODEL};
      expect(()=>validatePilotRequest(request)).not.toThrow();
      const args=SAFE_ROLES.worker.args(request.prompt,'/tmp/final.json',CHATGPT_SOL_MODEL);
      expect(args).toContain('gpt-6.1-sol');
    }
    expect(()=>validatePilotRequest({role:'worker',taskId:'ARBITRARY',agentId:'INJECTED',
      prompt:'test',workingDirectory:'/tmp/usv01-repo',modelOverride:CHATGPT_SOL_MODEL})).toThrow();
    process.env.USV_ALLOW_PAID_AI_API='true';
    expect(dualProviderEnabled()).toBe(false);
  });
  it('requires explicit clean-data and operator-reviewed OAuth authorization before Gemini',()=>{
    optIn();
    expect(geminiTransferAuthorized()).toBe(false);
    process.env.USV_GEMINI_FALLBACK_APPROVED='true';
    process.env.USV_GEMINI_OAUTH_REVIEWED='true';
    process.env.USV_GEMINI_DATA_CLASSIFICATION='RESTRICTED_NAVAL';
    expect(geminiTransferAuthorized()).toBe(false);
    process.env.USV_GEMINI_DATA_CLASSIFICATION='PUBLIC_NON_SENSITIVE';
    expect(geminiTransferAuthorized()).toBe(true);
    process.env.USV_ENGINEERING_RELEASE_AUTHORIZED='true';
    expect(geminiTransferAuthorized()).toBe(false);
  });
  it('permits transport/quota errors but not safety, invalid schema or engineering failures',()=>{
    expect(codexFallbackReason(new Error('USV_QUOTA_WAIT: quota exhausted'))).toBe('CODEX_QUOTA');
    expect(codexFallbackReason(new Error('USV_QUOTA_WAIT: LOCAL_REQUEST_BUDGET_EXHAUSTED'))).toBeNull();
    expect(codexFallbackReason(new Error('QUOTA_LEDGER_CORRUPT'))).toBeNull();
    expect(codexFallbackReason(new Error('USV_CODEX_MODEL_UNAVAILABLE: no entitlement'))).toBe('CODEX_MODEL_UNAVAILABLE');
    expect(codexFallbackReason(new Error('USV_CODEX_TRANSPORT_UNAVAILABLE: missing cli'))).toBe('CODEX_TRANSPORT_UNAVAILABLE');
    expect(codexFallbackReason(new Error('mandatory calculation failed'))).toBeNull();
    expect(codexFallbackReason(new Error('unsafe request refused'))).toBeNull();
    expect(codexFallbackReason(new Error('invalid JSON output'))).toBeNull();
    expect(codexFallbackReason(new Error('approval denied'))).toBeNull();
  });
  it('uses the best requested Gemini Pro when unavailable Sol transport is safely classified',async()=>{
    optInGemini();
    const router=ModelProviderRouter.getInstance();
    const oldCodex=router.getProvider('codex_cli')!;
    const oldGemini=router.getProvider('gemini_cli')!;
    let geminiCalls=0; let selectedModel='';
    try{
      router.registerProvider({
        name:'codex_cli',isAvailable:()=>true,
        generateText:async()=>{throw new Error('USV_QUOTA_WAIT: budget reached')}
      });
      router.registerProvider({
        name:'gemini_cli',isAvailable:()=>true,
        generateText:async(_r,c)=>{geminiCalls++;selectedModel=c?.modelName||'';return stub('gemini_cli')}
      });
      const result=await router.generate(prompt,{preferredProvider:'codex_cli'});
      expect(geminiCalls).toBe(1);
      expect(selectedModel).toBe(GEMINI_PRO_MODEL);
      expect(result.providerUsed).toBe('gemini_cli');
      expect(result.evidenceValid).toBe(false);
      expect(result.statusMessage).toContain('NOT engineering approval');
    }finally{router.registerProvider(oldCodex);router.registerProvider(oldGemini)}
  });
  it('does not use Gemini when Codex succeeds, or when the failure is a safety refusal',async()=>{
    optInGemini();
    const router=ModelProviderRouter.getInstance();
    const oldCodex=router.getProvider('codex_cli')!;
    const oldGemini=router.getProvider('gemini_cli')!;
    let count=0;
    try{
      router.registerProvider({name:'gemini_cli',isAvailable:()=>true,
        generateText:async()=>{count++;return stub('gemini_cli')}});
      router.registerProvider({name:'codex_cli',isAvailable:()=>true,
        generateText:async()=>stub('codex_cli')});
      expect((await router.generate(prompt,{preferredProvider:'codex_cli'})).providerUsed).toBe('codex_cli');
      router.registerProvider({name:'codex_cli',isAvailable:()=>true,
        generateText:async()=>{throw new Error('UNSAFE_MODEL_REFUSAL')}} as IModelProvider);
      const outcome=await router.generate(prompt,{preferredProvider:'codex_cli'});
      expect(outcome.providerUsed).not.toBe('gemini_cli');
      expect(count).toBe(0);
    }finally{router.registerProvider(oldCodex);router.registerProvider(oldGemini)}
  });
  it('strips API billing credentials from the Gemini CLI environment',()=>{
    const sanitized=sanitizedSubscriptionEnvironment({PATH:'/bin',HOME:'/home/operator',
      OPENAI_API_KEY:'secret',GEMINI_API_KEY:'secret',GOOGLE_GENAI_USE_VERTEXAI:'true',
      USV_ALLOW_PAID_AI_API:'true'});
    expect(sanitized.GEMINI_API_KEY).toBeUndefined();
    expect(sanitized.OPENAI_API_KEY).toBeUndefined();
    expect(sanitized.GOOGLE_GENAI_USE_VERTEXAI).toBeUndefined();
    expect(sanitized.USV_ALLOW_PAID_AI_API).toBe('false');
  });
});
