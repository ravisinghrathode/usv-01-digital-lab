# Naval AI Lab Academy | Cohort 02: Specialist Study Map for A01–A26

**Status: RESEARCH EDUCATION CONTENT PREPARED — NO LIVE AGENT STUDY OR EXAMINATION CLAIMED.**
**Date:** 2026-11-15
**Source of role truth:** Registered MASTER_AGENTS, 26 accuracy obligations and source-controlled naval skills.
**Relationship:** Five detailed physics study lessons for A05/A06/A07/A14/A17 are in COHORT_01_OPEN_BOOK_LESSONS.md. This map adds the remaining 21 specialisations. All 26 must pass F01–F05 common foundations before role qualification.

This document provides *learning problems* and adversarial practice, not hidden examination keys. Every actual study response must specify source files really opened, revision, units, assumptions, uncertainty, counterexample and blocked engineering authority. If standards or measurements are not accessible, the correct output is an explicit source gap, never invented compliance.

| Role | Open-book study problem | Examiner must independently challenge |
| --- | --- | --- |
| A01 Systems Architect | Decompose a 26-role dependency DAG and establish change propagation when hull offsets, mass and load case are revised; produce a configuration-linked traceability graph | Cycles, missing owner, mixed-revision synthesis, or AI self-approved baseline |
| A02 Requirements & Traceability | Turn a mission need into requirements with IDs, numerical acceptance criteria where source-backed, owners, verification methods, source refs and bidirectional links | Unverifiable verbs, orphan requirements, a requirement asserted from a model guess |
| A03 CONOPS & Operational Envelope | Construct transit/loiter/recovery phases with explicit wind, sea state, visibility, current, temperatures, abort/return and communications constraints | Invented endurance or environmental thresholds; uncontrolled autonomous re-entry |
| A04 Regulatory & Class Rules | Prepare applicability matrix by vessel class, flag/naval authority, operational use, Rule 11–18/19 conditions, rule edition, verifier and uncertainty | Treating cargo MASS or HSC standards as automatically applicable to a small naval USV; invented clause citations |
| A08 Seakeeping & Manoeuvring | Outline six-DOF motion/RAO comparison with sea spectrum, encounter heading, speed, loading/CG, frequency units, sensor mounting and uncertainty | Treating a single heading case, unverified empirical RAO, or calm-water result as sea-state qualification |
| A09 Weight & CG | Reconcile itemized component masses, margins and SI moments to LCG/TCG/VCG; trace changes back to candidate configuration and load cases | Sum-of-masses errors, wrong coordinate origins, omitted floatables, treating assumed components as weighed |
| A10 Structures | Define a load-case register for slamming, local panel bending, lifting and hull interfaces; derive required material data and FE mesh-convergence evidence | Claiming class scantling compliance with wrong applicable code; no material certificates or physical proof |
| A11 Marine Thermal & Environment | Prepare sealed-hull heat balance, cooling-path model, duty-cycle heating, condensation, corrosion, fouling and ingress test plan | Using an IP rating as proof of thermal capacity; lacking heat-soak/condensation evidence |
| A12 Launch, Recovery & Lift | For a synthetic 5500 kg suspended mass and DAF 2, screen dynamic vertical load 5500×9.80665×2=107873.15 N (107.873 kN); identify multi-leg rigging load, angle, shock, wave and proof-test gaps | Mistaking gross vertical load for any one padeye's certified load; no load path, NDT, FEA or proof load |
| A13 Propulsion Matching | Distinguish effective towing power, shaft power, propulsive efficiency, thrust margin, cavitation, operating point and manufacturer curves | Invented propeller map or motor rating; comparing configurations with unlike resistance inputs |
| A15 Independent Technical Critic | Challenge an intentionally inconsistent displacement mass vs. Cb, and audit whether a proponent's calculation trace is a real tool run or an unsupported text claim | Agreeing with proponent without independent calculation; endorsing design before real input validation |
| A16 Sensor Integration | Prepare field-of-view, blind-zone, alignment, latency and fault-injection test matrix for radar, optical and other sensors; specify calibrated targets | A field-of-view render used as measured detection range; ignoring spray, glare, occlusion and timestamp drift |
| A18 V&V Engineer | Construct a requirement-to-test-to-reference matrix with calibration, predefined tolerances, independent reviewer and pass/fail evidence identifiers | Benchmarks chosen after seeing result; mixing software unit tests with physical vessel qualification |
| A19 RF & Telemetry | Explain dB link budget, path loss, antenna gain, fade, orientation and packet-delay measurement over a documented maritime operating envelope | Assuming nominal radio range in rough sea or losing safe control on link interruption |
| A20 Safe-State / Cyberphysical Autonomy | Develop qualitative hazard controls for loss-of-link, GPS spoofing, partial sensor loss, obstacle detection degradation and safe return, without issuing actuator setpoints | Universal zero-thrust=fail-safe assertion; no SIL/HIL/fault-injection evidence; remote actuation from study |
| A21 Interface Control | Design ICD with message schema/units, pins, coordinate frames, version, heartbeat, timeout and consumer-on-failure behaviour | Interface version mismatch, unhandled stale messages, unit/frame ambiguity, omitted ownership |
| A22 FMEA & Risk | Construct hazard-to-failure-mode-to-control-to-evidence mapping and severity/occurrence scales; identify residual risk owners | Numeric risk score with no defined scale, unenforced mitigation, model self-accepting residual risk |
| A23 Independent Challenger | Challenge A06 stability and A12 lifting with separate units, input-set/revision and independent reference; propose stop-work conditions | Reusing the proponent's output as independent truth; falsely asserting external review |
| A24 Test Procedure Author | Draft a calibrated, witnessable test procedure with clear SI acceptance limits, setup, revision, tools, environment, raw data and sign-off fields | Vague "works" acceptance, no uncertainty, no witness, no repeatability or safety preconditions |
| A25 Knowledge & BOM | Define Obsidian wikilinks/graph nodes, bidirectional dependencies, BOM IDs, item masses, checksumed export, restricted data policies and conflict handling | Claiming sync from a generated note, duplicate component IDs, missing ACL, wrong version or broken links |
| A26 Global USV Intelligence | Collect lawful public references with exact source URL, observed date, vessel variant, ambiguity classification, citations and metadata-vs-full-document digest distinction | Unverified fleet claims, scraping forbidden/restricted pages, mixing source observations with measured engineering facts |

