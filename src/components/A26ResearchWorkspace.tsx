import React, {useCallback,useEffect,useMemo,useState} from 'react';
import {Anchor,ExternalLink,RefreshCw,Search} from 'lucide-react';
import {authenticatedFetch} from '../core/auth/authClient';
import {getPublicA26ReviewFeed,type A26PublicFeed} from '../core/intelligence/a26PublicResearchFallback';
import {GlobalUsvFleetView} from './GlobalUsvFleetView';
import {ExternalSoftwareRegisterView} from './ExternalSoftwareRegisterView';

export type A26ResearchTab='global-usv-fleet'|'scientific-knowledge'|'external-software';
const tabs:ReadonlyArray<{id:A26ResearchTab;label:string;detail:string}>=[
  {id:'global-usv-fleet',label:'USV Intelligence',detail:'Fleet leads and vessel source evidence'},
  {id:'scientific-knowledge',label:'Scientific Knowledge',detail:'Scholarly publications and engineering research'},
  {id:'external-software',label:'Code Repositories',detail:'Protected catalogue and separate repository discovery'}
];
type Feed=Pick<A26PublicFeed,'leads'|'publications'|'vessels'|'runId'|'sourceRevision'|'sourceUrl'>;
type State='LOADING'|'READY'|'UNAVAILABLE'|'AUTH_REQUIRED';
interface Props{initialTab:'global-usv-fleet'|'external-software';onAskAi?:(prompt:string,record?:any)=>void;}
const safeUrl=(input:unknown)=>{
 try{if(typeof input!=='string')return null;const u=new URL(input);return u.protocol==='https:'?u.href:null;}
 catch{return null;}
};
export const A26ResearchWorkspace:React.FC<Props>=({initialTab,onAskAi})=>{
 const [tab,setTab]=useState<A26ResearchTab>(initialTab);
 useEffect(()=>setTab(initialTab),[initialTab]);
 const [feed,setFeed]=useState<Feed|null>(null);
 const [state,setState]=useState<State>('LOADING');
 const [message,setMessage]=useState('');
 const [syncedAt,setSyncedAt]=useState('');
 const [query,setQuery]=useState('');
 const [page,setPage]=useState(0);
 const [kind,setKind]=useState<'leads'|'vessels'>('leads');
 const [legacy,setLegacy]=useState(false);
 const refresh=useCallback(async()=>{
  try{
   let data:any;
   try{
    const response=await authenticatedFetch('/api/usv-intel/research-feed');
    if(response.status===401||response.status===403)throw Error('A26_AUTH_REQUIRED');
    if(!response.ok||!(response.headers.get('content-type')||'').includes('application/json'))throw Error('A26_NO_BACKEND');
    data=await response.json();
    if(data.success!==true||data.engineeringReleaseApproved!==false||
      data.researchStatus!=='UNVERIFIED_PUBLIC_RESEARCH'||!Array.isArray(data.leads)||
      !Array.isArray(data.publications)||!Array.isArray(data.vessels))throw Error('A26_INVALID_BACKEND_FEED');
   }catch(e){
    if(e instanceof Error&&e.message==='A26_AUTH_REQUIRED')throw e;
    data=await getPublicA26ReviewFeed({force:true});
   }
   setFeed(data);setState('READY');setMessage('');setSyncedAt(new Date().toLocaleString());
  }catch(e){
   setState(e instanceof Error&&e.message==='A26_AUTH_REQUIRED'?'AUTH_REQUIRED':'UNAVAILABLE');
   setMessage(e instanceof Error?e.message:'Research feed unavailable');
  }
 },[]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{void refresh();},120000);
  return()=>clearInterval(timer);},[refresh]);
 useEffect(()=>{setQuery('');setPage(0);},[tab,kind]);
 const records=tab==='global-usv-fleet'?(kind==='leads'?feed?.leads:feed?.vessels):
   tab==='scientific-knowledge'?feed?.publications:null;
 const filtered=useMemo(()=>{
  const rows=records||[];const q=query.toLowerCase().trim();
  return q?rows.filter(r=>(r.id+' '+('title' in r?r.title:r.model+' '+r.manufacturer+' '+r.country)).toLowerCase().includes(q)):rows;
 },[records,query]);
 const totalPages=Math.max(1,Math.ceil(filtered.length/20));
 const currentPage=Math.min(page,totalPages-1);
 return <section aria-label="A26 research workspace" className="mx-auto max-w-7xl space-y-4 px-4 py-5 md:px-6">
  <header className="space-y-1">
   <p className="font-mono text-xs uppercase tracking-wider text-sky-300">A26 · Research intelligence</p>
   <h1 className="text-2xl font-semibold text-slate-100">Research & Knowledge Repositories</h1>
   <p className="text-sm text-slate-300">Three independent data categories. Public discoveries are not approved engineering evidence.</p>
  </header>
  <div role="tablist" aria-label="Research data categories" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
   {tabs.map(t=><button key={t.id} type="button" role="tab" aria-selected={tab===t.id}
    onClick={()=>setTab(t.id)}
    className={'rounded-lg border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 '+
      (tab===t.id?'border-cyan-400 bg-cyan-950/40 text-slate-50':'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500')}>
    <span className="block text-sm font-semibold">{t.label}</span>
    <span className="mt-1 block text-xs text-slate-300">{t.detail}</span>
   </button>)}
  </div>
  {tab==='external-software'?<div role="tabpanel" aria-label="Code Repositories">
   <div className="rounded-lg border border-amber-900/50 bg-slate-900/70 p-3 text-xs leading-5 text-slate-300">
    The 90-record repository catalogue is a protected, existing register. Fresh code-repository discovery has not been verified.
    No scholarly publications or USV platforms are counted as code repositories.
   </div>
   <ExternalSoftwareRegisterView/>
  </div>:<div role="tabpanel" aria-label={tab==='global-usv-fleet'?'USV Intelligence':'Scientific Knowledge'}
    className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
   <div className="flex flex-wrap justify-between gap-3">
    <div className="space-y-1">
     <h2 className="text-lg font-semibold text-slate-100">{tab==='global-usv-fleet'?'Worldwide USV intelligence':'Scientific publication library'}</h2>
     <p className="text-xs text-slate-300">
      {feed?(tab==='global-usv-fleet'?feed.leads.length+' fleet leads · '+feed.vessels.length+' vessel source records':
       feed.publications.length+' scholarly publication records'):'Research records not loaded'}
     </p>
     <p className="text-xs text-amber-200">PUBLIC_SOURCE_SAFE_ONLY · UNVERIFIED · Engineering approval: no</p>
     {feed&&<p className="text-[11px] text-slate-400">Source revision {feed.sourceRevision.slice(0,12)} · Last sync {syncedAt}</p>}
    </div>
    <button type="button" onClick={()=>{void refresh();}}
     className="inline-flex items-center gap-2 self-start rounded border border-sky-400/50 px-3 py-2 text-xs text-sky-200">
     <RefreshCw className="h-4 w-4"/>Refresh data
    </button>
   </div>
   {state==='LOADING'&&<p role="status" className="text-xs text-slate-300">Loading A26 evidence…</p>}
   {(state==='UNAVAILABLE'||state==='AUTH_REQUIRED')&&<p role="alert" className="rounded border border-amber-800 p-3 text-xs text-amber-200">
    {state==='AUTH_REQUIRED'?'Lab authentication required. Access denial cannot be bypassed.':
     'Research unavailable ('+message+'). Previously loaded records are preserved.'}
   </p>}
   {feed&&<div className="flex flex-wrap gap-3 text-xs">
    {safeUrl(feed.sourceUrl)&&<a className="text-sky-300 underline" href={feed.sourceUrl} target="_blank" rel="noopener noreferrer">Review source <ExternalLink className="inline h-3 w-3"/></a>}
    {(/^\d+$/.test(feed.runId))&&<a className="text-sky-300 underline" target="_blank" rel="noopener noreferrer"
     href={'https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/'+feed.runId}>Collection run {feed.runId}</a>}
   </div>}
   {tab==='global-usv-fleet'&&<div role="group" aria-label="USV evidence type" className="flex flex-wrap gap-2">
    {(['leads','vessels'] as const).map(k=><button key={k} type="button" aria-pressed={kind===k}
     onClick={()=>setKind(k)}
     className={'rounded border px-3 py-2 text-xs '+(kind===k?'border-cyan-400 bg-cyan-950 text-slate-100':'border-slate-700 text-slate-300')}>
     {k==='leads'?'Fleet discovery leads':'Platform evidence'} ({feed?feed[k].length:0})
    </button>)}
   </div>}
   <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-3 py-2">
    <Search className="h-4 w-4 text-slate-400"/>
    <span className="sr-only">Search current research tab</span>
    <input type="search" placeholder="Search current records" value={query}
     onChange={e=>{setQuery(e.target.value);setPage(0);}}
     className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"/>
   </label>
   <p className="text-xs text-slate-400" aria-live="polite">{filtered.length} matching records · Page {currentPage+1} of {totalPages}</p>
   <div className="max-h-[620px] space-y-2 overflow-y-auto">
    {filtered.slice(currentPage*20,(currentPage+1)*20).map(r=>{
     const links='sources' in r?r.sources.map(s=>s.url):[r.doi,r.sourceUrl,r.pdfUrl];
     const urls=links.map(safeUrl).filter((url):url is string=>Boolean(url)).slice(0,4);
     return <article key={r.id} className="rounded border border-slate-700 bg-slate-950/70 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
       <h3 className="text-sm font-semibold text-slate-100">{'title' in r?r.title:r.model}</h3>
       <span className="text-[10px] text-amber-200">UNVERIFIED</span>
      </div>
      <p className="mt-1 break-all font-mono text-[10px] text-slate-400">{r.id}</p>
      {'country' in r&&<p className="mt-1 text-xs text-slate-300">{r.country} · {r.manufacturer}</p>}
      {'summary' in r&&r.summary&&<p className="mt-1 text-xs text-slate-300">{r.summary}</p>}
      <div className="mt-2 flex flex-wrap gap-3">
       {urls.map((url,i)=><a key={url+i} href={url} target="_blank" rel="noopener noreferrer"
        className="text-xs text-sky-300 underline">Source {i+1}</a>)}
       {!urls.length&&<span className="text-xs text-amber-300">No source link supplied</span>}
      </div>
     </article>;
    })}
    {state==='READY'&&!filtered.length&&<p className="p-3 text-xs text-slate-400">No records match the current query.</p>}
   </div>
   <div className="flex justify-between">
    <button disabled={currentPage===0} type="button" onClick={()=>setPage(p=>Math.max(0,p-1))}
     className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-200 disabled:opacity-40">Previous</button>
    <button disabled={currentPage+1>=totalPages} type="button" onClick={()=>setPage(p=>p+1)}
     className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-200 disabled:opacity-40">Next</button>
   </div>
   {tab==='global-usv-fleet'&&<div className="border-t border-slate-700 pt-4">
    <button type="button" aria-expanded={legacy} onClick={()=>setLegacy(v=>!v)}
     className="inline-flex items-center gap-2 text-xs text-sky-200 underline">
     <Anchor className="h-4 w-4"/>{legacy?'Hide':'Open'} original fleet comparisons and seeded catalogue
    </button>
    {legacy&&<GlobalUsvFleetView onAskAi={onAskAi} hideA26Research/>}
   </div>}
  </div>}
 </section>;
};
