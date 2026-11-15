import React,{useState} from 'react';
import {ConceptVessel} from './ConceptVessel';
import type {Perspective} from './model';

/**
 * Original Blender-generated illustrative ship render.
 * This is a visual study, NOT CAD data, a dimensioned hull, or real USV-01.
 * Original reproducible generator: scripts/ui/render_sessions_vessels.py
 */
export function VesselVisual({variant,perspective='iso',className='',caption=true}:{
 variant:'reference'|'candidate';perspective?:Perspective;className?:string;caption?:boolean;
}){
 const [failed,setFailed]=useState(false);
 const path='/sessions/media/usv-'+variant+(perspective==='plan'?'-plan':'')+'.png';
 return <div className={'vf-vessel-visual '+className}>
  {failed?<ConceptVessel variant={variant} perspective={perspective}/>:
   <img key={path} src={path} alt={variant==='candidate'?
    'Original 3D artistic rendering of a notional alternative twin-hull surface vessel; not an approved CAD model':
    'Original 3D artistic rendering of a notional reference twin-hull surface vessel; not an approved CAD model'}
    draggable={false} loading="eager" decoding="async" onError={()=>setFailed(true)}/>}
  {caption&&<span className="vf-vessel-fact">ARTISTIC CONCEPT · NOT SOURCE GEOMETRY</span>}
 </div>;
}
