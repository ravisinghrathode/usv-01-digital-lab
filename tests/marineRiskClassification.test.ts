import { describe, expect, it } from 'vitest';
import { classifyFile } from '../scripts/governance/classify-change.ts';

describe('MAR-01 safety-classification cannot be downgraded to medium risk', () => {
  it('classifies marine engineering evidence and numerical gates as critical', () => {
    for (const path of [
      'src/core/verification/MarineSystemsEvidenceGate.ts',
      'src/core/verification/MarineSystemsSizing.ts',
      'src/core/verification/AcceptanceCampaign.ts',
      'tests/acceptanceCampaign.test.ts'
    ]) {
      const result = classifyFile(path);
      expect(result.categories).toContain('SAFETY');
      expect(result.risk).toBe('CRITICAL');
    }
  });
  it('classifies marine test protocols and ECR requirements at least high', () => {
    for (const path of [
      'docs/MAR01_VERIFICATION_PROTOCOLS.md',
      'docs/MAR01_MARINE_SYSTEMS_INTEGRATION.md',
      'governance/ecr/ECR-20261113-004_MARINE_SYSTEMS_EVIDENCE.md'
    ]) {
      const result = classifyFile(path);
      expect(result.categories).toContain('REQUIREMENTS');
      expect(['HIGH', 'CRITICAL']).toContain(result.risk);
    }
  });
  it('treats governance classifier/control modifications as critical', () => {
    for (const path of [
      'scripts/governance/classify-change.ts',
      'scripts/governance/stage-d-human-approval.ts',
      'scripts/governance/stage-e-enforce.ts'
    ]) {
      const result = classifyFile(path);
      expect(result.categories).toContain('SECURITY');
      expect(result.risk).toBe('CRITICAL');
    }
  });
  it('does not escalate unrelated documentation by default', () => {
    expect(classifyFile('docs/ARCHITECTURE.md').risk).toBe('LOW');
  });
});
