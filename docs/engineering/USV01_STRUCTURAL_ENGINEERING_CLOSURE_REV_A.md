# USV-01 Structural Engineering Blocker — Controlled Closure Basis

- ID: STR-BLK-001
- Change: ECR-20261113-004
- Revision: A, 2026-11-13
- Status: **OPEN — software guardrails implemented, physical design unverified**
- Requirement: REQ-OPS-001 (proposed structural launch/recovery and transport)
- Baseline conflict: `src/data/initialProjectData.ts` is a sample 6.2-tonne / high-speed example; `usv01_parameters.yaml` outside this repository is a separate proposed 120 kg / 2.5 m concept. **No merging those geometries, loads, speeds or material selections without an explicit controlled configuration decision.**

## Remediated digital-lab defects

1. The mechanical workstream no longer presents itself as nominal while structural basis is unresolved.
2. Illustrative 45 kPa slamming, 14.2 kN·m bending, and 2.5g lift loads are **not** approved design cases, and alleged FEA/panel pass results are reset to TBD.
3. Sample composite material is flagged illustrative rather than selected; sample metallic strength properties are not certified MTRs or weld allowables.
4. New `TOOL-STRUCTURES-LIFT-01` provides traceable gravity, vertical reaction, sling tension and horizontal component magnitude calculations for **externally established** reaction fractions and sling angles. It never verifies 3D equilibrium, lifting safety or local structural capacity.
5. Existing `TOOL-STRUCTURES-01` slamming scantling output remains an **uncorrelated preliminary empirical screen**, not ISO/DNV verified.

## Required structural load-case register

| Case | Physical effect | Data required | Evidence and acceptance |
| --- | --- | --- | --- |
| STR-LC-01 | Hydrostatic pressure, local bottom and side panels | Approved hull geometry, drafts, pressure distribution and panels | Applicable standards confirmed; accepted hand calc/FEA; allowable strains, stresses and deflections |
| STR-LC-02 | Dynamic bottom impact / slamming | Speed/sea envelope, hull form, deadrise, panel supports, pressure-duration model | Validated rule pressure or validated hydrodynamic analysis, load-path and fatigue checks |
| STR-LC-03 | Global hogging/sagging, torsion and deck openings | Structural scantlings, weights/CG, sea-state design waves, closures | Global loads, buckling, stress, deflection and fatigue verification |
| STR-LC-04 | Multi-point launch/recovery, off-centre CG, slack sling and snatch | **Maximum handling mass**, CG, 3D lifting points, sling azimuth/elevation/stiffness, rigging and DAF | 3D force/moment equilibrium, worst-point load, attachment/weld/fastener and local hull FEA/hand checks, rated rigging, inspected proof-test plan |
| STR-LC-05 | Transport trailer, tie-down, cradle and road shock | Trailer restraints, acceleration spectra, support geometry | Restraint reactions, local bearing, load path and inspection |
| STR-LC-06 | Payload/moonpool/gondola and mast inertial loads | Selected payload mass/CG, mounts, hydrodynamic loads, cut-outs, vibration | Local reinforcement, buckling, stiffness, vibration and watertight integrity checks |
| STR-LC-07 | Grounding, launch impact, handling and collision damage tolerance | Operations and hazard limits, fender geometry, impact energy | Local structure and recoverability criteria, inspection and damage-tolerance analysis |
| STR-LC-08 | Environmental exposure, joining and fatigue | Material condition, welding procedure, marine corrosion design and service life | Traceable material test reports, weld/joint knockdown, corrosion allowance, galvanic isolation, fatigue and NDT |

**No unapproved numeric load factors, allowable strengths, pressure fields, capacities, laminate ply schedules, plate thickness or factor of safety can be adopted as a released design.** Safety factors shown in the synthetic dashboard are not criteria.

## Lifting arithmetic and limitations

For mass m (kg), gravitational acceleration g = 9.80665 m/s², and selected dynamic amplification A (>=1): `Fz = m*g*A`.
For **externally verified** nonnegative vertical share r_i with sum r_i=1 and sling angle theta_i from the vertical: `Rz_i=Fz*r_i`, `T_i=Rz_i/cos(theta_i)`, and `|H_i|=T_i*sin(theta_i)`. All input forces are screening values. Reactions depend on actual 3D CG, geometry, sling stiffness, supporting structure and sequencing; especially for redundant multi-point rigs, shares cannot be inferred from point count. These formulas do not prove 3D force/moment balance or rate an attachment. A point allowable is only as trustworthy as its traceable strength basis. Angle-specific sling/hardware WLL, shackle bearing/prying, weld/HAZ, hull strength and proof test must be assessed independently.

## Closure gate and evidence manifest

- [ ] CM-01: Select and approve the single actual USV-01 configuration (120 kg proposal or another mass and hull), frozen CAD geometry revision and approved mass/CG.
- [ ] MAT-01: Material certificates, corrosion/joining, laminate layup if relevant, plate thickness, weld heat-affected-zone allowable, fastener strength and traceable suppliers.
- [ ] LC-01: Applicable design standard and classification scope approved by qualified naval structural engineer.
- [ ] LC-02: Full structural loads and combinations for STR-LC-01 to STR-LC-08; handling mass and crane/trailer dynamics.
- [ ] LIFT-01: Verified lift point geometry, load-share source, dynamic factor, all sling load paths and 3D equilibrium; suitable rigging capacities and approved proof test.
- [ ] FEA-01: Authenticated geometry/mesh, elements, boundary conditions, convergence and sensitivity, stresses, buckling, deflection and fatigue evidence with versioned solver inputs and outputs.
- [ ] VNV-01: Independent hand calculations and test/inspection records with signed acceptance.
- [ ] GOV-01: Stage C independent Gemini + ChatGPT advisory reviews and Stage D **human** Engineering Director sign-off; Stage E controlled release.
- [ ] HAZ-01: Hazard assessment includes dropped vessel, crush/launch failure, watertight breach and uncontrolled recovery load cases.

**Closure rule:** The original structural ENGINEERING blocker can only be marked CLOSED after the physical evidence and approvals above. The arithmetic/code gap can be marked implemented after automated verification, but no structural safe-to-build or safe-to-lift certificate is issued here.
