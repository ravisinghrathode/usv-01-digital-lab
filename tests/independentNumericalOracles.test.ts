import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

const reference = JSON.parse(fs.readFileSync(
  path.resolve('tests/fixtures/independent-arithmetic-oracles.json'), 'utf8'
));
const registry = ToolRegistry.getInstance();
const execute = (id: string, params: Record<string, unknown>) =>
  registry.executeTool(id, params, ['CALCULATION_EXEC']);
const accurate = (actual: unknown, expected: number, tolerance: number, label: string) => {
  expect(typeof actual, label).toBe('number');
  expect(Number.isFinite(actual as number), label).toBe(true);
  expect(Math.abs((actual as number) - expected), label).toBeLessThanOrEqual(tolerance);
};

describe('Independent reference vectors: Python Decimal and geometric cross-products', () => {
  it('verifies exactly 800 deterministic externally computed math cases, not source replay', () => {
    const counts = ['hydro','resistance','mass','electrical','colregs'].map(k => reference[k].length);
    expect(counts).toEqual([150,150,150,150,200]);
    expect(reference.metadata.engineeringAccuracyCertified).toBe(false);
    expect(reference.metadata.source).toMatch(/Python Decimal/);
  });

  it('150 hydrostatic volume/mass arithmetic cross-checks; never certifies stability', async () => {
    for (const c of reference.hydro) {
      const r = await execute('TOOL-HYDROSTATICS-01', c.input);
      expect(r.success, c.id + ': ' + String(r.error)).toBe(true);
      accurate(r.output.displacedVolumeM3,c.reference.displacedVolumeM3,.00055,c.id+':volume');
      accurate(r.output.displacementTonnes,c.reference.displacementTonnes,.00055,c.id+':mass');
      expect(r.output.metacentricHeightGmtM,c.id).toBeNull();
      expect(r.output.complianceCheck.minGmMet,c.id).toBe(false);
      expect(r.output.engineeringComplianceValidated,c.id).toBe(false);
    }
  });

  it('150 resistance dimensional/Froude/Reynolds cross-checks; never claims validated power', async () => {
    for (const c of reference.resistance) {
      const r = await execute('TOOL-RESISTANCE-01', c.input);
      expect(r.success,c.id + ': '+String(r.error)).toBe(true);
      accurate(r.output.speedMps,c.reference.speedMps,.0051,c.id+':speed');
      accurate(r.output.froudeNumberFn,c.reference.froudeNumberFn,.00055,c.id+':Fn');
      accurate(r.output.reynoldsNumber,c.reference.reynoldsNumber,
        .00055 * c.reference.reynoldsNumber,c.id+':Re');
      accurate(r.output.totalResistanceKn,
        r.output.frictionalResistanceKn+r.output.residualResistanceKn,
        .0011,c.id+':sum');
      accurate(r.output.effectivePowerPeKw,
        r.output.totalResistanceKn*c.reference.speedMps,.015,c.id+':Pe');
      accurate(r.output.shaftBrakePowerPbKw,
        r.output.effectivePowerPeKw / c.reference.eta,.020,c.id+':Pb');
      expect(r.output.designUsePermitted,c.id).toBe(false);
      expect(r.output.residualDragModelValidated,c.id).toBe(false);
    }
  });

  it('150 independent Decimal mass/moment reconciliations with design growth', async () => {
    for (const c of reference.mass) {
      const r = await execute('TOOL-MASS-BALANCE-01',c.input);
      expect(r.success,c.id+': '+String(r.error)).toBe(true);
      for (const key of ['lightshipMassKg','designMarginMassKg','totalDisplacementKg']) {
        accurate(r.output[key],c.reference[key],.0051,c.id+':'+key);
      }
      for (const key of ['compositeLcgMeters','compositeTcgMeters','compositeKgMeters']) {
        accurate(r.output[key],c.reference[key],.00055,c.id+':'+key);
      }
    }
  });

  it('150 independent Decimal energy/load balance checks with all sizing blocked', async () => {
    for (const c of reference.electrical) {
      const r = await execute('TOOL-ELECTRICAL-01',c.input);
      expect(r.success,c.id+': '+String(r.error)).toBe(true);
      for (const key of ['totalContinuousPowerW','averagePowerW','peakPowerW',
        'nominalBusCurrentAmps','usableBatteryKwh','idealizedEnergyUpperBoundHours',
        'emergencyLoadPowerW']) {
        accurate(r.output[key],c.reference[key],key.endsWith('PowerW') || key.endsWith('continuousPowerW')
          ? .06 : .006,c.id+':'+key);
      }
      if (c.reference.idealizedEmergencyEnergyUpperBoundHours === null) {
        expect(r.output.idealizedEmergencyEnergyUpperBoundHours).toBeNull();
      } else {
        accurate(r.output.idealizedEmergencyEnergyUpperBoundHours,
          c.reference.idealizedEmergencyEnergyUpperBoundHours,.006,c.id+':emergency upper bound');
      }
      expect(r.output.estimatedEnduranceHours,c.id).toBeNull();
      expect(r.output.emergencyEnduranceHours,c.id).toBeNull();
      expect(r.output.recommendedMainFuseRatingAmps,c.id).toBeNull();
      expect(r.output.protectiveDeviceSizingValidated,c.id).toBe(false);
      expect(r.output.missionEnduranceValidated,c.id).toBe(false);
    }
  });

  it('200 CPA cross-product reference cases use true bearing and give no certified maneuver', async () => {
    for (const c of reference.colregs) {
      const r = await execute('TOOL-COLREGS-01',c.input);
      expect(r.success,c.id+': '+String(r.error)).toBe(true);
      accurate(r.output.relativeSpeedKnots,c.reference.relativeSpeedKnots,.0051,c.id+':relative speed');
      accurate(r.output.closestPointOfApproachCpaNm,c.reference.closestPointOfApproachCpaNm,.00002,c.id+':CPA');
      accurate(r.output.timeToCpaMinutes,c.reference.timeToCpaMinutes,.00015,c.id+':TCPA');
      expect(r.output.bearingReference,c.id).toBe('TRUE_NORTH');
      expect(r.output.safeAlterationCourseDeg,c.id).toBeUndefined();
      expect(r.output.maneuverValidated,c.id).toBe(false);
      expect(r.output.legalApplicabilityValidated,c.id).toBe(false);
    }
  });
});

