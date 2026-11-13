import { describe, expect, it } from 'vitest';
import { GenerativeDesignOptimizer } from '../src/core/optimizer/GenerativeDesignOptimizer.ts';
import { runAgentDesignLoop } from '../src/core/optimizer/AgentDesignLoop.ts';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import type { AgentExecutionInput, AgentExecutionOutput } from '../src/core/types/agent.ts';

const sha = 'a'.repeat(40);
const mission = {
  runId: 'TEST-DESIGN-LOOP', sourceCommit: sha, seed: 1337,
  maxRevisions: 2,
  specialistReviews: 'OFF' as const,
  missionStatement: 'Explore two unapproved alternatives without claiming vessel release',
  requirements: [{ id: 'REQ-TEST-1', statement: 'Explore preliminary design variants', source: 'Synthetic regression case only' }],
  sourceReferences: [{ reference: 'https://example.org/synthetic-only', description: 'NOT an authenticated design source' }]
};
const makeOutput = (agentId: string, input: AgentExecutionInput, metrics: Record<string, unknown>, provider = 'gemini'): AgentExecutionOutput => ({
  agentId, taskId: input.taskId, timestamp: '2026-11-13T00:00:00Z',
  status: 'NEEDS_HUMAN_APPROVAL',
  providerExecutionMode: provider === 'mock' ? 'SYNTHETIC_TEST_MOCK' : 'LIVE_AI_GENERATION',
  provider, evidenceValid: false, verificationStatus: 'UNVERIFIED',
  data: { conceptTopology:'MONOHULL', modelSuggestedKeyMetrics: metrics,
    metricProvenance: Object.fromEntries(Object.keys(metrics).map(k => [k,
      {sourceKind:'HYPOTHESIS',sourceReference:'SYNTHETIC_UNIT_TEST_ASSUMPTION',
        justification:'Explicitly hypothetical finite numerical unit-test value'}])),
    designDecisions: ['Check unsupported hull assumptions'] },
  assumptions: [], deterministicToolEvidence: [], openTbdItems: ['Approved hull offsets missing'],
  warnings: [], recommendations: ['Revisit assumptions'], requiresDirectorApproval: true
});
const registry = AgentRegistry.getInstance();
const proposer = registry.requireAgent('A01').id;
const critic = registry.requireAgent('A15').id;

