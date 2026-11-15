import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Source-policy regression: this test does not execute authenticated agents.
const workflow = fs.readFileSync(
  path.resolve('.github/workflows/usv01-26-agent-commissioning.yml'), 'utf8'
);
const assessor = fs.readFileSync(
  path.resolve('scripts/assess-engineering-campaign.ts'), 'utf8'
);

describe('26-agent commissioning workflow boundaries', () => {
  it('fails the zero-token preflight when mandatory inputs or tools are blocked', () => {
    expect(workflow).toContain('acceptance:codex-agents -- --catalog "$CATALOG_PATH" --require-ready');
  });
  it('blocks live work without an independently reviewed SHA-pinned A04 authorization', () => {
    const probe = workflow.indexOf('mission-control:a04-check -- --source-sha "$GITHUB_SHA"');
    const authorization = workflow.indexOf('USV_A04_AUTHORIZED_SHA');
    const liveExecution = workflow.indexOf('--catalog "$CATALOG_PATH" --execute');
    expect(probe).toBeGreaterThan(0);
    expect(authorization).toBeGreaterThan(probe);
    expect(liveExecution).toBeGreaterThan(authorization);
    expect(workflow).toContain('"$USV_A04_AUTHORIZED_SHA" != "$GITHUB_SHA"');
  });
  it('requires signed operational readiness without treating external engineering acceptance as an execution failure', () => {
    expect(workflow).toContain('mission-control:attest-host');
    expect(workflow).toContain('--require-operational');
    expect(workflow).not.toContain('--require-all');
    expect(assessor).toContain("args.includes('--require-operational')");
    expect(assessor).toContain('!result.operationalOnCurrentInfrastructure');
    expect(assessor).toContain("args.includes('--require-all')");
  });
  it('retains isolated provider credentials, protected main, and host runner', () => {
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain('runs-on: [self-hosted, usv01-codex]');
    expect(workflow).toContain("USV_ALLOW_PAID_AI_API: 'false'");
    expect(workflow).toContain('persist-credentials: false');
  });
});
