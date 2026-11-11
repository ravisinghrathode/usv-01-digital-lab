import { z } from 'zod';

export type ToolCategory =
  | 'HYDROSTATICS'
  | 'HYDRODYNAMICS'
  | 'WEIGHT_MASS'
  | 'PROPULSION'
  | 'ELECTRICAL'
  | 'STRUCTURES'
  | 'AUTONOMY_COLREGS'
  | 'VERIFICATION';

export interface EngineeringTool {
  id: string; // e.g. 'TOOL-HYDROSTATICS-01'
  name: string;
  category: ToolCategory;
  description: string;
  deterministic: true; // All core engineering tools are strictly deterministic
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  requiredPermissions: string[];
  execute: (input: any) => Promise<any> | any;
}

export interface ToolExecutionResult {
  toolId: string;
  timestamp: string;
  success: boolean;
  input: Record<string, any>;
  output: Record<string, any>;
  executionTimeMs: number;
  error?: string;
  validationErrors?: string[];
}
