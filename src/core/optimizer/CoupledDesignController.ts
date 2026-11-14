import { AgentRegistry } from '../registry/AgentRegistry.ts';
import { ToolRegistry } from '../tools/ToolRegistry.ts';
import {
  assertAcyclicDependencies,
  canonicalSha256,
  computeImpactedNodes,
  IsolatedCandidateStore,
  type CandidateRevisionDraft,
  type DigitalThreadManifest,
  type DisciplineNodeRecord,
  type HardConstraintRecord,
  type InputOriginRecord,
  type ObjectiveMetricRecord,
  type ReviewRecord,
  type UpstreamInputDomain
} from '../digital-thread/EngineeringDigitalThread.ts';

export type EngineeringLoopId = 'LOOP_I_EXPLORATION' | 'LOOP_II_COUPLED_DESIGN' | 'LOOP_III_VNV_HANDOFF';

export interface DisciplineNodeExecutorInput {
  candidateId: string;
  revisionId: string;
  node: DisciplineNodeRecord;
  inputOrigins: Record<string, InputOriginRecord>;
  upstreamOutputs: Record<string, Record<string, number | string | boolean | null>>;
  executeTool: (toolId: string, params: Record<string, unknown>, permissions: string[]) => Promise<{
    success: boolean;
    output: Record<string, unknown>;
    error?: string;
  }>;
}

export type DisciplineNodeExecutor = (ctx: DisciplineNodeExecutorInput) => Promise<{
  status: DisciplineNodeRecord['status'];
  outputs?: Record<string, number | string | boolean | null>;
  uncertaintySummary: string;
  executionReceiptId: string;
  reason?: string;
}>;

export interface CoupledLoopHandoffPackage {
  schema: 'usv01-loop-iii-handoff/v1';
  candidateId: string;
  revisionId: string;
  revisionSha256: string;
  loopOrigin: EngineeringLoopId;
  hardConstraintsPassed: boolean;
  hardConstraintBlockers: string[];
  unknownCount: number;
  failedCount: number;
  controlledPromotionBlocked: boolean;
  status: 'BLOCKED_SAFETY_OR_UNKNOWN' | 'READY_FOR_INDEPENDENT_VNV_REVIEW';
  independentReviewExecuted: false;
  directorApproved: false;
  vesselReleaseAuthorized: false;
}

export interface CoupledRevisionStepInput {
  candidateId: string;
  revisionId: string;
  transactionId: string;
  sourceCommitSha: string;
  projectId: string;
  missionId: string;
  configurationId: string;
  requirementsDigest: string;
  geometryRef: CandidateRevisionDraft['geometryRef'];
  massCgRef: CandidateRevisionDraft['massCgRef'];
  inputOrigins: Record<string, InputOriginRecord>;
  changedDomains: UpstreamInputDomain[];
  disciplineGraph: Record<string, Omit<DisciplineNodeRecord, 'upstreamDigest' | 'outputDigest' | 'executionReceiptId'>>;
  executors: Record<string, DisciplineNodeExecutor>;
  evaluateHardConstraints: (
    nodes: Record<string, DisciplineNodeRecord>,
    origins: Record<string, InputOriginRecord>
  ) => HardConstraintRecord[];
  evaluateObjectives: (
    nodes: Record<string, DisciplineNodeRecord>,
    origins: Record<string, InputOriginRecord>,
    hardConstraints: HardConstraintRecord[]
  ) => ObjectiveMetricRecord[];
  modelCritique?: {
    reviewerId: 'A15' | 'A23';
    findings: string[];
    disposition: 'CHALLENGE_LOGGED' | 'ACCEPT_FOR_STUDY' | 'HOLD';
  };
}

/**
 * Governed Loop I -> Loop II -> Loop III controller connecting canonical 26-agent roles,
 * deterministic ToolRegistry screens, dependency-ordered recomputation, and fail-closed
 * Loop III independent V&V handoffs.
 */
