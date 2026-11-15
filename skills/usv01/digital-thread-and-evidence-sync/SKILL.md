---
name: digital-thread-and-evidence-sync
description: Maintain versioned engineering evidence, source-digest integrity and conflict-safe synchronization across GitHub, paid Google Drive and Obsidian without authorizing publishing or baseline promotion.
---

# digital-thread-and-evidence-sync

**Programme:** USV-01 | **Revision:** 1.0 | **Class:** RESEARCH-ONLY PROCEDURAL SKILL
**Canonical agents:** A01, A02, A15, A20, A21, A23, A25, A26

## Authority and use

Use for relevant Naval AI Lab engineering work in the named agents, subordinate to `AGENTS.md`, the configuration management plan, actual approved policies and the existing human Engineering Director and independent review gates. This procedural skill **does not** grant tools, credentials, numerical validation, standard applicability, new model APIs, or release authority. An unapproved operating charter proposal is not an adopted baseline.

## Input contract

1. source commit SHA, project/mission/configuration/candidate/revision IDs.
2. source artifact URIs, digests, classification, owner and controlled version.
3. destination ACL/policy and approved sync direction.
4. parent revision, changed domains, evidence/reviewer record and conflicting versions.

Missing mandatory values become `TBD` or `BLOCKED`, never inferred from an unrelated concept or sample.

## Procedure

1. Treat GitHub version control and approved engineering manifests as authoritative for code/revision pointers; treat Obsidian as knowledge graph and Drive as controlled document storage, not as competing silent engineering masters.
2. Verify artifact bytes/digests, revision ID, classification, access scope and provenance before any proposed replication.
3. Represent every link as a typed edge among requirement, design, input, calculation, verifier, ECR, review and approval; preserve dependency invalidation.
4. Resolve conflicting versions by blocking and quarantining; never overwrite a source on the basis of timestamp, file title or model judgement.
5. Require explicit connector availability, auth and approved external publication/data-transfer permission; if unavailable, emit planned dry-run only.
6. Write a separate reconciliation report and immutable evidence manifest bound to source SHA; never import an external AI's self-assertion as independent engineering verification.

## Required output contract

- source/destination identity, version, SHA-256 digest and classification.
- evidence graph edges, missing links and exact duplicate/conflict reports.
- dry-run/blocked status unless authorized sync and actual connector receipt exists.
- signed decision or explicit pending approval for any controlled publication or promotion.

Every result must contain `sourceCommitSha`, `configurationId`, `revisionId`, a provenance/evidence manifest or precise missing-evidence list, and one of `PROPOSED`, `SCREENED_UNVERIFIED`, `BLOCKED`, `NOT_RUN`. Never assign `ENGINEERING_RELEASED` via this skill.

## Fail-closed checks

- Reject: export of restricted naval data to public or unauthorized cloud.
- Reject: silent Drive/Obsidian overwrites or self-approving synchronization.
- Reject: false claim that Obsidian graph or Drive file is the canonical code baseline.
- Reject: invented connector execution receipts.

## Synthetic negative tests

- mismatched source SHA quarantines sync.
- missing connector or ACL yields dry-run/blocked.
- candidate-specific evidence cannot be reattached to another configuration.

## Project implementation references

- `src/core/digital-thread/EngineeringDigitalThread.ts`
- `src/core/digital-thread/GovernedSyncCoordinator.ts`
- `docs/REPOSITORY_SYNC.md`
- `docs/governance/CONFIGURATION_MANAGEMENT_PLAN.md`
- `docs/governance/SOURCE_CODE_DATA_HANDLING_POLICY.md`

## Acceptance boundary

A skill checklist or synthetic test proves method completeness only. Engineering acceptance requires authentic configuration-specific evidence, independent qualified reviewer disposition and authenticated human authority. Preserve unresolved gates exactly as recorded.
