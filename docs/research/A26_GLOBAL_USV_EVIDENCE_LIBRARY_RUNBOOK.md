# A26 Global USV Evidence Library — execution and review manual

**Mandate:** identify and maintain the broadest practical **publicly discoverable** catalogue of operational, prototype, trial, experimental, announced and relevant research USVs, across navies, manufacturers and civilian labs worldwide. **14 seeded vessels are a legacy starting point, not a discovery cap.** Absolute global completeness and restricted/classified data are not promised.

## Implemented discovery lanes

1. **Worldwide fleet and prototype leads:** `scripts/a26-fleet-campaign.mjs` executes 73 public news/technical search feeds in up to four bounded batches. Ten searches use original-language regional editions for Japan, Korea, Türkiye, France, Germany, Spain, Russia, Arabic-speaking navies, Chinese-language sources and India. It also checks three public naval trade-press feeds. Every attempted feed gets a timestamp, retrieval outcome and source hash.
2. **Technical documents and scientific learning:** `scripts/a26-document-library.mjs` searches OpenAlex for 18 USV-specific research and engineering subjects. It creates a DOI/author/publication/OA-link manifest with source hashes and version observations, without assuming OpenAlex's metadata certifies content. Research paper and technical report candidates remain unverified, separate from engineering baseline.
3. **Files and photographs:** RSS/Atom enclosure links for PDFs, photos and supplementary files are captured as links marked `UNKNOWN_REVIEW_REQUIRED`. Optional `--download-open-licensed` retrieves up to eight PDF files per run **only** when a supported open license is present in source metadata **and** the PDF host is on the restricted allowlist. Files are byte-capped, hashed and treated as untrusted; there is no execution, automatic PDF rendering or unsupported license claim. CAD/model/source files from other hosts are **linked for later license and safety review**, not automatically downloaded.
4. **Knowledge graph and Obsidian:** the collector generates separate `candidate-notes` Markdown with source links, publication timestamps, hashes and unresolved verification questions. It never overwrites trusted `docs/vault/usv-fleet/<model>.md` notes or makes claims about USV-01 design validity.

## Persistent review structures

- `references/fleet-intelligence/discovery-register.json`: unverified article/vessel mentions, deduplicated by title normalized identity; existing 14 aliases only help search. Capped at 2,000 review leads per registry revision to protect GitHub size. Larger intake requires batching/archiving, not silent omission; run receipts flag coverage limitations.
- `references/fleet-intelligence/document-register.json`: unverified scholarly metadata, deduped by stable OpenAlex work ID, separately versioned if source claims change. Capped at 3,000 references per review revision; this is not a count of known vessels.
- `docs/research/A26_FLEET_DISCOVERY_QUEUE.md` and `docs/research/A26_DOCUMENT_DISCOVERY_QUEUE.md`: review-facing indexes.
- `docs/vault/usv-fleet/candidate-notes/`: source-linked unverified Obsidian drafts, capped to the first 200 per PR to limit repository bloat.
- GitHub Actions run artifacts: per-source evidence, full data proposals, permitted PDF bytes, file manifests, with a **60-day retention limit**. This is **not** permanent file storage. A separately authorized storage integration such as the project's paid Google Drive must be configured before claiming durable archival of all source bytes.

## Automation and model quota

- Workflow `.github/workflows/a26-public-fleet-discovery.yml` runs on Tuesdays/Fridays and on manual dispatch after it is merged to the default branch. The **actual scheduled run must be observed** before marking production discovery commissioned. No user's Mac, terminal or Codex allowance is needed for GitHub Actions.
- Offline CI runs the public fleet parser, 73-query sharded campaign, scholarly metadata tests, file hash/license guards, corruption tests and review barriers. These tests use fixture data and consume zero model tokens.
- After collection, source-linked metadata can be proposed in a **protected PR**, not self-approved. A failed PR creation does not erase the run artifact or authorize auto-promotion.
- The existing subscription quota manager is separate from this zero-token discovery lane. A26 can later use its permitted GPT model to interpret the public evidence when quota permits, but an LLM interpretation is not an independent engineering verification.

## Acceptance sequence

1. Verify all exact-head CI tests, source-source authorization and the protected governance gate. This is code acceptance, not global data verification.
2. Merge via existing authenticated software-security approval. Do not bypass Stage D/E.
3. Trigger the new public workflow once; inspect actual `sourcesSucceeded`, `sourcesFailed`, `sourceReceipts`, `newResearchLeads`, scholarly `queriesSucceeded`, PDF byte hashes and any rate limits. Do not infer all configured endpoints are available.
4. Curate vessel identity, operator, class, prototype/operating status and each technical parameter **claim by claim** from authoritative references. Unverified details remain UNKNOWN, and reference values never silently enter the controlled USV-01 baseline.
5. Independently review changes and publish only approved public research records to the knowledge graph. Secure proprietary/client/Naval sources are excluded from public discovery and GitHub.

## Scope limits and provenance

News/RSS search is not a complete Internet crawler. Language and indexing bias, unavailable public-source files, proprietary drawings, publication licensing, API quotas and access restrictions prevent literal collection of every worldwide craft and all its files. The transparent dashboard shows leads and publication records separately from the 14 seeded catalogue. A working model, a prototype, a proposed concept and a press announcement are **different evidence categories** that must not be conflated.

Sources and docs: [OpenAlex Works API](https://help.openalex.org/api/endpoints/) and [OpenAlex OA locations and licenses](https://help.openalex.org/data/works/open-access/).
