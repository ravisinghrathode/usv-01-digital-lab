# ECR-20261113-007 — HYD-01 self-audit and fail-closed stability remedy

1. **Change ID:** ECR-20261113-007.
2. **Originator:** ChatGPT engineering assistant; implementation author, not independent acceptor.
3. **Date:** 2026-11-13.
4. **Description:** Repair remaining code/procedure defects after merged HYD-01 PR #40. Add heave/trim static equilibrium under prescribed heel, improved GZ warning semantics and realistic no-input UI, evidence completeness and independent numeric comparison.
5. **Reason for Change:** Earlier closure report overstated numerical completeness; physical measurements and controlled design evidence were still absent.
6. **Affected Subsystem:** NA, HYD, VVT, GOV.
7. **Affected Requirements:** HYD-01 in consolidated acceptance register; governance Stage B–E remains mandatory.
8. **Architectural Impact:** New restricted `TOOL-TRIMMED-HYDROSTATICS-01` registered under A06; geometry input remains a revision-identified transverse section offset model; acceptance evidence can be audited from structured manifest.
9. **Safety Impact:** CRITICAL — false stability claims can create an unsafe vessel. Eliminate all artificial upward GZ clipping and blanket IMO compliance boolean. Reject physically infeasible pitch equilibrium.
10. **Cybersecurity Impact:** No new network or actuator control. Evidence hash/digest fields are checkable but cannot authenticate source or reviewer; no automatic release signature.
11. **Verification Plan:** TypeScript typecheck, complete regression suite, production build, analytical barge small-angle trim convergence, off-center mass and impossible LCG, free-surface unknown, global and per-case evidence failure, independent reference tolerance, and absence of prepopulated slider values. Independently compare approved CAD hydrostatics and measured mass/CG before acceptance.
12. **Risk Assessment:** CRITICAL.
13. **Review Evidence:** Pending exact-head Stage B run URL and separate Stage C qualified independent naval-architecture review. CI passing cannot sign a hull design.
14. **Approval Record:** NOT PROVIDED. A competent independent reviewer and Engineering Director must sign this exact final baseline through Stage D. Never fabricate assent.
15. **Implementation Commit:** Current PR #46 head at closure; final baseline digest must be recalculated after all modifications.
16. **Closure Status:** UNDER_REVIEW — software remediation proposed. Physical HYD-01 acceptance NOT CLOSED.

## Numerical limitations and decision record

- The new method solves buoyant volume and longitudinal static moment at each prescribed heel up to 60°, with a safety-bounded ±15° pitch search. It does not solve free heel, downflooding, damage stability, dynamic waves or actual CAD watertightness.
- Interpolated offset sections are not certified hull geometry, even if a source string and SHA are structurally well-formed.
- The test hull is an **analytical rectangular barge**, not USV-01. The 120 kg and 6,200 kg candidate inputs cannot be reconciled without explicit vessel selection and approved mass/geometry.
- Use `evidence/hyd01/acceptance-manifest.json` as missing-evidence ledger. Reviewers must independently authenticate any subsequently submitted source and signature; `auditHydroEvidence` never grants engineering acceptance.

## Additional safety-critical source data fault

Code review of `src/data/initialProjectData.ts` found unsupported project approval and mock verification records that were being loaded into normal live project views: an 11.2 m / 6.2 t vessel marked verified, mass/CG entries marked non-illustrative, verified resistance, solved structure, and a fake passed physical electrical FAT. The remediation strips those approval claims from initial project state and removes fake physical evidence; it does not create replacement measurements. Verification requires `tests/seedBaselineIntegrity.test.ts` and UI audit. Risk remains CRITICAL.
