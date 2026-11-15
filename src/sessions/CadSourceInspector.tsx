import React,{useEffect,useState} from 'react';
import type {CadRevision} from '../types/engineering';
import {MAX_OBJ_BYTES,parseObj,type Mesh} from '../dockyard2/mesh';
import {GeometrySheet} from '../atlas/GeometrySheet';

/**
 * No remote fetch and no upload. Only a bounded local OBJ whose bytes match
 * the source pointer's recorded SHA-256 may be displayed. This proves equality
 * to the registered digest, not independent CAD validation or certification.
 */
export function CadSourceInspector({revision}:{revision:CadRevision}){
 const [mesh,setMesh]=useState<Mesh|null>(null);
 const [error,setError]=useState('');
 const [matched,setMatched]=useState(false);
 useEffect(()=>{setMesh(null);setMatched(false);setError('');},[revision.id]);
 const inspect=async(event:React.ChangeEvent<HTMLInputElement>)=>{
  setMesh(null);setMatched(false);setError('');
  const file=event.target.files?.[0];
  if(!file)return;
  try{
   if(!file.name.toLowerCase().endsWith('.obj'))throw Error('Only local OBJ is supported for this geometric preview. Open STEP/IGES in governed CAD Studio.');
   if(file.size===0||file.size>MAX_OBJ_BYTES)throw Error('OBJ file must be non-empty and at most 12 MB.');
   if(!globalThis.crypto?.subtle)throw Error('Secure browser context required to calculate SHA-256.');
   const data=await file.arrayBuffer();
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),byte=>byte.toString(16).padStart(2,'0')).join('');
   if(digest!==revision.sourceSha256.toLowerCase())throw Error('SHA-256 mismatch. This file does not match the selected recorded revision; no geometry is displayed.');
   const model=parseObj(new TextDecoder().decode(data),file.name);
   setMesh(model);setMatched(true);
  }catch(e){setError(e instanceof Error?e.message:'Unable to inspect source geometry.');}
  finally{event.target.value='';}
 };
 return <section className="lv-cad-inspector" aria-label={'Inspect source geometry for '+revision.revision}>
  <h4>Local source-matched OBJ inspection</h4>
  <p>Select a local OBJ file to compare its SHA-256 with the registered revision. Bytes stay in this browser; nothing is sent to the project server.</p>
  <label>Choose local OBJ<input type="file" accept=".obj" onChange={inspect}/></label>
  {error&&<p role="alert" className="lv-error">{error}</p>}
  {matched&&mesh&&<><p className="lv-success" role="status">SHA-256 matches recorded source pointer. Visual inspection only; engineering geometry is not approved.</p><GeometrySheet mesh={mesh}/></>}
 </section>;
}
