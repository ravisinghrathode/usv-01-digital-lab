/**
 * HYD-01 geometry-derived hydrostatics, for numerical screening and independent correlation.
 *
 * Coordinate convention: x forward from AP, y starboard from CL, z upwards from BL (m).
 * At each longitudinal station, each CCW/CW simple y-z polygon describes one CLOSED
 * external buoyant section. Disjoint loops permit multi-hulls; holes and internal flooding
 * are not supported. Longitudinal properties use trapezoidal station integration.
 *
 * This is NOT a certified hydrostatics solver. Offsets, topology, loading, free-surface
 * data, trim equilibrium, downflooding and independent GZ correlation require approval.
 */
export type OffsetPoint = readonly [number, number];

export interface HullStation {
  xM: number;
  /** Separate simple immersed-section envelopes in the transverse y-z plane. */
  loops: OffsetPoint[][];
}

export interface OffsetHull {
  geometryReference: string;
  geometryRevision: string;
  stations: HullStation[];
}

export interface HydroLoadCase {
  id: string;
  massKg: number;
  kgM: number;
  lcgM: number;
  tcgM: number;
  /** Free-surface mass moment [kg*m], divided by mass to obtain GM loss [m]; unknown is NOT assumed zero. */
  freeSurfaceMomentKgM?: number;
}

export interface HydroInput {
  hull: OffsetHull;
  load: HydroLoadCase;
  waterDensityKgM3: number;
  heelAnglesDeg?: number[];
}

interface SectionMoments {
  area: number;
  my: number;
  mz: number;
  width: number;
  ms: number;
  ms2: number;
}

export interface ImmersedProperties {
  displacedVolumeM3: number;
  centerBuoyancyXM: number;
  centerBuoyancyYM: number;
  centerBuoyancyZM: number;
  waterplaneAreaM2: number;
  lcfXM: number | null;
  waterplaneTransverseMomentM4: number | null;
  waterplaneLongitudinalMomentM4: number | null;
}

export interface OffsetHydroResult {
  status: 'GEOMETRY_DERIVED_UNVERIFIED';
  geometryReference: string;
  geometryRevision: string;
  loadCaseId: string;
  equilibriumDraftM: number;
  displacedVolumeM3: number;
  buoyantMassKg: number;
  displacementClosureErrorKg: number;
  kbM: number;
  lcbM: number;
  tcbM: number;
  waterplaneAreaM2: number;
  lcfM: number | null;
  bmtM: number | null;
  bmlM: number | null;
  kmtM: number | null;
  uncorrectedGmtM: number | null;
  freeSurfaceCorrectedGmtM: number | null;
  longitudinalImbalanceM: number;
  fixedTrimOnly: true;
  curve: {
    heelDeg: number;
    planeOffsetM: number;
    volumeM3: number;
    buoyancyYM: number;
    buoyancyZM: number;
    uncorrectedGzM: number;
    freeSurfaceCorrectedGzM: number | null;
  }[];
  engineeringComplianceValidated: false;
  acceptanceEvidenceStillRequired: string[];
}

const EPS = 1e-10;

function requireFinite(name: string, value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(name + ' must be a finite SI number');
  }
}

function signedPolygonArea(loop: OffsetPoint[]): number {
  let twiceArea = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    twiceArea += a[0] * b[1] - b[0] * a[1];
  }
  return twiceArea / 2;
}

function orientation(a: OffsetPoint, b: OffsetPoint, c: OffsetPoint): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(a: OffsetPoint, b: OffsetPoint, c: OffsetPoint): boolean {
  return Math.abs(orientation(a, b, c)) <= EPS &&
    c[0] >= Math.min(a[0], b[0]) - EPS && c[0] <= Math.max(a[0], b[0]) + EPS &&
    c[1] >= Math.min(a[1], b[1]) - EPS && c[1] <= Math.max(a[1], b[1]) + EPS;
}

function segmentsIntersect(a: OffsetPoint, b: OffsetPoint, c: OffsetPoint, d: OffsetPoint): boolean {
  const o1 = orientation(a, b, c), o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a), o4 = orientation(c, d, b);
  if (o1 * o2 < -EPS && o3 * o4 < -EPS) return true;
  return (Math.abs(o1) <= EPS && onSegment(a, b, c)) ||
    (Math.abs(o2) <= EPS && onSegment(a, b, d)) ||
    (Math.abs(o3) <= EPS && onSegment(c, d, a)) ||
    (Math.abs(o4) <= EPS && onSegment(c, d, b));
}

