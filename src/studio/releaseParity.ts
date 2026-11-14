import { MODULE_REGISTRY, MODULE_GROUPS, type NavigationModule, type StudioWorkspace } from '../moduleRegistry.ts';

export const STUDIO_X_EXPECTED_MODULE_COUNT = 24;
export const CLASSIC_UI_ESCAPE_KEYS = ['naval-studio-x-layout', '?ui=classic'] as const;

export interface ModuleSmokeEntry {
  moduleId: NavigationModule;
  rendered: boolean;
  interactiveControlsOk: boolean;
  persistedDataIntact: boolean;
  cadPreviewLabeledUnverified: boolean;
}

export interface StudioXReleaseParityInput {
  expectedMainSha: string;
  reportedDeployedSha?: string | null;
  renderedModules?: readonly ModuleSmokeEntry[];
  classicShellAbsentVerified?: boolean;
  authRbacChecked?: boolean;
  exportImportChecked?: boolean;
  reviewGatesChecked?: boolean;
  independentQaReviewer?: string | null;
}

export interface StudioXReleaseParityReport {
  schema: 'usv01-studio-x-parity/v1';
  registeredModuleCount: number;
  expectedModuleCount: number;
  workspacesCovered: StudioWorkspace[];
  groupsCovered: string[];
  missingModules: NavigationModule[];
  failedSmokeModules: NavigationModule[];
  shaParityMatches: boolean;
  classicEscapeBlocked: boolean;
  status:
    | 'PARITY_VERIFIED_PENDING_QA_SIGNOFF'
    | 'PARITY_READY_FOR_INDEPENDENT_QA'
    | 'BLOCKED_SHA_MISMATCH'
    | 'BLOCKED_INCOMPLETE_SMOKE'
    | 'UNVERIFIED_OFFLINE_ONLY';
  blockers: string[];
  // A local code check is never proof of a live deployed service or engineering release.
  liveDeploymentConfirmed: false;
  engineeringReleaseApproved: false;
}

const GIT_SHA = /^[a-f0-9]{40}$/;

/** Verify Naval Studio X single-shell module registry completeness locally. */
export function inspectStudioModuleContract(): {
  totalModules: number;
  uniqueIds: boolean;
  allWorkspacesPresent: boolean;
  workspaces: StudioWorkspace[];
  groups: string[];
} {
  const ids = new Set(MODULE_REGISTRY.map(m => m.id));
  const workspaces = Array.from(new Set(MODULE_REGISTRY.map(m => m.workspace)));
  const groups = Array.from(new Set(MODULE_REGISTRY.map(m => m.group)));
  const requiredWorkspaces: StudioWorkspace[] = ['programme', 'cad', 'analysis', 'verification'];
  return {
    totalModules: MODULE_REGISTRY.length,
    uniqueIds: ids.size === MODULE_REGISTRY.length,
    allWorkspacesPresent: requiredWorkspaces.every(w => workspaces.includes(w)) &&
      groups.every(g => (MODULE_GROUPS as readonly string[]).includes(g)),
    workspaces,
    groups
  };
}

/** Reject any attempt to re-enable legacy Classic mode via URL query or storage. */
export function resolveStudioShellMode(searchQuery: string, persistedValue: string | null): {
  activeShell: 'NAVAL_STUDIO_X';
  classicIgnored: boolean;
} {
  const requestedClassicQuery = /(?:^|[?&])ui=classic(?:&|$)/i.test(searchQuery);
  const requestedClassicStorage = (persistedValue ?? '').trim().toLowerCase() === 'classic';
  return {
    activeShell: 'NAVAL_STUDIO_X',
    classicIgnored: requestedClassicQuery || requestedClassicStorage
  };
}

export function evaluateStudioXReleaseParity(input: StudioXReleaseParityInput): StudioXReleaseParityReport {
  const contract = inspectStudioModuleContract();
  const blockers: string[] = [];

  if (!GIT_SHA.test(input.expectedMainSha)) {
    blockers.push('Expected main SHA must be an exact 40-hex commit ID');
  }
  if (contract.totalModules !== STUDIO_X_EXPECTED_MODULE_COUNT || !contract.uniqueIds) {
    blockers.push(`Module registry drift detected (${contract.totalModules}/${STUDIO_X_EXPECTED_MODULE_COUNT})`);
  }

  const shaParityMatches = !!input.reportedDeployedSha &&
    GIT_SHA.test(input.reportedDeployedSha) &&
    input.reportedDeployedSha === input.expectedMainSha;
  if (!input.reportedDeployedSha) {
    blockers.push('Deployed Google AI Studio / host SHA has not been captured');
  } else if (!shaParityMatches) {
    blockers.push('Deployed source SHA does not match approved main SHA');
  }

  const byId = new Map((input.renderedModules ?? []).map(m => [m.moduleId, m]));
  const missingModules: NavigationModule[] = [];
  const failedSmokeModules: NavigationModule[] = [];

  for (const mod of MODULE_REGISTRY) {
    const entry = byId.get(mod.id);
    if (!entry) {
      missingModules.push(mod.id);
    } else if (
      !entry.rendered ||
      !entry.interactiveControlsOk ||
      !entry.persistedDataIntact ||
      (mod.id === 'cad-studio' && !entry.cadPreviewLabeledUnverified)
    ) {
      failedSmokeModules.push(mod.id);
    }
  }

  if (missingModules.length) blockers.push(`Missing module smoke coverage for ${missingModules.length} modules`);
  if (failedSmokeModules.length) blockers.push(`Smoke checks failed for modules: ${failedSmokeModules.join(', ')}`);
  if (input.classicShellAbsentVerified !== true) blockers.push('Classic UI absence check (?ui=classic and storage) not recorded');
  if (input.authRbacChecked !== true) blockers.push('Auth/RBAC smoke check not recorded');
  if (input.exportImportChecked !== true) blockers.push('Export/import persistence smoke check not recorded');
  if (input.reviewGatesChecked !== true) blockers.push('Review gates smoke check not recorded');

  const classicEscapeBlocked = resolveStudioShellMode('?ui=classic', 'classic').activeShell === 'NAVAL_STUDIO_X';

  let status: StudioXReleaseParityReport['status'] = 'UNVERIFIED_OFFLINE_ONLY';
  if (input.reportedDeployedSha && !shaParityMatches) {
    status = 'BLOCKED_SHA_MISMATCH';
  } else if (shaParityMatches && (missingModules.length > 0 || failedSmokeModules.length > 0 || blockers.length > 0)) {
    status = 'BLOCKED_INCOMPLETE_SMOKE';
  } else if (shaParityMatches && blockers.length === 0) {
    status = input.independentQaReviewer?.trim()
      ? 'PARITY_READY_FOR_INDEPENDENT_QA'
      : 'PARITY_VERIFIED_PENDING_QA_SIGNOFF';
  }

  return {
    schema: 'usv01-studio-x-parity/v1',
    registeredModuleCount: contract.totalModules,
    expectedModuleCount: STUDIO_X_EXPECTED_MODULE_COUNT,
    workspacesCovered: contract.workspaces,
    groupsCovered: contract.groups,
    missingModules,
    failedSmokeModules,
    shaParityMatches,
    classicEscapeBlocked,
    status,
    blockers,
    liveDeploymentConfirmed: false,
    engineeringReleaseApproved: false
  };
}
