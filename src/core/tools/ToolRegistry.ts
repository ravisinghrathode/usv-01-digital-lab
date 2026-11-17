import type { EngineeringTool, ToolExecutionResult } from '../types/tools.ts';
import { OffsetHydrostaticsTool, TrimmedOffsetHydrostaticsTool } from './naval/offsetHydrostaticsTool.ts';
import { CatamaranHydrostaticsTool } from './naval/catamaranHydrostaticsTool.ts';
import { LiftingLoadScreenTool } from './naval/liftingLoadTool.ts';
import { LiftingEquilibriumTool } from './naval/liftingEquilibriumTool.ts';
import { BeamArithmeticTool } from './naval/beamArithmeticTool.ts';
import {
  HydrostaticsTool,
  ResistanceTool,
  MassBalanceTool,
  ElectricalLoadTool,
  StructuresTool,
  ColregsTool
} from './naval/engineeringTools.ts';

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, EngineeringTool> = new Map();
  private executionHistory: ToolExecutionResult[] = [];

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  private registerDefaults(): void {
    const defaultTools = [
      HydrostaticsTool,
      OffsetHydrostaticsTool,
      CatamaranHydrostaticsTool,
      TrimmedOffsetHydrostaticsTool,
      ResistanceTool,
      MassBalanceTool,
      ElectricalLoadTool,
      StructuresTool,
      LiftingLoadScreenTool,
      LiftingEquilibriumTool,
      BeamArithmeticTool,
      ColregsTool
    ];

    for (const tool of defaultTools) {
      this.registerTool(tool);
    }
  }

  public registerTool(tool: EngineeringTool): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with ID '${tool.id}' is already registered.`);
    }
    const permissions = [...tool.requiredPermissions];
    Object.freeze(permissions);
    const registered: EngineeringTool = Object.freeze({
      ...tool,
      requiredPermissions: permissions
    });
    this.tools.set(tool.id, registered);
  }

  public getTool(id: string): EngineeringTool | undefined {
    return this.tools.get(id);
  }

  public getAllTools(): EngineeringTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Executes a tool with:
   * 1. Permission verification
   * 2. Strict Zod input schema validation
   * 3. Deterministic calculation execution
   * 4. Strict Zod output schema validation
   * 5. Execution timing and audit history capture
   */
  public async executeTool(
    toolId: string,
    input: any,
    callingAgentPermissions: string[]
  ): Promise<ToolExecutionResult> {
    const startTime = performance.now();
    // All direct ToolRegistry results MUST fail closed. No caller may turn
    // mathematical execution success into naval release or actuator authority.
    const safety = {
      engineeringReleaseAuthorized: false as const,
      independentReferenceValidated: false as const,
      resultDisposition: 'ANALYSIS_ONLY_NEVER_ACTUATE' as const
    };
    const tool = this.tools.get(toolId);

    if (!tool) {
      const result: ToolExecutionResult = {
        ...safety,
        toolId,
        timestamp: new Date().toISOString(),
        success: false,
        input,
        output: {},
        executionTimeMs: 0,
        error: `Tool '${toolId}' not found in registry.`
      };
      return this.recordResult(result);
    }

    // Permission check
    {
      // Absent caller permissions must never mean unrestricted execution.
      // The caller must supply a role-derived permission list from trusted code.
      const hasPerm = Array.isArray(callingAgentPermissions) &&
        tool.requiredPermissions.every(p => callingAgentPermissions.includes(p));
      if (!hasPerm) {
        const result: ToolExecutionResult = {
        ...safety,
          toolId,
          timestamp: new Date().toISOString(),
          success: false,
          input,
          output: {},
          executionTimeMs: performance.now() - startTime,
          error: `Permission Denied: Calling agent lacks required permissions [${tool.requiredPermissions.join(', ')}]`
        };
        return this.recordResult(result);
      }
    }

    // Validate Input
    const inputParse = tool.inputSchema.safeParse(input);
    if (!inputParse.success) {
      const result: ToolExecutionResult = {
        ...safety,
        toolId,
        timestamp: new Date().toISOString(),
        success: false,
        input,
        output: {},
        executionTimeMs: performance.now() - startTime,
        error: 'Input Schema Validation Failed',
        validationErrors: inputParse.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      };
      return this.recordResult(result);
    }

    try {
      const rawOutput = await Promise.resolve(tool.execute(inputParse.data));

      // Validate Output
      const outputParse = tool.outputSchema.safeParse(rawOutput);
      if (!outputParse.success) {
        const result: ToolExecutionResult = {
        ...safety,
          toolId,
          timestamp: new Date().toISOString(),
          success: false,
          input,
          output: rawOutput,
          executionTimeMs: performance.now() - startTime,
          error: 'Output Schema Validation Failed on Tool Execution',
          validationErrors: outputParse.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        };
        return this.recordResult(result);
      }

      const result: ToolExecutionResult = {
        ...safety,
        toolId,
        timestamp: new Date().toISOString(),
        success: true,
        input: inputParse.data as Record<string, any>,
        output: outputParse.data as Record<string, any>,
        executionTimeMs: performance.now() - startTime
      };
      return this.recordResult(result);
    } catch (err: any) {
      const result: ToolExecutionResult = {
        ...safety,
        toolId,
        timestamp: new Date().toISOString(),
        success: false,
        input,
        output: {},
        executionTimeMs: performance.now() - startTime,
        error: `Tool Execution Exception: ${err.message || String(err)}`
      };
      return this.recordResult(result);
    }
  }

  /** Preserve a private immutable-by-reference snapshot, even if the caller
   * later rewrites its original input, result or a history query.
   */
  private recordResult(result: ToolExecutionResult): ToolExecutionResult {
    let record: ToolExecutionResult;
    try {
      record = structuredClone(result);
    } catch {
      record = { ...result, success: false, input: {}, output: {},
        error: 'Audit capture failed: non-cloneable tool input/output (redacted)' };
    }
    this.executionHistory.push(record);
    return structuredClone(record);
  }

  public getExecutionHistory(): ToolExecutionResult[] {
    return this.executionHistory.map(entry => structuredClone(entry));
  }

  public clearHistory(): void {
    this.executionHistory = [];
  }
}
