import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { assessConceptDiscovery, type ConceptDiscoverySubmission } from '../src/core/verification/ConceptDiscoveryGate.ts';

const commit = 'b'.repeat(40);
const digest = 'sha256:' + 'c'.repeat(64);
const create = (): ConceptDiscoverySubmission => ({
  sourceCommit: commit,
  missionRequirements: [
    { id: 'REQ-MISSION-001', statement: 'Establish a research-backed vessel concept for project-level decision', source: 'Project Lead mission note awaiting formal approval' }
  ],
  agentRuns: AgentRegistry.getInstance().getAllAgents().map(spec => ({
    canonicalId: spec.canonicalId,
    runtimeId: spec.id,
    sourceCommit: commit,
    status: 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED',
    provider: 'gemini',
    providerExecutionMode: 'LIVE_AI_GENERATION',
    outputDigestSha256: digest
  })),
  concepts: ['MONO', 'CAT'].map((id, i) => ({
    id, hullType: i ? 'CATAMARAN' : 'MONOHULL',
    parameters: [
      {
        id: 'length-research-range', candidateId: id, value: 8 + i, unit: 'm',
        basis: 'SOURCE_OBSERVATION' as const, authoredBy: 'A05',
        sourceUri: 'https://example.org/unverified-hull-reference', sourceDigest: digest
      },
      {
        id: 'power', candidateId: id, value: null, unit: 'kW',
        basis: 'TBD' as const, authoredBy: 'A07'
      }
    ]
  }))
});

describe('Agent-led concept discovery gate', () => {
  it('rejects missing or forged JSON instead of accepting guessed baselines', () => {
    expect(assessConceptDiscovery(null).status).toBe('INVALID_INPUT');
    expect(assessConceptDiscovery({}).engineeringReleaseAuthorized).toBe(false);
  });

  it('never promotes even a complete claimed 26-agent source-referenced study to approved engineering', () => {
    const result = assessConceptDiscovery(create());
    expect(result.status).toBe('TRADE_STUDY_READY_UNVERIFIED');
    expect(result.genuineProviderClaims).toBe(26);
    expect(result.candidateCount).toBe(2);
    expect(result.sourceBackedParameterClaims).toBe(2);
    expect(result.projectLeadDecisionVerified).toBe(false);
    expect(result.detailedDesignAuthorized).toBe(false);
    expect(result.engineeringReleaseAuthorized).toBe(false);
  });

  it('fails closed on missing or mock-only agents even with numerical proposals', () => {
    const x = create();
    const missing = { ...x, agentRuns: x.agentRuns.slice(1) };
    expect(assessConceptDiscovery(missing).status).toBe('RESEARCH_REQUIRED');
    const fake = { ...x, agentRuns: x.agentRuns.map(r =>
      r.canonicalId === 'A06' ? { ...r, providerExecutionMode: 'SYNTHETIC_TEST_MOCK' } : r) };
    expect(assessConceptDiscovery(fake).status).toBe('RESEARCH_REQUIRED');
  });

  it('detects cross-candidate contamination, negative provenance and duplicate parameters', () => {
    const x = create();
    const altered = {
      ...x,
      concepts: x.concepts.map((c, i) => i ? { ...c,
        parameters: [
          { ...c.parameters[0], candidateId: 'MONO' },
          { ...c.parameters[0] }
        ] } : c)
    };
    const result = assessConceptDiscovery(altered);
    expect(result.status).toBe('EVIDENCE_INCOMPLETE');
    expect(result.issues.join(' ')).toMatch(/candidate scope|duplicate|identity/);
    expect(result.engineeringReleaseAuthorized).toBe(false);
  });

  it('rejects numerical TBD or unsourced alternatives and cannot authenticate a self-declared decision', () => {
    const x = create();
    const unsourced = {
      ...x,
      concepts: x.concepts.map(c => ({ ...c, parameters: [
        { ...c.parameters[0], basis: 'TBD', value: 99, sourceUri: undefined, sourceDigest: undefined }
      ] })),
      projectLeadSelection: {
        candidateId: 'MONO', statedBy: 'Some text', decisionReference: 'self-attested'
      }
    };
    const result = assessConceptDiscovery(unsourced);
    expect(result.status).toBe('EVIDENCE_INCOMPLETE');
    expect(result.issues.join(' ')).toContain('TBD must have null');
    expect(result.issues.join(' ')).toContain('lacks any source-identified');
    expect(result.projectLeadSelectionRecorded).toBe(true);
    expect(result.projectLeadDecisionVerified).toBe(false);
  });

  it('rejects stale agent revision and spoofed external evidence URL', () => {
    const x = create();
    const broken = {
      ...x,
      agentRuns: x.agentRuns.map(r => r.canonicalId === 'A03' ?
        { ...r, sourceCommit: 'f'.repeat(40) } : r),
      concepts: x.concepts.map(c => ({ ...c, parameters: c.parameters.map(p => p.basis === 'SOURCE_OBSERVATION' ?
        { ...p, sourceUri: 'https://user:password@example.org/reference' } : p) }))
    };
    const result = assessConceptDiscovery(broken);
    expect(result.status).toBe('EVIDENCE_INCOMPLETE');
    expect(result.issues.join(' ')).toContain('mismatched source SHA');
    expect(result.issues.join(' ')).toContain('lacks HTTPS citation and checksum');
  });
});
