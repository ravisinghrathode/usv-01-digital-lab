/**
 * Deterministic A26 evidence-to-discipline triage, zero model tokens.
 * Keywords generate review QUESTIONS ONLY; never adopt a design conclusion,
 * alter a baseline, commission a solver or grant a new agent permission.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const RULES=[
 {id:'HULL_AND_GEOMETRY',agents:['A05','A06'],term:/\b(hull|stability|draft|beam|seakeeping|displacement|catamaran|trimaran|hydrostatics)\b/i,question:'Check whether this source provides independently reproducible hull-form or hydrostatic evidence applicable to the controlled USV-01 configuration.'},
 {id:'HYDRODYNAMICS',agents:['A07','A08'],term:/\b(hydrodynamic|drag|resistance|wave|planing|froude|cfd|propeller|cavitation)\b/i,question:'Identify operating conditions, units, hull scale and independent validation required before using any hydrodynamic claim.'},
 {id:'STRUCTURES_AND_MATERIALS',agents:['A10','A15'],term:/\b(structural|composite|laminate|sandwich|fatigue|slam|strength|material|stress)\b/i,question:'Check loads, material characterization, boundary conditions and independent structural evidence before considering a design hypothesis.'},
 {id:'POWER_AND_PROPULSION',agents:['A13','A14'],term:/\b(power|diesel|fuel|electric|battery|solar|wave[- ]powered|endurance|propulsion|motor)\b/i,question:'Find verified energy balance, operating speed, duty cycle and relevant propulsion-performance measurements.'},
 {id:'AUTONOMY_AND_NAVIGATION',agents:['A16','A17'],term:/\b(autonomy|autonomous|navigation|colregs|collision|path planning|guidance|control|swarm)\b/i,question:'Identify original algorithms, test conditions and safe degraded-mode limitations; do not infer deployment readiness.'},
 {id:'SENSORS_AND_PAYLOADS',agents:['A12','A21'],term:/\b(sonar|radar|sensor|acoustic|imaging|payload|lidar|eo\/ir|survey)\b/i,question:'Identify published sensor interfaces, calibration conditions and wet-end integration constraints before specialist review.'},
 {id:'REQUIREMENTS_AND_VERIFICATION',agents:['A01','A18','A24'],term:/\b(prototype|trial|demonstrat|verification|validation|system|test|commissioning|safety)\b/i,question:'Determine whether the source documents a verified sea-trial outcome or only an announcement; record verification gaps.'}
];
function clean(value){return String(value||'').replace(/[\u0000-\u001f\u007f|<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,300);}
function recordId(r){return r.id;}
export function proposeHandoffs({fleet,documents,maxPerSource=4,limit=300}){
  if(!Number.isInteger(limit)||limit<1||limit>1000||
    !Number.isInteger(maxPerSource)||maxPerSource<1||maxPerSource>7)throw Error('HANDOFF_LIMIT_UNSAFE');
  if(fleet?.agentId!=='INTEL-USV-26'||!Array.isArray(fleet.register?.records)||
    documents?.agentId!=='INTEL-USV-26'||!Array.isArray(documents.records)){
    throw Error('HANDOFF_SOURCES_UNAVAILABLE');
  }
  const inputs=[
    ...fleet.register.records.map(r=>({
      id:recordId(r),type:'PUBLIC_NEWS_LEAD',title:clean(r.title),
      description:clean(r.summary),
      refs:(r.evidence||[]).map(e=>e.publicArticleUrl).slice(0,4)
    })),
    ...documents.records.map(r=>({
      id:recordId(r),type:'PUBLIC_SCHOLARLY_METADATA',title:clean(r.title),
      description:clean((r.researchTerms||[]).join(' ')),
      refs:[r.doi,r.sourceUrl].filter(Boolean).slice(0,2)
    }))
  ];
  const proposals=[];
  for(const src of inputs.slice(0,limit)){
    const text=src.title+' '+src.description;
    let matched=0;
    for(const rule of RULES){
      if(matched>=maxPerSource)break;
      if(!rule.term.test(text))continue;
      matched++;
      proposals.push({
        evidenceId:src.id,sourceType:src.type,title:src.title,
        discipline:rule.id,reviewAgents:rule.agents,sourceLinks:src.refs,
        reviewQuestion:rule.question,
        state:'UNVERIFIED_RESEARCH_HANDOFF',
        sourceBasedEngineeringConclusion:false,
        autonomousBaselineAdoption:false,
        humanReviewRequired:true
      });
    }
  }
  return {schemaVersion:1,agentId:'INTEL-USV-26',
    status:'UNVERIFIED_EVIDENCE_TRIAGE',
    recordsScanned:Math.min(inputs.length,limit),
    proposals,engineeringConclusionsVerified:0,
    downstreamAgentsExecuted:0,engineeringReleaseApproved:false};
}
export function handoffMarkdown(value){
  const rows=['# A26 unverified USV research-to-engineering handoffs','',
    '**These are automatically generated review questions, NOT design decisions, published trial validations or adopted calculations.**',
    'No specialist was executed by this triage process.','',
    'Review questions: '+value.proposals.length,'',
    '| Evidence ID | Discipline | Review agents | Question |',
    '| --- | --- | --- | --- |'];
  for(const r of value.proposals.slice(0,600)){
    rows.push('| '+r.evidenceId+' | '+r.discipline+' | '+r.reviewAgents.join(', ')+
      ' | '+r.reviewQuestion.replace(/[|]/g,' ')+' |');
  }
  rows.push('','Evidence requires original source verification, applicability review and authorization before design or research baseline use.','');
  return rows.join('\n');
}
async function main(){
  const args=process.argv.slice(2);
  if(args.length!==6||args[0]!=='--fleet'||args[2]!=='--documents'||args[4]!=='--out-dir'){
    throw Error('Expected --fleet REPORT --documents REPORT --out-dir DIRECTORY');
  }
  const fleet=JSON.parse(await readFile(args[1],'utf8'));
  const docs=JSON.parse(await readFile(args[3],'utf8'));
  const out=args[5];
  const result=proposeHandoffs({fleet,documents:docs});
  await mkdir(out,{recursive:true,mode:0o700});
  await writeFile(path.join(out,'engineering-handoff-drafts.json'),
    JSON.stringify(result,null,2)+'\n',{mode:0o600});
  await writeFile(path.join(out,'engineering-handoff-drafts.md'),
    handoffMarkdown(result),{mode:0o600});
  console.log(JSON.stringify({status:result.status,
    reviewQuestions:result.proposals.length,engineeringReleaseApproved:false},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(e=>{console.error('A26_HANDOFF_TRIAGE_HOLD:',String(e?.message||e));
    process.exitCode=1;});
}
