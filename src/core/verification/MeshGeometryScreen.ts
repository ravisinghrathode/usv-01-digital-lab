/**
 * M04 deterministic mesh-closure geometry screen, NOT a hull/CAD authority.
 * Frame is right-handed ship BODY: X forward, Y starboard, Z down (not up).
 * Computes enclosed mathematical volume and centroid for oriented triangles;
 * NOT immersed displacement, center of buoyancy or intact stability.
 */
import {
  sha256 as canonicalSha256,
  type InputDigestChange,
  type Sha256
} from '../digital-thread/CandidateLedger.ts';

export type MeshTopology='MONOHULL'|'CATAMARAN'|'TRIMARAN';
export type Vertex=[number,number,number];
export type Triangle=[number,number,number];
export interface DraftHullMesh {
  schema:'usv01-draft-hull-mesh/v1';
  candidateId:string;revisionId:string;sourceCommitSha:string;
  topology:MeshTopology;
  provenance:'CAD_PREVIEW_UNVERIFIED'|'IMPORTED_UNVERIFIED_GEOMETRY';
  frame:{
    handedness:'RIGHT_HANDED';x:'FORWARD';y:'STARBOARD';z:'DOWN';
    unit:'m';originDescription:string;
  };
  vertices:Vertex[];
  triangles:Triangle[];
}
export interface MeshScreen {
  schema:'usv01-draft-mesh-screen/v1';
  candidateId:string;revisionId:string;sourceCommitSha:string;
  geometrySha256:string|null;
  /** Candidate/revision/source specific, separate from the geometry bytes. */
  manifestSha256:string|null;
  status:'CLOSED_ORIENTED_MATH_SCREEN_UNVERIFIED'|'BLOCKED_INVALID_GEOMETRY';
  failureCodes:string[];
  signedEnclosedVolumeM3:number|null;
  enclosedVolumeCentroidMeters:Vertex|null;
  triangleSurfaceAreaM2:number|null;
  geometricEnclosureMathChecked:boolean;
  selfIntersectionsChecked:false;
  measuredOffsetsAuthenticated:false;
  hydrostaticDisplacementM3:null;
  centerOfBuoyancyMeters:null;
  massCgValidated:false;
  independentGeometryApproved:false;
  engineeringReleaseApproved:false;
}
const FULL_SHA=/^[a-f0-9]{40}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/;
const vector=(v:unknown):v is Vertex=>
  Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='number'&&Number.isFinite(x));
const validTriangle=(t:unknown,n:number):t is Triangle=>
  Array.isArray(t)&&t.length===3&&t.every(i=>Number.isSafeInteger(i)&&i>=0&&i<n)&&
  new Set(t).size===3;
const sub=(a:Vertex,b:Vertex):Vertex=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:Vertex,b:Vertex):Vertex=>[
  a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],
  a[0]*b[1]-a[1]*b[0]
];
const dot=(a:Vertex,b:Vertex)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const length=(v:Vertex)=>Math.hypot(v[0],v[1],v[2]);
const validFrame=(f:DraftHullMesh['frame']):boolean=>
  Boolean(f&&f.handedness==='RIGHT_HANDED'&&f.x==='FORWARD'&&
    f.y==='STARBOARD'&&f.z==='DOWN'&&f.unit==='m'&&
    typeof f.originDescription==='string'&&f.originDescription.trim().length>5);
