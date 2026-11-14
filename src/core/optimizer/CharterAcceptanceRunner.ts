import type { ParametricHullSpec, ParametricHullArtifact, GeometryPhysicsHandoffReceipt } from '../cad/ParametricHullPipeline.ts';
import {
  coupleGeometryToHydrostatics,
  generateParametricHull
} from '../cad/ParametricHullPipeline.ts';
import type {
  DigitalThreadManifest,
  DisciplineNodeRecord,
  HardConstraintRecord,
  InputOriginRecord,
  ObjectiveMetricRecord,
  UpstreamInputDomain
} from '../digital-thread/EngineeringDigitalThread.ts';
import { CoupledDesignController } from '../optimizer/CoupledDesignController.ts';
import type { HydroLoadCase } from '../tools/naval/offsetHydrostatics.ts';

export interface FrozenStudyEnvelope {
  studyId: string;
  sourceCommitSha: string;
  fixedSpeedKnots: number;
  fixedWaterDensityKgM3: number;
  fixedWaterTempC: number;
  maxDisplacementErrorFraction: number;
  minGmtMeters: number;
  objectiveUncertaintyBudget: number;
  predeclaredObjective: {
    id: 'E_TOTAL_RESISTANCE_PROXY_N';
    direction: 'MINIMIZE';
    unit: 'N';
  };
  safetyConstraintsLockedBeforeRun: true;
}

export interface StudyCandidateRunConfig {
  candidateId: string;
  configurationId: string;
  revisions: Array<{
    revisionId: string;
    critiqueReason: string;
    hullSpec: ParametricHullSpec;
    loadCase: HydroLoadCase;
    safetyKnownStatus: 'PASS_AT_FIDELITY' | 'UNKNOWN' | 'FAIL';
    safetyReason: string;
  }>;
}

export interface CandidateRevisionTrajectory {
  candidateId: string;
  revisionId: string;
  revisionSha256: string;
  geometrySha256: string;
  changedDomains: UpstreamInputDomain[];
  invalidationTriggered: boolean;
  recomputedNodes: string[];
  objectiveValue: number | null;
  uncertaintyPlusMinus: number;
  hardConstraintsPassed: boolean;
  hardConstraintBlockers: string[];
  handoffStatus: 'BLOCKED_SAFETY_OR_UNKNOWN' | 'READY_FOR_INDEPENDENT_VNV_REVIEW';
}

export interface BlindedAcceptanceEReport {
  schema: 'usv01-charter-acceptance-e/v1';
  studyId: string;
  sourceCommitSha: string;
  executionMode: 'DETERMINISTIC_OFFLINE_DEMONSTRATION';
  candidateCount: number;
  maxRevisionsInSingleCandidate: number;
  trajectories: CandidateRevisionTrajectory[];
  improvementClaimed: boolean;
  measuredDeltaObjective: number | null;
  combinedUncertainty: number | null;
  acceptanceEDisposition:
    | 'DEMONSTRATED_MEASURABLE_GAIN_RESEARCH_ONLY'
    | 'FAILURE_TO_IMPROVE_OR_BELOW_UNCERTAINTY'
    | 'FAIL_SAFETY_UNKNOWN_OR_HARD_BLOCKED';
  projectLeadStudyDecisionRecorded: boolean;
  engineeringDirectorReleaseAuthorized: false;
  vesselHardwareActivationAuthorized: false;
  openBlockers: string[];
}

function estimateCalmWaterResistanceProxyN(
  artifact: ParametricHullArtifact,
  handoff: GeometryPhysicsHandoffReceipt,
  speedKnots: number,
  densityKgM3: number
): number {
  const vMs = speedKnots * 0.514444;
  const lwl = artifact.spec.lwlM;
  const draft = handoff.hydroResult.equilibriumDraftM;
  const beam = artifact.spec.hullBeamM;
  const hulls = artifact.spec.topology === 'CATAMARAN' ? 2 : 1;
  // Simple Holtrop-style dimensional surrogate (preliminary L2 screen only, NOT tow-tank CFD):
  // Wetted surface approx S ≈ n_hulls * LWL * (1.7 * T + Cb * B)
  const dispVol = handoff.hydroResult.displacedVolumeM3;
  const blockVol = Math.max(1e-6, hulls * lwl * beam * draft);
  const cb = Math.min(0.95, Math.max(0.3, dispVol / blockVol));
  const wettedSurface = hulls * lwl * (1.7 * draft + cb * beam);
  const re = Math.max(1e5, (vMs * lwl) / 1.19e-6);
  const cf = 0.075 / Math.pow(Math.log10(re) - 2, 2);
  const fn = vMs / Math.sqrt(9.80665 * lwl);
  const waveFactor = 1 + 2.5 * Math.pow(fn, 2);
  const rTotalN = 0.5 * densityKgM3 * Math.pow(vMs, 2) * wettedSurface * cf * waveFactor;
  return Number(rTotalN.toFixed(3));
}

