import {afterEach,describe,expect,it} from 'vitest';
import {A26_CODEX_AGENT_ID,A26_GPT6_MODEL,selectA26SubscriptionModel}
 from '../src/core/mission-control/A26SubscriptionModelAccess.ts';
import {SAFE_ROLES,validatePilotRequest,sanitizedSubscriptionEnvironment}
 from '../src/core/mission-control/SubscriptionCliAdapter.ts';
import {resolveModelProviderForTask} from '../src/core/models/ModelProvider.ts';
import {MASTER_AGENTS} from '../src/core/agents/definitions.ts';

const original={...process.env};
afterEach(()=>{
  for(const name of Object.keys(process.env))if(!(name in original))delete process.env[name];
  Object.assign(process.env,original);
});
function allowSubscription(){
  process.env.USV_ALLOW_PAID_AI_API='false';
  process.env.AI_REVIEW_PROVIDER='codex_cli';
  process.env.USV_SUBSCRIPTION_PILOT='enabled';
  delete process.env.USV_A26_GPT6_SUBSCRIPTION;
  delete process.env.USV_ENGINEERING_RELEASE_AUTHORIZED;
  delete process.env.USV_NO_PAID_API;
}
const req=()=>({
  role:'worker' as const,taskId:'A26-GPT6-RESEARCH',agentId:A26_CODEX_AGENT_ID,
  prompt:'Draft an unapproved source assessment of public marine software.',
  workingDirectory:'/tmp/usv01-repo',modelOverride:A26_GPT6_MODEL
});
describe('A26 standard GPT-6 Sol via ChatGPT subscription; no API',()=>{
 it('selects standard GPT-6 by default in an authorized subscription session without Astra opt-in',()=>{
  allowSubscription();
  expect(A26_GPT6_MODEL).toBe('gpt-6-sol');
  expect(selectA26SubscriptionModel(A26_CODEX_AGENT_ID)).toBe('gpt-6-sol');
  process.env.USV_A26_GPT6_SUBSCRIPTION='disabled';
  expect(selectA26SubscriptionModel(A26_CODEX_AGENT_ID)).toBe('gpt-6-sol');
  for(const id of ['A01','A20','A26','SYS-LEAD-01','UNTRUSTED','INTEL-USV-25',null])
    expect(selectA26SubscriptionModel(id)).toBeUndefined();
 });
 it('cannot request a model without the user-authorized Codex research pilot',()=>{
  delete process.env.USV_SUBSCRIPTION_PILOT;
  expect(()=>selectA26SubscriptionModel(A26_CODEX_AGENT_ID)).toThrow(/HOLD/);
  allowSubscription();
  delete process.env.USV_SUBSCRIPTION_PILOT;
  expect(()=>selectA26SubscriptionModel(A26_CODEX_AGENT_ID)).toThrow(/HOLD/);
 });
 it('rejects paid API mode and wrong provider',()=>{
  for(const change of [
    ()=>{process.env.USV_ALLOW_PAID_AI_API='true';},
    ()=>{process.env.AI_REVIEW_PROVIDER='openai';},
    ()=>{process.env.AI_REVIEW_PROVIDER='gemini_cli';},
    ()=>{delete process.env.USV_SUBSCRIPTION_PILOT;},
    ()=>{process.env.USV_NO_PAID_API='0';}
  ]){
   allowSubscription();change();
   expect(()=>selectA26SubscriptionModel(A26_CODEX_AGENT_ID)).toThrow(/HOLD/);
  }
  allowSubscription();
  delete process.env.USV_ALLOW_PAID_AI_API; // The existing subscription policy defaults paid API to DENY.
  expect(selectA26SubscriptionModel(A26_CODEX_AGENT_ID)).toBe('gpt-6-sol');
 });
 it('preserves 26 agents, A26 prompt, permissions and existing Codex route',()=>{
  const a26=MASTER_AGENTS.find(a=>a.canonicalId==='A26');
  expect(MASTER_AGENTS).toHaveLength(26);
  expect(a26?.id).toBe(A26_CODEX_AGENT_ID);
  expect(a26?.modelConfig.preferredProvider).toBe('codex_cli');
  expect(a26?.executionPermissions).toEqual(['READ_ONLY','BASELINE_DRAFT']);
  expect(a26?.permittedTools.some(t=>t.includes('EXT'))).toBe(false);
  expect(resolveModelProviderForTask(a26!.modelConfig,'openai')).toBe('codex_cli');
 });
 it('permits only A26 worker to send the GPT-6 Sol override',()=>{
  allowSubscription();
  expect(()=>validatePilotRequest(req())).not.toThrow();
  expect(()=>validatePilotRequest({...req(),agentId:'INTEL-USV-25'})).toThrow(/model override denied/);
  expect(()=>validatePilotRequest({...req(),role:'reviewer'})).toThrow(/model override denied/);
  expect(()=>validatePilotRequest({...req(),modelOverride:'gpt-6-astra' as typeof A26_GPT6_MODEL})).toThrow(/model override denied/);
  delete process.env.USV_SUBSCRIPTION_PILOT;
  expect(()=>validatePilotRequest(req())).toThrow();
 });
 it('passes an explicit standard GPT-6 model flag in Codex, never the Astra model or API',()=>{
  const args=SAFE_ROLES.worker.args('Research only','/tmp/answer.json',A26_GPT6_MODEL);
  expect(args).toEqual(['exec','--sandbox','read-only','--ephemeral','--output-last-message',
    '/tmp/answer.json','--model','gpt-6-sol','Research only']);
  expect(SAFE_ROLES.worker.executable).toBe('codex');
  expect(args).not.toContain('gpt-6-astra');
  expect(args).not.toContain('--dangerously-bypass-approvals-and-sandbox');
  const defaults=SAFE_ROLES.worker.args('Research only','/tmp/answer.json');
  expect(defaults).not.toContain('--model');
 });
 it('strips API credentials even if the host has separately billed API variables',()=>{
  const e=sanitizedSubscriptionEnvironment({
    PATH:'/usr/bin',OPENAI_API_KEY:'must-not-leak',
    GEMINI_API_KEY:'must-not-leak',USV_ALLOW_PAID_AI_API:'true'
  });
  expect(e.OPENAI_API_KEY).toBeUndefined();
  expect(e.GEMINI_API_KEY).toBeUndefined();
  expect(e.USV_ALLOW_PAID_AI_API).toBe('false');
  expect(e.USV_NO_PAID_API).toBe('1');
 });
});
