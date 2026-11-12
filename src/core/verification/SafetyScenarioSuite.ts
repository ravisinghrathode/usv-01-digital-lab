/**
 * Pure scenario evidence checks for simulation traces. This is NOT a
 * COLREGS controller, autopilot, route planner or vessel-actuator command.
 */
export type ScenarioKind = 'COLREG_ENCOUNTER' | 'LINK_LOSS' | 'SENSOR_DEGRADATION' | 'PROPULSION_FAULT';
export interface SafetyScenario {
  id: string;
  kind: ScenarioKind;
  scenarioReference: string;
  simulated: boolean;
  faultInjected: boolean;
  independentObserver: boolean;
  abortAvailable: boolean;
  /** True only if an authorized human-approved contingency was exercised. */
  preapprovedContingencyExercised: boolean;
  /** Simulation confirms no uncontrolled navigation or collision risk accepted as "safe." */
  containmentMaintained: boolean;
  minimumObservedCpaNm?: number;
  requiredMinimumCpaNm?: number;
}
export interface ScenarioFinding {
  id: string;
  kind: ScenarioKind;
  status: 'SCENARIO_CHECK_PASS_UNCERTIFIED' | 'SCENARIO_FAIL';
  findings: string[];
}
const kinds: ScenarioKind[] = [
  'COLREG_ENCOUNTER', 'LINK_LOSS', 'SENSOR_DEGRADATION', 'PROPULSION_FAULT'
];

/**
 * Checks whether recorded simulation scenarios comply with their test-plan
 * envelope. A pass only demonstrates internal numerical/logical coherence;
 * real COLREG compliance, sensing and hardware fail-safe remain unverified.
 */
export function evaluateSafetyScenarios(cases: readonly SafetyScenario[]) {
  const seen = new Set<string>();
  const findings: ScenarioFinding[] = [];
  for (const s of cases) {
    const problems: string[] = [];
    if (!s.id.trim() || seen.has(s.id)) problems.push('missing or duplicate scenario ID');
    seen.add(s.id);
    if (!s.scenarioReference.trim()) problems.push('missing simulation trace provenance');
    if (!s.simulated || !s.faultInjected) problems.push('recorded simulated fault/encounter evidence missing');
    if (!s.independentObserver) problems.push('independent simulation observation missing');
    if (!s.abortAvailable) problems.push('simulated emergency abort not available');
    if (!s.preapprovedContingencyExercised) problems.push('approved contingency not exercised');
    if (!s.containmentMaintained) problems.push('containment not maintained');
    if (s.kind === 'COLREG_ENCOUNTER') {
      if (s.minimumObservedCpaNm === undefined || s.requiredMinimumCpaNm === undefined ||
          !Number.isFinite(s.minimumObservedCpaNm) || !Number.isFinite(s.requiredMinimumCpaNm) ||
          s.requiredMinimumCpaNm <= 0 || s.minimumObservedCpaNm < s.requiredMinimumCpaNm) {
        problems.push('CPA acceptance envelope not satisfied');
      }
    }
    findings.push({
      id: s.id, kind: s.kind,
      status: problems.length ? 'SCENARIO_FAIL' : 'SCENARIO_CHECK_PASS_UNCERTIFIED',
      findings: problems
    });
  }
  const missingKinds = kinds.filter(k => !cases.some(s => s.kind === k));
  return {
    observedCount: cases.length,
    scenarioCoverage: kinds.length - missingKinds.length,
    missingKinds,
    findings,
    simulatedSuitePass: missingKinds.length === 0 && cases.length >= kinds.length &&
      findings.every(f => f.status === 'SCENARIO_CHECK_PASS_UNCERTIFIED'),
    independentlyEngineeringValidated: false as const,
    vesselControlAuthorized: false as const
  };
}
