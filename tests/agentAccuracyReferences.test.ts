import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';
import { screenAgentAccuracy } from '../src/core/verification/AgentAccuracyScreen.ts';
const registry = ToolRegistry.getInstance();
const calc = (id: string, input: object) => registry.executeTool(id, input, ['CALCULATION_EXEC']);

describe('AGT-02 reproducible first-principles worked-example checks', () => {
  it('rejects contradictory hydrostatic displacement, Cb, and missing KG instead of guessing', async () => {
    const hull = { lwlMeters: 10, beamMeters: 2.5, draftMeters: 0.6, seawaterDensityKgM3: 1025 };
    const contradictory = await calc('TOOL-HYDROSTATICS-01', { ...hull, blockCoefficientCb: 0.45, displacementTonnes: 5.5, kgMeters: 0.8 });
    expect(contradictory.success).toBe(false);
    expect(contradictory.validationErrors?.join(' ')).toMatch(/mass conservation/i);
    expect((await calc('TOOL-HYDROSTATICS-01', hull)).success).toBe(false);
    const inferred = await calc('TOOL-HYDROSTATICS-01', { ...hull, displacementTonnes: 5.5 });
    expect(inferred.success).toBe(true);
    expect(inferred.output.displacedVolumeM3).toBeCloseTo(5.366, 3);
    expect(inferred.output.metacentricHeightGmtM).toBeNull();
    expect(inferred.output.stabilityStatus).toBe('UNVERIFIED_ESTIMATE');
    expect(inferred.output.engineeringComplianceValidated).toBe(false);
  });

  it('screens prismatic displacement independently without asserting GZ/class compliance', async () => {
    const r = await calc('TOOL-HYDROSTATICS-01', {
      lwlMeters: 10, beamMeters: 2.5, draftMeters: 0.6, blockCoefficientCb: 0.45,
      waterplaneCoefficientCwp: 0.65, kgMeters: 0.8, seawaterDensityKgM3: 1025
    });
    expect(r.success).toBe(true);
    expect(r.output.displacedVolumeM3).toBe(6.75);
    expect(r.output.displacementTonnes).toBeCloseTo(6.91875, 3);
    expect(r.output.centerOfBuoyancyKbM).toBeCloseTo(0.362, 3);
    expect(r.output.stabilityStatus).toBe('UNVERIFIED_ESTIMATE');
    expect(r.output.isPreliminaryEstimate).toBe(true);
  });

  it('checks independent unit conversion, Froude number and power identity', async () => {
    // Test-only hypothetical resistance and efficiency, never project acceptance evidence.
    const r = await calc('TOOL-RESISTANCE-01', {
      lwlMeters: 10, beamMeters: 2.5, draftMeters: 0.6,
      displacementTonnes: 5.5, speedKnots: 15,
      documentedTotalResistanceKn: 4,
      resistanceEvidenceRef: 'TEST-WORKED-RES-01',
      propulsiveEfficiencyEtaD: 0.65,
      efficiencyEvidenceRef: 'TEST-WORKED-ETA-01'
    });
    expect(r.success).toBe(true);
    expect(r.output.speedMps).toBeCloseTo(15 * 1852 / 3600, 2);
    expect(r.output.froudeNumberFn).toBeCloseTo(0.779, 2);
    expect(r.output.effectivePowerPeKw).toBeCloseTo(4 * 15 * 1852 / 3600, 5);
    expect(r.output.shaftBrakePowerPbKw).toBeCloseTo(4 * 15 * 1852 / 3600 / 0.65, 5);
    expect(r.output.modelStatus).toBe('EVIDENCE_REFERENCED_UNVERIFIED');
    expect(r.output.engineeringComplianceValidated).toBe(false);
  });

  it('checks mass conservation and centre-of-gravity moment arithmetic', async () => {
    const r = await calc('TOOL-MASS-BALANCE-01', { components: [
      { name:'Hull', massKg:1600, lcgMetersFromTransom:4.8, tcgMetersFromCl:0, vcgMetersFromKeel:0.6, designMarginPercent:10 },
      { name:'Pods', massKg:350, lcgMetersFromTransom:1.5, tcgMetersFromCl:0, vcgMetersFromKeel:0.4, designMarginPercent:5 },
      { name:'Battery', massKg:1100, lcgMetersFromTransom:3.5, tcgMetersFromCl:0, vcgMetersFromKeel:0.35, designMarginPercent:10 },
      { name:'Sensor', massKg:150, lcgMetersFromTransom:5.5, tcgMetersFromCl:0, vcgMetersFromKeel:2.0, designMarginPercent:15 }
    ] });
    expect(r.success).toBe(true);
    expect(r.output.lightshipMassKg).toBe(3200);
    expect(r.output.designMarginMassKg).toBe(310);
    expect(r.output.totalDisplacementKg).toBe(3510);
    expect(r.output.compositeLcgMeters).toBeCloseTo(
      (1760*4.8 + 367.5*1.5 + 1210*3.5 + 172.5*5.5) / 3510, 3
    );
    expect(r.output.compositeTcgMeters).toBe(0);
    expect((await calc('TOOL-MASS-BALANCE-01',{components:[]})).success).toBe(false);
  });

  it('correctly accounts for intermittent duty cycle in battery endurance', async () => {
    const r = await calc('TOOL-ELECTRICAL-01', {
      busVoltageV:48, batteryTotalKwh:120, usableDepthOfDischarge:0.8,
      consumers:[
        {name:'Prop',voltageV:48,continuousPowerW:6000,intermittentPowerW:0,dutyCycle:1,isEmergencyLoad:false},
        {name:'Radar',voltageV:48,continuousPowerW:450,intermittentPowerW:100,dutyCycle:0.5,isEmergencyLoad:true},
        {name:'Computer',voltageV:48,continuousPowerW:150,intermittentPowerW:0,dutyCycle:1,isEmergencyLoad:true},
        {name:'Comms',voltageV:48,continuousPowerW:80,intermittentPowerW:40,dutyCycle:0.3,isEmergencyLoad:true}
      ]
    });
    expect(r.success).toBe(true);
    expect(r.output.totalContinuousPowerW).toBe(6680);
    expect(r.output.averagePowerW).toBe(6742);
    expect(r.output.nominalBusCurrentAmps).toBeCloseTo(6742/48, 2);
    expect(r.output.usableBatteryKwh).toBe(96);
    expect(r.output.estimatedEnduranceHours).toBeCloseTo(96000/6742, 2);
    expect((await calc('TOOL-ELECTRICAL-01',{busVoltageV:0,consumers:[]})).success).toBe(false);
  });

  it('does not call uncorrelated slamming formulas certified or accept zero material strength', async () => {
    const example = { displacementTonnes:6.5, speedKnots:25, lwlMeters:9.5,
      unsupportedPanelWidthMm:350, unsupportedPanelLengthMm:700, deadriseAngleDeg:18,
      materialYieldStrengthMpa:125, safetyFactor:2 };
    const r = await calc('TOOL-STRUCTURES-01',example);
    expect(r.success).toBe(true);
    expect(r.output.engineeringComplianceValidated).toBe(false);
    expect(r.output.modelStatus).toBe('UNVALIDATED_SCANTLING_SCREEN');
    expect((await calc('TOOL-STRUCTURES-01',{...example,safetyFactor:0})).success).toBe(false);
    expect((await calc('TOOL-STRUCTURES-01',{...example,materialYieldStrengthMpa:-1})).success).toBe(false);
  });

  it('checks head-on CPA geometry without issuing a purported safe helm course', async () => {
    const r = await calc('TOOL-COLREGS-01', {
      ownCourseDeg:0,ownSpeedKnots:12,targetBearingDeg:0,targetRangeNm:2,
      targetCourseDeg:180,targetSpeedKnots:12
    });
    expect(r.success).toBe(true);
    expect(r.output.relativeSpeedKnots).toBeCloseTo(24,1);
    expect(r.output.closestPointOfApproachCpaNm).toBeCloseTo(0,2);
    expect(r.output.timeToCpaMinutes).toBeCloseTo(5,1);
    expect(r.output.colregsRuleApplicable).toBe('RULE_14_HEAD_ON');
    expect(r.output.safeAlterationCourseDeg).toBeUndefined();
  });
});

