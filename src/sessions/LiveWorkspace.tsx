import React,{useEffect,useState} from 'react';
import {ArrowRight,ArrowUpRight,BookOpen,Box,FileCheck2,FlaskConical,FolderOpen,LockKeyhole,RefreshCw,ShieldAlert,ShieldCheck} from 'lucide-react';
import type {Snapshot} from '../dockyard2/domain';
import type {SnapshotStatus} from '../dockyard2/useSnapshot';
import type {CadRevision,Requirement,SimulationJob} from '../types/engineering';
import type {ApproverIdentity} from '../core/types/safety';
import {authenticatedFetch,login} from '../core/auth/authClient';
import {linkedEvidence,legacyModuleUrl} from '../dockyard2/domain';
import type {Mode} from './model';

// The authenticated server owns all record state. The existing demonstration
// remains separately selectable; no sample is substituted for missing data.
type Props={
 mode:Mode;snapshot:Snapshot;status:SnapshotStatus;error:string;
 user:ApproverIdentity|null;onRefresh:()=>void;changeMode:(mode:Mode)=>void;
};
const ENGINEERING_WRITERS=new Set([
 'ENGINEERING_DIRECTOR','LEAD_SYSTEMS_ENGINEER','NAVAL_ARCHITECT',
 'STRUCTURAL_ENGINEER','ELECTRICAL_ENGINEER'
]);
function field(value:unknown):string{
 const text=typeof value==='string'?value.trim():'';
 return text && !/^(tbd|none|n\/a|not available|unknown|unassigned)$/i.test(text)?text:'Not established';
}
function safeHttps(url:string|undefined):string|null{
 if(!url)return null;
 try{const value=new URL(url);return value.protocol==='https:'&&!value.username&&!value.password?value.href:null}
 catch{return null}
}
function Source({id,children}:{id:Parameters<typeof legacyModuleUrl>[0];children:React.ReactNode}){
 return <a className="v2-source-link" href={legacyModuleUrl(id)}>{children}<ArrowUpRight size={15}/></a>;
}
function Unavailable({title,detail,source}:{title:string;detail:string;source?:Parameters<typeof legacyModuleUrl>[0]}){
 return <section className="lv-empty"><FolderOpen size={27}/><strong>{title}</strong><p>{detail}</p>
  {source&&<Source id={source}>Open governed register</Source>}</section>;
}
function Row({label,value}:{label:string;value:unknown}){
 return <div className="lv-row"><dt>{label}</dt><dd>{typeof value==='string'?field(value):String(value??'Not established')}</dd></div>;
}
function RecordLink({module,id}:{module:Parameters<typeof legacyModuleUrl>[0];id:string}){
 return <a href={legacyModuleUrl(module)} className="lv-source-id" title="Open the governed register; this link does not approve or certify the record">{id}<ArrowUpRight size={13}/></a>;
}
function LoginRequired(){
 const [userId,setUserId]=useState('');
 const [passphrase,setPassphrase]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const authenticate=async(e:React.FormEvent)=>{
  e.preventDefault();setError('');setBusy(true);
  try{await login(userId.trim(),passphrase);}
  catch(err){setError(err instanceof Error?err.message:'Authentication unsuccessful')}
  finally{setBusy(false);setPassphrase('');}
 };
 return <section className="lv-auth" aria-label="Authenticated engineering data required">
  <div><span className="lv-eyebrow">SOURCE ACCESS REQUIRED</span><h2>Open the real engineering workspace.</h2>
   <p>Engineering Sessions now starts from the authenticated project store. Sign in with your provisioned staff credentials to view CAD revision references, simulation cases, engineering requirements, and governed project notes. No sample data is displayed as live evidence.</p>
   <Source id="overview">Open original governed lab</Source>
  </div>
  <form className="lv-form" onSubmit={authenticate}>
   <h3>Staff sign in</h3>
   <label>Staff ID<input type="text" autoComplete="username" required maxLength={100} value={userId} onChange={e=>setUserId(e.target.value)}/></label>
   <label>Passphrase<input type="password" autoComplete="current-password" required value={passphrase} onChange={e=>setPassphrase(e.target.value)}/></label>
   {error&&<p className="lv-error" role="alert">{error}</p>}
   <button type="submit" className="v2-solid" disabled={busy}>{busy?'Verifying…':'Open authenticated workspace'}<ArrowRight size={16}/></button>
   <small>Authentication and permissions are verified by the existing USV-01 server.</small>
  </form>
 </section>;
}
const isReal=<T extends {isIllustrative:boolean}>(r:T)=>r.isIllustrative===false;

