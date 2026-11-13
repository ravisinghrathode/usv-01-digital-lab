# RES-01 — Resistance and Propulsion Engineering Closure Record (Rev B)

**Date:** 2026-11-13  
**Disposition:** SOFTWARE SAFETY PATCH PROPOSED; PHYSICAL BLOCKER OPEN  
**Owner:** HYD-03 / PRP-06; Engineering Director approval pending  
**Affected requirement / verification identifiers:** RES-01, VVP-001, SIM-HYD-001  
**Source:** `USV01_PROJECT_CONTEXT.md` Rev 0.4 and `docs/CONSOLIDATED_ACCEPTANCE_REGISTER.md`

## Finding and root cause

The existing `TOOL-RESISTANCE-01` generated a purported total resistance from an uncalibrated piecewise residual-resistance coefficient, inferred wetted area from principal particulars, and used a default quasi-propulsive efficiency of 0.65. It was unsuitable as source evidence for a 182 kW installed brake-power assertion. The speed-based Froude thresholds also implied planing status without proving trim/lift equilibrium. Code correctness or a dashboard plot is not hydrodynamic validation.

A second, different `usv01_parameters.yaml` proposal describes a 2.5 m / 120 kg vessel. **DO NOT combine that proposal's dimensions, speed, or friction estimate with the repository Rev 0.4 baseline** (11.2 m LOA, 10.5 m LWL, 2.9 m beam, 0.65 m draft, 6.2 tonnes, 14 kn cruise, 22 kn sprint). Confirm the authoritative geometry and approved mass before performing CFD or procurement.

## Implemented correction

1. `TOOL-RESISTANCE-01` now computes speed, length-Froude number, Reynolds number and ITTC-1957 smooth-plate friction coefficient. Frictional resistance is returned **only** with an explicitly supplied wetted surface and a nonblank source/revision identifier.
2. Total resistance is **null** until externally calculated or measured total resistance and its source/revision are supplied. No unsupported residual resistance, pressure resistance, wave drag, appendage correction, correlation allowance, fouling or sea margin is invented.
3. Effective power `P_E = R_T V` is **null** without total resistance. Shaft brake power `P_B = P_E / eta_D` is **null** unless both total resistance and a separately sourced quasi-propulsive efficiency are supplied. Neither output is validated just because provenance text is present.
4. Optional resistance and efficiency intervals propagate to effective/brake-power intervals. No confidence probability is implied, and intervals are not fabricated.
5. Froude speed *band* is retained only as a diagnostic. The actual displacement/semi-planing/planing regime is `UNVERIFIED`, as it requires hull lift/trim evidence.
6. Zod validates resistance and propulsion input fields and rejects unsourced resistance/efficiency, inconsistent uncertainty bounds and physically unusable factors. The engineering tool tolerates unrelated composite agent inputs while ignoring them. A separate strict evidence-package schema rejects unsupported fields and wrong source-commit provenance. Regression tests cover missing evidence, friction and power identities, inadequate installed thrust/continuous power, VVP-001 speed error and unverified result labels.

**Compatibility note:** The change is deliberately breaking: former calls supplying `propulsiveEfficiencyEtaD` without provenance, or expecting numerical `totalResistanceKn` from length/beam/draft only, now fail closed. Consumers must display missing evidence and nullable powering outputs; do not fall back to zero, prior fixed numbers, or unsafe legacy results.

## Required actual evidence for physical closure (RES-01 remains OPEN)

| Gate | Evidence / verification | Acceptance |
|---|---|---|
| RES-01-A | Approved source hull CAD offsets/mesh, LWL, displacement at each load case, wetted surface, trim, appendages | Engineer-controlled geometry and hydrostatic consistency |
| RES-01-B | Calm-water bare-hull and appended resistance across zero to 22 kn including hump region; CFD free surface mesh/time-step/convergence and/or tank towing; reference calibration | Independent reproducible curve plus quantified model/test uncertainty |
| RES-01-C | Environmental correction: wind/wave/current, fouling and roughness, trim/sea margins, operation area limits | Documented conditions, load cases and uncertainty; no unsourced multiplier |
| RES-01-D | Pod/propeller thrust-power-speed curves, wake/thrust deduction or open-water tests, efficiency, diameter, pitch, immersion, cavitation/ventilation constraints | Demonstrated thrust available >= thrust demanded at design points and low-speed cases |
| RES-01-E | Motors/ESCs/bus/battery: continuous vs peak ratings, thermal derating and duty-cycle map; one-pod degraded case; bollard pull and manoeuvrability | Verified input/shaft/electrical separation, thermal and protection envelope |
| VVP-001 | Instrumented speed-power trials under controlled conditions with calibrated measurements | Project criterion ±0.5 kn against validated predicted curve; qualified review |
| Governance | Gemini independent findings, peer naval architect review, source-commit-bound engineering approval | All gates and human sign-off before change becomes Approved |

