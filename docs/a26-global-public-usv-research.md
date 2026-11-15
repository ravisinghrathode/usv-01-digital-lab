# A26 public USV acquisition — governed research workflow

**Scope:** Public-source discovery and review support only. No engineering certification, actuator control, procurement decisions, controlled-data retrieval, autonomous weapon use, or baseline release.

## Commands

```bash
npm run a26:test
npm run a26:collect
npm run a26:report
npm run a26:accept
```

Live collection requires network access and obeys robots.txt, HTTPS-only host validation, manual redirect rejection, a 4 MiB per-source cap, and per-host pacing. Downloaded bytes, a SHA-256 content digest, retrieval timestamp, source URL, and review status are written under ignored `.local-concept-research/a26-global-usv/`. GitHub Actions automatically runs offline tests on applicable changes; a daily scheduled/dispatch run performs bounded source retrieval and uploads its results as a short-retention artifact. The schedule only activates on the default branch after merge and only if repository Actions are enabled.

The seed registry `references/a26-public-usv-seeds.json` holds ten **candidates** from six manufacturer countries. These were selected from open manufacturer or research-institution pages. The country field is the supplier's jurisdiction, **not** a claim of deployment or government ownership. No seed creates an approved performance specification.

## Evidence status and acceptance

`SOURCE_IDENTITY_CORROBORATED_UNREVIEWED` means the HTTPS snapshot contained the candidate model name. This does **not** validate its operating status or numerical specifications. Numeric fields require a recorded literal quotation from the downloaded source. Such fields remain `QUOTE_MATCHED_UNREVIEWED` until independent engineering review.

`npm run a26:accept` checks actual acquisition records, not seeded names: at least ten source-corroborated model identities in five countries, with no malformed evidence claims. A passing discovery gate is **not** an independent engineering acceptance, and no release permission follows. Failed sites remain failures; never fabricate evidence. PDFs are stored with SHA-256 but are not used for automatic model identity verification until a separate, trusted PDF extraction/review step exists.

To enqueue a traceable, research-only A26 task **after successful collection** (use a new unique task ID for each run):

```bash
npm run mission-control:quota -- enqueue --id A26-RESEARCH-20261115-001 --agent INTEL-USV-26 --objective "Review public-source USV evidence; identify conflicting specifications, unresolved TBDs and prospective research work. No engineering decisions." --classification PUBLIC_SOURCE_SAFE_ONLY --evidence-index .local-concept-research/a26-global-usv/evidence-index.json
```

Then dispatch using the existing signed-in Codex subscription path:

```bash
USV_SUBSCRIPTION_PILOT=enabled AI_REVIEW_PROVIDER=codex_cli USV_LAB_SCOPE=RESEARCH_ONLY npm run mission-control:quota -- run
```

The evidence index is passed into A26 as **unverified research input**. The agent may reason about the material but cannot promote it to a vetted engineering baseline. The usual clean/commit-pinned Git guard, quota ledger and human-review holds still apply.

## Expansion, provenance and completeness

Use `discoveryCandidates` in the evidence index as a **review queue**, not an automatically trusted source registry. The collector extracts bounded same-domain links from manufacturer pages but deliberately does not spider unreviewed URLs or bypass publisher restrictions. Approved candidates may be added to the JSON registry, then refreshed incrementally with `--stale-days N`.

Canonical identity is manufacturer + normalized model. Alternate names and source references can be consolidated; variants must be kept distinct when engineering differences are documented. Source conflicts, blocked sites, changed specification claims and model aliases remain explicit review items.

For global coverage, expand registry sources by country, language, organization and mission class. There is no defensible universal total for all prototype and operational USVs, so the coverage report explicitly says `globalCompleteness: UNKNOWN_NOT_CLAIMED`. A future review track should add human-approved multilingual sources and independent cross-publisher corroboration, not simply raise seed counts.

## Acceptance matrix

| Priority | Deliverable | Evidence |
|---|---|---|
| P0 | Governed source acquisition | A26 collector, robots handling, HTTPS/sizing/redirect guards |
| P0 | Retrieval and provenance | Local content-addressed snapshots, timestamps and SHA |
| P0 | Vessel records | Seed provenance, source-backed quote matching, unverified status |
| P1 | Reconciliation | Stable key, alias/source deduplication, conflict/uncertainty status |
| P1 | 10 models / 5 countries | Live acceptance command, which fails until real retrieval supports threshold |
| P2 | Global refresh | Registry expansion queue, freshness cache, scheduled Actions collection |

**Not completed merely by merging this PR:** all-web global coverage, complete research documents for every vessel, independent engineering accuracy review, and proof of a successful scheduled run. These require live executions and more sources.
