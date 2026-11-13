# ECR-20261113-014 — Solver host hardening and real CFD execution commissioning

- **Change ID:** ECR-20261113-014
- **Originator:** Engineering software assistant, proposed for independent human review
- **Date:** 2026-11-13
- **Description:** Address post-PR-51 review findings by making solver resource ceilings host-configurable and range-validated, expanding C3D8 Jacobian checks beyond the element centre, testing network namespace isolation on the execution host, commissioning real OpenFOAM v2606 benchmark execution, retaining quality/timeout rejection evidence, adding bounded operator-approved deterministic solver-template generation, and adding three-grid Richardson/GCI uncertainty screening bound to retained solver receipts.
- **Reason for Change:** External review identified four concrete implementation risks: hard-coded CFD resource limits, thin C3D8 mesh-quality sampling, unproven OpenFOAM execution, and uncertainty whether namespace isolation works for the actual service account.
- **Affected Subsystem:** Remote CFD/FEA worker, solver service, solver receipt model, CI commissioning, structural mesh screening.
- **Affected Requirements:** RES-01, STR-01, AGT-01, AGT-02, VVP-001, GOV-01, GOV-02.
- **Architectural Impact:** Resource limits move from constants to validated host policy. C3D8 scaled Jacobian is sampled at centre, eight Gauss points and eight corners. Network isolation uses one explicitly selected backend with no silent fallback. Numerical-quality rejection and wall-time rejection retain immutable diagnostic evidence and remain unusable by design agents. Operator-approved template jobs accept only exact template digests and bounded numeric parameters, may use only fixed `blockMesh` preprocessing for OpenFOAM, and auto-stage deterministic hashed cases. Three independently quality-screened solver receipts can feed a three-grid GCI screen; that uncertainty evidence remains uncertified.
- **Safety Impact:** CRITICAL. The change increases diagnostic visibility without relaxing acceptance: a quality-rejected CFD/FEA run remains unavailable to design agents and cannot authorize engineering release. Grid/mesh convergence and independent validation remain mandatory.
- **Cybersecurity Impact:** Resource settings are range checked. Solver commands remain fixed. OpenFOAM uses only an absolute versioned operator-controlled wrapper. Ambient host environment is not inherited wholesale. Network namespace behavior is preflight-tested and recorded.
- **Verification Plan:** Full TypeScript/Vitest suite; Python worker/template tests; negative C3D8 corner-inversion case; configurable-resource range tests; explicit non-root and privileged namespace preflights; real CalculiX known case; real OpenFOAM v2606 official turbulent flat-plate V&V-family run using a bounded documented wall-function grading; retained quality/timeout evidence; template envelope/hash/command negative tests; three-grid GCI analytical and retained-receipt tests; flat-plate skin-friction correlation reporting; Stage C independent review; exact-digest Stage D Director authorization; Stage E enforcement.
- **Risk Assessment:** CRITICAL
- **Review Evidence:** Exact-head GitHub Actions for PR #52; retained OpenFOAM v2606 flat-plate execution/quality/timeout evidence; non-root and privileged namespace preflight reports; real CalculiX known-case evidence; template-materialization and GCI tests; full TypeScript/Vitest/Python-worker/build/security results. Evidence remains unapproved until the exact-head run completes and independent Stage C review is recorded.
- **Implementation Commit:** Current PR #52 head on `feature/solver-host-hardening-live-cfd-20261113`; final exact commit digest to be bound by Stage D before merge.
- **Approval Record:** PENDING. No AI output or Project Lead chat approval substitutes for independent technical review and exact-revision Director authorization.
- **Closure Status:** UNDER_REVIEW

## Commissioning interpretation

A real solver process exiting zero proves only the executable/case/evidence path. If the declared numerical plan is not met, the worker returns `COMPUTE_DONE_QUALITY_REJECTED` with immutable evidence. This state is intentionally distinguishable from infrastructure failure and from `COMPUTE_DONE_EVIDENCE_PENDING`, but both remain unapproved for vessel design release.

## Deliberate residuals

- The OpenFOAM flat-plate case is a CFD execution/V&V-family benchmark, not hull/free-surface resistance validation.
- Skin-friction correlation can be reported from retained fields, but no independent acceptance threshold is invented; correlation is not automatically accepted.
- Three-grid/GCI calculation and executable campaign plumbing are implemented, but no three-grid **vessel** CFD campaign has yet supplied independently accepted evidence.
- General agent-driven solver iteration is available only through operator-approved deterministic templates and bounded numeric envelopes; arbitrary agent-generated OpenFOAM archives/dictionaries/commands remain prohibited.
- A free-surface USV hull template, validated resistance benchmark and towing-tank/sea-trial correlation remain external engineering work.
- Live Gemini design execution remains externally blocked until an authorized credential-backed provider run is actually available.
