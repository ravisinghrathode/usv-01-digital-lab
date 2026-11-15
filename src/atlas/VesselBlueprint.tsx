import React from 'react';
import type {AssemblyId,DrawingView} from './model';

const NAVY='#31536a', LIGHT='#dceaf0', EDGE='#3d6c87', BLUE='#1b5aa2', AMBER='#bd7b2e';
function Grid(){
 return <defs>
  <pattern id="atlas-major-grid" width="96" height="96" patternUnits="userSpaceOnUse">
    <path d="M96 0H0V96" fill="none" stroke="#bfd0dc" strokeWidth=".9" opacity=".65"/>
  </pattern>
  <pattern id="atlas-minor-grid" width="24" height="24" patternUnits="userSpaceOnUse">
    <path d="M24 0H0V24" fill="none" stroke="#dce6ee" strokeWidth=".7"/>
  </pattern>
  <linearGradient id="atlas-plate" x1="0" y1="0" x2="1" y2="1">
   <stop stopColor="#ecf5f8"/><stop offset=".58" stopColor="#a8c8d8"/><stop offset="1" stopColor="#497993"/>
  </linearGradient>
  <linearGradient id="atlas-flank" x1="0" y1="0" x2=".5" y2="1">
   <stop stopColor="#668fa8"/><stop offset="1" stopColor="#274e67"/>
  </linearGradient>
 </defs>;
}
function Iso({assembly}:{assembly:AssemblyId}){
 return <g strokeLinejoin="round" strokeLinecap="round">
  <ellipse cx="485" cy="404" rx="350" ry="36" fill="#9db6c4" opacity=".15"/>
  {/* The shell, two separated underwater buoyancy elements and connecting deck */}
  <path d="M134 275 300 174 652 163 815 279 688 355 275 363Z" fill="url(#atlas-flank)" stroke={EDGE} strokeWidth="2.5"/>
  <path d="M168 319 246 403 370 412 345 363 275 363Z" fill="#2d5269" stroke="#3a718b" strokeWidth="2.2"/>
  <path d="M605 358 682 402 755 365 688 355Z" fill="#31556d" stroke="#3a718b" strokeWidth="2.2"/>
  <path d="M300 174 388 129 581 125 652 163 571 262 394 265Z" fill="url(#atlas-plate)" stroke={NAVY} strokeWidth="2.3"/>
  <path d="M388 129 429 99 549 99 581 125 531 172 437 176Z" fill="#a6cada" stroke="#527990" strokeWidth="2"/>
  <path d="M436 99 457 73 512 72 540 99 511 126 465 126Z" fill="#447a97" stroke="#365c75" strokeWidth="1.8"/>
  <path d="M468 73V39M501 74V52M523 81l15-29" stroke="#427894" strokeWidth="2.2"/>
  <path d="M345 201 390 215 414 258M579 192 552 221 572 262M394 265 275 363M571 262 688 355" fill="none" stroke="#527a90" strokeWidth="1.8"/>
  <path d="M330 327 676 328M215 290 727 294" fill="none" stroke="#d9e7ed" strokeWidth="1.3" opacity=".65"/>
  <path d="M435 153 463 157 484 179 448 178Z" fill="#bedce7" stroke="#6090aa"/>
  <path d="M489 156 523 154 545 177 508 178Z" fill="#bedce7" stroke="#6090aa"/>
  <path d="M201 318 270 336 358 350M594 350 684 372" fill="none" stroke="#94b8c9" strokeWidth="1.5"/>
  {/* Two measured annotations identify selectable conceptual disciplines, not CAD components. */}
  <g className={assembly==='hull'?'atlas-drawing-highlight':''}>
   <path d="M219 331 137 405H74" stroke={assembly==='hull'?BLUE:'#88a2b3'} strokeWidth="1.8" fill="none"/>
   <circle cx="219" cy="331" r="5.5" fill={assembly==='hull'?BLUE:'#91b1c0'}/>
   <text x="74" y="425" fill="#31546b" fontSize="14" fontWeight="700">Hull form</text>
  </g>
  <g>
   <path d="M675 359 767 428H884" stroke={assembly==='power'?BLUE:'#88a2b3'} strokeWidth="1.8" fill="none"/>
   <circle cx="675" cy="359" r="5.5" fill={assembly==='power'?BLUE:'#91b1c0'}/>
   <text x="884" y="448" textAnchor="end" fill="#31546b" fontSize="14" fontWeight="700">Propulsion interface</text>
  </g>
  <g><path d="M490 78 612 54H779" stroke={assembly==='autonomy'?BLUE:'#88a2b3'} strokeWidth="1.8" fill="none"/>
   <circle cx="490" cy="78" r="5.5" fill={assembly==='autonomy'?BLUE:'#91b1c0'}/>
   <text x="787" y="59" fill="#31546b" fontSize="14" fontWeight="700">Control suite</text></g>
  {assembly==='payload'&&<g><circle cx="470" cy="159" r="44" fill="#d59b4233" stroke={AMBER} strokeWidth="2" strokeDasharray="6 6"/>
   <path d="M470 120V200M430 160H510" stroke={AMBER}/></g>}
 </g>;
}
function Plan({assembly}:{assembly:AssemblyId}){
 return <g transform="translate(25 5)" strokeLinejoin="round">
  <path d="M470 58C518 104 554 157 554 220V416H386V220C386 157 422 104 470 58Z" fill="#d7e7ee" stroke={EDGE} strokeWidth="3"/>
  <path d="M353 157Q315 202 314 280V457H370V255L391 199Z" fill="#608fa6" stroke={EDGE} strokeWidth="2"/>
  <path d="M587 157Q625 202 626 280V457H570V255L549 199Z" fill="#608fa6" stroke={EDGE} strokeWidth="2"/>
  <path d="M401 236H539M401 356H539M470 58V457" fill="none" stroke="#8badc0" strokeWidth="1.6" strokeDasharray="6 6"/>
  <path d="M427 211H513L498 325H443Z" fill="#86b4c8" stroke="#416e86" strokeWidth="2"/>
  <path d="M447 193H494L485 233H454Z" fill="#335f79" stroke="#416e86"/>
  <path d="M355 455V482M585 455V482M355 471H585" stroke={BLUE} strokeWidth="1.6"/>
  <text x="470" y="502" fontSize="14" fill="#37566a" textAnchor="middle" fontWeight="650">BEAM — TBD</text>
  <text x="650" y="208" fill="#37566a" fontSize="15" fontWeight="650">{assembly==='vessel'?'General arrangement':assembly==='power'?'Energy & propulsion':assembly==='hull'?'Hull & structure':assembly==='autonomy'?'Autonomy suite':'Mission payload'}</text>
  <path d="M555 220H640" fill="none" stroke={BLUE} strokeWidth="1.7"/>
  <path d="M470 58V25" stroke="#7a9bb0" strokeWidth="1.5"/>
  <path d="M463 35l7-10 7 10" stroke="#7a9bb0" strokeWidth="1.5" fill="none"/>
 </g>;
}
function Section({assembly}:{assembly:AssemblyId}){
 return <g>
   <path d="M126 328H842M484 58V463" stroke="#a6bdca" strokeDasharray="8 10"/>
   <path d="M192 184H780L739 224H672L642 414H548L530 224H442L420 414H323L294 224H236Z" fill="#90b5c9" stroke={EDGE} strokeWidth="3"/>
   <path d="M236 224H739M442 224H530M484 184V415" stroke="#d4e8f0" strokeWidth="2" fill="none"/>
   <path d="M294 224 323 414H420L442 224M530 224 548 414H642L672 224" stroke="#527e94" strokeWidth="2" fill="none"/>
   <path d="M192 184V116M780 184V116M192 124H780" stroke={BLUE} strokeWidth="1.4"/>
   <path d="m192 124 10-6v12Zm588 0-10-6v12Z" fill={BLUE}/>
   <text x="486" y="109" fontWeight="750" fill="#335a75" fontSize="15" textAnchor="middle">BEAM TBD · SECTION NOT TO SCALE</text>
   <text x="484" y="482" textAnchor="middle" fontSize="14" fill="#597b8a">No approved dimensions or scantlings</text>
   {assembly==='hull'&&<path d="M294 224 323 414H420L442 224M530 224 548 414H642L672 224" stroke="#c77e24" fill="none" strokeWidth="5"/>}
 </g>;
}
export function VesselBlueprint({view,assembly}:{view:DrawingView;assembly:AssemblyId}){
 return <svg className="at-vessel-svg" viewBox="0 0 960 530" preserveAspectRatio="xMidYMid meet" role="img"
   aria-label={view==='isometric'?'Illustrative isometric twin-hull vessel drawing; not approved CAD':
   view==='plan'?'Illustrative top-down arrangement; no approved dimensions':
   'Illustrative transverse section; no approved scantlings'}>
   <Grid/>
   <rect x="0" y="0" width="960" height="530" fill="#f9fcfd"/>
   <rect x="0" y="0" width="960" height="530" fill="url(#atlas-minor-grid)" opacity=".7"/>
   <rect x="0" y="0" width="960" height="530" fill="url(#atlas-major-grid)" opacity=".55"/>
   <path d="M36 34h36M54 16v36M887 475h36M905 457v36" stroke="#9fbed0" strokeWidth="1.7"/>
   {view==='isometric'?<Iso assembly={assembly}/>:view==='plan'?<Plan assembly={assembly}/>:<Section assembly={assembly}/>}
   <g fontFamily="ui-monospace, Menlo, Consolas, monospace" fontSize="12" fill="#6b8c9f">
    <text x="24" y="510">REFERENCE DIAGRAM · NOT APPROVED CAD</text>
    <text x="934" y="510" textAnchor="end">N / ┼  WORKING CONCEPT</text>
   </g>
 </svg>;
}
