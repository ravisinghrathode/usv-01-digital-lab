/**
 * MAR-01 dimensional engineering screens. Illustrative / preliminary only:
 * Do not use outputs as lifting certification, thermal qualification,
 * manufacturer compliance, safe operation, or human design approval.
 * Every input shall be drawn from a controlled approved design/test basis.
 */
type ScreenVerdict = 'INVALID_INPUT' | 'NUMERIC_EXCEEDANCE' | 'SCREEN_PASS_UNVERIFIED';

export interface LiftLeg {
  legId: string;
  /** Vertical load share derived from actual rigging equilibrium, NOT an assumed equal split. */
  verticalLoadShare: number;
  /** Angle from vertical, radians. */
  angleFromVerticalRad: number;
  /** Certified capacity at the permitted rigging configuration, N. */
  workingLoadLimitN: number;
  /** Source for load-share derivation and rigging/attachment capacity, not a TBD placeholder. */
  reference: string;
}

export interface LiftingScreenInput {
  caseId: string;
  /** Approved design load including full handling mass and dynamic effects, N. */
  designVerticalLoadN: number;
  loadCaseSource: string;
  legs: readonly LiftLeg[];
}

export interface LiftingScreenResult {
  status: ScreenVerdict;
  errors: string[];
  appliedVerticalLoadN: number | null;
  legTensionsN: Array<{ legId: string; tensionN: number; utilization: number }>;
  maximumUtilization: number | null;
  engineeringAccepted: false;
  qualification: string;
}

const validNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const validRef = (x: unknown): x is string => typeof x === 'string' &&
  x.trim().length > 2 && !/^(TBD|pending|unknown|none|n\/a|example|test)$/i.test(x.trim());

export function screenLiftingLoadCase(input: LiftingScreenInput): LiftingScreenResult {
  const errors: string[] = [];
  if (!validRef(input?.caseId) || !validRef(input?.loadCaseSource)) errors.push('missing load case identity or independent design load source');
  if (!validNumber(input?.designVerticalLoadN) || input.designVerticalLoadN <= 0) errors.push('positive design vertical force in N required');
  if (!Array.isArray(input?.legs) || input.legs.length === 0) errors.push('at least one substantiated lifting leg required');
  const seen = new Set<string>();
  let shareSum = 0;
  for (const leg of input?.legs ?? []) {
    if (!validRef(leg?.legId) || seen.has(leg.legId)) errors.push('invalid or duplicate lifting leg ID');
    seen.add(leg?.legId);
    if (!validNumber(leg?.verticalLoadShare) || leg.verticalLoadShare < 0 || leg.verticalLoadShare > 1) {
      errors.push('leg load share must be within [0,1]');
    } else shareSum += leg.verticalLoadShare;
    if (!validNumber(leg?.angleFromVerticalRad) || leg.angleFromVerticalRad < 0 || leg.angleFromVerticalRad >= Math.PI / 2) errors.push('angle from vertical must be in [0,pi/2) rad');
    if (!validNumber(leg?.workingLoadLimitN) || leg.workingLoadLimitN <= 0) errors.push('positive certified leg WLL in N required');
    if (!validRef(leg?.reference)) errors.push('missing rigging/equilibrium and WLL reference');
  }
  if ((input?.legs?.length ?? 0) > 0 && Math.abs(shareSum - 1) > 1e-6) errors.push('vertical shares must sum to unity');
  if (errors.length) {
    return { status: 'INVALID_INPUT', errors, appliedVerticalLoadN: null, legTensionsN: [],
      maximumUtilization: null, engineeringAccepted: false,
      qualification: 'No engineering result from invalid or untraceable inputs.' };
  }
  const legTensionsN = input.legs.map(leg => {
    const tensionN = input.designVerticalLoadN * leg.verticalLoadShare / Math.cos(leg.angleFromVerticalRad);
    return { legId: leg.legId, tensionN, utilization: tensionN / leg.workingLoadLimitN };
  });
  const maximumUtilization = Math.max(...legTensionsN.map(x => x.utilization));
  return {
    status: maximumUtilization > 1 ? 'NUMERIC_EXCEEDANCE' : 'SCREEN_PASS_UNVERIFIED',
    errors: [], appliedVerticalLoadN: input.designVerticalLoadN,
    legTensionsN, maximumUtilization, engineeringAccepted: false,
    qualification: 'Screen checks stated leg tensions against stated WLL only. Load shares must come from certified geometry/CG and rigging equilibrium; attachment strength, local structure, lateral loads, fatigue, impact, proof tests and regulatory approval remain independent gates.'
  };
}