function pointInsidePolygon(p: OffsetPoint, loop: OffsetPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const a = loop[i], b = loop[j];
    if (onSegment(a, b, p)) return true;
    if ((a[1] > p[1]) !== (b[1] > p[1])) {
      const yAt = a[0] + (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]);
      if (p[0] < yAt) inside = !inside;
    }
  }
  return inside;
}

function verifyDisjointSimpleLoops(loops: OffsetPoint[][]): void {
  for (const loop of loops) {
    const n = loop.length;
    for (let i = 0; i < n; i++) {
      const a = loop[i], b = loop[(i + 1) % n];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) <= EPS) {
        throw new Error('Zero-length hull section edge');
      }
      for (let j = i + 1; j < n; j++) {
        if (j === i + 1 || (i === 0 && j === n - 1)) continue;
        if (segmentsIntersect(a, b, loop[j], loop[(j + 1) % n])) {
          throw new Error('Self-intersecting hull section polygon');
        }
      }
    }
  }
  for (let k = 0; k < loops.length; k++) {
    for (let m = k + 1; m < loops.length; m++) {
      const a = loops[k], b = loops[m];
      for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b.length; j++) {
          if (segmentsIntersect(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) {
            throw new Error('Overlapping or touching section loops are not supported');
          }
        }
      }
      if (pointInsidePolygon(a[0], b) || pointInsidePolygon(b[0], a)) {
        throw new Error('Nested section loops and holes are not supported');
      }
    }
  }
}

function validate(input: HydroInput): void {
  const { hull, load } = input;
  if (!hull?.geometryReference?.trim() || !hull.geometryRevision?.trim()) {
    throw new Error('Geometry source reference and revision are mandatory');
  }
  if (!load?.id?.trim()) throw new Error('Load case ID is required');
  for (const [name, value] of Object.entries({
    massKg: load.massKg, kgM: load.kgM, lcgM: load.lcgM,
    tcgM: load.tcgM, waterDensityKgM3: input.waterDensityKgM3
  })) requireFinite(name, value);
  if (load.massKg <= 0 || input.waterDensityKgM3 <= 0 || load.kgM < 0) {
    throw new Error('Mass and water density must be positive and KG must be nonnegative');
  }
  if (load.freeSurfaceMomentKgM !== undefined) {
    requireFinite('freeSurfaceMomentKgM', load.freeSurfaceMomentKgM);
    if (load.freeSurfaceMomentKgM < 0) throw new Error('Free-surface moment cannot be negative');
  }
  if (!Array.isArray(hull.stations) || hull.stations.length < 2) {
    throw new Error('Two or more hull offset stations are required');
  }
  const count = hull.stations[0].loops?.length;
  if (!count) throw new Error('At least one hull section loop is required');
  let lastX = -Infinity;
  for (const station of hull.stations) {
    requireFinite('station.xM', station.xM);
    if (station.xM <= lastX + EPS) throw new Error('Hull stations must have strictly increasing x');
    lastX = station.xM;
    if (!Array.isArray(station.loops) || station.loops.length !== count) {
      throw new Error('Every station must retain the same number of hull loops');
    }
    for (const loop of station.loops) {
      if (!Array.isArray(loop) || loop.length < 3) throw new Error('Section polygon requires >=3 vertices');
      for (const p of loop) {
        if (!Array.isArray(p) || p.length !== 2) throw new Error('Offset vertex must contain [y,z]');
        requireFinite('offset y', p[0]);
        requireFinite('offset z', p[1]);
      }
      if (Math.abs(signedPolygonArea(loop)) <= EPS) throw new Error('Degenerate hull section polygon');
    }
    verifyDisjointSimpleLoops(station.loops);
  }
  if (input.heelAnglesDeg) {
    if (!input.heelAnglesDeg.length) throw new Error('Heel-angle list cannot be empty');
    for (const angle of input.heelAnglesDeg) {
      requireFinite('heel angle', angle);
      if (angle < 0 || angle > 60) throw new Error('Heel screening limited to 0-60 degrees');
    }
  }
}

