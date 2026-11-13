# USV-01 Repository Scout (read-only technology discovery)

## Scope and purpose

The scout is a **software intelligence utility**, not a 27th engineering agent, not an automated importer, and not a vessel-baseline approval engine. It searches **public GitHub repositories** for tools and reference implementations that may help the USV-01 first-principles engineering lab. Its primary coordinator is the existing **A26 Fleet Intelligence & Benchmark Analyst**; specialized agents evaluate candidate relevance and A15/A23 independently challenge technical claims. The scout only identifies candidates and prepares a review queue.

It never clones code, installs dependencies, invokes a model, runs software from discovered repositories, modifies engineering parameters, changes the control plane, or publishes credentials. No third-party repository gains execution permissions through discovery.

## Running

Node.js >=20 is sufficient (no npm install needed):

```bash
node --test tests/repository-scout.test.mjs
GITHUB_TOKEN=<read-only GitHub token> node scripts/repository-scout.mjs \
  --max-queries 18 --per-query 30 --limit 100 \
  --out-dir /tmp/usv01-repository-scout
```

`GITHUB_TOKEN` is optional on a workstation but recommended to avoid very low unauthenticated rate limits. Never commit it. Output defaults to a directory under the operating system temporary folder, not the controlled engineering baseline. `latest.json` is the structured discovery queue and `latest.md` is the human-readable shortlist. Each run records timestamp, source SHA when known, query counts and incomplete-coverage/error warnings. Scores are **heuristic discovery priority**, never engineering accuracy or certification.

GitHub Actions runs tests for relevant pull requests; after this change is reviewed and merged to the default branch, a bounded scan runs **weekly on Monday at 02:17 UTC**, or on manual workflow dispatch. The workflow has read-only `contents` permissions and uploads reports as 30-day artifacts. It does **not** commit reports, open pull requests, or auto-adopt software.

## Coverage and search tuning

`config/repository-scout.json` lists 12 search categories, mapped to canonical A01–A26 roles: USV platforms, hull design, CFD/resistance, marine simulation, navigation/COLREGS, autonomy/control, sonar/perception, propulsion/power, NMEA/communications, V&V/safety, structures/materials and digital twins. Each category has first and secondary query terms and keyword signals.

A default scan queries one search result page for each of up to 18 round-robin queries, with 30 hits/page. It deduplicates using case-folded `owner/repo` identities, caps processing at 300 unique repositories, and emits the top 100. The cap, GitHub search engine/index, ranking, result pagination, API rate limits and availability mean **this cannot discover all Git repositories**. It does not search GitLab, Codeberg, private repositories or arbitrary Git hosts. Later integrations must use separately authorized, read-only credentials.

The rank score (0–100) combines engineering category/keyword match (up to 55), last push recency (up to 15), GitHub stars (up to 15), description signal (up to 5), and recognized machine-readable license signal (up to 10). Archived/forked results are excluded from collection. Stars and recency are *not* proofs of code quality; source license and security review never pass automatically. GitHub metadata may be stale or incorrect. The candidate list retains license status and flags for independent review.

## Human review workflow

1. **A26** creates a proposed investigation queue with source URL, retrieval timestamp, matching domains, score, license, and flags.
2. **Specialist A05–A24** as applicable assess technical scope, numerical fidelity, benchmark applicability, reproducibility, API compatibility, dependency risks, security and supply-chain posture, license/redistribution constraints, maintenance, and interface boundaries. Record source commit SHA and controlled evidence before any local sandbox execution.
3. **A15 and A23** independently challenge suitability, assumptions and evidence; A20 reviews security and A21 interfaces where applicable. A18/A24 handle reproducible verification. Existing Stage A/E governance routing continues to apply.
4. **Engineering Director** decides whether a separately proposed, reviewed integration is permissible. No ranking or automatic GitHub workflow can approve vessel design, safety behavior, source-code governance changes, or third-party code incorporation. Physical vessel controls remain air-gapped.

This utility does not supersede `scripts/collect-public-references.ts`, which collects identified published PDFs; it complements that publication provenance pipeline with **repository metadata discovery**. Source code must not be treated as a published scientific reference or independently verified design calculation merely because it appears on GitHub.

## Expected evidence and constraints

The scout deliberately labels each record `DISCOVERED_AWAITING_HUMAN_AND_INDEPENDENT_REVIEW` and `GITHUB_API_METADATA_NOT_SOFTWARE_VERIFICATION`. Unknown or copyleft licensing is explicitly flagged. No security assessment or marine accuracy verification is claimed. Licensing compatibility, dependency vulnerability scanning, secure execution in an isolated sandbox, baseline traceability and engineering acceptance require subsequent manual review.

A production candidate intake process should separately record the exact Git commit, SPDX/source license terms, build/test results, comparison to validated marine reference cases, external dependencies and known vulnerabilities, reviewer identity, and Engineering Director decision. Unknown values stay `TBD`.