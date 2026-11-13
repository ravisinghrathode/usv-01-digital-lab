/**
 * USV-01 lifting-point statics SCREEN, not structure sizing or rigging approval.
 * ECR-20261113-009 / REQ-OPS-001 (proposed).
 *
 * Point share fractions MUST originate from independently checked geometry,
 * CG and sling-stiffness/equilibrium analysis. Four points never imply 25% each.
 * Horizontal components are magnitudes only; direction/equilibrium is unknown.
 */
import { z } from 'zod';
import type { EngineeringTool } from '../../types/tools.ts';

const pointSchema = z.object({
  pointId: z.string().trim().min(1),
  verticalLoadShare: z.number().finite().min(0).max(1),
  slingAngleFromVerticalDeg: z.number().finite().min(0).lt(89),
  // Null means unknown, NOT infinite strength or zero capacity.
  pointAllowableLoadN: z.number().finite().positive().nullable(),
}).strict();

const liftingInputSchema = z.object({
  handlingMassKg: z.number().finite().positive(),
  // Dynamic amplification is a load multiplier, not an extra acceleration.
  dynamicAmplificationFactor: z.number().finite().min(1),
  // No user-supplied APPROVED status: only the independent governance gate can authenticate approval.
  inputBasis: z.enum(['ILLUSTRATIVE', 'PROPOSED']),
  massSourceRef: z.string().trim().min(1),
  loadShareSourceRef: z.string().trim().min(1),
  dynamicFactorSourceRef: z.string().trim().min(1),
  liftingPoints: z.array(pointSchema).min(2).max(12),
}).strict().superRefine((data, ctx) => {
  const pointIds = new Set<string>();
  for (const [index, point] of data.liftingPoints.entries()) {
    if (pointIds.has(point.pointId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['liftingPoints', index, 'pointId'],
        message: 'Lifting point identifiers must be unique',
      });
    }
    pointIds.add(point.pointId);
  }

  const shareSum = data.liftingPoints.reduce((sum, point) => sum + point.verticalLoadShare, 0);
  if (Math.abs(shareSum - 1) > 1e-6) {
    ctx.addIssue({
      code: 'custom',
      path: ['liftingPoints'],
      message: 'Input vertical reaction shares must sum to 1 (within 1e-6); approval and equilibrium are NOT implied',
    });
  }


});

const liftingOutputSchema = z.object({
  totalDesignVerticalLoadN: z.number().finite().positive(),
  sumVerticalReactionsN: z.number().finite().positive(),
  peakSlingTensionN: z.number().finite().nonnegative(),
  pointLoads: z.array(z.object({
    pointId: z.string(),
    verticalReactionN: z.number().finite().nonnegative(),
    slingTensionN: z.number().finite().nonnegative(),
    horizontalForceMagnitudeN: z.number().finite().nonnegative(),
    pointAllowableLoadN: z.number().positive().nullable(),
    utilizationRatio: z.number().nonnegative().nullable(),
  })),
  capacityScreenStatus: z.enum(['INCOMPLETE_WLL', 'EXCEEDS_ENTERED_WLL', 'WITHIN_ENTERED_WLL_ONLY']),
  capacityAssessmentDisclaimer: z.literal('ARITHMETIC COMPARISON ONLY: ENTERED ALLOWABLES ARE NOT VERIFIED; NO SAFE-TO-LIFT CLAIM'),
  modelStatus: z.literal('UNVERIFIED_LIFTING_STATICS_SCREEN'),
  structuralComplianceValidated: z.literal(false),
  liftingCertificationIssued: z.literal(false),
  unresolvedVerification: z.array(z.string()).min(1),
});

export const LiftingLoadScreenTool: EngineeringTool = {
  id: 'TOOL-STRUCTURES-LIFT-01',
  name: 'Lifting Point Reaction and Sling Force Screen',
  category: 'STRUCTURES',
  description: 'First-principles sling-force arithmetic for externally established load shares; not an FEA, WLL approval, 3D rigging check, or safe-to-lift certificate.',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: liftingInputSchema,
  outputSchema: liftingOutputSchema,
  execute: (input: z.infer<typeof liftingInputSchema>) => {
    const gravityMps2 = 9.80665;
    const totalDesignVerticalLoadN =
      input.handlingMassKg * gravityMps2 * input.dynamicAmplificationFactor;

    const pointLoads = input.liftingPoints.map(point => {
      const angleRad = point.slingAngleFromVerticalDeg * Math.PI / 180;
      const verticalReactionN = totalDesignVerticalLoadN * point.verticalLoadShare;
      const slingTensionN = verticalReactionN / Math.cos(angleRad);
      const horizontalForceMagnitudeN = slingTensionN * Math.sin(angleRad);
      return {
        pointId: point.pointId,
        verticalReactionN,
        slingTensionN,
        horizontalForceMagnitudeN,
        pointAllowableLoadN: point.pointAllowableLoadN,
        utilizationRatio: point.pointAllowableLoadN === null
          ? null
          : slingTensionN / point.pointAllowableLoadN,
      };
    });

    const missingWll = pointLoads.some(point => point.pointAllowableLoadN === null);
    const exceededWll = pointLoads.some(point =>
      point.utilizationRatio !== null && point.utilizationRatio > 1
    );
    const capacityScreenStatus = exceededWll
      ? 'EXCEEDS_ENTERED_WLL'
      : missingWll ? 'INCOMPLETE_WLL' : 'WITHIN_ENTERED_WLL_ONLY';

    return {
      totalDesignVerticalLoadN,
      sumVerticalReactionsN: pointLoads.reduce((sum, point) => sum + point.verticalReactionN, 0),
      peakSlingTensionN: Math.max(...pointLoads.map(point => point.slingTensionN)),
      pointLoads,
      capacityScreenStatus,
      capacityAssessmentDisclaimer: 'ARITHMETIC COMPARISON ONLY: ENTERED ALLOWABLES ARE NOT VERIFIED; NO SAFE-TO-LIFT CLAIM',
      modelStatus: 'UNVERIFIED_LIFTING_STATICS_SCREEN',
      structuralComplianceValidated: false,
      liftingCertificationIssued: false,
      unresolvedVerification: [
        'Confirm actual handling mass and 3D CG (including rigging, battery and payload configurations).',
        'Independently verify load shares, sling azimuths, 3D force/moment equilibrium and sling stiffness.',
        'Verify angle-specific rigging equipment ratings and connection, weld and local hull load paths.',
        'Check other lift, landing, asymmetric/snatch and transport load cases with approved factors.',
        'Complete mesh-converged FEA/hand checks, material and weld allowables, inspection and approved proof testing.',
        'Obtain independent reviewer and Engineering Director approval before any physical lift.',
      ],
    };
  },
};
