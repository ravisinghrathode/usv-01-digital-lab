import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createSolverJobManifest } from '../src/core/verification/RemoteSolverJobs.ts';

const args=process.argv.slice(2);
const value=(name:string)=>{
  const i=args.indexOf(name);
  if(i<0||!args[i+1]) throw new Error('Missing '+name);
  return args[i+1];
};
const digest=(file:string)=>'sha256:'+createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const source=value('--source-sha');
const archive=value('--archive');
const mesh=value('--mesh');
const output=value('--out');
const family=value('--family');
if(family!=='CALCULIX_FEA'&&family!=='OPENFOAM_CFD') throw new Error('Unsupported family');
const manifest=createSolverJobManifest({
  jobRef:value('--job-ref'),
  sourceCommit:source,
  family,
  inputArtifactUri:'https://ci-known-case.invalid/'+encodeURIComponent(value('--job-ref'))+'.zip',
  inputArtifactSha256:digest(archive),
  meshArtifactSha256:digest(mesh),
  qualityPlan: family==='OPENFOAM_CFD' ? {
    sourceReference:'https://gitlab.com/openfoam/core/openfoam/-/raw/OpenFOAM-v2606/tutorials/incompressible/simpleFoam/backwardFacingStep2D/system/fvSolution',
    residualThreshold:1e-4,
    initialResidualThresholds:{p:1e-4,'U*':1e-6,k:1e-5,omega:1e-5},
    requireSolverDeclaredConvergence:true,
    gridUncertaintyMaxFraction:0.05,
    maxMeshSkewness:4,
    maxNonOrthogonalityDeg:70
  } : {
    sourceReference:'CI_CALCULIX_AXIAL_BAR_ANALYTICAL_COMMISSIONING_PLAN',
    residualThreshold:1e-4,
    gridUncertaintyMaxFraction:0.05,
    maxMeshSkewness:4,
    maxNonOrthogonalityDeg:70,
    maxElementAspectRatio:5,
    minScaledJacobian:0.2
  }
});
fs.writeFileSync(output,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({manifest,archiveDigest:digest(archive),meshDigest:digest(mesh)},null,2));
