# Fossen Phase 2 — source intake, isolated smoke runner, and evidence gates

## Scope
This work extends merged EXT-001 (PR #89). It **does not** activate the Fossen Python Vehicle Simulator in the 26-agent tool registry, approve a vessel calculation, or change safety/control logic. A26 owns external research coordination; A08/A16/A17 conduct disciplinary assessment; A18/A24 handle numerical validation; A20 source/container security; A21 interface contracts; A15/A23 independent challenge.

### A. Real source checkout and provenance: automatic on this PR
`.github/workflows/repository-first-intake.yml` runs on same-repository pull requests:
1. `node --test` checks inspection-only vs executable manifest approval logic.
2. `intake` checks public upstream GitHub identity, pinned commit and Git tree through public API.
3. `stage` fetches exact source revision, with no submodules or hooks. It fails on links/special files and source-size violations.
4. The job compares the GitHub-reported source tree with the staged Git tree.
5. It writes `intake.json`, `stage.json`, `proposal.json` and `REVIEW.md`, deletes untrusted source, uploads only metadata.

The candidate manifest is `references/third-party-candidates/fossen-python-vehicle-simulator.json`. It **intentionally has no runner image digest** or executable reference cases. An image ID must never be fabricated to enable read-only inspection.

### B. Controlled execution: manual only, after review/merge
`.github/workflows/fossen-isolated-evaluation.yml` is available **only by manual dispatch on main**. The operator must enter exactly `I_ACKNOWLEDGE_DISPOSABLE_THIRD_PARTY_EXECUTION`. No PR, nightly schedule, GitHub bot or agent invokes this job automatically.

The workflow uses a temporary GitHub-hosted Linux VM, with no checkout credentials persisted. The script:
1. Repeats pinned metadata intake and source staging; verifies matching commit/tree.
2. Downloads a fixed-version `numpy==2.3.5` wheel on the evaluation VM. This **measures a hash, but does not prove package safety or pre-approve the dependency**.
3. Pulls an official Python `3.12-slim` image, records the *actual* registry digest. The mutable tag is used only for initial resolution and the subsequent build is pinned to that measured digest.
4. Builds a **local** Docker image with network disabled, installs the hash-recorded NumPy wheel offline, embeds the trusted adapter, and captures the actual Docker **config image ID** (`sha256:...`). This is not a published registry manifest digest or signed software supply-chain attestation.
5. Generates `runtime-manifest.json` from measured hashes using `scripts/prepare-fossen-runtime.mjs`. Executes only five independently specified elementary GNC identity tests: angle wrapping, saturation, zero Euler rotation and skew matrix. External code stays in a read-only mount. Container has `--network=none`, nonroot user, all capabilities dropped, no-new-privileges, read-only filesystem, CPU/memory/process limits and timeouts.
6. Uploads metadata and reference outputs only. Source checkout and Docker build context are deleted. The temporary runner is destroyed after the run.

Trusted adapter `integrations/candidates/fossen_python_vehicle_simulator_adapter.py` loads only the pinned `gnc.py` file, rather than the upstream package initializer. This reduces unrelated imports; it **does not** remove the risk inherent in executing untrusted upstream code.

### What the tests can and cannot prove
Local and CI `node:test` and `unittest` check manifests, input boundaries, provenance validations, container arguments and synthetic adapter contracts. They **do not execute upstream code**.
Manual disposable-host execution, if explicitly dispatched and completed, can establish that elementary mathematical calls work for that pinned software image/source pair. It **cannot** establish the accuracy of the Otter 6-DOF model, USV-01 hydrodynamic performance, manoeuvring in waves, COLREGS compliance, propulsion control safety, navigation reliability, or acceptance of any vessel baseline.

### Explicit remaining approvals and work
- Actual executed artifact: **PENDING manual trusted-runner dispatch, no result claimed in this PR.**
- Source and dependency licence/attribution assessment: **PENDING**. The MIT-style repository file may not establish permission for all external contents.
- Full SBOM, vulnerability review, wheel provenance/attestation, base image scan: **PENDING**. The SHA256 wheel inventory is not a CVE report.
- Independent, validated *marine dynamics* benchmark with documented units/frames/uncertainty, not merely mathematical GNC identities: **PENDING A08/A18/A24**.
- Independent technical/security A15/A20/A23 review and protected-software source sign-off: **PENDING**.
- Candidate-to-lab adapter binding, versioned permissioned tool registry and rollback verification: **NOT IMPLEMENTED / NOT AUTHORIZED** until evidence accepted.
- Engineering Director vessel configuration release: **SEPARATE CONTROLLED GATE**.

**This Phase 2 PR must not be represented as end-to-end deployed production integration. It provides the real static intake and opt-in isolated software qualification route while retaining all review boundaries.**
