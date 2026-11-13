# USV-01 Project Context

**Context revision:** 0.4  
**Last updated:** 2026-11-12  
**Project state:** HISTORICAL REV 0.4 DOSSIER — design authority and numerical baseline are UNDER RECONCILIATION; Gate 0 not approved

## Mission

Develop an unmanned surface vessel (USV-01) for Coastal & Harbor Security / Autonomous Patrol. Rev 0.4 contains historical numerical proposals and claimed past approvals, but current acceptance records do NOT establish approved hull offsets, mass/CG, hydrostatics, propulsion, structure or release evidence. None of these values may be treated as verified by a new agent campaign or promoted to the controlled vessel baseline before Gate 0 configuration reconciliation and independent review.

## Engineering disciplines

- SYS — Systems engineering and requirements
- NA — Naval architecture
- HYD — Hydrodynamics
- STR — Mechanical and structural engineering
- ELEC — Electrical and energy architecture
- PROP — Propulsion integration
- SWA — Software, autonomy and safe navigation
- VVT — Verification and validation
- INFRA — Engineering compute and development infrastructure

## Information ownership

- GitHub: source code, common project context, schemas and version history.
- Google AI Studio: Gemini-powered application development and future engineering assistance.
- ChatGPT: engineering analysis, research, independent review and verification planning.
- Obsidian: knowledge graph, linked notes, research notes, glossary and design knowledge.
- Google Drive: controlled documents, drawings, calculation reports and large files.
- Linear: issues and workstream execution.

## Core engineering rules

1. Never invent vessel dimensions, mass, speed, endurance, payload capacity, materials, electrical ratings, operating limits or acceptance criteria.
2. Use TBD when required inputs are absent.
3. Separate approved baseline, proposal, assumption, estimate and illustrative starter data.
4. Preserve units, coordinate frames, reference conditions, solver/software version and revision for every analysis.
5. Every requirement should be allocated to one or more subsystems and linked to a verification method.
6. Every design decision should record alternatives, rationale, consequences, owner and approval state.
7. Every simulation should record geometry/input revision, boundary conditions, assumptions, mesh/model quality, convergence checks and evidence.
8. Safety-critical conclusions require qualified human review, independent verification and appropriate physical testing.
9. AI-generated outputs are proposals until reviewed and approved by an authorized engineer.
10. No live vessel commands, actuator control, weapon-targeting or combat-payload functions are in scope for this Digital Lab.
11. Closed-Loop Simulation Binding: Whenever agents compute or update boat design parameters (dimensions, mass, KG, hydrostatics, resistance, sensor ranges, COLREGS kinematics), the visual 3D model and realtime physics simulation of that exact vessel must automatically be updated and rendered to visually verify the physical consequences of the design.

## Compute context

The local development Mac is Apple Silicon with 8 GB unified memory. Use it for documentation, browser research, VS Code, Git, light Python analysis, KiCad and modest CAD. Heavy CFD, FEA and simulation should run on a separately validated remote Linux compute host. Google Cloud TPU access is reported, but TPU generation, host CPU/RAM/disk and actual provisioned configuration are not yet confirmed. Do not assume the TPU accelerator is a drop-in CFD/FEA GPU.

## Historical numeric scenario — Revision 0.4 (NOT VERIFIED / NOT AUTHORIZED FOR DESIGN RELEASE)

- **Mission Statement & CONOPS:** Coastal & Harbor Security / Autonomous Patrol (surveillance, dynamic obstacle detection, perimeter patrol, intruder interception).
- **Operating Area & Environmental Envelope:** Coastal littoral waters, fairways, harbor approaches (Operational up to Sea State 3-4).
- **Vessel Scale & Hull Concept:** Medium Tactical Craft (LOA ~11.2m, LWL 10.5m, Beam 2.9m, Draft 0.65m), Deep-V composite planing monohull (20° transom deadrise).
- **Displacement & Mass Properties:** 6.2 tonnes design displacement; lightship mass 3,750 kg (+ 346 kg design growth margin); composite LCG 4.11m from transom (aligned with LCB 4.41m); KG 0.66m.
- **Hydrostatics & Intact Stability:** Historical unsupported GM claim of 1.32 m; NO ISO/IMO compliance or loading-case stability conclusion is established. Approved geometry, KG and GZ evidence remain TBD.
- **Propulsion & Powering Architecture:** Historical pure-electric twin-pod proposal and 182 kW / 22-knot assertion; resistance, propulsive efficiency and installed component ratings are UNVERIFIED. Do not use for procurement.
- **Energy Storage System:** Lithium Iron Phosphate (LiFePO4) 48V modular traction battery bank (60 kWh nominal, 54 kWh usable energy, IP67 sealed with cell runaway containment barrier).
- **Speed, Range & Endurance:** Cruise speed 14 knots; sprint speed 22 knots; 8.5–12 hour operational loiter/patrol endurance.
- **Autonomy & Navigation Basis:** IMO COLREGs 1972 statutory rules (Rules 13, 14, 15), ROS 2 Humble executive stack, micro-ROS CAN FD motor controllers.

## Historical decision hypotheses — require independent source and Project Lead review

1. **Gate 1 — Sensor Complement:** Simrad HALO24 Pulse Compression FMCW Radar (24nm, 60 RPM mode) + Ouster OS1-32 Gen 2 LiDAR (32-ch, 120m, IP68/IP69K) + FLIR SeaFLIR 230 Cooled MWIR/HD EO Gyro Gimbal + Furuno FA-170 Class-A AIS.
2. **Gate 2 — RF / Telemetry Links:** Primary Silvus SC4200EP 2x2 MIMO IP mesh (5.8 GHz, 10–20 Mbps up to 18 km LOS) + Backup Iridium Certus 100 L-band SATCOM with 15-second heartbeat failsafe loiter transition.
3. **Gate 3 — Proposed Sea Trial Targets (UNVERIFIED):** Historical VVP-001 to VVP-006 thresholds are draft targets, not an approved test plan, calibration, sea-trial evidence or proof of vessel safety.

Use stable IDs such as `USV-NA-001`, `ADR-002`, `RSK-001`, `SIM-001` and `VVP-001`. Obsidian notes should use `[[wikilinks]]`; controlled Google Drive documents should be cited by stable URL and revision.

**Configuration boundary:** A proposed 2.5 m / 120 kg craft is a distinct unapproved concept. Do NOT combine its parameters with the historical ~11.2 m / 6.2 t dossier. Current Project Lead direction is agents research sourced options, compare alternatives, then seek explicit project-level concept selection; safety-critical engineering acceptance and Director cryptographic sign-off remain separate mandatory gates.