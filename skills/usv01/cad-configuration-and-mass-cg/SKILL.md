---
name: cad-configuration-and-mass-cg
description: Validate the engineering digital thread for parametric hull geometry, mass and center-of-gravity ledgers, units and configuration-specific revision invalidation.
---

# cad-configuration-and-mass-cg

**Programme:** USV-01 | **Revision:** 1.0 | **Class:** RESEARCH-ONLY PROCEDURAL SKILL
**Canonical agents:** A05, A06, A08, A09, A10, A11, A12, A13

## Authority and use

Use for relevant Naval AI Lab engineering work in the named agents, subordinate to `AGENTS.md`, the configuration management plan, actual approved policies and the existing human Engineering Director and independent review gates. This procedural skill **does not** grant tools, credentials, numerical validation, standard applicability, new model APIs, or release authority. An unapproved operating charter proposal is not an adopted baseline.

## Input contract

1. project/mission/configuration/candidate/revision and exact source SHA.
2. geometry artifact URI, topology, coordinate convention, geometry SHA-256 and parent revision.
3. mass ledger, fluid/payload states, LCG/TCG/VCG convention, units and source digests.
4. load case, assumptions, uncertainty and references for discipline coupling.

Missing mandatory values become `TBD` or `BLOCKED`, never inferred from an unrelated concept or sample.

## Procedure

1. Verify authoritative CAD source/revision identity; never use a rendering or screenshot as a controlled geometry baseline.
2. Check SI units, coordinate frame, physical finite bounds, topology and geometry/mass compatibility; do not combine values from different concepts.
3. Account for dry mass, payloads, fluids, temporary handling equipment, margin and load cases as supported; represent unprovided components as TBD.
4. Make every parameter origin explicit as CONTROLLED_SOURCE, DETERMINISTIC_DERIVED, MODEL_HYPOTHESIS or TBD, consistent with the digital-thread contracts.
5. On geometry/mass-CG/load-case change compute dependency invalidation; require fresh hydrostatics, resistance and other impacted analyses rather than recycling stale receipts.
6. Produce a new candidate revision artifact and conflict report only; do not modify or promote an approved baseline without CMP/ECR and Director authority.

## Required output contract

- candidate and revision IDs; parent and source digest references; topology and unit contract.
- mass/CG ledger with completeness and uncertainty flags.
- invalidated downstream nodes and recalculation queue; traceable digest conflicts.
- screening/blocked status separately from qualified external verification and signed approval.

Every result must contain `sourceCommitSha`, `configurationId`, `revisionId`, a provenance/evidence manifest or precise missing-evidence list, and one of `PROPOSED`, `SCREENED_UNVERIFIED`, `BLOCKED`, `NOT_RUN`. Never assign `ENGINEERING_RELEASED` via this skill.

## Fail-closed checks

- Reject: geometry digest mismatch or mixed-candidate evidence.
- Reject: incorrect coordinate frames, nonfinite mass/CG or missing required load cases.
- Reject: reusing prior revision solver evidence without validated equivalence.
- Reject: visual UI change treated as an approved CAD change.

## Synthetic negative tests

- candidate A evidence cannot validate candidate B.
- changed geometry invalidates downstream analyses.
- unknown CG or unsupported mass ledger blocks promotion.

## Project implementation references

- `src/core/cad/ParametricHullPipeline.ts`
- `src/core/digital-thread/EngineeringDigitalThread.ts`
- `src/core/optimizer/CoupledDesignController.ts`
- `docs/governance/CONFIGURATION_MANAGEMENT_PLAN.md`
- `tests/digitalThreadAndCoupledDesign.test.ts`

## Acceptance boundary

A skill checklist or synthetic test proves method completeness only. Engineering acceptance requires authentic configuration-specific evidence, independent qualified reviewer disposition and authenticated human authority. Preserve unresolved gates exactly as recorded.
