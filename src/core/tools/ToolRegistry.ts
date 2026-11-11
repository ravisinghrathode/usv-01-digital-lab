import { EngineeringTool, ToolExecutionResult } from '../types/tools.ts';
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
      ResistanceTool,
      MassBalanceTool,
      ElectricalLoadTool,
      StructuresTool,
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
    this.tools.set(tool.id, tool);
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
    callingAgentPermissions?: string[]
  ): Promise<ToolExecutionResult> {
    const startTime = performance.now();
    const tool = this.tools.get(toolId);

    if (!tool) {
      const result: ToolExecutionResult = {
        toolId,
        timestamp: new Date().toISOString(),
        success: false,
        input,
        output: {},
        executionTimeMs: 0,
        error: `Tool '${toolId}' not found in registry.`
      };
      this.executionHistory.push(result);
      return result;
    }

    // Permission check
    if (callingAgentPermissions) {
      const hasPerm = tool.requiredPermissions.every(p => callingAgentPermissions.includes(p));
      if (!hasPerm) {
        const result: ToolExecutionResult = {
          toolId,
          timestamp: new Date().toISOString(),
          success: false,
          input,
          output: {},
          executionTimeMs: performance.now() - startTime,
          error: `Permission Denied: Calling agent lacks required permissions [${tool.requiredPermissions.join(', ')}]`
        };
        this.executionHistory.push(result);
        return result;
      }
    }

    // Validate Input
    const inputParse = tool.inputSchema.safeParse(input);
    if (!inputParse.success) {
      const result: ToolExecutionResult = {
        toolId,
        timestamp: new Date().toISOString(),
        success: false,
        input,
        output: {},
        executionTimeMs: performance.now() - startTime,
        error: 'Input Schema Validation Failed',
        validationErrors: inputParse.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      };
      this.executionHistory.push(result);
      return result;
    }

    try {
      const rawOutput = await Promise.resolve(tool.execute(inputParse.data));

      // Validate Output
      const outputParse = tool.outputSchema.safeParse(rawOutput);
      if (!outputParse.success) {
        const result: ToolExecutionResult = {
          toolId,
          timestamp: new Date().toISOString(),
          success: false,
          input,
          output: rawOutput,
          executionTimeMs: performance.now() - startTime,
          error: 'Output Schema Validation Failed on Tool Execution',
          validationErrors: outputParse.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        };
        this.executionHistory.push(result);
        return result;
      }

      const result: ToolExecutionResult = {
        toolId,
        timestamp: new Date().toISOString(),
        success: true,
        input: inputParse.data as Record<string, any>,
        output: outputParse.data as Record<string, any>,
        executionTimeMs: performance.now() - startTime
      };
      this.executionHistory.push(result);
      return result;
    } catch (err: any) {
      const result: ToolExecutionResult = {
        toolId,
        timestamp: new Date().toISOString(),
        success: false,
        input,
        output: {},
        executionTimeMs: performance.now() - startTime,
        error: `Tool Execution Exception: ${err.message || String(err)}`
      };
      this.executionHistory.push(result);
      return result;
    }
  }

  public getExecutionHistory(): ToolExecutionResult[] {
    return [...this.executionHistory];
  }

  public clearHistory(): void {
    this.executionHistory = [];
  }
}
