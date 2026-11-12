import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';

const tool = ToolRegistry.getInstance();
const approach = {
  ownCourseDeg: 0, ownSpeedKnots: 12,
  targetBearingDeg: 0, targetRangeNm: 2,
  targetCourseDeg: 180, targetSpeedKnots: 12
};
async function check(extra: object) {
  const result = await tool.executeTool('TOOL-COLREGS-01',
    { ...approach, ...extra }, ['CALCULATION_EXEC']);
  expect(result.success, result.error).toBe(true);
  expect(result.output.closestPointOfApproachCpaNm).toBe(0);
  expect(result.output.timeToCpaMinutes).toBeCloseTo(5, 1);
  expect(result.output.safeAlterationCourseDeg).toBeUndefined();
  expect(result.output.legalApplicabilityValidated).toBe(false);
  expect(result.output.maneuverValidated).toBe(false);
  return result.output;
}

describe('COLREG law-applicability and non-actuating CPA safety screening', () => {
  it('does not presume Rule 14 from kinematics without a visibility assessment', async () => {
    const r = await check({});
    expect(r.visibilityMode).toBe('UNKNOWN');
    expect(r.colregsRuleApplicable).toBe('LEGAL_APPLICABILITY_UNDETERMINED');
    expect(r.mandatedAction).toMatch(/Visibility not established/);
  });
  it('uses restricted visibility screening instead of in-sight head-on rules', async () => {
    const r = await check({ visibilityMode: 'RESTRICTED' });
    expect(r.colregsRuleApplicable).toBe('RULE_19_RESTRICTED_VISIBILITY');
    expect(r.mandatedAction).toMatch(/safe speed/);
  });
  it('rejects head-on rule when a target type is not confirmed as power-driven', async () => {
    const r = await check({
      visibilityMode: 'IN_SIGHT', ownVesselType: 'POWER_DRIVEN',
      targetVesselType: 'UNKNOWN'
    });
    expect(r.colregsRuleApplicable).toBe('OTHER_VESSEL_PRIORITY_UNASSESSED');
  });
  it('classifies a confirmed two-power-driven in-sight head-on scenario as screening only', async () => {
    const r = await check({
      visibilityMode: 'IN_SIGHT',
      ownVesselType: 'POWER_DRIVEN',
      targetVesselType: 'POWER_DRIVEN'
    });
    expect(r.colregsRuleApplicable).toBe('RULE_14_HEAD_ON');
  });
  it('treats declared non-power-driven contacts as unassessed priority cases', async () => {
    const r = await check({
      visibilityMode: 'IN_SIGHT',
      ownVesselType: 'POWER_DRIVEN',
      targetVesselType: 'OTHER'
    });
    expect(r.colregsRuleApplicable).toBe('OTHER_VESSEL_PRIORITY_UNASSESSED');
  });
});