describe('Safety-critical numeric boundary and metamorphic checks', () => {
  const hydro = { lwlMeters:10,beamMeters:2.5,draftMeters:.6,blockCoefficientCb:.45,
    seawaterDensityKgM3:1025 };
  const resistance = { lwlMeters:10,beamMeters:2.5,draftMeters:.6,displacementTonnes:6.91875,
    speedKnots:12,propulsiveEfficiencyEtaD:.65,waterTempCelsius:15 };
  const electrical = { busVoltageV:48,batteryTotalKwh:120,usableDepthOfDischarge:.8,
    consumers:[{name:'LOAD-1',voltageV:48,continuousPowerW:6000,intermittentPowerW:300,
       dutyCycle:.5,isEmergencyLoad:true}] };
  const colreg = { ownCourseDeg:40,ownSpeedKnots:14,targetBearingDeg:75,
    bearingReference:'TRUE_NORTH',targetRangeNm:2,targetCourseDeg:200,targetSpeedKnots:10,
    visibilityMode:'UNKNOWN',ownVesselType:'UNKNOWN',targetVesselType:'UNKNOWN' };

  it('arithmetic doubles hull mass if waterline length doubles at same B,T,Cb,rho',async () => {
    const a=await execute('TOOL-HYDROSTATICS-01',hydro);
    const b=await execute('TOOL-HYDROSTATICS-01',{...hydro,lwlMeters:20});
    expect(a.success&&b.success).toBe(true);
    accurate(b.output.displacementTonnes,2*a.output.displacementTonnes,.003,'mass scale');
  });

  it('rejects incompatible mass and Cb instead of modifying design inputs',async () => {
    const r=await execute('TOOL-HYDROSTATICS-01',{...hydro,displacementTonnes:5.5});
    expect(r.success).toBe(false);
  });

  it('resistance is continuous near Fn=0.8 instead of jumping 10kW at the boundary',async () => {
    const speedAt=(Fn:number)=>Fn*Math.sqrt(9.80665*resistance.lwlMeters)/(1852/3600);
    const a=await execute('TOOL-RESISTANCE-01',{...resistance,speedKnots:speedAt(.8-1e-6)});
    const b=await execute('TOOL-RESISTANCE-01',{...resistance,speedKnots:speedAt(.8+1e-6)});
    expect(a.success && b.success).toBe(true);
    accurate(b.output.totalResistanceKn,a.output.totalResistanceKn,.009,'Fn=0.8 continuity');
    accurate(b.output.effectivePowerPeKw,a.output.effectivePowerPeKw,.09,'Fn=0.8 power continuity');
  });

  it('rejects unsupported seawater temperature rather than using a hidden 15C viscosity',async () => {
    expect((await execute('TOOL-RESISTANCE-01',{...resistance,waterTempCelsius:35})).success).toBe(false);
  });

  it('mass ledger rejects duplicate component labels',async () => {
    const item={name:'BATTERY',massKg:500,lcgMetersFromTransom:5,tcgMetersFromCl:0,
      vcgMetersFromKeel:.5,designMarginPercent:0};
    const r=await execute('TOOL-MASS-BALANCE-01',{components:[item,{...item,name:'battery'}]});
    expect(r.success).toBe(false);
  });

  it('rejects duplicated electrical consumers and zero-mean demand',async () => {
    const base=electrical.consumers[0];
    expect((await execute('TOOL-ELECTRICAL-01',
      {...electrical,consumers:[base,{...base,name:'load-1'}]})).success).toBe(false);
    expect((await execute('TOOL-ELECTRICAL-01',
      {...electrical,consumers:[{...base,continuousPowerW:0,intermittentPowerW:0}]})).success).toBe(false);
  });

  it('refuses electrical converter mismatch without a loss model',async () => {
    const r=await execute('TOOL-ELECTRICAL-01',
      {...electrical,consumers:[{...electrical.consumers[0],voltageV:24}]});
    expect(r.success).toBe(false);
  });

  it('structural sizing results remain unavailable across varying panels and speeds',async () => {
    for (const w of [200,400,800]) for (const v of [5,20,35]) {
      const r=await execute('TOOL-STRUCTURES-01',
        {displacementTonnes:6.5,speedKnots:v,lwlMeters:10,
          unsupportedPanelWidthMm:w,unsupportedPanelLengthMm:900,
          deadriseAngleDeg:18,materialYieldStrengthMpa:125,safetyFactor:2});
      expect(r.success).toBe(true);
      expect(r.output.modelStatus).toBe('BLOCKED_UNVALIDATED_SCANTLING_FORMULA');
      for(const key of ['designSlammingPressureKpa','minPlatingThicknessMm',
        'recommendedNominalThicknessMm','stiffenerSectionModulusCm3']) {
        expect(r.output[key],key).toBeNull();
      }
    }
  });

  it('requires explicit true-bearing frame of reference before CPA is computed',async () => {
    const {bearingReference,...unknown}=colreg;
    const r=await execute('TOOL-COLREGS-01',unknown);
    expect(r.success).toBe(false);
  });

  it('CPA is invariant under rotation of the full true-north coordinate frame',async () => {
    const a=await execute('TOOL-COLREGS-01',colreg);
    const rot=(heading:number)=>(heading+100)%360;
    const b=await execute('TOOL-COLREGS-01',{...colreg,
      ownCourseDeg:rot(colreg.ownCourseDeg),targetCourseDeg:rot(colreg.targetCourseDeg),
      targetBearingDeg:rot(colreg.targetBearingDeg)});
    expect(a.success && b.success).toBe(true);
    accurate(b.output.closestPointOfApproachCpaNm,a.output.closestPointOfApproachCpaNm,.00002,'rotated CPA');
    accurate(b.output.timeToCpaMinutes,a.output.timeToCpaMinutes,.00015,'rotated TCPA');
  });

  it('null, false, string and undeclared units are rejected as numeric input', async () => {
    for (const invalid of [null, false, '0', '12.0', '', {}, []]) {
      expect((await execute('TOOL-HYDROSTATICS-01',
        {...hydro, draftMeters: invalid})).success).toBe(false);
      expect((await execute('TOOL-COLREGS-01',
        {...colreg, ownCourseDeg: invalid})).success).toBe(false);
      expect((await execute('TOOL-ELECTRICAL-01',
        {...electrical, busVoltageV: invalid})).success).toBe(false);
    }
  });

  it('missing reference parameters fail closed; no default 120kWh battery, 125MPa yield or propulsive efficiency',async () => {
    const {batteryTotalKwh, ...unratedBattery} = electrical;
    expect((await execute('TOOL-ELECTRICAL-01',unratedBattery)).success).toBe(false);
    const {propulsiveEfficiencyEtaD, ...unratedPropulsion} = resistance;
    expect((await execute('TOOL-RESISTANCE-01',unratedPropulsion)).success).toBe(false);
    const example = { displacementTonnes:6.5,speedKnots:15,lwlMeters:10,
      unsupportedPanelWidthMm:400,unsupportedPanelLengthMm:800,
      deadriseAngleDeg:18,safetyFactor:2 };
    expect((await execute('TOOL-STRUCTURES-01',example)).success).toBe(false);
  });

  it('unknown LCB is NOT silently labelled as aligned trim',async () => {
    const r=await execute('TOOL-MASS-BALANCE-01',reference.mass[0].input);
    expect(r.success).toBe(true);
    expect(r.output.longitudinalTrimEvaluation.trimRisk).toBe('UNASSESSED_NO_LCB');
    expect(r.output.massLedgerComplete).toBe(false);
    expect(r.output.hydrostaticDisplacementReconciled).toBe(false);
  });

  it('all six direct engineering tool calls explicitly refuse release or autonomous control',async () => {
    const payloads: [string, Record<string,unknown>][]=[
      ['TOOL-HYDROSTATICS-01',hydro],
      ['TOOL-RESISTANCE-01',resistance],
      ['TOOL-MASS-BALANCE-01',reference.mass[0].input],
      ['TOOL-ELECTRICAL-01',electrical],
      ['TOOL-STRUCTURES-01',{displacementTonnes:6.5,speedKnots:20,lwlMeters:10,
        unsupportedPanelWidthMm:400,unsupportedPanelLengthMm:800,
        materialYieldStrengthMpa:125,safetyFactor:2,deadriseAngleDeg:18}],
      ['TOOL-COLREGS-01',colreg]
    ];
    for (const [id,params] of payloads) {
      const r=await execute(id,params);
      expect(r.success,id).toBe(true);
      expect(r.engineeringReleaseAuthorized,id).toBe(false);
      expect(r.independentReferenceValidated,id).toBe(false);
      expect(r.resultDisposition,id).toBe('ANALYSIS_ONLY_NEVER_ACTUATE');
    }
  });

  it('invalid-input tool failures are equally refused for release',async () => {
    const r=await execute('TOOL-HYDROSTATICS-01',{...hydro,blockCoefficientCb:null});
    expect(r.success).toBe(false);
    expect(r.engineeringReleaseAuthorized).toBe(false);
    expect(r.independentReferenceValidated).toBe(false);
    expect(r.resultDisposition).toBe('ANALYSIS_ONLY_NEVER_ACTUATE');
  });

  it('unbounded or nonfinite inputs are rejected rather than producing a success status',async () => {
    for(const invalid of [Infinity,NaN,-Infinity,1e309]) {
      expect((await execute('TOOL-HYDROSTATICS-01',{...hydro,lwlMeters:invalid})).success).toBe(false);
      expect((await execute('TOOL-ELECTRICAL-01',{...electrical,busVoltageV:invalid})).success).toBe(false);
    }
  });
});
