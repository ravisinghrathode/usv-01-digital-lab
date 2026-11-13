import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '../ToolRegistry.ts';

const sampleInput = () => ({
  hull: {
    geometryReference: 'ANALYTICAL-TEST-RECTANGULAR-BARGE',
    geometryRevision: 'v1',
    stations: [
      { xM: 0, loops: [[[-1, 0], [1, 0], [1, 1], [-1, 1]]] },
      { xM: 10, loops: [[[-1, 0], [1, 0], [1, 1], [-1, 1]]] }
    ]
  },
  load: {
    id: 'TEST-LC-001',
    massKg: 10250,
    kgM: 0.4,
    lcgM: 5,
    tcgM: 0,
    freeSurfaceMomentKgM: 0
  },
  waterDensityKgM3: 1025,
  heelAnglesDeg: [0, 5, 10]
});

describe('Offset-integrated hydrostatics tool registration and permissions', () => {
  const registry = ToolRegistry.getInstance();

  it('is discoverable and performs reproducible validated hydrostatics', async () => {
    const tool = registry.getTool('TOOL-OFFSET-HYDROSTATICS-01');
    expect(tool).toBeDefined();
    expect(tool!.deterministic).toBe(true);
    const result = await registry.executeTool('TOOL-OFFSET-HYDROSTATICS-01', sampleInput(), ['CALCULATION_EXEC']);
    expect(result.success, JSON.stringify(result.validationErrors ?? result.error)).toBe(true);
    expect(result.output.status).toBe('GEOMETRY_DERIVED_UNVERIFIED');
    expect(result.output.engineeringComplianceValidated).toBe(false);
    expect(result.output.displacedVolumeM3).toBeCloseTo(10, 8);
    expect(result.output.lcfM).toBeCloseTo(5, 8);
    expect(result.output.curve).toHaveLength(3);
    expect(result.output.fixedTrimOnly).toBe(true);
  });

  it('enforces calculator permissions and rejects absent source references', async () => {
    const noPermissions = await registry.executeTool('TOOL-OFFSET-HYDROSTATICS-01', sampleInput(), ['READ_ONLY']);
    expect(noPermissions.success).toBe(false);
    expect(noPermissions.error).toContain('Permission Denied');

    const invalid = sampleInput();
    invalid.hull.geometryReference = '';
    const missingSource = await registry.executeTool('TOOL-OFFSET-HYDROSTATICS-01', invalid, ['CALCULATION_EXEC']);
    expect(missingSource.success).toBe(false);
    expect(missingSource.error).toContain('Input Schema Validation Failed');
  });

  it('provides the coupled heave/trim screen through a permission-restricted registry tool', async () => {
    const valid = sampleInput();
    valid.load.lcgM = 6;
    const result = await registry.executeTool('TOOL-TRIMMED-HYDROSTATICS-01', valid, ['CALCULATION_EXEC']);
    expect(result.success, JSON.stringify(result.validationErrors ?? result.error)).toBe(true);
    expect(result.output.method).toBe('COUPLED_HEAVE_TRIM_AT_PRESCRIBED_HEEL');
    expect(result.output.engineeringComplianceValidated).toBe(false);
    expect(result.output.results[0].trimDeg).toBeGreaterThan(0);
    expect(Math.abs(result.output.results[0].longitudinalMomentResidualM)).toBeLessThan(1e-7);
    const denied = await registry.executeTool('TOOL-TRIMMED-HYDROSTATICS-01', valid, ['READ_ONLY']);
    expect(denied.success).toBe(false);
    expect(denied.error).toContain('Permission Denied');
  });

  it('fails safely on unphysical displacement instead of asserting valid stability', async () => {
    const overloaded = sampleInput();
    overloaded.load.massKg = 25000;
    const result = await registry.executeTool('TOOL-OFFSET-HYDROSTATICS-01', overloaded, ['CALCULATION_EXEC']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tool Execution Exception');
    expect(result.error).toContain('exhausts');
  });
});
