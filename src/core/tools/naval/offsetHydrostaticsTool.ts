import { z } from 'zod';
import type { EngineeringTool } from '../../types/tools.ts';
import { calculateOffsetHydrostatics } from './offsetHydrostatics.ts';

/**
 * The offset solver is intentionally a separate tool from the legacy Cb-based
 * screening estimate. It cannot be executed with principal particulars alone.
 */
const finite = z.number().finite();
const pointSchema = z.tuple([finite, finite]);
const outputNumber = z.number().finite();
const nullableNumber = outputNumber.nullable();

export const OffsetHydrostaticsTool: EngineeringTool = {
  id: 'TOOL-OFFSET-HYDROSTATICS-01',
  name: 'Offset-Integrated Hydrostatics — Evidence-Constrained Screening',
  category: 'HYDROSTATICS',
  description: 'Source-referenced offset-section immersion, buoyancy and fixed-trim righting arm screening. Never validates regulatory compliance or certifies vessel stability.',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: z.object({
    hull: z.object({
      geometryReference: z.string().trim().min(1),
      geometryRevision: z.string().trim().min(1),
      stations: z.array(z.object({
        xM: finite,
        loops: z.array(z.array(pointSchema).min(3)).min(1)
      }).strict()).min(2)
    }).strict(),
    load: z.object({
      id: z.string().trim().min(1),
      massKg: finite.positive(),
      kgM: finite.nonnegative(),
      lcgM: finite,
      tcgM: finite,
      freeSurfaceMomentKgM: finite.nonnegative().optional()
    }).strict(),
    waterDensityKgM3: finite.min(950).max(1100),
    heelAnglesDeg: z.array(finite.min(0).max(60)).min(1).optional()
  }).strict(),
  outputSchema: z.object({
    status: z.literal('GEOMETRY_DERIVED_UNVERIFIED'),
    geometryReference: z.string().min(1),
    geometryRevision: z.string().min(1),
    loadCaseId: z.string().min(1),
    equilibriumDraftM: outputNumber,
    displacedVolumeM3: outputNumber.positive(),
    buoyantMassKg: outputNumber.positive(),
    displacementClosureErrorKg: outputNumber,
    kbM: outputNumber,
    lcbM: outputNumber,
    tcbM: outputNumber,
    waterplaneAreaM2: outputNumber.nonnegative(),
    lcfM: nullableNumber,
    bmtM: nullableNumber,
    bmlM: nullableNumber,
    kmtM: nullableNumber,
    uncorrectedGmtM: nullableNumber,
    freeSurfaceCorrectedGmtM: nullableNumber,
    longitudinalImbalanceM: outputNumber,
    fixedTrimOnly: z.literal(true),
    curve: z.array(z.object({
      heelDeg: outputNumber,
      planeOffsetM: outputNumber,
      volumeM3: outputNumber,
      buoyancyYM: outputNumber,
      buoyancyZM: outputNumber,
      uncorrectedGzM: outputNumber,
      freeSurfaceCorrectedGzM: nullableNumber
    }).strict()).min(1),
    engineeringComplianceValidated: z.literal(false),
    acceptanceEvidenceStillRequired: z.array(z.string().min(1)).min(1)
  }).strict(),
  execute: input => calculateOffsetHydrostatics(input)
};
