/**
 * HYD-01 controlled evidence intake. A reference or a syntactically valid digest
 * is not proof of authenticity, independent correlation or certification.
 * Human/cryptographic verification occurs through separate governance stages.
 */
export const HYDRO_GLOBAL_EVIDENCE = [
  'APPROVED_HULL_GEOMETRY',
  'MASS_CG_AND_INCLINING',
  'DESIGN_BASIS_AND_RULES',
  'INDEPENDENT_NAVAL_REVIEW',
  'DIRECTOR_DIGEST_APPROVAL'
] as const;

export const HYDRO_CASE_EVIDENCE = [
  'VERIFIED_LOADING_CASE',
  'HYDROSTATIC_TABLE',
  'TRIM_AND_GZ_CURVE',
  'DOWNFLOODING_ASSESSMENT',
  'INDEPENDENT_CORRELATION'
] as const;

export type HydroEvidenceKind =
  (typeof HYDRO_GLOBAL_EVIDENCE)[number] |
  (typeof HYDRO_CASE_EVIDENCE)[number];

export interface HydroEvidenceItem {
  kind: HydroEvidenceKind;
  loadCaseId?: string;
  geometryRevision: string;
  baselineSha: string;
  sourceUri: string;
  sourceSha256: string;
  sourceToolAndVersion: string;
  attributedReviewer: string;
  capturedAtUtc: string;
}

export interface HydroEvidenceManifest {
  vesselConfigurationId: string | null;
  geometryRevision: string | null;
  designBasisId: string | null;
  baselineSha: string | null;
  requiredLoadCaseIds: string[];
  evidence: HydroEvidenceItem[];
}

export interface HydroEvidenceAudit {
  status: 'BLOCKED_MISSING_EVIDENCE' | 'SUBMITTED_REQUIRES_INDEPENDENT_VERIFICATION';
  missing: string[];
  rejected: string[];
  structurallyComplete: boolean;
  physicalEvidenceAuthenticated: false;
  independentlyVerified: false;
  engineeringReleaseAccepted: false;
}

const shaPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const timePattern = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;

function validItem(item: HydroEvidenceItem, manifest: HydroEvidenceManifest): boolean {
  return !!manifest.baselineSha && !!manifest.geometryRevision &&
    item.baselineSha === manifest.baselineSha &&
    item.geometryRevision === manifest.geometryRevision &&
    digestPattern.test(item.sourceSha256) &&
    /^https:\/\//.test(item.sourceUri) &&
    item.sourceToolAndVersion.trim().length > 0 &&
    item.attributedReviewer.trim().length > 0 &&
    timePattern.test(item.capturedAtUtc) &&
    Number.isFinite(Date.parse(item.capturedAtUtc));
}

export function auditHydroEvidence(manifest: HydroEvidenceManifest): HydroEvidenceAudit {
  const missing: string[] = [];
  const rejected: string[] = [];
  if (!manifest.vesselConfigurationId?.trim()) missing.push('VESSEL_CONFIGURATION_SELECTION');
  if (!manifest.geometryRevision?.trim()) missing.push('APPROVED_GEOMETRY_REVISION');
  if (!manifest.designBasisId?.trim()) missing.push('APPLICABLE_RULES_AND_LOADING_DESIGN_BASIS');
  if (!manifest.baselineSha || !shaPattern.test(manifest.baselineSha)) {
    missing.push('EXACT_SOURCE_COMMIT_SHA');
  }

  const cases = manifest.requiredLoadCaseIds ?? [];
  if (!cases.length || cases.some(id => !id?.trim()) || new Set(cases).size !== cases.length) {
    missing.push('APPROVED_UNIQUE_LOAD_CASE_MATRIX');
  }

  const accepted: HydroEvidenceItem[] = [];
  const allKinds = [...HYDRO_GLOBAL_EVIDENCE, ...HYDRO_CASE_EVIDENCE];
  for (const [index, item] of (manifest.evidence ?? []).entries()) {
    if (!item || !allKinds.includes(item.kind) ||
        !validItem(item, manifest) ||
        (HYDRO_CASE_EVIDENCE.includes(item.kind as (typeof HYDRO_CASE_EVIDENCE)[number]) &&
          (!item.loadCaseId || !cases.includes(item.loadCaseId))) ||
        (HYDRO_GLOBAL_EVIDENCE.includes(item.kind as (typeof HYDRO_GLOBAL_EVIDENCE)[number]) &&
          item.loadCaseId !== undefined)) {
      rejected.push('INVALID_OR_OUT_OF_BASELINE_EVIDENCE_' + index);
    } else {
      accepted.push(item);
    }
  }

  for (const kind of HYDRO_GLOBAL_EVIDENCE) {
    if (!accepted.some(x => x.kind === kind)) missing.push(kind);
  }
  for (const caseId of cases) {
    if (!caseId?.trim()) continue;
    for (const kind of HYDRO_CASE_EVIDENCE) {
      if (!accepted.some(x => x.kind === kind && x.loadCaseId === caseId)) {
        missing.push(kind + ':' + caseId);
      }
    }
  }
  const structurallyComplete = missing.length === 0 && rejected.length === 0;
  return {
    status: structurallyComplete ? 'SUBMITTED_REQUIRES_INDEPENDENT_VERIFICATION' :
      'BLOCKED_MISSING_EVIDENCE',
    missing,
    rejected,
    structurallyComplete,
    // All acceptance authority remains outside this data-shape checker.
    physicalEvidenceAuthenticated: false,
    independentlyVerified: false,
    engineeringReleaseAccepted: false
  };
}

export interface HydroReferenceValue {
  metric: string;
  computed: number;
  independentReference: number;
  approvedAbsoluteTolerance: number;
}

/** No default tolerances: the authoritative verification basis must specify them. */
export function compareHydroReference(
  calculationSourceId: string,
  referenceSourceId: string,
  pairs: readonly HydroReferenceValue[]
): {
  status: 'NUMERIC_CHECK_ONLY';
  passed: boolean;
  comparisons: { metric: string; absoluteError: number; withinTolerance: boolean }[];
  independentSourceAuthenticated: false;
  engineeringReleaseAccepted: false;
} {
  if (!calculationSourceId.trim() || !referenceSourceId.trim() ||
      calculationSourceId === referenceSourceId) {
    throw new Error('Distinct named computation and independent reference sources required');
  }
  if (!pairs.length || new Set(pairs.map(p => p.metric)).size !== pairs.length) {
    throw new Error('At least one unique metric is required');
  }
  const comparisons = pairs.map(p => {
    if (!p.metric?.trim() ||
        ![p.computed, p.independentReference, p.approvedAbsoluteTolerance].every(Number.isFinite) ||
        p.approvedAbsoluteTolerance < 0) {
      throw new Error('All benchmark values and approved tolerances must be finite');
    }
    const absoluteError = Math.abs(p.computed - p.independentReference);
    return {
      metric: p.metric,
      absoluteError,
      withinTolerance: absoluteError <= p.approvedAbsoluteTolerance
    };
  });
  return {
    status: 'NUMERIC_CHECK_ONLY',
    passed: comparisons.every(x => x.withinTolerance),
    comparisons,
    independentSourceAuthenticated: false,
    engineeringReleaseAccepted: false
  };
}
