# A26 R3 — unified research ingestion runbook (proposed)

The A26 authority model remains **one agent** `INTEL-USV-26`. Public global fleet and scientific knowledge research use source-specific discovery adapters, **one read-only consolidation contract**, and distinct reviewer-controlled outputs. External software research remains governed by the original R2 annex and separate software-qualification controls.

## Two PRs and the integration boundary

- [PR #123](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/123) already proposes **worldwide discovery**: multilingual RSS and historical searches (not capped at 14 vessels), OpenAlex scholarly-document metadata, open-license-gated PDF snapshots, source registers, Obsidian candidate notes, and research triage.
- [PR #126](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/126) adds **manufacturer/institution source snapshots** with SHA-256 digests, model identity/quotation checks, and a **shared A26 evidence contract**. It must not replace PR #123's broad discovery with ten seeds.
- The two PRs are **not merged or tested together** merely because this interface was authored. Review exact-head compatibility, rebase, preserve CI results, then adopt both under the existing protected software governance.

## One evidence contract, distinct source classes

`scripts/a26/unified-evidence.mjs` accepts three source formats and publishes `unified-a26-evidence.json` and unverified Obsidian note drafts.

| Evidence class | Input | What it supports | What it does not support |
| --- | --- | --- | --- |
| FLEET_LEAD | PR #123 `discovery-register.json` or fleet campaign report with `register.records` | Public discovery lead, source metadata and entry hash | Verified operating model or engineering performance |
| KNOWLEDGE_DOCUMENT | PR #123 `document-register.json` | DOI/publication metadata, version observations and review request | Licence approval, paper-content truth or inspected PDF bytes |
| USV_SOURCE_SNAPSHOT | PR #126 `evidence-index.json` | Actual retrieved source snapshot SHA and model-name corroboration; direct quote records | Independent vessel specifications or operational status |

A SHA-256 digest over a feed entry or OpenAlex metadata is **not** a digest of an underlying PDF or a guarantee of its validity. Both forms retain their origin. Conflicts become review items. The vault notes are draft-only under `obsidian-unverified/`; no trusted note is overwritten.

## Operator sequence, after reviewed merge

```bash
npm run a26:test
# Worldwide PR #123 collector and document workflows run under their own
# governed scripts/scheduled Actions after PR #123 is accepted.
npm run a26:collect
npm run a26:unify -- --fleet references/fleet-intelligence/discovery-register.json --documents references/fleet-intelligence/document-register.json --snapshots .local-concept-research/a26-global-usv/evidence-index.json --out .local-concept-research/a26-unified
```

Use the **actual latest reviewed PR #123 register proposals** (or PR #123 campaign report) instead of empty repository baselines when evaluating live coverage. The `--fleet`, `--documents`, and `--snapshots` inputs are individually optional; at least one is required. The consolidation is deterministic and does not use any paid model tokens.

A26 research synthesis can consume the unified contract through the existing Mission Control queue:

```bash
npm run mission-control:quota -- enqueue --id A26-UNIFIED-RESEARCH-001 --agent INTEL-USV-26 --classification PUBLIC_SOURCE_SAFE_ONLY --unified-index .local-concept-research/a26-unified/unified-a26-evidence.json --objective "Compare the source-pinned public fleet leads, engineering literature and USV snapshots. Record uncertainties and review questions only; do not certify designs."
USV_SUBSCRIPTION_PILOT=enabled AI_REVIEW_PROVIDER=codex_cli USV_LAB_SCOPE=RESEARCH_ONLY npm run mission-control:quota -- run
```

Use a new unique task ID for each authorized run and preserve the exact Git revision. No manual task-SHA edits or quota-reset shortcuts.

## Commissioning gates

1. **Offline implementation:** test the parsers, source restrictions, shared contract, duplicate/conflict cases and denial cases against a pinned revision.
2. **Public data acquisition:** observe actual successful network calls and content hashes, including failed sources. GitHub Actions schedule availability and a successfully archived run are separate facts.
3. **Knowledge unification:** run with non-empty fleet and document outputs from PR #123 and non-empty snapshot output from PR #126, verify relation links and source-class distinctions.
4. **Research quality:** require real original-source review of model identity and claims; validate 10 public models across 5 countries **from actual snapshots**, never just seeded names.
5. **Independent authority:** separate relevant marine specialist review, Director/ECR approval and engineering release. The shared contract does not implement or grant these controls.

Global completeness has **no verified denominator**. Planned/experimental/prototype and operational systems remain separately classified only after independent source review. Paid Google Drive durable archival and trusted Obsidian ingestion are unverified integrations, not implied by creating local evidence artifacts.