export async function runCharterAcceptanceEDemonstration(input: {
  envelope: FrozenStudyEnvelope;
  candidates: readonly StudyCandidateRunConfig[];
  projectLeadStudySelection?: string | null;
}): Promise<BlindedAcceptanceEReport> {
  const controller = new CoupledDesignController();
  const trajectories: CandidateRevisionTrajectory[] = [];
  const openBlockers: string[] = [
    'INDEPENDENT_EXTERNAL_VNV_PENDING',
    'TRUSTED_HOST_LIVE_26_AGENT_CAMPAIGN_PENDING',
    'DIRECTOR_ENGINEERING_RELEASE_HOLD'
  ];

  for (const cand of input.candidates) {
    let prevHull: ParametricHullArtifact | null = null;
    let prevLoad: HydroLoadCase | null = null;

    for (let idx = 0; idx < cand.revisions.length; idx++) {
      const rev = cand.revisions[idx];
      const artifact = generateParametricHull(rev.hullSpec);
      const handoff = coupleGeometryToHydrostatics(
        artifact,
        rev.loadCase,
        input.envelope.fixedWaterDensityKgM3
      );

      const changedDomains: UpstreamInputDomain[] = [];
      if (idx > 0) {
        if (prevHull && prevHull.geometrySha256 !== artifact.geometrySha256) changedDomains.push('geometry');
        if (
          prevLoad &&
          (prevLoad.massKg !== rev.loadCase.massKg ||
            prevLoad.kgM !== rev.loadCase.kgM ||
            prevLoad.lcgM !== rev.loadCase.lcgM)
        ) {
          changedDomains.push('massCg', 'loadCase');
        }
      }

      const origin = (
        key: string,
        domain: UpstreamInputDomain,
        value: number | string,
        unit: string
      ): InputOriginRecord => ({
        key,
        domain,
        value,
        unit,
        coordinateFrame: 'X_FWD_AP_Y_STBD_Z_UP_BL',
        origin: 'CONTROLLED_SOURCE',
        sourceReference: `${cand.candidateId}/${rev.revisionId}`
      });

      const inputOrigins: Record<string, InputOriginRecord> = {
        hullLength: origin('hullLength', 'geometry', rev.hullSpec.lwlM, 'm'),
        hullBeam: origin('hullBeam', 'geometry', rev.hullSpec.hullBeamM, 'm'),
        massKg: origin('massKg', 'massCg', rev.loadCase.massKg, 'kg'),
        speedKnots: origin('speedKnots', 'loadCase', input.envelope.fixedSpeedKnots, 'kn')
      };

      const disciplineGraph: Record<
        string,
        Omit<DisciplineNodeRecord, 'upstreamDigest' | 'outputDigest' | 'executionReceiptId'>
      > = {
        HYDROSTATICS: {
          nodeId: 'HYDROSTATICS',
          ownerRole: 'A06',
          status: 'NOT_RUN',
          upstreamDomains: ['geometry', 'massCg', 'loadCase'],
          dependsOnNodes: [],
          uncertaintySummary: '±1.5% numerical trapezoidal hull offset error',
          evidenceClass: 'SCREENED'
        },
        RESISTANCE: {
          nodeId: 'RESISTANCE',
          ownerRole: 'A07',
          status: 'NOT_RUN',
          upstreamDomains: ['geometry', 'loadCase'],
          dependsOnNodes: ['HYDROSTATICS'],
          uncertaintySummary: `±${input.envelope.objectiveUncertaintyBudget} N L2 resistance surrogate band`,
          evidenceClass: 'SCREENED'
        }
      };

      const resistanceN = estimateCalmWaterResistanceProxyN(
        artifact,
        handoff,
        input.envelope.fixedSpeedKnots,
        input.envelope.fixedWaterDensityKgM3
      );

      const stepOut = await controller.executeRevision({
        candidateId: cand.candidateId,
        revisionId: rev.revisionId,
        transactionId: `TX-${cand.candidateId}-${rev.revisionId}`,
        sourceCommitSha: input.envelope.sourceCommitSha,
        projectId: 'USV-01',
        missionId: input.envelope.studyId,
        configurationId: cand.configurationId,
        requirementsDigest: artifact.geometrySha256,
        geometryRef: {
          uri: `study://cad/${cand.candidateId}/${rev.revisionId}`,
          sha256: artifact.geometrySha256,
          revisionId: rev.revisionId,
          topology: rev.hullSpec.topology
        },
        massCgRef: {
          uri: `study://mass/${cand.candidateId}/${rev.revisionId}`,
          sha256: handoff.loadCaseSha256,
          revisionId: rev.revisionId
        },
        inputOrigins,
        changedDomains,
        disciplineGraph,
        executors: {
          HYDROSTATICS: async () => ({
            status: 'VALID_UNVERIFIED',
            outputs: {
              gmtMeters: handoff.hydroResult.freeSurfaceCorrectedGmtM ?? handoff.hydroResult.uncorrectedGmtM ?? null,
              displacementErrorRel: handoff.displacementRelativeError
            },
            uncertaintySummary: '±1.5% offset hydrostatics closure',
            executionReceiptId: `HYD-${cand.candidateId}-${rev.revisionId}`
          }),
          RESISTANCE: async () => ({
            status: 'VALID_UNVERIFIED',
            outputs: {
              resistanceN
            },
            uncertaintySummary: `±${input.envelope.objectiveUncertaintyBudget} N preliminary surrogate`,
            executionReceiptId: `RES-${cand.candidateId}-${rev.revisionId}`
          })
        },
        evaluateHardConstraints: (nodes): HardConstraintRecord[] => {
          const gmt = Number(nodes.HYDROSTATICS?.outputs?.gmtMeters ?? Number.NaN);
          const gmtOk = Number.isFinite(gmt) && gmt >= input.envelope.minGmtMeters;
          const massOk = handoff.massClosureOk;
          return [
            {
              id: 'HC-MASS-CLOSURE',
              description: 'Hydrostatic displacement matches load-case mass within envelope limit',
              status: massOk ? 'PASS_AT_FIDELITY' : 'FAIL',
              value: handoff.displacementRelativeError,
              limit: input.envelope.maxDisplacementErrorFraction,
              unit: 'fraction',
              fidelity: 'L2_SCREENING',
              reason: massOk ? 'Displacement closure within limit' : 'Displacement mismatch exceeds tolerance'
            },
            {
              id: 'HC-INTACT-GMT',
              description: 'Initial transverse metacentric height meets study envelope minimum',
              status: !Number.isFinite(gmt) ? 'UNKNOWN' : gmtOk ? 'PASS_AT_FIDELITY' : 'FAIL',
              value: Number.isFinite(gmt) ? gmt : null,
              limit: input.envelope.minGmtMeters,
              unit: 'm',
              fidelity: 'L2_SCREENING',
              reason: gmtOk ? 'GMt above minimum threshold at L2 fidelity' : 'GMt below minimum threshold or missing'
            },
            {
              id: 'HC-MARINE-SAFETY',
              description: 'COLREG / degraded link-loss & marine safety case gate',
              status: rev.safetyKnownStatus,
              value: null,
              limit: null,
              unit: 'gate',
              fidelity: 'L2_SCREENING',
              reason: rev.safetyReason
            }
          ];
        },
        evaluateObjectives: (nodes): ObjectiveMetricRecord[] => [
          {
            id: input.envelope.predeclaredObjective.id,
            value: Number(nodes.RESISTANCE?.outputs?.resistanceN ?? Number.NaN),
            uncertaintyPlusMinus: input.envelope.objectiveUncertaintyBudget,
            unit: 'N',
            direction: 'MINIMIZE',
            comparable: true
          }
        ],
        modelCritique:
          idx > 0
            ? {
                reviewerId: 'A15',
                disposition: 'CHALLENGE_LOGGED',
                findings: [`Revision triggered by critique: ${rev.critiqueReason}`]
              }
            : undefined
      });

      const manifest: DigitalThreadManifest = stepOut.manifest;
      trajectories.push({
        candidateId: cand.candidateId,
        revisionId: rev.revisionId,
        revisionSha256: manifest.revisionSha256,
        geometrySha256: artifact.geometrySha256,
        changedDomains: [...manifest.changedDomainsFromParent],
        invalidationTriggered: idx > 0 && manifest.changedDomainsFromParent.length > 0,
        recomputedNodes: stepOut.executedNodes,
        objectiveValue: manifest.objectives[0]?.value ?? null,
        uncertaintyPlusMinus: input.envelope.objectiveUncertaintyBudget,
        hardConstraintsPassed: stepOut.handoff.hardConstraintsPassed,
        hardConstraintBlockers: stepOut.handoff.hardConstraintBlockers,
        handoffStatus: stepOut.handoff.status
      });

      prevHull = artifact;
      prevLoad = rev.loadCase;
    }
  }

  const candidateCount = new Set(input.candidates.map(c => c.candidateId)).size;
  const maxRevisionsInSingleCandidate = Math.max(0, ...input.candidates.map(c => c.revisions.length));

  // Evaluate improvement for primary iterated candidate (first with >= 2 revisions)
  const primaryCand = input.candidates.find(c => c.revisions.length >= 2);
  let measuredDeltaObjective: number | null = null;
  let combinedUncertainty: number | null = null;
  let improvementClaimed = false;

  if (primaryCand) {
    const revRuns = trajectories.filter(t => t.candidateId === primaryCand.candidateId);
    const first = revRuns[0];
    const last = revRuns[revRuns.length - 1];
    if (
      first?.objectiveValue !== null &&
      last?.objectiveValue !== null &&
      Number.isFinite(first.objectiveValue) &&
      Number.isFinite(last.objectiveValue)
    ) {
      // Negative delta = reduction in resistance (MINIMIZE objective)
      measuredDeltaObjective = Number((last.objectiveValue - first.objectiveValue).toFixed(3));
      combinedUncertainty = Number((Math.hypot(first.uncertaintyPlusMinus, last.uncertaintyPlusMinus)).toFixed(3));
      improvementClaimed =
        -measuredDeltaObjective > combinedUncertainty &&
        last.hardConstraintsPassed &&
        revRuns.slice(1).every(r => r.invalidationTriggered && r.recomputedNodes.length > 0);
    }
  }

  const anySafetyBlocked = trajectories.some(t => !t.hardConstraintsPassed);
  let acceptanceEDisposition: BlindedAcceptanceEReport['acceptanceEDisposition'];
  if (anySafetyBlocked) {
    acceptanceEDisposition = 'FAIL_SAFETY_UNKNOWN_OR_HARD_BLOCKED';
    openBlockers.push('HARD_SAFETY_CONSTRAINT_FAIL_OR_UNKNOWN');
  } else if (
    candidateCount < 2 ||
    maxRevisionsInSingleCandidate < 2 ||
    !improvementClaimed
  ) {
    acceptanceEDisposition = 'FAILURE_TO_IMPROVE_OR_BELOW_UNCERTAINTY';
  } else {
    acceptanceEDisposition = 'DEMONSTRATED_MEASURABLE_GAIN_RESEARCH_ONLY';
  }

  return {
    schema: 'usv01-charter-acceptance-e/v1',
    studyId: input.envelope.studyId,
    sourceCommitSha: input.envelope.sourceCommitSha,
    executionMode: 'DETERMINISTIC_OFFLINE_DEMONSTRATION',
    candidateCount,
    maxRevisionsInSingleCandidate,
    trajectories,
    improvementClaimed,
    measuredDeltaObjective,
    combinedUncertainty,
    acceptanceEDisposition,
    projectLeadStudyDecisionRecorded: Boolean(input.projectLeadStudySelection?.trim()),
    engineeringDirectorReleaseAuthorized: false,
    vesselHardwareActivationAuthorized: false,
    openBlockers
  };
}