describe('Reproducible legacy scenarios and real-agent iterative design screening', () => {
  it('replays identical scenario generations for the same seed and different values for a new seed', () => {
    const o = GenerativeDesignOptimizer.getInstance();
    o.resetOptimizer(123456);
    const a = Array.from({ length: 3 }, () => o.runIteration());
    const digest = a.map(v => [v.lwlMeters, v.beamMeters, v.hullType, v.runSeed, v.drawIndex, v.fitnessScore]);
    expect(a.every(v => v.runSeed === 123456 && v.scenarioRevision.includes('UNVERIFIED'))).toBe(true);
    expect(o.getRunMetadata().runSeed).toBe(123456);
    o.resetOptimizer(123456);
    const b = Array.from({ length: 3 }, () => o.runIteration());
    expect(b.map(v => [v.lwlMeters, v.beamMeters, v.hullType, v.runSeed, v.drawIndex, v.fitnessScore])).toEqual(digest);
    o.resetOptimizer(654321);
    const c = Array.from({ length: 3 }, () => o.runIteration());
    expect(c.map(v => [v.lwlMeters, v.beamMeters, v.hullType])).not.toEqual(a.map(v => [v.lwlMeters, v.beamMeters, v.hullType]));
    expect(() => o.resetOptimizer(-1)).toThrow(/unsigned 32-bit/);
    expect(() => o.resetOptimizer(2 ** 32)).toThrow(/unsigned 32-bit/);
  });

  it('isolates separate seeded campaigns without contaminating the interactive singleton', async () => {
    const shared = GenerativeDesignOptimizer.getInstance();
    shared.resetOptimizer(987);
    const original = shared.runIteration().id;
    const a = GenerativeDesignOptimizer.createIsolated(12);
    const b = GenerativeDesignOptimizer.createIsolated(99);
    const firstA = a.runIteration();
    b.runIteration();
    a.runIteration();
    expect(a.getHistory()).toHaveLength(2);
    expect(b.getHistory()).toHaveLength(1);
    expect(shared.getRunMetadata().runSeed).toBe(987);
    expect(shared.getHistory()).toHaveLength(1);
    expect(shared.getHistory()[0].id).toBe(original);
    const again = GenerativeDesignOptimizer.createIsolated(12).runIteration();
    expect([again.lwlMeters, again.beamMeters, again.hullType, again.drawIndex]).toEqual(
      [firstA.lwlMeters, firstA.beamMeters, firstA.hullType, firstA.drawIndex]
    );
  });

  it('invokes actual registered proposer and critic IDs and screens two distinct revisions with real deterministic tools', async () => {
    const seen: Array<{ agent: string; prior: AgentExecutionInput['priorAgentOutputs']; ctx: AgentExecutionInput['context'] }> = [];
    const execute = async (id: string, input: AgentExecutionInput) => {
      seen.push({ agent: id, prior: input.priorAgentOutputs, ctx: input.context });
      if (id === proposer) {
        const length = input.taskId.endsWith('-0') ? 10 : 10.5;
        return makeOutput(id, input, {
          lwlMeters: length, beamMeters: 3, draftMeters: 0.7, blockCoefficientCb: 0.55,
          displacementTonnes: length * 3 * 0.7 * 0.55 * 1.025,
          speedKnots: 10, propulsiveEfficiencyEtaD: 0.6, waterTempCelsius: 15
        });
      }
      expect(id).toBe(critic);
      expect(input.context.hypothesisUnverified).toBeDefined();
      return makeOutput(id, input, {});
    };
    const result = await runAgentDesignLoop(mission, execute);
    expect(result.completedAgentCalls).toBe(4);
    expect(result.completedToolScreens).toBe(4);
    expect(result.revisions).toHaveLength(2);
    expect(result.revisions.flatMap(r => r.screened.screenResults).every(r => r.success)).toBe(true);
    expect(result.revisions[1].screened.parameters.lwlMeters).toBe(10.5);
    expect(seen.map(x => x.agent)).toEqual([proposer, critic, proposer, critic]);
    expect(seen[2].prior?.criticA15).toBeTruthy();
    expect(result.stopReason).toBe('MAX_REVISIONS_REACHED');
    expect(result.detailedDesignAuthorized).toBe(false);
    expect(result.engineeringReleaseAuthorized).toBe(false);
    expect(result.independentEngineeringValidated).toBe(false);
  });

  it('activates four real registered specialist roles when both calculations pass', async () => {
    const calls: string[] = [];
    const result = await runAgentDesignLoop({...mission, maxRevisions:1,
      specialistReviews:'AUTO' as const}, async (id,input) => {
      calls.push(id);
      if (id !== proposer) return makeOutput(id,input,{});
      return makeOutput(id,input,{lwlMeters:10,beamMeters:3,draftMeters:0.7,
        blockCoefficientCb:0.55,displacementTonnes:10*3*0.7*0.55*1.025,
        speedKnots:10,propulsiveEfficiencyEtaD:0.6,waterTempCelsius:15});
    });
    expect(calls).toEqual([
      registry.requireAgent('A01').id,
      registry.requireAgent('A05').id,
      registry.requireAgent('A06').id,
      registry.requireAgent('A07').id,
      registry.requireAgent('A23').id,
      registry.requireAgent('A15').id
    ]);
    expect(result.specialistReviewCount).toBe(4);
    expect(result.revisions[0].specialistReviews).toHaveLength(4);
    expect(result.revisions[0].specialistReviews.every(x=>x.status==='LIVE_REVIEW_UNVERIFIED')).toBe(true);
    expect(result.completedToolScreens).toBe(2);
    expect(result.engineeringReleaseAuthorized).toBe(false);
  });

  it('activates A09/A10/A14 only from source-hashed discipline input packages', async () => {
    const pkgSha='sha256:'+'d'.repeat(64);
    const pkgMission={...mission,maxRevisions:1,specialistReviews:'AUTO' as const,
      sourceReferences:[{reference:'PKG-001',description:'Synthetic unit package',
        sha256:pkgSha,url:'https://example.org/pkg-001.json'}],
      disciplinePackages:[
        {id:'MASS',canonicalAgent:'A09' as const,toolId:'TOOL-MASS-BALANCE-01' as const,
          sourceReference:'PKG-001',sourceSha256:pkgSha,input:{components:[
            {name:'Hull',massKg:100,lcgMetersFromTransom:5,tcgMetersFromCl:0,
              vcgMetersFromKeel:0.5,designMarginPercent:10}
          ]}},
        {id:'STRUCT',canonicalAgent:'A10' as const,toolId:'TOOL-STRUCTURES-01' as const,
          sourceReference:'PKG-001',sourceSha256:pkgSha,input:{
            displacementTonnes:5,speedKnots:10,lwlMeters:10,deadriseAngleDeg:15,
            unsupportedPanelWidthMm:500,unsupportedPanelLengthMm:700,
            materialYieldStrengthMpa:200,safetyFactor:2
          }},
        {id:'ELEC',canonicalAgent:'A14' as const,toolId:'TOOL-ELECTRICAL-01' as const,
          sourceReference:'PKG-001',sourceSha256:pkgSha,input:{
            busVoltageV:48,batteryTotalKwh:20,usableDepthOfDischarge:0.8,
            consumers:[{name:'Compute',voltageV:48,continuousPowerW:500,
              intermittentPowerW:200,dutyCycle:0.5,isEmergencyLoad:true}]
          }}
      ]};
    const calls:string[]=[];
    const report=await runAgentDesignLoop(pkgMission,async(id,input)=>{
      calls.push(id);
      if(id!==proposer)return makeOutput(id,input,{});
      return makeOutput(id,input,{lwlMeters:10,beamMeters:3,draftMeters:0.7,
        blockCoefficientCb:0.55,displacementTonnes:11.83875,
        speedKnots:10,propulsiveEfficiencyEtaD:0.6,waterTempCelsius:15});
    });
    expect(report.revisions).toHaveLength(1);
    expect(report.revisions[0].screened.screenResults.map(x=>x.toolId)).toEqual(
      expect.arrayContaining(['TOOL-MASS-BALANCE-01','TOOL-STRUCTURES-01','TOOL-ELECTRICAL-01']));
    expect(calls).toEqual(expect.arrayContaining([
      registry.requireAgent('A09').id,registry.requireAgent('A10').id,registry.requireAgent('A14').id
    ]));
    expect(report.revisions[0].specialistReviews.map(x=>x.canonicalId)).toEqual(
      expect.arrayContaining(['A09','A10','A14']));
    expect(report.engineeringReleaseAuthorized).toBe(false);
  });

  it('rejects discipline packages whose source digest is not in the fetched source index', async () => {
    const invalid={...mission,disciplinePackages:[{
      id:'MASS',canonicalAgent:'A09' as const,toolId:'TOOL-MASS-BALANCE-01' as const,
      sourceReference:'UNKNOWN',sourceSha256:'sha256:'+'e'.repeat(64),
      input:{components:[]}
    }]};
    await expect(runAgentDesignLoop(invalid)).rejects.toThrow(/source record/);
  });

  it('ranks only source-defined, same-condition preliminary tool outputs, never design acceptance', async () => {
    const caseMission = {
      ...mission,
      objectives: [{
        id: 'MIN_SHAFT_POWER', toolId: 'TOOL-RESISTANCE-01',
        outputMetric: 'shaftBrakePowerPbKw',
        direction: 'MINIMIZE' as const, weight: 1,
        unit: 'kW', sourceReference: 'SYNTHETIC_TEST_CONDITION_NOT_AN_APPROVED_MISSION',
        fixedInputParameters: { speedKnots: 10, propulsiveEfficiencyEtaD: 0.6, waterTempCelsius: 15 }
      }]
    };
    const execute = async (id: string, input: AgentExecutionInput) => {
      if (id !== proposer) return makeOutput(id, input, {});
      const length = input.taskId.endsWith('-0') ? 10 : 10.5;
      return makeOutput(id, input, {
        lwlMeters: length, beamMeters: 3, draftMeters: 0.7,
        displacementTonnes: length * 3 * 0.7 * 0.55 * 1.025,
        blockCoefficientCb: 0.55,
        speedKnots: 10, propulsiveEfficiencyEtaD: 0.6, waterTempCelsius: 15
      });
    };
    const result = await runAgentDesignLoop(caseMission, execute);
    expect(result.comparison.status).toBe('COMPARISON_READY_UNVERIFIED');
    expect(result.comparison.rankings).toHaveLength(2);
    expect(result.comparison.rankings[0].relativeScore).toBeGreaterThanOrEqual(
      result.comparison.rankings[1].relativeScore);
    expect(result.comparison.rankings[0].objectiveValues.MIN_SHAFT_POWER).toBeGreaterThan(0);
    expect(result.comparison.externallyValidated).toBe(false);
    expect(result.comparison.approvedDesignSelected).toBe(false);
    expect(result.engineeringReleaseAuthorized).toBe(false);
  });

  it('refuses to compare two powering runs at different speeds', async () => {
    const caseMission = {
      ...mission,
      objectives: [{
        id: 'FAIR_RESISTANCE', toolId: 'TOOL-RESISTANCE-01',
        outputMetric: 'totalResistanceKn', direction: 'MINIMIZE' as const,
        weight: 1, unit: 'kN', sourceReference: 'SYNTHETIC_CONDITION_ONLY',
        fixedInputParameters: { speedKnots: 10 }
      }]
    };
    const run = await runAgentDesignLoop(caseMission, async (id, input) => {
      if (id !== proposer) return makeOutput(id, input, {});
      const second = !input.taskId.endsWith('-0');
      const length = second ? 10.5 : 10;
      return makeOutput(id, input, {
        lwlMeters: length, beamMeters: 3, draftMeters: 0.7,
        blockCoefficientCb: 0.55,
        displacementTonnes: length * 3 * 0.7 * 0.55 * 1.025,
        speedKnots: second ? 11 : 10, propulsiveEfficiencyEtaD: 0.6, waterTempCelsius: 15
      });
    });
    expect(run.revisions).toHaveLength(2);
    expect(run.comparison.status).toBe('UNRANKED_INCOMPARABLE');
    expect(run.comparison.rankings).toHaveLength(0);
    expect(run.comparison.excluded).toHaveLength(1);
    expect(run.comparison.excluded[0].reason).toMatch(/Different.*conditions/);
  });

  it('screens catamaran hydrostatics without applying the monohull resistance model', async () => {
    const report = await runAgentDesignLoop({...mission,maxRevisions:1,specialistReviews:'AUTO' as const},
      async (id,input) => {
        if (id !== proposer) return makeOutput(id,input,{});
        const out = makeOutput(id,input,{lwlMeters:10,demiHullBeamMeters:1.1,
          demiHullCenterlineSeparationMeters:3.4,draftMeters:0.7,
          blockCoefficientCb:0.55,waterplaneCoefficientCwp:0.73,
          speedKnots:10,propulsiveEfficiencyEtaD:0.6,waterTempCelsius:15});
        out.data.conceptTopology='CATAMARAN';
        return out;
      });
    expect(report.revisions).toHaveLength(1);
    const screened=report.revisions[0].screened;
    expect(screened.conceptTopology).toBe('CATAMARAN');
    expect(report.completedToolScreens).toBe(1);
    expect(screened.screenResults[0].toolId).toBe('TOOL-CATAMARAN-HYDROSTATICS-01');
    expect(screened.screenResults[0].success).toBe(true);
    expect(screened.screenResults.some(x=>x.toolId==='TOOL-RESISTANCE-01')).toBe(false);
    expect(report.specialistReviewCount).toBe(0);
    expect(report.revisions[0].critique.openTbdItems.join(' ')).toContain('Catamaran resistance');
    expect(report.engineeringReleaseAuthorized).toBe(false);
  });

  it('rescreens two concepts at the same declared speed without modifying their original hypotheses',async()=>{
    const missionAtSpeed = {...mission,comparisonMode:'FIXED_CONDITIONS_RESCREEN' as const,
      objectives:[{
        id:'POWER_FIXED_SPEED',toolId:'TOOL-RESISTANCE-01',
        outputMetric:'shaftBrakePowerPbKw',
        direction:'MINIMIZE' as const,weight:1,unit:'kW',
        sourceReference:'SYNTHETIC_COMPARISON_CONDITION_NOT_REAL_REQUIREMENT',
        fixedInputParameters:{speedKnots:10,propulsiveEfficiencyEtaD:0.6,waterTempCelsius:15}
      }]};
    const report=await runAgentDesignLoop(missionAtSpeed,async (id,input)=>{
      if(id!==proposer)return makeOutput(id,input,{});
      const second=!input.taskId.endsWith('-0');
      const length=second?10.5:10;
      return makeOutput(id,input,{lwlMeters:length,beamMeters:3,draftMeters:0.7,
        blockCoefficientCb:0.55,displacementTonnes:length*3*0.7*0.55*1.025,
        speedKnots:second?11:10,propulsiveEfficiencyEtaD:0.6,waterTempCelsius:15});
    });
    expect(report.revisions).toHaveLength(2);
    expect(report.revisions[1].screened.parameters.speedKnots).toBe(11);
    expect(report.fixedConditionScreens).toHaveLength(2);
    expect(report.fixedConditionScreens.every(s=>s.success)).toBe(true);
    expect(report.comparison.status).toBe('COMPARISON_READY_UNVERIFIED');
    expect(report.comparison.rankings).toHaveLength(2);
    expect(report.comparison.approvedDesignSelected).toBe(false);
  });

  it('refuses to overwrite hull geometry through fixed objective conditions',async()=>{
    const invalid={...mission,comparisonMode:'FIXED_CONDITIONS_RESCREEN' as const,objectives:[{
      id:'FAKE',toolId:'TOOL-RESISTANCE-01',outputMetric:'shaftBrakePowerPbKw',
      direction:'MINIMIZE' as const,weight:1,unit:'kW',sourceReference:'SYNTHETIC',
      fixedInputParameters:{lwlMeters:999}
    }]};
    await expect(runAgentDesignLoop(invalid)).rejects.toThrow(/objective/);
  });

  it('rejects model-suggested dimensions without independently declared provenance', async () => {
    const result = await runAgentDesignLoop(mission, async (id, input) => {
      const output = makeOutput(id, input, { lwlMeters: 10, beamMeters: 3, draftMeters: 0.6 });
      delete output.data.metricProvenance;
      return output;
    });
    expect(result.stopReason).toBe('INVALID_PROPOSAL');
    expect(result.completedToolScreens).toBe(0);
    expect(result.revisions).toHaveLength(0);
    expect(result.engineeringReleaseAuthorized).toBe(false);
  });

  it('rejects source-document numeric claims with no registered source record', async () => {
    const result = await runAgentDesignLoop(mission, async (id, input) => {
      const output = makeOutput(id,input,{lwlMeters:10});
      output.data.metricProvenance.lwlMeters = {
        sourceKind:'SOURCE_DOCUMENT', sourceReference:'https://unregistered.invalid/claim',
        justification:'Fabricated source pointer cannot grant baseline authority'
      };
      return output;
    });
    expect(result.stopReason).toBe('INVALID_PROPOSAL');
    expect(result.completedToolScreens).toBe(0);
  });

  it('fails closed on mock provider and never substitutes a synthetic "agent vote"', async () => {
    let attempts = 0;
    const result = await runAgentDesignLoop(mission, async (id, input) => {
      attempts++;
      return makeOutput(id, input, { lwlMeters: 10 }, 'mock');
    });
    expect(result.stopReason).toBe('NON_LIVE_PROVIDER');
    expect(result.completedAgentCalls).toBe(1);
    expect(result.completedToolScreens).toBe(0);
    expect(result.revisions).toHaveLength(0);
    expect(attempts).toBe(1);
    expect(result.engineeringReleaseAuthorized).toBe(false);
  });

  it('stops when the revision repeats unchanged input, despite a chat critique claiming approval', async () => {
    const result = await runAgentDesignLoop({ ...mission, maxRevisions: 3 }, async (id, input) => {
      if (id === proposer) return makeOutput(id, input, { lwlMeters: 10 });
      return {
        ...makeOutput(id, input, {}),
        data: { designDecisions: ['APPROVED (untrusted model assertion)'] }
      };
    });
    expect(result.stopReason).toBe('NO_CHANGE');
    expect(result.revisions).toHaveLength(1);
    expect(result.detailedDesignAuthorized).toBe(false);
  });

  it('cannot run without source identity, mission or bounded revision budget', async () => {
    await expect(runAgentDesignLoop({ ...mission, sourceCommit: '' })).rejects.toThrow(/source commit/);
    await expect(runAgentDesignLoop({ ...mission, requirements: [] })).rejects.toThrow(/mission requirements/);
    await expect(runAgentDesignLoop({ ...mission, maxRevisions: 999 })).rejects.toThrow(/1\.\.5/);
  });
});
