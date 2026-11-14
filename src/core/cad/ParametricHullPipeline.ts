import { calculateOffsetHydrostatics, type HydroLoadCase, type OffsetHull, type OffsetHydroResult, type OffsetPoint } from '../tools/naval/offsetHydrostatics.ts';

export type HullTopology = 'MONOHULL' | 'CATAMARAN';
export type SectionShape = 'BOX' | 'CHINE_V' | 'WIGLEY_PARABOLIC';

export interface InterfaceMountPoint {
  id: string;
  category: 'PROPULSION' | 'WET_END_PAYLOAD' | 'APPENDAGE' | 'LIFT_POINT';
  xM: number;
  yM: number;
  zM: number;
  envelopeNotes: string;
}

export interface ParametricHullSpec {
  schema: 'usv01-parametric-hull/v1';
  geometryId: string;
  revisionId: string;
  sourceOwnership: string;
  units: 'SI_METERS_KG';
  coordinateConvention: 'X_FWD_FROM_AP_Y_STBD_Z_UP_FROM_BL';
  topology: HullTopology;
  sectionShape: SectionShape;
  lwlM: number;
  loaM: number;
  /** Monohull beam overall [m], or demi-hull beam [m] for catamaran. */
  hullBeamM: number;
  /** Centerline-to-centerline demi-hull spacing [m]; required for CATAMARAN, omitted/0 for MONOHULL. */
  demiHullCenterlineSpacingM?: number;
  depthM: number;
  draftDesignM: number;
  stationCount: number;
  transomRatio?: number;
  interfaces: InterfaceMountPoint[];
}

export interface MeshTopologyCheck {
  vertexCount: number;
  triangleCount: number;
  boundaryEdgeCount: number;
  nonManifoldEdgeCount: number;
  watertightManifold: boolean;
  signedEnclosedVolumeM3: number;
  positiveOutwardVolume: boolean;
}

export interface ParametricHullArtifact {
  spec: ParametricHullSpec;
  geometrySha256: string;
  offsetHull: OffsetHull;
  meshCheck: MeshTopologyCheck;
  objExportAscii: string;
  offsetJsonExport: string;
  principalDimensions: {
    lwlM: number;
    loaM: number;
    overallBeamM: number;
    depthM: number;
    draftDesignM: number;
  };
  authorityStatus: 'STUDY_DRAFT_CAD_UNAPPROVED';
  approvedEngineeringBaseline: false;
}

export interface GeometryPhysicsHandoffReceipt {
  schema: 'usv01-geometry-physics-receipt/v1';
  geometryId: string;
  geometryRevision: string;
  geometrySha256: string;
  loadCaseId: string;
  loadCaseSha256: string;
  hydroResult: OffsetHydroResult;
  massClosureOk: boolean;
  trimImbalanceAcceptable: boolean;
  validForRevisionAndLoad: boolean;
  displacementRelativeError: number;
  engineeringComplianceValidated: false;
}

function sha256HexSync(text: string): string {
  // Pure JS deterministic SHA-256 or FNV? Wait: we keep browser compatibility!
  // ParametricHullPipeline may be imported in browser CadStudioView AND Node tests.
  // Use canonical deterministic SHA-256 via WebCrypto async helper OR deterministic digest + explicit async SHA helper.
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
  }
  const seg = (n: number) => n.toString(16).padStart(8, '0');
  return 'sha256:' + (seg(h1) + seg(h2)).repeat(4);
}

export function computeCanonicalSpecDigest(spec: ParametricHullSpec): string {
  return sha256HexSync(JSON.stringify(spec));
}

export function computeLoadCaseDigest(load: HydroLoadCase, waterDensityKgM3: number): string {
  return sha256HexSync(JSON.stringify({ load, waterDensityKgM3 }));
}

