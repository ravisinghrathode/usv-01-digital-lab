import { ToolRegistry } from '../tools/ToolRegistry.ts';
import { evaluateBenchmark, type ReferenceMeasurement } from './EngineeringBenchmarks.ts';

const DIGEST = /^sha256:[0-9a-f]{64}$/;
const httpsRef = (uri: string) => {
  try { const u = new URL(uri); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password; }
  catch { return false; }
};
export interface ToolReferenceCase {
  id: string;
  toolId: string;
  input: Record<string, unknown>;
  /** Numeric path within actual ToolRegistry output; NEVER caller-supplied observed value. */
  numericOutputPath: string;
  referenceValue: number;
  absoluteTolerance: number;
  relativeTolerance: number;
  unit: string;
  referenceUri: string;
  referenceSha256: string;
  referenceMethod: string;
}
export interface ToolBenchmarkCampaignReport {
  status: 'NO_REFERENCE_DATA' | 'INVALID_OR_FAILED_TOOL' | 'NUMERIC_SCREEN_PASS_UNCERTIFIED' | 'NUMERIC_SCREEN_FAIL';
  cases: Array<{
    id: string; toolId: string; outputPath: string;
    calculatedValue?: number; sourceReference: string;
    toolSucceeded: boolean; sourceAuthenticated: false; error?: string;
  }>;
  comparisons: ReturnType<typeof evaluateBenchmark>;
  sourceAuthenticated: false;
  independentlyEngineeringValidated: false;
  engineeringReleaseAuthorized: false;
}
function numericAtPath(source: Record<string, unknown>, path: string): number | null {
  if (!/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)*$/.test(path)) return null;
  let node: unknown = source;
  for (const key of path.split('.')) {
    if (!node || typeof node !== 'object' || Array.isArray(node) ||
        !Object.prototype.hasOwnProperty.call(node, key)) return null;
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === 'number' && Number.isFinite(node) ? node : null;
}
/**
 * Numerical agreement is merely a SCREEN; external references are supplied by
 * the reviewer and their provenance is not authenticated by this function.
 */
export async function runToolBenchmarkCampaign(
  inputs: readonly ToolReferenceCase[],
  execute = (toolId: string, value: Record<string, unknown>) =>
    ToolRegistry.getInstance().executeTool(toolId, value, ['CALCULATION_EXEC'])
): Promise<ToolBenchmarkCampaignReport> {
  const cases: ToolBenchmarkCampaignReport['cases'] = [];
  const measurements: ReferenceMeasurement[] = [];
  let failed = false;
  const ids = new Set<string>();
  for (const item of inputs) {
    const wellFormed = item && typeof item.id === 'string' && item.id.length > 0 &&
      !ids.has(item.id) && typeof item.toolId === 'string' && item.toolId.length > 0 &&
      !!item.input && typeof item.input === 'object' && !Array.isArray(item.input) &&
      typeof item.numericOutputPath === 'string' &&
      typeof item.referenceUri === 'string' && httpsRef(item.referenceUri) &&
      typeof item.referenceSha256 === 'string' && DIGEST.test(item.referenceSha256) &&
      typeof item.referenceMethod === 'string' && item.referenceMethod.trim().length > 0 &&
      typeof item.unit === 'string' && item.unit.trim().length > 0 &&
      [item.referenceValue, item.absoluteTolerance, item.relativeTolerance].every(Number.isFinite) &&
      item.absoluteTolerance >= 0 && item.relativeTolerance >= 0;
    if (!wellFormed) {
      failed = true;
      cases.push({ id: String(item?.id || 'INVALID'), toolId: String(item?.toolId || ''),
        outputPath: String(item?.numericOutputPath || ''), sourceReference: String(item?.referenceUri || ''),
        toolSucceeded: false, sourceAuthenticated: false, error: 'Missing/invalid/duplicate reference evidence inputs' });
      continue;
    }
    ids.add(item.id);
    const tool = await execute(item.toolId, item.input);
    const calculated = tool.success ? numericAtPath(tool.output, item.numericOutputPath) : null;
    if (calculated === null) failed = true;
    cases.push({
      id: item.id, toolId: item.toolId, outputPath: item.numericOutputPath,
      calculatedValue: calculated ?? undefined, sourceReference: item.referenceUri,
      toolSucceeded: tool.success && calculated !== null, sourceAuthenticated: false,
      error: calculated === null ? tool.error || 'Referenced numeric output absent or invalid' : undefined
    });
    if (calculated !== null) measurements.push({
      id: item.id, quantity: item.numericOutputPath, observedValue: calculated,
      referenceValue: item.referenceValue,
      absoluteTolerance: item.absoluteTolerance, relativeTolerance: item.relativeTolerance,
      unit: item.unit, sourceReference: item.referenceUri + '#' + item.referenceSha256
    });
  }
  const comparisons = evaluateBenchmark(measurements);
  return {
    status: inputs.length === 0 ? 'NO_REFERENCE_DATA' :
      failed ? 'INVALID_OR_FAILED_TOOL' :
      comparisons.status === 'NUMERIC_PASS_UNCERTIFIED' ? 'NUMERIC_SCREEN_PASS_UNCERTIFIED' : 'NUMERIC_SCREEN_FAIL',
    cases, comparisons, sourceAuthenticated: false,
    independentlyEngineeringValidated: false, engineeringReleaseAuthorized: false
  };
}
