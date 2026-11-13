# ECR-20261113-013 — Solver result retention, numerical quality gates and known-case commissioning

- **Change ID:** ECR-20261113-013
- **Originator:** Engineering software assistant, proposed for independent human review
- **Date:** 2026-11-13
- **Description:** Persist selected OpenFOAM/CalculiX outputs outside ephemeral work directories, return parsed CFD/FEA result metrics and solver version, enforce family-specific mesh/numerical quality screens, add Linux resource/network isolation, execute a real CalculiX analytical known case in CI, add preliminary catamaran hydrostatics, and execute A09/A10/A14 only from fetched-source-hashed input packages.
- **Reason for Change:** External review correctly identified that PR #50 discarded solver results, did not apply declared mesh quality thresholds, did not record real solver versions, relied on operator-only resource controls, could not screen catamaran hydrostatics and left mass/structure/electrical specialist paths disconnected.
- **Affected Subsystem:** Remote numerical solvers, hydrostatics, structural verification, agent orchestration, CI commissioning, governance.
- **Affected Requirements:** HYD-01, RES-01, STR-01, MAR-01, AGT-01, AGT-02, GOV-01, GOV-02, VVP-001, Gate 0 concept screening.
- **Architectural Impact:** Solver worker keeps immutable bounded evidence ZIPs and receipt files after temporary cases are deleted. Authenticated gateway exposes job metadata/artifacts. Agents may inspect parsed results only as REMOTE_SOLVER_OUTPUT_UNVERIFIED. Catamaran geometric screening is separate from monohull resistance. A09/A10/A14 require source-bound packages.
- **Safety Impact:** CRITICAL. Mesh/residual or FEA mesh-quality failures abort compute disposition. Single-grid completion remains unverified. No result automatically modifies CAD, scantlings, propulsion ratings or autonomous-control setpoints.
- **Cybersecurity Impact:** Fixed commands only; production subprocesses are wrapped in a new Linux network namespace and hard POSIX RLIMIT CPU/address-space/file-size/open-file/process/core limits. Evidence archives have size caps and restrictive permissions. Input ZIP and mesh/model hashes remain operator allowlisted. No arbitrary code/shell API is added.
- **Verification Plan:** Complete TypeScript/Vitest suite; Python worker unit tests for result retention/version/mesh thresholds/resource/network command shape; real Ubuntu CalculiX package installation and 10-element analytical axial-bar run through worker; compare parsed stress/displacement with closed-form values; persist CI evidence artifact; catamaran and source-package agent-loop negative/positive tests; independent Stage C review, exact-digest Stage D Director signature and Stage E enforcement.
- **Risk Assessment:** CRITICAL
- **Review Evidence:** PR #51 exact-head GitHub Actions and retained `usv01-real-calculix-known-case-unverified` CI artifact once the real run completes; official OpenFOAM/CalculiX documentation referenced in implementation notes.
- **Approval Record:** PENDING. No project-level approval substitutes for independent engineering review or exact-revision Director authorization.
- **Implementation Commit:** PENDING final PR head and evidence digest.
- **Closure Status:** UNDER_REVIEW

## Deliberate limitations

- A single solver run cannot establish grid/mesh convergence. `COMPUTE_DONE_EVIDENCE_PENDING` remains mandatory until a multi-grid study and external reference comparison are independently reviewed.
- The catamaran tool computes only preliminary twin-demi-hull displacement/waterplane inertia/BM/GM screening; wave interference, resistance, bridge-deck slamming and offset-integrated GZ are explicitly unvalidated.
- The real CI known case is a simple structural axial bar used to prove actual CalculiX invocation, output retention/parser behavior and a closed-form sanity comparison. It is not a naval structural qualification case.
- Live Gemini design commissioning remains pending because no authorized Gemini credential is present in repository CI. No fallback model run may be reported as equivalent.
