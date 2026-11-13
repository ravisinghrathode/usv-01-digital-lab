# Restricted USV-01 Linux solver runner — commissioning guide

**CURRENT STATE:** PR #52 hardening is under review. Real CalculiX commissioning has passed on Linux; OpenFOAM v2606 is now exercised in a separate Ubuntu 24.04 benchmark job and its numerical-quality disposition is retained explicitly. No vessel CFD/FEA, three-grid convergence study, physical verification or marine design release is claimed.

## Components and trust boundary

- `worker.py` loads only pre-staged **operator-allowlisted** SHA-256 ZIP case bundles. It checks source SHA, input archive hash and the required pre-generated mesh file hash. OpenFOAM uses fixed commands `checkMesh -allTopology -allGeometry`, `simpleFoam`; CalculiX uses `ccx -i model`. No user-provided shell, dynamic commands, SSH or arbitrary remote download.
- `service.py` is a loopback-only (`127.0.0.1:8707`) token-gated HTTP queue. It accepts `POST /jobs` and returns actual status through `GET /jobs/<id>`. It processes at most one case simultaneously.
- `RemoteSolverJobs.ts` is the authenticated HTTPS client. A reverse proxy with real TLS and authorization must forward traffic from the approved application host to this loopback service. Never expose port 8707 publicly.
- **Results are retained:** before the temporary case directory is deleted, selected result files, solver logs, mesh checks and a machine-readable summary are written to an immutable permission-restricted ZIP in `USV_SOLVER_ARTIFACT_DIR`. The authenticated gateway can serve it at `/artifacts/<job>` and persists a receipt JSON for restart/review.
- OpenFOAM `checkMesh` skewness/non-orthogonality and final solver residuals are parsed and compared with the source-defined job thresholds. CalculiX C3D8 meshes receive an edge-aspect screen plus scaled-Jacobian sampling at the element centre, all 8 integration/Gauss points and all 8 natural-coordinate corners (17 samples per element). Other element families remain unsupported and fail closed. Threshold failure returns `COMPUTE_DONE_QUALITY_REJECTED` with retained evidence. The TypeScript client classifies that state as `REJECTED` and never exposes it through `getAgentUsableSolverEvidence`.
- Actual solver version is queried before execution. Key results expose OpenFOAM force-coefficient tables when the case generates them; CalculiX ASCII `model.dat` stress/displacement output is reduced to auditable maximum-component/magnitude screens while the original DAT/FRD is retained.
- **Solver completion is not convergence:** a real successful subprocess that passes its declared single-run mesh/residual screen exits into `COMPUTE_DONE_EVIDENCE_PENDING`; a real subprocess that finishes but misses the plan exits into `COMPUTE_DONE_QUALITY_REJECTED`. Neither state establishes grid/mesh refinement uncertainty, independent model validation or engineering release.

## Server requirements

Linux compute node provisioned and reviewed by the engineering and security owner, with matching OpenFOAM and CalculiX CLI binaries in the restricted `USV_SOLVER_BIN_PATH`. Run as a non-root dedicated service account. The worker additionally applies POSIX RLIMIT ceilings for CPU time, virtual address space, result file size, open files, subprocess count and core dumps; production solver commands use one explicitly configured namespace backend: preferred `UNSHARE_USER_NET` (`unshare --user --map-root-user --net`) for a non-root service account where the kernel permits user namespaces, or `UNSHARE_NET_PRIVILEGED` (`unshare --net`) for a separately controlled privileged service. There is no silent fallback; host preflight must pass the selected backend. Filesystem quotas/cgroups are still recommended as an outer host control. Obtain solver versions and license/data rights independently.

System administrator provides:

