import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { classifiedGeminiCliFailure, GeminiCliProvider } from '../src/core/models/ModelProvider.ts';
import { recoverableGeminiCliFailure } from '../src/core/models/DualSubscriptionRoutingPolicy.ts';

const hydrogen = 'gemini-4-hydrogen';
const prompt = {
  systemInstructions: 'INDEPENDENT_REVIEW_PRIVATE_SYNTHETIC_SENTINEL',
  userPrompt: 'Evaluate research-only fictional mass ledger. Do not assert engineering release.',
  context: { agentId: 'INDEP-REV-23', dataClassification: 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL' },
  correlationId: 'CLI-STDIN-TEST'
};

function failure(stderr:string, code:number|string=1):Error {
  return Object.assign(
    new Error('Command failed: gemini --prompt SECRET_SENTINEL_FULL_PROMPT_MUST_NOT_LEAK'),
    { stderr, code }
  );
}

describe('Gemini CLI redacted command and source-bound synthetic fallback diagnostics',()=>{
  it('uses stdin for full agent context, never command argv, and preserves Hydrogen runtime proof',async()=>{
    const cli = new GeminiCliProvider({runner:async(_binary,args,options)=>{
      expect(args).not.toContain('--prompt');
      expect(args.join(' ')).not.toContain('INDEPENDENT_REVIEW_PRIVATE_SYNTHETIC_SENTINEL');
      expect(options.stdin).toContain('INDEPENDENT_REVIEW_PRIVATE_SYNTHETIC_SENTINEL');
      expect(options.stdin).toContain('INDEP-REV-23');
      expect(args).toEqual(['-e','none','--approval-mode','plan','--output-format','json',
        '--model',hydrogen]);
      expect(options.env.GEMINI_API_KEY).toBeUndefined();
      expect(options.env.GOOGLE_GENAI_USE_VERTEXAI).toBeUndefined();
      const policy=options.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH!;
      expect(fs.existsSync(policy)).toBe(true);
      expect(JSON.parse(fs.readFileSync(policy,'utf8')).security.auth.enforcedType)
        .toBe('oauth-personal');
      return {stdout:JSON.stringify({
        response:JSON.stringify({
          disciplineSummary:'Synthetic review only',
          keyMetrics:{},designDecisions:[],assumptions:[],openTbdItems:[],
          requiresDirectorApproval:true
        }),
        stats:{models:{[hydrogen]:{}}}
      }),stderr:''};
    }});
    const result=await cli.generateText(prompt,{modelName:hydrogen});
    expect(result.providerUsed).toBe('gemini_cli');
    expect(result.modelUsed).toBe(hydrogen);
    expect(result.evidenceValid).toBe(false);
  });

  it('does not log a command or full prompt when Gemini exits nonzero',async()=>{
    const cli=new GeminiCliProvider({runner:async()=>{throw failure(
      'Unknown headless failure with SECRET_SENTINEL_FULL_PROMPT_MUST_NOT_LEAK')}} );
    await expect(cli.generateText(prompt,{modelName:hydrogen})).rejects.toThrow(
      'USV_GEMINI_CLI_EXIT_NONZERO: category unknown; exitCode=1');
    try{await cli.generateText(prompt,{modelName:hydrogen})}
    catch(error){
      const message=String(error);
      expect(message).not.toContain('SECRET_SENTINEL_FULL_PROMPT_MUST_NOT_LEAK');
      expect(message).not.toContain('INDEPENDENT_REVIEW_PRIVATE_SYNTHETIC_SENTINEL');
      expect(message).not.toContain('gemini --prompt');
    }
  });

  it('treats only recognizable OAuth and transport failures as retryable',()=>{
    for(const stderr of ['Not authenticated, sign in required',
      'Connection refused ECONNRESET', 'HTTP 502 service unavailable']){
      const code=classifiedGeminiCliFailure(failure(stderr)).message;
      expect(code).toMatch(/^USV_GEMINI_CLI_(AUTH|TRANSPORT)_UNAVAILABLE/);
      expect(recoverableGeminiCliFailure(new Error(code))).toBe(true);
      expect(code).not.toContain('gemini --prompt');
    }
  });

  it('returns a quota hold without disclosing CLI stderr',()=>{
    const code=classifiedGeminiCliFailure(failure(
      '429 RESOURCE_EXHAUSTED: account rate limit exceeded. SECRET_SENTINEL')).message;
    expect(code).toBe('USV_QUOTA_WAIT: GEMINI_CLI_PROVIDER_QUOTA_EXHAUSTED');
    expect(code).not.toContain('SECRET_SENTINEL');
  });

  it('fails closed for model access and provider-policy refusal',()=>{
    for(const [stderr,expected] of [
      ['Model gemini-4-hydrogen not available for this user','USV_GEMINI_CLI_MODEL_UNAVAILABLE'],
      ['permission denied by policy: unsafe request','USV_GEMINI_CLI_POLICY_DENIED'],
      ['Unknown argument: --invalid-flags','USV_GEMINI_CLI_INVALID_ARGUMENTS']
    ] as const){
      const result=classifiedGeminiCliFailure(failure(stderr)).message;
      expect(result).toContain(expected);
      expect(recoverableGeminiCliFailure(new Error(result))).toBe(false);
    }
  });

  it('classifies official headless CLI exit codes without exposing stderr or prompt',()=>{
    const auth=classifiedGeminiCliFailure(failure('private diagnostic',41));
    expect(auth.message).toContain('USV_GEMINI_CLI_AUTH_UNAVAILABLE');
    expect(recoverableGeminiCliFailure(auth)).toBe(true);
    for(const [exitCode,marker] of [[42,'INVALID_ARGUMENTS'],[44,'EXIT_NONZERO'],
      [52,'EXIT_NONZERO'],[53,'EXIT_NONZERO']] as const){
      const err=classifiedGeminiCliFailure(failure('DO_NOT_DISCLOSE_PRIVATE',exitCode));
      expect(err.message).toContain(marker);
      expect(err.message).not.toContain('DO_NOT_DISCLOSE_PRIVATE');
      expect(recoverableGeminiCliFailure(err)).toBe(false);
    }
  });

  it('reads only structured error fields of nonzero headless JSON, never stdout text',()=>{
    const error=Object.assign(new Error('Gemini CLI exited without a valid response'),{
      code:1,stderr:'',stdout:JSON.stringify({
        response:'PRIVATE_SYNTHETIC_REPORT_MUST_NOT_LEAK',
        error:{type:'FatalAuthenticationError',message:'sign in required'}
      })
    });
    const result=classifiedGeminiCliFailure(error);
    expect(result.message).toContain('USV_GEMINI_CLI_AUTH_UNAVAILABLE');
    expect(result.message).not.toContain('PRIVATE_SYNTHETIC_REPORT_MUST_NOT_LEAK');
    expect(recoverableGeminiCliFailure(result)).toBe(true);
  });

  it('rejects malformed Gemini JSON as non-retryable; never claims an executed model',async()=>{
    const cli=new GeminiCliProvider({runner:async()=>({
      stdout:'{"response":"","stats":{"models":{}}}',stderr:'PRIVATE_DIAGNOSTIC_SENTINEL'
    })});
    await expect(cli.generateText(prompt,{modelName:hydrogen})).rejects
      .toThrow(/^USV_GEMINI_CLI_INVALID_OUTPUT/);
  });
});
