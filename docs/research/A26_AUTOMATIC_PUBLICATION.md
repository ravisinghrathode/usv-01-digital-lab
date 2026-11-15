# A26 automatic public research publication

## Data plane and authority separation

Two dedicated **research-only branches** are advanced automatically by scheduled/manual GitHub Actions:

- `research/live-a26`: latest A26 public USV fleet leads, scholarly references, public source snapshots, manifest and unified review evidence.
- `research/live-code-repositories`: latest bounded public GitHub repository discovery report, with run and source provenance, marked unreviewed and unapproved.

Neither data branch is a protected engineering baseline, software adoption register, application code release or authorization for use aboard a vessel. Publishing research **does not require a pull request**. Source-code changes, qualification, procurement, integration, independent engineering verification and all controlled baseline changes continue to require their applicable protected review and human authority.

## Publication controls

1. Run existing offline collector tests before the network collection.
2. Collect only public material using the configured bounded discovery queries.
3. Fail closed if source-acquisition or schema/identity validation fails; never overwrite the last good published snapshot with an empty or fraudulent one.
4. Label published records `PUBLIC_SOURCE_SAFE_ONLY`, `UNVERIFIED_REVIEW_REQUIRED`, `engineeringReleaseApproved: false`. Repository discoveries additionally use `softwareAdoptionApproved: false`.
5. Commit on the corresponding research branch and push via **non-force** updates. Runs are serialized by workflow concurrency.
6. Link each snapshot to its GitHub Actions run and preserve the earlier Git revision for traceability.

A26 publishes research evidence; it cannot approve, install, execute or release third-party code, change the controlled `src/data/externalSoftwareRegister.json`, or alter vessel engineering baselines.

## UI readers

The Vite-only USV Models view and Express A26 feed read `research/live-a26` first, then can fall back to previously published numbered review branches during migration. Code Repositories reads the validated JSON snapshot at `references/live-research/repository-scout.json` in `research/live-code-repositories`, and retains historical GitHub snapshot tabs and the controlled register for reference.

The public repository collector is a discovery feed, **not** a live qualification or installation registry. It refreshes on successful scout runs, not continuously for every upstream GitHub update. Readers report unavailable sources rather than substituting approved data.

## Operational acceptance

After merging workflow code into `main`, dispatch both A26 fleet discovery and Repository Scout with `validate_only=false`. Verify their final publish steps and inspect the manifests on the stable branches. Verify the running Google AI Studio UI loads the new branch revisions and displays provenance, last synchronization and review state. A passing compilation or a successful GitHub Actions run alone does not prove the separately hosted Lab preview is refreshed.
