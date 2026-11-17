import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('backend typecheck scope', () => {
  const root = process.cwd();
  const nodeConfig = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.node.json'), 'utf8')) as {
    extends: string;
    include: string[];
  };
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
    scripts: { lint?: string };
  };

  it('includes the server and critical executable governance entrypoints', () => {
    expect(nodeConfig.extends).toBe('./tsconfig.json');
    for (const entry of [
      'server.ts',
      'scripts/governance/classify-change.ts',
      'scripts/governance/stage-d-human-approval.ts',
      'scripts/governance/stage-e-enforce.ts',
      'scripts/mission-control/preflight.ts'
    ]) expect(nodeConfig.include).toContain(entry);
  });

  it('runs the Node typecheck in the existing required lint gate', () => {
    expect(manifest.scripts.lint).toContain('tsc --noEmit -p tsconfig.node.json');
  });
});
