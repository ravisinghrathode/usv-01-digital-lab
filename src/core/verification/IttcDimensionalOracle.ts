/**
 * ITTC-specified dimensionless identities, independently implemented from
 * published equations, NOT resistance-validation tank data.
 * Source: ITTC 2024 High Speed Marine Vehicles Resistance Test 7.5-02-05-01:
 * https://www.ittc.info/media/11846/75-02-05-01.pdf
 * Re = VL/nu, Fn = V/sqrt(gL), C_F = 0.075/(log10(Re)-2)^2.
 */
import { ToolRegistry } from '../tools/ToolRegistry.ts';

export interface IttcIdentityCase {
  id: string;
  lwlMeters: number;
  beamMeters: number;
  draftMeters: number;
  displacementTonnes: number;
  speedKnots: number;
  propulsiveEfficiencyEtaD: number;
  waterTempCelsius: 15;
}
export interface IttcIdentityReport {
  source: string;
  status: 'PASS_DIMENSIONAL_IDENTITIES_UNCERTIFIED'|'FAIL_DIMENSIONAL_IDENTITIES'|'NO_CASES';
  measurements: Array<{
    id: string;
    outputStatus: string;
    metrics: Array<{key:string;independentExpectation:number;actualToolOutput:number|null;relativeError:number|null;pass:boolean}>;
  }>;
  independence: 'INDEPENDENT_EQUATION_IMPLEMENTATION_NOT_EXTERNAL_MEASURED_DATA';
  sourcePdfDigestAuthenticated: false;
  hydrodynamicResistanceValidated: false;
  engineeringReleaseAuthorized: false;
}
const reference = 'https://www.ittc.info/media/11846/75-02-05-01.pdf';
const kn = 1852/3600;
const g = 9.81;
const nu15 = 1.188e-6;
const valid = (x:number)=>typeof x==='number'&&Number.isFinite(x)&&x>0;

export async function runIttcIdentityOracle(
  cases: readonly IttcIdentityCase[],
  execute: (data: IttcIdentityCase)=>Promise<{success:boolean;output:Record<string,unknown>}> =
    async x => {
      // The identity oracle checks only V/Fn/Re. eta_D is not part of those
      // identities and must not be passed without an independent evidence ref.
      const { propulsiveEfficiencyEtaD: _unusedEta, id: _caseId, ...identityInput } = x;
      const r = await ToolRegistry.getInstance().executeTool(
        'TOOL-RESISTANCE-01', identityInput, ['CALCULATION_EXEC']);
      return {success:r.success,output:r.output};
    }
):Promise<IttcIdentityReport>{
  const measurements:IttcIdentityReport['measurements'] = [];
  let passes = cases.length>0;
  for(const x of cases){
    if(!x||!x.id||!valid(x.lwlMeters)||!valid(x.beamMeters)||!valid(x.draftMeters)||
      !valid(x.displacementTonnes)||!valid(x.speedKnots)||
      !valid(x.propulsiveEfficiencyEtaD)||x.propulsiveEfficiencyEtaD>1||
      x.waterTempCelsius!==15){
      measurements.push({id:String(x?.id||'INVALID'),outputStatus:'INVALID_REFERENCE_INPUT',metrics:[]});
      passes=false;continue;
    }
    const v=x.speedKnots*kn;
    const expected={
      speedMps:v,
      froudeNumberFn:v/Math.sqrt(g*x.lwlMeters),
      reynoldsNumber:(v*x.lwlMeters)/nu15
    };
    const y=await execute(x);
    const metrics=Object.entries(expected).map(([key,expectedValue])=>{
      const actual=y.output[key];
      const actualNumber=typeof actual==='number'&&Number.isFinite(actual)?actual:null;
      const relativeError=actualNumber===null?null:Math.abs(actualNumber-expectedValue)/Math.abs(expectedValue);
      const tolerance=key==='speedMps'?0.003:key==='froudeNumberFn'?0.003:0.001;
      return {key,independentExpectation:expectedValue,
        actualToolOutput:actualNumber,relativeError,
        pass:y.success&&relativeError!==null&&relativeError<=tolerance};
    });
    if(metrics.some(m=>!m.pass))passes=false;
    measurements.push({id:x.id,outputStatus:y.success?'TOOL_EXECUTED_SCREENING':'TOOL_FAILED',metrics});
  }
  return {
    source:reference,
    status:cases.length===0?'NO_CASES':passes?'PASS_DIMENSIONAL_IDENTITIES_UNCERTIFIED':'FAIL_DIMENSIONAL_IDENTITIES',
    measurements,
    independence:'INDEPENDENT_EQUATION_IMPLEMENTATION_NOT_EXTERNAL_MEASURED_DATA',
    sourcePdfDigestAuthenticated:false,
    hydrodynamicResistanceValidated:false,
    engineeringReleaseAuthorized:false
  };
}
