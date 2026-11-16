import {afterEach,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {ModelProviderRouter, GeminiCliProvider, type IModelProvider, type ModelPromptResponse}
  from '../src/core/models/ModelProvider.ts';
import {MASTER_AGENTS} from '../src/core/agents/definitions.ts';
import {validatePilotRequest,sanitizedSubscriptionEnvironment,SAFE_ROLES}
  from '../src/core/mission-control/SubscriptionCliAdapter.ts';
import {CHATGPT_SOL_MODEL,GEMINI_HYDROGEN_MODEL,dualProviderEnabled,
  geminiTransferAuthorized,geminiCatalogTransferPermitted,codexFallbackReason,
  sourcePinnedSyntheticGeminiAutoRoute,recoverableGeminiCliFailure}
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
  providerUsed:provider,modelUsed:provider==='gemini_cli'?GEMINI_HYDROGEN_MODEL:CHATGPT_SOL_MODEL,
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
    expect(geminiCatalogTransferPermitted('SYNTHETIC_TEST_ONLY_NON_OPERATIONAL')).toBe(true);
    expect(geminiCatalogTransferPermitted('PUBLIC_NON_SENSITIVE')).toBe(true);
    for (const classification of ['RESTRICTED_NAVAL','CLIENT_CONFIDENTIAL','CONTROLLED',undefined,{},null]) {
      expect(geminiCatalogTransferPermitted(classification)).toBe(false);
    }
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
    expect(codexFallbackReason(new Error('model output contains USV_QUOTA_WAIT but cannot be accepted'))).toBeNull();
  });
  it('keeps Codex quota retryable when owner declines Gemini synthetic transfer',async()=>{
    optIn();
    delete process.env.USV_GEMINI_FALLBACK_APPROVED;
    delete process.env.USV_GEMINI_OAUTH_REVIEWED;
    delete process.env.USV_GEMINI_DATA_CLASSIFICATION;
    // Exercise the non-test, fail-closed router branch with fake providers;
    // no real login, model invocation, quota ledger or billing occurs.
    process.env.NODE_ENV='production';
    const router=ModelProviderRouter.getInstance();
    const oldCodex=router.getProvider('codex_cli')!;
    const oldGemini=router.getProvider('gemini_cli')!;
    let codexCalls=0,geminiCalls=0;
    try{
      router.registerProvider({name:'codex_cli',isAvailable:()=>true,
        generateText:async()=>{codexCalls++;
          throw new Error('USV_QUOTA_WAIT: PROVIDER_QUOTA_EXHAUSTED; retry after 2026-11-17T08:00:00Z')}})
      router.registerProvider({name:'gemini_cli',isAvailable:()=>true,
        generateText:async()=>{geminiCalls++;return stub('gemini_cli')}});
      await expect(router.generate(prompt,{preferredProvider:'codex_cli'}))
        .rejects.toThrow(/USV_QUOTA_WAIT: PROVIDER_QUOTA_EXHAUSTED; retry after/);
      expect(codexCalls).toBe(1);
      expect(geminiCalls).toBe(0);
    }finally{
      router.registerProvider(oldCodex);
      router.registerProvider(oldGemini);
    }
  });

  it('preserves Codex model/transport failure reasons when Gemini is unapproved',async()=>{
    optIn();
    delete process.env.USV_GEMINI_FALLBACK_APPROVED;
    delete process.env.USV_GEMINI_OAUTH_REVIEWED;
    delete process.env.USV_GEMINI_DATA_CLASSIFICATION;
    process.env.NODE_ENV='production';
    const router=ModelProviderRouter.getInstance();
    const oldCodex=router.getProvider('codex_cli')!;
    const oldGemini=router.getProvider('gemini_cli')!;
    let geminiCalls=0;
    try{
      router.registerProvider({name:'gemini_cli',isAvailable:()=>true,
        generateText:async()=>{geminiCalls++;return stub('gemini_cli')}});
      for (const code of ['USV_CODEX_MODEL_UNAVAILABLE','USV_CODEX_TRANSPORT_UNAVAILABLE',
        'USV_CODEX_AUTH_UNAVAILABLE']) {
        router.registerProvider({name:'codex_cli',isAvailable:()=>true,
          generateText:async()=>{throw new Error(code+': source preserved')}});
        await expect(router.generate(prompt,{preferredProvider:'codex_cli'}))
          .rejects.toThrow(code+': source preserved');
      }
      expect(geminiCalls).toBe(0);
    }finally{
      router.registerProvider(oldCodex);
      router.registerProvider(oldGemini);
    }
  });
  it('auto-routes the protected synthetic catalog without any Gemini choice or external API',async()=>{
    optIn();
    process.env.USV_GEMINI_AUTO_SYNTHETIC_ROUTE='SOURCE_PINNED_OWNER_RESEARCH';
    process.env.USV_GEMINI_DATA_CLASSIFICATION='SYNTHETIC_TEST_ONLY_NON_OPERATIONAL';
    process.env.USV_GEMINI_SYNTHETIC_CATALOG_SHA256='a'.repeat(64);
    process.env.USV_GEMINI_AUTH_METHOD='oauth-personal';
    expect(sourcePinnedSyntheticGeminiAutoRoute()).toBe(true);
    expect(geminiTransferAuthorized()).toBe(true);
    expect(geminiCatalogTransferPermitted('SYNTHETIC_TEST_ONLY_NON_OPERATIONAL')).toBe(true);
    for (const c of ['CONTROLLED_ENGINEERING_EVIDENCE','CLIENT_CONFIDENTIAL',
      'RESTRICTED_NAVAL','PUBLIC_NON_SENSITIVE']) {
      expect(geminiCatalogTransferPermitted(c)).toBe(false);
    }
    const router=ModelProviderRouter.getInstance();
    const codex=router.getProvider('codex_cli')!;
    const gemini=router.getProvider('gemini_cli')!;
    let codexCalls=0,geminiCalls=0,model='';
    try{
      router.registerProvider({name:'codex_cli',isAvailable:()=>true,
        generateText:async()=>{codexCalls++;throw new Error('USV_CODEX_TRANSPORT_UNAVAILABLE: CLI exited')}});
      router.registerProvider({name:'gemini_cli',isAvailable:()=>true,
        generateText:async(_request,config)=>{geminiCalls++;model=config?.modelName||'';
          return stub('gemini_cli')}});
      const result=await router.generate(prompt,{preferredProvider:'codex_cli'});
      expect(result.providerUsed).toBe('gemini_cli');
      expect(result.modelUsed).toBe(GEMINI_HYDROGEN_MODEL);
      expect(result.evidenceValid).toBe(false);
      expect(codexCalls).toBe(1);
      expect(geminiCalls).toBe(1);
      expect(model).toBe(GEMINI_HYDROGEN_MODEL);
    }finally{router.registerProvider(codex);router.registerProvider(gemini)}
    delete process.env.USV_GEMINI_AUTH_METHOD;
    expect(geminiTransferAuthorized()).toBe(false);
  });

  it('retains Codex recovery status when Gemini binary is absent, with no model calls',async()=>{
    optIn();
    process.env.USV_GEMINI_AUTO_SYNTHETIC_ROUTE='SOURCE_PINNED_OWNER_RESEARCH';
    process.env.USV_GEMINI_DATA_CLASSIFICATION='SYNTHETIC_TEST_ONLY_NON_OPERATIONAL';
    process.env.USV_GEMINI_SYNTHETIC_CATALOG_SHA256='a'.repeat(64);
    process.env.USV_GEMINI_AUTH_METHOD='oauth-personal';
    process.env.NODE_ENV='production';
    const router=ModelProviderRouter.getInstance();
    const codex=router.getProvider('codex_cli')!;
    const gemini=router.getProvider('gemini_cli')!;
    let geminiCalls=0;
    try{
      router.registerProvider({name:'codex_cli',isAvailable:()=>true,
        generateText:async()=>{throw new Error('USV_QUOTA_WAIT: PROVIDER_QUOTA_EXHAUSTED')}});
      router.registerProvider({name:'gemini_cli',isAvailable:()=>false,
        generateText:async()=>{geminiCalls++;return stub('gemini_cli')}});
      await expect(router.generate(prompt,{preferredProvider:'codex_cli'})).rejects
        .toThrow(/USV_PROVIDER_RETRY_WAIT: CODEX_QUOTA; GEMINI_CLI_NOT_READY/);
      expect(geminiCalls).toBe(0);
    }finally{router.registerProvider(codex);router.registerProvider(gemini)}
  });

  it('only retries known transient Gemini CLI failures; malformed and unsafe outputs fail closed',()=>{
    for(const e of ['Gemini CLI Execution Error: ENOTFOUND',
      'Gemini CLI Execution Error: authentication failed',
      'Gemini CLI Execution Error: login required',
      'Gemini CLI Execution Error: HTTP 503']) {
      expect(recoverableGeminiCliFailure(new Error(e))).toBe(true);
    }
    for(const e of ['Gemini CLI returned no response text',
      'USV_GEMINI_MODEL_NOT_VERIFIED',
      'Gemini response unsafe request refused',
      'mandatory calculation failed',
      'Gemini CLI did not emit the documented JSON envelope']) {
      expect(recoverableGeminiCliFailure(new Error(e))).toBe(false);
    }
  });

  it('uses the best requested Gemini 4 Hydrogen when unavailable Sol transport is safely classified',async()=>{
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
      expect(selectedModel).toBe(GEMINI_HYDROGEN_MODEL);
      expect(result.providerUsed).toBe('gemini_cli');
      expect(result.evidenceValid).toBe(false);
      expect(result.statusMessage).toContain('NOT engineering approval');
    }finally{router.registerProvider(oldCodex);router.registerProvider(oldGemini)}
  });
  it('refuses a Gemini model downgrade without falsely reporting a Hydrogen execution',async()=>{
    optInGemini();
    const router=ModelProviderRouter.getInstance();
    const oldCodex=router.getProvider('codex_cli')!;
    const oldGemini=router.getProvider('gemini_cli')!;
    try{
      router.registerProvider({name:'codex_cli',isAvailable:()=>true,
        generateText:async()=>{throw new Error('USV_CODEX_MODEL_UNAVAILABLE: unavailable')}});
      router.registerProvider({name:'gemini_cli',isAvailable:()=>true,
        generateText:async()=>({...stub('gemini_cli'),modelUsed:'gemini-3.8-flash'})});
      await expect(router.generate(prompt,{preferredProvider:'codex_cli'})).rejects
        .toThrow(/USV_GEMINI_MODEL_NOT_VERIFIED/);
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

  it('enforces OAuth-only Gemini CLI policy with no API credentials in real headless transport arguments',async()=>{
    optInGemini();
    process.env.GEMINI_API_KEY='DO_NOT_SEND';
    process.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH='/tmp/UNTRUSTED-OVERRIDE';
    let observed=false;
    const cli=new GeminiCliProvider({runner:async(_binary,args,options)=>{
      const policy=options.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH!;
      expect(fs.existsSync(policy)).toBe(true);
      expect(JSON.parse(fs.readFileSync(policy,'utf8')).security.auth.enforcedType)
        .toBe('oauth-personal');
      expect(options.env.GEMINI_API_KEY).toBeUndefined();
      expect(options.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH)
        .not.toBe('/tmp/UNTRUSTED-OVERRIDE');
      expect(args).toContain(GEMINI_HYDROGEN_MODEL);
      expect(args).toContain('plan');
      observed=true;
      return {stdout:JSON.stringify({
        response:JSON.stringify({disciplineSummary:'synthetic, unverified'}),
        stats:{models:{[GEMINI_HYDROGEN_MODEL]:{}}}
      }),stderr:''};
    }});
    const response=await cli.generateText(prompt,{modelName:GEMINI_HYDROGEN_MODEL});
    expect(observed).toBe(true);
    expect(response.providerUsed).toBe('gemini_cli');
    expect(response.modelUsed).toBe(GEMINI_HYDROGEN_MODEL);
    expect(response.evidenceValid).toBe(false);
  });
});
