# PR-04 phase 1: in-process engineering CRUD transaction safety

**Status: partial implementation only.** This change prevents the HTTP CRUD
routes from acknowledging record/activity-log mutations when the atomic
file-backed snapshot write fails. It is not a relational database, WAL,
cross-process mutex, durable audit outbox, or schema migration framework.

## Contract
- Copy the current 16-collection store before modifying it
- Mutate engineering draft and activity_log in the same speculative copy
- Validate and persist this copy with one atomic file replacement
- Only install the copy as the live state after persistence succeeds
- On callback errors or pre-rename I/O errors, preserve old in-memory state
  and return HTTP 503 without acknowledging the operation

## Explicit remaining high-priority work
- Move to a single-writer durable transactional database with migrations
- Provide cross-process optimistic concurrency / lease isolation
- Tie cryptographic event journal and engineering state in an outbox
- Prove restart recovery and power-loss durability (fsync, WAL replay)
- Bound event ingestion and restore workflows under independent review
- Eliminate other legacy direct `saveStoreToFile()` mutation paths

No claim of production-grade ACID storage, audit completeness or naval
engineering baseline acceptance is made by this PR.
