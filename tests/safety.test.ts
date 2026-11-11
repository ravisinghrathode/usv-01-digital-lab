import { describe, it, expect } from 'vitest';
import { ApprovalGateManager } from '../src/core/safety/HumanApprovalGate.ts';
import { SharedMemory } from '../src/core/memory/SharedMemory.ts';
import { AuditLogger } from '../src/core/safety/AuditLogger.ts';
import { MockDeterministicProvider } from '../src/core/models/ModelProvider.ts';
import { generateApproverSignature } from '../src/core/safety/ApproverSigner.ts';

describe('STAGE F: Human Authority Gates & Safety Governance', () => {
  const gateManager = ApprovalGateManager.getInstance();
  const sharedMemory = SharedMemory.getInstance();
  const auditLogger = AuditLogger.getInstance();

  it('should create an approval gate in PENDING state', () => {
    const gate = gateManager.createGate({
      taskId: 'TASK-STAB-DEMO',
      agentId: 'STAB-HYD-06',
      title: 'Transverse Stability Baseline Sign-off',
      description: 'Review calculated GMt = 0.58m against ISO 12217-5 criteria',
      safetyImplication: 'Insufficient GMt risks capsize in beam sea conditions.',
      proposedChanges: { gmtMeters: 0.58, status: 'STABLE_COMPLIANT' }
    });

    expect(gate.id).toBeDefined();
    expect(gate.state).toBe('PENDING');
  });

  it('should block approval attempt if role is NOT ENGINEERING_DIRECTOR or identity is invalid', () => {
    const gate = gateManager.createGate({
      taskId: 'TASK-ELEC-DEMO',
      agentId: 'ELEC-PWR-14',
      title: 'High Voltage DC Bus Approval',
      description: '400V DC bus integration sign-off',
      safetyImplication: 'High voltage marine marine safety risk',
      proposedChanges: { busVoltageV: 400 }
    });

    // String identity must be rejected
    expect(() => {
      gateManager.evaluateDecision(gate.id, 'APPROVED', 'Approved by agent', 'JUNIOR_AGENT' as any);
    }).toThrow("Security Violation: Approver must provide verified ApproverIdentity object");

    // Invalid role must be rejected
    expect(() => {
      gateManager.evaluateDecision(gate.id, 'APPROVED', 'Approved by agent', {
        userId: 'usr-agent-01',
        userName: 'Junior Agent',
        role: 'JUNIOR_AGENT',
        authenticatedAt: new Date().toISOString()
      });
    }).toThrow("Security Violation: Only 'ENGINEERING_DIRECTOR' has authority");
  });

  it('should allow approval when authenticated as ENGINEERING_DIRECTOR with valid cryptographic signature', () => {
    const gate = gateManager.createGate({
      taskId: 'TASK-VALID-APPROVAL',
      agentId: 'LEAD-SYS-01',
      title: 'Baseline Milestone Review',
      description: 'Approval of preliminary sizing baseline',
      safetyImplication: 'Sets initial vessel displacement parameters',
      proposedChanges: { baselineRev: 1 }
    });

    const timestamp = new Date().toISOString();
    const signature = generateApproverSignature(
      gate.id,
      'APPROVED',
      'usr-dir-001',
      'ENGINEERING_DIRECTOR',
      timestamp
    );

    const approvedGate = gateManager.evaluateDecision(
      gate.id,
      'APPROVED',
      'Verified with independent red team review. Calculations compliant.',
      {
        userId: 'usr-dir-001',
        userName: 'Engineering Director (Authenticated)',
        role: 'ENGINEERING_DIRECTOR',
        tokenSignature: signature,
        authenticatedAt: timestamp
      }
    );

    expect(approvedGate.state).toBe('APPROVED');
    expect(approvedGate.decidedBy).toContain('Engineering Director (Authenticated)');
    expect(approvedGate.directorNotes).toContain('Verified with independent red team review');
  });

  it('should maintain immutable parameter revisions and record audit trail', () => {
    const param = sharedMemory.getParameter('USV-NA-001')!;
    expect(param).toBeDefined();
    const initialRev = param.revision;

    const updated = sharedMemory.updateParameter(
      'USV-NA-001',
      { value: 10.5, status: 'ESTIMATE' },
      'HULL-GEO-05'
    );

    expect(updated.revision).toBe(initialRev + 1);
    expect(updated.value).toBe(10.5);
    expect(updated.lastModifiedByAgent).toBe('HULL-GEO-05');

    const logs = auditLogger.getLogs({ action: 'PARAMETER_UPDATED' });
    expect(logs.length).toBeGreaterThanOrEqual(1);
  });

  it('should generate Obsidian markdown vault exports with wikilinks', () => {
    const vaultFiles = sharedMemory.exportObsidianVault();
    expect(vaultFiles['USV-01_Digital_Lab_Index.md']).toBeDefined();
    expect(vaultFiles['USV-01_Digital_Lab_Index.md']).toContain('[[Engineering Director]]');
    expect(vaultFiles['USV-01_Digital_Lab_Index.md']).toContain('[[USV-NA-001]]');
  });

  it('should enforce that MockDeterministicProvider reports 0.0 convergence confidence and unverified baseline', async () => {
    const mock = new MockDeterministicProvider();
    const res = await mock.generateText({
      systemInstructions: 'Hydrostatics & Intact Stability',
      userPrompt: 'Compute GMt',
      context: {}
    });
    expect(res.isMock).toBe(true);
    expect(res.evidenceValid).toBe(false);
    expect(res.parsedJson?.keyMetrics.convergenceConfidence).toBe(0.0);
    expect(res.parsedJson?.keyMetrics.baselineIntegrityVerified).toBe(false);
    expect(res.parsedJson?.keyMetrics.analysisMode).toBe('SYNTHETIC_MOCK_FALLBACK');
  });

  it('should enforce verified ApproverIdentity object authentication and reject unverified users or invalid signatures', () => {
    const gate = gateManager.createGate({
      taskId: 'TASK-IDENTITY-CHECK',
      agentId: 'LEAD-SYS-01',
      title: 'Gate With Identity Verification',
      description: 'Signoff requiring full ApproverIdentity',
      safetyImplication: 'High risk baseline change',
      proposedChanges: {}
    });

    // Unverified user identity should be rejected
    expect(() => {
      gateManager.evaluateDecision(gate.id, 'APPROVED', 'Notes', {
        userId: 'usr-unverified',
        userName: 'Anonymous User',
        role: 'ENGINEERING_DIRECTOR',
        authenticatedAt: new Date().toISOString()
      });
    }).toThrow("Security Violation: Only 'ENGINEERING_DIRECTOR' has authority");

    // Invalid or forged signature must be rejected
    expect(() => {
      gateManager.evaluateDecision(gate.id, 'APPROVED', 'Notes', {
        userId: 'usr-eng-dir-8841',
        userName: 'Chief Naval Architect',
        role: 'ENGINEERING_DIRECTOR',
        tokenSignature: 'FORGED_HEX_SIGNATURE_0123456789abcdef',
        authenticatedAt: new Date().toISOString()
      });
    }).toThrow("Security Violation: Cryptographic signature verification failed");

    // Valid cryptographic signature should succeed
    const validTimestamp = new Date().toISOString();
    const validSignature = generateApproverSignature(
      gate.id,
      'APPROVED',
      'usr-eng-dir-8841',
      'ENGINEERING_DIRECTOR',
      validTimestamp
    );

    const approved = gateManager.evaluateDecision(gate.id, 'APPROVED', 'Verified by director', {
      userId: 'usr-eng-dir-8841',
      userName: 'Chief Naval Architect',
      role: 'ENGINEERING_DIRECTOR',
      tokenSignature: validSignature,
      authenticatedAt: validTimestamp
    });

    expect(approved.state).toBe('APPROVED');
    expect(approved.decidedByIdentity?.userId).toBe('usr-eng-dir-8841');
    expect(approved.decidedByIdentity?.tokenSignature).toBe(validSignature);
  });
});

