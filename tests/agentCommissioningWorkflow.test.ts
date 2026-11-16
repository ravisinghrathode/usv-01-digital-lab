import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Source policy tests: never invoke a real subscription CLI or model.
const workflow=fs.readFileSync(path.resolve(
  '.github/workflows/usv01-26-agent-commissioning.yml'),'utf8');
const local=fs.readFileSync(path.resolve(
  'scripts/mission-control/private-live-commission.ts'),'utf8');
const assessor=fs.readFileSync(path.resolve(
  'scripts/assess-engineering-campaign.ts'),'utf8');

describe('Public repo zero-model and private-local live commissioning',()=>{
 it('keeps credential-free 26-agent preflight on protected main',()=>{
   expect(workflow).toContain("github.ref == 'refs/heads/main'");
   expect(workflow).toContain('runs-on: ubuntu-latest');
   expect(workflow).toContain('acceptance:codex-agents -- --catalog "$CATALOG_PATH" --require-ready');
   expect(workflow).toContain('persist-credentials: false');
   expect(workflow).toContain('mission-control:private-commission -- --plan');
 });
 it('does not schedule a secret-bearing self-hosted runner from a public repository',()=>{
   expect(workflow).toContain('USV_PUBLIC_RUNNER_BLOCKED');
   expect(workflow).not.toContain('runs-on: [self-hosted');
   expect(workflow).not.toContain('mission-control:attest-host');
   expect(workflow).not.toContain('Run all 26 specialists as dependency-aware Codex campaign');
   expect(workflow).not.toContain('USV_HOST_ATTESTATION_PRIVATE_KEY_FILE');
 });
 it('retains the exact reviewed A04 source and owner-controlled private session',()=>{
   const auth=local.indexOf('USV_A04_AUTHORIZED_SHA');
   const revision=local.indexOf('assertPinnedCleanGitRevision(cwd,sourceSha)');
   const agent=local.indexOf("'Authenticated research-only 26-agent campaign'");
   expect(auth).toBeGreaterThan(0);
   expect(revision).toBeGreaterThan(auth);
   expect(agent).toBeGreaterThan(revision);
   expect(local).toContain("USV_DUAL_PROVIDER_ROUTING='enabled'");
   expect(local).toContain('mission-control:gemini-catalog');
   expect(local).toContain('mission-control:model-health');
   expect(local).toContain('mission-control:preflight');
   expect(local).toContain('refs/remotes/origin/main');
   expect(local).toContain('USV_PRIVATE_COMMISSION_SOURCE_NOT_PINNED_TO_ORIGIN_MAIN');
 });
 it('requires signed host health but never equates it with external engineering acceptance',()=>{
   expect(local).toContain('mission-control:attest-host');
   expect(local).toContain('--require-operational');
   expect(local).not.toContain('--require-all');
   expect(assessor).toContain("args.includes('--require-operational')");
   expect(assessor).toContain("args.includes('--require-all')");
 });
});