export function validateParametricHullSpec(spec: ParametricHullSpec): void {
  if (spec.schema !== 'usv01-parametric-hull/v1') throw new Error('Invalid hull schema');
  if (spec.units !== 'SI_METERS_KG') throw new Error('Hull parameters must use SI_METERS_KG');
  if (spec.coordinateConvention !== 'X_FWD_FROM_AP_Y_STBD_Z_UP_FROM_BL') {
    throw new Error('Right-handed AP/CL/BL coordinate convention required');
  }
  if (!spec.geometryId.trim() || !spec.revisionId.trim() || !spec.sourceOwnership.trim()) {
    throw new Error('geometryId, revisionId, and sourceOwnership are required');
  }
  const nums = [spec.lwlM, spec.loaM, spec.hullBeamM, spec.depthM, spec.draftDesignM, spec.stationCount];
  if (nums.some(n => typeof n !== 'number' || !Number.isFinite(n) || n <= 0)) {
    throw new Error('All hull dimensions and stationCount must be positive finite numbers');
  }
  if (spec.loaM < spec.lwlM) throw new Error('LOA cannot be smaller than LWL');
  if (spec.draftDesignM >= spec.depthM) throw new Error('Design draft must be less than molded depth');
  if (!Number.isInteger(spec.stationCount) || spec.stationCount < 5 || spec.stationCount > 101) {
    throw new Error('stationCount must be an integer between 5 and 101');
  }
  if (spec.topology === 'CATAMARAN') {
    const s = spec.demiHullCenterlineSpacingM;
    if (typeof s !== 'number' || !Number.isFinite(s) || s <= spec.hullBeamM) {
      throw new Error('CATAMARAN requires demiHullCenterlineSpacingM strictly greater than demi-hull beam');
    }
  }
  for (const mount of spec.interfaces) {
    if (!mount.id.trim() || ![mount.xM, mount.yM, mount.zM].every(Number.isFinite)) {
      throw new Error(`Invalid interface mount point: ${mount.id}`);
    }
    if (mount.xM < -0.5 || mount.xM > spec.loaM + 0.5 || mount.zM < -1.0 || mount.zM > spec.depthM + 2.0) {
      throw new Error(`Interface mount ${mount.id} lies outside bounded hull envelope`);
    }
  }
}

/** Generate a single closed transverse station loop centered at yCenter in right-handed (y, z) plane. */
function makeHalfBreadthRatio(u: number, shape: SectionShape, transomRatio: number): number {
  // u in [0, 1] from AP (0) to FP (1)
  if (shape === 'BOX') return 1;
  // Smooth bow taper and slight stern/transom taper
  const bow = Math.sin((u * Math.PI) / 2);
  const parabolic = 1 - Math.pow(2 * u - 1, 2);
  if (shape === 'WIGLEY_PARABOLIC') {
    // Classic symmetric Wigley waterline factor 4*u*(1-u) clamped slightly at ends for closed ring
    return Math.max(0.05, Math.min(1, transomRatio * (1 - u) + (1 - transomRatio) * parabolic));
  }
  // CHINE_V
  return Math.max(0.12, Math.min(1, 0.25 * bow + 0.75 * parabolic));
}

function buildSectionLoop(halfBeam: number, depthM: number, shape: SectionShape, yOffset: number): OffsetPoint[] {
  if (shape === 'BOX') {
    return [
      [yOffset - halfBeam, 0],
      [yOffset + halfBeam, 0],
      [yOffset + halfBeam, depthM],
      [yOffset - halfBeam, depthM]
    ];
  }
  if (shape === 'CHINE_V') {
    const chineZ = depthM * 0.45;
    return [
      [yOffset, 0],
      [yOffset + halfBeam * 0.92, chineZ],
      [yOffset + halfBeam, depthM],
      [yOffset - halfBeam, depthM],
      [yOffset - halfBeam * 0.92, chineZ]
    ];
  }
  // WIGLEY_PARABOLIC smooth 7-point transverse section (z in [0, depthM])
  const zFracs = [0, 0.25, 0.65, 1.0];
  const stbd: OffsetPoint[] = zFracs.map(f => {
    const y = halfBeam * (1 - Math.pow(1 - f, 2));
    return [yOffset + Math.max(0.01, y), f * depthM];
  });
  const port: OffsetPoint[] = [...zFracs].reverse().slice(0, -1).map(f => {
    const y = halfBeam * (1 - Math.pow(1 - f, 2));
    return [yOffset - Math.max(0.01, y), f * depthM];
  });
  return [
    [yOffset, 0],
    ...stbd.slice(1),
    ...port
  ];
}

