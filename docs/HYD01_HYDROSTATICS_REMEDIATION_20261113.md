# HYD-01 Numerical Remediation and Remaining Acceptance Gates

**Date:** 2026-11-13  
**State:** Proposed numerical remediation in branch `fix/hyd-01-offsets-gz-20261113`; external acceptance OPEN.

## Findings

1. The former `TOOL-HYDROSTATICS-01` is a parametric estimate from LWL, B, T, Cb and an assumed/estimated Cwp; not actual hull offset integration.
2. The application `calculateGZStability` synthesizes a high-heel curve from wall-sided and heuristic rollover expressions. Its `overallPass` boolean cannot verify IMO compliance.
3. The naval architecture dashboard presented those heuristic outputs as a compliant/noncompliant determination, before evidence or statutory applicability was approved.
4. `USV01_PHYSICS_CLOSURE_REPORT.md` used preliminary 2.30 m LWL, 1.00 m B, 0.20 m T and 120 kg target. Other application data show a different proposed hull scale. Reconcile controlled hull identities and revisions before applying any geometry model.

## Remediation

- `src/core/tools/naval/offsetHydrostatics.ts`: source-identified, disjoint, simple-section loops; section validity checks; displacement equilibrium; hydrostatic mass/moment integration; LCB/TCB/KB, AW, LCF, BMt/BMl, GM and free-surface-corrected fixed-trim GZ screening curves.
- `src/core/tools/naval/offsetHydrostatics.test.ts`: analytic rectangular barge and twin-hull benchmarks, tapered hull longitudinal moments, free-surface, heel, overload, topology, data integrity and trim-residual tests.
- `src/core/tools/naval/offsetHydrostaticsTool.ts` and `src/core/tools/ToolRegistry.ts`: validated, permission-restricted agent tool exposure; `offsetHydrostaticsTool.test.ts` checks execution and fail-closed validation.\n- `src/core/agents/definitions.ts`: A06 allowed to use the geometry-based solver, without an invented universal small-USV GM criterion. Historical A06 Gemini evidence remains unchanged and stale for the revised prompt.\n- `src/components/NavalArchitectureView.tsx`: replaces unsupported IMO-compliance label with an explicit preliminary-only screening warning. Threshold assessments are NOT certification.
- No geometry, weight data, approved GZ or acceptance signature fabricated.

## Residual acceptance disposition

HYD-01 remains `PENDING_EVIDENCE` at `src/core/verification/AcceptanceGate.ts`. Acceptance requires approved hull offset files, representative mass ledger and inclining-trial results, relevant regulation determination, full heave/trim/heel equilibrium, independent software comparison/physical evidence and qualified signoff. Numeric unit-test green is not sufficient. See ECR-20261113-004.

## Command-level verification

```sh
npx vitest run src/core/tools/naval/offsetHydrostatics.test.ts src/core/tools/naval/offsetHydrostaticsTool.test.ts
npm run lint
npm test
npm run build
```

Record test outcome and exact branch HEAD SHA after execution; neither is attested by this document.

## Applicable rules: source-backed screening (not a legal opinion)

For the 2.5 m **proposed** hull, the IMO 2008 Intact Stability Code's general 24 m+ criteria cannot be presented as universally mandatory. The published ISO 12217-3:2022 covers many boats below 6 m, subject to its exclusions and scope; ISO 12217-1:2022 generally addresses non-sailing boats 6–24 m and certain decked shorter craft. The vessel's unmanned service, jurisdiction, hull form, actual length, intended operational class and flag/class demands still require a documented applicability ruling before any acceptance threshold is selected. **Do not automatically apply either standard or declare compliance.**

Authoritative references: https://www.imo.org/en/ourwork/safety/pages/shipdesignandstability-default.aspx ; https://www.iso.org/standard/79074.html ; https://www.iso.org/standard/79072.html .

## Evidence-chain disposition

Earlier live Gemini campaign `evidence/live-agents/live-gemini-26-20261113.json` was executed at source SHA `854812812f02ab232a506957572c2944be63c7a5`. The A06 prompt has changed in HYD-01; it remains an immutable historical provider observation, **not** current A06 evidence. `tests/liveGeminiEvidence.test.ts` checks both the historical A06 hash and its mismatch to the current instructions, without editing past provider outputs.

## Baseline write protection

The interactive slider was capable of staging the 6,200 kg demonstration scenario as project particulars and calculating waterline beam as `beamM * 0.92` without verified offsets. That pathway was disabled. Users can export a clearly `UNVERIFIED PARAMETRIC SCREEN` CSV; slider reset affects only local state. No automated calculator can overwrite the project baseline. `tests/hydroBaselineIntegrity.test.ts` enforces the critical UI boundary.
