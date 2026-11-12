import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Firestore Security Rules & RBAC Specification Audit', () => {
  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  it('should exist and define cloud.firestore service with rules_version 2', () => {
    expect(fs.existsSync(rulesPath)).toBe(true);
    expect(rulesContent).toContain("rules_version = '2';");
    expect(rulesContent).toContain('service cloud.firestore');
  });

  it('should enforce isAuthenticated helper with null checks for request.auth and uid', () => {
    expect(rulesContent).toContain('function isAuthenticated()');
    expect(rulesContent).toContain('request.auth != null && request.auth.uid != null');
  });

  it('should enforce isDirector helper checking ENGINEERING_DIRECTOR or admin role', () => {
    expect(rulesContent).toContain('function isDirector()');
    expect(rulesContent).toContain("request.auth.token.role == 'ENGINEERING_DIRECTOR'");
  });

  it('should restrict approval_gates update to ENGINEERING_DIRECTOR only and forbid deletion', () => {
    const approvalGateBlock = rulesContent.substring(
      rulesContent.indexOf('match /approval_gates/{gateId}'),
      rulesContent.indexOf('match /activity_log/{logId}')
    );
    expect(approvalGateBlock).toContain('allow update: if isDirector();');
    expect(approvalGateBlock).toContain('allow delete: if false;');
  });

  it('should enforce immutable activity_log with delete: if false and update: if false', () => {
    const activityLogBlock = rulesContent.substring(
      rulesContent.indexOf('match /activity_log/{logId}'),
      rulesContent.indexOf('match /users/{userId}')
    );
    expect(activityLogBlock).toContain('request.resource.data.userId == request.auth.uid');
    expect(activityLogBlock).toContain('allow update, delete: if false;');
  });

  it('should restrict project deletion to ENGINEERING_DIRECTOR only', () => {
    const projectBlock = rulesContent.substring(
      rulesContent.indexOf('match /projects/{projectId}'),
      rulesContent.indexOf('match /subsystems/{subsystemId}')
    );
    expect(projectBlock).toContain('allow delete: if isDirector();');
    expect(projectBlock).toContain('allow read: if isProjectMember(projectId);');
    expect(rulesContent).not.toContain("request.auth.token.role == 'engineer'");
    expect(rulesContent).toContain('exists(memberPath(projectId))');
  });

  it('should enforce project membership check on requirements, design decisions, and simulation jobs', () => {
    expect(rulesContent).toContain('match /requirements/{reqId}');
    expect(rulesContent).toContain('isProjectMember(resource.data.projectId)');
    expect(rulesContent).toContain('match /design_decisions/{decisionId}');
    expect(rulesContent).toContain('match /simulation_jobs/{jobId}');
  });
});
