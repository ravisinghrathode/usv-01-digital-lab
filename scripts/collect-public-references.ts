import fs from 'node:fs';
import path from 'node:path';
import { collectPublicReferences } from '../src/core/verification/PublicReferenceCollector.ts';

async function main() {
  const outputDir=path.resolve('.local-concept-research/publications');
  fs.mkdirSync(outputDir,{recursive:true,mode:0o700});
  const collection=await collectPublicReferences();
  for(let i=0;i<collection.results.length;i++){
    const result=collection.results[i];
    const filename=path.join(outputDir,result.sha256.slice(7)+'.pdf');
    fs.writeFileSync(filename,collection.blobs[i],{mode:0o600,flag:'wx'});
  }
  const index=collection.results.map(r=>({
    reference:r.reference,
    description:r.title+'; actual PDF bytes retrieved and SHA-256 recorded; applicability NOT reviewed',
    url:r.uri,
    sha256:r.sha256,
    status:'BYTES_FETCHED_UNVERIFIED_APPLICABILITY'
  }));
  const missionPath=process.argv.includes('--mission-file')?
    process.argv[process.argv.indexOf('--mission-file')+1]:'references/concept-mission-draft.json';
  if(!missionPath||missionPath.startsWith('--'))throw Error('Missing --mission-file value');
  const mission=JSON.parse(fs.readFileSync(path.resolve(missionPath),'utf8'));
  if(!mission||typeof mission!=='object'||!Array.isArray(mission.requirements))
    throw Error('Malformed mission');
  mission.researchSources=[...index];
  fs.writeFileSync(path.join(outputDir,'mission-with-fetched-publications.json'),
    JSON.stringify(mission,null,2)+'\n',{mode:0o600});
  fs.writeFileSync(path.join(outputDir,'source-index.json'),
    JSON.stringify(index,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({
    status:'FETCHED_PUBLIC_SOURCES_APPLICATION_UNVERIFIED',
    sources:index.map(x=>({reference:x.reference,sha256:x.sha256})),
    missionFile:path.join(outputDir,'mission-with-fetched-publications.json'),
    sourceApplicabilityIndependentlyVerified:false,
    engineeringReleaseAuthorized:false
  },null,2));
}
main().catch(e=>{console.error('Source collection failed closed:',e instanceof Error?e.message:String(e));process.exitCode=1});