export interface ThermalComponent {
  componentId: string;
  /** Worst-case net heat dissipated by this component into the selected path, W. */
  dissipationW: number;
  /** Entire component-case-to-external-sink resistance including fouling/low flow, K/W. */
  totalResistanceKPerW: number;
  /** Manufacturer-approved maximum component case temperature, K. */
  maximumCaseTemperatureK: number;
  /** Owner-approved design margin below maximum temperature, K. */
  reserveMarginK: number;
  /** Supplier and assembly/thermal test reference. */
  sourceReference: string;
}

export interface ThermalScreenInput {
  caseId: string;
  /** Conservative thermal sink temperature for the actual duty/envelope, K. */
  worstCaseSinkTemperatureK: number;
  sinkConditionSource: string;
  /** Assumes independent paths; common hull heat coupling must be analyzed separately. */
  components: readonly ThermalComponent[];
}

export interface ThermalScreenResult {
  status: ScreenVerdict;
  errors: string[];
  components: Array<{
    componentId: string;
    predictedCaseTemperatureK: number;
    maximumAllowedWithMarginK: number;
    marginK: number;
  }>;
  engineeringAccepted: false;
  qualification: string;
}

export function screenThermalSteadyState(input: ThermalScreenInput): ThermalScreenResult {
  const errors: string[] = [];
  if (!validRef(input?.caseId) || !validRef(input?.sinkConditionSource)) errors.push('missing thermal case or sink condition source');
  if (!validNumber(input?.worstCaseSinkTemperatureK) || input.worstCaseSinkTemperatureK <= 0) errors.push('positive absolute sink temperature in K required');
  if (!Array.isArray(input?.components) || !input.components.length) errors.push('at least one heat source with approved limit required');
  const seen = new Set<string>();
  for (const c of input?.components ?? []) {
    if (!validRef(c?.componentId) || seen.has(c.componentId)) errors.push('invalid or duplicate component ID');
    seen.add(c?.componentId);
    if (!validNumber(c?.dissipationW) || c.dissipationW < 0) errors.push('nonnegative component heat load in W required');
    if (!validNumber(c?.totalResistanceKPerW) || c.totalResistanceKPerW <= 0) errors.push('positive thermal resistance in K/W required');
    if (!validNumber(c?.maximumCaseTemperatureK) || c.maximumCaseTemperatureK <= 0) errors.push('manufacturer maximum case temperature in K required');
    if (!validNumber(c?.reserveMarginK) || c.reserveMarginK < 0) errors.push('nonnegative margin in K required');
    if (!validRef(c?.sourceReference)) errors.push('component thermal limit/heat load source required');
  }
  if (errors.length) {
    return { status: 'INVALID_INPUT', errors, components: [], engineeringAccepted: false,
      qualification: 'No thermal engineering result from invalid or untraceable inputs.' };
  }
  const components = input.components.map(c => {
    const predictedCaseTemperatureK = input.worstCaseSinkTemperatureK +
      c.dissipationW * c.totalResistanceKPerW;
    const maximumAllowedWithMarginK = c.maximumCaseTemperatureK - c.reserveMarginK;
    return {
      componentId: c.componentId, predictedCaseTemperatureK,
      maximumAllowedWithMarginK,
      marginK: maximumAllowedWithMarginK - predictedCaseTemperatureK
    };
  });
  return {
    status: components.some(x => x.marginK < 0) ? 'NUMERIC_EXCEEDANCE' : 'SCREEN_PASS_UNVERIFIED',
    errors: [], components, engineeringAccepted: false,
    qualification: 'Linear independent-path steady-state screen only. Shared hull heat paths, transient battery/ESC loads, electronics hot spots, fouling, loss of cooling, sensor uncertainty, ingress protection and physical testing are NOT qualified.'
  };
}
