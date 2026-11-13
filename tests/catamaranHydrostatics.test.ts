import { describe,expect,it } from 'vitest';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

describe('Twin-demi-hull catamaran hydrostatic screening',()=>{
  it('uses separation in transverse waterplane inertia and stays explicitly uncertified',async()=>{
    const registry=ToolRegistry.getInstance();
    const common={lwlMeters:10,demiHullBeamMeters:1,draftMeters:0.5,
      blockCoefficientCb:0.5,waterplaneCoefficientCwp:0.7,kgMeters:0.8};
    const narrow=await registry.executeTool('TOOL-CATAMARAN-HYDROSTATICS-01',
      {...common,demiHullCenterlineSeparationMeters:2},['CALCULATION_EXEC']);
    const wide=await registry.executeTool('TOOL-CATAMARAN-HYDROSTATICS-01',
      {...common,demiHullCenterlineSeparationMeters:4},['CALCULATION_EXEC']);
    expect(narrow.success).toBe(true);
    expect(wide.success).toBe(true);
    expect(wide.output.transverseWaterplaneSecondMomentM4)
      .toBeGreaterThan(narrow.output.transverseWaterplaneSecondMomentM4);
    expect(wide.output.transverseMetacentricRadiusBmtM)
      .toBeGreaterThan(narrow.output.transverseMetacentricRadiusBmtM);
    expect(wide.output.waveInterferenceResistanceValidated).toBe(false);
    expect(wide.output.bridgeDeckSlammingValidated).toBe(false);
    expect(wide.output.designUsePermitted).toBe(false);
    expect(wide.engineeringReleaseAuthorized).toBe(false);
  });
  it('rejects physically overlapping demi-hull centrelines',async()=>{
    const result=await ToolRegistry.getInstance().executeTool(
      'TOOL-CATAMARAN-HYDROSTATICS-01',{
        lwlMeters:10,demiHullBeamMeters:1.2,draftMeters:0.5,
        blockCoefficientCb:0.5,waterplaneCoefficientCwp:0.7,
        demiHullCenterlineSeparationMeters:1.0
      },['CALCULATION_EXEC']);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Input Schema/);
  });
});
