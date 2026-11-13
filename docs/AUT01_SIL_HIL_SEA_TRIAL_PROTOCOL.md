# USV-01 AUT-01 — SIL, HIL, Independent Review and Supervised Sea-Trial Protocol
Revision A, 2026-11-13. **UNAPPROVED TEST PROCEDURE — DO NOT OPERATE A VESSEL ON THIS DOCUMENT ALONE.**

## Scope and acceptance posture
The code in `src/core/verification/AutonomyColregsSafetyScreen.ts`, `AutonomySensorEvidence.ts`, and `AutonomySilReplay.ts` supplies **non-actuating evidence checks**, not a guidance/navigation/control system, sensor fusion, or hardware interface. Passing synthetic software tests cannot close AUT-01. Site acceptance requires a vessel-specific risk assessment, named qualified test director, authorized navigation operator/master, independent safety officer, legal/regulatory applicability and a valid immutable source baseline.

**Regulatory scope check:** IMO COLREGs (https://www.imo.org/en/about/conventions/pages/colreg.aspx) apply subject to Rule 1 and jurisdictional exceptions. The 2026 IMO non-mandatory MASS Code (https://www.imo.org/en/mediacentre/pressbriefings/pages/imo-adopts-mass-code.aspx) covers primarily SOLAS Chapter I cargo ships; governments are invited to apply it as practicable below 500 GT. It cannot be used to infer automatic certification or authority for this naval USV.

## A. Inputs to freeze before engineering acceptance
- Signed CONOPS and operational design domain: speed/sea state/wind/current/visibility limits, day/night, waterway category, traffic type, depth and restricted navigation areas.
- Actual hull model, dimensions, manoeuvring trial results, turning circle, stopping distance, response delays, battery/propulsion minimum safe-energy envelopes.
- Sensor register: make/model, radar resolution/coverage and failure modes, optical detection performance at night/glare/rain/fog, GNSS/IMU integrity, calibrated true bearing/heading, AIS latency and limits, independent audible lookout arrangement.
- Time synchronization accuracy, tracker object association, covariance reference data, stale/contradictory target policies and sensor fallback coverage.
- Approved collision-risk limits, multi-vessel constraint solver design, decision latency, propulsion and steering feasibility, hazard-specific minimum-risk operating state and comms-loss timing.
- Remote operator command authority, authentication/replay protection, human emergency takeover, independent MCU watchdog, hardware emergency-stop and audit retention.
- External jurisdiction/flag/national maritime rules, COLREG lights/day shapes and sound signals, naval policy, licensing, environmental permissions and reporting obligations.

Any missing value is a release-blocking TBD, **not** an invitation to substitute a guessed numeric threshold. Synthetic profiles in tests are only regression fixtures.

## B. Independent maritime and systems review
A **qualified COLREG-trained maritime navigator/master** and **independent controls/safety engineer** must review the frozen source SHA. Gemini may provide an additional independent **AI advisory** critique but cannot sign the human report.

Reviewers shall check Rules 1–10, 11–19, 20–31, 32–37 and applicable annexes; Rule 2 exceptional circumstances, Rule 5 by sight and hearing, Rule 6 safe speed, Rule 7 scanty information, Rule 8 early/substantial action, Rule 9 narrow channels, Rule 10 TSS, Rule 13 overtaking persistence, Rule 14 head-on, Rules 15–17 stand-on/give-way, Rule 18 vessel responsibility, and Rule 19 restricted visibility. Record unresolved legal interpretation instead of resolving it by algorithmic default.

**Deliverables:** signed review identity/qualifications, COLREG rule-by-rule applicability table, defect log (including counterexamples), changed requirement IDs, repository exact SHA, review disposition and independent closure evidence.

## C. Software-in-the-loop verification
The present tests are **open-loop deterministic synthetic replay only**. Full SIL still needs a time-driven vessel dynamics simulator with wind/current/disturbances, actual geometry, sonar/radar/camera models, collision envelopes, turn-rate/stopping-distance constraints, obstacle distribution, calibrated sensor failure distributions and closed-loop candidate navigation controller under a separate risk-assessed development branch.

**Minimum SIL encounter matrix:** reciprocal head-on; crossing from both sides; overtaking and being overtaken through passing-clear; Rule 13 boundary at 22.5° abaft beam; near reciprocal but ambiguous; restricted visibility with radar-only target; three-vessel give-way conflicts; no AIS for fishing/small craft; conflicting AIS/radar; target accelerations; ferry/sudden course change; TSS/narrow-channel; NUC/RAM/fishing/CBD; drifting obstacles; shoreline and shallow-water geofences; high current causing stationkeeping failure; energy-limited return; link-loss during ongoing collision risk; false collision target; GNSS multipath/spoof/jam; radar dropout/occlusion; night and glare; invalid clock/timestamp; high-rate target updates; operator override versus stale command; uncommanded restart after reboot.

**Record per run:** frozen source+configuration digest, random seed, target truth trajectories, all sensor estimates/provenance, ODD/weather, CPA/TCPA estimates and actual collision/near-miss separation, action onset/duration, turning/stopping feasibility, simulator fidelity, commanded and realized vessel states, uncertainty, safety-controller latches, operator interventions, abort and replay checksum. Numerical acceptance thresholds require approval before execution; a single deterministic pass is not statistical confidence.

## D. Hardware-in-the-loop qualification
**Not run.** At the independent safety lab, on a restrained/electrically safe bench, test the actual approved propulsion/MCU hardware separately from the non-actuating screening code. An authorized competent test director must approve any energization.

Test sequence to specify, review and witness: unpowered checks and independent emergency stop; actual sensor synchronization/age and cross-sensor integrity; GNSS/IMU fault injection; AIS omission/spoof conflict; peripheral failure; propulsion feedback mismatch; link drop and command expiry; station-keep geofence violation; recovery corridor invalidation; low-energy/brownout; safe controller watchdog reset; delayed/duplicated remote command; manual override; emergency latch persistence; failover and restart. Do not apply a universal zero-thrust policy; verify the preapproved hazard-specific response with vessel-specific physics.

**Pass conditions must include:** no direct route from LLM/screening modules to actuators, independent safety authority, positive operator identity, monotonically fresh command sequence, demonstrated safe-state transition without prohibited uncontrolled propulsion, independently available abort, instrumentation trace and signed independent witness. Failed tests halt progression.

## E. Controlled sea-trial readiness and evidence
**No sea trial has been performed or authorized by these artifacts.**

Preconditions: local/flag/port/naval authorizations and applicable insurance; approved hazard assessment; vessel power/stability/structural acceptance; sensor and propulsion commissioning; HIL pass against same configuration digest; safe/test operating area and forecast within ODD; qualified master/remote operator and independent safety observer; safety/escort vessel where required; communications redundancy; marked test exclusion boundaries and recovery plan; clear stop-work criteria and environmental protection.

Only the authorized trial team may run approved encounter plans. Use a non-collision test strategy with appropriate stand-off and readily available intervention; do not conduct unsafe deliberate near-miss trials. Independently record observed target truth, separation, time to action, COLREG light/sound correctness, environmental conditions, drift, command logs, manual takeover and adverse-event reports. Trial director signs each run, classifies deviations and commands abort when any minimum safety condition is lost.

## F. Release and blocker closure
- The GitHub CI check must pass **on the actual candidate SHA** and attach the synthetic replay output; it is only software evidence.
- The mandatory independent human COLREG and systems reviews must be signed, findings resolved and risk reduced to an approved residual level.
- Full dynamic closed-loop SIL must pass with vessel-specific characteristics; the present open-loop replay does not meet this condition.
- Actual HIL and controlled sea trials must pass for the approved ODD, with exact source digest/certified configuration and independent observer records.
- Stage C Gemini *advisory* report, Stage D Director Ed25519 approval and Stage E enforcement must be tied to the final candidate source. No retroactive/borrowed signoff.
- Only a qualified human authority may move `AUT-01` from `IMPLEMENTED_PENDING_PHYSICAL_VALIDATION` to `CLOSED`; do not equate software coverage with COLREG compliance.

## Test artifact manifest
`src/core/verification/AutonomyColregsSafetyScreen.ts`: pure candidate-rule / proximity / supervisory screen; `AutonomySensorEvidence.ts`: strict candidate sensor-source agreement, not real fusion; `AutonomySilReplay.ts`: monotonic replay plus non-auto-clearing latched concerns; `tests/autonomyColregsSafetyScreen.test.ts` and `tests/autonomySensorSilReplay.test.ts`: synthetic software regression.

Machine-readable missing evidence is in `evidence/aut01/acceptance-status.json`, intentionally keeping physical and independent requirements OPEN.
