# RES-01 / VVP-001 — Controlled resistance, propulsor and sea-trial evidence procedure

**Issue:** RES-01 / WS-04 | **Document:** VVP-RES01-001 (proposed) | **Date:** 2026-11-13
**Status:** PREPARED FOR TECHNICAL REVIEW — NOT EXECUTED / NOT CERTIFIED

## 1. Applicability and configuration

This procedure applies **only** to the USV-01 Rev 0.4 *repository candidate* (10.5 m LWL, 6,200 kg design displacement, 14 kn cruise and 22 kn sprint). The unrelated 2.5 m / 120 kg concept must not be merged into these values. Geometry, load conditions and speed requirements are candidate inputs pending qualified engineering approval, not proof of vessel performance.

**Input and output contracts:** `src/core/verification/ResistancePropulsionEvidence.ts` and `references/res01-evidence-template.json`. All reference fields, source identifiers, SHA-256 hashes, speeds and performance data must be tied to an actual revision. The template deliberately has `null` values and **MUST fail validation until real evidence exists**. Never use sample numerical tests as engineering evidence.

## 2. Test and analysis workflow

| ID | Controlled measurement or evidence | Reviewer / acceptance boundary |
|---|---|---|
| RES-01-A | Original native hull offsets/surface, hull and appendage geometry revisions, waterlines, trim, wetted area, displaced volume/mass at design and off-design load cases; source SHA-256 | Independent naval architect checks that offsets/hydrostatics and load cases refer to same hull before CFD, power prediction or release |
| RES-01-B | Calm-water total appended resistance as function of water-relative speed, explicitly including low speed, pre-planing hump, 14 kn cruise, 22 kn sprint; tow tank or correctly validated free-surface CFD with scale, mesh, timestep, turbulence and boundary-study logs | Sourced resistance curve, correlated to independent test/reference, with stated expanded uncertainty, model/full-scale extrapolation and repeatability. Never infer total drag from skin friction alone |
| RES-01-C | Sea-state envelope, windage, wave-added resistance, draft/trim effects, roughness and fouling, water temperature/density; worst credible loading cases with uncertainty | Environmental added resistance is calculated and independently checked; no arbitrary sea-margin percentage |
| RES-01-D | Twin installed pod open-water thrust/torque/rpm vs advance-speed curves, wake field, thrust deduction, quasi-propulsive efficiency and uncertainty, immersion, cavitation/ventilation limits and independent bollard pull | Actual installed thrust >= required thrust for verified cases, with matching operating point, uncertainty and no double-counting hull interaction |
| RES-01-E | Electric motor + drive continuous derated shaft output, speed-torque and inverter current limits, motor and ESC cooling heat rejection; battery DC duty, one-pod-degraded maneuverability and emergency propulsion envelope | Continuous installed shaft power >= required shaft power at verified cases; thermal/drive, DC bus and duty cycle physically demonstrated |
| VVP-001 | Full-scale instrumented speed-through-water, shaft torque/rpm and electrical power, environmental and loading conditions, repeated bidirectional runs where appropriate, reference calibrations and matched-power predicted speed | Project criterion: absolute measured-minus-predicted speed at **matched shaft power** <= 0.5 kn; verified uncertainties and trial method must support interpretation |
| GOV-02 | Qualified independent hydrodynamic and propulsion reviewer, review findings, methods and issue resolution tied to exact geometry/evidence SHA | Reviewer signs substantive findings; AI text or self-attested provenance is not equivalent to independent physical validation |
| GOV-01 | Engineering Director decision and Ed25519 signature bound to exact final source and baseline digest | Mandatory human release authority; no older signature, AI agreement, or test-pass alone permits release |

### Relevant recognized guidance

- ITTC **7.5-02-02-01**: Resistance Tests.
- ITTC **7.5-02-02-02**: General Guideline for Uncertainty Analysis in Resistance Tests.
- ITTC **7.5-02-03-01.1**: Propulsion/Bollard Pull Test.
- ITTC **7.5-02-03-01.3**: Podded Propulsor Tests and Extrapolation.
- ITTC **7.5-02-03-02.1**: Open Water Test.
- ITTC **7.5-03-02-04**: Practical Guidelines for Ship Resistance CFD (applicability must be validated for this planing craft).

