# PR-12 acceptance ledger: independent verification is mandatory

**This is an observability and anti-false-closure step, not engineering release.**

Run `npm run remediation:status` to read the current twelve-item
`docs/remediation/status.json` without changing data, invoking providers or
adding API credentials.

The legacy ledger is self-authored metadata. It can record open and partially
implemented work, but **cannot itself certify completion**. If someone sets
an item to `accepted`, `verified-complete` or `merged`, the validation
fails closed instead of rendering a green success indicator.

For actual closure, a future separately trusted acceptance controller must
collect, check and pin:
- GitHub PR merged SHA and required CI results at the exact reviewed head
- Independent authorized code-review evidence
- Machine-verifiable regression/fault-injection artifacts
- Hardware/engineering-specific qualification and acceptance where applicable
- Production deployment, source, recovery and audit verification
- Source-pinned external engineering review, separate from model outputs

No full-closure claim is made here. A successful test run does not mean any of
the twelve items is independently completed.
