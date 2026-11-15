import React from 'react';

/** A diagram, not authoritative hull geometry. No dimensions are inferred. */
export function ConceptVessel({ section=false }: {section?:boolean}) {
  if(section)return <svg className="d2-concept" viewBox="0 0 680 360" role="img"
    aria-label="Illustrative transverse section of a twin-hull concept, without dimensions">
    <path d="M43 256H635M340 34V333" stroke="#69b8ce" opacity=".6" strokeWidth="2" strokeDasharray="7 9"/>
    <path d="M86 129H594L553 169 509 170 490 288 440 318H380L361 170H319L300 318H240L188 287 168 170H127Z"
      fill="#214e67" stroke="#b0deed" strokeWidth="3"/>
    <path d="M86 129H594M127 170H553M340 129V318" stroke="#a6dbe9" opacity=".75" strokeWidth="2"/>
    <path d="M168 170 188 287 240 318 300 318M509 170 490 288 440 318 380 318"
      stroke="#72c4dc" strokeWidth="2" fill="none"/>
    <path d="M86 129V76M594 129V76M86 89H594" stroke="#9bcbdc" strokeWidth="1.5"/>
    <text x="340" y="74" textAnchor="middle" fontSize="16" fill="#d3eff9" fontFamily="ui-monospace,monospace">BEAM: TBD</text>
    <text x="340" y="348" textAnchor="middle" fontSize="12" fill="#9dc8d8">ILLUSTRATIVE SECTION — NOT TO SCALE</text>
  </svg>;
  return <svg className="d2-concept" viewBox="0 0 800 420" role="img"
    aria-label="Conceptual perspective diagram of an unmanned surface vessel, not engineering CAD">
    <defs>
      <linearGradient id="d2-stroke-hull" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#43849e"/><stop offset=".5" stopColor="#275b77"/><stop offset="1" stopColor="#10364e"/>
      </linearGradient>
      <linearGradient id="d2-stroke-deck" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#a1cbd9"/><stop offset="1" stopColor="#356e83"/>
      </linearGradient>
    </defs>
    <ellipse cx="395" cy="332" rx="296" ry="32" fill="#63cfe2" opacity=".085"/>
    <path d="M64 239 202 164 586 165 749 250 657 300 164 303Z"
      fill="url(#d2-stroke-hull)" stroke="#9bcedf" strokeWidth="2.8"/>
    <path d="M102 270 181 334 354 342 335 302 164 303Z" fill="#143e53" stroke="#81bed1" strokeWidth="2"/>
    <path d="M482 303 577 339 690 305 657 300Z" fill="#123b51" stroke="#81bed1" strokeWidth="2"/>
    <path d="M201 164 278 120 526 121 586 165 520 221 283 218Z"
      fill="url(#d2-stroke-deck)" stroke="#c2e4ee" strokeWidth="2.5"/>
    <path d="M279 120 341 76 469 77 527 120 463 160 344 160Z"
      fill="#2b6680" stroke="#b3ddea" strokeWidth="2.3"/>
    <path d="M350 77 372 43 440 43 470 77 432 106 381 106Z"
      fill="#2a6480" stroke="#c7e8f3" strokeWidth="2"/>
    <path d="M385 43V15M416 43V6M441 43 453 22" stroke="#c1e8f3" strokeWidth="2.2"/>
    <path d="M299 144 350 146 382 164 335 167ZM422 148 466 149 492 165 448 166Z"
      fill="#70d8ee" fillOpacity=".25" stroke="#a2e1ed" strokeWidth="1.5"/>
    <path d="M202 164 283 218 164 303M586 165 520 221 657 300M283 218 520 221M106 257 192 279 348 285M470 282 659 283"
      stroke="#a4d6e3" strokeWidth="1.8" opacity=".7"/>
    <path d="M279 120 344 160 463 160 527 120" stroke="#d1edf4" strokeWidth="1.3" opacity=".5"/>
    <path d="M184 304 354 315 483 309 658 301" stroke="#bee6ef" strokeWidth="1.3" strokeDasharray="6 8" opacity=".65"/>
    <g stroke="#9dd3e0" strokeWidth="1.1" opacity=".35">
      <path d="M204 230 226 302M276 230 290 304M349 234 355 306M421 232 432 308M490 232 513 303M562 230 598 298"/>
      <path d="M111 278 685 278M168 254 654 254"/>
    </g>
    <path d="M71 367h56M99 338v57M675 367h56M704 338v57" stroke="#64b6d3" strokeWidth="1.5"/>
  </svg>;
}
