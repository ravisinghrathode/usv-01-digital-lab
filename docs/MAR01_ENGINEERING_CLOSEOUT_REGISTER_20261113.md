# MAR-01 — Physical Engineering Closeout and Configuration Freeze Register

**Issue:** MAR-01 / WS-07 · **Status:** ENGINEERING RELEASE HOLD · **Prepared:** 2026-11-13  
**Control:** Applies to USV-01 baseline described by `USV01_PROJECT_CONTEXT.md` Rev 0.4, subject to exact-build verification.  
**Scope of this file:** Identifies actionable work, design equations/hold points and required primary evidence. This document is **not** a calculation certificate, signed design baseline, test report or authorization to build, launch or operate.

## 1. Evidence inventory and disposition

Repository `evidence/` has `aut01/` and `live-agents/`; no MAR-01-qualified evidence package is present. The `docs/MAR01_MARINE_SYSTEMS_INTEGRATION.md` and `docs/MAR01_VERIFICATION_PROTOCOLS.md` are test plans and proposed ICDs rather than signed outcome records. Original PR #42 merged while the PR-head Stage E gate was failing; the successful **post-merge** CI does not supply an independent technical reviewer or the exact-baseline signature. The user/project engineering director or delegated authority must independently verify this change under source control.

**Existing repository context is an asserted design basis, not a measured ship:** nominal LOA ~11.2 m; LWL 10.5 m; beam 2.9 m; 6.2 t design displacement; ~0.65 m draft; lightweight ~3.75 t; 48 V nominal LFP energy storage with 60 kWh nominal/54 kWh usable energy; claimed 182 kW shaft power for 22 kn sprint; 14 kn cruise. These are not verified equipment, geometry, loadcase or certified battery limits. In particular 6.2 t **design displacement is not automatically** safe lifting/handling mass. No values from the separate 2.5 m / 120 kg concept may be reused.

## 2. Configuration freeze input register

**Only named qualified engineers/suppliers may release the missing actual values** after confirming source revision and calibration. Units and provenance are mandatory.

| ID | Unfrozen engineering input | Required primary source | Main dependency |
|---|---|---|---|
| CFI-LR-01 | Actual lift/haul mass [kg], 3D CG [m] in vessel datum, fluids/ballast/bilge and maximum payload | Build/weight survey, rigging condition and measured stability/weight dossier | STR-01, HYD-01 |
| CFI-LR-02 | Crane/spreader/sling locations [m], attachment geometry and safe WLL [N], permissible lifting environment | Dimensioned GA, certified rigging specification, equipment records | STR-01, OPS |
| CFI-LR-03 | Transport cradle support and 3-axis restraint accelerations [m/s²] | Trailer/transport design basis and governing route, test facility | STR-01 |
| CFI-TH-01 | Selected cells/BMS, ESCs, motors, pod thermal paths, CPU and power electronics; duty-specific heat loss [W] | Actual part numbers and supplier continuous/transient loss curves | ELEC, PROP |
| CFI-TH-02 | Hull laminate/metal thermal interfaces, sink temperature [K], wetted area [m²], fouling/low flow and thermal contact resistances [K/W] | Detail drawings, material properties, measured prototype and environment | STR-01, PROP |
| CFI-TH-03 | Manufacturer maximum case/junction values [K], power/temperature shutdown design, environmental exposure and seal rating | OEM data sheets; accepted electrical safety and ingress test plan | ELEC, safety |
| CFI-AC-01 | Selected acoustic transducer/multibeam model, acoustic face and beam/flow exclusion zones, connector/power/data interfaces | Supplier-signed ICD and actual sensor drawing | PAYLOAD |
| CFI-AC-02 | Moonpool/gondola structural cutout and local reinforcements, immersions, bubble/flow interference and appendage mass | Frozen hull/payload CAD, operating waterlines, supplier flow limits | HYD-01, RES-01, STR-01 |
| CFI-FC-01 | Controlled materials/couples, metal inserts, fasteners, surface finish, water chemistry, paint/coating product and supplier face restrictions | As-built material BOM and supplier corrosion/coating certificates | STR, PAYLOAD |
| CFI-BC-01 | Compartment low points, drains/segregation, wire penetrations, expected condensate and leakage paths | As-built compartment GA and controlled boundary drawing | STR, ELEC |
| CFI-BC-02 | Water/humidity sensors, sensor placement, detection thresholds, safety power path, fault responses | Supplier data, FMEA and independent control-system test | ELEC, AUT-01 |

**Do not resolve missing inputs by treating generic template numbers, demonstration outputs, public web data or AI estimates as actual USV-01 measured values.**

## 3. Engineer-to-engineer computational hold points

### Lifting & transport
- Record every permitted rigging configuration, **actual** lifting mass and vessel-frame CG with tolerance.
- Sum 3D forces and moments for each load case; force-share vectors must be solved from the actual sling/crane geometry and stiffness, not four equal shares. In-plane simplification: if the vertical leg reaction is `R_i` [N] and sling angle is `theta_i` from vertical, then nominal leg tension is `T_i = R_i / cos(theta_i)`; this is **not** the full 3D rigging solution.
- Apply project-authorized dynamic effects and fatigue/snag/impact cases, using governed allowable stresses, buckling and interlaminar failure criteria. Validate attachment-to-hull load paths by independently reviewed FEA/hand calculation and instrumented proof tests.
- Transport restraint demand per prescribed axes and handling case requires combined gravity/inertial accelerations with actual cradle interfaces; do not claim roadworthiness from a sling check.

