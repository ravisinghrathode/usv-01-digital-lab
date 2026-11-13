# ECR-20261113-014 — Solver host hardening and real CFD execution commissioning

- **Change ID:** ECR-20261113-014
- **Originator:** Engineering software assistant, proposed for independent human review
- **Date:** 2026-11-13
- **Description:** Address post-PR-51 review findings by making solver resource ceilings host-configurable and range-validated, expanding C3D8 Jacobian checks beyond the element centre, testing network namespace isolation on the execution host, commissioning a real OpenFOAM v2606 benchmark through the restricted worker, and preserving completed-but-quality-rejected solver evidence as an explicit fail-closed state.
- **Reason for Change:** External review identified four concrete implementation risks: hard-coded CFD resource limits, thin C3D8 mesh-quality sampling, unproven OpenFOAM execution, and uncertainty whether namespace isolation works for the actual service account.
- **Affected Subsystem:** Remote CFD/FEA worker, solver service, solver receipt model, CI commissioning, structural mesh screening.
- **Affected Requirements:** RES-01, STR-01, AGT-01, AGT-02, VVP-001, GOV-01, GOV-02.
- **Architectural Impact:** Resource limits move from constants to validated host policy. C3D8 scaled Jacobian is sampled at centre, eight Gauss points and eight corners. Network isolation uses one explicitly selected backend with no silent fallback. Solver completion that fails numerical quality is retained as `COMPUTE_DONE_QUALITY_REJECTED`, remains `REJECTED` in the TypeScript client and is never exposed by `getAgentUsableSolverEvidence`.
- **Safety Impact:** CRITICAL. The change increases diagnostic visibility without relaxing acceptance: a quality-rejected CFD/FEA run remains unavailable to design agents and cannot authorize engineering release. Grid/mesh convergence and independent validation remain mandatory.
- **Cybersecurity Impact:** Resource settings are range checked. Solver commands remain fixed. OpenFOAM uses only an absolute versioned operator-controlled wrapper. Ambient host environment is not inherited wholesale. Network namespace behavior is preflight-tested and recorded.
- **Verification Plan:** Full TypeScript/Vitest suite; Python worker tests; negative C3D8 corner-inversion case; configurable-resource range tests; explicit non-root and privileged namespace preflights; real CalculiX known case; real OpenFOAM v2606 Driver-Seegmiller backward-facing-step execution; retained quality-rejection evidence; Stage C independent review; exact-digest Stage D Director authorization; Stage E enforcement.
- **Risk Assessment:** CRITICAL
- **Approval Record:** PENDING. No AI output or Project Lead chat approval substitutes for independent technical review and exact-revision Director authorization.
- **Closure Status:** UNDER_REVIEW

## Commissioning interpretation

A real solver process exiting zero proves only the executable/case/evidence path. If the declared numerical plan is not met, the worker returns `COMPUTE_DONE_QUALITY_REJECTED` with immutable evidence. This state is intentionally distinguishable from infrastructure failure and from `COMPUTE_DONE_EVIDENCE_PENDING`, but both remain unapproved for vessel design release.

## Deliberate residuals

- The Driver-Seegmiller case is a CFD execution benchmark, not a hull/free-surface resistance validation.
- Its computed reattachment length is not yet extracted by the checker, so no experimental correlation is claimed.
- No three-grid/GCI campaign has yet been completed.
- General agent-driven hull CFD still needs a pre-approved deterministic case-template/generator path; arbitrary agent-generated OpenFOAM archives remain prohibited.
- Live Gemini design execution remains externally blocked until an authorized credential-backed provider run is actually available.
