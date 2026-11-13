import { z } from 'zod';
import type { EngineeringTool } from '../../types/tools.ts';

/**
 * Twin identical demi-hull parametric hydrostatic screen.
 *
 * Uses parallel-axis waterplane inertia and the same approximate KB expression
 * as the legacy monohull screen. It is NOT offset-integrated hydrostatics,
 * bridge-deck clearance analysis, GZ stability, wave-interference resistance,
 * slamming, or class compliance.
 */
export const CatamaranHydrostaticsTool: EngineeringTool = {
  id: 'TOOL-CATAMARAN-HYDROSTATICS-01',
  name: 'Twin-Demi-Hull Catamaran Hydrostatics Screening',
  category: 'HYDROSTATICS',
  description: 'Preliminary twin-identical-demi-hull displacement and transverse BM/GM screening using source-supplied form coefficients and demi-hull spacing.',
  deterministic: true,
  requiredPermissions: ['CALCULATION_EXEC'],
  inputSchema: z.object({
    lwlMeters: z.number().positive(),
    demiHullBeamMeters: z.number().positive(),
    draftMeters: z.number().positive(),
    blockCoefficientCb: z.number().min(0.25).max(0.90),
    waterplaneCoefficientCwp: z.number().min(0.35).max(0.95),
    demiHullCenterlineSeparationMeters: z.number().positive(),
    kgMeters: z.number().nonnegative().optional(),
    seawaterDensityKgM3: z.number().min(900).max(1100).default(1025)
  }).superRefine((data,ctx)=>{
    if (data.demiHullCenterlineSeparationMeters <= data.demiHullBeamMeters) {
      ctx.addIssue({code:'custom',message:'Demi-hull centerline separation must exceed demi-hull beam.'});
    }
  }),
  outputSchema: z.object({
    totalDisplacedVolumeM3: z.number(),
    displacementTonnes: z.number(),
    totalWaterplaneAreaM2: z.number(),
    transverseWaterplaneSecondMomentM4: z.number(),
    centerOfBuoyancyKbM: z.number(),
    transverseMetacentricRadiusBmtM: z.number(),
    transverseMetacenterKmtM: z.number(),
    preliminaryGmScreeningM: z.number().nullable(),
    demiHullClearGapMeters: z.number(),
    modelStatus: z.literal('PRELIMINARY_TWIN_DEMIHULL_GEOMETRIC_SCREEN'),
    waveInterferenceResistanceValidated: z.literal(false),
    bridgeDeckSlammingValidated: z.literal(false),
    offsetIntegratedHydrostaticsValidated: z.literal(false),
    engineeringComplianceValidated: z.literal(false),
    designUsePermitted: z.literal(false)
  }),
  execute: (input:any) => {
    const {
      lwlMeters:L, demiHullBeamMeters:b, draftMeters:T,
      blockCoefficientCb:cb, waterplaneCoefficientCwp:cwp,
      demiHullCenterlineSeparationMeters:s,
      seawaterDensityKgM3:rho=1025
    } = input;
    const volumeOne=L*b*T*cb;
    const volume=2*volumeOne;
    const massT=volume*rho/1000;
    const areaOne=L*b*cwp;
    const selfI=cwp*L*Math.pow(b,3)/12;
    const offset=s/2;
    const totalI=2*(selfI+areaOne*offset*offset);
    const kb=T*(5/6-cb/(3*cwp));
    const bmt=totalI/volume;
    const kmt=kb+bmt;
    const gm=input.kgMeters===undefined?null:kmt-input.kgMeters;
    return {
      totalDisplacedVolumeM3:Number(volume.toFixed(4)),
      displacementTonnes:Number(massT.toFixed(4)),
      totalWaterplaneAreaM2:Number((2*areaOne).toFixed(4)),
      transverseWaterplaneSecondMomentM4:Number(totalI.toFixed(4)),
      centerOfBuoyancyKbM:Number(kb.toFixed(4)),
      transverseMetacentricRadiusBmtM:Number(bmt.toFixed(4)),
      transverseMetacenterKmtM:Number(kmt.toFixed(4)),
      preliminaryGmScreeningM:gm===null?null:Number(gm.toFixed(4)),
      demiHullClearGapMeters:Number((s-b).toFixed(4)),
      modelStatus:'PRELIMINARY_TWIN_DEMIHULL_GEOMETRIC_SCREEN' as const,
      waveInterferenceResistanceValidated:false as const,
      bridgeDeckSlammingValidated:false as const,
      offsetIntegratedHydrostaticsValidated:false as const,
      engineeringComplianceValidated:false as const,
      designUsePermitted:false as const
    };
  }
};
