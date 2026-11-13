# ECR-20261113-004 — HYD-01 offset-derived hydrostatics remediation

- **Change ID:** ECR-20261113-004
- **Originator:** ChatGPT engineering assistant, proposed change author
- **Date:** 2026-11-13
- **Description:** Add source-referenced section-offset displacement/hydrostatic solver and benchmark tests; remove false presentation of preliminary GZ estimates as IMO compliance.
- **Reason for Change:** Close numerical-tool and evidence-integrity defects found under HYD-01; preserve external acceptance gate.
- **Affected Subsystem:** NA, HYD, VVT
- **Affected Requirements:** HYD-01 in `docs/CONSOLIDATED_ACCEPTANCE_REGISTER.md` and `src/core/verification/AcceptanceGate.ts`; no new unapproved normative requirement implied.
- **Architectural Impact:** Introduces `src/core/tools/naval/offsetHydrostatics.ts` without changing operational actuator interfaces or existing parametric tool contract. Future geometry-model wiring remains a separate change.
- **Safety Impact:** HIGH: a false stability certification could endanger craft and people. New outputs are expressly unverified, with no automatic `VERIFIED` state. The GUI removes unqualified green compliance labels.
- **Cybersecurity Impact:** No new external APIs, credentials, actuator access or runtime privileges.
- **Verification Plan:** Run `npx vitest run src/core/tools/naval/offsetHydrostatics.test.ts`, `npm run lint`, `npm test`, `npm run build` on the exact branch head. Check analytical monohull box and twin-hull offset benchmarks; positive initial GZ; free-surface corrections; overload, missing provenance and geometry rejections. Independent check must compare approved offset model against a second hydrostatics implementation, with applicable tolerance and mesh/station convergence.
- **Risk Assessment:** HIGH
- **Review Evidence:** Pending Stage B CI URL and Stage C independent domain review; test code included but passing CI not yet established.
- **Approval Record:** PENDING independent qualified naval-architecture review and Engineering Director signature; not claimed or simulated.
- **Implementation Commit:** Pending final PR head SHA and controlled baseline digest.
- **Closure Status:** UNDER_REVIEW — numerical remediation proposed; HYD-01 acceptance PENDING_EVIDENCE.

## Scope and numerical method

- Integrate immersed, oriented closed transverse offset loops by plane clipping, 2D polygon moments, and longitudinal trapezoids.
- Solve fixed-trim displacement equilibrium and calculate center of buoyancy, waterplane center/area, transverse/longitudinal second moments and approximate metacentric radii.
- Evaluate upright and positive heel curves by **fixed-trim/fixed-heel displacement equilibrium**; these are NOT coupled roll/trim equilibrium GZ tables and cannot justify a stability certificate.
- Compute `LCG - LCB` residual to expose trim imbalance. Unknown free-surface moment produces null corrected GM/GZ, not a hidden zero.
- Explicitly unsupported: self-intersecting sections, open/hole geometries, longitudinal twist/loft provenance, displacement outside section envelope, downflooding, damage stability, wave forcing, dynamic lift, 6-DOF conditions and physical hydrostatics trials.

## HYD-01 external acceptance still required

1. Approved lines/offsets or verified watertight 3D CAD hull with signed revision and a common AP/CL/BL coordinate system, including appendages and wet-end boundaries where appropriate.
2. Design loading cases: lightship, normal mission, max payload, minimum fuel/energy, asymmetrical loads and credible flooding/accumulated water cases; measured/inclining-trial KG, LCG, TCG and uncertainty.
3. Full heave/trim/heel hydrostatic equilibrium, GZ range to appropriate termination, downflooding opening angles, free-surface correction, reserve buoyancy and sensitivity to station density.
4. Independent hydrostatics and GZ curves from accepted naval design software or measurements, agreed error limits, qualified reviewer disposition, and applicability determination of national/flag/class stability rules.
5. Stage C review, Stage D Director approval and Stage E exact-digest closure according to ECCP-001.

This change is a **computational improvement**, not safety/certification acceptance of USV-01.