function clipPolygon(loop: OffsetPoint[], sin: number, cos: number, h: number): OffsetPoint[] {
  let output: OffsetPoint[] = [];
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    const fa = a[0] * sin + a[1] * cos - h;
    const fb = b[0] * sin + b[1] * cos - h;
    const aIn = fa <= 0, bIn = fb <= 0;
    if (aIn) output.push(a);
    if (aIn !== bIn) {
      const t = fa / (fa - fb);
      output.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return output;
}

function sectionMoments(station: HullStation, sin: number, cos: number, h: number): SectionMoments {
  const out: SectionMoments = { area: 0, my: 0, mz: 0, width: 0, ms: 0, ms2: 0 };
  for (const raw of station.loops) {
    const loop = signedPolygonArea(raw) > 0 ? raw : [...raw].reverse();
    const clipped = clipPolygon(loop, sin, cos, h);
    if (clipped.length >= 3) {
      let twiceArea = 0, sixMy = 0, sixMz = 0;
      for (let i = 0; i < clipped.length; i++) {
        const a = clipped[i], b = clipped[(i + 1) % clipped.length];
        const cross = a[0] * b[1] - b[0] * a[1];
        twiceArea += cross;
        sixMy += (a[0] + b[0]) * cross;
        sixMz += (a[1] + b[1]) * cross;
      }
      out.area += Math.max(0, twiceArea / 2);
      out.my += sixMy / 6;
      out.mz += sixMz / 6;
    }
    // Chords at the intersection between the section polygon and the horizontal
    // free surface. Pair sorted intersections to support concave sections.
    const intersections: number[] = [];
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      const fa = a[0] * sin + a[1] * cos - h;
      const fb = b[0] * sin + b[1] * cos - h;
      if ((fa <= 0 && fb > 0) || (fa > 0 && fb <= 0)) {
        const t = fa / (fa - fb);
        const y = a[0] + t * (b[0] - a[0]);
        const z = a[1] + t * (b[1] - a[1]);
        intersections.push(y * cos - z * sin);
      }
    }
    intersections.sort((a, b) => a - b);
    if (intersections.length % 2 !== 0) {
      throw new Error('Invalid section-waterplane intersection topology');
    }
    for (let i = 0; i < intersections.length; i += 2) {
      const a = intersections[i], b = intersections[i + 1];
      out.width += b - a;
      out.ms += (b * b - a * a) / 2;
      out.ms2 += (b * b * b - a * a * a) / 3;
    }
  }
  return out;
}

function integrate(input: HydroInput, heelRad: number, planeOffsetM: number): ImmersedProperties {
  const sin = Math.sin(heelRad), cos = Math.cos(heelRad);
  const sections = input.hull.stations.map(s => sectionMoments(s, sin, cos, planeOffsetM));
  let volume = 0, mx = 0, my = 0, mz = 0;
  let awp = 0, mXwp = 0, mX2wp = 0, mSwp = 0, mS2wp = 0;
  for (let i = 1; i < sections.length; i++) {
    const a = sections[i - 1], b = sections[i];
    const x0 = input.hull.stations[i - 1].xM, x1 = input.hull.stations[i].xM;
    const dx = x1 - x0;
    volume += dx * (a.area + b.area) / 2;
    mx += dx * ((2 * x0 + x1) * a.area + (x0 + 2 * x1) * b.area) / 6;
    my += dx * (a.my + b.my) / 2;
    mz += dx * (a.mz + b.mz) / 2;
    awp += dx * (a.width + b.width) / 2;
    mXwp += dx * ((2 * x0 + x1) * a.width + (x0 + 2 * x1) * b.width) / 6;
    mX2wp += dx * (x0 * x0 * (a.width + b.width) / 2 +
      2 * x0 * dx * (a.width / 6 + b.width / 3) +
      dx * dx * (a.width / 12 + b.width / 4));
    mSwp += dx * (a.ms + b.ms) / 2;
    mS2wp += dx * (a.ms2 + b.ms2) / 2;
  }
  const transverseI = awp > EPS ? Math.max(0, mS2wp - mSwp ** 2 / awp) : null;
  const longitudinalI = awp > EPS ? Math.max(0, mX2wp - mXwp ** 2 / awp) : null;
  return {
    displacedVolumeM3: volume,
    centerBuoyancyXM: volume > EPS ? mx / volume : 0,
    centerBuoyancyYM: volume > EPS ? my / volume : 0,
    centerBuoyancyZM: volume > EPS ? mz / volume : 0,
    waterplaneAreaM2: awp,
    lcfXM: awp > EPS ? mXwp / awp : null,
    waterplaneTransverseMomentM4: transverseI,
    waterplaneLongitudinalMomentM4: longitudinalI
  };
}

