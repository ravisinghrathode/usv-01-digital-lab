# PR-05: Durable queue state validation before model execution

**Scope: partial security and restart-recovery fix; not full agent execution acceptance.**

The durable queue previously validated only its root container. A corrupted or
forged persisted task could claim a fabricated completion status, imply an
approved result, contain an invalid lease timestamp or use a mismatched task
identity. `runOne` had a weaker validation path than the status API.

## New fail-closed behavior

Every status read, enqueue and crash-recovery scheduling attempt validates the
entire persisted ledger:

- Canonical task map key, record ID and input task binding
- Pinned Git source SHA and bounded digest syntax
- Known execution lane, queue state, retry count and UTC timestamps
- Lease metadata, completion receipt format, and publication semantics
- Receipt flags **must** remain `humanApprovalSatisfied:false` and
  `engineeringReleaseApproved:false`, even when model execution completed
- All retained history events must reference known tasks and legal states
- JSON object inherited keys cannot masquerade as existing queued tasks

Any defect raises `QUEUE_STATE_CORRUPT`; no model execution, source
verification, local overwrite or implicit replay may proceed.

## Acceptance still outstanding

- Independent review of a replay-safe process lease and stale-lock recovery
- End-to-end interruption between provider response and receipt persistence
- Crash/restart and multi-process fault-injection runs on the actual Mac host
- Durable cryptographic outbox and externally witnessed receipts
- Provider outage, retry cap, quota-fallback and multi-agent coordination tests

Do not promote synthetic agent results to qualification or engineering baseline
authority. This does not claim the programme or PR-05 is complete.
