import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MASTER_AGENTS } from '../src/core/agents/definitions.ts';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('Canonical 26-agent documentation alignment', () => {
  it('matches the active architecture role table to every canonical agent', () => {
    expect(MASTER_AGENTS).toHaveLength(26);
    expect(new Set(MASTER_AGENTS.map(agent => agent.division)).size).toBe(8);

    const table = read('docs/ARCHITECTURE.md');
    const rows = table.split('\n')
      .filter(line => line.startsWith('| `'))
      .map(line => {
        const cells = line.split('|').map(cell => cell.trim());
        return {
          id: cells[1].replaceAll('`', ''),
          name: cells[2],
          division: cells[3]
        };
      });

    expect(rows).toHaveLength(26);
    expect(new Set(rows.map(row => row.id)).size).toBe(26);
    expect(rows.map(row => row.id).sort())
      .toEqual(MASTER_AGENTS.map(agent => agent.id).sort());

    for (const agent of MASTER_AGENTS) {
      expect(rows.find(row => row.id === agent.id)).toEqual({
        id: agent.id,
        name: agent.name,
        division: agent.division
      });
    }
  });

  it('has no obsolete active 25-agent or seven-division designation', () => {
    for (const file of [
      'docs/ARCHITECTURE.md',
      'governance/AGENT_GOVERNANCE_INTERFACE.md',
      'docs/governance/AI_AGENT_GOVERNANCE_STANDARD.md',
      'docs/governance/ENGINEERING_GOVERNANCE_POLICY.md'
    ]) {
      const text = read(file);
      expect(text, file).not.toMatch(/A01[–-]A25|25 canonical specialist agents|25 canonical agents|7 (?:functional|naval engineering) divisions/i);
    }
  });

  it('distinguishes 26-agent campaigns from bounded A01/A15 design iteration', () => {
    const acceptance = read('docs/USV01_26_AGENT_OPERATIONAL_ACCEPTANCE.md');
    const protocol = read('docs/AGENT_DESIGN_LOOP_AND_SOLVER_PROTOCOL_20261113.md');
    const architecture = read('docs/ARCHITECTURE.md');

    expect(acceptance).toContain('autonomous 26-agent first-principles design loop remains **NOT DEMONSTRATED**');
    expect(protocol).toContain('Only the live design loop uses A01 and A15 directly');
    expect(architecture).toContain('up to five cycles');
  });
});
