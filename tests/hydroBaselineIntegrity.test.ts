import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Safety boundary regression. The parametric GZ simulator must not write into
 * the project principal particulars; only a controlled review workflow may do so.
 */
describe('HYD-01 dashboard safety boundary', () => {
  const source = fs.readFileSync(path.resolve('src/components/NavalArchitectureView.tsx'), 'utf8');

  it('cannot stage assumed slider values into the controlled baseline', () => {
    expect(source).not.toMatch(/onUpdateParticulars\s*\(/);
    expect(source).not.toContain('handleCommitToBaseline');
    expect(source).not.toContain('Committed to Baseline!');
    expect(source).not.toContain('beamM * 0.92');
    expect(source).toContain('handleExportScreeningScenario');
    expect(source).toContain('UNVERIFIED PARAMETRIC SCREEN');
  });

  it('labels GZ/IMO comparisons as unverified and not statutory compliance', () => {
    expect(source).not.toContain('IMO 2008 IS COMPLIANT');
    expect(source).not.toContain('INTERNATIONAL MANDATE');
    expect(source).toContain('PRELIMINARY SCREEN ONLY');
    expect(source).toContain('NOT A COMPLIANCE DETERMINATION');
    expect(source).toContain('NO — requires approved hull geometry and loading');
  });
});
