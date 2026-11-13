# HYD-01 Numerical Remediation and Remaining Acceptance Gates

**Date:** 2026-11-13  
**State:** Proposed numerical remediation in branch `fix/hyd-01-offsets-gz-20261113`; external acceptance OPEN.

## Findings

1. The former `TOOL-HYDROSTATICS-01` is a parametric estimate from LWL, B, T, Cb and an assumed/estimated Cwp; not actual hull offset integration.
2. The application `calculateGZStability` synthesizes a high-heel curve from wall-sided and heuristic rollover expressions. Its `overallPass` boolean cannot verify IMO compliance.
3. The naval architecture dashboard presented those heuristic outputs as a compliant/noncompliant determination, before evidence or statutory applicability was approved.
4. `USV01_PHYSICS_CLOSURE_REPORT.md` used preliminary 2.30 m LWL, 1.00 m B, 0.20 m T and 120 kg target. Other application data show a different proposed hull scale. Reconcile controlled hull identities and revisions before applying any geometry model.

## Remediation

- `src/core/tools/naval/offsetHydrostatics.ts`: source-identified offset sections, displacement equilibrium, hydrostatic mass/moment integration, LCB/TCB/KB, AW, LCF, BMt/BMl, GM and free-surface-corrected GZ screening curves.
- `src/core/tools/naval/offsetHydrostatics.test.ts`: analytic barge and twin-hull geometry cases, free-surface, heel, overload, data integrity and trim-residual tests.
- `src/components/NavalArchitectureView.tsx`: replaces unsupported IMO-compliance label with an explicit preliminary-only screening warning. Threshold assessments are NOT certification.
- No geometry, weight data, approved GZ or acceptance signature fabricated.

## Residual acceptance disposition

HYD-01 remains `PENDING_EVIDENCE` at `src/core/verification/AcceptanceGate.ts`. Acceptance requires approved hull offset files, representative mass ledger and inclining-trial results, relevant regulation determination, full heave/trim/heel equilibrium, independent software comparison/physical evidence and qualified signoff. Numeric unit-test green is not sufficient. See ECR-20261113-004.

## Command-level verification

```sh
npx vitest run src/core/tools/naval/offsetHydrostatics.test.ts
npm run lint
npm test
npm run build
```

Record test outcome and exact branch HEAD SHA after execution; neither is attested by this document.
