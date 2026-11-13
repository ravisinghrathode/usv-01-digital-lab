import { describe, it, expect } from 'vitest';
import { ACCEPTANCE_REQUIREMENTS } from '../src/core/verification/AcceptanceGate.ts';
import {
  CAMPAIGN_WORKSTREAMS, runAcceptanceCampaign, acceptanceCampaignMarkdown
} from '../src/core/verification/AcceptanceCampaign.ts';

const sha = 'a'.repeat(40);

describe('Single-pass USV-01 acceptance campaign', () => {
  it('maps all 15 criteria into exactly 13 unique workstreams', () => {
    expect(CAMPAIGN_WORKSTREAMS).toHaveLength(13);
    const mapped = CAMPAIGN_WORKSTREAMS.flatMap(w => [...w.criteria]);
    expect(mapped).toHaveLength(15);
    expect(new Set(mapped).size).toBe(15);
    expect(new Set(mapped)).toEqual(new Set(ACCEPTANCE_REQUIREMENTS.map(c => c.id)));
  });

  it('inspects all 26 agent definitions but refuses to certify them or the lab', () => {
    const result = runAcceptanceCampaign({ baselineSha: sha });
    expect(result.registeredAgents).toBe(26);
    expect(result.agentFindings).toHaveLength(26);
    expect(result.structurallyValid).toBe(true);
    expect(result.agentFindings.every(x => x.configurationValid)).toBe(true);
    expect(result.agentFindings.every(x => !x.liveProviderExecutionVerified && !x.independentlyValidated)).toBe(true);
    expect(result.resistancePropulsion.status).toBe('MISSING_EVIDENCE');
    expect(result.resistancePropulsion.releaseApproved).toBe(false);
    expect(result.resistancePropulsion.missingGates).toContain('RES-01-A');
    expect(result.marineEvidence.status).toBe('NO_EVIDENCE');
    expect(result.marineEvidence.missingRequirements).toHaveLength(13);
    expect(result.acceptedWorkstreams).toBe(0);
    expect(result.pendingWorkstreams).toBe(13);
    expect(result.releaseApproved).toBe(false);
  });

  it('never turns self-attested external submissions into release approval', () => {
    const r = runAcceptanceCampaign({
      baselineSha: sha,
      evidence: [{
        requirementId: 'HYD-01', baselineSha: sha,
        referenceUri: 'https://example.org/reference', referenceSha256: 'sha256:' + 'b'.repeat(64),
        sourceType: 'PHYSICAL_TEST', reviewedBy: 'Unverified claimant',
        independentlyVerified: true, attestationVerified: true
      }]
    });
    expect(r.workstreams.find(x => x.id === 'WS-03')?.accepted).toBe(false);
    expect(r.releaseApproved).toBe(false);
  });

  it('records invalid reference measurement and invalid baseline without unsafe approval', () => {
    const r = runAcceptanceCampaign({
      baselineSha: 'unknown',
      benchmarkMeasurements: [{
        id: 'bad', quantity: 'GM', referenceValue: 1, observedValue: Infinity,
        absoluteTolerance: 0, relativeTolerance: 0, unit: 'm', sourceReference: 'fake'
      }]
    });
    expect(r.baselineValid).toBe(false);
    expect(r.benchmark.status).toBe('INVALID_REFERENCE_DATA');
    expect(r.workstreams.find(x => x.id === 'WS-03')?.status).toBe('BLOCKED_SOFTWARE_DEFECT');
    expect(r.releaseApproved).toBe(false);
  });

  it('evaluates marine sizing inputs without accepting physical engineering', () => {
    const r = runAcceptanceCampaign({
      baselineSha: sha,
      marineLiftingCases: [{
        caseId: 'SYNTHETIC-LIFT-CASE', designVerticalLoadN: 1000,
        loadCaseSource: 'Unit test only, not handling evidence',
        legs: [
          { legId: 'L1', verticalLoadShare: 0.6, angleFromVerticalRad: 0,
            workingLoadLimitN: 1000, reference: 'Synthetic source' },
          { legId: 'L2', verticalLoadShare: 0.4, angleFromVerticalRad: 0,
            workingLoadLimitN: 1000, reference: 'Synthetic source' }
        ]
      }],
      marineThermalCases: [{
        caseId: 'SYNTHETIC-THERMAL-CASE', worstCaseSinkTemperatureK: 300,
        sinkConditionSource: 'Synthetic sink condition',
        components: [{
          componentId: 'COMP-1', dissipationW: 10, totalResistanceKPerW: 0.5,
          maximumCaseTemperatureK: 330, reserveMarginK: 5,
          sourceReference: 'Synthetic component source'
        }]
      }]
    });
    expect(r.marineScreens.liftingCases[0].status).toBe('SCREEN_PASS_UNVERIFIED');
    expect(r.marineScreens.thermalCases[0].status).toBe('SCREEN_PASS_UNVERIFIED');
    expect(r.workstreams.find(x => x.id === 'WS-07')?.accepted).toBe(false);
    expect(r.releaseApproved).toBe(false);
  });
  it('flags invalid marine sizing inputs as a software-observable defect without approval', () => {
    const r = runAcceptanceCampaign({
      baselineSha: sha,
      marineLiftingCases: [{
        caseId: 'TEST-CASE', designVerticalLoadN: -1, loadCaseSource: 'TBD',
        legs: []
      }]
    });
    expect(r.marineScreens.liftingCases[0].status).toBe('INVALID_INPUT');
    expect(r.workstreams.find(x => x.id === 'WS-07')?.status).toBe('BLOCKED_SOFTWARE_DEFECT');
    expect(r.releaseApproved).toBe(false);
  });

  it('generates human-readable report with every workstream and explicit non-certification', () => {
    const report = acceptanceCampaignMarkdown(runAcceptanceCampaign({ baselineSha: sha }));
    expect(report).toContain('NOT APPROVED');
    expect(report).toContain('RES-01 numerical evidence screening: MISSING_EVIDENCE');
    for (const workstream of CAMPAIGN_WORKSTREAMS) expect(report).toContain(workstream.id);
  });
});
