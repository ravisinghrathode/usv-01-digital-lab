import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import type { AgentExecutionOutput } from '../src/core/types/agent.ts';
import { compileCodexAgentCases } from '../src/core/verification/CodexMatrixInput.ts';
import { runLiveAgentMatrix } from '../src/core/verification/LiveAgentMatrix.ts';
import {
  assessEngineeringCampaign, canonicalHostHealth, canonicalExternalReview,
  HOST_HEALTH_SCHEMA, EXTERNAL_REVIEW_SCHEMA,
  type SignedHostHealth, type ExternalEngineeringReview,
  type LiveCampaignEvidence
} from '../src/core/verification/EngineeringCampaignAcceptance.ts';
import { topologicalAgentOrder } from '../src/core/verification/TopologicalAgentCampaign.ts';

const sha = 'b'.repeat(40);
const digest = 'sha256:' + 'a'.repeat(64);
const catalog = JSON.parse(fs.readFileSync(
  path.resolve('evidence/live-agents/representative-cases.json'), 'utf8'
));
const nowIso = new Date().toISOString();

const { publicKey: hostPub, privateKey: hostPriv } = generateKeyPairSync('ed25519');
const { publicKey: reviewPub, privateKey: reviewPriv } = generateKeyPairSync('ed25519');
const hostPem = hostPub.export({ format: 'pem', type: 'spki' }).toString();
const reviewerPem = reviewPub.export({ format: 'pem', type: 'spki' }).toString();

const fakeSimulationOnly = async (id: string, input: { taskId: string }): Promise<AgentExecutionOutput> => {
  const agent = AgentRegistry.getInstance().requireAgent(id);
  return {
    agentId: id, taskId: input.taskId, timestamp: new Date().toISOString(),
    status: 'NEEDS_HUMAN_APPROVAL', executionMode: 'LIVE_AI_GENERATION',
    providerExecutionMode: 'LIVE_AI_GENERATION', provider: 'codex_cli',
    modelIdentifier: 'FAKE_TEST_ONLY',
    correlationId: 'mock-corr-' + agent.canonicalId,
    evidenceValid: false, verificationStatus: 'UNVERIFIED',
    data: { disciplineSummary: 'Mocked test fixture only; not a real model output' },
    assumptions: [], openTbdItems: ['All vessel limits TBD'],
    warnings: ['Unit-test simulation only'], recommendations: [],
    requiresDirectorApproval: true,
    deterministicToolEvidence: agent.verificationCriteria.mandatoryDeterministicTools.map(toolName => ({
      toolName, inputs: {}, outputs: {}, verified: true
    }))
  };
};

function signedHealth(): SignedHostHealth {
  const body: SignedHostHealth = {
    schema: HOST_HEALTH_SCHEMA, hostId: 'unit-test-machine',
    implementationSha: sha, campaignReportSha256: digest,
    observedAt: nowIso, runtimeHealthy: true, codexAuthenticated: true,
    registeredAgents: 26, signatureBase64: ''
  };
  body.signatureBase64 = sign(null, Buffer.from(canonicalHostHealth(body)), hostPriv).toString('base64');
  return body;
}

