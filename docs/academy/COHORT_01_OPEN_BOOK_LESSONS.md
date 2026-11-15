# Naval AI Lab Academy | Cohort 01: Open-Book Foundational Study Pack

**Programme:** USV-01 A01–A26 / Phase I of actual agent education  
**Status:** LESSONS PREPARED, NOT DELIVERED TO LIVE AGENTS, NOT EXAMINED  
**Issue date:** 2026-11-15  
**Audience:** A05 Hull Form, A06 Hydrostatics, A07 Resistance, A14 Power, A17 Collision-Avoidance Reasoning  
**Authority:** Supervised, non-operational research only; no vessel configuration approval or helm/actuator commands.

This learning pack is a deterministic **source-controlled lesson**. Its existence is not an AI training or competency receipt. When the trusted Codex host is available, the Academy runner must deliver appropriate lessons to A05/A06/A07/A14/A17, record the model's actual responses separately, and then arrange *different, blind, independently marked* tests. Never expose actual blind test answers to the trainee.

## F01–F05: mandatory common foundation

1. **F01 | Units and governing physics.** Write equations with dimensional checks; state whether a value is measured, assumed, calculated, sampled or TBD. Do not transfer results between different hull configurations.
2. **F02 | Engineering traceability.** Cite requirement IDs, configuration IDs, coordinate frame, source revision and verification method. Classify design suggestions as proposals, not validated facts.
3. **F03 | Marine safety and degraded modes.** List operating boundary conditions; distinguish loss-of-link, poor lookout, unknown loading, thermal choking and launch/recovery loads. A blanket "zero thrust" or simple "GM positive" is not a complete safe-state/stability case.
4. **F04 | Verification versus validation.** Compare dimensional and regression checks against independent references and uncertainties. Distinguish an executable calculator, an engineering accuracy benchmark, certification and acceptance by the Engineering Director.
5. **F05 | Sources, rights and authenticity.** Open references only from verified permitted sources. A standards identifier is not proof of an accessible licensed document. Flag missing pages, applicability uncertainty and unconfirmed source editions. Do not paste restricted documents into public GitHub.

### Source candidates to verify before authorised study

- **USV-01 internal:** USV01_PROJECT_CONTEXT.md, docs/AGT02_NUMERICAL_SAFETY_CASE_20261113.md, docs/AGENT_DESIGN_LOOP_AND_SOLVER_PROTOCOL_20261113.md; verify exact Git SHA in each study receipt.
- **Hydrodynamics experimental method:** ITTC procedure register (2024 revision 10): https://www.ittc.info/media/11718/0_0.pdf
- **Resistance tests:** ITTC 7.5-02-02-01, 2021 revision 05: https://www.ittc.info/media/11780/75-02-02-01.pdf
- **Navigational-rule overview:** IMO COLREG official summary: https://www.imo.org/en/about/conventions/pages/colreg.aspx
- **Restricted textbooks/class rules:** Examples such as SNAME PNA, DNV, ISO standards must be acquired and permission-checked through authorized channels; absence MUST be reported as a gap.

The URLs above are *references to inspect*, not claims they were downloaded, verified under licence, embedded or ingested by any agent. Web sources can update: each actual study must record access date, page version, license/rights decision and content digest when bytes are obtained.

---

## A05 | Hull Form & Parametric Geometry

**Learning objective:** Derive form coefficients from consistently defined reference dimensions; reconcile volume and mass. Flag the difference between a cuboid screen and 3D hull offsets.

**Worked open-book example (synthetic):** LWL 10 m, BWL 2.5 m, draft 0.6 m, seawater density 1025 kg/m³, displacement mass 5500 kg. If displacement volume is V=m/rho, then V=5.365854 m³ and Cb=V/(LWL × BWL × draft)=0.357724 (dimensionless). **Not** Cb=0.45. If one input says Cb=0.45 with the above mass/geometry/density, identify the inconsistency and HOLD the baseline.

**Practical exercise:** State the source required for length/beam/draft, describe how Cb and Cp/Cm/Cwp must be calculated or bounded using hull offsets, explain why a rendered 3D preview does not establish immersed volume.

**Failure probes:** Units mixed (tonnes versus kilograms); incorrect beam for one demi-hull of a catamaran; inconsistent mass/volume; using draft or KG without load case.

**Verified-tool candidate:** TOOL-HYDROSTATICS-01; preserve its actual input/output and call receipt, not a text claim that it ran.

## A06 | Hydrostatics & Intact Stability

**Learning objective:** Understand hydrostatic centre, transverse metacentric radius, free-surface and load-case dependence; reject unsupported GZ/class compliance claims.

**Worked open-book example (synthetic rectangular barge only):** For a box with beam 2.5 m and draft 0.6 m, KB=T/2=0.30 m and BMt=B²/(12T)=0.868056 m. For sourced KG=0.80 m, screen GMt=0.368056 m. If KG is unknown, GMt must remain **TBD**, not a fabricated positive value. This barge formula MUST NOT be used to certify a non-rectangular actual USV or to infer large-heel GZ.

**Practical exercise:** Require separate hull-offset/loading evidence, righting lever curve, downflooding points, free-surface moments, applicable code determination and independent calculation. Explain why a positive preliminary GM is insufficient to assert safety.

