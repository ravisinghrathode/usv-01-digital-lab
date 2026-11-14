# A26 — P1 external software technical qualification queue

**Date:** 15 November 2026. **Disposition:** public, source-pinned **STATIC RESEARCH ONLY**. This is not a software validation, SBOM, vulnerability scan, active installation, engineering calculation or naval acceptance.

Previous [380 search hits / 88 research candidates](A26_DISCOVERY_2026-11-15.md) led to a controlled [90-entry register](../../docs/EXTERNAL_SOFTWARE_OVERVIEW.md). Eight priority candidates now have inspectable pinned source/manifest and license evidence in [the machine-validated audit](../../references/third-party-static-audits/A26_P1_STATIC_AUDIT_2026-11-15.json). Seven were previously DISCOVERED; the eighth, Fossen PythonVehicleSimulator, was already EVALUATING.

All eight are research candidates; **no package, dependency, vessel simulator or hardware interface was executed for this assessment**. No candidate is approved or registered as an executable A26/USV agent tool. The permanent register has 8 EVALUATING, 82 DISCOVERED, 0 QUALIFIED, 0 INTEGRATED and 0 actual-use events.

## Evidence-backed technical screen

| Candidate | Actual root license / manifest evidence | Major technical risk | Proposed independent physics/interface proof | Research action |
| --- | --- | --- | --- | --- |
| [MSS](https://github.com/cybergalactic/MSS) | MIT license text; MATLAB/GNU Octave library | Not a ready JSON tool; runtime and 6-DOF model/parameter validity TBD | Energy symmetry, static restoring reference, manoeuvring model independent data | A08/A17 with A20/A21/A18/A24/A15/A23 |
| [Fossen PythonVehicleSimulator](https://github.com/cybergalactic/PythonVehicleSimulator) | MIT-format LICENSE with Python Packaging Authority attribution; setup.cfg declares NumPy/Matplotlib | Source attribution clarification; elementary GNC smoke != marine model validation | Independent dynamics and environmental drift scenarios | A08/A16/A17 with independent checks |
| [SINTEF FEEMS](https://github.com/SINTEF/FEEMS) | Root MIT, Python workspace + uv.lock; inspected MachSysS package metadata says Apache-2.0 but its LICENSE text is MIT | Resolve component license inconsistency, transitive package provenance and model power/energy assumptions | Power-balance, battery energy integral, published power/fuel curve under consistent operating point | A11/A13/A14 with A20/A21/A18/A24/A15/A23 |
| [NTNU COLAV Simulator](https://github.com/ntnu-itk-autonomous-ship-lab/colav-simulator) | MIT; Python >=3.10 and <3.12; uv.lock and pinned Git dependencies | Supply-chain risk; scenario collision-free != COLREG compliance | Crossing/overtaking/head-on reference encounters, CPA/time, invalid/no-solution cases | A17/A22 with independent review |
| [Java Marine API](https://github.com/ktuukkan/marine-api) | LGPL-3.0 license text, Maven pom.xml | License/distribution consequences; no live vessel IO | NMEA XOR checksum, geodetic and speed conversions, corrupt payload rejection | A19/A20/A21 and independent QA |
| [Ship Hull Generator](https://github.com/janibert1/ship-hull-generator) | GPL-3.0 license; config.json example LOA ≈118.7 m | Small USV extrapolation and empirical resistance regime; script imports subprocess | Hydrostatic volume integration, symmetric transverse centroid, independent resistance/stability reference | A05/A06/A09 with A15/A23 |
| [Strip Theory Toolkit](https://github.com/CaptanG/striptheory) | MIT license; directly executed top-level Python script, no inspected root lockfile | Hard-coded 120 m and density 1.025, unit/frame and wave RAO reference uncertainty | Independent Wigley RAOs, dimensional added mass/damping and long-wave limits | A07/A08/A18/A24 |
| [Open Echo](https://github.com/Neumi/open_echo) | No LICENSE at checked pinned root; README and hardware documentation only | **Legal HOLD** plus transducer/hardware safety and source limitations | Synthetic time-of-flight/depth and malformed return checks; no hardware access | A12/A16/A20/A21; require rights clarification |

The exact source-tree SHA, inspected Git blob SHA and source URL for each item live in the machine-readable audit. A license mentioned in metadata, package metadata or README **is not** a completed compatibility/license review. For FEEMS, a purported package license and the file text disagree; this requires a human resolution, not a silent assumption.

## Qualification gates still outstanding

1. **A20** — prepare actual dependency inventories, verified locked provenance, SBOM and CVE analysis, including Git-pinned direct/transitive dependencies; assess any subprocess, dynamic import, serial IO, firmware/hardware and sandbox access. No static script in this milestone claims an actual security scan.
2. **Human legal/licensing** — verify actual rights, notices, copy/distribution and dual-component terms; withhold Open Echo until licensability is clear.
3. **A21 + domain specialist** — design a strict JSON-in/JSON-out, non-actuating adapter for each selected candidate; require units, frames, time convention, input limits, error contract and bounded resources. The current generated `unimplemented-adapter.py` must continue to exit 78.
4. **A18/A24 + A15/A23** — identify independent third-party reference cases and uncertainty envelopes; only then populate currently TBD expected values and run operator-authorized research sandbox tests. No solver can use its own output to set acceptance limits.
5. **Operator** — individually authorize untrusted-code execution on a disposable, network-isolated evaluation host when the independent review package is credible. Do not run any third-party package on a credentialed source-authoring host, nor activate OpenFOAM commissioning.
6. **Software source governance** — authenticated exact-head reviewer approval and subsequent tested rollback before `QUALIFIED` or `INTEGRATED` can be proposed. **Vessel engineering Director Gate E remains separately required** to release any design evidence.

The newly added policies are [A26 charter Amendment R2](../EXTERNAL_INTEGRATION_AGENT_CHARTER.md) and `config/external-integration-policy.json` revision 2. `scripts/a26-static-audit.mjs` verifies that source pins, independent TBD benchmark plans, license holds and non-execution claims have not drifted. It cannot independently prove a legal statement or protect a malicious host; those remain human/operational responsibilities.

## Milestone decision

**Milestone completed in this PR:** pinned static audit, seven safe research-phase lifecycle updates, explicit project/agent research allocations, extended enforced charter, negative tests, and controlled overview. **Not completed:** reusable executing adapters, independent numerical qualification, software licensing approval, full SBOM/CVE security review, external runtime tool permissioning or vessel engineering use. No automated completion claim is permitted until those gates have evidence.

## Trusted analytic screens added in the same milestone

`scripts/a26-analytical-oracles.mjs` and its independent `tests/a26-analytical-oracles.test.mjs` provide six **synthetic, deterministic first-principles functions** with seven useful engineering checks. No third-party code is imported or executed.

| Analytic screen | Explicit synthetic reference | Scope and limitation |
| --- | --- | --- |
| Rectangular displaced buoyancy | 2 × 1 × 0.5 m rectangular immersion = 1 m³; seawater 1025 kg/m³, g = 9.80665 m/s² implies 10051.81625 N | Checks SI arithmetic, not any candidate's hull model |
| Electrical energy | 1200 W × 900 s = 300 Wh | Checks integration units and sign for simple constant load; does not model efficiency or battery chemistry |
| Closest-point approach | Relative position (100,0) m, velocity (−5,0) m/s yields TCPA=20 s, DCPA=0 m | Checks Cartesian relative-motion geometry, not any COLREG decision |
| Echo depth | 1500 m/s × 20 ms / 2 = 15 m | Checks ideal two-way propagation, not actual sound-speed profile or bathymetry |
| NMEA XOR | Public illustrative GPGGA payload checksum = 47 | Checks ASCII XOR only, not real marine telemetry protocol coverage |
| Ideal Wigley and oscillator | Idealized Wigley volume (4/9)LBT; L=9 m, B=2 m, T=1 m yields 8 m³. SDOF heave screen gives unity static gain and an illustrative resonant gain 10 | Algebraic tests of **explicitly stated** idealizations, not sea-state RAO, stability or vessel motion acceptance |

**Independent verification gate remains HOLD:** a specialist must compare candidate results against these or separately accepted references with pinned inputs, units, frames, uncertainty bounds and an actual isolated execution receipt. A synthetic mathematical identity cannot by itself prove engineering suitability, software license, security, robustness or marine qualification.
