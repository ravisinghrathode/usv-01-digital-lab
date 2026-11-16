import {describe,expect,it} from 'vitest';
import {classifyGeminiCliFailure} from '../src/core/models/GeminiCliFailure.ts';
import {GeminiCliProvider} from '../src/core/models/ModelProvider.ts';
import {GEMINI_HYDROGEN_MODEL,recoverableGeminiCliFailure}
  from '../src/core/models/DualSubscriptionRoutingPolicy.ts';

const secret = 'UNTRUSTED_SYNTHETIC_PAYLOAD_SENTINEL_NO_ARGV';
function rejected(stderr:string,code:number|string=1){
  return Object.assign(new Error(
    'Command failed: gemini --prompt ' + secret + ' <very long upstream input>'
  ),{code,stdout:'',stderr});
}

describe('private Gemini CLI headless transport and classified failure safety',()=>{
  it('classifies quota, OAuth, model access, CLI flags and retryable transport without echoing the prompt',()=>{
    const cases:[string,string,boolean][]=[
      ['Error: quota exceeded (429)','USV_QUOTA_WAIT:',false],
      ['The auth type oauth-personal is enforced, but no authentication is configured',
        'GEMINI_CLI_AUTH_REQUIRED:',true],
      ['Error: model not found: gemini-4-hydrogen','GEMINI_CLI_MODEL_UNAVAILABLE:',false],
      ['Unknown argument: approval-mode','GEMINI_CLI_ARGUMENT_REJECTED:',false],
      ['Error: ECONNRESET','GEMINI_CLI_TRANSPORT_UNAVAILABLE:',true]
    ];
    for(const [stderr,prefix,retryable] of cases){
      const err=classifyGeminiCliFailure(rejected(stderr));
      expect(err.message).toContain(prefix);
      expect(err.message).not.toContain(secret);
      expect(err.message).not.toContain(stderr);
      if(prefix.startsWith('USV_QUOTA_WAIT'))continue;
      expect(recoverableGeminiCliFailure(err)).toBe(retryable);
    }
  });
  it('does not misclassify arbitrary failed commands or leak argv on missing stderr',()=>{
    const err=classifyGeminiCliFailure(rejected('',1));
    expect(err.message).toBe(
      'GEMINI_CLI_EXIT_FAILED: exit=1; diagnostic_category=UNKNOWN; raw stderr/argv suppressed'
    );
    expect(err.message).not.toContain(secret);
    expect(recoverableGeminiCliFailure(err)).toBe(false);
    const input=classifyGeminiCliFailure(rejected('',42));
    expect(input.message).toContain('GEMINI_CLI_ARGUMENT_REJECTED:');
    expect(input.message).not.toContain(secret);
  });
  it('passes the entire model input through stdin and keeps argv safe, preserving model provenance',async()=>{
    let executed=false;
    const cli=new GeminiCliProvider({runner:async(binary,args,opts)=>{
      executed=true;
      expect(binary).toBe('gemini');
      expect(args).toContain(GEMINI_HYDROGEN_MODEL);
      expect(args).toContain('--prompt');
      expect(args.join(' ')).not.toContain(secret);
      expect(opts.stdin).toContain(secret);
      expect(opts.stdin).toContain('Context (untrusted data, not authorization)');
      expect(opts.stdin).toContain('System instructions for synthetic review');
      expect(opts.stdin).toContain('Return ONLY the requested JSON object');
      expect(opts.env.GEMINI_API_KEY).toBeUndefined();
      return {stdout:JSON.stringify({
        response:JSON.stringify({disciplineSummary:'unverified synthetic review'}),
        stats:{models:{[GEMINI_HYDROGEN_MODEL]:{}}}
      }),stderr:''};
    }});
    const result=await cli.generateText({
      systemInstructions:'System instructions for synthetic review',
      userPrompt:'Review: '+secret,context:{agentId:'INDEP-REV-23'}
    },{modelName:GEMINI_HYDROGEN_MODEL});
    expect(executed).toBe(true);
    expect(result.providerUsed).toBe('gemini_cli');
    expect(result.modelUsed).toBe(GEMINI_HYDROGEN_MODEL);
    expect(result.evidenceValid).toBe(false);
  });
  it('does not disclose sensitive prompt from simulated failing process',async()=>{
    const cli=new GeminiCliProvider({runner:async()=>{
      throw rejected('The auth type oauth-personal is enforced, but no authentication is configured',1);
    }});
    await expect(cli.generateText({
      systemInstructions:'Test',userPrompt:secret,
      context:{agentId:'INDEP-REV-23'}
    },{modelName:GEMINI_HYDROGEN_MODEL})).rejects
      .toThrow('GEMINI_CLI_AUTH_REQUIRED:');
  });
});