**Failure probes:** Missing KG; free surface ignored; wrong waterplane second moment; treating an ITTC resistance test as a stability certificate; treating a parametric screen as actual model hydrostatics.

**Tool candidates:** TOOL-HYDROSTATICS-01, TOOL-OFFSET-HYDROSTATICS-01, TOOL-TRIMMED-HYDROSTATICS-01. Enforce the registry's exact mandatory tool list.

## A07 | Resistance & Powering

**Learning objective:** Use Reynolds/Froude similarity and separate experimental resistance, friction line, uncertainty and effective power from propulsive-efficiency assumptions.

**Worked open-book example:** A 10 m LWL vessel at 15 knots has speed U=7.716667 m/s. With g=9.80665 m/s², Fn=U/sqrt(gL)=0.779237 (dimensionless). Classification of regime from this number alone is preliminary, geometry dependent and not a verified resistance-speed curve. Effective power is P_E=R_T × U, only if a sourced/validated total resistance R_T exists.

**Practical exercise:** Specify a resistance-vs-speed dataset with water temperature, wetted geometry, sinkage/trim, calibration, scale/uncertainty and model-to-full-scale extrapolation limitations; identify when Savitsky/Holtrop-Mennen assumptions fail.

**Failure probes:** Assuming generic "hull efficiency"; using 0.779 as measured drag; treating a generic 15% reduction as demonstrated; using unmeasured CFD drag as tank test evidence.

**Tool candidate:** TOOL-RESISTANCE-01 with traceable calculator receipt.

## A14 | Electrical Architecture & Endurance

**Learning objective:** Compute duty-cycled loads, usable energy, preliminary duration and current, while maintaining cable/protection/thermal evidence gaps.

**Worked open-book example (synthetic):** Battery 120 kWh, usable depth of discharge 0.8. Consumers: propulsion 6000 W continuous; radar 450 W + 100 W intermittent at 50% duty; autonomy 150 W; communications 80 W + 40 W intermittent at 30% duty. Average 6000+450+50+150+80+12=**6742 W**. Usable energy=96 kWh, preliminary ideal energy/average-load endurance=**14.2391 hours**, excluding conversion loss, aging, thermal derating, mission reserve and variable sea loads. At 48 V the same average corresponds to ~140.46 A **ideal bus estimate**, not a certified cable/fuse design.

**Practical exercise:** Build load cases for transit, loiter, degraded autonomy and emergency return with actual component datasheets, reserve policy and heat-soak measurements. Clearly separate preliminary calculations from marine electrical approval.

**Failure probes:** Treating peak as average; omitting intermittent duty; claiming 14.24 hours as guaranteed sea endurance; no emergency power reserve; assuming battery usable depth of discharge independent of temperature.

**Tool candidate:** TOOL-ELECTRICAL-01 or the exact mandatory electrical tool listed in AgentRegistry, never fabricate a tool ID or execution trace.

## A17 | Navigation & COLREG Reasoning

**Learning objective:** Check collision risk kinematics and applicable rule preconditions without commanding helm or substituting a deterministic CPA screen for safe autonomy.

**Worked open-book example (synthetic, simplified level plane):** Own vessel heading true north 0° at 15 kn. Target initially 2 nautical miles away at true bearing 45°, travelling true west 270° at 12 kn. With (E,N) axes, relative position (sqrt(2),sqrt(2)) nm and relative velocity target minus own (-12,-15) kn. Assuming constant velocities, TCPA=-r·v/|v|²=**6.20874 min** and DCPA=**0.220863 nm**. These are *idealized kinematics*, not a COLREG decision, and depend on uncertain sensor measurements.

**Practical exercise:** Identify whether vessels are actually in sight (Rules 11–18) or visibility is restricted (Rule 19); identify status/type, safe-speed, observation, rate of bearing change and radar uncertainties. A17 must flag missing Rule 5 lookout evidence and avoid issuing numeric helm setpoints.

**Failure probes:** Interchanging true/relative bearings; sign error for relative velocity; using TCPA without CPA; applying Rule 15 with no verified "in sight" condition; proposing dangerous loss-of-link zero-thrust drift.

**Tool candidate:** Exact registry-mandated COLREG/CPA deterministic checker; retain its executed trace if used.

---

## Student output contract (same for each role)

Output the following sections in plain text or structured JSON **only after the actual agent session**:
- Verified identity: canonical role, runtime role, source commit SHA, runtime provider and model metadata, execution mode, timestamp.
- Materials actually accessed: URI/path, revision, rights/applicability check and authentic content checksum if available.
- Key principles: formulas, units, coordinate frame, assumptions, and validity limits.
- Worked exercise: intermediate quantities and result, checked against deterministic tool where applicable.
- Adversarial review: enumerate at least two failure modes and explain HOLD conditions.
- Knowledge gaps: inaccessible references, unverified inputs, missing independent benchmarks.
- Self-reported confidence: advisory only, not a grade.
- Safety authority: engineering release false; physical command permissions false.

## Completion and handoff

This is a **teaching resource**, not a blind examination or model-memory update. No agent receives a study pass merely by being listed here. An actual authenticated Codex session must use source-pinned open-book study and return an audit receipt. A different, unseen assessment must be independently scored, then signed by the reviewer and Director before the agent is assigned supervised research authority. The lesson's worked results may be used for practice but must never be recycled unchanged as a blind test.
