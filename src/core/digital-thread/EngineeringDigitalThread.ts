import { createHash } from 'node:crypto';

export type TechnicalEvidenceClass =
  | 'DRAFT_HYPOTHESIS'
  | 'SOURCE_ASSERTED'
  | 'SCREENED'
  | 'INDEPENDENTLY_VERIFIED';

export type DecisionApprovalState =
  | 'NOT_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'HOLD'
  | 'REJECTED'
  | 'DIRECTOR_APPROVED';

export type DisciplineNodeStatus =
  | 'VALID_UNVERIFIED'
  | 'INVALIDATED_STALE'
  | 'NOT_RUN'
  | 'BLOCKED'
  | 'FAILED';

export type HardConstraintStatus = 'PASS_AT_FIDELITY' | 'FAIL' | 'UNKNOWN';

export type UpstreamInputDomain =
  | 'geometry'
  | 'massCg'
  | 'loadCase'
  | 'propulsion'
  | 'power'
  | 'thermal'
  | 'material'
  | 'sensorInterface';

export interface InputOriginRecord {
  key: string;
  domain: UpstreamInputDomain;
  value: number | string | boolean;
  unit: string;
  coordinateFrame: string;
  origin: 'CONTROLLED_SOURCE' | 'DETERMINISTIC_DERIVED' | 'MODEL_HYPOTHESIS' | 'TBD';
  sourceReference: string;
  uncertaintyPlusMinus?: number;
}

export interface ArtifactDigestRef {
  uri: string;
  sha256: string;
  revisionId: string;
}

export interface DisciplineNodeRecord {
  nodeId: string;
  ownerRole: string;
  status: DisciplineNodeStatus;
  upstreamDomains: UpstreamInputDomain[];
  dependsOnNodes: string[];
  upstreamDigest: string;
  outputDigest: string | null;
  uncertaintySummary: string;
  evidenceClass: TechnicalEvidenceClass;
  executionReceiptId: string | null;
  invalidationReason?: string;
  outputs?: Record<string, number | string | boolean | null>;
}

export interface HardConstraintRecord {
  id: string;
  description: string;
  status: HardConstraintStatus;
  value: number | null;
  limit: number | null;
  unit: string;
  fidelity: 'L0_HYPOTHESIS' | 'L2_SCREENING' | 'L3_BENCHMARKED' | 'L4_INTEGRATED_VNV';
  reason: string;
}

export interface ObjectiveMetricRecord {
  id: string;
  value: number | null;
  uncertaintyPlusMinus: number | null;
  unit: string;
  direction: 'MINIMIZE' | 'MAXIMIZE';
  comparable: boolean;
}

export interface ReviewRecord {
  reviewId: string;
  kind: 'MODEL_CRITIQUE' | 'INDEPENDENT_QUALIFIED_REVIEW';
  reviewerId: string;
  authorityOrModel: string;
  authorRolesProducedDesign: string[];
  conflictOfInterest: boolean;
  boundRevisionSha256: string;
  disposition: 'CHALLENGE_LOGGED' | 'ACCEPT_FOR_STUDY' | 'HOLD' | 'REJECT';
  findings: string[];
  invalidatedByRevisionChange?: boolean;
}

export interface DigitalThreadManifest {
  schemaVersion: 'usv01-digital-thread/v1';
  projectId: string;
  missionId: string;
  configurationId: string;
  candidateId: string;
  revisionId: string;
  revisionNumber: number;
  parentRevisionId: string | null;
  parentRevisionSha256: string | null;
  transactionId: string;
  sourceCommitSha: string;
  requirementsDigest: string;
  inputOrigins: Record<string, InputOriginRecord>;
  geometryRef: ArtifactDigestRef & { topology: 'MONOHULL' | 'CATAMARAN' | 'TRIMARAN' | 'OTHER' };
  massCgRef: ArtifactDigestRef;
  disciplineNodes: Record<string, DisciplineNodeRecord>;
  hardConstraints: HardConstraintRecord[];
  objectives: ObjectiveMetricRecord[];
  reviews: ReviewRecord[];
  evidenceClass: TechnicalEvidenceClass;
  approvalState: DecisionApprovalState;
  changedDomainsFromParent: UpstreamInputDomain[];
  revisionSha256: string;
}

