# A26 worldwide naval USV research discovery queue

**Status: DISCOVERED_UNVERIFIED — research evidence, not a naval fleet inventory.**

This review queue is initially empty. The scheduled A26 Fleet Scout collects only public RSS/Atom headline metadata, records source hashes, deduplicates mentions and proposes additions in a separate protected GitHub pull request. No new vessel is independently verified or promoted automatically.

- Accepted legacy catalogue: 14 seeded records in `src/data/globalUsvFleetData.ts`; individual claims still need primary-source verification.
- New research leads in controlled candidate register: **0**.
- Operational vessels newly verified by this collector: **0**.
- Engineering baselines or Obsidian trusted-vault notes updated: **0**.
- Global naval fleet coverage: **not exhaustive or certified**.

Future source-linked leads will appear here only after the protected discovery review PR is accepted. Their individual Obsidian proposals remain in `docs/vault/usv-fleet/candidate-notes/`, explicitly marked `DISCOVERED_UNVERIFIED`, and must never be confused with approved design data.

Evidence is captured per run in GitHub Actions artifacts under `a26-fleet-public-research-*`; see `.github/workflows/a26-public-fleet-discovery.yml`. The script can be run locally with no model calls using `node scripts/a26-fleet-discovery.mjs --out-dir /tmp/a26-fleet-intel`.
