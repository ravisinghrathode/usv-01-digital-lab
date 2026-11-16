import {describe,it,expect} from 'vitest';
import {screenDraftHullMesh,draftGeometryLedgerInput,
  type DraftHullMesh,type Vertex} from '../src/core/verification/MeshGeometryScreen.ts';
import {CandidateLedger} from '../src/core/digital-thread/CandidateLedger.ts';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const sha='a'.repeat(40);
const points:Vertex[]=[
 [0,0,0],[1,0,0],[1,1,0],[0,1,0],
 [0,0,1],[1,0,1],[1,1,1],[0,1,1]
];
const faces:[number,number,number][]=[
 [0,2,1],[0,3,2], [4,5,6],[4,6,7],
 [0,1,5],[0,5,4], [1,2,6],[1,6,5],
 [2,3,7],[2,7,6], [3,0,4],[3,4,7]
];
function cube():DraftHullMesh{return {
 schema:'usv01-draft-hull-mesh/v1',candidateId:'CAND-TEST-01',
 revisionId:'REV-001',sourceCommitSha:sha,topology:'MONOHULL',
 provenance:'CAD_PREVIEW_UNVERIFIED',
 frame:{handedness:'RIGHT_HANDED',x:'FORWARD',y:'STARBOARD',z:'DOWN',
 unit:'m',originDescription:'Synthetic cube origin'},
 vertices:points.map(v=>[...v] as Vertex),
 triangles:faces.map(t=>[...t] as [number,number,number])
};}
describe('M04 geometric math screen does not establish hull authority',()=>{
 it('computes independent unit-cube closed surface volume, area and centroid',()=>{
  const r=screenDraftHullMesh(cube(),sha);
  expect(r.status).toBe('CLOSED_ORIENTED_MATH_SCREEN_UNVERIFIED');
  expect(r.signedEnclosedVolumeM3).toBeCloseTo(1,10);
  expect(r.triangleSurfaceAreaM2).toBeCloseTo(6,10);
  expect(r.enclosedVolumeCentroidMeters).toEqual([.5,.5,.5]);
  expect(r.geometrySha256).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(r.manifestSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(r.hydrostaticDisplacementM3).toBeNull();
  expect(r.centerOfBuoyancyMeters).toBeNull();
  expect(r.measuredOffsetsAuthenticated).toBe(false);
  expect(r.selfIntersectionsChecked).toBe(false);
  expect(r.engineeringReleaseApproved).toBe(false);
 });
 it('is invariant to translation for volume and area, but hash/centroid change',()=>{
  const original=screenDraftHullMesh(cube(),sha);
  const moved=cube();
  moved.vertices=moved.vertices.map(p=>[p[0]+3,p[1]-4,p[2]+2]);
  const r=screenDraftHullMesh(moved,sha);
  expect(r.status).toBe('CLOSED_ORIENTED_MATH_SCREEN_UNVERIFIED');
  expect(r.signedEnclosedVolumeM3).toBeCloseTo(1,10);
  expect(r.triangleSurfaceAreaM2).toBeCloseTo(6,10);
  expect(r.enclosedVolumeCentroidMeters?.[0]).toBeCloseTo(3.5,10);
  expect(r.enclosedVolumeCentroidMeters?.[1]).toBeCloseTo(-3.5,10);
  expect(r.enclosedVolumeCentroidMeters?.[2]).toBeCloseTo(2.5,10);
  expect(r.geometrySha256).not.toEqual(original.geometrySha256);
 });
 it('preserves geometric identity across metadata-only revisions but changes manifest digest',()=>{
  const original=cube();
  const later=cube();
  later.revisionId='REV-002';
  const a=screenDraftHullMesh(original,sha);
  const b=screenDraftHullMesh(later,sha);
  expect(a.geometrySha256).toBe(b.geometrySha256);
  expect(a.manifestSha256).not.toBe(b.manifestSha256);
  const reordered={
    vertices:original.vertices,triangles:original.triangles,
    frame:original.frame,topology:original.topology,
    provenance:original.provenance,sourceCommitSha:original.sourceCommitSha,
    candidateId:original.candidateId,revisionId:original.revisionId,
    schema:original.schema
  } as DraftHullMesh;
  const c=screenDraftHullMesh(reordered,sha);
  expect(c.geometrySha256).toBe(a.geometrySha256);
  expect(c.manifestSha256).toBe(a.manifestSha256);
 });
 it('rejects missing faces, inconsistent winding, inverted volume and degenerate facets',()=>{
  const open=cube();open.triangles.pop();
  expect(screenDraftHullMesh(open,sha).failureCodes).toContain('OPEN_OR_NONMANIFOLD_EDGE');
  const winding=cube();winding.triangles[0]=[0,1,2];
  expect(screenDraftHullMesh(winding,sha).failureCodes).toContain('INCONSISTENT_TRIANGLE_WINDING');
  const reversed=cube();reversed.triangles=reversed.triangles.map(([a,b,c])=>[a,c,b]);
  expect(screenDraftHullMesh(reversed,sha).failureCodes).toContain('ZERO_NEGATIVE_OR_NONFINITE_SIGNED_VOLUME');
  const degenerate=cube();degenerate.vertices[1]=[0,0,0];
  expect(screenDraftHullMesh(degenerate,sha).failureCodes).toContain('DEGENERATE_OR_NONFINITE_TRIANGLE');
 });
 it('rejects unpinned source, nonmarine frame, invalid indices, NaN and false origins',()=>{
  expect(screenDraftHullMesh(cube(),'b'.repeat(40)).failureCodes)
    .toContain('STALE_OR_UNPINNED_SOURCE');
  const badFrame=cube();badFrame.frame.z='UP' as 'DOWN';
  expect(screenDraftHullMesh(badFrame,sha).failureCodes).toContain('INVALID_MARINE_COORDINATE_FRAME');
  const badUnit=cube();badUnit.frame.unit='cm' as 'm';
  expect(screenDraftHullMesh(badUnit,sha).failureCodes).toContain('INVALID_MARINE_COORDINATE_FRAME');
  const badFace=cube();badFace.triangles[0]=[0,1,99];
  expect(screenDraftHullMesh(badFace,sha).failureCodes).toContain('INVALID_TRIANGLE_INDEXING');
  const nonfinite=cube();nonfinite.vertices[3]=[NaN,1,1];
  expect(screenDraftHullMesh(nonfinite,sha).failureCodes).toContain('INVALID_MESH_VERTICES');
 });
 it('records an unverified geometry SHA in M03 without unblocking marine physics',async()=>{
  const folder=await mkdtemp(path.join(os.tmpdir(),'usv-m04-m03-'));
  try{
    const screen=screenDraftHullMesh(cube(),sha);
    const input=draftGeometryLedgerInput(screen,sha);
    const ledger=new CandidateLedger(path.join(folder,'draft.json'));
    await ledger.append({
      kind:'CANDIDATE_CREATED',txId:'M04-INTEGRATION-TEST',
      projectId:'USV-01',candidateId:'CAND-TEST-01',revisionId:'REV-001',
      missionId:'SYNTHETIC-MISSION',configurationId:'CFG-TEST',
      topology:'MONOHULL',sourceSha:sha,
      classification:'RESTRICTED_METADATA_ONLY',
      inputDigests:[input]
    });
    const view=(await ledger.readAll())[0];
    expect(view.inputDigests.GEOMETRY).toBe(screen.geometrySha256);
    expect(view.domainStates.GEOMETRY).toBe('NOT_RUN');
    expect(view.domainStates.HYDROSTATICS).toBe('BLOCKED');
    expect(view.domainStates.RESISTANCE).toBe('BLOCKED');
    expect(view.independentEngineeringValidationSatisfied).toBe(false);
    expect(view.engineeringReleaseApproved).toBe(false);
    expect(()=>draftGeometryLedgerInput(screen,'b'.repeat(40))).toThrow(/HANDOFF_BLOCKED/);
    expect(()=>draftGeometryLedgerInput({...screen,status:'BLOCKED_INVALID_GEOMETRY'},sha))
      .toThrow(/HANDOFF_BLOCKED/);
    expect(()=>draftGeometryLedgerInput({...screen,engineeringReleaseApproved:true as false},sha))
      .toThrow(/HANDOFF_BLOCKED/);
  }finally{await rm(folder,{recursive:true,force:true});}
 });
 it('supports two disjoint mathematical closed bodies without certifying multihull physics',()=>{
  const twin=cube();
  twin.topology='CATAMARAN';
  twin.vertices.push(...points.map(p=>[p[0],p[1]+3,p[2]] as Vertex));
  twin.triangles.push(...faces.map(([a,b,c])=>[a+8,b+8,c+8] as [number,number,number]));
  const result=screenDraftHullMesh(twin,sha);
  expect(result.status).toBe('CLOSED_ORIENTED_MATH_SCREEN_UNVERIFIED');
  expect(result.signedEnclosedVolumeM3).toBeCloseTo(2,10);
  expect(result.enclosedVolumeCentroidMeters?.[1]).toBeCloseTo(2,10);
  expect(result.centerOfBuoyancyMeters).toBeNull();
  expect(result.massCgValidated).toBe(false);
 });
});
