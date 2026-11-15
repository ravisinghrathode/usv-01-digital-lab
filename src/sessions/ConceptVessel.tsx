import React from 'react';
import type {Perspective} from './model';

export function ConceptVessel({variant,perspective='iso',isolate=false}:{
 variant:'reference'|'candidate';perspective?:Perspective;isolate?:boolean
}){
 const candidate=variant==='candidate';
 const ink=candidate?'#2c6caa':'#537a8e';
 const hull=candidate?'#9ec9da':'#b8d6df';
 return <svg className={'es-vessel-svg'+(isolate?' es-isolated':'')} viewBox="0 0 720 410"
  role="img" aria-label={candidate?'Illustrative lightweight concept; not real CAD':'Illustrative reference vessel; not real CAD'}>
  <defs>
   <linearGradient id={'es-hull-'+variant} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e9f4f7"/><stop offset=".6" stopColor={hull}/><stop offset="1" stopColor="#6b9bac"/></linearGradient>
  </defs>
  <ellipse cx="356" cy="346" rx="268" ry="25" fill="#95b7c4" fillOpacity=".16"/>
  {perspective==='iso'?<g strokeLinejoin="round" strokeLinecap="round">
   <path d="M61 242 181 155 548 156 661 250 552 311 169 312Z" stroke="#37607a" fill={'url(#es-hull-'+variant+')'} strokeWidth="2.2"/>
   <path d="M98 282 163 348 286 353 254 315 169 312Z" fill="#537e94" stroke="#436f85" strokeWidth="2"/>
   <path d="M474 314 536 353 607 316 552 311Z" fill="#507b93" stroke="#436f85" strokeWidth="2"/>
   <path d="M181 155 265 113 489 116 548 156 482 229 264 230Z" fill="#e8f3f6" stroke="#7199aa" strokeWidth="2"/>
   <path d="M269 114 315 85 449 86 489 116 435 157 319 155Z" fill="#bfd7df" stroke="#60899c" strokeWidth="1.7"/>
   <path d="M333 86 350 62 413 62 440 86 408 115 361 115Z" fill="#8bb6c8" stroke="#5e8499" strokeWidth="1.7"/>
   <path d="M370 61V21M398 63V35M416 64l15-28" stroke="#426a81" strokeWidth="2"/>
   <path d="M181 155 264 230 169 312M548 156 482 229 552 311M264 230 482 229" fill="none" stroke="#6b97aa" strokeWidth="1.4"/>
   <path d="M212 265 501 266M176 289 564 292" stroke="#f2f9fa" strokeWidth="1.5" opacity=".7"/>
   {candidate&&<g stroke={ink} strokeWidth="2" fill="none">
    <path d="M156 300 287 307M480 307 560 304"/>
    <path d="M292 151 350 153M423 153 459 150"/>
   </g>}
   {isolate&&<g><path d="M58 241 181 155 548 156 663 251 551 311 169 312Z" stroke="#df9b45" strokeDasharray="8 7" strokeWidth="3" fill="none"/></g>}
  </g>:<g>
   <path d="M355 35Q394 68 408 117L408 338H302L302 117Q315 68 355 35Z" fill="#d8e9ef" stroke={ink} strokeWidth="2.8"/>
   <path d="M288 114Q247 153 245 215V357H283V215L309 146Z" fill="#9ebdcb" stroke={ink} strokeWidth="2"/>
   <path d="M422 114Q463 153 465 215V357H427V215L402 146Z" fill="#9ebdcb" stroke={ink} strokeWidth="2"/>
   <path d="M321 137H388V240H321Z" fill="#9dc8d8" stroke={ink} strokeWidth="1.5"/>
   <path d="M355 35V355M305 260H405M305 313H405" stroke="#7199ad" strokeWidth="1.5" strokeDasharray="5 7"/>
   <path d="M255 363H457" stroke={ink} strokeWidth="1.6"/>
   {isolate&&<path d="M240 110H470V363H240Z" stroke="#df9b45" strokeDasharray="7 6" strokeWidth="2" fill="none"/>}
  </g>}
  <text x="33" y="378" fill="#66889b" fontFamily="ui-monospace, monospace" fontSize="11">
   CONCEPT ART · NOT VERIFIED GEOMETRY
  </text>
  <path d="M600 353h54m-27-26v52" stroke="#94b0c0" strokeWidth="1.2"/>
  <text x="627" y="394" textAnchor="middle" fill="#718e9c" fontSize="11" fontFamily="ui-monospace, monospace">N / TBC</text>
 </svg>;
}