function baseScreen(mesh:DraftHullMesh,failures:string[],sha:string|null,
  manifestSha:string|null=null):MeshScreen {
  return {
    schema:'usv01-draft-mesh-screen/v1',
    candidateId:mesh?.candidateId||'INVALID',
    revisionId:mesh?.revisionId||'INVALID',
    sourceCommitSha:mesh?.sourceCommitSha||'INVALID',
    geometrySha256:sha,manifestSha256:manifestSha,
    status:'BLOCKED_INVALID_GEOMETRY',failureCodes:failures,
    signedEnclosedVolumeM3:null,enclosedVolumeCentroidMeters:null,
    triangleSurfaceAreaM2:null,geometricEnclosureMathChecked:false,
    selfIntersectionsChecked:false,measuredOffsetsAuthenticated:false,
    hydrostaticDisplacementM3:null,centerOfBuoyancyMeters:null,
    massCgValidated:false,independentGeometryApproved:false,
    engineeringReleaseApproved:false
  };
}
/** No auth/CFD/FEA calls and no default hull dimensions. */
export function screenDraftHullMesh(mesh:DraftHullMesh,expectedSourceSha:string):MeshScreen {
  const codes:string[]=[];
  if(!mesh||mesh.schema!=='usv01-draft-hull-mesh/v1'||
    !ID.test(mesh.candidateId)||!ID.test(mesh.revisionId))
    codes.push('INVALID_ID_OR_SCHEMA');
  if(!FULL_SHA.test(expectedSourceSha)||mesh?.sourceCommitSha!==expectedSourceSha)
    codes.push('STALE_OR_UNPINNED_SOURCE');
  if(!['MONOHULL','CATAMARAN','TRIMARAN'].includes(mesh?.topology))
    codes.push('UNKNOWN_TOPOLOGY');
  if(!['CAD_PREVIEW_UNVERIFIED','IMPORTED_UNVERIFIED_GEOMETRY'].includes(mesh?.provenance))
    codes.push('UNTRUSTED_PROVENANCE_LABEL');
  if(!validFrame(mesh?.frame))codes.push('INVALID_MARINE_COORDINATE_FRAME');
  if(!Array.isArray(mesh?.vertices)||mesh.vertices.length<4||mesh.vertices.length>100_000||
    !mesh.vertices.every(vector))codes.push('INVALID_MESH_VERTICES');
  if(!Array.isArray(mesh?.triangles)||mesh.triangles.length<4||
    mesh.triangles.length>200_000||
    !mesh.triangles.every(t=>validTriangle(t,mesh.vertices?.length||0)))
    codes.push('INVALID_TRIANGLE_INDEXING');
  if(codes.length)return baseScreen(mesh,codes,null);

  // Geometry identity is independent of candidate/revision/source metadata.
  // A distinct manifest hash binds that same geometry to its source owner.
  // The M03 canonical hasher sorts object keys but retains vertex/face order.
  const geometrySha256=canonicalSha256({
    schema:'usv01-mesh-geometry-digest/v1',topology:mesh.topology,
    frame:mesh.frame,vertices:mesh.vertices,triangles:mesh.triangles
  });
  const manifestSha256=canonicalSha256({
    schema:mesh.schema,candidateId:mesh.candidateId,
    revisionId:mesh.revisionId,sourceCommitSha:mesh.sourceCommitSha,
    provenance:mesh.provenance,geometrySha256
  });
  const edges=new Map<string,{count:number;orientation:number}>();
  let sixVolume=0;
  let twiceArea=0;
  const centroidNumerator:Vertex=[0,0,0];
  const bboxMin:Vertex=[Infinity,Infinity,Infinity];
  const bboxMax:Vertex=[-Infinity,-Infinity,-Infinity];
  for(const v of mesh.vertices)for(let k=0;k<3;k++){
    bboxMin[k]=Math.min(bboxMin[k],v[k]);
    bboxMax[k]=Math.max(bboxMax[k],v[k]);
  }
  const scale=Math.max(1e-6,length(sub(bboxMax,bboxMin)));
  const minDoubleFaceArea=scale*scale*1e-12;
  for(const [i,j,k] of mesh.triangles){
    const a=mesh.vertices[i],b=mesh.vertices[j],c=mesh.vertices[k];
    const n=cross(sub(b,a),sub(c,a));
    const doubleArea=length(n);
    if(!Number.isFinite(doubleArea)||doubleArea<=minDoubleFaceArea){
      codes.push('DEGENERATE_OR_NONFINITE_TRIANGLE');
      break;
    }
    twiceArea+=doubleArea;
    const vol6=dot(a,cross(b,c));
    sixVolume+=vol6;
    for(let d=0;d<3;d++)centroidNumerator[d]+=(a[d]+b[d]+c[d])*vol6;
    for(const [from,to] of [[i,j],[j,k],[k,i]]){
      const low=Math.min(from,to),high=Math.max(from,to);
      const key=low+':'+high;
      const previous=edges.get(key)||{count:0,orientation:0};
      previous.count++;
      previous.orientation+=from<to?1:-1;
      edges.set(key,previous);
    }
  }
  if([...edges.values()].some(e=>e.count!==2))
    codes.push('OPEN_OR_NONMANIFOLD_EDGE');
  if([...edges.values()].some(e=>e.orientation!==0))
    codes.push('INCONSISTENT_TRIANGLE_WINDING');
  const volume=sixVolume/6;
  const area=twiceArea/2;
  if(!Number.isFinite(volume)||volume<=scale*scale*scale*1e-12)
    codes.push('ZERO_NEGATIVE_OR_NONFINITE_SIGNED_VOLUME');
  if(!Number.isFinite(area)||area<=0)codes.push('INVALID_SURFACE_AREA');
  if(codes.length)return baseScreen(mesh,[...new Set(codes)],geometrySha256,manifestSha256);
  const centroid:Vertex=[
    centroidNumerator[0]/(24*volume),
    centroidNumerator[1]/(24*volume),
    centroidNumerator[2]/(24*volume)
  ];
  if(!centroid.every(Number.isFinite))
    return baseScreen(mesh,['NONFINITE_VOLUME_CENTROID'],geometrySha256,manifestSha256);
  return{
    ...baseScreen(mesh,[],geometrySha256,manifestSha256),
    status:'CLOSED_ORIENTED_MATH_SCREEN_UNVERIFIED',
    signedEnclosedVolumeM3:volume,enclosedVolumeCentroidMeters:centroid,
    triangleSurfaceAreaM2:area,geometricEnclosureMathChecked:true
  };
}

/**
 * A mathematical closure pass is sufficient only for an unverified draft
 * geometry *reference* in M03, not for a measured-geometry acceptance.
 * The M03 ledger will continue marking hydrostatics/structures/V&V BLOCKED.
 */
export function draftGeometryLedgerInput(
  screen:MeshScreen,expectedSourceSha:string
):InputDigestChange{
  if(!screen || screen.status!=='CLOSED_ORIENTED_MATH_SCREEN_UNVERIFIED' ||
    screen.sourceCommitSha!==expectedSourceSha || !FULL_SHA.test(expectedSourceSha) ||
    !screen.geometrySha256 || !/^sha256:[a-f0-9]{64}$/.test(screen.geometrySha256) ||
    !screen.manifestSha256 || !/^sha256:[a-f0-9]{64}$/.test(screen.manifestSha256) ||
    screen.independentGeometryApproved!==false || screen.engineeringReleaseApproved!==false ||
    screen.hydrostaticDisplacementM3!==null || screen.centerOfBuoyancyMeters!==null) {
    throw new Error('M04_UNVERIFIED_GEOMETRY_HANDOFF_BLOCKED');
  }
  return {domain:'GEOMETRY',digest:screen.geometrySha256 as Sha256};
}
