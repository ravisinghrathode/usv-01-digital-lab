import React,{useState} from 'react';

/** An original illustrative vessel render used only as non-authoritative UI concept art.
 * All technical shapes are deliberately dimensionless. Not a CAD, hydrostatics or solver output.
 */
function DiagramFallback({variant='reference',compact=false,mode='studio'}:{
 variant?:'reference'|'candidate';compact?:boolean;mode?:'studio'|'ocean'|'blueprint'
}){
 const candidate=variant==='candidate';
 const blue=candidate?'#3179a4':'#426a82';
 const shadow=candidate?'#122c40':'#213746';
 const uid=candidate?'cand':'ref';
 return <svg viewBox="0 0 1200 690" preserveAspectRatio="xMidYMid meet"
  className={'ses-visual ses-visual-'+mode+(compact?' ses-visual-small':'')}
  role="img" aria-label={candidate?'Illustrative twin-hull lightweight design concept, not actual CAD':'Illustrative twin-hull reference concept, not actual CAD'}>
  <defs>
   <linearGradient id={'ses-ocean-'+uid} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#eaf3f6"/><stop offset=".72" stopColor="#b8d1dd"/><stop offset="1" stopColor="#7eabbc"/></linearGradient>
   <linearGradient id={'ses-deck-'+uid} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fefefe"/><stop offset=".48" stopColor="#eff3f6"/><stop offset=".76" stopColor="#afc2ce"/><stop offset="1" stopColor="#7596ab"/></linearGradient>
   <linearGradient id={'ses-side-'+uid} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#d5e0e8"/><stop offset=".42" stopColor="#829eb1"/><stop offset="1" stopColor="#23435a"/></linearGradient>
   <linearGradient id={'ses-hull-'+uid} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#819eaf"/><stop offset=".32" stopColor="#31536b"/><stop offset="1" stopColor="#0c2638"/></linearGradient>
   <linearGradient id={'ses-glass-'+uid} x1="0" y1="0" x2=".85" y2="1"><stop stopColor="#b9e8f4"/><stop offset=".36" stopColor="#5386a7"/><stop offset="1" stopColor="#17384d"/></linearGradient>
   <radialGradient id={'ses-aura-'+uid}><stop stopColor="#fff" stopOpacity=".9"/><stop offset=".7" stopColor="#d4e5ee" stopOpacity=".36"/><stop offset="1" stopColor="#eff4f6" stopOpacity="0"/></radialGradient>
   <filter id={'ses-shadow-'+uid} x="-40%" y="-100%" width="180%" height="300%"><feGaussianBlur stdDeviation="21"/></filter>
   <filter id={'ses-soft-'+uid} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
   <pattern id={'ses-water-'+uid} width="130" height="34" patternUnits="userSpaceOnUse"><path d="M0 16q33-9 67 0t63 0" stroke="#fff" strokeOpacity=".24" fill="none" strokeWidth="1.2"/></pattern>
  </defs>
  <rect x="0" y="0" width="1200" height="690" fill={mode==='ocean'?'url(#ses-ocean-'+uid+')':'transparent'}/>
  <ellipse cx="600" cy="375" rx="580" ry="330" fill={'url(#ses-aura-'+uid+')'}/>
  {mode==='ocean'&&<>
   <path d="M0 424Q300 383 600 419T1200 411V690H0Z" fill="#83b1c2" opacity=".3"/>
   <path d="M0 470Q270 445 550 472T1200 462V690H0Z" fill="#b8d5e0" opacity=".42"/>
   <path d="M0 510h1200v180H0Z" fill={'url(#ses-water-'+uid+')'} opacity=".7"/>
  </>}
  <g transform={compact?'translate(56 27) scale(.91)':'translate(0 0)'}>
   {/* Ambient contact shadow and waves identify illustration rather than engineering geometry. */}
   <ellipse cx="588" cy="536" rx="440" ry="58" fill="#21445f" opacity=".22" filter={'url(#ses-shadow-'+uid+')'}/>
   <path d="M177 539Q405 560 561 546T993 558" fill="none" stroke="#92becf" strokeWidth="5" strokeOpacity=".35"/>
   <path d="M211 562Q419 576 619 557T980 573" fill="none" stroke="#fff" strokeWidth="3" strokeOpacity=".34"/>
   {/* Port hull: visible fine-chine stepped hull, prow, spray rails. */}
   <path d="M162 407 314 437 431 523 423 565 281 547 202 482Z" fill={'url(#ses-hull-'+uid+')'} stroke="#1c3c50" strokeWidth="2.5"/>
   <path d="M162 407 308 423 433 502 431 523 314 437Z" fill="#c1cfd8" stroke="#5f879a" strokeWidth="2"/>
   <path d="M200 479 282 541 407 558" fill="none" stroke="#9ab9c8" strokeWidth="2.6" opacity=".8"/>
   <path d="M240 501 295 530 388 544" fill="none" stroke="#e2eff2" strokeWidth="1.5" opacity=".48"/>
   <path d="M175 424 303 446 414 518" stroke="#d9eaf1" fill="none" strokeWidth="2"/>
   {/* Starboard hull: long offshore bow with sculpted chine. */}
   <path d="M650 426 786 401 1082 471 1034 523 883 578 723 535Z" fill={'url(#ses-hull-'+uid+')'} stroke="#1c394e" strokeWidth="2.8"/>
   <path d="M657 426 786 401 1078 471 1001 481 834 439Z" fill="#d9e4ea" stroke="#5f8598" strokeWidth="2"/>
   <path d="M723 533 883 575 1034 523" fill="none" stroke="#7eabc0" strokeWidth="3"/>
   <path d="M768 537 894 563 1024 525" fill="none" stroke="#c3dde8" strokeWidth="1.6"/>
   <path d="M847 450 992 474 1075 475" fill="none" stroke="#fff" strokeWidth="3" opacity=".7"/>
   {/* Connecting deck, sculpted chine and central bridge */}
   <path d="M125 388 409 263 764 265 1053 421 805 507 399 492Z" fill={'url(#ses-deck-'+uid+')'} stroke="#7c99a9" strokeWidth="3"/>
   <path d="M125 388 403 494 805 507 1053 421 1030 443 804 525 396 514 133 403Z" fill={'url(#ses-side-'+uid+')'} stroke="#4e6e80" strokeWidth="2"/>
   <path d="M155 386 416 278 770 281 1012 415 797 486 409 474Z" fill="#f5f8f8" stroke="#d6e2e7" strokeWidth="2"/>
   <path d="M220 385 429 300 740 298 952 414" fill="none" stroke="#9fb5be" strokeWidth="2"/>
   <path d="M185 399 414 482 793 497" fill="none" stroke="#f9fcfd" strokeWidth="3" opacity=".85"/>
   <path d="M400 472 800 485" fill="none" stroke="#7897aa" strokeWidth="1.5"/>
   {/* Raised wheelhouse / mission center, with multi-angle glazing */}
   <path d="M366 302 438 218 697 209 790 294 734 350 427 348Z" fill={'url(#ses-deck-'+uid+')'} stroke="#7895a6" strokeWidth="3"/>
   <path d="M404 290 450 233 673 227 749 294 704 320 442 321Z" fill="#dfebef" stroke="#b4cbd6" strokeWidth="2"/>
   <path d="M460 235 483 230 508 298 428 299Z" fill={'url(#ses-glass-'+uid+')'} stroke="#65899e" strokeWidth="2"/>
   <path d="M516 231 583 229 598 298 526 298Z" fill={'url(#ses-glass-'+uid+')'} stroke="#648ca2" strokeWidth="2"/>
   <path d="M591 230 665 229 721 297 608 298Z" fill={'url(#ses-glass-'+uid+')'} stroke="#648aa0" strokeWidth="2"/>
   <path d="M458 236 495 245M531 235 583 237M607 234 657 239" fill="none" stroke="#e4f6fc" strokeWidth="2" opacity=".8"/>
   <path d="M423 329 712 332" fill="none" stroke="#7f9cae" strokeWidth="3"/>
   {/* Low-profile roof and antennas */}
   <path d="M435 219 494 179 660 174 702 208 676 221Z" fill="#e4ecef" stroke="#6d8da0" strokeWidth="2.6"/>
   <path d="M492 178 532 150 626 148 656 176Z" fill="#c4d9e0" stroke="#658a9f" strokeWidth="2"/>
   <path d="M538 149 554 122 597 121 615 149Z" fill="#748f9f" stroke="#41667e" strokeWidth="2"/>
   <path d="M571 120V57M580 119V88M565 83l-15-26M588 85l20-31" stroke="#314d61" strokeWidth="3.3" strokeLinecap="round"/>
   <circle cx="572" cy="55" r="5" fill="#15374d"/><circle cx="609" cy="55" r="4" fill="#2b5670"/>
   <path d="M555 106h29" stroke="#456d86" strokeWidth="3.5"/>
   <path d="M493 178 468 160 480 154 515 169" fill="#f9fbfb" stroke="#a3bbc6" strokeWidth="1.5"/>
   {/* distinctive hatches, panel lines, cleats, safety rail */}
   <path d="M390 414 499 391 603 390 668 414 570 438 449 435Z" fill="#a5c4d0" stroke="#7b9cad" strokeWidth="2"/>
   <path d="M422 412 496 397 589 396" fill="none" stroke="#e4f2f6" strokeWidth="2"/>
   <path d="M801 369 877 391 827 405 759 387Z" fill="#dee9ed" stroke="#b3c7d0" strokeWidth="1.5"/>
   <path d="M807 373 862 390" stroke="#7193a6" strokeWidth="1.5"/>
   <path d="M291 388 333 368 363 381 321 400Z" fill="#e7eff2" stroke="#a5c0cc"/>
   <path d="M160 380 150 363M181 371 171 354M207 361 198 344M235 348 224 333M270 337 260 320" fill="none" stroke="#889ca8" strokeWidth="2"/>
   <path d="M844 353 850 335M875 367 882 350M907 382 917 363M940 396 952 379" fill="none" stroke="#889ca8" strokeWidth="2"/>
   {/* realistic highlights */}
   <path d="M419 278 449 236 669 233" fill="none" stroke="#fff" strokeWidth="4" opacity=".75"/>
   <path d="M136 388 399 481 799 496 1026 424" fill="none" stroke="#fff" strokeWidth="3" opacity=".6"/>
   <path d="M135 392 395 506 808 517" fill="none" stroke="#49677a" strokeWidth="2" opacity=".6"/>
   {candidate&&<g fill="none" stroke="#1c89b0" strokeWidth="3" opacity=".85">
    <path d="M394 490 804 503 1002 455"/><path d="M442 222 700 213"/>
   </g>}
  </g>
  <g fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="15" fill="#4e7589" opacity=".82">
   <text x="30" y="654">CONCEPT VISUALIZATION · UNVERIFIED</text>
   <text x="1170" y="654" textAnchor="end">{candidate?'EXPLORATORY':'REFERENCE'} / NO CONFIGURATION ID</text>
  </g>
 </svg>;
}

/** Prefer the repository's original, reproducible Blender assets for visual
 * fidelity. The SVG is the offline/asset-error fallback, never approved CAD.
 */
export function VesselVisual({variant='reference',compact=false,mode='studio',perspective='iso'}:{
 variant?:'reference'|'candidate';compact?:boolean;mode?:'studio'|'ocean'|'blueprint';perspective?:'iso'|'plan'
}){
 const [failed,setFailed]=useState(false);
 const asset='/sessions/media/usv-'+variant+(perspective==='plan'?'-plan':'')+'.png';
 return <div className={'ses-visual ses-render-root ses-visual-'+mode+(compact?' ses-visual-small':'')}>
  {failed?<DiagramFallback variant={variant} compact={compact} mode={mode}/>:
   <img key={asset} className="ses-render-image" src={asset} draggable={false} loading="eager" decoding="async"
    alt={variant==='reference'?'Original Blender-rendered, illustrative USV reference concept; not source CAD':
       'Original Blender-rendered, illustrative alternative USV concept; not source CAD'}
    onError={()=>setFailed(true)}/>}
 </div>;
}
