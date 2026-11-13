# ECR-20261113-010 — Research-first concept design and synthetic baseline segregation

- **Change ID:** ECR-20261113-010
- **Originator:** ChatGPT engineering assistant (proposed)
- **Date:** 2026-11-13
- **Description:** Stop heuristic optimizer values from automatically overwriting the controlled vessel baseline or presenting synthetic 25-agent votes as certification. Add 26-agent research-case preparation, optional real provider execution and conservative candidate source/provenance and approval checks.
- **Reason for Change:** Historical Rev 0.4 and a small-craft concept conflict; no approved current CAD, mass/CG and design-source evidence establishes the correct particulars. Project Lead has specified research -> alternatives -> concept approval -> detailed design, rather than choosing unsourced dimensions in advance.
- **Affected Subsystem:** SYS / NA / HYD / PROP / STR / SWA / GOV / VVT / UI
- **Affected Requirements:** AGT-01, AGT-02, HYD-01, RES-01, STR-01, AUT-01, MAR-01, GOV-01, GOV-02 and current 13-workstream acceptance programme.
- **Architectural Impact:** `ConceptDiscoveryGate` and research CLI remain independent of protected release authority. Existing synthetic optimizer cannot mutate `SharedMemory`; scenario dossier explicitly states it is not certified.
- **Safety Impact:** CRITICAL — blocks accidental baseline contamination and false numerical/agent sign-off. No actuator functions enabled. Numerical heuristics remain unsuitable for design approval.
- **Cybersecurity Impact:** Mission inputs and live research output default to gitignored local artifacts. Source URLs and JSON claims remain untrusted; no automated credential/access escalation.
- **Verification Plan:** Exact-head TypeScript check, new Vitest cases (26 roles, live-vs-mock, candidate identity and cross-variant collisions, unsourced numbers, stale SHA and fake project approval), existing baseline and governance tests, complete production build, Stage C qualified independent review, Stage D cryptographic Director signature, Stage E enforcement.
- **Risk Assessment:** CRITICAL.
- **Review Evidence:** New PR and exact-head CI to be inspected. No live Gemini campaign or vessel evidence is claimed by this change.
- **Approval Record:** PENDING — Project Lead expressed intent to approve project decisions, not a signed safety-critical engineering change.
- **Implementation Commit:** PENDING exact final PR SHA and baseline digest.
- **Closure Status:** UNDER_REVIEW; all 13 engineering acceptance workstreams remain open until true evidence exists.
