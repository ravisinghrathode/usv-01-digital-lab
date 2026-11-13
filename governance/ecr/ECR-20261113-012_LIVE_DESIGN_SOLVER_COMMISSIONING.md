# ECR-20261113-012 — Live USV concept commissioning and restricted solver execution

- **Change ID:** ECR-20261113-012
- **Originator:** Engineering software assistant, proposed for independent human review
- **Date:** 2026-11-13
- **Description:** Add fail-closed live Gemini authentication probe; require exact checked-out Git SHA and mission file digest; make every model-proposed numeric parameter source-identified or explicitly hypothetical; run A05/A06/A07/A23 registered specialist review when calculation prerequisites succeed; add operator-staged executable OpenFOAM/CalculiX worker and authenticated loopback job queue; add ITTC source-identified numerical identities benchmark.
- **Reason for Change:** External technical audit confirms previously delivered loop ran only A01/A15 and tool-screened proposals, no live provider run or CFD/FEA worker. Existing generic LLM metrics lacked per-number provenance.
- **Affected Subsystem:** Agent execution, modelling, engineering research, resistance, stability, remote CFD/FEA numerical execution, reference verification and governance.
- **Affected Requirements:** AGT-01, AGT-02, HYD-01, RES-01, STR-01, MAR-01, GOV-01, GOV-02, concept Gate 0, VVP-001.
- **Architectural Impact:** Optional automatic specialist execution on passed numerical-tool prerequisites; no simulation-only gate can become engineering release. A restricted Linux solver process accepts only allowlisted exact-hash staged cases and invokes fixed binaries. Independent source/mesh and engineering verification remain separate.
- **Safety Impact:** CRITICAL. No vessel actuation. No autonomous promotion of unverified numeric values; no fabricated CFD/FEA convergence or compliance. GitHub cannot silently substitute mocks for a live provider.
- **Cybersecurity Impact:** Live secrets remain server-side, restricted case bundles are pre-approved by digest, shell and uploaded commands are forbidden; solver service binds loopback and requires a strong bearer behind externally maintained TLS, run under unprivileged isolated service account. The case data cannot be accepted from arbitrary users.
- **Verification Plan:** Full Vitest, TypeScript and production build; source provenance negative tests, all-role specialist orchestration tests, provider preflight test doubles; Python worker ZIP validation and fake subprocess tests in CI; reference identity negative controls; independent Stage C review; actual provisioned Linux solver commissioning and real model-run evidence pending; exact-digest human Stage D approval and Stage E enforcement.
- **Risk Assessment:** CRITICAL
- **Review Evidence:** Proposed GitHub PR #50 and its latest exact-head CI, see GitHub PR comments; no live provider secrets or actual remote solver output yet.
- **Approval Record:** PENDING. Project Lead authority is concept selection, not independent safety-review, maritime certification or engineering director cryptographic signature.
- **Implementation Commit:** PENDING final PR source SHA.
- **Closure Status:** UNDER_REVIEW

**External acceptance pending:** Live credential/service instance, source-authenticated reference PDFs with content digests, independently validated benchmark measurements, server-side Linux solver provisioning, mesh convergence studies and qualified witness review. All 13 formal workstreams remain unaccepted until independently evidenced.