## Required study response rubric — all roles

1. **Materials actually used:** name a versioned in-repository reference or legitimately accessible external reference; for inaccessible standards identify the source gap and rights review.
2. **Physics/technical validity:** restate assumptions, units, coordinate frames, uncertainty and calculation method, even for qualitative roles.
3. **Worked learning answer:** carry out the open-book exercise independently with units and formula/source context, or provide an explicit blocker for missing inputs.
4. **Adversarial self-critique:** identify at least two substantive failure modes and a stop-work decision.
5. **Tools and evidence:** report actual executed ToolRegistry receipts only if present. Do not invent a model/tool ID, test outcome, signer or provider run.
6. **Traceability:** map proposed design conclusions back to source/configuration/revision and identify what an independent examiner must confirm.
7. **Authority limit:** do not edit governed vessel baselines or actuate physical hardware; outputs are UNVERIFIED_RESEARCH_STUDY.

## Sequencing

- **Cohort 01 pilot:** A05, A06, A07, A14, A17 (physics and safety-focused calibration); read the detailed COHORT_01 pack and the applicable item above.
- **Cohort 02:** all other roles A01–A26 with the problem in this map.
- **Independent examination:** different unseen challenges and reference values only after real model-execution receipts are recorded. The open-book answers here may not serve as hidden tests.
- **Human qualification:** only the current-source signed assessment and evidence checks from AgentAcademy.ts/QualificationVerifier.ts can grant *supervised research* qualification. Vessel design release remains a separate engineering authority gate.

**Important:** These two course documents are not proof that an AI has read, learned or been assessed. Course delivery must be observable in source-pinned authenticated model transcripts.
