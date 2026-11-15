import React,{useEffect,useMemo,useState} from 'react';
import {getPublicA26ReviewFeed,type A26PublicFeed} from '../core/intelligence/a26PublicResearchFallback';
import {authenticatedFetch} from '../core/auth/authClient';
import {GlobalUsvFleetView} from './GlobalUsvFleetView';
type Feed=Pick<A26PublicFeed,'vessels'|'leads'|'sourceRevision'|'runId'|'sourceUrl'>;
type Mode='models'|'seeded'|'leads';
const FIELDS=['length','beam','draft','displacement','hull','propulsion','speed','range','endurance','payload','communications','autonomy','launchRecovery','status'];
function https(v:unknown){try{const u=new URL(String(v));return u.protocol==='https:'?u.href:null;}catch{return null;}}
export const UsvModelsLiveView:React.FC<{onAskAi?:(prompt:string,record?:any)=>void}>=({onAskAi})=>{
 const [feed,setFeed]=useState<Feed|null>(null),[error,setError]=useState(''),[synced,setSynced]=useState('');
 const [mode,setMode]=useState<Mode>('models'),[search,setSearch]=useState(''),[country,setCountry]=useState('ALL');
 const [page,setPage]=useState(0),[selected,setSelected]=useState<string|null>(null);
 const refresh=async()=>{
  try{
   let source:any;
   try{
    const r=await authenticatedFetch('/api/usv-intel/research-feed');
    if(r.status===401||r.status===403)throw Error('A26_AUTH_REQUIRED');
    if(!r.ok||!(r.headers.get('content-type')||'').includes('application/json'))throw Error('A26_NO_BACKEND');
    source=await r.json();
    if(source.success!==true||source.engineeringReleaseApproved!==false||
     source.researchStatus!=='UNVERIFIED_PUBLIC_RESEARCH'||!Array.isArray(source.vessels)||
     !Array.isArray(source.leads))throw Error('A26_INVALID_BACKEND');
   }catch(e){
    if(e instanceof Error&&e.message==='A26_AUTH_REQUIRED')throw e;
    source=await getPublicA26ReviewFeed({force:true});
   }
   setFeed(source);setError('');setSynced(new Date().toLocaleString());
  }catch(e){setError(e instanceof Error?e.message:'Source unavailable');}
 };
 useEffect(()=>{void refresh();const id=setInterval(()=>{void refresh();},120000);return()=>clearInterval(id);},[]);
 useEffect(()=>{setSearch('');setCountry('ALL');setPage(0);setSelected(null);},[mode]);
 const countries=useMemo(()=>['ALL',...new Set((feed?.vessels||[]).map(v=>v.country).filter(Boolean))],[feed]);
 const rows=mode==='models'?feed?.vessels||[]:feed?.leads||[];
 const filtered=rows.filter(r=>{
  const name='model' in r?r.model+' '+r.manufacturer+' '+r.country:r.title+' '+r.summary;
  return (country==='ALL'||('country' in r&&r.country===country))&&name.toLowerCase().includes(search.toLowerCase());
 });
 const pages=Math.max(1,Math.ceil(filtered.length/20)),p=Math.min(page,pages-1);
 const active=feed?.vessels.find(v=>v.id===selected)||null;
 return <section aria-label="USV Models" className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
  <header className="space-y-1">
   <h1 className="text-2xl font-semibold text-slate-100">USV Models & Prototypes</h1>
   <p className="text-sm text-slate-300">Browse every currently collected model identity, country, manufacturer, technical claim and original source. Missing specifications are TBD.</p>
   <p className="text-xs text-amber-200">PUBLIC_SOURCE_SAFE_ONLY · UNVERIFIED · Engineering approval: false · Not globally exhaustive</p>
  </header>
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
   {([['models','New source-linked USV models',feed?.vessels.length||0],
      ['seeded','Original detailed models',14],['leads','Discovery research leads',feed?.leads.length||0]] as const).map(([id,label,count])=>
    <button type="button" aria-pressed={mode===id} onClick={()=>setMode(id)} key={id}
     className={'rounded-lg border px-4 py-3 text-left '+(mode===id?'border-cyan-400 bg-cyan-950/50 text-white':'border-slate-700 bg-slate-900 text-slate-200')}>
     <strong className="block text-sm">{label}</strong><span className="text-xs text-slate-300">{count} entries</span>
    </button>)}
  </div>
  {mode==='seeded'?<div className="space-y-2">
   <p className="rounded border border-amber-800 p-3 text-xs text-amber-200">Original 14 seeded technical profiles, including deep vessel specifications, are retained for reference. Their reported values remain independently unverified.</p>
   <GlobalUsvFleetView onAskAi={onAskAi} hideA26Research/>
  </div>:<div className="space-y-4">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <p className="text-xs text-slate-300">{feed?String(feed.vessels.length)+' source-linked vessel identities · '+String(feed.leads.length)+' research leads':'Loading current research records'} · Last sync: {synced||'Pending'}</p>
    <button type="button" onClick={()=>void refresh()} className="rounded border border-sky-500/40 px-3 py-2 text-xs text-sky-200">Refresh GitHub evidence</button>
   </div>
   {error&&<p role="alert" className="rounded border border-amber-800 p-3 text-xs text-amber-200">{error} · Previously loaded records remain visible</p>}
   {feed&&<p className="text-[11px] text-slate-400">Source revision: {feed.sourceRevision.slice(0,12)} ·
    <a href={https(feed.sourceUrl)||'#'} target="_blank" rel="noopener noreferrer" className="ml-2 text-sky-300 underline">Review branch</a>
    <a href={'https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/'+feed.runId}
     target="_blank" rel="noopener noreferrer" className="ml-2 text-sky-300 underline">Evidence run</a>
   </p>}
   <div className="flex flex-wrap gap-2">
    <input type="search" aria-label="Search USV records" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}
     placeholder="Search model, country, manufacturer or discovery" className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100"/>
    {mode==='models'&&<select aria-label="Country filter" value={country} onChange={e=>{setCountry(e.target.value);setPage(0);}}
     className="rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200">
     {countries.map(c=><option key={c} value={c}>{c==='ALL'?'All countries':c}</option>)}
    </select>}
   </div>
   <p className="text-xs text-slate-400" aria-live="polite">{filtered.length} matches · page {p+1}/{pages}</p>
   <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
    {filtered.slice(p*20,(p+1)*20).map(item=>'model' in item?
     <button key={item.id} type="button" aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}
      className={'rounded border p-4 text-left '+(selected===item.id?'border-cyan-400 bg-slate-800':'border-slate-700 bg-slate-900/60')}>
      <span className="text-xs text-sky-300">{item.country||'Country TBD'}</span>
      <h2 className="mt-1 text-base font-semibold text-slate-100">{item.model}</h2>
      <p className="text-xs text-slate-300">{item.manufacturer||'Manufacturer TBD'}</p>
      <p className="mt-2 text-xs text-amber-200">Identity corroborated · {item.claims.length} public specification claims · unreviewed</p>
      <p className="mt-2 text-xs text-sky-300 underline">Inspect technical record</p>
     </button>:
     <article key={item.id} className="rounded border border-slate-700 bg-slate-900/60 p-4">
      <h2 className="text-sm font-semibold text-slate-100">{item.title||item.id}</h2>
      <p className="mt-1 text-xs text-slate-300">{item.summary}</p>
      <p className="mt-1 text-xs text-amber-200">Discovery lead, not a distinct confirmed USV model</p>
      {item.sources.map((s,i)=>https(s.url)&&<a key={i} href={s.url!} target="_blank" rel="noopener noreferrer"
       className="mr-2 text-xs text-sky-300 underline">Source {i+1}</a>)}
     </article>)}
   </div>
   <div className="flex justify-between">
    <button type="button" disabled={p===0} onClick={()=>setPage(v=>Math.max(0,v-1))}
     className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-200 disabled:opacity-40">Previous</button>
    <button type="button" disabled={p+1>=pages} onClick={()=>setPage(v=>v+1)}
     className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-200 disabled:opacity-40">Next</button>
   </div>
   {mode==='models'&&active&&<section aria-label="Vessel technical specifications" className="space-y-3 rounded border border-cyan-700 bg-slate-900 p-4">
    <h2 className="text-xl font-semibold text-slate-100">{active.model} — Technical Record</h2>
    <p className="text-xs text-slate-300">Country: {active.country||'TBD'} · Manufacturer: {active.manufacturer||'TBD'} · Operational/prototype status: unverified</p>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
     {FIELDS.map(field=>{
      const claims=active.claims.filter(c=>c.field.toLowerCase()===field.toLowerCase());
      return <div key={field} className="rounded border border-slate-700 bg-slate-950 p-3">
       <p className="text-[11px] capitalize text-slate-400">{field.replace(/([A-Z])/g,' $1')}</p>
       <p className="mt-1 text-sm font-semibold text-slate-100">{claims.length?claims.map(c=>c.value).join(' · '):'TBD'}</p>
       <p className="mt-1 text-[10px] text-amber-200">{claims.length?'Public quotation · unreviewed':'No reviewed source value'}</p>
      </div>;
     })}
    </div>
    <h3 className="text-sm font-semibold text-slate-100">Every acquired specification and source quotation</h3>
    {active.claims.map((c,i)=><div key={i} className="rounded border border-slate-700 p-3 text-xs">
     <p className="text-slate-200"><strong>{c.field}:</strong> {c.value}</p>
     {c.quotation&&<p className="mt-1 text-slate-400">“{c.quotation}”</p>}
     {https(c.sourceUrl)&&<a href={c.sourceUrl!} target="_blank" rel="noopener noreferrer"
      className="text-sky-300 underline">Original quoted source</a>}
    </div>)}
    {!active.claims.length&&<p className="text-xs text-amber-200">No sourced engineering particulars yet. All unreported fields remain TBD.</p>}
    <h3 className="text-sm font-semibold text-slate-100">Public provenance</h3>
    {active.sources.map((s,i)=>https(s.url)&&<a key={i} href={s.url!} target="_blank" rel="noopener noreferrer"
     className="mr-3 text-xs text-sky-300 underline">Source {i+1}</a>)}
   </section>}
  </div>}
 </section>;
};
