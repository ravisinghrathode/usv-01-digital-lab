import { describe, expect, it } from 'vitest';
import {
  assertAcyclicDependencies,
  canonicalSha256,
  invalidateDownstreamNodes,
  IsolatedCandidateStore,
  type CandidateRevisionDraft,
  type DisciplineNodeRecord
} from '../src/core/digital-thread/EngineeringDigitalThread.ts';
import { CoupledDesignController } from '../src/core/optimizer/CoupledDesignController.ts';

const COMMIT_SHA = '4b6bf3107abd50fec0074a98563979ca9dae9b42';
const REQ_SHA = 'sha256:' + 'a'.repeat(64);
const GEOM_1_SHA = 'sha256:' + '1'.repeat(64);
const GEOM_2_SHA = 'sha256:' + '2'.repeat(64);
const MASS_1_SHA = 'sha256:' + '3'.repeat(64);

function baseNodes(): Record<string, DisciplineNodeRecord> {
  return {
    HYDRO: {
      nodeId: 'HYDRO',
      ownerRole: 'A06',
      status: 'VALID_UNVERIFIED',
      upstreamDomains: ['geometry', 'massCg'],
      dependsOnNodes: [],
      upstreamDigest: canonicalSha256({ geom: GEOM_1_SHA }),
      outputDigest: canonicalSha256({ gmt: 0.48 }),
      uncertaintySummary: '±1.5%',
      evidenceClass: 'SCREENED',
      executionReceiptId: 'RCP-HYD-1',
      outputs: { gmt: 0.48 }
    },
    RESISTANCE: {
      nodeId: 'RESISTANCE',
      ownerRole: 'A07',
      status: 'VALID_UNVERIFIED',
      upstreamDomains: ['geometry'],
      dependsOnNodes: ['HYDRO'],
      upstreamDigest: canonicalSha256({ geom: GEOM_1_SHA, hyd: '1' }),
      outputDigest: canonicalSha256({ rtN: 420 }),
      uncertaintySummary: '±5%',
      evidenceClass: 'SCREENED',
      executionReceiptId: 'RCP-RES-1',
      outputs: { rtN: 420 }
    },
    SAFETY: {
      nodeId: 'SAFETY',
      ownerRole: 'A22',
      status: 'VALID_UNVERIFIED',
      upstreamDomains: ['thermal'],
      dependsOnNodes: ['HYDRO', 'RESISTANCE'],
      upstreamDigest: canonicalSha256({ res: '1' }),
      outputDigest: canonicalSha256({ ok: true }),
      uncertaintySummary: 'L2 screen',
      evidenceClass: 'SCREENED',
      executionReceiptId: 'RCP-SAF-1'
    }
  };
}

function makeDraft(overrides: Partial<CandidateRevisionDraft> = {}): CandidateRevisionDraft {
  return {
    transactionId: 'TX-1',
    candidateId: 'CAND-MONO',
    revisionId: 'REV-1',
    expectedParentSha256: null,
    sourceCommitSha: COMMIT_SHA,
    projectId: 'USV-01',
    missionId: 'M03-TEST',
    configurationId: 'CFG-MONO',
    requirementsDigest: REQ_SHA,
    geometryRef: { uri: 'study://mono/rev1', sha256: GEOM_1_SHA, revisionId: 'REV-1', topology: 'MONOHULL' },
    massCgRef: { uri: 'study://mass/rev1', sha256: MASS_1_SHA, revisionId: 'REV-1' },
    inputOrigins: {
      lwl: {
        key: 'lwl',
        domain: 'geometry',
        value: 6.0,
        unit: 'm',
        coordinateFrame: 'X_FWD_AP_Y_STBD_Z_UP_BL',
        origin: 'CONTROLLED_SOURCE',
        sourceReference: 'SPEC-1'
      }
    },
    disciplineNodes: baseNodes(),
    hardConstraints: [
      {
        id: 'HC-1',
        description: 'Minimum GMt >= 0.35m',
        status: 'PASS_AT_FIDELITY',
        value: 0.48,
        limit: 0.35,
        unit: 'm',
        fidelity: 'L2_SCREENING',
        reason: 'Within screening limit'
      }
    ],
    objectives: [
      { id: 'OBJ-RT', value: 420, uncertaintyPlusMinus: 20, unit: 'N', direction: 'MINIMIZE', comparable: true }
    ],
    ...overrides
  };
}

