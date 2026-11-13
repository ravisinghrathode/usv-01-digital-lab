# MAR-01 — USV-01 Marine Systems Integration Remediation Dossier

**State:** PROPOSED — EXTERNAL EVIDENCE NOT RECEIVED — NOT CLOSED  
**Acceptance:** `MAR-01` / `WS-07` in `docs/CONSOLIDATED_ACCEPTANCE_REGISTER.md`  
**Configuration:** This dossier applies to the **Rev 0.4 vessel described in `USV01_PROJECT_CONTEXT.md`**, subject to authenticated approval of that baseline and final design revisions. The repository describes an ~11.2 m, ~6,200 kg design-displacement concept. **Do not use** values from the separate *2.5 m / 120 kg* preliminary physics concept or its ~195 W illustrative electronics heat budget. Neither 6,200 kg nor design displacement alone establishes the maximum suspended/transport handling mass.

## Engineering resolution strategy

The blocker is an **evidence and engineering-integration gap**, not a missing numeric formula. The following 13 linked obligations define its minimum verification scope. `src/core/verification/MarineSystemsEvidenceGate.ts` contains the corresponding machine-readable identifiers. Every submitted analysis/test must identify: source and test condition, physical configuration, release SHA, approved limit, uncertainty/margin where applicable, independent verification, controlled artifact SHA-256 and disposition. Unresolved selections remain TBD.

| Requirement | Contract and required technical evidence | Disposition |
|---|---|---|
| MAR-LR-01 | Approved operating/handling mass budget including fluids, payload, growth, and temporary recovery rigging; 3-axis CG/load states; selected launch/recovery method and load-case register, sea/current/wind and impact conditions, sling geometry and dynamic effects | TBD |
| MAR-LR-02 | Unequal lifting-point reactions derived for each approved rigging/load case; lug, attachment, local laminate/bulkhead and fastener load paths; allowable load/WLL labels, fatigue, FEA/hand calculation correlation; approved physical proof test and pre-use inspection | TBD |
| MAR-LR-03 | Transport support and tie-down restraints for approved route and longitudinal/lateral/vertical accelerations; launch/recovery damage tolerance, restraint proof and lifting gear compatibility | TBD |
| MAR-TH-01 | Defined equipment heat map (battery, BMS, ESC, motors, processors, chargers and auxiliary power), duty cycle, thermal network (K/W), structure material/contact path, worst-case air/water temperatures, fouled heat exchanger and zero/low water flow cases | TBD |
| MAR-TH-02 | Component manufacturer limits with engineering margins; worst-case measured steady and transient component/baseplate/hull temperatures and thermal-model correlation | TBD |
| MAR-TH-03 | Watertight/IP boundary drawing, penetrations and seals, service reassembly and post-temperature-cycle enclosure/hull integrity test at the selected operational exposure; IP67 claim must be specified for the relevant enclosure, not presumed for the complete hull | TBD |
| MAR-AC-01 | Selected wet-end transducer model and supplier installation ICD, payload mass/CG, mounting/handling envelope, beam field of view, aperture/face coating restrictions, power, data, timestamping, connectors and replacement access. **No payload selected = interface not frozen.** | TBD |
| MAR-AC-02 | Chosen moonpool/gondola geometry, immersion and wake flow, cavitation, bubble entrainment, appendage drag, structural masking, propulsor wash, machinery vibration, sea-trial acoustic/flow-noise performance against supplier limits | TBD |
| MAR-AC-03 | Structural/pressure boundary for hull penetrations, cable strain relief and wet-mate connectors, seal proof, galvanic isolation, vibration serviceability and test after removal/reinstallation | TBD |
| MAR-FC-01 | Composite hull and metal insert compatibility, galvanic couples, corrosion allowance or compatible isolation, protective coatings and inspection; cathodic protection only where technically applicable; environmental review | TBD |
| MAR-FC-02 | Fouling and abrasion protection for hull, pods, intakes, gondola and sensing surfaces; supplier-approved treatment for acoustic aperture, cleaning access, measured condition/performance triggers and inspection interval | TBD |
| MAR-BC-01 | Hull low-point mapping, free-surface/drainage considerations, compartment segregation, condensate paths, collection/detection, accessible service, cable gland and vent pressure-equalisation strategy without uncontrolled seawater entry | TBD |
| MAR-BC-02 | Humidity/condensate/salinity or bilge-detection coverage, alarm logic and independent power-failure response; thermal/humidity cycling and ingress/environmental challenge with sensor fault injection and drainage inspection | TBD |

