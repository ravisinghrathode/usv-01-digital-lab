import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MODULE_REGISTRY } from '../src/moduleRegistry.ts';
import {
  evaluateStudioXReleaseParity,
  inspectStudioModuleContract,
  resolveStudioShellMode,
  type ModuleSmokeEntry
} from '../src/studio/releaseParity.ts';
import { DirectorBriefing } from '../src/components/DirectorBriefing.tsx';
import { CadStudioView } from '../src/components/CadStudioView.tsx';
import {
  INITIAL_DECISIONS,
  INITIAL_NAVAL_PARTICULARS,
  INITIAL_REQUIREMENTS,
  INITIAL_RISKS,
  INITIAL_SIMULATIONS,
  INITIAL_VERIFICATION_PLANS
} from '../src/data/initialProjectData.ts';

const VALID_SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);

function buildFullSmokeEntries(): ModuleSmokeEntry[] {
  return MODULE_REGISTRY.map(m => ({
    moduleId: m.id,
    rendered: true,
    interactiveControlsOk: true,
    persistedDataIntact: true,
    cadPreviewLabeledUnverified: m.id === 'cad-studio'
  }));
}

describe('M00 — Naval Studio X release parity and 24-module smoke verification', () => {
  it('enforces 24/24 module registry completeness and ignores legacy classic shell triggers', () => {
    const contract = inspectStudioModuleContract();
    expect(contract.totalModules).toBe(24);
    expect(contract.uniqueIds).toBe(true);
    expect(contract.allWorkspacesPresent).toBe(true);

    expect(resolveStudioShellMode('?ui=classic', 'classic')).toEqual({
      activeShell: 'NAVAL_STUDIO_X',
      classicIgnored: true
    });
    expect(resolveStudioShellMode('', null)).toEqual({
      activeShell: 'NAVAL_STUDIO_X',
      classicIgnored: false
    });
  });

  it('blocks release parity when deployed SHA mismatches, smoke coverage is partial, or CAD unverified label is absent', () => {
    const mismatch = evaluateStudioXReleaseParity({
      expectedMainSha: VALID_SHA,
      reportedDeployedSha: OTHER_SHA,
      renderedModules: buildFullSmokeEntries(),
      classicShellAbsentVerified: true,
      authRbacChecked: true,
      exportImportChecked: true,
      reviewGatesChecked: true
    });
    expect(mismatch.status).toBe('BLOCKED_SHA_MISMATCH');
    expect(mismatch.shaParityMatches).toBe(false);
    expect(mismatch.liveDeploymentConfirmed).toBe(false);

    const badCad = buildFullSmokeEntries().map(e =>
      e.moduleId === 'cad-studio' ? { ...e, cadPreviewLabeledUnverified: false } : e
    );
    const incomplete = evaluateStudioXReleaseParity({
      expectedMainSha: VALID_SHA,
      reportedDeployedSha: VALID_SHA,
      renderedModules: badCad,
      classicShellAbsentVerified: true,
      authRbacChecked: true,
      exportImportChecked: true,
      reviewGatesChecked: true
    });
    expect(incomplete.status).toBe('BLOCKED_INCOMPLETE_SMOKE');
    expect(incomplete.failedSmokeModules).toContain('cad-studio');
  });

  it('reaches PARITY_READY_FOR_INDEPENDENT_QA only with matching SHA, 24/24 smoke checks, and named QA reviewer', () => {
    const ready = evaluateStudioXReleaseParity({
      expectedMainSha: VALID_SHA,
      reportedDeployedSha: VALID_SHA,
      renderedModules: buildFullSmokeEntries(),
      classicShellAbsentVerified: true,
      authRbacChecked: true,
      exportImportChecked: true,
      reviewGatesChecked: true,
      independentQaReviewer: 'External Software QA Lead'
    });
    expect(ready.status).toBe('PARITY_READY_FOR_INDEPENDENT_QA');
    expect(ready.blockers).toEqual([]);
    expect(ready.engineeringReleaseApproved).toBe(false);
  });

  it('renders Studio X views cleanly with explicit external deployment parity and unverified CAD labels', () => {
    const briefingHtml = renderToStaticMarkup(
      <DirectorBriefing
        requirements={INITIAL_REQUIREMENTS}
        decisions={INITIAL_DECISIONS}
        risks={INITIAL_RISKS}
        simulations={INITIAL_SIMULATIONS}
        verificationPlans={INITIAL_VERIFICATION_PLANS}
        onNavigate={() => {}}
        onDetailed={() => {}}
      />
    );
    expect(briefingHtml).toContain('24/24 registered');
    expect(briefingHtml).toContain('external operator verification required');

    const cadHtml = renderToStaticMarkup(
      <CadStudioView particulars={INITIAL_NAVAL_PARTICULARS} onNavigate={() => {}} />
    );
    expect(cadHtml).toContain('Unverified preview');
    expect(cadHtml).toContain('Study Parametric CAD');
  });
});
