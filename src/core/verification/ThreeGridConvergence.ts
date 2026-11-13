/**
 * Restricted three-grid monotonic-convergence screen for a scalar CFD output.
 *
 * This is intentionally narrower than a full V&V procedure: three systematically
 * refined grids, approximately constant refinement ratio, same physics/settings,
 * and monotonic convergence are required. Oscillatory/divergent sequences fail
 * closed and require independent engineering treatment.
 */
export interface ThreeGridPoint {
  id:string;
  characteristicCellSize:number;
  value:number;
  sourceDigest:string;
}
export interface ThreeGridConvergenceReport {
  status:'GCI_SCREEN_PASS_UNCERTIFIED'|'REJECTED';
  observedOrder:number|null;
  refinementRatio:number|null;
  extrapolatedValue:number|null;
  fineGridGciFraction:number|null;
  asymptoticRatio:number|null;
  issues:string[];
  engineeringValidated:false;
  engineeringReleaseAuthorized:false;
}
const SHA=/^sha256:[0-9a-f]{64}$/;
const finitePositive=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>0;

export function evaluateThreeGridConvergence(
  points:readonly ThreeGridPoint[],
  options:{safetyFactor?:number;ratioToleranceFraction?:number}={}
):ThreeGridConvergenceReport{
  const reject=(...issues:string[]):ThreeGridConvergenceReport=>({
    status:'REJECTED',observedOrder:null,refinementRatio:null,extrapolatedValue:null,
    fineGridGciFraction:null,asymptoticRatio:null,issues,
    engineeringValidated:false,engineeringReleaseAuthorized:false
  });
  if(points.length!==3)return reject('Exactly three systematically refined grids required');
  if(points.some(p=>!p?.id||!finitePositive(p.characteristicCellSize)||
      typeof p.value!=='number'||!Number.isFinite(p.value)||!SHA.test(p.sourceDigest))){
    return reject('Each grid needs finite value, positive characteristic size and exact evidence SHA-256');
  }
  const [fine,medium,coarse]=[...points].sort((a,b)=>a.characteristicCellSize-b.characteristicCellSize);
  const r21=medium.characteristicCellSize/fine.characteristicCellSize;
  const r32=coarse.characteristicCellSize/medium.characteristicCellSize;
  if(r21<=1||r32<=1)return reject('Grid sizes are not strictly refined');
  const tolerance=options.ratioToleranceFraction??0.05;
  const r=(r21+r32)/2;
  if(Math.abs(r21-r32)/r>tolerance){
    return reject('Refinement ratios are not sufficiently constant for restricted equal-ratio GCI screen');
  }
  const e21=medium.value-fine.value;
  const e32=coarse.value-medium.value;
  if(e21===0||e32===0||e21*e32<=0){
    return reject('Scalar sequence is not nonzero monotonic convergence; use qualified generalized/oscillatory V&V method');
  }
  const ratio=Math.abs(e32/e21);
  const p=Math.log(ratio)/Math.log(r);
  if(!Number.isFinite(p)||p<=0||p>10)return reject('Observed order is nonphysical or unsupported');
  const denom=Math.pow(r,p)-1;
  if(!(denom>0))return reject('Richardson extrapolation denominator invalid');
  const extrap=fine.value+(fine.value-medium.value)/denom;
  const fs=options.safetyFactor??1.25;
  if(!finitePositive(fs)||fs<1)return reject('GCI safety factor must be >= 1');
  const scale=Math.max(Math.abs(fine.value),Number.EPSILON);
  const gciFine=fs*Math.abs((fine.value-medium.value)/scale)/denom;
  const gciMedium=fs*Math.abs((medium.value-coarse.value)/Math.max(Math.abs(medium.value),Number.EPSILON))/denom;
  const asymptotic=gciMedium===0?null:gciFine*Math.pow(r,p)/gciMedium;
  const issues:string[]=[];
  if(!Number.isFinite(gciFine)||gciFine<0)return reject('Computed GCI invalid');
  if(asymptotic===null||!Number.isFinite(asymptotic)){
    issues.push('Asymptotic-range ratio unavailable');
  }
  return {
    status:'GCI_SCREEN_PASS_UNCERTIFIED',observedOrder:p,refinementRatio:r,
    extrapolatedValue:extrap,fineGridGciFraction:gciFine,asymptoticRatio:asymptotic,
    issues,engineeringValidated:false,engineeringReleaseAuthorized:false
  };
}
