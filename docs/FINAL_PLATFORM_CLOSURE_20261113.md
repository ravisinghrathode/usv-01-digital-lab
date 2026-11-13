# USV-01 engineering platform closure — 2026-11-13

This document separates **implemented software capability** from **external engineering acceptance**.

## Implemented and regression-tested

- Research-first, source-bound concept generation; model numbers remain hypotheses unless provenance is supplied.
- Deterministic seeded/replayable concept screening; fabricated "agent consensus", fake Sobol indices and invented compliance defenses removed.
- Iterative proposal → deterministic tools → discipline specialists → A15 critique → revision loop.
- A09/A10/A14 source-hashed mass/structure/electrical package paths.
- Monohull screening plus a deliberately limited twin-demi-hull catamaran hydrostatic screen.
- Authenticated provider commissioning with real Gemini API or operator-authenticated Gemini CLI; mock fallback prohibited.
- One-command no-API live campaign: `npm run design:live-cli` checks Gemini CLI availability, refreshes hashed public sources, forces API-key transport off and executes the bounded design loop against the exact checkout SHA.
- Restricted OpenFOAM / CalculiX execution with retained evidence, solver version, bounded artifacts, mesh/numerical screens and fail-closed states.
- Real CalculiX Linux analytical known case in CI.
- Real OpenFOAM v2606 V&V-family commissioning job in CI.
- Host-configurable/range-validated CPU, memory, file, process and wall-time ceilings.
- Explicit network-isolation backends with target-host preflight and no silent fallback.
- C3D8 aspect ratio + 17-point scaled-Jacobian screening.
- Operator-approved deterministic solver-template materialization: agent parameters are bounded; arbitrary solver archives/commands remain prohibited.
- Approved OpenFOAM templates may invoke only fixed `blockMesh` preprocessing under the same isolation/resource controls.
- Solver quality rejection and timeout are retained as diagnostic evidence and cannot become agent-usable engineering results.
- Three-grid Richardson/GCI-style discretization screen bound to exact retained solver evidence.
- `npm run solver:gci -- --campaign <json> --out <json>` executes a three-grid uncertainty campaign from controlled manifests/receipts.
- Flat-plate retained-field checker can report skin-friction correlation against the OpenFOAM/Weighardt reference without inventing a pass threshold.

## Explicitly NOT established by software

- A live Gemini design campaign has not been executed in repository CI because no authorized user/provider credential is present there. The remaining action is operator authentication, not repository software; once the CLI is signed in, `npm run design:live-cli` executes the campaign without an API key.
- A real free-surface USV hull resistance CFD case has not yet been independently validated.
- Three-grid/GCI software exists, but a three-grid **vessel** campaign has not yet supplied accepted physical/model evidence.
- Flat-plate/backward-step CFD commissioning is solver-path/V&V evidence, not validation of USV hull drag.
- No towing-tank / sea-trial / materials coupon / proof-load / battery / EMC / SIL/HIL evidence is created by this repository.
- Independent technical review and Engineering Director exact-baseline approval remain external human acts.
- The 13 engineering workstreams remain formally open until their required independent/physical evidence exists.

## Design-loop operating boundary

The intended safe cycle is:

```text
mission + authenticated sources
  → A01 hypothesis
  → deterministic hydro/resistance/mass/structure/electrical screens where inputs exist
  → operator-approved bounded solver template (optional)
  → real solver
  → mesh/residual quality disposition
  → A05/A06/A07/A09/A10/A14/A23 discipline challenge as applicable
  → A15 independent critic
  → A01 revision
  → fair fixed-condition comparison
  → Project Lead concept decision
```

A `COMPUTE_DONE_QUALITY_REJECTED` or `COMPUTE_TIMEOUT_REJECTED` result goes to critique/revision as diagnostic evidence; it is never a successful engineering metric.

## Closure criteria for the software platform

PR #52 can be considered **software-complete for independent review** when its exact head demonstrates:
1. TypeScript/static/build checks pass.
2. Full Vitest suite passes.
3. Python restricted-worker/template tests pass.
4. Real CalculiX known case passes.
5. OpenFOAM commissioning job either:
   - completes and reports its numerical disposition, or
   - reaches a bounded timeout with retained diagnostic evidence; timeout must not masquerade as acceptance.
6. Stage E remains blocked until Stage C/D are genuinely satisfied.

## Remaining project work after platform merge

The repository then becomes the tool used to converge the vessel itself. Each workstream must replace hypotheses with source-controlled calculations, qualified simulations, independent review and physical evidence. Project Lead concept selection is a project decision; it is not class approval, marine certification, independent engineering verification or Director release.
