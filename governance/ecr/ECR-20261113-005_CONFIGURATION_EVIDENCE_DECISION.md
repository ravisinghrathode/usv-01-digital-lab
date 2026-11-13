# Engineering Change Request (ECR)
## NAVAL-USV Digital Engineering Lab — Configuration & Evidence Decision Gates

- **Change ID:** ECR-20261113-005
- **Originator:** ChatGPT Systems Engineering / Verification, proposed author
- **Date:** 2026-11-13
- **Closure Status:** UNDER_REVIEW
- **Scope:** Internal non-actuating engineering evidence and decision-support software

### 1. Change Summary

- **Description:** Introduce separate traceable vessel configuration identities, formal acceptance-criterion and evidence-source intake, explicit missing/cross-configuration holds, dual-AI disagreement detection, duplicate-reviewer guards, and first-principles electrical energy/current screening with no certification claim.
- **Reason for Change:** Existing records contain a distinct proposed 2.5m / 120kg small craft and an asserted 11.2m / 6.2t tactical craft; cross-use of their loads, GZ values, CAD offsets or numerical conclusions could dangerously invalidate engineering decisions.
- **Affected Subsystem:** SYS / NA / HYD / STR / ELEC / PROP / AUT / VVT / GOV.

### 2. Engineering Impact Analysis

- **Affected Requirements:** Gate 0 configuration authority; AGT-01/02, HYD-01, RES-01, STR-01, AUT-01, MAR-01, INT-01/02/03, SEC-01/02, GOV-01/02, DEP-01.
- **Architectural Impact:** New EvidenceDecisionGate parser and report, machine-readable default HOLD manifest, Gate 0 CLI and integration with 13-workstream AcceptanceCampaign. Adds CI artifact and adversarial tests; no source CAD changes, no live actuators, no approved parameter modifications, no independent service credentials.
- **Safety Impact:** CRITICAL. Prevents unsupported approval from untrusted source metadata and conflicting vessel variants; preserves external engineering signoff. A claimed reviewer name, evidence hash, URL or 'approved' string is insufficient to authenticate physical performance.
- **Cybersecurity Impact:** Strict Zod parsing, HTTPS-only references without URL credentials, current source SHA and matched hull/mass digests. Private engineering evidence remains in controlled Google Drive and is not committed to the public repository.

### 3. Verification & Evidence Plan

- **Verification Plan:** Run full TypeScript lint, tests and build, 800 independent numerical oracle vectors, strict evidence parser tests, duplicate and cross-variant evidence/criterion tests, mismatched geometry/mass SHA, stale source commit, AI disagreement and reviewer spoofing tests, and intended fail-closed release status on CI.
- **Evidence Source:** PR #45 exact head, GitHub Actions, controlled Drive source index (https://drive.google.com/file/d/1DrvQeFMUuXG3f9hJSHsuzitiOmd-0iVX/view).
- **Acceptance Boundary:** 576 automated tests passed on prior PR head; exact final head must be rechecked. Tests do NOT validate true vessel geometry, hydrostatics, propulsion, structure, field autonomy, or regulatory compliance.
- **Risk Assessment:** CRITICAL — requires Stage C independent technical review, Stage D Engineering Director Ed25519 signature over exact head/digest and Stage E pass before merge.
- **Review Evidence:** Pending; qualified engineering reviewer not replaced by authoring AI or deterministic checks.

### 4. Human Authority Approval & Closure Record

- **Approval Record:** PENDING; no signature or qualified human engineering review has been obtained in this change.
- **Approval Decision:** PENDING.
- **Authority Name:** Pending designated Engineering Director.
- **Authority Role:** ENGINEERING_DIRECTOR.
- **Authority ID:** PENDING.
- **Signed At:** PENDING.
- **Cryptographic Signature / Hash:** PENDING.
- **Implementation Commit:** Exact PR #45 head to be signed only after all code and verification changes are frozen.
- **Closure Status:** UNDER_REVIEW — Gate 0 intake implemented, physical engineering authority and final release not certified.

No real-vessel actuation or source data fabrication is introduced.
