import fs from 'node:fs';
import path from 'node:path';
import {evaluateSolverReceipt,type SolverJobManifest} from '../src/core/verification/RemoteSolverJobs.ts';
import {evaluateSolverGridConvergence} from '../src/core/verification/GridConvergenceStudy.ts';

const args=process.argv.slice(2);
const value=(name:string)=>{const i=args.indexOf(name);if(i<0||!args[i+1])throw new Error('Missing '+name);return args[i+1]};
const campaignPath=path.resolve(value('--campaign'));
const outputPath=path.resolve(value('--out'));
const raw=JSON.parse(fs.readFileSync(campaignPath,'utf8')) as {
  metricPath:string;maxGciFraction:number;
  fine:{gridSize:number;manifest:string;receipt:string};
  medium:{gridSize:number;manifest:string;receipt:string};
  coarse:{gridSize:number;manifest:string;receipt:string};
};
if(!raw||typeof raw.metricPath!=='string'||!raw.metricPath||
   typeof raw.maxGciFraction!=='number'||!raw.fine||!raw.medium||!raw.coarse)
  throw new Error('Malformed grid-convergence campaign');
const load=(id:'fine'|'medium'|'coarse',entry:{gridSize:number;manifest:string;receipt:string})=>{
  const manifest=JSON.parse(fs.readFileSync(path.resolve(entry.manifest),'utf8')) as SolverJobManifest;
  const receipt=JSON.parse(fs.readFileSync(path.resolve(entry.receipt),'utf8'));
  return {id,characteristicGridSize:entry.gridSize,disposition:evaluateSolverReceipt(manifest,receipt)};
};
const result=evaluateSolverGridConvergence(
  load('fine',raw.fine),load('medium',raw.medium),load('coarse',raw.coarse),
  raw.metricPath,raw.maxGciFraction
);
fs.mkdirSync(path.dirname(outputPath),{recursive:true});
fs.writeFileSync(outputPath,JSON.stringify({
  campaignFile:path.basename(campaignPath),...result,
  independentEngineeringValidated:false,
  engineeringReleaseAuthorized:false
},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({
  status:result.report.status,observedOrder:result.report.observedOrder,
  fineGridGciFraction:result.report.fineGridGciFraction,
  metricPath:result.metricPath,output:outputPath,
  engineeringReleaseAuthorized:false
},null,2));
if(result.report.status!=='GCI_SCREEN_PASS_UNCERTIFIED')process.exitCode=2;
