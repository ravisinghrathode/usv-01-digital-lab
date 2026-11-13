/**
 * ECR-20261113-004 — deterministic 3D lifting vector equilibrium audit.
 * Mathematical equilibrium is NECESSARY, NEVER SUFFICIENT for safe lifting.
 * The coordinates, angles and tensions are entered facts/proposals and
 * are NOT calculated from crane/sling stiffness or approved by this tool.
 */
import { z } from 'zod';
import type { EngineeringTool } from '../../types/tools.ts';

const vectorSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
}).strict();

const pointSchema = z.object({
  id: z.string().trim().min(1),
  positionMeters: vectorSchema,
  // Unit vector from hull lift attachment TOWARDS hook or pulley.
  forceDirectionUnit: vectorSchema,
  tensionN: z.number().finite().nonnegative(),
}).strict().superRefine((point, ctx) => {
  const d = point.forceDirectionUnit;
  const magnitude = Math.hypot(d.x, d.y, d.z);
  if (Math.abs(magnitude - 1) > 1e-8) {
    ctx.addIssue({code: 'custom',path: ['forceDirectionUnit'],message:'Sling direction must be a 3D unit vector within 1e-8'});
  }
  if (d.z <= 0) {
    ctx.addIssue({code: 'custom',path:['forceDirectionUnit','z'],message:'Suspended lifting force must have an upward component'});
  }
});

const inputSchema = z.object({
  handlingMassKg: z.number().finite().positive(),
  dynamicAmplificationFactor: z.number().finite().min(1),
  cgPositionMeters: vectorSchema,
  inputBasis: z.enum(['ILLUSTRATIVE', 'PROPOSED']),
  geometrySourceRef: z.string().trim().min(1),
  massSourceRef: z.string().trim().min(1),
  reactionSourceRef: z.string().trim().min(1),
  points: z.array(pointSchema).min(2).max(12),
}).strict().superRefine((input,ctx) => {
  const seen = new Set<string>();
  for (const [i,p] of input.points.entries()) {
    if (seen.has(p.id)) ctx.addIssue({code:'custom',path:['points',i,'id'],message:'Duplicate lifting point identifier'});
    seen.add(p.id);
  }
  if (input.inputBasis === 'PROPOSED') {
    const refs=[input.geometrySourceRef,input.massSourceRef,input.reactionSourceRef];
    for (const [i,ref] of refs.entries()) {
      if (/^(TBD|UNVERIFIED|NONE)$/i.test(ref.trim())) {
        ctx.addIssue({code:'custom',path:[['geometrySourceRef','massSourceRef','reactionSourceRef'][i]],message:'Proposed calculations require non-placeholder source identifiers'});
      }
    }
  }
});

const outputSchema = z.object({
  designVerticalWeightN: z.number().finite().positive(),
  residualForceN: vectorSchema,
  residualMomentAboutCgNm: vectorSchema,
  residualForceMagnitudeN: z.number().finite().nonnegative(),
  residualMomentMagnitudeNm: z.number().finite().nonnegative(),
  toleranceForceN: z.number().finite().nonnegative(),
  toleranceMomentNm: z.number().finite().nonnegative(),
  equilibriumStatus: z.enum(['UNBALANCED','ARITHMETICALLY_BALANCED_ONLY']),
  certificationStatus: z.literal('UNVERIFIED_NO_SAFE_TO_LIFT_RELEASE'),
  reactionInputsDerivedFromRigging: z.literal(false),
  structuralComplianceValidated: z.literal(false),
  liftingCertificationIssued: z.literal(false),
  unresolvedVerification: z.array(z.string()).min(1)
});

type V = z.infer<typeof vectorSchema>;
const sub=(a:V,b:V):V=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const cross=(a:V,b:V):V=>({
  x:a.y*b.z-a.z*b.y,
  y:a.z*b.x-a.x*b.z,
  z:a.x*b.y-a.y*b.x
});
const add=(a:V,b:V):V=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});

export const LiftingEquilibriumTool: EngineeringTool = {
  id:'TOOL-STRUCTURES-LIFT-3D-01',
  name:'3D Lifting Force and Moment Equilibrium Audit (non-certifying)',
  category:'STRUCTURES',
  description:'Checks static global vector force/moment residuals of supplied sling tensions and directions; does not infer shares, certify rigging, model dynamic slam, or validate the hull structure.',
  deterministic:true,
  requiredPermissions:['CALCULATION_EXEC'],
  inputSchema,
  outputSchema,
  execute:(input:z.infer<typeof inputSchema>)=>{
    const designVerticalWeightN=input.handlingMassKg*9.80665*input.dynamicAmplificationFactor;
    let residualForceN:V={x:0,y:0,z:-designVerticalWeightN};
    let residualMomentAboutCgNm:V={x:0,y:0,z:0};
    let maxLeverM=0;
    for(const point of input.points) {
      const r=sub(point.positionMeters,input.cgPositionMeters);
      const f:V={
        x:point.forceDirectionUnit.x*point.tensionN,
        y:point.forceDirectionUnit.y*point.tensionN,
        z:point.forceDirectionUnit.z*point.tensionN
      };
      residualForceN=add(residualForceN,f);
      residualMomentAboutCgNm=add(residualMomentAboutCgNm,cross(r,f));
      maxLeverM=Math.max(maxLeverM,Math.hypot(r.x,r.y,r.z));
    }
    const residualForceMagnitudeN=Math.hypot(residualForceN.x,residualForceN.y,residualForceN.z);
    const residualMomentMagnitudeNm=Math.hypot(residualMomentAboutCgNm.x,residualMomentAboutCgNm.y,residualMomentAboutCgNm.z);
    // Pure numerical reconciliation criteria, NOT allowable engineering residuals.
    const toleranceForceN=Math.max(1e-8,designVerticalWeightN*1e-6);
    const toleranceMomentNm=Math.max(1e-8,designVerticalWeightN*maxLeverM*1e-6);
    const arithmeticBalanced=residualForceMagnitudeN<=toleranceForceN && residualMomentMagnitudeNm<=toleranceMomentNm;
    return {
      designVerticalWeightN,
      residualForceN,
      residualMomentAboutCgNm,
      residualForceMagnitudeN,
      residualMomentMagnitudeNm,
      toleranceForceN,
      toleranceMomentNm,
      equilibriumStatus:arithmeticBalanced ? 'ARITHMETICALLY_BALANCED_ONLY' : 'UNBALANCED',
      certificationStatus:'UNVERIFIED_NO_SAFE_TO_LIFT_RELEASE',
      reactionInputsDerivedFromRigging:false,
      structuralComplianceValidated:false,
      liftingCertificationIssued:false,
      unresolvedVerification:[
        'The tool tests proposed force vectors; it does not solve sling tensions, stiffness or nonlinear rigging geometry.',
        'Prove exact CAD geometry, lift-point coordinates, maximum mass/CG, rigging direction and slack-sling envelopes.',
        'Establish approved hoist/lifting standards, shock and dynamic factors, connection loads, weld/HAZ capacities and WLL.',
        'Perform mesh-converged local/global FEA, inspection/proof tests and independent engineering verification.',
        'Obtain independent technical review and Engineering Director authorization before physical lifting or release.'
      ]
    };
  }
};