export class CoupledDesignController {
  private readonly store = new IsolatedCandidateStore();

  public getStore(): IsolatedCandidateStore {
    return this.store;
  }

  public async executeRevision(step: CoupledRevisionStepInput): Promise<{
    manifest: DigitalThreadManifest;
    executedNodes: string[];
    skippedStaleOrBlockedNodes: string[];
    handoff: CoupledLoopHandoffPackage;
  }> {
    const registry = AgentRegistry.getInstance();
    const parent = this.store.getLatestRevision(step.candidateId);

    // Build baseline node records from declared graph and verify canonical agent IDs.
    const initialNodes: Record<string, DisciplineNodeRecord> = {};
    for (const [nodeId, spec] of Object.entries(step.disciplineGraph)) {
      // Ensure every discipline node maps to a canonical role in A01..A26.
      registry.requireAgent(spec.ownerRole);
      const upstreamInputs = Object.values(step.inputOrigins).filter(o =>
        spec.upstreamDomains.includes(o.domain)
      );
      initialNodes[nodeId] = {
        ...spec,
        status: 'NOT_RUN',
        upstreamDigest: canonicalSha256({
          upstreamInputs,
          geometrySha: spec.upstreamDomains.includes('geometry') ? step.geometryRef.sha256 : null,
          massSha: spec.upstreamDomains.includes('massCg') ? step.massCgRef.sha256 : null
        }),
        outputDigest: null,
        executionReceiptId: null
      };
    }

    const topoOrder = assertAcyclicDependencies(initialNodes);
    const impacted = parent
      ? computeImpactedNodes(initialNodes, step.changedDomains)
      : new Set(topoOrder);

    const executedNodes: string[] = [];
    const skippedStaleOrBlockedNodes: string[] = [];
    const upstreamOutputs: Record<string, Record<string, number | string | boolean | null>> = {};

    const executeTool = async (
      toolId: string,
      params: Record<string, unknown>,
      permissions: string[]
    ) => {
      const res = await ToolRegistry.getInstance().executeTool(toolId, params, permissions);
      return { success: res.success, output: res.output, error: res.error };
    };

    for (const nodeId of topoOrder) {
      const node = initialNodes[nodeId];

      // If parent exists and this node was NOT impacted by changed domains, reuse parent snapshot.
      if (parent && !impacted.has(nodeId) && parent.disciplineNodes[nodeId]) {
        const reused = parent.disciplineNodes[nodeId];
        initialNodes[nodeId] = JSON.parse(JSON.stringify(reused)) as DisciplineNodeRecord;
        if (reused.outputs) upstreamOutputs[nodeId] = reused.outputs;
        continue;
      }

      // Check whether any upstream dependency failed or is blocked/not run.
      const unreadyDep = node.dependsOnNodes.find(
        dep => initialNodes[dep]?.status !== 'VALID_UNVERIFIED'
      );
      if (unreadyDep) {
        node.status = 'BLOCKED';
        node.invalidationReason = `Blocked by dependency ${unreadyDep} (${initialNodes[unreadyDep]?.status})`;
        skippedStaleOrBlockedNodes.push(nodeId);
        continue;
      }

      // Refresh upstream digest including dependency output digests.
      node.upstreamDigest = canonicalSha256({
        baseDigest: node.upstreamDigest,
        depDigests: node.dependsOnNodes.map(d => initialNodes[d].outputDigest)
      });

      const executor = step.executors[nodeId];
      if (!executor) {
        node.status = 'NOT_RUN';
        node.invalidationReason = 'No registered deterministic/campaign executor supplied for impacted node';
        skippedStaleOrBlockedNodes.push(nodeId);
        continue;
      }

      const result = await executor({
        candidateId: step.candidateId,
        revisionId: step.revisionId,
        node,
        inputOrigins: step.inputOrigins,
        upstreamOutputs,
        executeTool
      });

      node.status = result.status;
      node.outputs = result.outputs;
      node.uncertaintySummary = result.uncertaintySummary;
      node.executionReceiptId = result.executionReceiptId;
      node.outputDigest = result.status === 'VALID_UNVERIFIED'
        ? canonicalSha256({ nodeId, outputs: result.outputs ?? {}, receipt: result.executionReceiptId })
        : null;
      if (result.reason) node.invalidationReason = result.reason;
      if (result.outputs) upstreamOutputs[nodeId] = result.outputs;
      executedNodes.push(nodeId);
    }

    const hardConstraints = step.evaluateHardConstraints(initialNodes, step.inputOrigins);
    const objectives = step.evaluateObjectives(initialNodes, step.inputOrigins, hardConstraints);

    const reviews: ReviewRecord[] = [];
    // Preliminary manifest pre-sha computation for binding model critique
    const draft: CandidateRevisionDraft = {
      transactionId: step.transactionId,
      candidateId: step.candidateId,
      revisionId: step.revisionId,
      expectedParentSha256: parent ? parent.revisionSha256 : null,
      sourceCommitSha: step.sourceCommitSha,
      projectId: step.projectId,
      missionId: step.missionId,
      configurationId: step.configurationId,
      requirementsDigest: step.requirementsDigest,
      geometryRef: step.geometryRef,
      massCgRef: step.massCgRef,
      inputOrigins: step.inputOrigins,
      disciplineNodes: initialNodes,
      hardConstraints,
      objectives,
      reviews,
      changedDomainsFromParent: step.changedDomains
    };

    const committed = this.store.commitRevision(draft);

    if (step.modelCritique) {
      // Attach model critique record in a non-authoritative evaluation summary
      // (A15/A23 critique is model-level only, never independent engineering verification).
      const spec = registry.requireAgent(step.modelCritique.reviewerId);
      reviews.push({
        reviewId: `CRIT-${step.revisionId}-${step.modelCritique.reviewerId}`,
        kind: 'MODEL_CRITIQUE',
        reviewerId: spec.id,
        authorityOrModel: `${spec.canonicalId} model-level critique (not independent V&V)`,
        authorRolesProducedDesign: ['A01'],
        conflictOfInterest: false,
        boundRevisionSha256: committed.revisionSha256,
        disposition: step.modelCritique.disposition,
        findings: step.modelCritique.findings
      });
    }

    const handoff = this.buildLoopThreeHandoff(committed);
    return { manifest: committed, executedNodes, skippedStaleOrBlockedNodes, handoff };
  }

