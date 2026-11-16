# A26 — All 97 external research repositories: auditable source screen

**As of 17 November 2026.** Scope: all 97 entries in the canonical register. Status: **research-only HOLD**, not qualification or approval.

## Established baseline

| Field | Baseline |
| --- | ---: |
| Registered third-party repositories | 97 |
| Full immutable commit/tree pins in register | 94 |
| Source pins absent | 3 |
| License metadata UNKNOWN | 45 |
| License metadata NOASSERTION (Dify custom license) | 1 |
| Existing detailed P1 technical static dossiers | 8 |
| Independently security-qualified, engineering-approved, or runtime-integrated | 0 |

Three sources lack immutable register pins:
- `EXT-002` — [`cybergalactic/MSS-Capytaine`](https://github.com/cybergalactic/MSS-Capytaine)
- `EXT-003` — [`ARPA-GO/shipcurve`](https://github.com/ARPA-GO/shipcurve)
- `EXT-004` — [`ntnu-itk-autonomous-ship-lab/collision_avoidance_identifier`](https://github.com/ntnu-itk-autonomous-ship-lab/collision_avoidance_identifier)

## Controlled evidence deliverables

- **Canonical record-by-record HOLD queue:** [`A26_ALL_97_REVIEW_QUEUE_2026-11-17.json`](../../references/third-party-static-audits/A26_ALL_97_REVIEW_QUEUE_2026-11-17.json). One record for every source ID, source pin, metadata license, past lifecycle, assigned discipline reviewers, and independent gate.
- **Offline validation:** `node scripts/a26-all97-review.mjs --check`. Verifies exact 97-record coverage and rejects changed source pins, omitted records, forged approvals and unapproved agent execution claims.
- **Public GitHub metadata verification:** `.github/workflows/a26-all97-source-screen.yml`. Bounded read-only GET requests to upstream immutable commits and root Git trees; records matching commit/tree SHA, root license blob path/SHA and root dependency manifest filenames. On missing source pins, records **proposed** current head/tree separately without modifying the canonical register. Requires only the ephemeral read-only Actions token.
- **Dated Actions evidence:** `source-screen.json` and `source-screen.md` attached to the run with 90-day artifact retention. This is run-specific observational evidence, not automatically admitted into protected source or an approval database.
- **Prior detailed evidence:** [`A26_P1_STATIC_AUDIT_2026-11-15.json`](../../references/third-party-static-audits/A26_P1_STATIC_AUDIT_2026-11-15.json) retains source/blob inspection and discipline-specific hypotheses for eight P1 repositories. The all-97 scan does not repeat or override that detailed assessment.

## Per-repository qualification gates

| Gate | Accountable reviewer | Evidence still needed before advancement |
| --- | --- | --- |
| Pinned upstream source | A26 | Immutable commit/tree match; root file Git blob IDs; resolve three missing source pins through protected PR |
| License/rights | Human legal reviewer | Actual license text and component terms; rights/notice/distribution analysis; HOLD for UNKNOWN, copyleft or custom licenses until reviewed |
| Security | A20 | Dependency lock and transitive inventory, SBOM and vulnerability review, hostile-content/prompt injection, subprocess and network boundary analysis |
| Interface/data boundary | A21 | Typed IO contracts, units/coordinate/time conventions, credentials, data classification, safe read-only interface where applicable |
| Architecture/governance | A04 and independently A23 | Measured suitability vs existing 26-agent platform; reject duplicate schedulers, unauthorized provider/paid-API changes and privilege escalation |
| Engineering-domain validity | Existing discipline agents, A18/A24/A15 as relevant | Independent reference cases, uncertainty and failure modes; vessel/hardware application on HOLD |
| Authority | Authenticated human review + applicable director gates | Exact-head software review for source changes; separate independent vessel design-release approval and approved controlled tool registration |

All listed gates are **uncompleted** at publication. A public-source pin, a root `LICENSE` blob, a successful GitHub Actions run, or an existing `EVALUATING` record does not grant qualification. A26 curation does not become a 27th agent or a second scheduler.

## Operating boundaries

1. **No untrusted execution:** the scanner uses GitHub JSON API read-only metadata only. It does not clone, install, import, evaluate, build, or run upstream repositories.
2. **Fail closed:** missing/renamed/private upstream sources, unpinned records, unreadable root trees or a SHA mismatch are explicitly held; fetching a default-branch proposal does not silently edit the source baseline.
3. **Root listing only:** detected root license filenames are Git blob references, **not** complete license compatibility reviews. Nested LICENSE files, dependency vulnerabilities and actual runtime behavior remain unchecked.
4. **No automated promotion:** all 97 remain `HOLD_NOT_QUALIFIED` in the review queue. The canonical register keeps its existing `DISCOVERED`/`EVALUATING` lifecycle; `QUALIFIED`, `INTEGRATED`, registered tools, agent tool invocations and vessel operating authority are not asserted.
5. **Review recurrence:** the bounded source screen runs on protected-PR changes, manual dispatch, and each Tuesday scheduled run. Its artifacts require human engineering/security triage; monitoring evidence does not silently auto-merge into protected `main`.

## Next release gates

Review the run-specific JSON and advance sources individually through evidence-bearing A20/A21/A04/A23 and relevant marine specialists. For any proposed use of untrusted code, require separate operator-authorized, isolated evaluation and verifiable independent numerical outcomes. Any `QUALIFIED` promotion must be a distinct controlled change with live signed evidence; software assessment never substitutes for vessel-release authority.