## Physics / dimensional audit

- Water-relative speed `V = speedKnots × (1852 / 3600)` m/s.
- `Fn = V / sqrt(g LWL)`, `Re = V LWL / nu`.
- ITTC-1957 `C_F = 0.075 / (log10(Re)-2)^2`.
- `R_F = (rho/2) V^2 S C_F` (N), smooth-plate friction only; this does **not** supply total resistance, particularly near planing transition.
- `P_E = R_T V` (W). `P_B = P_E / eta_D` (W), where eta_D is the validated overall quasi-propulsive coefficient on the same reference basis. Motor electrical input requires separately sourced shaft/drive/motor efficiencies. Never add total resistance to skin friction again.
- If resistance `[Rmin,Rmax]` and quasi-propulsive efficiency `[etamin,etamax]` refer to the same conditions, `PBmin = Rmin V / etamax`, `PBmax = Rmax V / etamin`. These are deterministic propagation of **provided** bounds, not model validation.
- At 22 kn and LWL 10.5 m, `V ≈ 11.3178 m/s`; `Fn ≈ 1.115` (a nondimensional speed indicator, **not** evidence of stable planing).
- The Rev 0.4 claim of `P_B = 182 kW` at 22 kn is **UNVERIFIED**, and should be shown as a historical proposed figure, not as a selected motor rating. If it is used as a conditional claim, it would imply `R_T = 182000 eta_D / 11.3178` N; without independently established `eta_D`, this equation provides no verified resistance.

## Additional implementation and acceptance gates

The executable RES-01 intake was added in `src/core/verification/ResistancePropulsionEvidence.ts` and is available from the standard 13-workstream acceptance campaign via `--resistance-propulsion-file`. Its schema requires controlled geometry, resistance data, uncertainty, environmental allowances, two installed propulsor/power cases, low-speed/hump coverage, the matched-power sea trials, and traceable references to remaining performance and thermal evidence. It compares worst-case required thrust and continuous shaft power with submitted installed capability; it cannot authenticate measurements and always retains all external closure gates. See `docs/RES01_RESISTANCE_PROPULSION_TEST_PROCEDURE.md` and `references/res01-evidence-template.json`. The template's nulls are intentional; unsupported fabricated numbers must not be substituted.

**Software tasks completed in the proposed PR:** eliminated the uncalibrated residual coefficient and default efficiency in the deterministic tool; removed dashboard motor-rating synthesis; marked the legacy Savitsky-like visualizer explicitly unvalidated; corrected 26-agent/VERIFY fixtures; attached executable evidence checks and a detailed physical trial protocol; and updated regression tests and the acceptance register.

**Physical tasks explicitly not completed:** acquisition and independent evaluation of actual hull offsets, environmental resistance, CFD or towing test correlation, propulsor wake/cavitation characteristics, motor thermal and endurance trials, full-scale speed-power trials, Gemini/peer review, and qualified Director approval.

## Test and release status

Regression suites include `tests/deterministicTools.test.ts`, `tests/resistancePropulsionEvidence.test.ts`, `tests/acceptanceCampaign.test.ts`, `tests/navalAcceptanceSafeguards.test.ts` and existing 26-agent workflow tests. Stage B CI must pass for the final commit; full Stage E will intentionally remain blocked without independent qualified review and a fresh source-bound Director signature. Do not merge solely because tests pass. No sea trial, CFD run, bench propulsion test or independent physical validation is claimed.

**Review slots:** ChatGPT author review — change proposal only. Gemini independent review — pending. Human Engineering Director approval — pending.

**Disposition:** The **unsafe software inference** is addressed in this proposal; the **physical resistance/propulsion blocker RES-01 is not closed** until all evidence gates above are met.
