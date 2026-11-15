---
name: marine-requirements-and-standards
description: Apply USV-01 requirement identification, standards applicability, source traceability and missing-input gates to marine engineering tasks without inventing certification claims.
---

# marine-requirements-and-standards

**Programme:** USV-01 | **Revision:** 1.0 | **Class:** RESEARCH-ONLY PROCEDURAL SKILL
**Canonical agents:** A01, A02, A03, A04, A18, A21, A24

## Authority and use

Use for relevant Naval AI Lab engineering work in the named agents, subordinate to `AGENTS.md`, the configuration management plan, actual approved policies and the existing human Engineering Director and independent review gates. This procedural skill **does not** grant tools, credentials, numerical validation, standard applicability, new model APIs, or release authority. An unapproved operating charter proposal is not an adopted baseline.

## Input contract

1. project/mission/configuration/revision IDs and exact source commit.
2. candidate requirement ID, description, discipline and verification intent.
3. jurisdiction, operating envelope, authority and authentic standards edition where known.
4. evidence references, applicability rationale and unresolved TBDs.

Missing mandatory values become `TBD` or `BLOCKED`, never inferred from an unrelated concept or sample.

## Procedure

1. Classify requirement by mission, physical function, environmental conditions and safety consequences; retain source reference and source revision.
2. Check whether the proposed standard/class rule is actually applicable to the exact craft, mission, flag/operator and time; never infer a mandatory rule from a search result.
3. Crosswalk requirement IDs to owned agent role, design artifact and test method (analysis, inspection, demonstration, test) with pass/fail evidence expectations.
4. Include launch/recovery, hull integrity, wet-end acoustic interfaces, thermal, condensation, fouling and degraded communication cases from MAR-01/AUT-01.
5. Emit a requirement-to-evidence ledger distinguishing APPROVED_SOURCE, PROPOSED, TBD and NOT_APPLICABLE_WITH_RATIONALE; fail closed on unknown mandatory limits.
6. Route unresolved safety-critical applicability or acceptance to the authorized marine regulatory specialist and qualified human reviewer.

## Required output contract

- requirements with unique IDs, discipline owners, source URLs/document digests and revision IDs.
- applicability status and justification per standard; no invented class limits.
- verification method plus accountable reviewer and dependency IDs.
- blockers/TBD list; study-only disposition until independent evidence and authorized adoption.

Every result must contain `sourceCommitSha`, `configurationId`, `revisionId`, a provenance/evidence manifest or precise missing-evidence list, and one of `PROPOSED`, `SCREENED_UNVERIFIED`, `BLOCKED`, `NOT_RUN`. Never assign `ENGINEERING_RELEASED` via this skill.

## Fail-closed checks

- Reject: source claim with no edition/reference; false assertion that proposal is legally binding.
- Reject: unknown safety criterion marked PASS or NOT_APPLICABLE by default.
- Reject: conversion of CI check, model opinion or retrieved text into engineering/class certification.

## Synthetic negative tests

- missing standards edition keeps item TBD.
- unknown launch/recovery criterion blocks baseline selection.
- rule applicability needs source and human disposition.

## Project implementation references

- `USV01_PROJECT_CONTEXT.md`
- `docs/governance/CONFIGURATION_MANAGEMENT_PLAN.md`
- `docs/MAR01_MARINE_SYSTEMS_INTEGRATION.md`
- `docs/AUT01_AUTONOMY_COLREGS_SAFETY_CASE_20261113.md`
- `src/core/verification/MarineSystemsEvidenceGate.ts`

## Acceptance boundary

A skill checklist or synthetic test proves method completeness only. Engineering acceptance requires authentic configuration-specific evidence, independent qualified reviewer disposition and authenticated human authority. Preserve unresolved gates exactly as recorded.