See the official [ITTC procedures register, 2024](https://ittc.info/media/11718/0_0.pdf) and [ITTC resistance uncertainty guideline](https://www.ittc.info/media/9601/75-02-02-02.pdf). Select and document methods suited to this small planing hull and test scale; do not blindly apply displacement-ship powering methods. ISO 15016:2025 as published is scoped to **50–500 m Lpp displacement ships** and cannot be assumed directly applicable to a 10.5 m planing USV.

## 3. Evidence intake and unit requirements

The `resistanceCurve` must have distinct named cases including `LOW_SPEED`, `HUMP_REGION`, `CRUISE` at 14 kn and `SPRINT` at 22 kn. Additional intermediate speeds are strongly encouraged; the automated tool tests *presence*, not adequacy of hump-curve resolution.

Each resistance case records **total appended calm-water resistance N**, expanded resistance uncertainty N, and independently supported **added environmental resistance N**, all at one displacement. Do not include skin friction again in a measured/appended total. Each propulsion case is at the **same water-relative speed**, and records total installed thrust available N and combined continuous shaft power available kW **after relevant motor/ESC thermal derating**, sourced `eta_D`, wake/thrust deduction and their uncertainties.

The diagnostic upper bound is:

`R_upper = R_total_appended_calm + U_R + R_added_environment` (newtons)

`P_E_upper = R_upper × V / 1000` (kW)

`P_B_upper = R_upper × V / (1000 × (eta_D - U_eta))` (kW)

`T_required_upper = R_upper / (1 - (t + U_t))` (N).

These are conservative deterministic screens **only if all referenced measurements and correction conventions are compatible**. The separate thrust/efficiency checks are not a substitute for installed propulsor/wake matching or dynamic maneuvering simulations.

Every trial record must give measured water-relative speed and **predicted speed at that trial's measured shaft power**; comparing measured speed against a nominal target without matching shaft power is invalid. Include instrumentation calibration reference, trial logs and condition matching. If correction methodology is invalid, a numeric ±0.5 kn result cannot pass engineering review.

Ensure `sourceCommitSha` refers to the vessel data revision and `hullOffsetsSha256` to genuine, controlled hull geometry. The tool checks their syntax only — it **does not verify** cryptographic signatures, file access, instrument calibration, scientific appropriateness, manufacturer ratings or truthfulness of references.

## 4. Reproducible workflow

1. Save real, controlled data by copying `references/res01-evidence-template.json` into a separate controlled `res01-evidence.json`. Replace all `null` inputs with **measured/sourced values**, not defaults. Keep restricted data out of the public repository; store approved source artifacts in controlled Google Drive and only approved metadata in Git.
2. Run `npm run acceptance:campaign -- --baseline-sha <CURRENT_COMMIT_SHA> --resistance-propulsion-file <CONTROLLED_RES01_JSON>`. Capture the JSON and Markdown outputs under `governance/reports/` in the controlled release package. `MISSING_EVIDENCE` and `INVALID_EVIDENCE` cannot be treated as passes.
3. Review `NUMERIC_FAIL` power/thrust/speed deviations against physical input and calibration evidence. `NUMERIC_PASS_UNCERTIFIED` means arithmetic checks passed **only**: independent review and release remain unapproved.
4. Record Gemini independent critique as *advisory*, separate from an appointed human naval/propulsion reviewer. Document findings and corrective actions under the PR and controlled evidence manifest.
5. Obtain a new signed engineering change authorization bound to the final source/baseline SHA, rerun Stage A–E and release only if all gates actually pass.

## 5. Evidence package audit and actual availability

Repository and supplied Library search completed 2026-11-13: no controlled, validated **11.2 m hull offsets/mesh**, resistance campaign curve, installed twin-pod characteristic map, instrumented propulsion/thermal trial results or matched-power sea trials were identified. Prior 2.5 m hull concept files are a different vessel and cannot be relabeled.

The code patch closes the **unsafe inference/software readiness** defects; it does not close **physical RES-01**. All listed engineering and Director sign-off gates remain open until independently verified evidence is available. No numerical unit-test fixture may be reused as a design result.

**Baseline disposition:** DO NOT PROCURE PROPULSION FROM THE HISTORICAL 182 kW ASSERTION. Do not mark RES-01 accepted, sign as a human reviewer, forge CFD evidence or merge a blocked PR.
