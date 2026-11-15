import {describe,it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import path from 'node:path';
import {inspectPrivateCommissionGate,resolveControlledCatalog}
  from '../scripts/mission-control/private-live-commission.ts';

const yaml=fs.readFileSync(path.resolve('.github/workflows/usv01-26-agent-commissioning.yml'),'utf8');
const sha='a'.repeat(40);
const approved=()=>{
 const env:NodeJS.ProcessEnv={
   AI_REVIEW_PROVIDER:'codex_cli',USV_SUBSCRIPTION_PILOT:'enabled',
   USV_ALLOW_PAID_AI_API:'false',USV_LAB_SCOPE:'RESEARCH_ONLY',
   USV_DUAL_PROVIDER_ROUTING:'enabled',USV01_HOST_ID:'private-mac-usv01',
   USV_A04_AUTHORIZED_SHA:sha
 };
 return env;
};
describe('No subscription secrets on public GitHub Actions runner',()=>{
  it('blocks every public Actions live dispatch without selecting a self-hosted runner',()=>{
    expect(yaml).toContain('inputs.mode == \'live\'');
    expect(yaml).toContain('USV_PUBLIC_RUNNER_BLOCKED');
    expect(yaml).not.toContain('runs-on: [self-hosted');
    expect(yaml).not.toContain('USV_HOST_ATTESTATION_PRIVATE_KEY_FILE: ${{ vars.');
    expect(yaml).toContain('runs-on: ubuntu-latest');
    expect(yaml).toContain('acceptance:codex-agents -- --catalog "$CATALOG_PATH" --require-ready');
  });
  it('denies a catalog symlink escaping the approved source tree',()=>{
    const dir=mkdtempSync(path.join(os.tmpdir(),'usv-private-catalog-'));
    const other=mkdtempSync(path.join(os.tmpdir(),'usv-outside-catalog-'));
    try{
      mkdirSync(path.join(dir,'evidence'));
      writeFileSync(path.join(dir,'evidence','valid.json'),'{"dataClassification":"PUBLIC_NON_SENSITIVE"}');
      writeFileSync(path.join(other,'secret.json'),'{"sensitive":true}');
      symlinkSync(path.join(other,'secret.json'),path.join(dir,'evidence','escape.json'));
      expect(resolveControlledCatalog(dir,'evidence/valid.json')).toBe('evidence/valid.json');
      expect(()=>resolveControlledCatalog(dir,'evidence/escape.json')).toThrow(/UNCONTROLLED_CATALOG/);
      expect(()=>resolveControlledCatalog(dir,'../outside.json')).toThrow();
    }finally{
      rmSync(dir,{recursive:true,force:true});rmSync(other,{recursive:true,force:true});
    }
  });
  it('allows only explicit local, source-reviewed and research-only opt-in',()=>{
    const env=approved();
    const pass=inspectPrivateCommissionGate(sha,env);
    expect(pass).toMatchObject({approved:true,usesGitHubActionsRunner:false,
      engineeringReleaseApproved:false,researchOnly:true});
    expect(inspectPrivateCommissionGate(sha,{...env,GITHUB_ACTIONS:'true'}).approved).toBe(false);
    expect(inspectPrivateCommissionGate(sha,{...env,CI:'true'}).approved).toBe(false);
    expect(inspectPrivateCommissionGate(sha,{...env,USV_A04_AUTHORIZED_SHA:'b'.repeat(40)}).approved).toBe(false);
    expect(inspectPrivateCommissionGate(sha,{...env,USV01_HOST_ID:''}).approved).toBe(false);
    expect(inspectPrivateCommissionGate(sha,{...env,USV_ENGINEERING_RELEASE_AUTHORIZED:'true'}).approved).toBe(false);
    expect(inspectPrivateCommissionGate(sha,{...env,USV_ENABLE_ACTUATOR_CONTROL:'true'}).approved).toBe(false);
    expect(inspectPrivateCommissionGate(sha,{...env,USV_ALLOW_PAID_AI_API:'true'}).approved).toBe(false);
    expect(inspectPrivateCommissionGate('bad',env).approved).toBe(false);
  });
});