describe('M03 — B03/B05 immutable digital thread & coupled design transactions', () => {
  it('enforces replay protection, stale parent rejection, candidate isolation, and blocks fabricated self-promotion', () => {
    const store = new IsolatedCandidateStore();
    const r1 = store.commitRevision(makeDraft());
    expect(r1.revisionNumber).toBe(1);
    expect(Object.isFrozen(r1)).toBe(true);

    // Replay rejected
    expect(() => store.commitRevision(makeDraft())).toThrow(/Replay rejected/);

    // Stale parent rejected
    expect(() =>
      store.commitRevision(
        makeDraft({
          transactionId: 'TX-2-STALE',
          revisionId: 'REV-2',
          expectedParentSha256: 'sha256:' + '0'.repeat(64)
        })
      )
    ).toThrow(/Stale parent/);

    // Fabricated DIRECTOR_APPROVED or INDEPENDENTLY_VERIFIED rejected
    expect(() =>
      store.commitRevision(
        makeDraft({
          transactionId: 'TX-2-FORGE-DIR',
          revisionId: 'REV-2',
          expectedParentSha256: r1.revisionSha256,
          requestedApprovalState: 'DIRECTOR_APPROVED'
        })
      )
    ).toThrow(/Fabricated approval rejected/);

    expect(() =>
      store.commitRevision(
        makeDraft({
          transactionId: 'TX-2-FORGE-VER',
          revisionId: 'REV-2',
          expectedParentSha256: r1.revisionSha256,
          requestedEvidenceClass: 'INDEPENDENTLY_VERIFIED'
        })
      )
    ).toThrow(/Fabricated evidence promotion rejected/);
  });

  it('rejects dependency cycles and omitted downstream invalidations after geometry or mass changes', () => {
    const cyclic = baseNodes();
    cyclic.HYDRO.dependsOnNodes = ['SAFETY'];
    expect(() => assertAcyclicDependencies(cyclic)).toThrow(/cycle detected/);

    const store = new IsolatedCandidateStore();
    const parent = store.commitRevision(makeDraft());

    // Mutate geometry WITHOUT invalidating downstream HYDRO/RESISTANCE/SAFETY
    expect(() =>
      store.commitRevision(
        makeDraft({
          transactionId: 'TX-BAD-STALE',
          revisionId: 'REV-2',
          expectedParentSha256: parent.revisionSha256,
          geometryRef: { uri: 'study://mono/rev2', sha256: GEOM_2_SHA, revisionId: 'REV-2', topology: 'MONOHULL' }
        })
      )
    ).toThrow(/Stale carry-forward violation/);

    // Proper invalidation succeeds and clears downstream digests
    const invalidated = invalidateDownstreamNodes(parent.disciplineNodes, ['geometry'], 'Geometry beam changed');
    expect(invalidated.HYDRO.status).toBe('INVALIDATED_STALE');
    expect(invalidated.RESISTANCE.status).toBe('INVALIDATED_STALE');
    expect(invalidated.SAFETY.status).toBe('INVALIDATED_STALE');
    expect(invalidated.RESISTANCE.outputDigest).toBeNull();
  });

  it('executes CoupledDesignController with deterministic ToolRegistry hydrostatics and blocks promotion on safety UNKNOWN', async () => {
    const controller = new CoupledDesignController();
    const graph = {
      HYDROSTATICS: {
        nodeId: 'HYDROSTATICS',
        ownerRole: 'A06',
        status: 'NOT_RUN' as const,
        upstreamDomains: ['geometry' as const, 'massCg' as const],
        dependsOnNodes: [],
        uncertaintySummary: '±2%',
        evidenceClass: 'SCREENED' as const
      },
      PROPULSION: {
        nodeId: 'PROPULSION',
        ownerRole: 'A13',
        status: 'NOT_RUN' as const,
        upstreamDomains: ['geometry' as const],
        dependsOnNodes: ['HYDROSTATICS'],
        uncertaintySummary: '±5%',
        evidenceClass: 'SCREENED' as const
      }
    };

    const res1 = await controller.executeRevision({
      candidateId: 'CAND-A',
      revisionId: 'R1',
      transactionId: 'TX-CTRL-1',
      sourceCommitSha: COMMIT_SHA,
      projectId: 'USV-01',
      missionId: 'M03',
      configurationId: 'CFG-A',
      requirementsDigest: REQ_SHA,
      geometryRef: { uri: 'study://a/1', sha256: GEOM_1_SHA, revisionId: 'R1', topology: 'MONOHULL' },
      massCgRef: { uri: 'study://a/mass/1', sha256: MASS_1_SHA, revisionId: 'R1' },
      inputOrigins: {
        lwl: {
          key: 'lwl',
          domain: 'geometry',
          value: 6.0,
          unit: 'm',
          coordinateFrame: 'X_FWD_AP_Y_STBD_Z_UP_BL',
          origin: 'CONTROLLED_SOURCE',
          sourceReference: 'SPEC-1'
        }
      },
      changedDomains: [],
      disciplineGraph: graph,
      executors: {
        HYDROSTATICS: async ctx => {
          const tool = await ctx.executeTool(
            'TOOL-HYDROSTATICS-01',
            { lwlMeters: 6.0, beamMeters: 1.8, draftMeters: 0.4, blockCoefficientCb: 0.45, kgMeters: 0.45 },
            ['CALCULATION_EXEC']
          );
          return {
            status: tool.success ? 'VALID_UNVERIFIED' : 'FAILED',
            outputs: { gmMeters: Number(tool.output.gmMeters ?? 0) },
            uncertaintySummary: '±2%',
            executionReceiptId: 'RCP-HYD-R1'
          };
        },
        PROPULSION: async ctx => ({
          status: 'VALID_UNVERIFIED',
          outputs: { gmSeen: Number(ctx.upstreamOutputs.HYDROSTATICS.gmMeters ?? 0) },
          uncertaintySummary: '±5%',
          executionReceiptId: 'RCP-PROP-R1'
        })
      },
      evaluateHardConstraints: () => [
        {
          id: 'HC-COLREG-SAFE',
          description: 'Link-loss degraded safety verified',
          status: 'UNKNOWN',
          value: null,
          limit: null,
          unit: 'bool',
          fidelity: 'L2_SCREENING',
          reason: 'SIL hardware tests pending'
        }
      ],
      evaluateObjectives: () => [
        { id: 'RES', value: 380, uncertaintyPlusMinus: 15, unit: 'N', direction: 'MINIMIZE', comparable: true }
      ]
    });

    expect(res1.executedNodes).toEqual(['HYDROSTATICS', 'PROPULSION']);
    expect(res1.handoff.controlledPromotionBlocked).toBe(true);
    expect(res1.handoff.status).toBe('BLOCKED_SAFETY_OR_UNKNOWN');
    expect(res1.handoff.directorApproved).toBe(false);
    expect(res1.handoff.vesselReleaseAuthorized).toBe(false);
  });
});
