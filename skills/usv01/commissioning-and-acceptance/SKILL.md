---
name: commissioning-and-acceptance
description: Assemble source-pinned operational readiness and engineering acceptance evidence for USV-01's 26 agents and M00-M08 milestones without confusing software tests with live host, qualified V&V or vessel release.
---

# commissioning-and-acceptance

**Programme:** USV-01 | **Revision:** 1.0 | **Class:** RESEARCH-ONLY PROCEDURAL SKILL
**Canonical agents:** A01, A03, A14, A15, A18, A19, A20, A21, A22, A23, A24, A25, A26

## Authority and use

Use for relevant Naval AI Lab engineering work in the named agents, subordinate to `AGENTS.md`, the configuration management plan, actual approved policies and the existing human Engineering Director and independent review gates. This procedural skill **does not** grant tools, credentials, numerical validation, standard applicability, new model APIs, or release authority. An unapproved operating charter proposal is not an adopted baseline.

## Input contract

1. exact branch/commit and deployed source digest.
2. 26-agent registry/configuration and test catalog with genuine or synthetic labels.
3. trusted host evidence, current-source CLI/provider execution receipts, independent V&V and reviewer records.
4. milestone dependencies, risk register, human signature and unresolved TBDs.

Missing mandatory values become `TBD` or `BLOCKED`, never inferred from an unrelated concept or sample.

## Procedure

1. Capture the exact source SHA and record whether the executable runtime is current; refuse historical or synthetic evidence as proof of same-SHA live operation.
2. Separate deterministic CI, provider model generation, trusted-host health, qualified independent engineering acceptance and signed Director vessel release.
3. Verify canonical A01–A26 role mapping, mandatory deterministic tools, source-bound handoff receipts and failures for the 26-agent matrix.
4. Test stage A/B/C/D/E governance and gate behavior; missing authorization must remain BLOCKED even if tests pass.
5. Use the existing M00-M08 milestone dependencies; do not mark M02–M08 closed without their particular authenticated acceptance records.
6. Evaluate negative cases for stale geometry, forged reviewer authority, duplicate agent receipts, budget/API fallback and unauthorized actuation.
7. Publish a research-only readiness report with evidence paths, blockers and precise next authorities. Do not auto-merge protected software or release a vessel.

## Required output contract

- current code SHA, deployed SHA if verified and exact test/run receipt IDs.
- per-agent status: configured, deterministic checked, live executed, qualified verified, Director approved.
- milestone gate matrix with BLOCKED, NOT_RUN, PENDING or ACCEPTED_WITH_SIGNED_EVIDENCE.
- clear remaining steps separated into code deficiencies versus external/physical evidence.

Every result must contain `sourceCommitSha`, `configurationId`, `revisionId`, a provenance/evidence manifest or precise missing-evidence list, and one of `PROPOSED`, `SCREENED_UNVERIFIED`, `BLOCKED`, `NOT_RUN`. Never assign `ENGINEERING_RELEASED` via this skill.

## Fail-closed checks

- Reject: 26/26 synthetic samples presented as operating agents.
- Reject: test green claimed as independent marine validation.
- Reject: closed readiness milestone with unsigned or stale evidence.
- Reject: new paid model API, copied ChatGPT cookies, actual actuator commands.

## Synthetic negative tests

- stale host SHA blocks current-source readiness.
- zero qualified reviews means zero independently accepted agents.
- missing project lead/Director authorization retains engineering release HOLD.

## Project implementation references

- `docs/USV01_26_AGENT_OPERATIONAL_ACCEPTANCE.md`
- `docs/AGENT_READINESS_20261114.md`
- `config/delivery-milestones.json`
- `docs/governance/INDEPENDENT_REVIEW_STANDARD.md`
- `docs/SUBSCRIPTION_ONLY_CODEX_MIGRATION.md`

## Acceptance boundary

A skill checklist or synthetic test proves method completeness only. Engineering acceptance requires authentic configuration-specific evidence, independent qualified reviewer disposition and authenticated human authority. Preserve unresolved gates exactly as recorded.
