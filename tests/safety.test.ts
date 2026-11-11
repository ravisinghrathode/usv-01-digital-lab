import { describe, it, expect } from 'vitest';
import { ApprovalGateManager } from '../src/core/safety/HumanApprovalGate.ts';
import { SharedMemory } from '../src/core/memory/SharedMemory.ts';
import { AuditLogger } from '../src/core/safety/AuditLogger.ts';

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

  it('should block approval attempt if role is NOT ENGINEERING_DIRECTOR', () => {
    const gate = gateManager.createGate({
      taskId: 'TASK-ELEC-DEMO',
      agentId: 'ELEC-PWR-14',
      title: 'High Voltage DC Bus Approval',
      description: '400V DC bus integration sign-off',
      safetyImplication: 'High voltage marine safety risk',
      proposedChanges: { busVoltageV: 400 }
    });

    expect(() => {
      gateManager.evaluateDecision(gate.id, 'APPROVED', 'Approved by agent', 'JUNIOR_AGENT');
    }).toThrow('Security Violation: Only \'ENGINEERING_DIRECTOR\' has authority');
  });

  it('should allow approval when authenticated as ENGINEERING_DIRECTOR', () => {
    const gate = gateManager.createGate({
      taskId: 'TASK-VALID-APPROVAL',
      agentId: 'LEAD-SYS-01',
      title: 'Baseline Milestone Review',
      description: 'Approval of preliminary sizing baseline',
      safetyImplication: 'Sets initial vessel displacement parameters',
      proposedChanges: { baselineRev: 1 }
    });

    const approvedGate = gateManager.evaluateDecision(
      gate.id,
      'APPROVED',
      'Verified with independent red team review. Calculations compliant.',
      'ENGINEERING_DIRECTOR'
    );

    expect(approvedGate.state).toBe('APPROVED');
    expect(approvedGate.decidedBy).toBe('ENGINEERING_DIRECTOR');
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
});
