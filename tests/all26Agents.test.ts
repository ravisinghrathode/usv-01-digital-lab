import { describe, it, expect } from 'vitest';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';
import { ExecutionEngine } from '../src/core/engine/ExecutionEngine.ts';
import { ToolRegistry } from '../src/core/tools/ToolRegistry.ts';
import { ApprovalGateManager } from '../src/core/safety/HumanApprovalGate.ts';
import type { AgentExecutionInput } from '../src/core/types/agent.ts';

describe('26-Agent Individual Verification Matrix (A01 - A26, Tests A through H)', () => {
  const registry = AgentRegistry.getInstance();
  const executionEngine = ExecutionEngine.getInstance();
  const toolRegistry = ToolRegistry.getInstance();
  const gateManager = ApprovalGateManager.getInstance();

  const standardValidInput: AgentExecutionInput = {
    taskId: 'TASK-MATRIX-VERIFY',
    context: { targetVessel: 'USV-01', verificationSuite: true },
    parameters: {
      lwlMeters: 10.0,
      beamMeters: 2.5,
      draftMeters: 0.6,
      displacementTonnes: 5.5,
      speedKnots: 22.0,
      maxSpeedKnots: 28.0,
      blockCoefficientCb: 0.45,
      waterplaneCoefficientCwp: 0.65,
      kgMeters: 0.8,
      seawaterDensityKgM3: 1025,
      propulsiveEfficiencyEtaD: 0.65,
      waterTempCelsius: 15,
      deadriseAngleDeg: 18,
      unsupportedPanelWidthMm: 450,
      unsupportedPanelLengthMm: 900,
      materialYieldStrengthMpa: 125,
      safetyFactor: 2.0,
      components: [
        { name: 'Composite Hull', massKg: 1600, lcgMetersFromTransom: 4.8, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.6, designMarginPercent: 10 },
        { name: 'Twin Electric Inboard Pods', massKg: 350, lcgMetersFromTransom: 1.5, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.4, designMarginPercent: 5 },
        { name: 'Main Battery ESS (120 kWh LFP)', massKg: 1100, lcgMetersFromTransom: 3.5, tcgMetersFromCl: 0, vcgMetersFromKeel: 0.35, designMarginPercent: 10 },
        { name: 'Sensor Mast & Autonomy Stack', massKg: 150, lcgMetersFromTransom: 5.5, tcgMetersFromCl: 0, vcgMetersFromKeel: 2.0, designMarginPercent: 15 }
      ],
      baselineLcbMetersFromTransom: 4.2,
      batteryTotalKwh: 120,
      usableDepthOfDischarge: 0.8,
      busVoltageV: 48,
      consumers: [
        { name: 'Propulsion Loiter (6 kn)', voltageV: 48, continuousPowerW: 6000, intermittentPowerW: 0, dutyCycle: 1, isEmergencyLoad: false },
        { name: 'Navigation Radar & LiDAR', voltageV: 48, continuousPowerW: 450, intermittentPowerW: 100, dutyCycle: 0.5, isEmergencyLoad: true },
        { name: 'Autonomy Computer (Jetson/Orin)', voltageV: 48, continuousPowerW: 150, intermittentPowerW: 0, dutyCycle: 1, isEmergencyLoad: true },
        { name: 'Satellite Comms Transceiver', voltageV: 48, continuousPowerW: 80, intermittentPowerW: 40, dutyCycle: 0.3, isEmergencyLoad: true }
      ],
      ownCourseDeg: 0,
      ownSpeedKnots: 15,
      targetBearingDeg: 45,
      targetRangeNm: 2.0,
      targetCourseDeg: 270,
      targetSpeedKnots: 12
    }
  };

  for (let i = 1; i <= 26; i++) {
    const canonicalId = `A${i.toString().padStart(2, '0')}`;

    describe(`Agent ${canonicalId}`, () => {
      // Test A — Registration
      it(`[Test A — Registration] should verify identity, role, permissions, and dependencies for ${canonicalId}`, () => {
        const agent = registry.getAgent(canonicalId);
        expect(agent).toBeDefined();
        expect(agent?.canonicalId).toBe(canonicalId);
        expect(agent?.id).toBeTruthy();
        expect(agent?.name).toBeTruthy();
        expect(agent?.division).toBeTruthy();
        expect(agent?.systemInstructions.length).toBeGreaterThan(20);
        expect(Array.isArray(agent?.responsibilities)).toBe(true);
        expect(agent?.responsibilities.length).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(agent?.permittedTools)).toBe(true);
        expect(Array.isArray(agent?.dependencies)).toBe(true);

        // Verify dependencies exist in registry
        for (const dep of agent!.dependencies) {
          expect(registry.getAgent(dep)).toBeDefined();
        }
      });

      // Test B — Valid execution
      it(`[Test B — Valid Execution] should execute valid input and return structured output for ${canonicalId}`, async () => {
        const agent = registry.getAgent(canonicalId)!;
        const result = await executionEngine.executeAgent(agent.id, {
          ...standardValidInput,
          taskId: `MATRIX-VALID-${canonicalId}`
        });

        expect(result).toBeDefined();
        expect(result.agentId).toBe(agent.id);
        expect(result.taskId).toBe(`MATRIX-VALID-${canonicalId}`);
        expect(result.correlationId).toBeTruthy();
        expect(result.timestamp).toBeTruthy();
        expect(['SUCCESS', 'NEEDS_HUMAN_APPROVAL', 'PARTIAL']).toContain(result.status);
      });

      // Test C — Invalid input rejection
      it(`[Test C — Invalid Input] should safely reject or handle malformed input for ${canonicalId}`, async () => {
        const agent = registry.getAgent(canonicalId)!;
        const invalidInput: AgentExecutionInput = {
          taskId: `MATRIX-INVALID-${canonicalId}`,
          context: {},
          parameters: {
            lwlMeters: -100,
            beamMeters: 'invalid_beam',
            components: 'not_an_array'
          } as any
        };

        const result = await executionEngine.executeAgent(agent.id, invalidInput);
        expect(result).toBeDefined();
        // The engine must either return FAILED status or handle gracefully without throwing unhandled rejection
        expect(['FAILED', 'SUCCESS', 'NEEDS_HUMAN_APPROVAL', 'PARTIAL']).toContain(result.status);
        // Generic agent schemas may accept auxiliary fields; invalid physics must never create verified evidence.
        if (result.status !== 'FAILED') {
          expect(result.evidenceValid === true && result.deterministicToolEvidence.length === 0).toBe(false);
        }
        if (result.status === 'FAILED') {
          expect(result.evidenceValid).toBe(false);
          expect(result.executionMode).toBe('EXECUTION_FAILED');
        }
      });

      // Test D — Output validation
      it(`[Test D — Output Validation] should produce output conforming to declared schema for ${canonicalId}`, async () => {
        const agent = registry.getAgent(canonicalId)!;
        const result = await executionEngine.executeAgent(agent.id, {
          ...standardValidInput,
          taskId: `MATRIX-OUTPUT-${canonicalId}`
        });

        expect(result.data).toBeDefined();
        expect(typeof result.data).toBe('object');
        expect(Array.isArray(result.assumptions)).toBe(true);
        expect(Array.isArray(result.openTbdItems)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
      });

      // Test E — Dependency behavior
      it(`[Test E — Dependency Behavior] should satisfy upstream dependency integrity for ${canonicalId}`, () => {
        const agent = registry.getAgent(canonicalId)!;
        for (const depId of agent.dependencies) {
          const upstream = registry.getAgent(depId);
          expect(upstream).toBeDefined();
          // Upstream cannot depend directly on this agent (no immediate cyclic loop)
          expect(upstream!.dependencies).not.toContain(agent.id);
        }
      });

      // Test F — Model and tool availability
      it(`[Test F — Model & Tool Availability] should invoke registered tools or model provider for ${canonicalId}`, async () => {
        const agent = registry.getAgent(canonicalId)!;
        const result = await executionEngine.executeAgent(agent.id, {
          ...standardValidInput,
          taskId: `MATRIX-TOOLS-${canonicalId}`
        });

        const mandatoryTools = agent.verificationCriteria?.mandatoryDeterministicTools || [];
        expect(result.provider).toBeTruthy();
        expect(result.modelIdentifier).toBeTruthy();
        expect(['STATIC_RULES_EVALUATION', 'DETERMINISTIC_CALCULATION', 'LIVE_AI_GENERATION', 'SYNTHETIC_TEST_MOCK']).toContain(result.executionMode);
        if (mandatoryTools.length > 0) {
          // Must have executed the mandatory deterministic tools
          expect(result.deterministicToolEvidence.length).toBeGreaterThanOrEqual(1);
          for (const toolId of mandatoryTools) {
            const ev = result.deterministicToolEvidence.find(e => e.toolName === toolId);
            expect(ev).toBeDefined();
            expect(ev?.verified).toBe(true);
          }
        }
      });

      // Test G — Evidence integrity
      it(`[Test G — Evidence Integrity] should enforce that evidenceValid is true only with verified deterministic tools for ${canonicalId}`, async () => {
        const agent = registry.getAgent(canonicalId)!;
        const result = await executionEngine.executeAgent(agent.id, {
          ...standardValidInput,
          taskId: `MATRIX-INTEGRITY-${canonicalId}`
        });

        const mandatoryTools = agent.verificationCriteria?.mandatoryDeterministicTools || [];
        if (mandatoryTools.length > 0) {
          expect(result.evidenceValid).toBe(true);
          expect(result.executionMode).toBe('DETERMINISTIC_CALCULATION');
        } else {
          // Agents without deterministic tools MUST NOT report evidenceValid: true from text synthesis alone
          expect(result.evidenceValid).toBe(false);
          expect(['STATIC_RULES_EVALUATION', 'SYNTHETIC_TEST_MOCK', 'LIVE_AI_GENERATION']).toContain(result.executionMode);
        }
      });

      // Test H — Safety governance
      it(`[Test H — Safety Governance] should enforce human approval rules for safety-critical agent ${canonicalId}`, async () => {
        const agent = registry.getAgent(canonicalId)!;
        const result = await executionEngine.executeAgent(agent.id, {
          ...standardValidInput,
          taskId: `MATRIX-SAFETY-${canonicalId}`
        });

        const expectsApproval =
          agent.verificationCriteria?.independentReviewRequired ||
          agent.auditRequirement?.logLevel === 'SAFETY_CRITICAL' ||
          result.executionMode === 'SYNTHETIC_TEST_MOCK';

        expect(result.requiresDirectorApproval).toBe(Boolean(expectsApproval));
      });
    });
  }
});
