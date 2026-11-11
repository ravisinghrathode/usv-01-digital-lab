# NAVAL-USV | USV-01 Digital Engineering Lab
## Engineering Change Control Procedure (ECCP-001)

**Programme:** NAVAL-USV  
**Procedure Reference:** ECCP-001  
**Authority:** Configuration Manager & Systems Engineering Lead  
**Status:** APPROVED & ENFORCED  

---

### 1. Purpose

This Procedure establishes the mandatory workflow for proposing, reviewing, approving, implementing, and verifying engineering changes across the USV-01 Digital Engineering Lab.

---

### 2. ECR / ECO Lifecycle States

```
 [ DRAFT ]
     │
     ▼
 [ SUBMITTED ] ──► (Stage A & B Automated Verification)
     │
     ▼
 [ UNDER_REVIEW ] ──► (Stage C Independent Multi-Role AI Review)
     │
     ▼
 [ APPROVED ] ──► (Stage D Human Engineering Director Sign-off)
     │
     ▼
 [ IMPLEMENTED ] ──► (Feature branch merged to main via PR)
     │
     ▼
 [ CLOSED ] ──► (Release manifest generated & verified)
```

---

### 3. The 16 Mandatory ECR Fields

Every Engineering Change Request filed in `governance/ecr/ECR-YYYYMMDD-XXXX.md` must contain:

1. **Change ID:** Unique standardized identifier (`ECR-YYYYMMDD-NNN`).
2. **Originator:** Name, role, or agent ID initiating the change.
3. **Date:** ISO-8601 creation date.
4. **Description:** Clear, unambiguous technical summary.
5. **Reason for Change:** Defect correction, baseline progression, or capability addition.
6. **Affected Subsystem:** Subsystem designator (`SYS`, `NA`, `HYD`, `STR`, `ELEC`, `PROP`, `SWA`, `VVT`, `INFRA`, `GOV`).
7. **Affected Requirements:** Stable requirement IDs (e.g., `REQ-SYS-001`). Never invent missing requirement statements.
8. **Architectural Impact:** Interface or modular alterations.
9. **Safety Impact:** Marine safety, intact stability, electrical distribution, or actuator air-gap considerations.
10. **Cybersecurity Impact:** Cryptographic authentication, timing safety, token scopes, secret scanning.
11. **Verification Plan:** Concrete test procedures, calculation benchmarks, and acceptance criteria.
12. **Risk Assessment:** Categorized as `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
13. **Review Evidence:** Links to Stage B & C test runs and independent review reports.
14. **Approval Record:** Human authority name, role (`ENGINEERING_DIRECTOR`), signature timestamp, and approval decision (`APPROVED` or `REJECTED`).
15. **Implementation Commit:** Git commit SHA incorporating the change.
16. **Closure Status:** Current lifecycle state.

---

### 4. Enforcement & Automated Validation

The CLI tool `scripts/governance/ecr-tool.ts` is invoked automatically in CI on pull requests:
```bash
npm run governance:ecr
```
If an ECR is missing any mandatory field or has not been authorized by the Engineering Director, the CI gate blocks merge to `main`.
