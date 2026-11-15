import React, {useMemo, useState} from 'react';
import type {Mesh, Vec3} from '../dockyard2/mesh';
import {meshBounds} from '../dockyard2/mesh';
/**
 * Separate Atlas visualizer: a bounded orthographic preview of local OBJ triangles.
 * Not a CAD kernel, watertightness inspection, structural solver or file upload.
 */
export function GeometrySheet({mesh}:{mesh:Mesh}){
 const [yaw,setYaw]=useState(-.42);
 const [zoom,setZoom]=useState(1);
 const bounds=useMemo(()=>meshBounds(mesh),[mesh]);
 const paths=useMemo(()=>{
  const cy=Math.cos(yaw),sy=Math.sin(yaw),pitch=.35,sp=Math.sin(pitch),cp=Math.cos(pitch);
  const project=(v:Vec3)=>{
   const x=(v.x-bounds.center.x)/bounds.size,y=(v.y-bounds.center.y)/bounds.size,z=(v.z-bounds.center.z)/bounds.size;
   const xx=x*cy-z*sy,zz=x*sy+z*cy;
   return {x:480+xx*450*zoom,y:265-(y*cp-zz*sp)*450*zoom,depth:zz*cp+y*sp};
  };
  const sample=Math.max(1,Math.ceil(mesh.faces.length/1900));
  return mesh.faces.filter((_,i)=>i%sample===0).map(f=>{
   const p=[project(mesh.vertices[f.a]),project(mesh.vertices[f.b]),project(mesh.vertices[f.c])];
   return {d:'M'+p.map(v=>v.x.toFixed(1)+' '+v.y.toFixed(1)).join('L')+'Z',depth:(p[0].depth+p[1].depth+p[2].depth)/3};
  }).sort((a,b)=>a.depth-b.depth);
 },[mesh,bounds,yaw,zoom]);
 return <div className="at-local-mesh">
  <div className="at-mesh-toolbar">
   <span>Local OBJ: {mesh.name} · {mesh.faces.length.toLocaleString()} triangles</span>
   <div role="group" aria-label="Local mesh view controls">
    <button type="button" onClick={()=>setYaw(v=>v-.18)} aria-label="Rotate model left">↶</button>
    <button type="button" onClick={()=>setYaw(v=>v+.18)} aria-label="Rotate model right">↷</button>
    <button type="button" onClick={()=>setZoom(v=>Math.max(.45,v/1.18))} aria-label="Zoom out">−</button>
    <button type="button" onClick={()=>setZoom(v=>Math.min(3,v*1.18))} aria-label="Zoom in">+</button>
   </div>
  </div>
  <svg viewBox="0 0 960 530" preserveAspectRatio="xMidYMid meet" role="img"
   aria-label={'Local mesh projection of '+mesh.name+', sampled for visual inspection, not certified CAD'}>
   <rect width="960" height="530" fill="#f9fcfd"/>
   <path d="M0 265H960M480 0V530" stroke="#b5c9d7" strokeDasharray="8 8"/>
   {paths.map((p,i)=><path d={p.d} key={i} fill="#9cbdce" fillOpacity=".47" stroke="#447c9f" strokeOpacity=".58" strokeWidth=".7"/>)}
  </svg>
  <span className="at-mesh-disclaimer">Visual sample of {paths.length.toLocaleString()} triangles · no mass properties or validation derived</span>
 </div>;
}
