import React, { useRef, useState } from 'react';
import { ArrowUpRight, Box, FileUp, Focus, Layers3, Rotate3d } from 'lucide-react';
import { parseObj, MAX_OBJ_BYTES, type Mesh } from '../dockyard2/mesh';
import { MeshViewport } from '../dockyard2/MeshViewport';
import { moduleLink, PRODUCT_FACETS, type ProductFacetId } from './navigation';

type View='isometric'|'plan'|'section'|'mesh';
interface Props {
  facet:ProductFacetId;
  onFacetChange:(facet:ProductFacetId)=>void;
  compact?:boolean;
}
const LINES='#b4dfe9';

function TechnicalVessel({view,facet}:{view:Exclude<View,'mesh'>;facet:ProductFacetId}){
  if(view==='section')return <svg className="nl-vessel-drawing" viewBox="0 0 680 400" role="img" aria-label="Conceptual cross-sectional twin-hull diagram; not dimensionally verified">
    <path d="M30 266H650M340 30V370" stroke="#5da4bc" strokeDasharray="7 8" opacity=".5"/>
    <path d="M65 138H615L582 169H519L494 292 460 322H387L366 169H314L293 322H220L186 292 161 169H98Z" fill="#22516a" stroke={LINES} strokeWidth="3"/>
    <path d="M98 169H582M340 140V322" stroke="#85c1d1" strokeWidth="2" opacity=".7"/>
    <path d="M161 169 186 292 220 322 293 322M519 169 494 292 460 322 387 322" stroke="#65b2c6" strokeWidth="2" fill="none"/>
    <path d="M65 138V82M615 138V82M65 93H615" stroke="#90c3d4" strokeWidth="1.5"/>
    <path d="m65 93 9-5v10ZM615 93l-9-5v10Z" fill="#90c3d4"/>
    <text x="340" y="77" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="15" fill="#c7e6ef">B / TBD</text>
    <text x="340" y="375" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="12" fill="#c7e6ef">SCHEMATIC SECTION · NO APPROVED SCANTLINGS</text>
  </svg>;
  if(view==='plan')return <svg className="nl-vessel-drawing" viewBox="0 0 680 400" role="img" aria-label="Conceptual vessel plan diagram; not dimensionally verified">
    <path d="M340 20V380M35 200H645" stroke="#467891" strokeDasharray="8 7" opacity=".6"/>
    <path d="M138 118Q90 155 83 200Q90 245 138 282L550 285Q597 245 612 200Q595 154 550 115Z" fill="#21495f" stroke="#9bd2e0" strokeWidth="2"/>
    <path d="M155 136Q121 160 116 200Q121 243 155 263L529 263Q565 247 587 200Q565 153 529 136Z" fill="#346c83" stroke="#c0e2eb" strokeWidth="1.5"/>
    <path d="M180 146 525 146M180 255H525M265 146V255M424 146V255" stroke="#b3dce6" opacity=".45"/>
    <rect x="276" y="165" width="140" height="70" rx="7" fill="#173a50" stroke="#a2cbd8" strokeWidth="2"/>
    <path d="M295 171h100l-12 56h-76Z" fill="#367992" stroke="#72c7db"/>
    <path d="M340 78V322" stroke="#5ea8c1" strokeDasharray="6 8"/>
    <path d="M150 110V290M548 110V290" stroke="#6ba6bd" strokeDasharray="4 8" opacity=".6"/>
    <text x="340" y="350" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="12" fill="#c7e6ef">TOP VIEW · CONCEPTUAL SYMMETRY</text>
  </svg>;
  return <svg className="nl-vessel-drawing" viewBox="0 0 820 460" role="img" aria-label="Illustrative isometric view of unmanned twin-hull vessel; not approved CAD">
    <defs>
      <linearGradient id="nl-hull" x1="0" y1="0" x2=".9" y2="1"><stop stopColor="#639bb0"/><stop offset=".6" stopColor="#32677e"/><stop offset="1" stopColor="#153c54"/></linearGradient>
      <linearGradient id="nl-deck" x1="0" y1="0" x2=".75" y2="1"><stop stopColor="#badde7"/><stop offset="1" stopColor="#376c83"/></linearGradient>
    </defs>
    <ellipse cx="404" cy="349" rx="302" ry="34" fill="#54bad0" opacity=".09"/>
    <path d="M52 253 199 170 605 169 771 260 658 320 170 324Z" fill="url(#nl-hull)" stroke="#b3dce5" strokeWidth="3"/>
    <path d="M98 291 192 356 365 361 343 321 170 324Z" fill="#123c50" stroke="#8fc0d2" strokeWidth="2"/>
    <path d="M485 322 572 357 701 325 658 320Z" fill="#123d51" stroke="#8fc0d2" strokeWidth="2"/>
    <path d="M199 170 279 121 543 122 605 169 531 237 285 234Z" fill="url(#nl-deck)" stroke="#d4edf2" strokeWidth="2.7"/>
    <path d="M279 121 344 73 478 74 544 122 469 166 346 164Z" fill="#336d86" stroke="#a8d9e5" strokeWidth="2"/>
    <path d="M358 73 386 40 451 41 478 74 444 104 390 104Z" fill="#29607b" stroke="#b9e4ed" strokeWidth="2"/>
    <path d="M398 40V10M424 41V25M451 41 463 19" stroke="#ceebf3" strokeWidth="2"/>
    <path d="M294 151 344 153 383 170 335 173ZM424 154 471 154 504 171 456 173Z" fill="#7ccbdd" fillOpacity=".2" stroke="#9ed9e9" strokeWidth="1.5"/>
    <path d="M199 170 285 234 170 324M605 169 531 237 658 320M285 234 531 237" stroke="#c6e5ee" strokeWidth="1.8" opacity=".6"/>
    <path d="M175 323 365 331 485 328 659 320" stroke="#aed5e1" strokeDasharray="5 8" opacity=".7"/>
    <g stroke="#b5deea" strokeWidth="1.2" opacity=".35">
      <path d="M198 243 221 322M287 247 301 324M377 246 385 328M462 246 481 329M557 242 600 324"/>
      <path d="M104 287 703 285"/>
    </g>
    {facet!=='vessel'&&<g>
      <circle cx={facet==='hull'?199:facet==='propulsion'?663:facet==='payload'?399:414}
       cy={facet==='hull'?286:facet==='propulsion'?310:facet==='payload'?148:72}
       r="22" stroke="#f5c878" strokeWidth="2.5" fill="#f5c878" fillOpacity=".13"/>
      <path d="M425 96 510 69H636" stroke="#f5c878" strokeWidth="1.5" opacity=".8"/>
    </g>}
  </svg>;
}

