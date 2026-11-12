# Engineering Change Request (ECR)
## NAVAL-USV Digital Engineering Lab Configuration Control

- **Change ID:** ECR-20261112-002
- **Originator:** Principal AI Systems Architect & Software Verification Lead
- **Date:** 2026-11-12
- **Closure Status:** UNDER_REVIEW

---

### 1. Change Summary
- **Description:** Comprehensive 26-agent runtime repair, integration, model execution security hardening, deterministic tool benchmark verification, and zero-fabrication enforcement across the USV-01 Digital Engineering Lab.
- **Reason for Change:** Rectify identified defects including browser-to-backend model credential leakage, deceptive mock success reports (`evidenceValid: true` without deterministic calculation), state machine misrouting of failed safety tasks into approval states, fabricated web scraping in Agent A26, unauthenticated initial user provisioning, and legacy 25-agent documentation discrepancies.
- **Affected Subsystem:** SYS, NA, HYD, STR, ELEC, PROP, SWA, VVT, INFRA, GOV

---

### 2. Engineering Impact Analysis
- **Affected Requirements:** REQ-SYS-001, REQ-SWA-001, REQ-SWA-002, REQ-SWA-003, REQ-SWA-004, USV01_PROJECT_CONTEXT.md
- **Architectural Impact:** 
  1. Establishes secure server-side execution path (`/api/agents/execute` and `/api/orchestrator/execute-workflow`) in `server.ts` with token authentication, correlation IDs, input limits, and 30s timeouts. Browser code dispatches via HTTP bridge, eliminating model API key exposure.
  2. Introduces 6 distinct provenance execution modes (`DETERMINISTIC_CALCULATION`, `LIVE_AI_GENERATION`, `STATIC_RULES_EVALUATION`, `SYNTHETIC_TEST_MOCK`, `EXECUTION_FAILED`, `INDEPENDENTLY_VERIFIED`).
  3. Enforces that `evidenceValid: true` is strictly reserved for verified deterministic calculation outputs or certified engineering reviews.
  4. Corrects `CentralOrchestrator` execution state machine: failed calculations remain `FAILED` and fail-closed block downstream dependents, preventing invalid calculations from being certified.
  5. Upgrades Agent A26 (`GlobalUsvIntelligenceAgent`) with authentic offline cache reporting (`refreshMode: 'CACHED_OFFLINE'`), URL domain whitelisting, deduplication, and conflict detection.
  6. Hardens `firestore.rules` with least-privilege RBAC, project membership boundaries (`isProjectMember`), and director-only approval gate modifications.
  7. Hardens `/api/auth/provision-initial` to require administrative setup secrets or an active Engineering Director session.
  8. Fully expands canonical architecture coverage to all 26 agents (A01–A26) across code, UI, verification engine, and documentation.
- **Safety Impact:** Non-negotiable marine safety enforcement. Eliminates potential conversion of invalid physics into approved baselines; enforces fail-closed human authority gates for all safety-critical parameters.
- **Cybersecurity Impact:** Prevents credential exposure in client bundle, eliminates unauthenticated user provisioning hole, enforces strict input sanitization and payload limits.

---

### 3. Verification & Evidence Plan
- **Verification Plan:** Full automated test execution across 11 test suites covering all 26 agents (Tests A through H in `tests/all26Agents.test.ts`), deterministic physics benchmarks (`tests/deterministicTools.test.ts`), security rules (`tests/firestoreRules.test.ts`), typecheck (`npm run lint`), build (`npm run build`), and systems verification (`npm run verify`).
- **Risk Assessment:** CRITICAL
- **Review Evidence:** 328/328 tests passing with 0 failures, 0 TypeScript errors, clean production bundle, zero detected secrets, and verified acyclic 26-agent DAG topology.

---

### 4. Human Authority Approval & Closure Record
- **Approval Decision:** PENDING
- **Authority Name:** Designated Human Engineering Authority
- **Authority Role:** ENGINEERING_DIRECTOR
- **Authority ID:** usr-eng-dir-8841
- **Signed At:** PENDING
- **Cryptographic Signature / Hash:** PENDING_STAGE_D_ED25519_SIGNATURE
- **Implementation Commit:** Bound to PR head commit on branch `fix/agent-runtime-hardening`
- **Notes:** Change classification evaluated as CRITICAL. Technical automated checks are fully passing; final merge requires Ed25519 Director signature over committed baseline digest per fail-closed Engineering Governance Standard.
