/**
 * Browser-only OBJ inspector. Geometry is local, not approved CAD evidence.
 * Deliberate limits keep the viewer responsive and avoid uploading client data.
 */
export interface Vec3 { x:number;y:number;z:number; }
export interface Face { a:number;b:number;c:number; }
export interface Mesh { vertices:Vec3[]; faces:Face[]; name:string; }
export const MAX_OBJ_BYTES=12*1024*1024;
export const MAX_OBJ_VERTICES=250000;
export const MAX_OBJ_FACES=120000;
const finite=(n:number)=>Number.isFinite(n);
export function parseObj(text:string,name='local.obj'):Mesh {
  if (text.length>MAX_OBJ_BYTES) throw Error('OBJ exceeds the 12 MB local inspection limit.');
  const vertices:Vec3[]=[];const faces:Face[]=[];
  for (const line of text.split(/\r?\n/)) {
    const trimmed=line.trim();
    if (!trimmed||trimmed.startsWith('#')) continue;
    const parts=trimmed.split(/\s+/);
    if (parts[0]==='v' && parts.length>=4) {
      const [x,y,z]=parts.slice(1,4).map(Number);
      if (![x,y,z].every(finite)) throw Error('Non-finite OBJ vertex found.');
      vertices.push({x,y,z});
      if (vertices.length>MAX_OBJ_VERTICES) throw Error('OBJ exceeds the vertex budget.');
    } else if(parts[0]==='f'&&parts.length>=4) {
      const ids=parts.slice(1).map(token=>{
        const raw=Number(token.split('/')[0]);
        if (!Number.isInteger(raw)||raw===0)throw Error('Invalid OBJ face index.');
        const index=raw>0?raw-1:vertices.length+raw;
        if(index<0||index>=vertices.length)throw Error('OBJ face references unavailable vertex.');
        return index;
      });
      for(let i=1;i+1<ids.length;i++) {
        faces.push({a:ids[0],b:ids[i],c:ids[i+1]});
        if(faces.length>MAX_OBJ_FACES)throw Error('OBJ exceeds the face budget.');
      }
    }
  }
  if(vertices.length===0||faces.length===0)throw Error('OBJ must contain vertices and polygon faces.');
  return {vertices,faces,name};
}
export function meshBounds(mesh:Mesh) {
  let min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
  for(const p of mesh.vertices){
    min={x:Math.min(min.x,p.x),y:Math.min(min.y,p.y),z:Math.min(min.z,p.z)};
    max={x:Math.max(max.x,p.x),y:Math.max(max.y,p.y),z:Math.max(max.z,p.z)};
  }
  const center={x:(min.x+max.x)/2,y:(min.y+max.y)/2,z:(min.z+max.z)/2};
  return {min,max,center,size:Math.max(max.x-min.x,max.y-min.y,max.z-min.z,1e-8)};
}
