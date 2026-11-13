# MAR-01 — Controlled Marine Verification Procedures (PROPOSED)

**Issue:** MAR-01 / WS-07 · **Revision:** A · **Date:** 2026-11-13  
**Status:** TEST PLANS ONLY — NOT EXECUTED — NOT QUALIFIED  
**Vessel basis:** `USV01_PROJECT_CONTEXT.md` Rev 0.4, pending controlled configuration reconciliation.

These are **test protocols for qualified marine engineers**, not a certificate, design acceptance, or permission for unattended vessel operations. Numerical values and referenced rules must come from the approved vessel basis, equipment suppliers, environmental envelope, qualified testing laboratory and applicable standards. Do not substitute the unrelated 2.5 m / 120 kg preliminary concept. All test environments, loads, sensors, power sources, isolation, personnel safety, calibrated instruments and stop conditions must be authorized by the appointed responsible engineer before test execution.

## Common evidence record for all 13 obligations

Each record needs: `requirementId`, vessel/hull/build revision, CAD/ICD and rigging revisions, full `baselineSha`, `referenceUri`, `referenceSha256`, approved design-limit source and revision, `conditionId`, `verificationProcedureId`, dated procedure and instrument calibration record, raw values with SI units, observed uncertainty and excursions, test authority/witness, deviations, independent technical disposition and human approval record. An asserted PASS flag by itself is not verification.

### VVP-MAR-01 — Launch, recovery and trailer
**Traces:** MAR-LR-01/02/03; STR-01; HYD-01; SYS safety hazards.

1. Establish documented maximum permitted **handling mass**, including battery, payload, growth, wet payload, water retained and handling equipment as applicable, together with exact 3D CG and launch/recovery states. Do not conflate design displacement with suspended load.
2. Approve lifting method and rigging GA (geometry, angles, spreader, slings, attachment points, WLL, inspection criteria, crane/hoist operating limits, wave/current/wind, impact, vessel motion, failed-leg/uneven load cases as applicable).
3. Calculate 3D static and dynamic equilibrium for each permitted case, with **unequal leg load shares**, peak forces and moments, local shell/deck load paths and secondary restraint/tow loads. Record utilization, material properties, allowables, fatigue/buckling and corrosion condition. The `screenLiftingLoadCase` routine can numerically check supplied vertical leg tensions, but does not solve 3D rigging equilibrium or structural stress.
4. Qualified team performs staged handling/transport proof testing using an approved method and calibrated load cells/strain instruments. Measure actual load sharing, deflection, slip, permanent set and inspect attachments after test.
5. **Accept only** when each approved case meets individually approved structural/WLL/test limits, required inspection/proof evidence is complete and an independent structural reviewer verifies calculation vs measured loads. Stop if load redistribution, damage or unexpected rigging behaviour exceeds approved limits.

**Not presently supplied:** handling mass, load-case register, 3D rigging/CG, material allowables, physical proof test.

### VVP-MAR-02 — Sealed hull and electronics thermal integrity
**Traces:** MAR-TH-01/02/03; ELEC/ESS; STR-01; safety.

1. Freeze selected batteries/BMS, propulsion ESCs/motors, controllers, chargers and computers; collect manufacturer continuous/transient dissipation and permitted case/junction temperatures. Construct a component heat map across mission duty and worst combined loads.
2. Build a heat-flow network with contact and interface resistances, hull material, external sink, immersion, low-flow/stagnant-water, fouling and hot air/water assumptions. Compute manufacturer limit margin per component. `screenThermalSteadyState` is **steady-state single-path screening only** and cannot account for common hull heat coupling, transients or thermal runaway.
3. Instrument critical case/junction proxy points, internal/external bulkhead and water/air sinks. Exercise continuous and peak load profiles, hot-soak and post-power-down transients, cooling impairment and defined fault cases in safe controlled facilities.
4. Verify temperature sensor accuracy, protective cutbacks and logging at the selected equipment's actual safety limits. Repeat watertight/ingress checks after thermal cycles and service operations, using correct boundary and exposure test conditions.
5. **Accept only** on actual manufacturer/supplier limit, owner-approved margin, model-to-test correlation limit, seal integrity and independent test review. An IP67 claim applies only to the qualified enclosure/boundary, not automatically the entire vessel.

**Not presently supplied:** selected device dissipation, boundary temperatures, thermal geometry/path, component limits, test records.

### VVP-MAR-03 — Wet-end acoustic payload and watertight interface
**Traces:** MAR-AC-01/02/03; HYD-01; RES-01; STR-01; sensor system ICD.

