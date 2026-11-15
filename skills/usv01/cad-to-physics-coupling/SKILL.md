---
name: cad-to-physics-coupling
description: Couple controlled CAD geometry with hydrostatics, mass and CG, resistance, structure, thermal and propulsion screens using configuration-identical, invalidatable engineering evidence.
---

# cad-to-physics-coupling

**USV-01 research-only procedure | Revision 1.0 | Canonical agents:** A01, A05, A06, A07, A08, A09, A10, A11, A12, A13, A14, A18, A21, A24

## Authority and use

Source-controlled procedural guidance for the existing 26-agent Naval AI Lab. It does not grant new tools, credentials, model APIs, compute, shipping/physical actuation, certification or Engineering Director authority. Existing `AGENTS.md`, approved configuration management, exact-head software security review and engineering signoff take precedence. No design or vessel release is authorized by this skill. Do not claim the unadopted draft charter is binding.

## Input contract

1. Exact project/mission/configuration/candidate/revision ID, parent revision and source SHA.
2. Authoritative geometry URI and SHA-256 digest, topology, SI coordinate frame, offsets and watertightness status.
3. Complete mass/load-case/fluids/payload ledger and LCG/TCG/VCG definitions with source and uncertainty.
4. Approved environmental conditions, solver input conventions, benchmarking reference and previous node receipts.

Missing required inputs are `TBD`, `BLOCKED`, or `NOT_RUN`; no fabricated defaults. Use the actual `sourceCommitSha`, `configurationId` and `revisionId` for every evaluation.

## Procedure

1. Resolve one candidate revision and validate controlled artifact digests and topology before requesting any physics discipline. Screenshots or UI meshes are previews, not study CAD.
2. Normalize dimensions, densities, reference axes, component masses and moments to SI units and a declared coordinate frame; never silently mix from the separate short preliminary concept.
3. Build a trace matrix mapping source geometry sections and load cases to hydrostatics, stability, resistance, structural loads, acoustic appendages, thermal paths and propulsion/electrical inputs.
4. Where physics has topology-specific validity limits, reject applying a monohull empirical method to a multi-hull candidate without separately reviewed model support.
5. Compute dependency invalidation on changes in geometry, mass/CG, load cases, power, materials, sea state and sensor-interface dimensions; rerun all affected nodes.
6. Capture actual deterministic/solver execution receipts and error/uncertainty; unsupported or unrun calculations stay NOT_RUN, missing required parameters stay TBD or BLOCKED.
7. Compare same-condition results to independent benchmarks only after inputs and numerical uncertainty are verified; send candidate revisions through independent challenge, then Director approval if applicable.

## Required output contract

- Geometry and mass/CG input manifest with exact digests, revision and units.
- Discipline handoff graph with origin flags, dependency IDs, invalidated nodes and required re-executions.
- Result-versus-reference comparison plus solver receipt and uncertainty, if executed.
- PRELIMINARY/BLOCKED disposition, missing evidence and qualified review tasks.

Every output shall include evidence provenance, source commit, configuration and revision. Status allowed: `PROPOSED`, `SCREENED_UNVERIFIED`, `BLOCKED`, `NOT_RUN`. Do not emit `ENGINEERING_RELEASED` or `HUMAN_APPROVED` without the separate authenticated gate.

## Fail-closed checks

- Reject: Mixing candidate A geometry with candidate B mass/CG or receipts.
- Reject: Release claim based on screenshot, unversioned STL or speculative model values.
- Reject: Reusing a solver response after a relevant upstream digest change.
- Reject: Claiming verified stability or real CFD solely from green static CI.

## Synthetic negative tests

- Mass ledger mismatch blocks hydrostatic study comparison.
- Changed beam invalidates prior hydrostatics/resistance.
- Unrun solver generates no authoritative numerical claim.
- Two candidate revisions remain isolated under equal comparison conditions.

## Project implementation references

- `src/core/digital-thread/EngineeringDigitalThread.ts`
- `src/core/optimizer/CoupledDesignController.ts`
- `src/core/verification/NumericalVnVHarness.ts`
- `docs/governance/CONFIGURATION_MANAGEMENT_PLAN.md`
- `docs/MAR01_MARINE_SYSTEMS_INTEGRATION.md`

## Acceptance boundary

Procedure-selection tests are software evidence only. A successful deterministic or model run is not independently validated engineering, field commissioning, regulatory compliance, or human release. Require authentic configuration-specific evidence and a qualified independent reviewer. This skill is part of the final **frozen** USV-01 skill set; additions need a new deliberate governed exception.
