# AUT-01 — Autonomy and COLREG Engineering Remediation (2026-11-13)

**Baseline:** `docs/CONSOLIDATED_ACCEPTANCE_REGISTER.md`, criterion AUT-01.
**Disposition:** SOFTWARE SCREEN IMPLEMENTED; INTEGRATION/SIL/HIL/SEA-TRIAL ACCEPTANCE OPEN.
**Owner:** USV-01 navigation/safety engineering; **independent review:** Gemini + qualified maritime reviewer; **approval:** Director, signed against final source SHA.
**Code:** `src/core/verification/AutonomyColregsSafetyScreen.ts`
**Tests:** `tests/autonomyColregsSafetyScreen.test.ts`
**Authority:** Engineering decision-support ONLY. No helm/thrust output, autopilot connection, release permission or regulatory certification.

## Governing regulatory context
Official COLREGs (IMO): https://www.imo.org/en/about/conventions/pages/colreg.aspx .
IMO adopted its non-mandatory MASS Code in May 2026, effective 1 July 2026 (https://www.imo.org/en/mediacentre/hottopics/pages/autonomous-shipping.aspx).
It does **not** authorize this craft to navigate autonomously. Flag-state, naval-operator, coastal-state and local harbour rules require separate applicability review.

## Requirements-to-test traceability
| ID | Requirement / failure-mode guard | Evidence | Status |
| --- | --- | --- | --- |
| AUT-REQ-001 | Lookout and integrity inputs must not be silently treated as valid; never substitute AIS alone for a verified lookout | AIS-only, stale-track, degraded-lookout cases | Synthetic logic only |
| AUT-REQ-002 | CPA/TCPA must be unit-consistent, with no unsafe extrapolation of negative TCPA; track uncertainty must be explicit | Head-on CPA/TCPA analytical case; missing uncertainty case | Synthetic logic only |
| AUT-REQ-003 | In-sight overtaking takes classification priority; head-on and crossing are candidates, not binding legal findings | Overtaking, head-on, port/starboard cases | Synthetic logic only |
| AUT-REQ-004 | Rule 19 must be assessed separately from in-sight Rules 13–17 | Restricted-visibility and unknown-regime tests | Synthetic logic only |
| AUT-REQ-005 | Vessel type, narrow channel/TSS, local constraints and ambiguity must escalate without guessed legal obligations | Fishing, channel, unknown type tests | Synthetic logic only |
| AUT-REQ-006 | Lost link must not blindly execute zero-thrust or return home; fail-safe uses separately approved safety controller | Link-loss candidate/degraded tests | Architecture only |
| AUT-REQ-007 | Human emergency override and sensing/propulsion safety inhibit mission autonomy; no unvalidated command actuation | Override/sensor fault/always-null command tests | Software screen only |
| AUT-REQ-008 | Multi-target ambiguity, duplicates and missing or stale evidence trigger escalation | Duplicate and invalid evidence tests | Synthetic logic only |
| AUT-REQ-009 | Every result must preserve source evidence, configuration version, review requirement and uncertified status | Type-level and assertion tests | Synthetic logic only |
| AUT-REQ-010 | Runtime supervisory state, independent low-level MCU and human command arbitration shall be proved in SIL/HIL | No evidence submitted | OPEN |
| AUT-REQ-011 | Repeated COLREG encounter performance, collision avoidance, lights/sound signals, safe speed and all ODD constraints shall be validated | No sea trials submitted | OPEN |

## Signal and authority architecture
Sensor adapters (radar, AIS, vision, GNSS/heading, acoustic lookout, depth/geofence) -> time-aligned track estimator with provenance and covariance -> hazard monitor / COLREG applicability classifier -> **advisory result, risk and uncertainty logger** -> qualified operator and separately approved supervisory safety-controller input. **There is NO connection from this module to actuators.**

Priority **for controller design review**, not an implemented actuator arbitration:
1. Physically independent emergency-stop/interlocks and approved hazard-specific safe reaction.
2. Human emergency intervention, with positive identity, freshness, command authority and audit attribution.
3. Safety supervisor: sensor/nav integrity, geofence, depth, collision alerts, propulsion and energy.
4. Legally applicable navigation duties, lookout and safe-speed constraints; unresolved interpretation escalated.
5. Remote operator command valid only within safety envelope.
6. Mission autonomy permitted only within approved ODD and independently validated safe controller.

Never interpret 'human override' as an unconditional unsafe maneuver. Independent supervisor must remain effective. Lost supervisory link requires rejection of expired remote commands, active local assessment, and only **preapproved** stationkeeping or recovery corridors; otherwise use the hazard-assessed degraded mode. Blanket zero thrust and blind return-to-home are prohibited. Stationkeeping and recovery fields in this screen are candidate labels, not actions.

## Preliminary risk register (unclosed)
| Hazard | Potential cause | Mandatory control/evidence |
| --- | --- | --- |
| H-AUT-01 Collision or near miss | CPA model mismatch, incomplete contacts, manoeuvre dynamics | Independent CPA oracle; radar/vision/AIS field correlation; SIL/HIL/sea trials |
| H-AUT-02 COLREG duty misclassification | Rule 13 boundary, Rule 18 class, Rule 19 regime, TSS/channel | Qualified master/maritime reviewer, multi-target scenario library, Rule-by-rule legal applicability |
| H-AUT-03 Undetected small/non-AIS target | Radar shadow/clutter; camera glare/fog; AIS absent | ODD sensor coverage mapping, detection probability and false-alarm experiments |
| H-AUT-04 Uncontrolled drift after link loss | Wrong default to zero thrust | Drift/current/wind model, hazard-specific approved safe state and recovery test |
| H-AUT-05 Collision during recovery | Blind return-to-home, unknown channel | Approved mapped corridor, clearance/obstacle supervision, geofence and depth validation |
| H-AUT-06 Unintended propulsion actuation | AI/LLM output mistaken as command; stale authority | Independent MCU interlock, authenticated command state machine, deny-by-default HIL |
| H-AUT-07 Multi-contact conflicting obligations | Independent pairwise rules do not compose | Multi-target constraint-based safety validation and operator escalation |
| H-AUT-08 Loss of integrity | GNSS spoof/jam, stale tracks, radar/AIS disagreement | Integrity monitors, cross-sensor timestamps, fault injection, cautious degradation |
| H-AUT-09 Unsafe speed | Fog/traffic, braking/reaction limits, sea conditions | Stopping-distance envelope and Rule 6/19 safe-speed tests |
| H-AUT-10 Missed COLREG sound/light obligation | Missing Rules 20–37 I/O integration | Navigation-light/day-shape, Rule 34/35 signal audit and physical tests |

## Screening assumptions and non-claims
- `cpaAlertThresholdNm`, `lookAheadMinutes`, `nearHeadOnDeg` and track age are **synthetic test-envelope inputs**, not approved USV limits or COLREG-defined numeric thresholds.
- `rangeStdNm`, `bearingStdDeg`, `speedStdKnots` are simple characterisation proxies, **not** fused covariance. Their linear conservative bound is not a quantified probability or clearance guarantee.
- No sensor fusion algorithm, track association, vessel dimensions, stopping/turning dynamics, bathymetry, wind/current prediction, uncertainty propagation or Rule 8 action-planner is claimed here.
- Rule 5 requires sight/hearing **and** all available appropriate means. A programmatic flag cannot establish a proper lookout.
- Geometry cannot safely resolve ambiguous legal facts or Rule 2 special circumstances. In-sight Rule 13/14/15/17 classification is a candidate screening aid only, never a final seamanship judgment.
- A single sensor, a single scenario suite, or a 'CPA_SCREEN_NEGATIVE' label does **not** establish collision-free water.
- For deployment, machine-readable ODD, measured sensor quality, ownship dynamics, regulatory jurisdiction, radio loss thresholds and bounded controller behaviour are required; all remain unapproved until evidenced.

## Objective closure gates
1. **CI:** `npm run lint`, `npm test`, `npm run build` on the final immutable commit; attach logs and replayable scenario evidence.
2. **Independent oracle:** qualified maritime reviewer independently validates all Rule 2, 5–10, 13–19, 20–37 applicability, especially overtaking/ambiguous/restricted visibility; document corrections.
3. **SIL:** repeatable open/closed-loop multi-contact scenarios, track dropout/false detection, environmental disturbances, all ODD boundaries, contradictory targets, no-AIS traffic, limited sea room and decision timeliness. Define statistically justified acceptance thresholds.
4. **HIL:** actual sensors, GNSS/heading, watchdog, independent safety MCU, propulsion interlocks, command freshness/authentication, emergency-stop and link-loss safe-state transitions. Verify no unsafe latent outputs and independent abort.
5. **Sea trial:** supervised restricted-water and open-water testing with safety vessel, risk assessment, and maritime authority approvals; document abort/contingency execution, detection performance, CPA and COLREG conduct.
6. **Governance:** independent Gemini review plus qualified naval/maritime safety review, controlled requirements/Obsidian links, Stage C/D/E director cryptographic approval on the final SHA. The same GitHub source SHA must be reflected in Google AI Studio/Drive where applicable.
7. No claim of operational autonomy, 'COLREG compliant', or AUT-01 **CLOSED** before all relevant gates pass.

## Outstanding integration boundary
The existing `TOOL-COLREGS-01` remains an analytical, separately governed tool. This new module is **not** wired to the mission dashboard, Guidance/Navigation/Control, ROS, or propulsion. PR #36 includes further overlapping AGT-02 safety changes; reconcile in review before merge and rerun all tests on the resulting baseline.
