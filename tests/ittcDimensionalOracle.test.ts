import { describe, it, expect } from 'vitest';
import { runIttcIdentityOracle } from '../src/core/verification/IttcDimensionalOracle.ts';

const screeningInput = {
  id:'ITTC-SCREEN-EXAMPLE-01',
  lwlMeters:10, beamMeters:3, draftMeters:0.7,
  displacementTonnes:11.83875,
  speedKnots:10, propulsiveEfficiencyEtaD:0.6,
  waterTempCelsius:15 as const
};
describe('Independent ITTC dimensionless identities — not towing-tank validation',()=>{
  it('compares actual registered resistance tool to independently implemented equations',async()=>{
    const x=await runIttcIdentityOracle([screeningInput]);
    expect(x.status).toBe('PASS_DIMENSIONAL_IDENTITIES_UNCERTIFIED');
    expect(x.measurements).toHaveLength(1);
    expect(x.measurements[0].metrics.map(m=>m.key)).toEqual(
      ['speedMps','froudeNumberFn','reynoldsNumber']);
    expect(x.measurements[0].metrics.every(m=>m.pass)).toBe(true);
    expect(x.hydrodynamicResistanceValidated).toBe(false);
    expect(x.sourcePdfDigestAuthenticated).toBe(false);
    expect(x.engineeringReleaseAuthorized).toBe(false);
  });
  it('rejects a fabricated Froude/Re output despite truthful inputs',async()=>{
    const x=await runIttcIdentityOracle([screeningInput],async()=>({
      success:true,output:{speedMps:5.1444,froudeNumberFn:999,reynoldsNumber:1}
    }));
    expect(x.status).toBe('FAIL_DIMENSIONAL_IDENTITIES');
    expect(x.measurements[0].metrics.filter(m=>!m.pass).length).toBeGreaterThan(0);
  });
  it('does not turn absent measured references or invalid input into a pass',async()=>{
    expect((await runIttcIdentityOracle([])).status).toBe('NO_CASES');
    const invalid=await runIttcIdentityOracle([{...screeningInput,waterTempCelsius:25 as 15}]);
    expect(invalid.status).toBe('FAIL_DIMENSIONAL_IDENTITIES');
  });
});