function equilibrium(input: HydroInput, heelRad: number): { h: number; hydro: ImmersedProperties } {
  const sin = Math.sin(heelRad), cos = Math.cos(heelRad);
  const hs = input.hull.stations.flatMap(s =>
    s.loops.flatMap(loop => loop.map(v => v[0] * sin + v[1] * cos)));
  let lo = Math.min(...hs), hi = Math.max(...hs);
  const target = input.load.massKg / input.waterDensityKgM3;
  const capacity = integrate(input, heelRad, hi + 1).displacedVolumeM3;
  if (target >= capacity - Math.max(EPS, capacity * 1e-8)) {
    throw new Error('Load case exhausts closed-hull submerged geometric volume');
  }
  for (let i = 0; i < 75; i++) {
    const mid = (lo + hi) / 2;
    if (integrate(input, heelRad, mid).displacedVolumeM3 < target) lo = mid;
    else hi = mid;
  }
  const h = (lo + hi) / 2;
  return { h, hydro: integrate(input, heelRad, h) };
}

export function calculateOffsetHydrostatics(input: HydroInput): OffsetHydroResult {
  validate(input);
  const base = equilibrium(input, 0);
  const { hydro, h } = base;
  const volume = hydro.displacedVolumeM3;
  const bm = hydro.waterplaneTransverseMomentM4 === null ? null :
    hydro.waterplaneTransverseMomentM4 / volume;
  const bml = hydro.waterplaneLongitudinalMomentM4 === null ? null :
    hydro.waterplaneLongitudinalMomentM4 / volume;
  const fs = input.load.freeSurfaceMomentKgM === undefined ? null :
    input.load.freeSurfaceMomentKgM / input.load.massKg;
  const uncorrectedGM = bm === null ? null :
    hydro.centerBuoyancyZM + bm - input.load.kgM;
  const angles = input.heelAnglesDeg ?? Array.from({ length: 13 }, (_, i) => i * 5);
  const curve = angles.map(deg => {
    const rad = deg * Math.PI / 180;
    const { h: plane, hydro: immersed } = equilibrium(input, rad);
    const uncorrectedGz =
      (input.load.tcgM - immersed.centerBuoyancyYM) * Math.cos(rad) -
      (input.load.kgM - immersed.centerBuoyancyZM) * Math.sin(rad);
    return {
      heelDeg: deg,
      planeOffsetM: plane,
      volumeM3: immersed.displacedVolumeM3,
      buoyancyYM: immersed.centerBuoyancyYM,
      buoyancyZM: immersed.centerBuoyancyZM,
      uncorrectedGzM: uncorrectedGz,
      freeSurfaceCorrectedGzM: fs === null ? null : uncorrectedGz - fs * Math.sin(rad)
    };
  });
  return {
    status: 'GEOMETRY_DERIVED_UNVERIFIED',
    geometryReference: input.hull.geometryReference,
    geometryRevision: input.hull.geometryRevision,
    loadCaseId: input.load.id,
    equilibriumDraftM: h,
    displacedVolumeM3: volume,
    buoyantMassKg: volume * input.waterDensityKgM3,
    displacementClosureErrorKg: volume * input.waterDensityKgM3 - input.load.massKg,
    kbM: hydro.centerBuoyancyZM,
    lcbM: hydro.centerBuoyancyXM,
    tcbM: hydro.centerBuoyancyYM,
    waterplaneAreaM2: hydro.waterplaneAreaM2,
    lcfM: hydro.lcfXM,
    bmtM: bm,
    bmlM: bml,
    kmtM: bm === null ? null : hydro.centerBuoyancyZM + bm,
    uncorrectedGmtM: uncorrectedGM,
    freeSurfaceCorrectedGmtM: fs === null || uncorrectedGM === null ? null : uncorrectedGM - fs,
    longitudinalImbalanceM: input.load.lcgM - hydro.centerBuoyancyXM,
    fixedTrimOnly: true,
    curve,
    engineeringComplianceValidated: false,
    acceptanceEvidenceStillRequired: [
      'Approved, revision-controlled hull offsets with topology and station-convergence checks',
      'Verified full-load mass ledger, LCG, TCG, KG and free-surface moments',
      'Coupled heave/trim/heel equilibrium, downflooding and all load cases',
      'Independent hydrostatic-table and GZ benchmark comparison with uncertainty',
      'Qualified naval architect review and Director release sign-off'
    ]
  };
}
