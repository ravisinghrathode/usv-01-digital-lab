# Engineering Change Request (ECR)
## NAVAL-USV Digital Engineering Lab Configuration Control

- **Change ID:** ECR-20261113-005
- **Originator:** ChatGPT — USV-01 AUT-01 independent software assurance
- **Date:** 2026-11-13
- **Closure Status:** UNDER_REVIEW

### 1. Change Summary
- **Description:** Post-merge safety governance hold for AUT-01 autonomy/COLREG collision-screening changes; require real Director signature and physical validation before engineering release.
- **Reason for Change:** PR #41 was merged while its final GitHub Actions safety/governance check had failed and without GitHub PR review submissions. The accepted main repository must not be confused with a signed seagoing engineering baseline.
- **Affected Subsystem:** SWA / NAV / SYS / GOV

### 2. Engineering Impact Analysis
- **Affected Requirements:** AUT-REQ-001, AUT-REQ-002, AUT-REQ-003, AUT-REQ-004, AUT-REQ-005, AUT-REQ-006, AUT-REQ-007, AUT-REQ-008, AUT-REQ-009, AUT-REQ-010, AUT-REQ-011; REQ-SAF-003 proposed.
- **Architectural Impact:** The existing screen, sensor evidence adapter and open-loop SIL advisory replay remain non-actuating. The critical-risk classifier and tests are on main, but repository merges require independently verified branch protection.
- **Safety Impact:** Merge of an unreviewed safety change creates an unresolved process nonconformance. The code must NOT be enabled for helm/thrust actuation or declared COLREG compliant. Full closed-loop dynamics, actual hardware interlocks, controlled sea trials and qualified navigator approval remain essential.
- **Cybersecurity Impact:** No operational credentials added. Remote command authorization, replay rejection and safety MCU watchdog have not been physically verified. Unapproved human-signature bypass is prohibited.

### 3. Verification & Evidence Plan
- **Verification Plan:** Lock the exact accepted source SHA; verify independent COLREG review, dynamic simulator, actual sensor/actuator HIL, authorized supervised sea trials, safe-state behavior and signed operator/master response. Validate Stage A CRITICAL classification, Stage B deterministic CI, Stage C review, Director Stage D signature and Stage E release gate on that same source digest.
- **Risk Assessment:** CRITICAL
- **Review Evidence:** GitHub issue #43; PR #41 (merged), final failed CI https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/43338241362/job/131599786026; tests/autonomy*.test.ts; evidence/aut01/acceptance-status.json; docs/AUT01_SIL_HIL_SEA_TRIAL_PROTOCOL.md. No physical acceptance or signed Director approval has been provided.

### 4. Human Authority Approval & Closure Record
- **Approval Record:** Not yet issued.
- **Approval Decision:** PENDING
- **Authority Name:** Pending designated Engineering Director
- **Authority Role:** ENGINEERING_DIRECTOR
- **Authority ID:** PENDING
- **Signed At:** PENDING
- **Cryptographic Signature / Hash:** PENDING
- **Implementation Commit:** PR #41 head efcc9b20007cefa35909988698a181795aceaca8; subsequent main merges require a new exact final digest at sign-off
- **Notes:** This ECR is a preparation document, NOT authority. Stage E must fail closed until the Director signs an actual Ed25519 approval on the final baseline, qualified maritime/controls review is received, and safety-case evidence meets the approved ODD. No AI signature or fabricated review is acceptable.
