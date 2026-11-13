import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

const sample=()=>({
  pressurePa: 35000,
  tributaryWidthMeters: 0.45,
  unsupportedSpanMeters: 0.9,
  stressDivisorMPa: 62.5,
  inputBasis:'ILLUSTRATIVE',
  pressureSourceRef:'SYNTHETIC-PRESSURE',
  spanSourceRef:'SYNTHETIC-GEOMETRY',
  stressSourceRef:'SYNTHETIC-STRESS'
});
const run=(v:unknown)=>ToolRegistry.getInstance().executeTool('TOOL-STRUCTURES-BEAM-01',v,['CALCULATION_EXEC']);

describe('Generic beam arithmetic, separated from unvalidated hull scantlings',()=>{
  it('matches SI-units simply supported UDL worked example',async()=>{
    const r=await run(sample());
    expect(r.success).toBe(true);
    expect(r.output.uniformLineLoadNPerMeter).toBeCloseTo(15750,8);
    expect(r.output.peakSimplySupportedMomentNm).toBeCloseTo(1594.6875,8);
    expect(r.output.sectionModulusCm3).toBeCloseTo(25.515,8);
    expect(r.output.modelStatus).toBe('UNVERIFIED_SIMPLY_SUPPORTED_BEAM_ARITHMETIC');
    expect(r.output.structuralComplianceValidated).toBe(false);
    expect(r.output.designUsePermitted).toBe(false);
  });
  it('scales linearly with input load and quadratically with span',async()=>{
    const normal=await run(sample());
    const twicePressure=await run({...sample(),pressurePa:70000});
    const twiceSpan=await run({...sample(),unsupportedSpanMeters:1.8});
    expect(twicePressure.output.sectionModulusCm3).toBeCloseTo(2*normal.output.sectionModulusCm3,8);
    expect(twiceSpan.output.peakSimplySupportedMomentNm).toBeCloseTo(4*normal.output.peakSimplySupportedMomentNm,8);
  });
  it.each([
    ['no design pressure',{...sample(),pressurePa:undefined}],
    ['zero span',{...sample(),unsupportedSpanMeters:0}],
    ['missing stress divisor',{...sample(),stressDivisorMPa:undefined}],
    ['fabricated approved basis',{...sample(),inputBasis:'APPROVED'}],
    ['unknown source',{...sample(),inputBasis:'PROPOSED',pressureSourceRef:'TBD'}],
  ])('rejects %s',async(_label,v)=>{
    const r=await run(v);
    expect(r.success).toBe(false);
    expect(r.error).toContain('Validation');
  });
  it('respects tool permission and never issues a design certificate',async()=>{
    const r=await ToolRegistry.getInstance().executeTool('TOOL-STRUCTURES-BEAM-01',sample(),[]);
    expect(r.success).toBe(false);
    expect(r.error).toContain('Permission Denied');
  });
});
