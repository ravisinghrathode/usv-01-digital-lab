# Restricted USV-01 Linux solver runner — commissioning guide

**CURRENT STATE:** Implementation and isolated unit tests only. There is **no evidence** of deployed service, installed OpenFOAM/CalculiX, completed CFD/FEA, mesh-convergence study, physical verification or marine design release.

## Components and trust boundary

- `worker.py` loads only pre-staged **operator-allowlisted** SHA-256 ZIP case bundles. It checks source SHA, input archive hash and the required pre-generated mesh file hash. OpenFOAM uses fixed commands `checkMesh -allTopology -allGeometry`, `simpleFoam`; CalculiX uses `ccx -i model`. No user-provided shell, dynamic commands, SSH or arbitrary remote download.
- `service.py` is a loopback-only (`127.0.0.1:8707`) token-gated HTTP queue. It accepts `POST /jobs` and returns actual status through `GET /jobs/<id>`. It processes at most one case simultaneously.
- `RemoteSolverJobs.ts` is the authenticated HTTPS client. A reverse proxy with real TLS and authorization must forward traffic from the approved application host to this loopback service. Never expose port 8707 publicly.
- **Solver completion is not convergence:** a real successful subprocess exits into `COMPUTE_DONE_EVIDENCE_PENDING`, with quality and grid-convergence fields absent; the frontend explicitly returns `COMPUTE_DONE_EVIDENCE_PENDING`, not a validated CFD/FEA result.

## Server requirements

Linux compute node provisioned and reviewed by the engineering and security owner, with matching OpenFOAM and CalculiX CLI binaries in the restricted `USV_SOLVER_BIN_PATH`. Run as a non-root dedicated service account with no network egress (except reverse-proxy loopback), limited CPU/memory/disk and restricted filesystem. Obtain solver versions and license/data rights independently.

System administrator provides:

```bash
USV_SOLVER_SERVICE_TOKEN=<GENERATED_RANDOM_TOKEN_32_OR_MORE_CHARACTERS>
USV_SOLVER_STAGING_DIR=/var/lib/usv-solver/staged
USV_SOLVER_WORK_DIR=/var/lib/usv-solver/work
USV_SOLVER_APPROVED_ARTIFACT_DIGESTS=sha256:<EXACT_OPERATOR_APPROVED_ZIP_BYTES_HASH>
USV_SOLVER_BIN_PATH=/opt/openfoam/bin:/usr/bin:/bin
```

Store these in restricted service-manager secrets, never git or logs. Strong token must be independent of the Director signing key.

1. Engineer prepares and verifies one **pre-meshed, immutably signed case** using a qualified model plan. For OpenFOAM include `constant/polyMesh/points`, solver dictionaries and all related mesh data; for CalculiX include `model.inp`. Audit all OpenFOAM dictionaries—including `#codeStream`, `coded` functions and any system-call hooks—because solver configurations are executable code. Treat a case hash as approved only *after* source/security review.
2. The operator stages `<ZIP_DIGEST_HEX>.zip` in the staging directory, adds that exact digest to `USV_SOLVER_APPROVED_ARTIFACT_DIGESTS`, then starts `python3 remote_solver/service.py` as the isolated service account.
3. The gateway exposes a TLS-verified `https://.../jobs` endpoint with the same strong bearer token. The authorized application sets `USV_SOLVER_HTTPS_ENDPOINT` and `USV_SOLVER_SERVICE_TOKEN` **server-side only**.
4. A controlled JSON request carries source commit, HTTPS archive citation, ZIP hash, pre-generated mesh hash, exact solver family and source-identified residual/mesh/GCI limits. Submit with `npm run solver:submit -- --job-file <CONTROLLED_MANIFEST.json>`; query the same manifest with `--poll`.
5. Collect full solver logs, mesh-check evidence and output fields in a controlled object store; this implementation currently reports log SHA digests only, **not** a published output artifact. The operator must establish actual solver version, mesh-refinement studies (multiple grids), uncertainties, validation against qualified independent references, and peer review before any approved outcome.
6. Final engineering authority and project governance remain separate. This service never writes controlled CAD, agent approved values or actuator commands.

### Limitations requiring further commissioning

The service uses in-memory job state; restart requires manual reconciliation and fresh submission, not pretending lost jobs succeeded. Case bundles can still contain code executed by the solver; operator-signed allowlists and OS isolation are mandatory. No real solver has yet been installed or tested in this workspace. Real CFD/FEA convergence, security hardening of the host, artifact publication and external witness sign-off are **open**.

## Test-only commands

```bash
python3 -m unittest discover -s remote_solver -p 'test_*.py' -v
```

Those tests **mock subprocesses** and test safety boundaries; they never establish that a real solver is available.
