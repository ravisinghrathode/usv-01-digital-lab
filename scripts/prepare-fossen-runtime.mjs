/** Generates an unapproved Fossen execution spec only from actually measured image/wheel hashes. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const PINNED='a93d1938ba1f78f2580c24c73f003091b2f03cd0';
const HEX64=/^[0-9a-f]{64}$/;
const PIN=/^[a-zA-Z0-9_.:/-]+@sha256:[0-9a-f]{64}$/;
export const REFERENCE_CASES=[
 {id:'angle-zero',input:{operation:'ssa',angleRad:0},expected:{value:0},absoluteTolerance:{value:1e-12}},
 {id:'angle-three-pi',input:{operation:'ssa',angleRad:3*Math.PI},expected:{value:-Math.PI},absoluteTolerance:{value:1e-12}},
 {id:'saturation-upper',input:{operation:'sat',value:8,minimum:-2,maximum:5},expected:{value:5}},
 {id:'identity-rotation',input:{operation:'rzyx',rollRad:0,pitchRad:0,yawRad:0},expected:{r00:1,r01:0,r02:0,r10:0,r11:1,r12:0,r20:0,r21:0,r22:1},absoluteTolerance:{r00:1e-12,r01:1e-12,r02:1e-12,r10:1e-12,r11:1e-12,r12:1e-12,r20:1e-12,r21:1e-12,r22:1e-12}},
 {id:'skew-matrix',input:{operation:'smtrx',vector:[1,2,3]},expected:{s01:-3,s02:2,s10:3,s12:-1,s20:-2,s21:1}}
];
export function prepareRuntime({candidate,imageId,baseDigest,dependencySha,adapterSha,at=new Date().toISOString()}) {
 if(!candidate||candidate.repository!=='cybergalactic/PythonVehicleSimulator'||candidate.commit!==PINNED||candidate.runner||candidate.cases)throw Error('Only immutable inspection-only Fossen candidate is accepted');
 if(!/^sha256:[0-9a-f]{64}$/.test(imageId))throw Error('Measured local Docker image ID required');
 if(!PIN.test(baseDigest))throw Error('Immutable Python base image registry digest required');
 if(!HEX64.test(dependencySha)||!HEX64.test(adapterSha))throw Error('Measured trusted adapter and NumPy wheel SHA256 required');
 return {
  manifest:{...candidate,runner:{image:imageId,argv:['python3','/opt/usv01/fossen_adapter.py']},cases:REFERENCE_CASES},
  provenance:{schemaVersion:1,phase:'LOCALLY_BUILT_IMAGE_MEASURED_NOT_CERTIFIED',at,sourceCommit:PINNED,
   imageType:'DOCKER_LOCAL_IMAGE_CONFIG_ID_NOT_REGISTRY_MANIFEST',imageId,baseDigest,
   numpyWheelVersion:'2.3.5',numpyWheelSha256:dependencySha,trustedAdapterSha256:adapterSha,
   sourceTested:false,engineeringValidated:false,licensed:false,toolRegistered:false,vesselReleased:false}
 };
}
function parseArgs(argv){const o={};for(let i=0;i<argv.length;i+=2){if(!['--candidate','--image-id','--base-digest','--dependency-sha','--adapter-sha','--out-dir'].includes(argv[i])||!argv[i+1])throw Error('Invalid runner arguments');o[argv[i].slice(2)]=argv[i+1];}if(!['candidate','image-id','base-digest','dependency-sha','adapter-sha','out-dir'].every(k=>o[k]))throw Error('All measured image and dependency inputs required');return o;}
export async function main(argv=process.argv.slice(2)){
 const o=parseArgs(argv);const candidate=JSON.parse(await readFile(o.candidate,'utf8'));
 const data=prepareRuntime({candidate,imageId:o['image-id'],baseDigest:o['base-digest'],dependencySha:o['dependency-sha'],adapterSha:o['adapter-sha']});
 await mkdir(o['out-dir'],{recursive:true,mode:0o700});
 await writeFile(path.join(o['out-dir'],'runtime-manifest.json'),JSON.stringify(data.manifest,null,2)+'\n',{mode:0o600});
 await writeFile(path.join(o['out-dir'],'runner-provenance.json'),JSON.stringify(data.provenance,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({phase:data.provenance.phase,source:data.provenance.sourceCommit,approved:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
