import { z } from 'zod';
import type { SafetyScenario } from './SafetyScenarioSuite.ts';
import type { MarineEnvelopeCase } from './MarineSystemsSuite.ts';

const safetySchema = z.array(z.strictObject({
  id: z.string().min(1),
  kind: z.enum(['COLREG_ENCOUNTER', 'LINK_LOSS', 'SENSOR_DEGRADATION', 'PROPULSION_FAULT']),
  scenarioReference: z.string().min(1),
  simulated: z.boolean(),
  faultInjected: z.boolean(),
  independentObserver: z.boolean(),
  abortAvailable: z.boolean(),
  preapprovedContingencyExercised: z.boolean(),
  containmentMaintained: z.boolean(),
  minimumObservedCpaNm: z.number().finite().nonnegative().optional(),
  requiredMinimumCpaNm: z.number().finite().positive().optional()
})).max(1000);

const marineSchema = z.array(z.strictObject({
  id: z.string().min(1),
  kind: z.enum([
    'LAUNCH_RECOVERY_LOAD','SEALED_HULL_THERMAL','WET_END_ACOUSTIC',
    'FOULING_CORROSION','BILGE_CONDENSATION'
  ]),
  observed: z.number().finite().nonnegative(),
  maximumAllowed: z.number().finite().positive(),
  unit: z.string().min(1),
  sourceReference: z.string().min(1),
  designLimitReference: z.string().min(1)
})).max(1000);

export const parseSafetyCases = (raw: unknown): SafetyScenario[] =>
  safetySchema.parse(raw);

export const parseMarineCases = (raw: unknown): MarineEnvelopeCase[] =>
  marineSchema.parse(raw);
