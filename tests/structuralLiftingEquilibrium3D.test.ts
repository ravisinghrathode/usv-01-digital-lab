import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

const fixture=()=>({
  handlingMassKg: 100,
  dynamicAmplificationFactor: 1,
  cgPositionMeters: {x:0,y:0,z:0},
  inputBasis: 'ILLUSTRATIVE',
  geometrySourceRef: 'SYNTHETIC-GEO-TEST',
  massSourceRef: 'SYNTHETIC-MASS-TEST',
  reactionSourceRef: 'SYNTHETIC-RIGGING-TEST',
  points: [
    {id:'left',positionMeters:{x:-1,y:0,z:0},forceDirectionUnit:{x:0,y:0,z:1},tensionN:490.3325},
    {id:'right',positionMeters:{x:1,y:0,z:0},forceDirectionUnit:{x:0,y:0,z:1},tensionN:490.3325}
  ]
});
const run=(input:unknown)=>ToolRegistry.getInstance().executeTool('TOOL-STRUCTURES-LIFT-3D-01',input,['CALCULATION_EXEC']);

describe('3D lifting equilibrium audit — synthetic mathematical benchmarks',()=>{
  it('reconciles two vertical symmetric reactions, without issuing certification',async()=>{
    const r=await run(fixture());
    expect(r.success).toBe(true);
    expect(r.output.designVerticalWeightN).toBeCloseTo(980.665,6);
    expect(r.output.residualForceMagnitudeN).toBeCloseTo(0,8);
    expect(r.output.residualMomentMagnitudeNm).toBeCloseTo(0,8);
    expect(r.output.equilibriumStatus).toBe('ARITHMETICALLY_BALANCED_ONLY');
    expect(r.output.structuralComplianceValidated).toBe(false);
    expect(r.output.reactionInputsDerivedFromRigging).toBe(false);
    expect(r.output.liftingCertificationIssued).toBe(false);
  });
  it('rejects a moment-imbalanced set even when net vertical force is balanced',async()=>{
    const x=fixture();
    x.points[0].tensionN=600;
    x.points[1].tensionN=380.665;
    const r=await run(x);
    expect(r.success).toBe(true);
    expect(r.output.residualForceMagnitudeN).toBeCloseTo(0,8);
    expect(r.output.residualMomentMagnitudeNm).toBeCloseTo(219.335,6);
    expect(r.output.equilibriumStatus).toBe('UNBALANCED');
  });
  it('rejects both horizontal force residuals and moment residuals for bad sling directions',async()=>{
    const x=fixture();
    x.points[0].forceDirectionUnit={x:0.6,y:0,z:0.8};
    x.points[1].forceDirectionUnit={x:0.6,y:0,z:0.8};
    x.points[0].tensionN=980.665/(2*0.8);
    x.points[1].tensionN=980.665/(2*0.8);
    const r=await run(x);
    expect(r.success).toBe(true);
    expect(r.output.residualForceN.x).toBeCloseTo(735.49875,6);
    expect(r.output.residualForceN.z).toBeCloseTo(0,6);
    expect(r.output.equilibriumStatus).toBe('UNBALANCED');
  });
  it('checks full 3D direction signs using opposed sling angles',async()=>{
    const x=fixture();
    x.points[0].forceDirectionUnit={x:0.6,y:0,z:0.8};
    x.points[1].forceDirectionUnit={x:-0.6,y:0,z:0.8};
    x.points[0].tensionN=980.665/(2*0.8);
    x.points[1].tensionN=980.665/(2*0.8);
    const r=await run(x);
    expect(r.success).toBe(true);
    expect(r.output.residualForceMagnitudeN).toBeCloseTo(0,6);
    // Opposed tilted slings with equal and opposite x components
    // can satisfy global equilibrium; still NOT lifting-point capacity evidence.
    expect(r.output.equilibriumStatus).toBe('ARITHMETICALLY_BALANCED_ONLY');
    expect(r.output.certificationStatus).toBe('UNVERIFIED_NO_SAFE_TO_LIFT_RELEASE');
  });
  it('detects off-centre CG moment residual with symmetric reaction inputs',async()=>{
    const x=fixture();
    x.cgPositionMeters={x:0.2,y:0,z:0};
    const r=await run(x);
    expect(r.success).toBe(true);
    expect(r.output.residualMomentMagnitudeNm).toBeCloseTo(196.133,6);
    expect(r.output.equilibriumStatus).toBe('UNBALANCED');
  });
  it.each([
    ['not a unit direction',()=>({...fixture(),points:[{...fixture().points[0],forceDirectionUnit:{x:1,y:1,z:1}},fixture().points[1]]})],
    ['downward sling force',()=>({...fixture(),points:[{...fixture().points[0],forceDirectionUnit:{x:0,y:0,z:-1}},fixture().points[1]]})],
    ['duplicate point id',()=>({...fixture(),points:[fixture().points[0],{...fixture().points[1],id:'left'}]})],
    ['zero mass',()=>({...fixture(),handlingMassKg:0})],
    ['negative tension',()=>({...fixture(),points:[{...fixture().points[0],tensionN:-1},fixture().points[1]]})],
    ['invented approved basis',()=>({...fixture(),inputBasis:'APPROVED'})],
    ['unknown proposed geometry evidence',()=>({...fixture(),inputBasis:'PROPOSED',geometrySourceRef:'TBD'})],
  ])('rejects %s',async(_name,create)=>{
    const r=await run(create());
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/Validation/);
  });
  it('enforces the calculation permission',async()=>{
    const r=await ToolRegistry.getInstance().executeTool('TOOL-STRUCTURES-LIFT-3D-01',fixture(),[]);
    expect(r.success).toBe(false);
    expect(r.error).toContain('Permission Denied');
  });
});