## Required subsystem interfaces (ICD candidates; all PROPOSED)

| ICD | Inputs/outputs | Interface safety invariant |
|---|---|---|
| ICD-MAR-LR | Hull/deck and internal frames ↔ lifting points, slings, cradle, trailer | Handling loads shall use the maximum approved handling configuration, **never equal four-point sharing by assumption** |
| ICD-MAR-TH | Heat sources ↔ thermal interfaces/heat sink ↔ ambient air/seawater | Sealed electrical boundary preserved; thermal limits validated at water-flow and ambient extremes and at fouled surfaces |
| ICD-MAR-AC | Hull, pods, telemetry clock, DC distribution ↔ transducer/moonpool/gondola | Watertight penetration, acoustic field-of-view, low-noise flow and electrical/data interfaces qualified using sensor data |
| ICD-MAR-FC | Composite hull, fasteners, metals, pod casings, coatings ↔ seawater | Prevent galvanic corrosion and coating/sensor conflicts under service conditions |
| ICD-MAR-BC | Compartment low points ↔ sensors, drains, humidity management, operator telemetry | Loss of sensor/processor power or blocked drains must not silently hide unsafe water accumulation |

## Integrated safety hazards and cross-discipline checks

1. **Dropped/crush hazard during recovery** — load mismatch or slack/unequal leg forces: couple STR, NA, OPS with MAR-LR-01/02/03 and independent rigging proof evidence.
2. **Heat soak plus ingress** — sealed battery electronics can overheat in warm/stagnant water; post-thermal seal wear can cause water ingress: couple ELEC, STR and thermal test MAR-TH-01/02/03.
3. **Wet-end induced loss of safety margin** — moonpool/gondola mass, hull opening and drag change stability, resistance, slam load, propulsion clearances and power demand: rerun HYD-01, RES-01 and STR-01 after geometry freezes; MAR-AC-01/02/03 alone cannot approve the integration.
4. **Corrosion and fouling common mode** — bad metal coupling and marine growth can degrade both structural joints and acoustic data/pod cooling; inspect representative material/coating and biofouling conditions under MAR-FC-01/02.
5. **Undetected flooding** — sealed-compartment condensate, trapped seawater, failed moisture sensor or lost telemetry can invalidate mass/CG and insulation assumptions: assess bilge alarm, isolation and supervised recovery per MAR-BC-01/02 and AUT-01 safety case.

## Acceptance criteria and release gates

- **Design-basis gate:** Approve actual selected hull revision, operating/survival/recovery environments, materials, payload, equipment dissipation and component limits. Design input conflicts between repositories must be resolved by documented ECR before numerical design.
- **Interface gate:** Freeze child ICDs with pinouts, seals, geometry, load paths, measurement units, source standards and owners. All numeric acceptance thresholds remain *TBD* until approved supplier/operating data and reference procedures exist.
- **Calculation gate:** Structural lifting/restraint utilization, thermal resistance and margins, wet-end hydroacoustics, galvanic/coating compatibility, condensate/bilge capacity and fault response independently checked against approved inputs.
- **Physical gate:** Record representative lifting/recovery, temperature/ingress, acoustic, corrosion/fouling and bilge/environmental test evidence, calibrated instruments, test conditions, actual configuration and deviation reports. A simulation alone cannot substitute for required physical evidence.
- **Traceability gate:** Each of the 13 IDs has a controlled source artifact, source digest, exact GitHub baseline SHA, test condition, verification procedure, approved limit and independent reviewer disposition.
- **Governance gate:** Obtain Gemini or designated independent technical review **and** qualified human Engineering Director sign-off for the exact source baseline through Stages C/D/E. AI reviews and successful unit tests cannot sign off seaworthiness.
- **Closure rule:** Only then may `MAR-01` move from Pending to Approved/Closed by authorized configuration management. Do not infer that the 13 submitted metadata references prove 13 successful physical tests.

## Software-check scope

`assessMarineEvidence(baselineSha, submissions)` checks required metadata coverage and rejects missing/duplicate IDs, inconsistent baseline SHA, missing controlled-source digest, missing test-condition/limit references and self-reported failures. Its best possible status is `SUBMITTED_UNVERIFIED`; it intentionally reports `marineSystemsAccepted: false` and `independentlyValidated: false`. Existing `evaluateMarineEnvelope` remains a separate *numeric screening* only, never a marine release or independent certification.

**Current MAR-01 conclusion:** The acceptance scope and software intake are remediated by this proposed package, but the physical integration blocker **remains OPEN** until the external engineering evidence and approvals above are genuinely obtained.
