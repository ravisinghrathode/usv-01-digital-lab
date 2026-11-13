import {describe,expect,it} from 'vitest';
import {GeminiCliProvider} from '../src/core/models/ModelProvider.ts';

const request={
  systemInstructions:'Return strict JSON only',
  userPrompt:'Return {"disciplineSummary":"ok"}',
  context:{mission:'unit test'},
  correlationId:'CLI-TEST'
};
describe('Gemini CLI operator-authenticated provider',()=>{
  it('uses headless JSON mode, empty isolated workspace and records actual model from CLI stats',async()=>{
    let argsSeen:string[]=[];
    let cwdSeen='';
    const provider=new GeminiCliProvider({runner:async(_bin,args,opts)=>{
      argsSeen=args;cwdSeen=opts.cwd;
      if(args[0]==='--version')return{stdout:'0.68.0\n',stderr:''};
      return{stdout:JSON.stringify({
        response:'```json\n{"disciplineSummary":"ok","keyMetrics":{},"designDecisions":[],"assumptions":[],"openTbdItems":[],"requiresDirectorApproval":true,"approvalRationale":"review"}\n```',
        stats:{models:{'gemini-3.5-pro':{turns:1}}},error:null
      }),stderr:''};
    }});
    expect(await provider.isAvailable()).toBe(true);
    const out=await provider.generateText(request,{modelName:'auto'});
    expect(argsSeen).toEqual(expect.arrayContaining([
      '-e','none','--approval-mode','plan','--output-format','json','--prompt'
    ]));
    expect(cwdSeen).toMatch(/usv-gemini-cli-/);
    expect(out.providerUsed).toBe('gemini');
    expect(out.modelUsed).toBe('gemini-3.5-pro');
    expect(out.executionMode).toBe('LIVE_AI_GENERATION');
    expect(out.parsedJson?.disciplineSummary).toBe('ok');
    expect(out.isMock).toBe(false);
    expect(out.evidenceValid).toBe(false);
  });
  it('fails closed on CLI authentication/error envelope or non-JSON stdout',async()=>{
    const auth=new GeminiCliProvider({runner:async()=>({
      stdout:JSON.stringify({response:null,error:{type:'FatalAuthenticationError',message:'login',code:41}}),stderr:''
    })});
    await expect(auth.generateText(request)).rejects.toThrow(/provider error/);
    const malformed=new GeminiCliProvider({runner:async()=>({stdout:'not json',stderr:''})});
    await expect(malformed.generateText(request)).rejects.toThrow(/documented JSON envelope/);
  });
});
