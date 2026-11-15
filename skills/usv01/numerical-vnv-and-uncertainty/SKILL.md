---
name: numerical-vnv-and-uncertainty
description: Specify independent numerical verification with pinned solvers, benchmark references, convergence, uncertainty and reproducible pass/hold/fail criteria.
---

# numerical-vnv-and-uncertainty

**Programme:** USV-01 | **Revision:** 1.0 | **Class:** RESEARCH-ONLY PROCEDURAL SKILL
**Canonical agents:** A06, A07, A08, A09, A10, A11, A12, A13, A14, A18, A23, A24

## Authority and use

Use for relevant Naval AI Lab engineering work in the named agents, subordinate to `AGENTS.md`, the configuration management plan, actual approved policies and the existing human Engineering Director and independent review gates. This procedural skill **does not** grant tools, credentials, numerical validation, standard applicability, new model APIs, or release authority. An unapproved operating charter proposal is not an adopted baseline.

## Input contract

1. controlled geometry/mesh, source commit, solver and template digests.
2. test condition, boundary conditions, benchmark reference and qualification.
3. input assumptions, tolerances, uncertainty budget and reviewer independence record.
4. solver execution receipt and instrument/source provenance where available.

Missing mandatory values become `TBD` or `BLOCKED`, never inferred from an unrelated concept or sample.

## Procedure

1. Define exact quantity, unit, comparison conditions and acceptance criteria before inspecting candidate results; identify benchmarks and limitations.
2. Run only permitted deterministic calculation/solver tools; report NOT_RUN if not actually executed on a trusted pinned host.
3. Check mesh/time-step/grid convergence, dimensional consistency, numerical residuals and solver version/geometry/mesh digests where applicable.
4. Propagate reference and numerical uncertainty; require measured gain above combined uncertainty before claiming improvement.
5. Separate computed screening, converged solver result, qualified independent verification and Director authorization as distinct fields.
6. Create a replayable negative test for mismatched SHA, out-of-tolerance result, missing provenance, missing topology or unresolved safety inputs.

## Required output contract

- benchmark ID, computed/reference values and SI unit.
- solver version, source/mesh/geometry hashes and actual execution condition.
- absolute error, combined uncertainty, acceptance threshold and status.
- independent reviewer evidence and precise remaining engineering hold.

Every result must contain `sourceCommitSha`, `configurationId`, `revisionId`, a provenance/evidence manifest or precise missing-evidence list, and one of `PROPOSED`, `SCREENED_UNVERIFIED`, `BLOCKED`, `NOT_RUN`. Never assign `ENGINEERING_RELEASED` via this skill.

## Fail-closed checks

- Reject: model-written numbers treated as executed solver results.
- Reject: zero numerical residual or claimed convergence without run receipt.
- Reject: screening tolerance adopted as a naval regulatory limit.
- Reject: green CI treated as external technical verification.

## Synthetic negative tests

- invalid solver receipt returns NOT_RUN or BLOCKED.
- uncertainty-exceeding claimed improvement is INCONCLUSIVE.
- wrong geometry SHA or topology invalidates benchmark.

## Project implementation references

- `src/core/verification/NumericalVnVHarness.ts`
- `src/core/verification/ThreeGridConvergence.ts`
- `src/core/verification/GridConvergenceStudy.ts`
- `docs/FOSSEN_PHASE2_SOURCE_AND_RUNNER.md`
- `docs/governance/INDEPENDENT_REVIEW_STANDARD.md`

## Acceptance boundary

A skill checklist or synthetic test proves method completeness only. Engineering acceptance requires authentic configuration-specific evidence, independent qualified reviewer disposition and authenticated human authority. Preserve unresolved gates exactly as recorded.
