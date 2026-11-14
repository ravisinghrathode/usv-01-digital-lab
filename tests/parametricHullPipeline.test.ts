import { describe, expect, it } from 'vitest';
import {
  checkHandoffValidity,
  computeLoadCaseDigest,
  coupleGeometryToHydrostatics,
  generateParametricHull,
  rejectPreviewObjAsEngineeringAuthority,
  type ParametricHullSpec
} from '../src/core/cad/ParametricHullPipeline.ts';
import { parseObjMesh } from '../src/studio/meshGeometry.ts';

function boxBargeSpec(overrides: Partial<ParametricHullSpec> = {}): ParametricHullSpec {
  return {
    schema: 'usv01-parametric-hull/v1',
    geometryId: 'GOLDEN-BOX-01',
    revisionId: 'REV-1',
    sourceOwnership: 'NAVAL_ARCHITECT_A05',
    units: 'SI_METERS_KG',
    coordinateConvention: 'X_FWD_FROM_AP_Y_STBD_Z_UP_FROM_BL',
    topology: 'MONOHULL',
    sectionShape: 'BOX',
    lwlM: 10.0,
    loaM: 10.0,
    hullBeamM: 2.0,
    depthM: 1.0,
    draftDesignM: 0.5,
    stationCount: 9,
    interfaces: [{ id: 'POD-1', category: 'PROPULSION', xM: 0.5, yM: 0, zM: 0.1, envelopeNotes: 'Thruster' }],
    ...overrides
  };
}

describe('M04 — B04 parametric CAD, watertight verification, and geometry-to-physics coupling', () => {
  it('matches exact analytical hydrostatics for golden rectangular box barge (V = L*B*T, KB = T/2, BMt = B^2/(12*T))', () => {
    const spec = boxBargeSpec();
    const artifact = generateParametricHull(spec);
    expect(artifact.meshCheck.watertightManifold).toBe(true);
    expect(artifact.meshCheck.boundaryEdgeCount).toBe(0);
    expect(artifact.meshCheck.nonManifoldEdgeCount).toBe(0);
    expect(artifact.meshCheck.signedEnclosedVolumeM3).toBeCloseTo(10 * 2 * 1, 5);
    expect(artifact.authorityStatus).toBe('STUDY_DRAFT_CAD_UNAPPROVED');
    expect(artifact.approvedEngineeringBaseline).toBe(false);

    // Exported OBJ parses cleanly in the Studio viewport parser
    const parsedObj = parseObjMesh(artifact.objExportAscii);
    expect(parsedObj.triangles.length).toBe(artifact.meshCheck.triangleCount);

    // Exact displacement mass at T = 0.5m, rho = 1025 kg/m^3 -> 10 * 2 * 0.5 * 1025 = 10250 kg
    const receipt = coupleGeometryToHydrostatics(
      artifact,
      { id: 'LC-FULL', massKg: 10250, kgM: 0.4, lcgM: 5.0, tcgM: 0 },
      1025
    );
    expect(receipt.hydroResult.equilibriumDraftM).toBeCloseTo(0.5, 4);
    expect(receipt.hydroResult.kbM).toBeCloseTo(0.25, 4);
    // Exact BMt = I_T / V = (L*B^3/12) / (L*B*T) = B^2/(12*T) = 4 / 6 = 0.6667 m
    expect(receipt.hydroResult.bmtM).toBeCloseTo(4 / 6, 3);
    expect(receipt.massClosureOk).toBe(true);
    expect(receipt.trimImbalanceAcceptable).toBe(true);
  });

  it('generates valid watertight CATAMARAN twin demi-hull geometry and hydrostatics', () => {
    const cat = generateParametricHull(
      boxBargeSpec({
        geometryId: 'GOLDEN-CAT-01',
        topology: 'CATAMARAN',
        sectionShape: 'WIGLEY_PARABOLIC',
        lwlM: 6.0,
        loaM: 6.2,
        hullBeamM: 0.7,
        demiHullCenterlineSpacingM: 1.8,
        depthM: 0.9,
        draftDesignM: 0.35,
        interfaces: []
      })
    );
    expect(cat.meshCheck.watertightManifold).toBe(true);
    expect(cat.principalDimensions.overallBeamM).toBeCloseTo(2.5, 5);
    expect(cat.offsetHull.stations[4].loops).toHaveLength(2);
  });

  it('invalidates geometry-to-physics receipts on geometry or load-case revision and rejects bad topologies or preview authority', () => {
    const s1 = boxBargeSpec({ revisionId: 'REV-1' });
    const a1 = generateParametricHull(s1);
    const load1 = { id: 'LC-1', massKg: 10250, kgM: 0.4, lcgM: 5.0, tcgM: 0 };
    const load2 = { id: 'LC-2', massKg: 12000, kgM: 0.45, lcgM: 5.1, tcgM: 0 };
    const receipt = coupleGeometryToHydrostatics(a1, load1, 1025);

    const a2 = generateParametricHull(boxBargeSpec({ revisionId: 'REV-2', hullBeamM: 2.2 }));
    expect(checkHandoffValidity(receipt, a2.geometrySha256, computeLoadCaseDigest(load1, 1025))).toEqual({
      valid: false,
      reason: 'STALE_GEOMETRY_REVISION: geometrySha256 changed since hydrostatics run'
    });
    expect(checkHandoffValidity(receipt, a1.geometrySha256, computeLoadCaseDigest(load2, 1025))).toEqual({
      valid: false,
      reason: 'STALE_LOAD_CASE: loadCaseSha256 changed since hydrostatics run'
    });

    // Reject overlapping catamaran hulls & draft >= depth & preview OBJ claims
    expect(() =>
      generateParametricHull(
        boxBargeSpec({ topology: 'CATAMARAN', hullBeamM: 1.5, demiHullCenterlineSpacingM: 1.2 })
      )
    ).toThrow(/demiHullCenterlineSpacingM/);
    expect(() => generateParametricHull(boxBargeSpec({ draftDesignM: 1.2, depthM: 1.0 }))).toThrow(/Design draft/);
    expect(() => rejectPreviewObjAsEngineeringAuthority('LOCAL_OBJ_PREVIEW')).toThrow(/Authoritative geometry rejected/);
  });
});