export interface CandidateRevisionDraft {
  transactionId: string;
  candidateId: string;
  revisionId: string;
  expectedParentSha256: string | null;
  sourceCommitSha: string;
  missionId: string;
  projectId: string;
  configurationId: string;
  requirementsDigest: string;
  inputOrigins: Record<string, InputOriginRecord>;
  geometryRef: ArtifactDigestRef & { topology: 'MONOHULL' | 'CATAMARAN' | 'TRIMARAN' | 'OTHER' };
  massCgRef: ArtifactDigestRef;
  disciplineNodes: Record<string, DisciplineNodeRecord>;
  hardConstraints: HardConstraintRecord[];
  objectives: ObjectiveMetricRecord[];
  reviews?: ReviewRecord[];
  changedDomainsFromParent?: UpstreamInputDomain[];
  // Prevent client/optimizer supplied auto-promotion flags.
  requestedEvidenceClass?: TechnicalEvidenceClass;
  requestedApprovalState?: DecisionApprovalState;
}

const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
const GIT_SHA_RE = /^[0-9a-f]{40}$/;

export function canonicalSha256(value: unknown): string {
  const stable = stableStringify(value);
  return 'sha256:' + createHash('sha256').update(stable, 'utf8').digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj);
    for (const val of Object.values(obj as Record<string, unknown>)) {
      deepFreeze(val);
    }
  }
  return obj;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/** Validate DAG acyclicity across disciplineNodes. */
export function assertAcyclicDependencies(nodes: Record<string, DisciplineNodeRecord>): string[] {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const order: string[] = [];

  const dfs = (id: string) => {
    const node = nodes[id];
    if (!node) throw new Error(`Missing dependency node reference: ${id}`);
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`Dependency cycle detected involving node ${id}`);
    visiting.add(id);
    for (const dep of node.dependsOnNodes) {
      if (dep === id) throw new Error(`Self-dependency cycle at node ${id}`);
      dfs(dep);
    }
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  };

  for (const id of Object.keys(nodes).sort()) dfs(id);
  return order;
}

/**
 * Compute all nodes transitively impacted by changed upstream domains or changed nodes.
 * Ensures no stale analysis output or review survives an upstream geometry/mass/load change.
 */
export function computeImpactedNodes(
  nodes: Record<string, DisciplineNodeRecord>,
  changedDomains: readonly UpstreamInputDomain[]
): Set<string> {
  const order = assertAcyclicDependencies(nodes);
  const impacted = new Set<string>();
  const domainSet = new Set(changedDomains);

  for (const id of order) {
    const node = nodes[id];
    const directImpact = node.upstreamDomains.some(d => domainSet.has(d));
    const transitiveImpact = node.dependsOnNodes.some(dep => impacted.has(dep));
    if (directImpact || transitiveImpact) {
      impacted.add(id);
    }
  }
  return impacted;
}

/** Invalidate all affected downstream nodes when upstream inputs change. */
export function invalidateDownstreamNodes(
  nodes: Record<string, DisciplineNodeRecord>,
  changedDomains: readonly UpstreamInputDomain[],
  reasonPrefix: string
): Record<string, DisciplineNodeRecord> {
  const impacted = computeImpactedNodes(nodes, changedDomains);
  const next: Record<string, DisciplineNodeRecord> = {};
  for (const [id, node] of Object.entries(nodes)) {
    const copy = deepClone(node);
    if (impacted.has(id)) {
      copy.status = 'INVALIDATED_STALE';
      copy.outputDigest = null;
      copy.executionReceiptId = null;
      copy.evidenceClass = 'DRAFT_HYPOTHESIS';
      copy.outputs = undefined;
      copy.invalidationReason = `${reasonPrefix}: invalidated by upstream change (${changedDomains.join(', ')})`;
    }
    next[id] = copy;
  }
  return next;
}

/**
 * Detect whether a revision carried forward a stale cached calculation digest
 * from its parent after a relevant upstream input changed.
 */
