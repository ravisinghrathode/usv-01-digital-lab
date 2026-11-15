---
name: marine-safety-and-degraded-modes
description: Analyze USV-01 COLREG-related advisory safety, communications loss, sensor degradation, launch/recovery and marine-environment hazards without commanding a vessel.
---

# marine-safety-and-degraded-modes

**Programme:** USV-01 | **Revision:** 1.0 | **Class:** RESEARCH-ONLY PROCEDURAL SKILL
**Canonical agents:** A04, A16, A17, A19, A20, A22, A24

## Authority and use

Use for relevant Naval AI Lab engineering work in the named agents, subordinate to `AGENTS.md`, the configuration management plan, actual approved policies and the existing human Engineering Director and independent review gates. This procedural skill **does not** grant tools, credentials, numerical validation, standard applicability, new model APIs, or release authority. An unapproved operating charter proposal is not an adopted baseline.

## Input contract

1. configuration, mission envelope, source SHA, revision, hazard and initiating fault.
2. sensor quality/freshness, lookout and track uncertainty, comms state, command arbitration state.
3. operator-approved degraded-state behavior and relevant requirements.
4. SIL/HIL replay cases and independent reviewer qualification.

Missing mandatory values become `TBD` or `BLOCKED`, never inferred from an unrelated concept or sample.

## Procedure

1. Enumerate hazard, environmental and operational context and applicable maritime obligations; do not infer legal compliance.
2. Classify restricted-visibility, overtaking, crossing, multi-target uncertainty, AIS-only and stale-data cases with explicit unknowns.
3. Assess loss of link, sensor faults, power/propulsion degradation, emergency override, local safe-state constraints and drift collision risks as separate scenarios.
4. Never use a universal zero-thrust or return-home command as a blanket lost-link response. Escalate to the separately approved safety supervisor/controller.
5. Verify safety screen's output contains no helm, throttle or physical actuation command; keep all synthetic SIL/HIL outputs labelled non-operational.
6. Cross-check MAR-01 lifting, acoustic payload, fouling, thermal, condensation and ingress effects for interfaces with autonomy and safety.
7. Require fault-tree/FMEA evidence, independent qualified review, HIL/sea-trial observations where applicable and Director authorization before a safety claim.

## Required output contract

- hazard ID, initiating condition, effect, controls and residual risk TBD.
- requirements/test trace for each degraded case and mode-specific blocking condition.
- a non-actuating advisory disposition and explicitly missing SIL/HIL/sea-trial evidence.
- review/authority record bound to configuration and source digest.

Every result must contain `sourceCommitSha`, `configurationId`, `revisionId`, a provenance/evidence manifest or precise missing-evidence list, and one of `PROPOSED`, `SCREENED_UNVERIFIED`, `BLOCKED`, `NOT_RUN`. Never assign `ENGINEERING_RELEASED` via this skill.

## Fail-closed checks

- Reject: autonomous helm/throttle/weapon or payload actuation.
- Reject: AIS-only proof of COLREG rule compliance or missing lookout ignored.
- Reject: automatic zero-thrust on comms loss without case-specific independent safety approval.
- Reject: synthetic SIL replay treated as marine qualification.

## Synthetic negative tests

- link-loss case yields advisory-only, never helm command.
- missing sensor freshness blocks safety approval.
- MAR-01 unresolved thermal or lifting hazard remains open.

## Project implementation references

- `docs/AUT01_AUTONOMY_COLREGS_SAFETY_CASE_20261113.md`
- `docs/AUT01_SIL_HIL_SEA_TRIAL_PROTOCOL.md`
- `docs/MAR01_MARINE_SYSTEMS_INTEGRATION.md`
- `src/core/verification/AutonomyColregsSafetyScreen.ts`
- `src/core/verification/AutonomySilReplay.ts`

## Acceptance boundary

A skill checklist or synthetic test proves method completeness only. Engineering acceptance requires authentic configuration-specific evidence, independent qualified reviewer disposition and authenticated human authority. Preserve unresolved gates exactly as recorded.
