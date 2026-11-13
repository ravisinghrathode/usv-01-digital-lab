import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('OpenFOAM commissioning must never auto-launch on governance CI', () => {
  const workflow = readFileSync('.github/workflows/safety-governance-gate.yml', 'utf8');

  it('preserves automatic deterministic governance for pushes and pull requests', () => {
    expect(workflow).toContain('  push:\n    branches: [ main ]');
    expect(workflow).toContain('  pull_request:\n    branches: [ main ]');
    expect(workflow).toContain('  governance-verification:');
  });

  it('requires explicit manual opt-in on protected main for real OpenFOAM', () => {
    expect(workflow).toContain('  workflow_dispatch:');
    expect(workflow).toContain('      run_openfoam:');
    expect(workflow).toContain('        type: boolean\n        default: false');
    const job = workflow.split('  openfoam-known-case:\n')[1];
    expect(job).toBeDefined();
    expect(job).toContain("if: ${{ github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && inputs.run_openfoam == true }}");
    expect(job).toContain('timeout-minutes: 60');
    expect(job).toContain('Install OpenFOAM v2606 and Run Official ZPG Flat-Plate V&V Case');
  });
});
