import React,{useEffect,useMemo,useState} from 'react';
import {getPublicRepositoryDiscovery,type RepositoryDiscoveryFeed} from '../core/intelligence/a26RepositoryPublicFeed';
import {ExternalLink,Search,GitBranch,Clock,ShieldAlert} from 'lucide-react';
import curatedJson from '../../references/repository-scout/2026-11-15-curated.json';
import allJson from '../../references/repository-scout/2026-11-15-all-search-hits.json';
import {ExternalSoftwareRegisterView} from './ExternalSoftwareRegisterView';
import governedRegister from '../data/externalSoftwareRegister.json';

type Curated=typeof curatedJson.records[number];
type Found=typeof allJson.records[number];
type Lane='live'|'curated'|'all'|'legacy';
const url=(value:unknown)=>{
 try {const u=new URL(String(value));return u.protocol==='https:'?u.href:null;}catch{return null;}
};
export const RepositoryResearchView:React.FC=()=>{
 const [lane,setLane]=useState<Lane>('live');
 const [live,setLive]=useState<RepositoryDiscoveryFeed|null>(null);
 const [loadError,setLoadError]=useState('');
 const [synced,setSynced]=useState('');
 const refresh=async()=>{
  try{const next=await getPublicRepositoryDiscovery({force:true});setLive(next);setLoadError('');setSynced(new Date().toLocaleString());}
  catch(e){setLoadError(e instanceof Error?e.message:'Repository feed unavailable');}
 };
 useEffect(()=>{void refresh();const timer=setInterval(()=>{void refresh();},120000);return()=>clearInterval(timer);},[]);
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState('ALL');
 const [page,setPage]=useState(0);
 const rows=lane==='live'?(live?.candidates||[]):lane==='curated'?curatedJson.records:allJson.records;
 const categories=useMemo(()=>lane==='curated'?
  [...new Set(curatedJson.records.map(r=>r.primaryCategory))].sort():
  lane==='live'?[...new Set((live?.candidates||[]).flatMap(r=>r.categories))].sort():
  [...new Set(allJson.records.flatMap(r=>r.categories))].sort(),[lane,live]);
 const filtered=useMemo(()=>{
  const q=query.toLowerCase().trim();
  return rows.filter(r=>{
   const name=('repository' in r?r.repository:r.name);
   const domain='primaryCategory' in r?r.primaryCategory:r.categories.join(' ');
   return (category==='ALL'||('primaryCategory' in r?r.primaryCategory===category:r.categories.includes(category)))&&
      (!q||(name+' '+r.description+' '+domain).toLowerCase().includes(q));
  });
 },[rows,query,category]);
 const totalPages=Math.max(1,Math.ceil(filtered.length/20));
 const currentPage=Math.min(page,totalPages-1);
 const select=(value:Lane)=>{setLane(value);setQuery('');setCategory('ALL');setPage(0);};
 return <section className="mx-auto max-w-7xl space-y-4 p-4 md:p-6" aria-label="Code Repositories">
  <div className="space-y-1">
   <h1 className="text-2xl font-semibold text-slate-100">Code Repositories</h1>
   <p className="text-sm text-slate-300">Actual public engineering code discoveries and the separate governed software catalogue. No USV model records.</p>
  </div>
  <div role="tablist" aria-label="Repository collection layers" className="grid grid-cols-1 gap-2 sm:grid-cols-4">
   {([
    ['live','Latest agent discoveries',live?.candidates.length||0],
    ['curated','Marine candidates',curatedJson.records.length],
    ['all','All discovered repos',allJson.records.length],
    ['legacy','Legacy register',governedRegister.records.length]
   ] as const).map(([id,label,count])=><button key={id} type="button" role="tab"
    aria-selected={lane===id} onClick={()=>select(id)}
    className={'rounded-lg border px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 '+
      (lane===id?'border-cyan-400 bg-cyan-950/40 text-slate-50':'border-slate-700 bg-slate-900 text-slate-200')}>
    <strong className="block text-sm">{label}</strong><span className="text-xs text-slate-300">{count} entries</span>
   </button>)}
  </div>
  {loadError&&<p role="alert" className="rounded border border-amber-800 px-3 py-2 text-xs text-amber-200">Automatic research feed: {loadError}. Existing dated research snapshots remain accessible; no adoption status is implied.</p>}
  {lane==='live'&&<p className="text-xs text-slate-300">{live?'Agent run '+live.runId+' · collected '+live.generatedAt+' · synced '+synced:'Waiting for the first automatic publication to the research-only GitHub branch.'} <button type="button" className="ml-2 text-sky-300 underline" onClick={()=>void refresh()}>Refresh latest feed</button></p>}
  {lane==='legacy'?<div role="tabpanel" aria-label="Legacy governed software catalogue">
   <p className="rounded border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300">
    These {governedRegister.records.length} governed entries are a separate register. They are not the {allJson.records.length} latest search discoveries.
   </p>
   <ExternalSoftwareRegisterView/>
  </div>:<div role="tabpanel" aria-label="Discovered software repositories" className="space-y-4">
   <div className="rounded border border-amber-800/50 bg-slate-900/50 p-3 text-xs leading-5 text-slate-200">
    <ShieldAlert className="mr-2 inline h-4 w-4 text-amber-300"/>
    {lane==='live'?'Automatically published public code discoveries, not security or engineering certification.':lane==='curated'?'Relevance-screened marine or adjacent candidates, NOT software certifications.':'All deduplicated search hits, including irrelevant or unscreened results.'}
    No record is automatically approved, installed, security-audited or valid for engineering use.
   </div>
   <div className="flex flex-wrap gap-3 text-xs text-slate-300">
    <span><Clock className="mr-1 inline h-4 w-4"/>Snapshot: {new Date(lane==='live'?(live?.generatedAt||curatedJson.generatedAt):lane==='curated'?curatedJson.generatedAt:allJson.generatedAt).toLocaleString()}</span>
    <span>24/24 configured queries completed · Global coverage incomplete</span>
    <span>Source revision: {(lane==='live'?(live?.sourceRevision||'PENDING'):lane==='curated'?curatedJson.scoutSourceCommit:allJson.scoutSourceCommit).slice(0,12)}</span>
   </div>
   <div className="flex flex-col gap-2 sm:flex-row">
    <label className="flex flex-1 items-center gap-2 rounded border border-slate-700 bg-slate-950 px-3 py-2">
     <Search className="h-4 w-4 text-slate-400"/>
     <span className="sr-only">Search discovered repositories</span>
     <input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}
      placeholder="Search repository, discipline, description" className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none"/>
    </label>
    <select aria-label="Repository category" value={category} onChange={e=>{setCategory(e.target.value);setPage(0);}}
     className="rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200">
     <option value="ALL">All engineering categories</option>
     {categories.map(c=><option key={c} value={c}>{c}</option>)}
    </select>
   </div>
   <p className="text-xs text-slate-400" aria-live="polite">{filtered.length} matching entries · page {currentPage+1}/{totalPages}</p>
   <div className="space-y-2">
    {filtered.slice(currentPage*20,(currentPage+1)*20).map((record,index)=>{
     const name='repository' in record?record.repository:record.name;
     const categoryLabel='primaryCategory' in record?record.primaryCategory:record.categories.join(', ');
     const source=('source' in record?record.source:null);
     const sourceUrl=source?.provenance?url(source.provenance):null;
     const original=url(record.url);
     return <article key={name+'-'+index} className="rounded border border-slate-700 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
       <div className="min-w-0">
        <h2 className="break-words text-sm font-semibold text-slate-100">{name}</h2>
        <p className="mt-1 text-xs text-slate-400">{categoryLabel}</p>
       </div>
       <span className="text-[10px] text-amber-200">{lane==='live'?'UNVERIFIED · NOT APPROVED':lane==='curated'?'REVIEW REQUIRED':'UNSCREENED'}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-300">{record.description||'No repository description supplied.'}</p>
      {'possibleUsv01Application' in record&&<p className="mt-2 text-xs text-slate-300">
        <strong className="text-slate-200">Possible use:</strong> {record.possibleUsv01Application}
      </p>}
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
       {original&&<a href={original} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">
        Repository <ExternalLink className="inline h-3 w-3"/></a>}
       {sourceUrl&&<a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">
        Pinned source <GitBranch className="inline h-3 w-3"/></a>}
       <span className="text-slate-400">License: {'license' in record?record.license.spdxMetadata:record.licenseSpdx||'Not identified'}</span>
       {'researchPriority' in record&&<span className="text-slate-400">Research priority: {record.researchPriority}</span>}
      </div>
     </article>;
    })}
    {!filtered.length&&<p className="rounded border border-slate-700 p-4 text-sm text-slate-300">No matching repositories.</p>}
   </div>
   <div className="flex justify-between gap-3">
    <button type="button" disabled={currentPage===0} onClick={()=>setPage(p=>Math.max(0,p-1))}
     className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-200 disabled:opacity-40">Previous</button>
    <button type="button" disabled={currentPage+1>=totalPages} onClick={()=>setPage(p=>p+1)}
     className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-200 disabled:opacity-40">Next</button>
   </div>
  </div>}
 </section>;
};