### Power and sealed-hull thermal
- The baseline's stated 182 kW **shaft power** and 48 V nominal architecture imply an ideal lower-bound electrical drive-bus demand of `P_shaft / V_nominal = 3791.7 A` **if the shaft power were all supplied at nominal 48 V and 100% conversion efficiency**. Real current is higher with losses, and this is not a validated motor/bus selection. It is a critical architecture/interface hold point, **not proof that the design is impossible**. Check distribution voltage, battery topology, converter/motor ratings, thermal heat rejection, conductor/fuse/contactors and fault currents against selected parts.
- At the claimed 182 kW shaft power, even an impossible 100%-efficient supply of 54 kWh *usable* energy would last at most `54/182 ≈ 0.297 h` (17.8 minutes) at this demand; sprint and advertised endurance cannot be inferred to occur simultaneously. Actual sprint discharge allowance and duty profiles need independently signed sizing.
- Compute component thermal boundaries via device losses and full resistance network including coupled shared hull surface, stale water/low-water-flow, fouling, solar load, heat-soak and transient conditions. `screenThermalSteadyState` alone is **not** coupled thermal or enclosure certification. Verify by calibrated physical load testing, transient data and post-thermal sealing test.

### Wet-end acoustic integration
- Freeze supplier selection, the watertight structural boundary, aperture/no-coating zones, cable/connector strain relief and service access. Revise mass/CG and hydrostatics/stability when payload and hull opening are finalized.
- Compare supplier permissible beam/flow/noise envelope with sea-trial measurements under full load, speed, sea state and propulsion duty range. Validate by independently reviewed sensor accuracy/noise measurements and ingress tests after any service.

### Corrosion, fouling, drainage and bilge
- Document actual composite/metal interfaces, galvanic isolation, biofouling access and materials compatible with selected sensor acoustic faces. Reject general antifouling coating on faces without OEM approval.
- Finalize compartment low points in **all approved trim/heel states** and demonstrate trapped water cannot silently disable critical batteries, insulation or essential sensing. Cycle humidity/thermal and test loss-of-power, sensor short/open and blocked-drain alarms; witness actual protective response.

## 4. Physical verification and signature plan

| Requirement | Test/analysis to execute with primary evidence | Reviewer discipline | Acceptance result |
|---|---|---|---|
| MAR-LR-01 | Measured handling mass/CG + approved load case set and marine environment | Weight & structural | NOT TESTED |
| MAR-LR-02 | 3D rigging/FEA/attachment sizing + load-cell proof tests and NDT/inspection | Independent structural | NOT TESTED |
| MAR-LR-03 | Cradle/tie-down loads, transport acceleration basis, restraint qualification | Structural & transport | NOT TESTED |
| MAR-TH-01 | Selected-source heat loads, full worst-case coupled thermal model | Electrical/thermal | NOT VERIFIED |
| MAR-TH-02 | Instrumented temperature time-series, shutdown and margins under all duty states | Thermal safety | NOT TESTED |
| MAR-TH-03 | Post-thermal boundary/penetration watertight testing with selected environmental procedure | Environmental/QA | NOT TESTED |
| MAR-AC-01 | Supplier transducer ICD, package geometry and electrical/data connectors | Supplier/pay-load owner | NOT SELECTED |
| MAR-AC-02 | Flow acoustics, cavitation/bubble, beam blockage and calibrated sea trial | Hydrodynamic/acoustic | NOT TESTED |
| MAR-AC-03 | Local opening strength, vibration, pressure/seals/service refit proof | Structural/environmental | NOT TESTED |
| MAR-FC-01 | Materials/corrosion matrix and relevant qualified exposure compatibility tests | Materials/QA | NOT TESTED |
| MAR-FC-02 | OEM-safe antifouling maintenance/inspection qualification | Materials/payload | NOT TESTED |
| MAR-BC-01 | Measured/surveyed low-point drainage and water segregation drawings | Mechanical/electrical | NOT VERIFIED |
| MAR-BC-02 | Recorded thermal/humidity cycling, bilge alarm and sensor/power fault injection | Electrical/safety/QA | NOT TESTED |

The `assessMarineEvidence` intake cannot authenticate these records or release MAR-01. Retain all independent review and human-authority requirements. Exact controlled reference URI + SHA-256 digest, test configurations, calibration, conditions, limits, deviations, reviewer disposition and final authorization must be attached for each row before status may change.

## 5. Governance containment and sign-off

- **Software:** Previous PR #42 has been merged; note that a successful `push` pipeline does not execute PR-only Stage C/D/E. Owner/direct merge policy, required status checks and bypass rules must be checked by an authorized repository administrator (connector was denied this permission). A green push pipeline must never be represented as proof of mandatory PR review.
- **Independent engineering:** Obtain a named reviewer with domain qualifications for structural, thermal and electrical safety, acoustic payload, corrosion and bilge. A deterministic or AI-generated advisory report is not the reviewer sign-off.
- **Director:** Use the exact reviewed baseline digest and verified approval record after changes. Do not invent, replay or copy a signature from any earlier baseline.
- **Physical release:** Restrict use to documentation/simulations until the responsible engineer has independently checked and accepted the vessel's as-built conditions and all 13 MAR-01 requirements.

**Closeout decision:** MAR-01 remains OPEN. The missing physical evidence and qualified human approvals cannot be produced by a repository edit or remote AI alone.
