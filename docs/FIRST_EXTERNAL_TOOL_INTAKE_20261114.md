# EXT-001 — Fossen Python Vehicle Simulator: first third-party USV tool investigation

**Status:** `SOURCE_PINNED — STATIC INSPECTION / ADAPTER CONTRACT ONLY`; **not operational, not commissioned, not installed in agent registry, not vessel approved**.

## Why this project
Upstream: [cybergalactic/PythonVehicleSimulator](https://github.com/cybergalactic/PythonVehicleSimulator).
The package provides Python ship/AUV/USV motion-model examples and marine guidance, navigation and control utilities, including a 2 m Otter USV example. This makes it a plausible **research comparator** for A08 (manoeuvring/motions) and A16/A17 (perception/navigation interfaces). It is not a validated USV-01 vessel model, and the Otter's quoted dimensions, masses and hydrodynamic coefficients must **never** be copied into USV-01 without independent sources and approval.

### Pinned provenance
- Exact upstream commit: [`a93d1938ba1f78f2580c24c73f003091b2f03cd0`](https://github.com/cybergalactic/PythonVehicleSimulator/tree/a93d1938ba1f78f2580c24c73f003091b2f03cd0), recorded from live connected GitHub metadata.
- Relevant source file at that commit: `src/python_vehicle_simulator/lib/gnc.py`, Git blob `8a0054ad3f730b9250ed778e9c4bb99e7599f076`. It exports `ssa`, `sat`, `Rzyx`, and `Smtrx`.
- Relevant USV example: `src/python_vehicle_simulator/vehicles/otter.py`, blob `33fb2b7d38c78dc092097b32a9dcd3850a9258ad`.
- Repository `LICENSE` file is MIT-style and packaging metadata declares MIT; **licence compatibility and attribution still require human review**. The copyright text in the LICENSE file mentions the Python Packaging Authority; do not assume all third-party embedded content has been cleared.
- Declared Python dependencies include NumPy and Matplotlib, with development tests using pytest. A reproducible, checksum-locked dependency set has not been established.

See structured evidence `references/third-party-investigations/fossen-python-vehicle-simulator.json`.

## What this PR provides
- `integrations/candidates/fossen_python_vehicle_simulator_adapter.py`: a **proposal** for a bounded, stdin-JSON/stdout-JSON bridge to four elementary upstream GNC functions, **only** when executed inside the existing restricted evaluation sandbox with the untrusted source pinned at `/candidate/src`.
- `tests/test_fossen_candidate_adapter.py`: standard-library `unittest` contract tests using a synthetic substitute implementation, with **no upstream source cloned or executed**. These prove input checking and bridge shape, not upstream numerical correctness or maritime safety.
- A version-pinned, source-inspection record with draft analytical examples. Their expected results are derived from angle wrapping, saturation and rotation/skew matrix identities, **not from the candidate's outputs**.
- Existing integration CI will run the offline adapter contract tests on the PR, with no third-party code execution.

## Required next evidence and controls
1. **Intake and stage:** On a dedicated disposable host, resolve and record the upstream Git tree from the pinned commit; use `scripts/repository-integration.mjs intake` and `stage` only after a complete candidate manifest exists.
2. **Provision pinned runner:** Build a reviewed Python evaluation image from a trusted, verified base, pin by actual `sha256` digest, and provide the approved adapter within the trusted image. Never manufacture a plausible digest.
3. **Dependencies and supply-chain:** Independently review MIT licensing and attribution; produce dependency locks, SBOM, provenance and vulnerability assessment. The upstream package may import NumPy/Matplotlib through `lib/__init__.py`.
4. **Isolated reference execution:** Use a disposable VM plus the existing Docker restrictions; keep credentials absent, networking disabled, source read-only, and no submodules/hooks. Execute the four GNC utility cases; preserve numerical outputs and source/image hashes. **No such execution has been conducted yet.**
5. **Marine benchmark:** A08/A18/A24 design an independent reference manoeuvring or dynamic model case with documented units, frames, tolerances, and accepted physics; compare the candidate's prediction. Simple GNC identities alone cannot qualify a vessel simulator.
6. **Review and adoption:** A20 security; A21 interfaces; A15/A23 independent challenge; responsible engineer and Director decision as appropriate under the existing Stage A/E process. Integration into the canonical tool registry requires a separate protected PR and rollback evidence.

## Acceptance status
| Gate | State |
| --- | --- |
| Public upstream located and exact commit pinned | Evidence recorded |
| Relevant source interfaces read | Evidence recorded |
| Adapter source and synthetic contract tests | Proposed / CI test pending |
| Verified upstream Git tree and staged checkout | **TBD** |
| Real digest-pinned runner image | **TBD** |
| Licence and security approvals | **TBD** |
| Actual third-party execution in disposable sandbox | **NOT RUN** |
| Independently accepted marine-physics reference cases | **TBD** |
| A15/A23 review and human software acceptance | **TBD** |
| USV-01 tool registry activation / vessel release | **NOT AUTHORIZED** |

**Important:** Neither a green PR check nor a merged research adapter is evidence of marine simulator commissioning or permission to command a vessel.
