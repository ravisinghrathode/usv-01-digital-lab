import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CryptographicAuditTrail } from '../src/core/safety/CryptographicAuditTrail.ts';

const originalCwd = process.cwd();
const dirs: string[] = [];
function isolatedTrail(): CryptographicAuditTrail {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usv-audit-'));
  dirs.push(dir);
  process.chdir(dir);
  // Construct independently to test on-disk recovery rather than the process singleton.
  return new (CryptographicAuditTrail as unknown as { new (): CryptographicAuditTrail })();
}
afterEach(() => {
  vi.restoreAllMocks();
  process.chdir(originalCwd);
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const event = { actor: 'test', role: 'SECURITY_ANALYST', action: 'SECURITY_GATE_EVALUATED' as const, details: { pass: false } };

describe('cryptographic audit durability', () => {
  it('persists an append before acknowledging it, and survives restart', () => {
    const trail = isolatedTrail();
    const record = trail.appendEntry(event);
    const recovered = new (CryptographicAuditTrail as unknown as { new (): CryptographicAuditTrail })();
    expect(recovered.getEntries()).toEqual([record]);
    expect(recovered.verifyIntegrity().valid).toBe(true);
  });

  it('rejects a corrupt journal instead of silently creating a new genesis', () => {
    const trail = isolatedTrail();
    trail.appendEntry(event);
    const file = path.join(process.cwd(), 'data', 'cryptographic_audit_trail.json');
    fs.writeFileSync(file, '[{"corrupt":true}]');
    expect(() => new (CryptographicAuditTrail as unknown as { new (): CryptographicAuditTrail })()).toThrow(/integrity failure/);
    expect(fs.readFileSync(file, 'utf8')).toContain('corrupt');
  });

  it('does not mutate in-memory state or report success if persistence fails', () => {
    const trail = isolatedTrail();
    const before = trail.getEntries();
    const spy = vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw new Error('disk failure'); });
    expect(() => trail.appendEntry(event)).toThrow('disk failure');
    expect(trail.getEntries()).toEqual(before);
    spy.mockRestore();
    expect(trail.appendEntry(event).previousHash).toMatch(/^GENESIS_BLOCK/);
  });

  it('does not expose mutable internal records', () => {
    const trail = isolatedTrail();
    trail.appendEntry(event);
    const exposed = trail.getEntries();
    exposed[0].details.pass = true;
    expect(trail.verifyIntegrity().valid).toBe(true);
    expect(trail.getEntries()[0].details.pass).toBe(false);
  });
});