```bash
USV_SOLVER_SERVICE_TOKEN=<GENERATED_RANDOM_TOKEN_32_OR_MORE_CHARACTERS>
USV_SOLVER_STAGING_DIR=/var/lib/usv-solver/staged
USV_SOLVER_WORK_DIR=/var/lib/usv-solver/work
USV_SOLVER_ARTIFACT_DIR=/var/lib/usv-solver/artifacts
USV_SOLVER_OUTPUT_BASE_URI=https://solver-gateway.example.org
USV_SOLVER_APPROVED_ARTIFACT_DIGESTS=sha256:<EXACT_OPERATOR_APPROVED_ZIP_BYTES_HASH>
USV_SOLVER_BIN_PATH=/opt/openfoam/bin:/usr/bin:/bin
USV_SOLVER_CPU_SECONDS=1800
USV_SOLVER_ADDRESS_SPACE_BYTES=8589934592
USV_SOLVER_FILE_BYTES=2147483648
USV_SOLVER_OPEN_FILES=1024
USV_SOLVER_PROCESSES=64
USV_SOLVER_WALL_TIMEOUT_SECONDS=1800
USV_SOLVER_ISOLATION_MODE=UNSHARE_USER_NET
# OpenFOAM example when using the versioned OpenCFD package:
USV_OPENFOAM_WRAPPER=/usr/bin/openfoam2606
USV_OPENFOAM_PROJECT_DIR=/usr/lib/openfoam/openfoam2606
```

Store secrets in the restricted service manager, never git or logs. Strong token must be independent of the Director signing key. Resource ceilings are configuration, not secrets: every value is range-validated at runtime and recorded in the solver receipt. A malformed or out-of-range setting fails closed.

Before accepting jobs on a new host, run the preflight **as the same service account**:

```bash
python3 remote_solver/host_probe.py --require-openfoam --require-calculix --require-network-isolation --isolation-mode "$USV_SOLVER_ISOLATION_MODE"
```

The probe verifies solver binaries, configured directories, parsed resource policy and the exact selected namespace operation. GitHub Actions has already demonstrated why this matters: the ordinary runner account can be denied user-namespace UID mapping even while a separately privileged network namespace works. The target solver host/service account must therefore pass independently.

1. Engineer prepares and verifies one **pre-meshed, immutably signed case** using a qualified model plan. For OpenFOAM include `constant/polyMesh/points`, solver dictionaries and all related mesh data; for CalculiX include `model.inp`. Audit all OpenFOAM dictionaries—including `#codeStream`, `coded` functions and any system-call hooks—because solver configurations are executable code. Treat a case hash as approved only *after* source/security review.
2. The operator stages `<ZIP_DIGEST_HEX>.zip` in the staging directory, adds that exact digest to `USV_SOLVER_APPROVED_ARTIFACT_DIGESTS`, then starts `python3 remote_solver/service.py` as the isolated service account.
3. The gateway exposes a TLS-verified `https://.../jobs` endpoint with the same strong bearer token. The authorized application sets `USV_SOLVER_HTTPS_ENDPOINT` and `USV_SOLVER_SERVICE_TOKEN` **server-side only**.
4. A controlled JSON request carries source commit, HTTPS archive citation, ZIP hash, pre-generated mesh hash, exact solver family and source-identified residual/mesh/GCI limits. Submit with `npm run solver:submit -- --job-file <CONTROLLED_MANIFEST.json>`; query the same manifest with `--poll`.
5. The worker preserves the bounded result bundle and returns its SHA-256, solver version, parsed numerical results and preliminary mesh/residual quality. Configure the HTTPS gateway so `outputArtifactUri` is non-null. The operator must still establish mesh-refinement studies (multiple grids), uncertainties, validation against qualified independent references, and peer review before any approved outcome.
6. Final engineering authority and project governance remain separate. This service never writes controlled CAD, agent approved values or actuator commands.

### Limitations requiring further commissioning

The service keeps live state in memory but also persists completed receipt JSON and can recover completed job status/artifacts after restart. Queued/running jobs interrupted by a restart still require explicit operator reconciliation; they are never assumed successful. Case bundles can still contain code executed by the solver; operator-signed allowlists and OS isolation are mandatory. PR #51 includes a real Ubuntu CalculiX axial-bar commissioning job with a closed-form stress/displacement comparison; whether it has passed must be taken from the exact PR-head CI run, not this document. Real vessel CFD/FEA convergence, target-host security commissioning, artifact publication, experimental/reference correlation and external witness sign-off are **open**. The OpenFOAM backward-step job is execution-path evidence; a quality-rejected run remains diagnostic only.

## Test-only commands

```bash
python3 -m unittest discover -s remote_solver -p 'test_*.py' -v
```

Those unit tests **mock subprocesses** and test safety boundaries. The separate CI known-case job installs the Ubuntu `calculix-ccx` package and executes the generated 10-element axial bar through the restricted worker; it remains a software/solver-path commissioning check, not naval FEA validation.
