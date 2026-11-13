import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MARINE_EVIDENCE_REQUIREMENTS } from '../src/core/verification/MarineSystemsEvidenceGate.ts';

const raw = fs.readFileSync(path.join(process.cwd(), 'governance/marine/MAR01_CLOSEOUT_INPUTS.json'), 'utf8');
const manifest = JSON.parse(raw) as {
  schemaVersion: string;
  status: string;
  releaseAccepted: boolean;
  requirements: Array<{
    id: string; procedureId: string; missingInput: string;
    designLimitReference: string | null;
    independentReviewer: string | null;
    referenceUri: string | null;
    referenceSha256: string | null;
    authoritySignatureReference: string | null;
    physicalEvidenceVerified: boolean;
    reviewDisposition: string;
  }>;
  configurationInputs: Array<{ id: string; field: string; unit: string; value: unknown; source: string | null; status: string }>;
};

describe('MAR-01 physical evidence manifest — fail-closed contract', () => {
  it('covers exactly all 13 marine obligations with no missing or extra IDs', () => {
    const expected = MARINE_EVIDENCE_REQUIREMENTS.map(x => x.id).sort();
    const actual = manifest.requirements.map(x => x.id).sort();
    expect(actual).toEqual(expected);
    expect(new Set(actual).size).toBe(13);
    expect(manifest.schemaVersion).toBe('MAR01_CLOSEOUT_INPUT_V1');
  });

  it('refuses unreferenced physical approval or claimed vessel release', () => {
    for (const item of manifest.requirements) {
      expect(item.procedureId).toMatch(/^VVP-MAR-0[1-5]$/);
      expect(item.missingInput.length).toBeGreaterThan(3);
      if (item.physicalEvidenceVerified || item.reviewDisposition === 'APPROVED') {
        expect(item.referenceUri).toMatch(/^https:\/\/[^\s]+$/);
        expect(item.referenceSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
        expect(item.designLimitReference).toBeTruthy();
        expect(item.independentReviewer).toBeTruthy();
        expect(item.authoritySignatureReference).toBeTruthy();
      }
    }
    // Metadata itself never permits this release flag; independent process required.
    expect(manifest.releaseAccepted).toBe(false);
  });

  it('cannot silently turn unselected design inputs into approved values', () => {
    expect(manifest.configurationInputs.length).toBeGreaterThanOrEqual(10);
    const ids = new Set<string>();
    for (const input of manifest.configurationInputs) {
      expect(ids.has(input.id)).toBe(false);
      ids.add(input.id);
      expect(input.field.length).toBeGreaterThan(2);
      expect(input.unit.length).toBeGreaterThan(0);
      if (input.status === 'TBD') {
        expect(input.value).toBeNull();
        expect(input.source).toBeNull();
      } else {
        expect(input.source).toBeTruthy();
        expect(input.value).not.toBeNull();
      }
    }
  });
});