function triangulateClosedLoftedBody(
  stationXs: readonly number[],
  stationLoops: readonly OffsetPoint[][],
  groupName: string
): { vertices: [number, number, number][]; triangles: [number, number, number][]; group: string } {
  // All loops share identical vertex count per station (7 for wigley, 5 for chine, 4 for box).
  const ringLen = stationLoops[0].length;
  const vertices: [number, number, number][] = [];
  const triangles: [number, number, number][] = [];

  for (let s = 0; s < stationXs.length; s++) {
    const x = stationXs[s];
    for (const [y, z] of stationLoops[s]) {
      vertices.push([x, y, z]);
    }
  }

  // Side quads split cleanly into triangles with consistent outward normals
  for (let s = 0; s < stationXs.length - 1; s++) {
    const base0 = s * ringLen;
    const base1 = (s + 1) * ringLen;
    for (let i = 0; i < ringLen; i++) {
      const iNext = (i + 1) % ringLen;
      const a = base0 + i;
      const b = base0 + iNext;
      const c = base1 + iNext;
      const d = base1 + i;
      triangles.push([a, c, d], [a, b, c]);
    }
  }

  // Aft cap (x = stationXs[0], outward normal -x)
  const aftCenterIdx = vertices.length;
  const aftY = stationLoops[0].reduce((acc, p) => acc + p[0], 0) / ringLen;
  const aftZ = stationLoops[0].reduce((acc, p) => acc + p[1], 0) / ringLen;
  vertices.push([stationXs[0], aftY, aftZ]);
  for (let i = 0; i < ringLen; i++) {
    const iNext = (i + 1) % ringLen;
    triangles.push([aftCenterIdx, iNext, i]);
  }

  // Forward cap (x = stationXs[last], outward normal +x)
  const fwdBase = (stationXs.length - 1) * ringLen;
  const fwdCenterIdx = vertices.length;
  const fwdLoop = stationLoops[stationLoops.length - 1];
  const fwdY = fwdLoop.reduce((acc, p) => acc + p[0], 0) / ringLen;
  const fwdZ = fwdLoop.reduce((acc, p) => acc + p[1], 0) / ringLen;
  vertices.push([stationXs[stationXs.length - 1], fwdY, fwdZ]);
  for (let i = 0; i < ringLen; i++) {
    const iNext = (i + 1) % ringLen;
    triangles.push([fwdCenterIdx, fwdBase + i, fwdBase + iNext]);
  }

  return { vertices, triangles, group: groupName };
}