export function VesselStage({facet,onFacetChange,compact=false}:Props){
  const [view,setView]=useState<View>('isometric');
  const [mesh,setMesh]=useState<Mesh|null>(null);
  const [uploadError,setUploadError]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);
  const readMesh=async (file?:File)=>{
    if(!file)return;
    setUploadError('');
    try {
      if(!file.name.toLowerCase().endsWith('.obj'))throw Error('Choose a supported .obj triangle mesh.');
      if(file.size>MAX_OBJ_BYTES)throw Error('Local OBJ exceeds the 12 MB inspection limit.');
      const parsed=parseObj(await file.text(),file.name);
      setMesh(parsed);setView('mesh');
    }catch(error){setUploadError(error instanceof Error?error.message:'Unable to inspect OBJ.');}
  };
  return <div className={'nl-product'+(compact?' nl-product-compact':'')} aria-label="Product visual workstage">
    <div className="nl-panel-heading">
      <div><h2>Product workstage</h2><p>USV-01 / conceptual configuration</p></div>
      <span className="nl-provenance">UNVERIFIED</span>
    </div>
    <div className="nl-viewport">
      <div className="nl-viewport-grid" aria-hidden="true"/>
      <div className="nl-drawing-heading">
        <span>USV-01 <span className="nl-drawing-separator">/</span> {view==='mesh'?'LOCAL TRIANGLE MESH':'CONCEPT DRAWING'}</span>
        <span>NO APPROVED CAD BASELINE</span>
      </div>
      {view==='mesh'&&mesh?<MeshViewport mesh={mesh} title={'Local mesh '+mesh.name}/>:
        <TechnicalVessel view={view==='mesh'?'isometric':view} facet={facet}/>}
      <div className="nl-viewport-bottom"><span>ENGINEERING ILLUSTRATION · NOT TO SCALE</span><span>XY · Z ↑</span></div>
    </div>
    <div className="nl-stage-toolbar" aria-label="Product view controls">
      <div className="nl-segments" role="group" aria-label="Drawing view">
        {([['isometric','Perspective'],['plan','Plan'],['section','Section']] as const).map(([id,label])=>
          <button type="button" aria-pressed={view===id} key={id} onClick={()=>setView(id)}>{label}</button>)}
        {mesh&&<button type="button" aria-pressed={view==='mesh'} onClick={()=>setView('mesh')}>Local OBJ</button>}
      </div>
      <button type="button" className="nl-import" onClick={()=>fileRef.current?.click()}>
        <FileUp size={16}/> Inspect OBJ
      </button>
      <input className="nl-visually-hidden" type="file" accept=".obj,text/plain" ref={fileRef}
        aria-label="Inspect local OBJ file" onChange={e=>{void readMesh(e.target.files?.[0]);e.target.value='';}}/>
    </div>
    {uploadError&&<p className="nl-form-error" role="alert">{uploadError}</p>}
    <div className="nl-product-strip">
      <div className="nl-strip-title"><Layers3 size={17}/><span>Assemblies</span></div>
      <div className="nl-facet-row" role="group" aria-label="Select conceptual assembly">
        {PRODUCT_FACETS.map(p=><button type="button" key={p.id} aria-pressed={facet===p.id} onClick={()=>onFacetChange(p.id)}>
          {p.name}</button>)}
      </div>
      <a href={moduleLink('cad-studio')} className="nl-text-link">CAD tools <ArrowUpRight size={14}/></a>
    </div>
  </div>;
}
