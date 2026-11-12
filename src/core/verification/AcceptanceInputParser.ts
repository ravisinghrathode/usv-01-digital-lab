import { z } from 'zod';
import type { AcceptanceEvidence } from './AcceptanceGate.ts';
import type { ReferenceMeasurement } from './EngineeringBenchmarks.ts';

/**
 * Parse supplied evidence metadata; do not confuse schema validation with
 * independent verification of a source, real measurement, or review signature.
 */
const sha = z.string().regex(/^[a-f0-9]{40}$/, 'Expected exact 40-character lowercase commit SHA');
const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/, 'Expected SHA-256 digest in sha256:hex format');

const evidenceSchema = z.array(z.strictObject({
  requirementId: z.enum([
    'SEC-01','SEC-02','GOV-01','GOV-02','AGT-01','AGT-02','HYD-01','RES-01',
    'STR-01','AUT-01','MAR-01','INT-01','INT-02','INT-03','DEP-01'
  ]),
  baselineSha: sha,
  referenceUri: z.string().url().refine(s => s.startsWith('https://'), 'Evidence location must use HTTPS'),
  referenceSha256: digest,
  sourceType: z.enum(['PHYSICAL_TEST','INDEPENDENT_REVIEW','SERVICE_HANDSHAKE','PRODUCTION_TEST']),
  reviewedBy: z.string().min(1),
  independentlyVerified: z.boolean(),
  attestationVerified: z.boolean()
})).max(1000);

const measurementSchema = z.array(z.strictObject({
  id: z.string().min(1),
  quantity: z.string().min(1),
  referenceValue: z.number().finite(),
  observedValue: z.number().finite(),
  absoluteTolerance: z.number().finite().nonnegative(),
  relativeTolerance: z.number().finite().nonnegative(),
  unit: z.string().min(1),
  sourceReference: z.string().min(1)
})).max(10000);

export function parseAcceptanceEvidence(data: unknown): AcceptanceEvidence[] {
  return evidenceSchema.parse(data) as AcceptanceEvidence[];
}

export function parseReferenceMeasurements(data: unknown): ReferenceMeasurement[] {
  return measurementSchema.parse(data) as ReferenceMeasurement[];
}
