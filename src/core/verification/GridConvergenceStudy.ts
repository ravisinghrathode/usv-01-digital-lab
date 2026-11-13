/**
 * Three-grid scalar verification screen for solver outputs.
 *
 * Uses a uniform-refinement Richardson/GCI-style calculation. This is a
 * numerical-discretization screen, not model validation or engineering release.
 * Fine/medium/coarse characteristic grid sizes must be explicit and ordered.
 */
export interface GridSample {
  id:string;
  characteristicGridSize:number; // smaller = finer
  scalarMetric:number;
  sourceDigest:string;
}
export interface GridConvergenceReport {
  status:'GCI_SCREEN_PASS_UNCERTIFIED'|'GCI_SCREEN_FAIL'|'NON_MONOTONIC_OR_DEGENERATE';
  observedOrder:number|null;
  refinementRatioFineMedium:number;
  refinementRatioMediumCoarse:number;
  extrapolatedMetric:number|null;
  fineGridGciFraction:number|null;
  apparentRelativeErrorFineMedium:number|null;
  monotonic:boolean;
  sourceDigests:string[];
  externallyValidated:false;
  engineeringReleaseAuthorized:false;
  issues:string[];
}
const finitePositive=(x:number)=>Number.isFinite(x)&&x>0;
const SHA=/^sha256:[0-9a-f]{64}$/;

export function evaluateThreeGridConvergence(
  fine:GridSample, medium:GridSample, coarse:GridSample,
  maxGciFraction:number
):GridConvergenceReport{
  const issues:string[]=[];
  const all=[fine,medium,coarse];
  if(!finitePositive(maxGciFraction)||maxGciFraction>1||
     all.some(x=>!x?.id||!finitePositive(x.characteristicGridSize)||
       !Number.isFinite(x.scalarMetric)||!SHA.test(x.sourceDigest))||
     !(fine.characteristicGridSize<medium.characteristicGridSize&&
       medium.characteristicGridSize<coarse.characteristicGridSize)){
    throw new Error('Three-grid GCI input requires ordered positive grid sizes, finite scalar metric, exact evidence digests and bounded threshold');
  }
  const r21=medium.characteristicGridSize/fine.characteristicGridSize;
  const r32=coarse.characteristicGridSize/medium.characteristicGridSize;
  if(r21<=1||r32<=1)throw new Error('Refinement ratios must exceed 1');
  const ratioMismatch=Math.abs(r21-r32)/((r21+r32)/2);
  if(ratioMismatch>0.05)issues.push('Refinement ratios differ by more than 5%; uniform-ratio GCI screen not applicable');
  const e21=medium.scalarMetric-fine.scalarMetric;
  const e32=coarse.scalarMetric-medium.scalarMetric;
  const monotonic=e21!==0&&e32!==0&&Math.sign(e21)===Math.sign(e32);
  if(!monotonic)issues.push('Scalar sequence is non-monotonic or degenerate across grids');
  let p:number|null=null, extrapolated:number|null=null, gci:number|null=null, rel:number|null=null;
  if(monotonic&&ratioMismatch<=0.05){
    const q=Math.abs(e32/e21);
    if(q>0&&Number.isFinite(q)){
      const r=(r21+r32)/2;
      p=Math.log(q)/Math.log(r);
      if(!Number.isFinite(p)||p<=0){
        p=null;issues.push('Observed convergence order is non-positive or non-finite');
      }else{
        const rp=Math.pow(r,p);
        if(Math.abs(rp-1)<1e-12){
          issues.push('Richardson denominator is degenerate');
        }else{
          extrapolated=fine.scalarMetric+(fine.scalarMetric-medium.scalarMetric)/(rp-1);
          rel=Math.abs((fine.scalarMetric-medium.scalarMetric)/fine.scalarMetric);
          gci=1.25*rel/(rp-1);
          if(!Number.isFinite(gci)||gci<0){gci=null;issues.push('Computed GCI is invalid')}
        }
      }
    }
  }
  const status:GridConvergenceReport['status']=
    !monotonic||ratioMismatch>0.05||p===null||gci===null?'NON_MONOTONIC_OR_DEGENERATE':
    gci<=maxGciFraction?'GCI_SCREEN_PASS_UNCERTIFIED':'GCI_SCREEN_FAIL';
  if(status==='GCI_SCREEN_FAIL')issues.push('Fine-grid GCI exceeds source-defined acceptance threshold');
  return {
    status,observedOrder:p,refinementRatioFineMedium:r21,refinementRatioMediumCoarse:r32,
    extrapolatedMetric:extrapolated,fineGridGciFraction:gci,
    apparentRelativeErrorFineMedium:rel,monotonic,
    sourceDigests:all.map(x=>x.sourceDigest),externallyValidated:false,
    engineeringReleaseAuthorized:false,issues
  };
}