export default function LiveWorkspace({mode,snapshot,status,error,user,onRefresh,changeMode}:Props){
 const [cad,setCad]=useState<CadRevision[]>([]);
 const [cadError,setCadError]=useState('');
 const [cadRevision,setCadRevision]=useState(0);
 const [cadA,setCadA]=useState('');
 const [cadB,setCadB]=useState('');
 const [caseId,setCaseId]=useState('');
 const [requirementId,setRequirementId]=useState('');
 const [saveError,setSaveError]=useState('');
 const [saveMessage,setSaveMessage]=useState('');
 const [saving,setSaving]=useState(false);
 const [cadDraft,setCadDraft]=useState({title:'',revision:'',fileLabel:'',sourceUrl:'',sourceSha256:'',notes:''});
 const [noteTitle,setNoteTitle]=useState('');
 const [noteBody,setNoteBody]=useState('');
 const canWrite=Boolean(user&&ENGINEERING_WRITERS.has(user.role));
 useEffect(()=>{
  if(!user||status!=='connected'){setCad([]);setCadError('');return;}
  let active=true;
  setCadError('');
  authenticatedFetch('/api/data/cad_revisions').then(async response=>{
   if(!response.ok)throw Error('CAD source register unavailable (HTTP '+response.status+').');
   const body=await response.json();
   if(!body.success||!Array.isArray(body.data))throw Error('Invalid CAD source register response.');
   if(active)setCad(body.data.filter((r:CadRevision)=>r.isIllustrative===false));
  }).catch(e=>{if(active){setCad([]);setCadError(e instanceof Error?e.message:'CAD source register unavailable.');}});
  return()=>{active=false};
 },[user,status,cadRevision]);
 const requirements=snapshot.requirements.filter(isReal);
 const simulations=snapshot.simulations.filter(isReal);
 const risks=snapshot.risks.filter(isReal);
 const decisions=snapshot.decisions.filter(isReal);
 const plans=snapshot.plans.filter(isReal);
 const tests=snapshot.tests.filter(isReal);
 const projectNotes=snapshot.notes.filter(n=>n.id.startsWith('SES-NOTE-'));
 const chosenCase=simulations.find(x=>x.id===caseId)??simulations[0];
 const chosenRequirement=requirements.find(x=>x.id===requirementId)??requirements[0];
 const selectedA=cad.find(c=>c.id===cadA);
 const selectedB=cad.find(c=>c.id===cadB);
 const register=async(endpoint:string,payload:unknown)=>{
  setSaving(true);setSaveError('');setSaveMessage('');
  try{
   const res=await authenticatedFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const json=await res.json().catch(()=>({}));
   if(!res.ok||!json.success)throw Error(json.error||'Record could not be saved (HTTP '+res.status+').');
   setSaveMessage('Unverified draft saved to the authenticated project store. Human review remains required.');
   setCadRevision(x=>x+1);onRefresh();
   return true;
  }catch(e){setSaveError(e instanceof Error?e.message:'Save rejected');return false;}
  finally{setSaving(false);}
 };
 if(!user)return <LoginRequired/>;
 if(status==='loading'||status==='illustrative')return <Unavailable title="Loading authenticated project registers" detail="Waiting for the verified session and the project snapshot; illustrative seed records are not displayed."/>;
 if(status!=='connected')return <Unavailable title="Authenticated project data unavailable" detail={error||'The engineering source cannot be read. No sample values have been substituted.'} source="overview"/>;

 const intro=(label:string,title:string,description:string,source?:Parameters<typeof legacyModuleUrl>[0])=>
  <header className="v2-scene-intro"><div><span className="v2-eyebrow">{label} / AUTHENTICATED PROJECT STORE</span><h2>{title}</h2><p>{description}</p></div>
   {source&&<Source id={source}>Open governed workspace</Source>}</header>;
 const metrics=[
  {label:'Registered CAD pointers',value:cad.length,mode:'design' as Mode},
  {label:'Engineering requirements',value:requirements.length,mode:'decide' as Mode},
  {label:'Simulation runs',value:simulations.length,mode:'experiment' as Mode},
  {label:'Verification plans',value:plans.length,mode:'decide' as Mode},
  {label:'Unverified session notes',value:projectNotes.length,mode:'notebook' as Mode}
 ];
 return <section className="v2-scene lv-scene" aria-label="Live engineering project workspace">
  <div className="lv-provenance"><FileCheck2 size={17}/><strong>Authenticated project registers</strong><span>Signed in: {user.userName} · {user.role}</span><button type="button" onClick={()=>{onRefresh();setCadRevision(x=>x+1);}}><RefreshCw size={15}/> Refresh records</button></div>
  {mode==='worktable'&&<>
   {intro('PROJECT WORKTABLE / 01','USV-01 · Live project worktable','Review source-backed records and missing evidence. The source register is not a certified design baseline.','overview')}
   <div className="lv-metrics">{metrics.map(m=><button type="button" key={m.label} onClick={()=>changeMode(m.mode)}><span>{m.label}</span><strong>{m.value}</strong><small>Open workspace <ArrowRight size={13}/></small></button>)}</div>
   <div className="lv-columns"><article className="lv-panel"><h3>Engineering requirements</h3>
    {requirements.length?requirements.slice(0,7).map(r=><div className="lv-record" key={r.id}><RecordLink module="traceability" id={r.id}/><strong>{r.title}</strong><small>Rev {field(r.revision)} · {r.status} · {r.subsystemCode}</small></div>):<Unavailable title="No source-backed requirements" detail="The stored requirement records are absent or marked illustrative. Import or create controlled requirements in the governed register." source="traceability"/>}
   </article><article className="lv-panel"><h3>Simulation and verification activity</h3>
    {simulations.length?simulations.slice(0,7).map(s=><div className="lv-record" key={s.id}><RecordLink module="simulations" id={s.id}/><strong>{s.name}</strong><small>{s.runStatus} · validation {field(s.validationStatus)}</small></div>):<Unavailable title="No source-backed simulation runs" detail="Only real registered studies will appear here, regardless of illustrative data elsewhere in the Lab." source="simulations"/>}
   </article></div>
   <div className="lv-attention"><ShieldAlert size={18}/> Design approval, solver validation, and engineering acceptance remain separate human-governed decisions. Record counts do not establish readiness.</div>
  </>}
  {mode==='design'&&<>
   {intro('CAD SOURCE REGISTER / 02','Controlled revision references','Select source-backed CAD revision pointers. File metadata and SHA-256 prove a reference was recorded, not that geometry is valid.','cad-studio')}
   {cadError&&<p className="lv-error" role="alert">{cadError}</p>}
   {cad.length===0?<Unavailable title="No CAD revision pointers registered" detail="No real geometry will be invented. An authorized engineer can register a restricted-storage source link, revision and SHA-256 digest below." source="cad-studio"/>:
   <div className="lv-columns">{(['A','B'] as const).map(slot=>{
    const chosen=slot==='A'?selectedA:selectedB;
    return <article className="lv-panel" key={slot}><h3>Configuration {slot}</h3>
     <label>Source revision<select value={slot==='A'?cadA:cadB} onChange={e=>slot==='A'?setCadA(e.target.value):setCadB(e.target.value)}>
      <option value="">Select a revision</option>{cad.map(r=><option key={r.id} value={r.id}>{r.revision} · {r.title}</option>)}</select></label>
     {chosen?<dl className="lv-details"><Row label="Record ID" value={chosen.id}/><Row label="Revision" value={chosen.revision}/><Row label="File" value={chosen.fileLabel}/><Row label="SHA-256" value={chosen.sourceSha256}/><Row label="Registration state" value={chosen.recordStatus}/><Row label="Author user" value={chosen.createdBy}/>
      <Row label="Engineering notes" value={chosen.notes}/></dl>:<p className="lv-muted">No source revision selected. An illustration is not used as a geometry substitute.</p>}
     {chosen&&safeHttps(chosen.sourceUrl)&&<a className="v2-source-link" href={safeHttps(chosen.sourceUrl)!} target="_blank" rel="noreferrer">Open controlled CAD source <ArrowUpRight size={14}/></a>}
    </article>
   })}</div>}
   <div className="lv-attention"><ShieldAlert size={18}/>{selectedA&&selectedB&&selectedA.id!==selectedB.id?'Two revision references selected. Geometric comparison still requires verified files, common coordinates, mass properties and operating conditions.':'No verified geometry comparison available. Select two distinct source revisions; numerical claims remain blocked.'}</div>
   <article className="lv-panel lv-draft-panel"><h3>Register a CAD revision source</h3><p>Store metadata only. Do not upload restricted vessel geometry to a public repository. Access to referenced files remains controlled by their owner.</p>
    {canWrite?<form className="lv-draft-form" onSubmit={async e=>{e.preventDefault();if(await register('/api/session/cad-revisions',cadDraft))setCadDraft({title:'',revision:'',fileLabel:'',sourceUrl:'',sourceSha256:'',notes:''});}}>
      <label>Design title<input required maxLength={140} value={cadDraft.title} onChange={e=>setCadDraft({...cadDraft,title:e.target.value})}/></label>
      <label>Revision ID<input required maxLength={60} value={cadDraft.revision} onChange={e=>setCadDraft({...cadDraft,revision:e.target.value})}/></label>
      <label>File label<input required maxLength={180} value={cadDraft.fileLabel} onChange={e=>setCadDraft({...cadDraft,fileLabel:e.target.value})} placeholder="model-rev-b.step"/></label>
      <label>Controlled HTTPS source URL<input required type="url" maxLength={1200} value={cadDraft.sourceUrl} onChange={e=>setCadDraft({...cadDraft,sourceUrl:e.target.value})}/></label>
      <label>SHA-256 of source file<input required pattern="[a-fA-F0-9]{64}" title="Exactly 64 hexadecimal characters" maxLength={64} value={cadDraft.sourceSha256} onChange={e=>setCadDraft({...cadDraft,sourceSha256:e.target.value})}/></label>
      <label>Provenance notes<textarea maxLength={1200} value={cadDraft.notes} onChange={e=>setCadDraft({...cadDraft,notes:e.target.value})}/></label>
      <button type="submit" className="v2-solid" disabled={saving}>{saving?'Saving…':'Register unverified source'}<ArrowRight size={15}/></button>
     </form>:<p className="lv-muted">Your staff role does not permit registering design records. Contact an authorized engineering writer.</p>}
   </article>
  </>}
  {mode==='experiment'&&<>
   {intro('SIMULATION EVIDENCE / 03','Recorded engineering studies','Study metadata comes from the authenticated simulation register. No invented result curves, CFD fields or solver outputs.','simulations')}
   {simulations.length===0?<Unavailable title="No source-backed study records" detail="Run metadata and result references will appear when non-illustrative simulations are entered into the governed register." source="simulations"/>:<>
    <label className="lv-selector">Choose a recorded study<select value={chosenCase?.id??''} onChange={e=>setCaseId(e.target.value)}>{simulations.map(s=><option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</select></label>
    {chosenCase&&<article className="lv-panel"><h3>{chosenCase.name}</h3><div className="lv-state">{chosenCase.runStatus} · {field(chosenCase.validationStatus)}</div>
     <dl className="lv-details lv-details-wide"><Row label="Study ID" value={chosenCase.id}/><Row label="Geometry revision" value={chosenCase.geometryRevision}/><Row label="Discipline" value={chosenCase.discipline}/><Row label="Solver" value={chosenCase.solver}/><Row label="Compute environment" value={chosenCase.computeEnvironment}/><Row label="Input configuration" value={chosenCase.inputConfiguration}/><Row label="Boundary conditions" value={chosenCase.boundaryConditions}/><Row label="Units and reference" value={chosenCase.unitsAndReferenceFrame}/><Row label="Output files" value={chosenCase.outputFiles}/><Row label="Recorded result summary" value={chosenCase.resultsSummary}/><Row label="Reviewer" value={chosenCase.reviewer}/><Row label="Assumptions" value={chosenCase.assumptions}/></dl>
     {safeHttps(chosenCase.externalRefUrl)&&<a href={safeHttps(chosenCase.externalRefUrl)!} target="_blank" rel="noreferrer" className="v2-source-link">Open study source <ArrowUpRight size={14}/></a>}
     <div className="lv-attention"><LockKeyhole size={17}/> Completion or a summary field does not verify numerical correctness. Validate source files, units, calibration, and independent review before using results in a design decision.</div>
    </article>}
   </>}
  </>}
  {mode==='decide'&&<>
   {intro('REQUIREMENTS & EVIDENCE / 04','Traceable engineering decisions','Select real requirements and inspect their stored links to verification plans and simulations. No approval authority is inferred.','traceability')}
   <div className="lv-metrics">{[{label:'Requirements',value:requirements.length},{label:'Decision records',value:decisions.length},{label:'Risk records',value:risks.length},{label:'Test records',value:tests.length}].map(x=><div key={x.label}><span>{x.label}</span><strong>{x.value}</strong></div>)}</div>
   {requirements.length===0?<Unavailable title="No non-illustrative requirements registered" detail="Open the governed traceability register to create an authoritative, reviewable requirements baseline." source="traceability"/>:<>
    <label className="lv-selector">Requirement<select value={chosenRequirement?.id??''} onChange={e=>setRequirementId(e.target.value)}>{requirements.map(r=><option key={r.id} value={r.id}>{r.id} · {r.title}</option>)}</select></label>
    {chosenRequirement&&<article className="lv-panel"><h3>{chosenRequirement.title}</h3>
     <dl className="lv-details lv-details-wide"><Row label="Requirement" value={chosenRequirement.id}/><Row label="Revision" value={chosenRequirement.revision}/><Row label="Status" value={chosenRequirement.status}/><Row label="Acceptance criteria" value={chosenRequirement.acceptanceCriteria}/><Row label="Verification method" value={chosenRequirement.verificationMethod}/><Row label="Owner" value={chosenRequirement.owner}/></dl>
     <h4>Recorded links</h4>
     {(()=>{
      const evidence=linkedEvidence(snapshot,chosenRequirement);
      const realPlans=evidence.plans.filter(isReal);
      const realSim=evidence.simulations.filter(isReal);
      const realTests=evidence.tests.filter(isReal);
      return <div className="lv-linked">
       <div><strong>Verification plans ({realPlans.length})</strong>{realPlans.map(p=><RecordLink key={p.id} module="workstream-VNV" id={p.id}/>)}</div>
       <div><strong>Simulations ({realSim.length})</strong>{realSim.map(s=><RecordLink key={s.id} module="simulations" id={s.id}/>)}</div>
       <div><strong>Tests ({realTests.length})</strong>{realTests.map(t=><RecordLink key={t.id} module="workstream-VNV" id={t.id}/>)}</div>
      </div>;
     })()}
     <div className="lv-attention"><ShieldCheck size={17}/> Linked references are not evidence of passing verification. Approved decisions and baselines remain subject to the original governed approval gates.</div>
    </article>}
   </>}
   <Source id="orchestrator-approvals">Go to human approval gates</Source>
  </>}
  {mode==='notebook'&&<>
   {intro('SOURCE-BACKED NOTEBOOK / 05','Persistent project research drafts','Save unverified, attributable notes directly to the existing authenticated knowledge register—not temporary browser state.','knowledge-centre')}
   <div className="lv-columns"><article className="lv-panel"><h3>Saved session drafts ({projectNotes.length})</h3>
    {projectNotes.length?projectNotes.slice(0,30).map(n=><div key={n.id} className="lv-record"><RecordLink module="knowledge-centre" id={n.id}/><strong>{n.title}</strong><p>{n.contentMarkdown}</p><small>{field(n.verificationStatus)} · {field(n.author)} · {field(n.lastUpdated)}</small></div>):<Unavailable title="No saved session notes" detail="Create a draft to persist it with your authenticated staff identity. Unsaved text is not project evidence."/>}
   </article><article className="lv-panel"><h3>New unverified project note</h3>
    {canWrite?<form className="lv-draft-form" onSubmit={async e=>{e.preventDefault();if(await register('/api/session/notes',{title:noteTitle,content:noteBody})){setNoteTitle('');setNoteBody('');}}}>
     <label>Title<input required maxLength={140} value={noteTitle} onChange={e=>setNoteTitle(e.target.value)}/></label>
     <label>Observation, assumptions, or action<textarea required rows={7} maxLength={5000} value={noteBody} onChange={e=>setNoteBody(e.target.value)}/></label>
     <div className="lv-attention"><LockKeyhole size={16}/> Saved as DRAFT_UNVERIFIED, with server-attested staff identity and an audit event. This does not create an approved engineering decision.</div>
     <button className="v2-solid" type="submit" disabled={saving}>{saving?'Saving…':'Save unverified project draft'}<ArrowRight size={15}/></button>
    </form>:<p className="lv-muted">Your authenticated role is read-only. Governed project notes require engineering writer authority.</p>}
   </article></div>
  </>}
  {saveMessage&&<p className="lv-success" role="status">{saveMessage}</p>}
  {saveError&&<p className="lv-error" role="alert">{saveError}</p>}
 </section>;
}
