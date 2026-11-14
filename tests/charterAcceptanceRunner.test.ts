import { describe, expect, it } from 'vitest';
import {
  runCharterAcceptanceEDemonstration,
  type FrozenStudyEnvelope
} from '../src/core/optimizer/CharterAcceptanceRunner.ts';
import type { ParametricHullSpec } from '../src/core/cad/ParametricHullPipeline.ts';

const COMMIT = '4b6bf3107abd50fec0074a98563979ca9dae9b42';

const ENVELOPE: FrozenStudyEnvelope = {
  studyId: 'STUDY-CHARTER-E-01',
  sourceCommitSha: COMMIT,
  fixedSpeedKnots: 12.0,
  fixedWaterDensityKgM3: 1025,
  fixedWaterTempC: 15,
  maxDisplacementErrorFraction: 0.015,
  minGmtMeters: 0.25,
  objectiveUncertaintyBudget: 10.0,
  predeclaredObjective: {
    id: 'E_TOTAL_RESISTANCE_PROXY_N',
    direction: 'MINIMIZE',
    unit: 'N'
  },
  safetyConstraintsLockedBeforeRun: true
};

function monoHull(revId: string, lwlM: number, hullBeamM: number, draftDesignM: number): ParametricHullSpec {
  return {
    schema: 'usv01-parametric-hull/v1',
    geometryId: 'CAND-MONO-HULL',
    revisionId: revId,
    sourceOwnership: 'STUDY_ARCHITECT_A05',
    units: 'SI_METERS_KG',
    coordinateConvention: 'X_FWD_FROM_AP_Y_STBD_Z_UP_FROM_BL',
    topology: 'MONOHULL',
    sectionShape: 'BOX',
    lwlM,
    loaM: lwlM + 0.5,
    hullBeamM,
    depthM: 1.2,
    draftDesignM,
    stationCount: 9,
    interfaces: []
  };
}

function catHull(revId: string): ParametricHullSpec {
  return {
    schema: 'usv01-parametric-hull/v1',
    geometryId: 'CAND-CAT-HULL',
    revisionId: revId,
    sourceOwnership: 'STUDY_ARCHITECT_A05',
    units: 'SI_METERS_KG',
    coordinateConvention: 'X_FWD_FROM_AP_Y_STBD_Z_UP_FROM_BL',
    topology: 'CATAMARAN',
    sectionShape: 'BOX',
    lwlM: 7.0,
    loaM: 7.4,
    hullBeamM: 0.55,
    demiHullCenterlineSpacingM: 1.9,
    depthM: 1.0,
    draftDesignM: 0.35,
    stationCount: 9,
    interfaces: []
  };
}