describe('USV-01 real campaign integrity (synthetic unit-test inputs ONLY)', () => {
  it('topologically schedules upstream weight before hydrostatics and sensors/comms before electrical', () => {
    const specs = topologicalAgentOrder(AgentRegistry.getInstance().getAllAgents());
    const index = (id: string) => specs.findIndex(agent => agent.canonicalId === id);
    expect(specs).toHaveLength(26);
    expect(index('A09')).toBeLessThan(index('A06'));
    expect(index('A09')).toBeLessThan(index('A07'));
    expect(index('A16')).toBeLessThan(index('A14'));
    expect(index('A19')).toBeLessThan(index('A14'));
    expect(index('A17')).toBeLessThan(index('A22'));
  });

  it('completes all 26 test-only roles in dependency order and records advisory handoffs', async () => {
    const cases = compileCodexAgentCases(catalog);
    const calls: string[] = [];
    let weightHandoff: any;
    const journal: number[] = [];
    const report = await runLiveAgentMatrix(cases, async (id, input) => {
      const spec = AgentRegistry.getInstance().requireAgent(id);
      calls.push(spec.canonicalId);
      if (spec.canonicalId === 'A06') weightHandoff = input.priorAgentOutputs?.['WGT-BAL-09'];
      return fakeSimulationOnly(id, input);
    }, {
      dependencyAware: true,
      onFinding: (_f, completed) => { journal.push(completed.length); }
    });
    expect(report.totalAgents).toBe(26);
    expect(report.liveProviderRuns).toBe(26);
    expect(report.findings).toHaveLength(26);
    expect(journal).toHaveLength(26);
    expect(journal[25]).toBe(26);
    expect(calls.indexOf('A09')).toBeLessThan(calls.indexOf('A06'));
    expect(weightHandoff?.dataClassification).toBe('UNVERIFIED_UPSTREAM_ADVISORY');
    expect(weightHandoff?.engineeringReleaseApproved).toBe(false);
    expect(report.independentlyEngineeringValidated).toBe(false);
    expect(report.engineeringReleaseApproved).toBe(false);
  });

  it('blocks dependents when a required specialist did not complete live execution', async () => {
    const cases = compileCodexAgentCases(catalog);
    const report = await runLiveAgentMatrix(cases, async (id, input) => {
      if (id === 'WGT-BAL-09') throw new Error('test-only simulated CLI failure');
      return fakeSimulationOnly(id, input);
    }, { dependencyAware: true });
    expect(report.findings).toHaveLength(26);
    expect(report.findings.find(x => x.canonicalId === 'A09')?.status).toBe('EXECUTION_FAILED');
    expect(report.findings.find(x => x.canonicalId === 'A06')?.status).toBe('BLOCKED_UPSTREAM');
    expect(report.providerOperationalMatrixComplete).toBe(false);
  });

  it('does not claim current host or independent engineering validation from a live-looking mock report', async () => {
    const report = await runLiveAgentMatrix(compileCodexAgentCases(catalog), fakeSimulationOnly);
    const evidence: LiveCampaignEvidence = {
      ...report, implementationSha: sha, catalogSha256: digest,
      dataClassification: 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL', dependencyAware: false,
      commissioning: { permitted: true, scope: 'LAB_COMMISSIONING_RESEARCH', engineeringReleaseApproved: false }
    };
    const result = assessEngineeringCampaign(evidence, { expectedCommit: sha });
    expect(result.liveCodexAgents).toBe(26);
    expect(result.operationalOnCurrentInfrastructure).toBe(false);
    expect(result.fullyAutomatedEngineeringCampaign).toBe(false);
    expect(result.independentlyValidatedEngineeringOutputs).toBe(false);
    expect(result.independentlyAttestedAgents).toBe(0);
    expect(result.deficiencies.operational.join(' ')).toMatch(/host health/);
  });

  it('accepts only a fresh trusted host signature for *operational* attestation', async () => {
    const report = await runLiveAgentMatrix(compileCodexAgentCases(catalog), fakeSimulationOnly);
    const evidence: LiveCampaignEvidence = {
      ...report, implementationSha: sha, catalogSha256: digest,
      dataClassification: 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL',
      commissioning: { permitted: true, scope: 'LAB_COMMISSIONING_RESEARCH', engineeringReleaseApproved: false }
    };
    const good = assessEngineeringCampaign(evidence, {
      expectedCommit: sha, host: signedHealth(), campaignReportSha256: digest,
      hostPublicKeyPem: hostPem
    });
    expect(good.operationalOnCurrentInfrastructure).toBe(true);
    expect(good.fullyAutomatedEngineeringCampaign).toBe(false);
    expect(good.independentlyValidatedEngineeringOutputs).toBe(false);
    const forged = signedHealth();
    forged.runtimeHealthy = false;
    const invalid = assessEngineeringCampaign(evidence, {
      expectedCommit: sha, host: forged, campaignReportSha256: digest,
      hostPublicKeyPem: hostPem
    });
    expect(invalid.hostHealthVerified).toBe(false);
  });

  it('requires a signed external reference file linked to an exact agent output', async () => {
    const report = await runLiveAgentMatrix(compileCodexAgentCases(catalog), fakeSimulationOnly);
    const evidence: LiveCampaignEvidence = {
      ...report, implementationSha: sha, catalogSha256: digest,
      dataClassification: 'SYNTHETIC_TEST_ONLY_NON_OPERATIONAL',
      commissioning: { permitted: true, scope: 'LAB_COMMISSIONING_RESEARCH', engineeringReleaseApproved: false }
    };
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'usv-review-test-'));
    try {
      const relative = 'evidence/independent/a01-reference.txt';
      const target = path.join(temporary, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, 'Unit-test reference; NOT genuine physical or engineering evidence');
      const review: ExternalEngineeringReview = {
        schema: EXTERNAL_REVIEW_SCHEMA, canonicalId: 'A01',
        implementationSha: sha,
        agentOutputSha256: report.findings.find(x => x.canonicalId === 'A01')!.outputDigestSha256!,
        referencePath: relative,
        referenceSha256: 'sha256:' + createHash('sha256').update(fs.readFileSync(target)).digest('hex'),
        verifierId: 'test-reviewer-external', reviewerQualification: 'UNIT TEST ONLY',
        method: 'Unit-test cryptographic envelope', finding: 'ACCEPT',
        signedAt: nowIso, signatureBase64: ''
      };
      review.signatureBase64 = sign(null, Buffer.from(canonicalExternalReview(review)), reviewPriv).toString('base64');
      const result = assessEngineeringCampaign(evidence, {
        expectedCommit: sha, referenceRootDir: temporary,
        reviews: [review], independentReviewerPublicKeyPem: reviewerPem
      });
      expect(result.independentlyAttestedAgents).toBe(1);
      expect(result.independentlyValidatedEngineeringOutputs).toBe(false);
      const tampered = { ...review, referenceSha256: digest };
      const rejected = assessEngineeringCampaign(evidence, {
        expectedCommit: sha, referenceRootDir: temporary,
        reviews: [tampered], independentReviewerPublicKeyPem: reviewerPem
      });
      expect(rejected.independentlyAttestedAgents).toBe(0);
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('reports missing evidence instead of inventing operational success', () => {
    const result = assessEngineeringCampaign(undefined, { expectedCommit: sha });
    expect(result.liveCodexAgents).toBe(0);
    expect(result.operationalOnCurrentInfrastructure).toBe(false);
    expect(result.fullyAutomatedEngineeringCampaign).toBe(false);
    expect(result.independentlyValidatedEngineeringOutputs).toBe(false);
  });
});
