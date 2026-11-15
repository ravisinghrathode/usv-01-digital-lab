import React from 'react';
import {ArrowUpRight,ChevronRight,FileText,LockKeyhole} from 'lucide-react';
import {ENTITIES,legacyLink,type EntityId,type Mode,type Perspective,type SessionView,type StudyId} from './model';
export type SessionProps={
 session:SessionView;
 changeMode:(mode:Mode)=>void;
 select:(id:EntityId)=>void;
 chooseStudy:(id:StudyId)=>void;
 setPerspective:(value:Perspective,forCandidate?:boolean)=>void;
 toggleSync:()=>void;
 toggleIsolate:()=>void;
 addNote:(content:string)=>void;
 prepareTask:()=>void;
};
export function SourceLink({module,children,className=''}:{
 module:Parameters<typeof legacyLink>[0];children:React.ReactNode;className?:string
}){
 return <a href={legacyLink(module)} className={'vf-source-link '+className}>{children}<ArrowUpRight size={15}/></a>;
}
export function ContextTag({children,tone='neutral'}:{children:React.ReactNode;tone?:'neutral'|'warning'|'blue'}){
 return <span className={'vf-context-tag vf-tag-'+tone}>{children}</span>;
}
export function SourceNotice({short=false}:{short?:boolean}){
 return <div className="vf-source-notice" role="note">
  <LockKeyhole size={15}/>
  {short?'Source data required': 'Illustrative concept only · No approved vessel configuration, performance values or simulation outputs'}
 </div>;
}
export function ObjectRow({id,onSelect}:{id:EntityId;onSelect:(id:EntityId)=>void}){
 const entity=ENTITIES.find(e=>e.id===id)!;
 return <button type="button" className="vf-linked-row" onClick={()=>onSelect(id)} aria-label={'Inspect '+entity.title}>
  <span className="vf-linked-icon"><FileText size={17}/></span>
  <span className="vf-linked-copy"><strong>{entity.title}</strong><small>{entity.subtitle}</small></span>
  <ChevronRight size={16}/>
 </button>;
}
