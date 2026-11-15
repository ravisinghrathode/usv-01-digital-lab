import { MODULE_REGISTRY, type NavigationModule } from '../moduleRegistry';

export type Mode='worktable'|'design'|'experiment'|'decide'|'notebook';
export type EntityType='revision'|'study'|'requirement'|'question'|'source'|'assumption'|'claim';
export type EntityId='reference'|'candidate'|'mass-study'|'stability-study'|'structural-study'|'req-mass'|'req-stability'|'operating'|'uncertainty'|'review'|'decision';
export type StudyId='mass-study'|'stability-study'|'structural-study';
export type Perspective='iso'|'plan';
export interface InvestigationEntity {
 id:EntityId;
 title:string;
 subtitle:string;
 type:EntityType;
 status:'Example'|'Source required'|'Review pending'|'Unestablished';
 description:string;
 module:NavigationModule;
}
export interface Study{
 id:StudyId;
 title:string;
 discipline:string;
 source:string;
 revision:string;
 resultState:'NO_REVIEWABLE_RESULT';
 validation:'NOT_REVIEWED';
 conditions:string;
}
export const MODES:{id:Mode;name:string;key:string}[]=[
 {id:'worktable',name:'Worktable',key:'1'},
 {id:'design',name:'Design',key:'2'},
 {id:'experiment',name:'Experiment',key:'3'},
 {id:'decide',name:'Decide',key:'4'},
 {id:'notebook',name:'Notebook',key:'5'}
];
export const INVESTIGATION={
 id:'DEMO-INV-01',title:'Can we reduce vessel mass without compromising stability?',
 subtitle:'Explore a hypothetical mass-reduction investigation using labelled example objects.',
 project:'USV-01',status:'INTERACTIVE DEMONSTRATION',
 source:'SYNTHETIC EXAMPLE — NO VERIFIED PROJECT STUDY'
} as const;
export const ENTITIES:InvestigationEntity[]=[
 {id:'reference',title:'Reference configuration',subtitle:'Placeholder · Rev A',type:'revision',status:'Source required',description:'Hypothetical reference geometry for demonstrating a comparison journey; this is not an approved CAD or real baseline revision.',module:'cad-studio'},
 {id:'candidate',title:'Lightweight concept',subtitle:'Placeholder · Rev B',type:'revision',status:'Source required',description:'Hypothetical alternative concept. No geometry, mass reduction, centre of gravity or structural performance has been established.',module:'cad-studio'},
 {id:'mass-study',title:'Mass properties',subtitle:'Proposed study',type:'study',status:'Source required',description:'A candidate mass/CG study; no reviewed result file, source geometry or assumptions are attached in this demo.',module:'simulations'},
 {id:'stability-study',title:'Stability assessment',subtitle:'Proposed study',type:'study',status:'Source required',description:'A potential hydrostatic and stability verification task. No study outputs or acceptance results are asserted.',module:'simulations'},
 {id:'structural-study',title:'Structural loading',subtitle:'Proposed study',type:'study',status:'Source required',description:'A potential structural verification task covering load paths and launch/recovery conditions. No structural calculation is executed.',module:'simulations'},
 {id:'req-mass',title:'Mass constraint',subtitle:'Requirements to establish',type:'requirement',status:'Unestablished',description:'A project-specific maximum mass and loading envelope must be obtained from reviewed, applicable requirements.',module:'traceability'},
 {id:'req-stability',title:'Stability constraint',subtitle:'Verification needed',type:'requirement',status:'Unestablished',description:'Applicable intact/damage stability criteria, conditions and acceptance margins are unverified in this demonstration.',module:'traceability'},
 {id:'operating',title:'Operating conditions',subtitle:'Inputs unknown',type:'assumption',status:'Unestablished',description:'Loading, sea state, mission profile, displacement and environmental assumptions require source-backed definitions.',module:'workstream-NAV'},
 {id:'uncertainty',title:'Unresolved trade-offs',subtitle:'Mass, stability, strength',type:'question',status:'Review pending',description:'Without reviewed geometry, mass properties and comparable operating conditions, a valid trade-off cannot yet be made.',module:'risks-decisions'},
 {id:'review',title:'Independent review',subtitle:'Not performed',type:'claim',status:'Review pending',description:'Independent technical review has not been performed for this hypothetical investigation.',module:'traceability'},
 {id:'decision',title:'Design recommendation',subtitle:'Not issued',type:'claim',status:'Review pending',description:'There is no engineering recommendation, approved candidate or authorized design release in this demonstration.',module:'risks-decisions'}
];
export const STUDIES:Study[]=[
 {id:'mass-study',title:'Mass and centre of gravity',discipline:'Mass properties',source:'No result file',revision:'No controlled geometry',resultState:'NO_REVIEWABLE_RESULT',validation:'NOT_REVIEWED',conditions:'Loading basis TBD'},
 {id:'stability-study',title:'Hydrostatic and stability case',discipline:'Naval architecture',source:'No result file',revision:'No controlled geometry',resultState:'NO_REVIEWABLE_RESULT',validation:'NOT_REVIEWED',conditions:'Loading and environment TBD'},
 {id:'structural-study',title:'Hull and handling loads',discipline:'Structural engineering',source:'No result file',revision:'No controlled geometry',resultState:'NO_REVIEWABLE_RESULT',validation:'NOT_REVIEWED',conditions:'Launch, recovery and service loads TBD'}
];
export type Note={id:number;content:string;created:string;kind:'local'|'task'};
export interface SessionView{
 mode:Mode;selected:EntityId|null;study:StudyId;perspective:Perspective;
 candidatePerspective:Perspective;cameraSync:boolean;isolate:boolean;inspector:boolean;
 notes:Note[];
}
export const DEFAULT_SESSION:SessionView={
 mode:'worktable',selected:null,study:'mass-study',perspective:'iso',candidatePerspective:'iso',
 cameraSync:true,isolate:false,inspector:false,notes:[]
};
export function validMode(raw:string):Mode{return MODES.find(m=>m.id===raw)?.id??'worktable';}
export function currentEntity(id:EntityId|null){return ENTITIES.find(e=>e.id===id)??null;}
export function currentStudy(id:StudyId){return STUDIES.find(s=>s.id===id)??STUDIES[0];}
export function legacyLink(id:NavigationModule){return '/legacy.html?module='+encodeURIComponent(id);}
export function searchItems(query:string){
 const all=[
  ...ENTITIES.map(e=>({id:'entity:'+e.id,title:e.title,meta:e.subtitle,module:e.module})),
  ...MODULE_REGISTRY.map(m=>({id:'module:'+m.id,title:m.label,meta:'Governed module · '+m.group,module:m.id}))
 ];
 const term=query.toLocaleLowerCase().trim();
 return (term?all.filter(x=>(x.title+' '+x.meta).toLowerCase().includes(term)):all).slice(0,45);
}
export function isComparisonReady(_reference:string,_candidate:string,_conditions:string){
 // Synthetic examples cannot be compared, irrespective of visual similarity.
 return {ready:false,reason:'No two source-backed geometry revisions with matching verified conditions are available.'};
}
export function hashForMode(mode:Mode){return '#'+mode;}
