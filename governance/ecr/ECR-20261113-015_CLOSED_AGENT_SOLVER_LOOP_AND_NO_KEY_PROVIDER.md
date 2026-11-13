# ECR-20261113-015 — Closed agent/solver loop, approved case templates and operator-authenticated AI transport

- **Change ID:** ECR-20261113-015
- **Originator:** Engineering software assistant, proposed for independent human review
- **Date:** 2026-11-13
- **Description:** Close the bounded proposal→solver→quality→critique→revision loop using operator-approved deterministic solver templates; add three-grid convergence screening; add Gemini CLI headless transport that uses the operator's existing Google-authenticated CLI session instead of requiring an API key; add the 2024 ITTC resistance/propulsion CFD benchmark publication to controlled-source collection; and commission the official OpenFOAM v2606 ZPG turbulent-flat-plate case.
- **Reason for Change:** External technical review correctly identified that the design loop could not initiate CFD without per-case manual staging, no live no-API provider path existed, and single-grid solver completion could not establish mesh convergence.
- **Affected Subsystem:** Agent execution, model-provider routing, design optimization, remote CFD/FEA service, source provenance, CFD V&V and commissioning CI.
- **Affected Requirements:** AGT-01, AGT-02, RES-01, HYD-01, STR-01, VVP-001, GOV-01, GOV-02, Gate 0 concept research.
- **Architectural Impact:** A solver template catalog binds an exact generator SHA-256, solver family, fixed generated mesh/model path, bounded numeric parameters and source-identified quality plan. An authenticated `/template-jobs` endpoint deterministically materializes and stages the case; agents cannot upload arbitrary OpenFOAM/CalculiX dictionaries. Solver outcomes are added to the same A15 critique/TBD feedback that drives the next A01 revision. Gemini CLI becomes an optional live provider transport selected by `AI_REVIEW_PROVIDER=gemini_cli`; it executes in an empty temporary workspace, disables extensions, uses headless JSON mode, and does not read/copy OAuth token files.
- **Safety Impact:** CRITICAL. Template bounds and source digests are fail-closed. Quality-rejected solver outputs remain diagnostic only and cannot enter agent usable evidence. Three-grid GCI output is explicitly uncertified and accepts only monotonic approximately equal-ratio sequences. Live LLM output remains unverified and requires independent engineering authority.
- **Cybersecurity Impact:** Arbitrary case upload is not enabled. Generator scripts must be absolute regular files whose exact SHA-256 matches the operator catalog and run inside the configured resource/network-isolation boundary. Gemini CLI tool execution is restricted by an empty workspace, extensions disabled and plan/read-only approval mode; existing operator authentication remains managed by Gemini CLI rather than harvested by this repository.
- **Verification Plan:** Full TypeScript/Vitest suite; Python worker/template tests; manifest-digest cross-check; solver-template bounds and generator-digest negative tests; solver quality rejection→critic→revision regression; real CalculiX known case; real OpenFOAM v2606 flat-plate commissioning; Gemini CLI JSON-envelope/authentication unit tests using injected command runner; actual credential-backed Gemini CLI probe and 26-agent campaign only on an operator-authenticated workstation; independent Stage C review; exact-digest Stage D Director authorization; Stage E enforcement.
- **Risk Assessment:** CRITICAL
- **Review Evidence:** PR #52 exact-head GitHub Actions, retained solver artifacts, source-derived test reports and controlled public-reference hashes. Live Gemini CLI commissioning evidence remains external until an operator-authenticated invocation is actually executed.
- **Approval Record:** PENDING. Project Lead concept authority does not replace qualified independent engineering review, CFD validation or exact-revision Director cryptographic authorization.
- **Implementation Commit:** Current PR #52 branch `feature/solver-host-hardening-live-cfd-20261113`; final exact head to be bound by Stage D after all review changes are complete.
- **Closure Status:** UNDER_REVIEW

## Explicit residuals

- No repository/CI process may fabricate a Google login or copy Gemini CLI OAuth credentials. The first genuine 26-agent live campaign must be run from an already authenticated operator account.
- Approved templates close routine case staging only for templates that have themselves been independently reviewed. They do not make an arbitrary generated hull CFD model valid.
- The three-grid helper is a restricted equal-ratio, monotonic Richardson/GCI screen; generalized oscillatory convergence and formal V&V remain independent engineering tasks.
- Physical model tests, qualified free-surface hull-resistance validation, structural proof tests and all formal workstream acceptance remain external evidence gates.