  public buildLoopThreeHandoff(manifest: DigitalThreadManifest): CoupledLoopHandoffPackage {
    const failed = manifest.hardConstraints.filter(c => c.status === 'FAIL');
    const unknown = manifest.hardConstraints.filter(c => c.status === 'UNKNOWN');
    const blockers = [
      ...failed.map(c => `HARD_FAIL(${c.id}): ${c.reason}`),
      ...unknown.map(c => `SAFETY_UNKNOWN(${c.id}): ${c.reason}`)
    ];
    const controlledPromotionBlocked = blockers.length > 0;
    return {
      schema: 'usv01-loop-iii-handoff/v1',
      candidateId: manifest.candidateId,
      revisionId: manifest.revisionId,
      revisionSha256: manifest.revisionSha256,
      loopOrigin: 'LOOP_II_COUPLED_DESIGN',
      hardConstraintsPassed: !controlledPromotionBlocked,
      hardConstraintBlockers: blockers,
      unknownCount: unknown.length,
      failedCount: failed.length,
      controlledPromotionBlocked,
      status: controlledPromotionBlocked
        ? 'BLOCKED_SAFETY_OR_UNKNOWN'
        : 'READY_FOR_INDEPENDENT_VNV_REVIEW',
      independentReviewExecuted: false,
      directorApproved: false,
      vesselReleaseAuthorized: false
    };
  }
}
