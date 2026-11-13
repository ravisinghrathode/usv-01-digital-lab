import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SharedMemory } from '../src/core/memory/SharedMemory.ts';
import { CONFIGURATION_CATALOG } from '../src/core/verification/EvidenceDecisionGate.ts';

describe('B01: historical parameters cannot become an approved engineering baseline', () => {
  it('seeds only explicitly unverified historical proposal values', () => {
    const memory = SharedMemory.getInstance();
    const entries = memory.getAllParameters();
    expect(entries).toHaveLength(10);
    expect(entries.every(x => x.status === 'ASSUMED')).toBe(true);
    expect(entries.every(x => x.assumptions.some(a => a.includes('HISTORICAL UNVERIFIED')))).toBe(true);
    expect(entries.every(x => x.sourceDocOrCalculation?.includes('historical, unverified'))).toBe(true);
    expect(memory.getAllAdrs().find(x => x.id === 'ADR-002')?.status).toBe('SUPERSEDED');
    expect(CONFIGURATION_CATALOG.some(x => x.approvalState === 'NOT_APPROVED')).toBe(true);
    const states: string[] = CONFIGURATION_CATALOG.map(x => x.approvalState);
    expect(states).not.toContain('APPROVED');
  });

  it('refuses client-side promotion to both approval statuses', () => {
    const memory = SharedMemory.getInstance();
    const original = memory.getParameter('USV-NA-001')!;
    for (const status of ['APPROVED', 'DIRECTOR_APPROVED'] as const) {
      expect(() => memory.updateParameter('USV-NA-001', { status }, 'SIM-PRESET')).toThrow(/cannot approve engineering parameters/i);
      expect(() => memory.addParameter({
        ...original,
        id: 'UI-SYNTHETIC-STATUS-' + status,
        status
      })).toThrow(/cannot approve engineering parameters/i);
    }
    expect(memory.getParameter('USV-NA-001')?.status).toBe('ASSUMED');
    expect(memory.getParameter('USV-NA-001')?.revision).toBe(original.revision);
  });

  it('returns defensive copies and retains draft update capability', () => {
    const memory = SharedMemory.getInstance();
    const source = memory.getParameter('USV-NA-001')!;
    source.status = 'APPROVED';
    source.assumptions.push('mutated from view');
    const list = memory.getAllParameters();
    const listed = list.find(x => x.id === 'USV-NA-001');
    expect(listed).toBeDefined();
    listed!.status = 'DIRECTOR_APPROVED';
    expect(memory.getParameter('USV-NA-001')?.status).toBe('ASSUMED');
    expect(memory.getParameter('USV-NA-001')?.assumptions).not.toContain('mutated from view');

    const before = memory.getParameter('USV-NA-001')!;
    const updated = memory.updateParameter('USV-NA-001', {
      value: 10.6,
      status: 'ASSUMED',
      assumptions: ['TEST ONLY: unverified preview']
    }, 'TEST-DRAFT-ONLY');
    expect(updated.revision).toBe(before.revision + 1);
    expect(updated.status).toBe('ASSUMED');
    updated.status = 'APPROVED';
    expect(memory.getParameter('USV-NA-001')?.status).toBe('ASSUMED');
  });

  it('exports no misleading Director engineering baseline authority', () => {
    const notes = SharedMemory.getInstance().exportObsidianVault();
    expect(notes['USV-01_Digital_Lab_Index.md']).toContain('NONE IN THIS CLIENT-SIDE EXPORT');
    expect(notes['USV-NA-001.md']).toContain('not an authenticated engineering baseline');
  });
});

describe('B01: demonstration UI never promotes historical data', () => {
  const simulation = readFileSync('src/components/RealtimeSimulationView.tsx', 'utf8');
  const orchestrator = readFileSync('src/components/AgentOrchestratorView.tsx', 'utf8');
  const visualizer = readFileSync('src/components/Vessel3DVisualizer.tsx', 'utf8');

  it('isolates the simulation presets from SharedMemory and Gate 0', () => {
    expect(simulation).not.toContain('sharedMemory.updateParameter(');
    expect(simulation).not.toContain('status="VALIDATED"');
    expect(simulation).toContain('status="UNVERIFIED_PREVIEW"');
    expect(simulation).toContain('Presets and sliders do not change SharedMemory');
  });

  it('never treats presence of numeric inputs as a certified vessel baseline', () => {
    expect(orchestrator).not.toContain('hasCertifiedBaselines');
    expect(orchestrator).not.toContain("'CERTIFIED BASELINE'");
    expect(orchestrator).toContain("baselineStatus: 'UNVERIFIED_PARAMETRIC_STUDY'");
    expect(orchestrator).toContain('isExploratoryStudy: true');
    expect(orchestrator).not.toContain("'Verified against USV-01 preliminary design criteria.'");
    expect(orchestrator).toContain('disabled={!isDirectorAuthenticated || !directorNote.trim()}');
  });

  it('labels schematic rendering and pressure coloring as unverified', () => {
    expect(visualizer).toContain("status = 'UNVERIFIED_PREVIEW'");
    expect(visualizer).toContain('NOT ENGINEERING CAD OR PHYSICS EVIDENCE');
    expect(visualizer).toContain('Schematic Pressure');
  });
});