describe('AGT-02 measured accuracy of 26 archived live Gemini outputs', () => {
  const historical = JSON.parse(fs.readFileSync(
    path.resolve('evidence/live-agents/live-gemini-26-20261113.json'),'utf8'
  ));
  it('finds numerical failures and separates qualitative specialties', () => {
    const r = screenAgentAccuracy(historical.cases);
    expect(r.agentCount).toBe(26);
    expect(r.sampleMissing).toBe(0);
    expect(r.analyticPass + r.analyticFail + r.humanReviewRequired).toBe(26);
    expect(r.rows.find(x=>x.agentId==='A14')?.status).toBe('ANALYTIC_FAIL');
    expect(r.rows.find(x=>x.agentId==='A05')?.status).toBe('ANALYTIC_PASS_UNCERTIFIED');
    expect(r.rows.find(x=>x.agentId==='A16')?.status).toBe('QUALITATIVE_REVIEW_REQUIRED');
    expect(r.independentlyValidatedAgents).toBe(0);
  });
  it('fails closed on injected wrong values and missing provider evidence', () => {
    const corrupt = historical.cases.map((x:any) => x.canonicalId==='A05' ?
      {...x,parsedOutput:{...x.parsedOutput,keyMetrics:{...x.parsedOutput.keyMetrics,calculated_cb:0.9}}} : x);
    expect(screenAgentAccuracy(corrupt).rows.find(x=>x.agentId==='A05')?.status).toBe('ANALYTIC_FAIL');
    expect(screenAgentAccuracy([]).sampleMissing).toBe(26);
  });
});
