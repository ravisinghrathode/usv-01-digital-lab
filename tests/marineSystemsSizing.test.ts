import { describe, expect, it } from 'vitest';
import { screenLiftingLoadCase, screenThermalSteadyState } from '../src/core/verification/MarineSystemsSizing.ts';

const liftingCase = {
  caseId: 'UNIT-TEST-UNEQUAL-RIGGING',
  designVerticalLoadN: 1000,
  loadCaseSource: 'Synthetic bench scenario; not vessel handling data',
  legs: [
    { legId: 'A', verticalLoadShare: 0.7, angleFromVerticalRad: 0,
      workingLoadLimitN: 800, reference: 'Synthetic benchmark leg capacity' },
    { legId: 'B', verticalLoadShare: 0.3, angleFromVerticalRad: 0,
      workingLoadLimitN: 800, reference: 'Synthetic benchmark leg capacity' }
  ]
};
const thermalCase = {
  caseId: 'UNIT-TEST-THERMAL-STEADY',
  worstCaseSinkTemperatureK: 300,
  sinkConditionSource: 'Synthetic bench sink condition',
  components: [
    { componentId: 'SYNTHETIC-COMP-01', dissipationW: 20, totalResistanceKPerW: 0.5,
      maximumCaseTemperatureK: 320, reserveMarginK: 5,
      sourceReference: 'Synthetic manufacturer limit for unit test ONLY' }
  ]
};

describe('MAR-01 dimensionally safe numerical screens (NOT vessel validation)', () => {
  it('retains unequal rigging shares and reports tensions; never certifies lifting', () => {
    const r = screenLiftingLoadCase(liftingCase);
    expect(r.status).toBe('SCREEN_PASS_UNVERIFIED');
    expect(r.appliedVerticalLoadN).toBe(1000);
    expect(r.legTensionsN.map(x => x.tensionN)).toEqual([700, 300]);
    expect(r.engineeringAccepted).toBe(false);
  });
  it('captures high-angle amplified sling tension and WLL exceedance', () => {
    const r = screenLiftingLoadCase({
      ...liftingCase, legs: [
        { ...liftingCase.legs[0], angleFromVerticalRad: Math.PI / 3 },
        liftingCase.legs[1]
      ]
    });
    expect(r.status).toBe('NUMERIC_EXCEEDANCE');
    expect(r.legTensionsN[0].tensionN).toBeCloseTo(1400, 7);
    expect(r.maximumUtilization).toBeGreaterThan(1);
    expect(r.engineeringAccepted).toBe(false);
  });
  it('rejects equal-share assumptions when shares do not represent 100% of force', () => {
    const r = screenLiftingLoadCase({
      ...liftingCase, legs: liftingCase.legs.map(l => ({ ...l, verticalLoadShare: 0.25 }))
    });
    expect(r.status).toBe('INVALID_INPUT');
    expect(r.errors).toContain('vertical shares must sum to unity');
  });
  it('rejects singular sling angle, negative load, missing traceability or invalid WLL', () => {
    const r = screenLiftingLoadCase({
      ...liftingCase, designVerticalLoadN: -2, loadCaseSource: 'TBD',
      legs: [{ ...liftingCase.legs[0], angleFromVerticalRad: Math.PI / 2, workingLoadLimitN: 0 }]
    });
    expect(r.status).toBe('INVALID_INPUT');
    expect(r.legTensionsN).toHaveLength(0);
  });
  it('calculates illustrative conductive thermal steady state with margin', () => {
    const r = screenThermalSteadyState(thermalCase);
    expect(r.status).toBe('SCREEN_PASS_UNVERIFIED');
    expect(r.components[0].predictedCaseTemperatureK).toBe(310);
    expect(r.components[0].maximumAllowedWithMarginK).toBe(315);
    expect(r.components[0].marginK).toBe(5);
    expect(r.engineeringAccepted).toBe(false);
  });
  it('detects insufficient thermal path and prevents false qualification', () => {
    const r = screenThermalSteadyState({
      ...thermalCase, components: [
        { ...thermalCase.components[0], totalResistanceKPerW: 1.2 }
      ]
    });
    expect(r.status).toBe('NUMERIC_EXCEEDANCE');
    expect(r.components[0].predictedCaseTemperatureK).toBe(324);
    expect(r.engineeringAccepted).toBe(false);
  });
  it('requires positive absolute K, real component source, and positive K/W', () => {
    const r = screenThermalSteadyState({
      ...thermalCase, worstCaseSinkTemperatureK: 0,
      components: [{ ...thermalCase.components[0], totalResistanceKPerW: 0,
        sourceReference: 'TBD' }]
    });
    expect(r.status).toBe('INVALID_INPUT');
    expect(r.components).toHaveLength(0);
  });
  it('cannot certify even with numerically favourable synthetic cases', () => {
    expect(screenLiftingLoadCase(liftingCase).engineeringAccepted).toBe(false);
    expect(screenThermalSteadyState(thermalCase).engineeringAccepted).toBe(false);
  });
});
