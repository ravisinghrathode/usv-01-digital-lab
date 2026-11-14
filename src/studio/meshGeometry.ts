/**
 * Bounded, local-only Wavefront OBJ inspection parser.
 * This renders the file's tessellated geometry; it is NOT a parametric CAD kernel,
 * engineering truth, or an authoritative configuration store.
 */
export const MAX_OBJ_BYTES = 8 * 1024 * 1024;
export const MAX_VERTICES = 30000;
export const MAX_TRIANGLES = 50000;
export type Vector3 = readonly [number, number, number];
export interface MeshTriangle { corners: readonly [number, number, number]; group: string }
export interface MeshBounds { min: Vector3; max: Vector3 }
export interface MeshGeometry {
  vertices: Vector3[];
  triangles: MeshTriangle[];
  groups: string[];
  bounds: MeshBounds;
}

export function parseObjMesh(raw: string): MeshGeometry {
  if (new TextEncoder().encode(raw).byteLength > MAX_OBJ_BYTES) {
    throw new Error('Mesh exceeds the 8 MiB local inspection limit');
  }
  const vertices: Vector3[] = [];
  const triangles: MeshTriangle[] = [];
  const groups = new Set<string>();
  let group = 'Unnamed mesh';
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const line of raw.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) continue;
    const fields = clean.split(/\s+/);
    const kind = fields.shift();
    if (kind === 'o' || kind === 'g') {
      group = (fields.join(' ') || 'Unnamed mesh').slice(0, 100);
      continue;
    }
    if (kind === 'v') {
      if (fields.length < 3) throw new Error('Malformed OBJ vertex');
      const coords = fields.slice(0, 3).map(Number);
      if (coords.some(n => !Number.isFinite(n))) throw new Error('OBJ contains invalid coordinates');
      if (vertices.length >= MAX_VERTICES) throw new Error('OBJ vertex count exceeds inspection limit');
      const point = coords as unknown as Vector3;
      vertices.push(point);
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], point[i]);
        max[i] = Math.max(max[i], point[i]);
      }
    }
    if (kind === 'f') {
      if (fields.length < 3 || fields.length > 128) throw new Error('Unsupported OBJ polygon');
      const indices = fields.map(field => {
        const token = field.split('/')[0];
        if (!/^-?\d+$/.test(token)) throw new Error('Invalid OBJ face index');
        const value = Number(token);
        const index = value < 0 ? vertices.length + value : value - 1;
        if (value === 0 || index < 0 || index >= vertices.length) throw new Error('OBJ face points to missing vertex');
        return index;
      });
      groups.add(group);
      for (let i = 1; i < indices.length - 1; i++) {
        if (triangles.length >= MAX_TRIANGLES) throw new Error('OBJ triangle count exceeds inspection limit');
        triangles.push({ corners: [indices[0], indices[i], indices[i + 1]], group });
      }
    }
  }
  if (!vertices.length || !triangles.length) throw new Error('OBJ has no renderable triangle geometry');
  return { vertices, triangles, groups: [...groups], bounds: { min: min as unknown as Vector3, max: max as unknown as Vector3 } };
}

export interface PreviewComparison {
  vertexDelta: number;
  triangleDelta: number;
  aGroups: number;
  bGroups: number;
  comparableDimensions: boolean;
}
/** Geometry topology differences only. OBJ has no reliable physical unit or mass. */
export function compareMeshPreviews(a: MeshGeometry, b: MeshGeometry): PreviewComparison {
  return {
    vertexDelta: b.vertices.length - a.vertices.length,
    triangleDelta: b.triangles.length - a.triangles.length,
    aGroups: a.groups.length, bGroups: b.groups.length, comparableDimensions: false
  };
}