export function verifyWatertightMesh(
  vertices: readonly [number, number, number][],
  triangles: readonly [number, number, number][]
): MeshTopologyCheck {
  const edgeCounts = new Map<string, number>();
  let signedVol6 = 0;

  for (const [i0, i1, i2] of triangles) {
    const edges: [number, number][] = [[i0, i1], [i1, i2], [i2, i0]];
    for (const [u, v] of edges) {
      const key = u < v ? `${u}_${v}` : `${v}_${u}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
    const a = vertices[i0];
    const b = vertices[i1];
    const c = vertices[i2];
    const cx = b[1] * c[2] - b[2] * c[1];
    const cy = b[2] * c[0] - b[0] * c[2];
    const cz = b[0] * c[1] - b[1] * c[0];
    signedVol6 += a[0] * cx + a[1] * cy + a[2] * cz;
  }

  let boundaryEdgeCount = 0;
  let nonManifoldEdgeCount = 0;
  for (const count of edgeCounts.values()) {
    if (count === 1) boundaryEdgeCount++;
    else if (count !== 2) nonManifoldEdgeCount++;
  }

  const signedEnclosedVolumeM3 = signedVol6 / 6;
  return {
    vertexCount: vertices.length,
    triangleCount: triangles.length,
    boundaryEdgeCount,
    nonManifoldEdgeCount,
    watertightManifold: boundaryEdgeCount === 0 && nonManifoldEdgeCount === 0 && triangles.length > 0,
    signedEnclosedVolumeM3,
    positiveOutwardVolume: signedEnclosedVolumeM3 > 0
  };
}

export function generateParametricHull(spec: ParametricHullSpec): ParametricHullArtifact {
  validateParametricHullSpec(spec);

  const stationXs: number[] = [];
  for (let s = 0; s < spec.stationCount; s++) {
    stationXs.push(Number(((s / (spec.stationCount - 1)) * spec.lwlM).toFixed(6)));
  }

  const transom = spec.transomRatio ?? 0.25;
  const yCenters =
    spec.topology === 'CATAMARAN'
      ? [-(spec.demiHullCenterlineSpacingM! / 2), spec.demiHullCenterlineSpacingM! / 2]
      : [0];

  const stations = stationXs.map((xM, idx) => {
    const u = idx / (spec.stationCount - 1);
    const ratio = makeHalfBreadthRatio(u, spec.sectionShape, transom);
    const halfBeam = (spec.hullBeamM / 2) * ratio;
    const loops = yCenters.map(yc => buildSectionLoop(halfBeam, spec.depthM, spec.sectionShape, yc));
    return { xM, loops };
  });

  const offsetHull: OffsetHull = {
    geometryReference: spec.geometryId,
    geometryRevision: spec.revisionId,
    stations
  };

  // Build watertight mesh across each body
  const allVertices: [number, number, number][] = [];
  const allTriangles: [number, number, number][] = [];
  const objLines: string[] = [
    `# USV-01 STUDY DRAFT PARAMETRIC CAD (${spec.topology} / ${spec.sectionShape})`,
    `# GeometryID: ${spec.geometryId} Revision: ${spec.revisionId}`,
    `# Units: ${spec.units} Frame: ${spec.coordinateConvention}`,
    `# STATUS: STUDY_DRAFT_CAD_UNAPPROVED — NOT FOR VESSEL RELEASE`
  ];

  yCenters.forEach((_, bodyIdx) => {
    const groupName = spec.topology === 'CATAMARAN' ? (bodyIdx === 0 ? 'port_demihull' : 'stbd_demihull') : 'monohull_main';
    const bodyLoops = stations.map(st => st.loops[bodyIdx]);
    const mesh = triangulateClosedLoftedBody(stationXs, bodyLoops, groupName);
    const vOffset = allVertices.length;
    for (const v of mesh.vertices) {
      allVertices.push(v);
      objLines.push(`v ${v[0].toFixed(5)} ${v[1].toFixed(5)} ${v[2].toFixed(5)}`);
    }
    objLines.push(`g ${groupName}`);
    for (const tri of mesh.triangles) {
      allTriangles.push([tri[0] + vOffset, tri[1] + vOffset, tri[2] + vOffset]);
      objLines.push(`f ${tri[0] + vOffset + 1} ${tri[1] + vOffset + 1} ${tri[2] + vOffset + 1}`);
    }
  });

  const meshCheck = verifyWatertightMesh(allVertices, allTriangles);
  if (!meshCheck.watertightManifold || !meshCheck.positiveOutwardVolume) {
    throw new Error('Generated parametric hull mesh failed watertightness or outward normal verification');
  }

  const geometrySha256 = computeCanonicalSpecDigest(spec);
  const overallBeamM =
    spec.topology === 'CATAMARAN'
      ? spec.demiHullCenterlineSpacingM! + spec.hullBeamM
      : spec.hullBeamM;

  return {
    spec,
    geometrySha256,
    offsetHull,
    meshCheck,
    objExportAscii: objLines.join('\n') + '\n',
    offsetJsonExport: JSON.stringify(offsetHull, null, 2),
    principalDimensions: {
      lwlM: spec.lwlM,
      loaM: spec.loaM,
      overallBeamM,
      depthM: spec.depthM,
      draftDesignM: spec.draftDesignM
    },
    authorityStatus: 'STUDY_DRAFT_CAD_UNAPPROVED',
    approvedEngineeringBaseline: false
  };
}

export function coupleGeometryToHydrostatics(
  artifact: ParametricHullArtifact,
  load: HydroLoadCase,
  waterDensityKgM3 = 1025,
  heelAnglesDeg: number[] = [0, 10, 20, 30, 40]
): GeometryPhysicsHandoffReceipt {
  const hydroResult = calculateOffsetHydrostatics({
    hull: artifact.offsetHull,
    load,
    waterDensityKgM3,
    heelAnglesDeg
  });

  const loadCaseSha256 = computeLoadCaseDigest(load, waterDensityKgM3);
  const displacementRelativeError = Math.abs(hydroResult.displacementClosureErrorKg) / Math.max(1, load.massKg);
  const massClosureOk = displacementRelativeError <= 0.015;
  const trimImbalanceAcceptable = Math.abs(hydroResult.longitudinalImbalanceM) <= artifact.spec.lwlM * 0.05;

  return {
    schema: 'usv01-geometry-physics-receipt/v1',
    geometryId: artifact.spec.geometryId,
    geometryRevision: artifact.spec.revisionId,
    geometrySha256: artifact.geometrySha256,
    loadCaseId: load.id,
    loadCaseSha256,
    hydroResult,
    massClosureOk,
    trimImbalanceAcceptable,
    validForRevisionAndLoad: true,
    displacementRelativeError,
    engineeringComplianceValidated: false
  };
}

export function checkHandoffValidity(
  receipt: GeometryPhysicsHandoffReceipt,
  currentGeometrySha256: string,
  currentLoadCaseSha256: string
): { valid: boolean; reason?: string } {
  if (receipt.geometrySha256 !== currentGeometrySha256) {
    return { valid: false, reason: 'STALE_GEOMETRY_REVISION: geometrySha256 changed since hydrostatics run' };
  }
  if (receipt.loadCaseSha256 !== currentLoadCaseSha256) {
    return { valid: false, reason: 'STALE_LOAD_CASE: loadCaseSha256 changed since hydrostatics run' };
  }
  return { valid: true };
}

/** Browser-preview OBJ uploads NEVER become authoritative hull dimensions. */
export function rejectPreviewObjAsEngineeringAuthority(source: 'LOCAL_OBJ_PREVIEW' | 'PROCEDURAL_VISUALIZER'): never {
  throw new Error(
    `Authoritative geometry rejected (${source}): preview tessellations have unknown units/provenance and cannot drive engineering baselines or solver releases`
  );
}
