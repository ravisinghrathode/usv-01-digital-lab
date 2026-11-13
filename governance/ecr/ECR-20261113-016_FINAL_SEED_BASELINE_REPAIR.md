# Engineering Change Request — USV-01

- **Change ID:** ECR-20261113-016
- **Originator:** ChatGPT — Project Closeout / Engineering Governance
- **Date:** 2026-11-13
- **Closure Status:** UNDER_REVIEW

## 1. Change Summary

- **Description:** Repair the USV-01 starter structural baseline so unresolved load values remain exact TBD states, restore one explicitly planned/unexecuted illustrative MEC simulation record, and restore strict regression guards that prevent synthetic starter data from being interpreted as verified FEA or an approved vessel baseline.
- **Reason for Change:** Post-merge validation found that safety-critical PRs had landed with two remaining baseline-integrity test regressions. A subsequent test-only change loosened the assertions rather than correcting the source fixture. This ECR restores fail-closed source semantics and the stronger guards.
- **Affected Subsystem:** STR / SYS / VVT / GOV

## 2. Engineering Impact Analysis

- **Affected Requirements:** Structural verification / configuration-control requirements remain unresolved; exact authoritative requirement wording is not inferred here.
- **Architectural Impact:** No solver, actuator, control-loop or production deployment architecture change. Starter data and regression guards only.
- **Safety Impact:** HIGH. The change prevents draft/synthetic load and FEA records from being mistaken for approved structural evidence. It does not establish hull adequacy, lifting-point capacity, scantlings, material allowables, design pressures or seagoing release.
- **Cybersecurity Impact:** No credential, authentication, network-service or secret-handling change.

## 3. Verification & Evidence Plan

- **Verification Plan:** Exact-head repository lint, deterministic Vitest suite, dependency/security audit, production build, structural baseline guards, seed-baseline integrity guards, governance classification, Stage C/D/E, and independent GitHub review on the exact PR head.
- **Risk Assessment:** HIGH
- **Review Evidence:** PR #62. Exact tree content already demonstrated 78/78 test files and 758/758 tests passing with Stage B green; final exact-head CI must be re-run after this ECR file is added. Physical structural evidence remains absent and is not substituted by these software tests.

## 4. Human Authority Approval & Closure Record

- **Approval Decision:** PENDING
- **Authority Name:** Pending designated Engineering Director
- **Authority Role:** ENGINEERING_DIRECTOR
- **Authority ID:** PENDING
- **Signed At:** PENDING
- **Cryptographic Signature / Hash:** PENDING
- **Implementation Commit:** PENDING — PR #62
- **Notes:** Project Lead signature authorizes this exact software/configuration baseline only. Independent peer review remains separately mandatory for this HIGH-risk change. This ECR does not certify the vessel, approve physical structure, or close missing CAD/weight/load/FEA evidence.
