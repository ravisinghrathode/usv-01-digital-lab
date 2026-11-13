/**
 * ECR-20261113-009 / STR-BLK-001
 * First-principles beam unit arithmetic ONLY, not a scantling calculator.
 * Does not infer design pressure, section effectiveness, buckling or
 * structural code compliance. No approved property is obtained here.
 */
import { z } from 'zod';
import type { EngineeringTool } from '../../types/tools.ts';

const inputSchema=z.object({
  pressurePa: z.number().finite().positive(),
  tributaryWidthMeters: z.number().finite().positive(),
  unsupportedSpanMeters: z.number().finite().positive(),
  stressDivisorMPa: z.number().finite().positive(),
  inputBasis: z.enum(['ILLUSTRATIVE','PROPOSED']),
  pressureSourceRef: z.string().trim().min(1),
  spanSourceRef: z.string().trim().min(1),
  stressSourceRef: z.string().trim().min(1),
}).strict().superRefine((v,ctx)=>{
  if(v.inputBasis==='PROPOSED') {
    for(const field of ['pressureSourceRef','spanSourceRef','stressSourceRef'] as const) {
      if(/^(TBD|NONE|UNVERIFIED)$/i.test(v[field])) {
        ctx.addIssue({code:'custom',path:[field],message:'Proposed input requires a nonplaceholder source reference (not verification)'});
      }
    }
  }
});
const outputSchema=z.object({
  uniformLineLoadNPerMeter: z.number().finite().positive(),
  peakSimplySupportedMomentNm: z.number().finite().positive(),
  sectionModulusCm3: z.number().finite().positive(),
  modelStatus: z.literal('UNVERIFIED_SIMPLY_SUPPORTED_BEAM_ARITHMETIC'),
  structuralComplianceValidated: z.literal(false),
  designUsePermitted: z.literal(false),
  unresolvedVerification: z.array(z.string()).min(1),
});
export const BeamArithmeticTool:EngineeringTool={
  id:'TOOL-STRUCTURES-BEAM-01',
  name:'Simply Supported Beam Uniform Load Arithmetic — Non-Design Screen',
  category:'STRUCTURES',
  description:'Computes q=P*b, M=q*L²/8 and Z=M/sigma with SI units from supplied data. Does not infer marine design pressure or approve members.',
  deterministic:true,
  requiredPermissions:['CALCULATION_EXEC'],
  inputSchema,
  outputSchema,
  execute:(v:z.infer<typeof inputSchema>)=>{
    const uniformLineLoadNPerMeter=v.pressurePa*v.tributaryWidthMeters;
    const peakSimplySupportedMomentNm=uniformLineLoadNPerMeter*v.unsupportedSpanMeters**2/8;
    // Z_cm3 = (M_Nm *1000 mm/m)/(sigma_N/mm2)/(1000 mm3/cm3) = M_Nm/sigma_MPa
    const sectionModulusCm3=peakSimplySupportedMomentNm/v.stressDivisorMPa;
    return {
      uniformLineLoadNPerMeter,
      peakSimplySupportedMomentNm,
      sectionModulusCm3,
      modelStatus:'UNVERIFIED_SIMPLY_SUPPORTED_BEAM_ARITHMETIC',
      structuralComplianceValidated:false,
      designUsePermitted:false,
      unresolvedVerification:[
        'Approved design pressure, structural geometry, real boundary conditions, support spacing and load combinations',
        'Material and weld allowables, actual section properties, local/global buckling, fatigue and deflection',
        'Independent calculations, validated FEA, physical testing and engineering release approval'
      ]
    };
  }
};
