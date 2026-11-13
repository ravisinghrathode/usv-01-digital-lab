# ECR-20261113-011 — Iterative naval-design research runtime and numerical truthfulness

- **Change ID:** ECR-20261113-011
- **Originator:** ChatGPT — engineering software change proposal
- **Date:** 2026-11-13
- **Closure Status:** UNDER_REVIEW
- **Risk Assessment:** CRITICAL
- **Affected Requirements:** AGT-01, AGT-02, HYD-01, RES-01, STR-01, AUT-01, MAR-01, GOV-01, GOV-02, Design Concept Gate 0
- **Affected Subsystems:** SYS / NA / PROP / STR / VVT / GOV / digital-lab software

## Defect report and implemented proposal

The old optimizer had four unseeded random draws, falsely described a hard-coded rule table as specialist agent votes, presented unsupported regulatory and historical cost/stability claims, invented fixed Sobol sensitivity values, and asserted physical/agent challenges never performed. The real DAG agent engine was not connected to an iterative research→screen→critique design process. Domain source/tool capability and test-count documentation had drift.

Changes on this PR:

1. Implement seeded numerical sampling with recorded per-candidate source scenario, seed and draw index. No change claims physical model fidelity.
2. Replace fake 25-agent concurrence, imaginary proofs/sea-trial approval and hard-coded Sobol indices with transparent 12 unverified scenario checks, actual local finite-difference model sensitivity and an evidence-gap critique checklist. Controlled SharedMemory segregation from dependency PR #48 is preserved.
3. Connect A01 actual `ExecutionEngine` proposal and A15 independent critic executions, with bounded actual `ToolRegistry` hydrostatics/resistance screening and a revision loop. A model's `keyMetrics` remain quarantined as `modelSuggestedKeyMetrics`; results cannot promote design baselines.
4. Pass mission requirements, prior critique, context and notes to the model, clearly untrusted.
5. Add authenticated HTTPS CFD/FEA remote job/receipt interface requiring source, mesh and input digests and explicit convergence threshold provenance; it does not claim OpenFOAM/CalculiX were executed.
6. Add numeric reference benchmark harness using actual tool outputs, reference digests, human-review-required status.
7. Audit all 26 actual role/tool registrations and rubrics, publish source-derived CI artifacts, correct active documentation drift and mark historical report as archival.

## Verification plan

- TypeScript static typecheck; complete Vitest suite; production bundle; dependency security, secret and ECR validation.
- Reproducible same-seed multi-generation numerical behavior and different-seed divergence, no `Math.random()`.
- Genuine (injectable/test-double) A05/A15 agent path with exact source SHA, bounded revision budget, actual deterministic tool screens and strict refusal of synthetic/mocked provider as live acceptance.
- Independent negative tests: false self-approval, stale source, absent numerical sources, source/digest mismatch, absent mesh quality, nonexistent benchmark values, advisories without tools, and false "IMO compliant" output.
- Actual 26-role discovery artifacts and source-derived current dependency/test inventory.
- Stage C qualified independent engineering/software review, Stage D Ed25519 exact-digest Director authorization, Stage E governance and merge protection.


## Mandatory ECR disposition fields

- **Description:** Implement seeded legacy screening and a genuine bounded agent/tool design iteration, capability audits, numeric references and external solver interface without claiming physical verification.
- **Reason for Change:** Claude's external review and repository code inspection identified fabricated synthetic agent consensus, irreproducibility, unsupported design claims and a missing proposal/evaluation/revision loop.
- **Affected Subsystem:** Naval architecture, propulsion, structure, agent engine and safety governance.
- **Architectural Impact:** New bounded A01→ToolRegistry→A15 loop; source-anchored solver and benchmark interfaces; reproducible heuristic scenario sampling; no actuator integration.
- **Safety Impact:** CRITICAL; removes misleading numeric compliance assertions and retains non-certification states, with independent peer verification required.
- **Cybersecurity Impact:** Solver transport restricted to authenticated HTTPS and source-digested jobs. Live agent outputs remain local, not written to versioned baseline. Protect provider/service tokens.
- **Verification Plan:** Complete Vitest, TypeScript, production bundle, actual agent trace negative tests, source/digest/mesh-convergence benchmark checks, independent Stage C review and signed Stage D/E checks.
- **Review Evidence:** PR #49 and its latest exact-head GitHub CI results; human technical review pending.

## Limitations and formal acceptance

Live 26-agent design collaboration, externally verified reference numbers, approved mission constraints, controlled hull CAD/offsets, external solver service provisioning, CFD/FEA convergence validation, physical testing, supplier documentation and 13-workstream engineering acceptance remain **NOT PROVIDED**. The A01↔A15 loop is an initial **live runtime component**, not evidence that model outputs are numerically accurate. No sea-trial or actuator capability was added. The Project Lead's project direction does not substitute for a genuine signed high-risk engineering release.

- **Approval Record:** PENDING; no independent peer approval or Director Ed25519 signature is claimed.
- **Implementation Commit:** PENDING final exact PR source SHA and digest.
- **Disposition:** SOFTWARE PROPOSED / ENGINEERING RELEASE HOLD.
