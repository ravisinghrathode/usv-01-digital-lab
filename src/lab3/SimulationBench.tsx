import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, FlaskConical, Gauge, Layers3, Search } from 'lucide-react';
import type { SimulationJob } from '../types/engineering';
import { moduleLink } from './navigation';

interface Props { simulations: readonly SimulationJob[]; sourceLabel:string; compact?:boolean; }
const empty='Not supplied';
const text=(s:string|null|undefined)=>s?.trim()||empty;

export function SimulationBench({simulations,sourceLabel,compact=false}:Props){
  const [active,setActive]=useState<string|null>(null);
  const [filter,setFilter]=useState<string>('all');
  const filtered=useMemo(()=>simulations.filter(s=>filter==='all'||s.discipline===filter),[simulations,filter]);
  const selected=filtered.find(s=>s.id===active)??filtered[0];
  return <section className={'nl-simulation'+(compact?' nl-simulation-compact':'')} aria-label="Simulation workbench">
    <header className="nl-panel-heading">
      <div><h2>Simulation workbench</h2><p>Runs & solver evidence · {sourceLabel}</p></div>
      <a href={moduleLink('simulations')} className="nl-icon-link" aria-label="Open full Simulation Centre" title="Open full Simulation Centre">
        <ArrowUpRight size={18}/>
      </a>
    </header>
    <div className="nl-sim-filters">
      <label htmlFor={compact?'nl-filter-compact':'nl-filter-full'}>Discipline</label>
      <select id={compact?'nl-filter-compact':'nl-filter-full'} value={filter}
        onChange={e=>{setFilter(e.target.value);setActive(null);}}>
        <option value="all">All recorded disciplines</option>
        {Array.from(new Set(simulations.map(s=>s.discipline))).sort().map(d=><option value={d} key={d}>{d}</option>)}
      </select>
    </div>
    <div className="nl-sim-list" aria-label="Loaded simulation records">
      {filtered.length===0&&<div className="nl-sim-empty">
        <FlaskConical size={24}/><strong>No simulation records</strong>
        <p>Change the filter or open the governed simulation register.</p>
      </div>}
      {filtered.map(s=><button className="nl-sim-row" type="button" key={s.id}
        aria-pressed={selected?.id===s.id} onClick={()=>setActive(s.id)}>
        <span className="nl-sim-row-icon"><FlaskConical size={18}/></span>
        <span className="nl-sim-row-label"><strong>{s.name}</strong>
          <small>{s.discipline} · {s.solver||'Solver TBD'}{s.isIllustrative?' · SAMPLE':''}</small></span>
        <span className="nl-run-status">{s.runStatus}</span>
      </button>)}
    </div>
    {selected?<div className="nl-sim-dossier">
      <div className="nl-dossier-head"><h3>Selected simulation</h3>
        <span>{selected.id} {selected.isIllustrative?'· SAMPLE':''}</span></div>
      <dl className="nl-sim-specs">
        <div><dt>Run state</dt><dd>{selected.runStatus}</dd></div>
        <div><dt>Geometry</dt><dd>{text(selected.geometryRevision)}</dd></div>
        <div><dt>Reviewer</dt><dd>{text(selected.reviewer)}</dd></div>
        <div><dt>Validation</dt><dd>{text(selected.validationStatus)}</dd></div>
        {!compact&&<><div><dt>Environment</dt><dd>{text(selected.computeEnvironment)}</dd></div>
          <div><dt>Boundary conditions</dt><dd>{text(selected.boundaryConditions)}</dd></div></>}
      </dl>
      <div className="nl-sim-warning">
        No solver output is visualized until a source-backed, reviewable result is attached.
      </div>
    </div>:<div className="nl-sim-warning">No simulation or solver results can be inferred.</div>}
    {selected&&<div className="nl-sim-result" aria-label="Simulation results availability">
      <div className="nl-sim-result-top"><span>RESULT VIEWER</span><span>NO VERIFIED PLOT</span></div>
      <div className="nl-sim-result-empty">
        <FlaskConical size={25} aria-hidden="true"/>
        <strong>Source-backed result required</strong>
        <p>Geometry, boundary conditions and outputs must be reviewed in the Simulation Centre before displaying performance data.</p>
      </div>
    </div>}
    <div className="nl-simulation-footer">
      <a className="nl-text-link" href={moduleLink('simulations')}>Open Simulation Centre <ArrowUpRight size={15}/></a>
      <span>No solver launched here</span>
    </div>
  </section>;
}