1. Select actual sensor/transducer and obtain supplier-approved beam/aperture, immersion, noise/flow, electrical/data, EMC, maintenance and coating requirements.
2. Freeze surveyed underwater arrangement: gondola or moonpool geometry, hull penetrations, watertight seals, fastener details, vibration isolators, immersion below the **actual loading waterline** and propulsor wash/appendage clearance.
3. Recompute impact on displacement, CG, hydrostatics, stability, resistance and structural loads. Investigate hull-borne vibration, free surface/bubbles, ventilation, cavitation and flow noise at the full permitted vessel speed and operating conditions.
4. Conduct instrumented inspection/watertight testing and a controlled acoustic/flow trial using independent reference targets/measurements and time synchronization. Assess field-of-view, beam shadowing and loss of performance against supplier limits.
5. **Accept only** when installation/supplier ICD and recorded sea-trial results meet jointly approved limits and the water boundary remains intact after service/refit.

**Not presently supplied:** qualified payload selection, arrangement, supplier ICD, acoustic test evidence.

### VVP-MAR-04 — Corrosion and marine fouling
**Traces:** MAR-FC-01/02; hull/metal interfaces; propulsion and wet-end sensor ICDs.

1. Build a hull/appendage materials and galvanic-couple matrix covering metal inserts, fasteners, pod casings, cables, composite surface, coatings, bonding/isolation and service conditions.
2. Review candidate protective measures against substrate, electrical safety, environmental rules and manufacturer instructions. Never assume cathodic protection is appropriate for the whole composite hull or that transducer faces tolerate ordinary antifouling coating.
3. Perform specified representative corrosion/material-compatibility tests, coating qualification/adhesion checks where applicable, then establish cleaning access, documented inspection intervals and condition-based triggers.
4. Inspect fouling-prone sensor faces, heat rejection interfaces, cooling intakes, fittings and drives; correlate degradation/cleaning with measured thermal and acoustic performance.
5. **Accept only** with traceable corrosion and coating disposition, permitted cleaning method and qualified maintenance schedule for the intended operating area.

**Not presently supplied:** controlled materials list, coatings, operating-water chemistry, exposure and inspection records.

### VVP-MAR-05 — Condensation, bilge, detection and fail-safe alarms
**Traces:** MAR-BC-01/02; ELEC safety; AUT-01 degraded operation.

1. Identify all actual compartment low points, internal condensation surfaces, condensate/bilge collection route, sensor locations and service access for all loading/trim conditions. Define any drains, pressure equalization, separation and ingress boundary.
2. Establish water accumulation/detection criteria (alarm and escalation thresholds, quantities and sampling), moisture/humidity sensor accuracy, power independence, event logging and operator notification conditions from approved hazard analysis.
3. Execute controlled thermal-humidity cycling, ingress/chafe/blocked-drain cases and sensor opens/shorts/disconnections/power-loss fault injection. Record failure discovery and response while monitoring relevant power isolation and environmental precautions.
4. Verify that fault conditions do not mask uncontrolled water accumulation, corrupt safety-critical sensing, or compromise subdivision/ingress resistance. Inspect corrosion/retained moisture and verify repeated serviceability.
5. **Accept only** after actual low-point drawings, alarm threshold rationale, fault-injection logs and inspected post-cycle enclosure integrity meet approved limits.

**Not presently supplied:** finalized subdivision/low-point drawings, approved bilge alarms, test records.

## Acceptance disposition matrix

| Work product | Automated check | External qualification still required |
|---|---|---|
| MAR-LR-01/02/03 | Source and output screening for load-case identity, unequal leg loads, WLL | Real geometry, full force/moment load cases, structure/proof tests and independent review |
| MAR-TH-01/02/03 | Heat-load × thermal-resistance, component case-temperature margin | Actual device/material values, coupled/transient heat, environmental and ingress tests |
| MAR-AC-01/02/03 | Evidence metadata identity and completeness | Selected supplier ICD, hydroacoustics, physical seals and measured water trial |
| MAR-FC-01/02 | Evidence metadata identity and completeness | Materials, exposure/coating, fouling maintenance tests |
| MAR-BC-01/02 | Evidence metadata identity and completeness | Drawings, cycling/fault-injection/ingress tests |

**No MAR-01 physical test or release approval has been performed by ChatGPT.** The PR may be software-ready but the acceptance register must remain `Pending` until authenticated qualified evidence and authorized configuration approval exist.