describe('M08 — Charter Acceptance E measurable multi-concept & multi-revision demonstration', () => {
  it('demonstrates >=2 distinct hull concepts, >=2 critique revisions with invalidation/recompute, and measurable gain > combined uncertainty', async () => {
    // Box hull:
    // Rev 1: L=6.0m, B=1.8m, T=0.5m -> mass = 6*1.8*0.5*1025 = 5535 kg
    // Rev 2 (critique: reduce beam/wetted beam-to-length ratio -> lengthen L=7.5m, slim B=1.5m, T=0.45m -> mass = 7.5*1.5*0.45*1025 = 5189.0625 kg)
    //Wait: verify resistance decreases by > sqrt(10^2 + 10^2) ≈ 14.14 N!
    const report = await runCharterAcceptanceEDemonstration({
      envelope: ENVELOPE,
      projectLeadStudySelection: 'CAND-CATAMARAN recommended for further detailed study ONLY (non-release)',
      candidates: [
        {
          candidateId: 'CAND-MONOHULL',
          configurationId: 'CFG-MONO',
          revisions: [
            {
              revisionId: 'REV-1',
              critiqueReason: 'Initial baseline monohull hypothesis',
              hullSpec: monoHull('REV-1', 6.0, 1.8, 0.5),
              loadCase: { id: 'LC-MONO-1', massKg: 5535, kgM: 0.4, lcgM: 3.0, tcgM: 0 },
              safetyKnownStatus: 'PASS_AT_FIDELITY',
              safetyReason: 'L2 safety screening cases evaluated'
            },
            {
              revisionId: 'REV-2',
              critiqueReason: 'A15 critique: excessive wave-making Fn and beam drag; elongate LWL from 6m to 7.8m and slim beam to 1.45m',
              hullSpec: monoHull('REV-2', 7.8, 1.45, 0.42),
              loadCase: { id: 'LC-MONO-2', massKg: 7.8 * 1.45 * 0.42 * 1025, kgM: 0.36, lcgM: 3.9, tcgM: 0 },
              safetyKnownStatus: 'PASS_AT_FIDELITY',
              safetyReason: 'L2 safety screening cases re-evaluated for REV-2'
            },
            {
              revisionId: 'REV-3',
              critiqueReason: 'A15 second critique: further reduce wetted draft via 8.2m slender hull form',
              hullSpec: monoHull('REV-3', 8.2, 1.4, 0.38),
              loadCase: { id: 'LC-MONO-3', massKg: 8.2 * 1.4 * 0.38 * 1025, kgM: 0.34, lcgM: 4.1, tcgM: 0 },
              safetyKnownStatus: 'PASS_AT_FIDELITY',
              safetyReason: 'L2 safety screening cases re-evaluated for REV-3'
            }
          ]
        },
        {
          candidateId: 'CAND-CATAMARAN',
          configurationId: 'CFG-CAT',
          revisions: [
            {
              revisionId: 'REV-1',
              critiqueReason: 'Alternative twin-hull topology concept',
              hullSpec: catHull('REV-1'),
              loadCase: { id: 'LC-CAT-1', massKg: 2 * 7.0 * 0.55 * 0.35 * 1025, kgM: 0.38, lcgM: 3.5, tcgM: 0 },
              safetyKnownStatus: 'PASS_AT_FIDELITY',
              safetyReason: 'L2 safety screening cases evaluated'
            }
          ]
        }
      ]
    });

    expect(report.executionMode).toBe('DETERMINISTIC_OFFLINE_DEMONSTRATION');
    expect(report.candidateCount).toBe(2);
    expect(report.maxRevisionsInSingleCandidate).toBe(3);
    expect(report.acceptanceEDisposition).toBe('DEMONSTRATED_MEASURABLE_GAIN_RESEARCH_ONLY');
    expect(report.improvementClaimed).toBe(true);
    expect(report.measuredDeltaObjective!).toBeLessThan(-report.combinedUncertainty!);
    expect(report.trajectories[1].invalidationTriggered).toBe(true);
    expect(report.trajectories[1].recomputedNodes).toEqual(['HYDROSTATICS', 'RESISTANCE']);
    expect(report.engineeringDirectorReleaseAuthorized).toBe(false);
    expect(report.vesselHardwareActivationAuthorized).toBe(false);
  });

  it('fails acceptance E immediately whenever any hard safety constraint is UNKNOWN or FAIL', async () => {
    const blocked = await runCharterAcceptanceEDemonstration({
      envelope: ENVELOPE,
      candidates: [
        {
          candidateId: 'CAND-MONOHULL',
          configurationId: 'CFG-MONO',
          revisions: [
            {
              revisionId: 'REV-1',
              critiqueReason: 'Initial',
              hullSpec: monoHull('REV-1', 6.0, 1.8, 0.5),
              loadCase: { id: 'LC-1', massKg: 5535, kgM: 0.4, lcgM: 3.0, tcgM: 0 },
              safetyKnownStatus: 'UNKNOWN',
              safetyReason: 'COLREG degraded SIL evidence missing'
            },
            {
              revisionId: 'REV-2',
              critiqueReason: 'Lengthen hull',
              hullSpec: monoHull('REV-2', 8.0, 1.4, 0.4),
              loadCase: { id: 'LC-2', massKg: 8.0 * 1.4 * 0.4 * 1025, kgM: 0.36, lcgM: 4.0, tcgM: 0 },
              safetyKnownStatus: 'UNKNOWN',
              safetyReason: 'COLREG degraded SIL evidence still missing'
            }
          ]
        },
        {
          candidateId: 'CAND-CATAMARAN',
          configurationId: 'CFG-CAT',
          revisions: [
            {
              revisionId: 'REV-1',
              critiqueReason: 'Catamaran',
              hullSpec: catHull('REV-1'),
              loadCase: { id: 'LC-CAT-1', massKg: 2 * 7.0 * 0.55 * 0.35 * 1025, kgM: 0.38, lcgM: 3.5, tcgM: 0 },
              safetyKnownStatus: 'PASS_AT_FIDELITY',
              safetyReason: 'L2 screening'
            }
          ]
        }
      ]
    });

    expect(blocked.acceptanceEDisposition).toBe('FAIL_SAFETY_UNKNOWN_OR_HARD_BLOCKED');
    expect(blocked.openBlockers).toContain('HARD_SAFETY_CONSTRAINT_FAIL_OR_UNKNOWN');
    expect(blocked.engineeringDirectorReleaseAuthorized).toBe(false);
  });
});