export function verifyNoStaleCarryForward(
  parent: DigitalThreadManifest,
  child: DigitalThreadManifest
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  if (child.parentRevisionSha256 !== parent.revisionSha256) {
    violations.push('Child parentRevisionSha256 does not match parent revisionSha256');
  }

  const changedDomains = detectChangedDomains(parent, child);
  const impacted = computeImpactedNodes(child.disciplineNodes, changedDomains);

  for (const id of impacted) {
    const childNode = child.disciplineNodes[id];
    const parentNode = parent.disciplineNodes[id];
    if (!childNode || !parentNode) continue;

    if (
      childNode.status === 'VALID_UNVERIFIED' &&
      childNode.upstreamDigest === parentNode.upstreamDigest
    ) {
      violations.push(
        `Stale carry-forward violation at node ${id}: upstream domains [${changedDomains.join(', ')}] changed but node kept parent upstreamDigest and VALID_UNVERIFIED status`
      );
    }
    if (
      childNode.status === 'VALID_UNVERIFIED' &&
      parentNode.outputDigest &&
      childNode.outputDigest === parentNode.outputDigest &&
      childNode.executionReceiptId === parentNode.executionReceiptId
    ) {
      violations.push(
        `Stale receipt reuse violation at node ${id}: downstream output/receipt unchanged without fresh execution after upstream change`
      );
    }
  }

  if (changedDomains.length > 0) {
    for (const review of child.reviews) {
      if (review.boundRevisionSha256 === parent.revisionSha256 && !review.invalidatedByRevisionChange) {
        violations.push(`Stale review ${review.reviewId} remains active across upstream change`);
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

export function detectChangedDomains(
  parent: DigitalThreadManifest,
  current: Pick<DigitalThreadManifest, 'geometryRef' | 'massCgRef' | 'inputOrigins' | 'changedDomainsFromParent'>
): UpstreamInputDomain[] {
  const domains = new Set<UpstreamInputDomain>(current.changedDomainsFromParent);
  if (parent.geometryRef.sha256 !== current.geometryRef.sha256) domains.add('geometry');
  if (parent.massCgRef.sha256 !== current.massCgRef.sha256) domains.add('massCg');

  const allKeys = new Set([...Object.keys(parent.inputOrigins), ...Object.keys(current.inputOrigins)]);
  for (const k of allKeys) {
    const a = parent.inputOrigins[k];
    const b = current.inputOrigins[k];
    if (!a && b) {
      domains.add(b.domain);
    } else if (a && !b) {
      domains.add(a.domain);
    } else if (a && b && (a.value !== b.value || a.unit !== b.unit || a.coordinateFrame !== b.coordinateFrame)) {
      domains.add(b.domain);
    }
  }
  return Array.from(domains).sort();
}

/**
 * Append-only, copy-on-write candidate revision store.
 * Isolates candidates, blocks replay/concurrency violations, rejects fabricated
 * authority/promotion, and enforces downstream invalidation invariants.
 */
export class IsolatedCandidateStore {
  private readonly lineages = new Map<string, DigitalThreadManifest[]>();
  private readonly usedTransactions = new Set<string>();
  private readonly byRevisionSha = new Map<string, DigitalThreadManifest>();

  public commitRevision(draft: CandidateRevisionDraft): DigitalThreadManifest {
    if (!draft.transactionId.trim()) throw new Error('transactionId is required');
    if (this.usedTransactions.has(draft.transactionId)) {
      throw new Error(`Replay rejected: duplicate transactionId ${draft.transactionId}`);
    }
    if (!draft.candidateId.trim() || !draft.revisionId.trim()) {
      throw new Error('candidateId and revisionId are required');
    }
    if (!GIT_SHA_RE.test(draft.sourceCommitSha)) {
      throw new Error('Exact 40-hex sourceCommitSha is required');
    }
    if (!SHA256_RE.test(draft.requirementsDigest) || !SHA256_RE.test(draft.geometryRef.sha256) || !SHA256_RE.test(draft.massCgRef.sha256)) {
      throw new Error('Valid sha256 digests are required for requirements, geometryRef, and massCgRef');
    }

    // Reject optimizer/agent attempts to self-promote evidence or approval state.
    if (draft.requestedEvidenceClass === 'INDEPENDENTLY_VERIFIED') {
      throw new Error('Fabricated evidence promotion rejected: candidate transactions cannot self-award INDEPENDENTLY_VERIFIED');
    }
    if (draft.requestedApprovalState === 'DIRECTOR_APPROVED') {
      throw new Error('Fabricated approval rejected: candidate transactions cannot self-award DIRECTOR_APPROVED');
    }

    const existing = this.lineages.get(draft.candidateId) ?? [];
    const latest = existing.length ? existing[existing.length - 1] : null;

    if (!latest && draft.expectedParentSha256 !== null) {
      throw new Error(`Parent mismatch for initial candidate ${draft.candidateId}: expected null parent`);
    }
    if (latest && draft.expectedParentSha256 !== latest.revisionSha256) {
      throw new Error(
        `Stale parent or concurrency conflict on ${draft.candidateId}: expected ${latest.revisionSha256}, got ${draft.expectedParentSha256}`
      );
    }

    // Clone inputs to isolate from external mutable objects across candidates.
    const clonedOrigins = deepClone(draft.inputOrigins);
    const clonedNodes = deepClone(draft.disciplineNodes);
    assertAcyclicDependencies(clonedNodes);

    const reviews = deepClone(draft.reviews ?? []).map(rev => {
      if (rev.kind === 'INDEPENDENT_QUALIFIED_REVIEW') {
        throw new Error('Fabricated independent qualified review rejected inside unverified candidate draft');
      }
      return rev;
    });

    const changedDomains = latest
      ? detectChangedDomains(latest, {
          geometryRef: draft.geometryRef,
          massCgRef: draft.massCgRef,
          inputOrigins: clonedOrigins,
          changedDomainsFromParent: draft.changedDomainsFromParent ?? []
        })
      : [];

    const payloadWithoutSha = {
      schemaVersion: 'usv01-digital-thread/v1' as const,
      projectId: draft.projectId,
      missionId: draft.missionId,
      configurationId: draft.configurationId,
      candidateId: draft.candidateId,
      revisionId: draft.revisionId,
      revisionNumber: existing.length + 1,
      parentRevisionId: latest ? latest.revisionId : null,
      parentRevisionSha256: latest ? latest.revisionSha256 : null,
      transactionId: draft.transactionId,
      sourceCommitSha: draft.sourceCommitSha,
      requirementsDigest: draft.requirementsDigest,
      inputOrigins: clonedOrigins,
      geometryRef: deepClone(draft.geometryRef),
      massCgRef: deepClone(draft.massCgRef),
      disciplineNodes: clonedNodes,
      hardConstraints: deepClone(draft.hardConstraints),
      objectives: deepClone(draft.objectives),
      reviews,
      evidenceClass: draft.requestedEvidenceClass ?? ('SCREENED' as const),
      approvalState: draft.requestedApprovalState ?? ('NOT_SUBMITTED' as const),
      changedDomainsFromParent: changedDomains
    };

    const manifest: DigitalThreadManifest = {
      ...payloadWithoutSha,
      revisionSha256: canonicalSha256(payloadWithoutSha)
    };

    if (latest) {
      const check = verifyNoStaleCarryForward(latest, manifest);
      if (!check.valid) {
        throw new Error(`Invalidation rule failed: ${check.violations.join('; ')}`);
      }
    }

    deepFreeze(manifest);
    this.usedTransactions.add(draft.transactionId);
    this.lineages.set(draft.candidateId, [...existing, manifest]);
    this.byRevisionSha.set(manifest.revisionSha256, manifest);
    return manifest;
  }

  public getCandidateLineage(candidateId: string): readonly DigitalThreadManifest[] {
    return this.lineages.get(candidateId) ?? [];
  }

  public getLatestRevision(candidateId: string): DigitalThreadManifest | null {
    const arr = this.lineages.get(candidateId);
    return arr && arr.length ? arr[arr.length - 1] : null;
  }

  public getBySha(revisionSha256: string): DigitalThreadManifest | null {
    return this.byRevisionSha.get(revisionSha256) ?? null;
  }

  public listCandidateIds(): string[] {
    return Array.from(this.lineages.keys()).sort();
  }
}
